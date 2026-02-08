import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { z } from "zod";
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

const FIREBASE_PROJECT_ID = 'dochadzka-web';
const FIREBASE_API_KEY = 'AIzaSyDy_MzgOTL67A6P08UtptHVpcdpYik6Fgc';

async function firestoreGet(collectionId: string, documentId: string): Promise<any> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Firestore GET failed: ${response.status}`);
  }
  const data = await response.json();
  return parseFirestoreDocument(data);
}

async function firestoreSet(collectionId: string, documentId: string, data: any): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}?key=${FIREBASE_API_KEY}`;
  const firestoreData = toFirestoreDocument(data);
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreData })
  });
}

function parseFirestoreDocument(doc: any): any {
  if (!doc || !doc.fields) return {};
  const result: any = {};
  for (const [key, value] of Object.entries(doc.fields as Record<string, any>)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

function parseFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue !== undefined) {
    return parseFirestoreDocument(value.mapValue);
  }
  return null;
}

function toFirestoreDocument(data: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: toFirestoreDocument(value) } };
  }
  return { stringValue: String(value) };
}

async function getBratislavaTime(): Promise<Date> {
  const now = new Date();
  const bratislavaString = now.toLocaleString("en-US", { 
    timeZone: "Europe/Bratislava",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const [datePart, timePart] = bratislavaString.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

async function uploadPhotoFTP(name: string, base64Data: string, logId?: string): Promise<{ success: boolean; objectPath: string }> {
  const buffer = Buffer.from(base64Data, 'base64');
  const client = new ftp.Client();
  
  await client.access({
    host: "37.9.175.156",
    user: "aplikacia.tofako.sk",
    password: "Aplikacia1",
    secure: false,
    port: 21
  });

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  await client.uploadFrom(stream, `Fotky/${name}`);
  client.close();

  const objectPath = `https://aplikacia.tofako.sk/Fotky/${name}`;

  if (logId) {
    const databazaData = await firestoreGet("Global", "Databaza") || {};
    if (databazaData[logId]) {
      databazaData[logId]["Foto"] = objectPath;
      await firestoreSet("Global", "Databaza", databazaData);
    }
  }

  return { success: true, objectPath };
}

async function verifyEmployee(code: string): Promise<string | null> {
  const employeesData = await firestoreGet("Global", "Zamestnanci");
  if (!employeesData || typeof employeesData !== 'object') {
    return null;
  }

  const searchCode = String(code).trim();
  
  for (const [key, value] of Object.entries(employeesData)) {
    const trimmedKey = String(key).trim();
    if (trimmedKey === searchCode || Number(trimmedKey) === Number(searchCode)) {
      return String(value);
    }
  }

  return null;
}

async function getAdminCode(): Promise<string> {
  const data = await firestoreGet("Global", "adminCode");
  if (!data) return "12345";
  return String(data.adminCode || "");
}

async function getStores(): Promise<string[]> {
  const data = await firestoreGet("Global", "Prevadzky");
  if (!data) return [];
  return Object.keys(data)
    .sort((a, b) => Number(a) - Number(b))
    .map(key => data[key]);
}

interface CreateAttendanceInput {
  code: string;
  type: string;
  selectedStore?: string;
  photoPath?: string;
  isManual?: boolean;
}

interface AttendanceResult {
  id: string;
  code: string;
  type: string;
  meno: string;
  createdAt: Date;
}

async function createAttendanceLog(input: CreateAttendanceInput & { clientTimestamp?: string }): Promise<AttendanceResult> {
  const { code, type, selectedStore, photoPath, clientTimestamp, isManual } = input;

  const employeeName = await verifyEmployee(code);
  if (!employeeName) {
    throw new Error("Neplatný kód zamestnanca");
  }

  const dbData = await firestoreGet("Global", "Databaza") || {};
  const logs = Object.values(dbData) as any[];

  if (type === "arrival" && !isManual) {
    // Check store limit
    const currentStore = selectedStore || "Neznáma prevádzka";
    const limitData = await firestoreGet(currentStore, "Pocet");
    const limit = parseInt(limitData?.Pocet || "0", 10);

    if (limit > 0) {
      const dbDataActive = await firestoreGet("Global", "Databaza") || {};
      const allLogs = Object.values(dbDataActive) as any[];
      
      // Get active employees on this store
      const employeeLogsMap: Record<string, any[]> = {};
      const parseTime = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return 0;
        const [d, m, y] = dateStr.split('.').map(Number);
        const [hh, mm, ss] = timeStr.split(':').map(Number);
        return new Date(y, m - 1, d, hh, mm, ss || 0).getTime();
      };

      allLogs.forEach(log => {
        const logCode = String(log["Kód"]);
        if (!logCode || logCode === "undefined" || logCode === "null") return;
        if (!employeeLogsMap[logCode]) employeeLogsMap[logCode] = [];
        employeeLogsMap[logCode].push(log);
      });

      let activeCount = 0;
      const activeDetails: any[] = [];

      Object.keys(employeeLogsMap).forEach(logCode => {
        const empLogs = employeeLogsMap[logCode].sort((a, b) => {
          return parseTime(b["dátum"], b["Original čas príchodu"]) - parseTime(a["dátum"], a["Original čas príchodu"]);
        });
        
        const lastAtt = empLogs.find(l => ["Príchod", "arrival", "Odchod", "departure"].includes(l["Akcia"]));
        if (lastAtt && (lastAtt["Akcia"] === "Príchod" || lastAtt["Akcia"] === "arrival") && lastAtt["Prevádzka"] === currentStore) {
          activeCount++;
          activeDetails.push({
            meno: lastAtt["Meno"],
            datum: lastAtt["dátum"],
            cas: lastAtt["Original čas príchodu"]
          });
        }
      });

      if (activeCount >= limit) {
        const detailsStr = activeDetails.map(d => `${d.meno} ${d.datum} ${d.cas}`).join("\n");
        throw new Error(`ERR_LIMIT_EXCEEDED|${detailsStr}`);
      }
    }

    const employeeLogs = logs
      .filter(l => String(l["Kód"]) === String(code))
      .sort((a, b) => {
        try {
          // Parse date DD.MM.YYYY and time HH:mm:ss
          const [d, m, y] = a["dátum"].split('.').map(Number);
          const [hh, mm, ss] = a["Original čas príchodu"].split(':').map(Number);
          const timeA = new Date(y, m - 1, d, hh, mm, ss).getTime();

          const [d2, m2, y2] = b["dátum"].split('.').map(Number);
          const [hh2, mm2, ss2] = b["Original čas príchodu"].split(':').map(Number);
          const timeB = new Date(y2, m2 - 1, d2, hh2, mm2, ss2).getTime();
          
          return timeB - timeA; // Descending (newest first)
        } catch(e) { 
          // Fallback to simpler comparison if parsing fails
          return 0; 
        }
      });

    if (employeeLogs.length > 0) {
      const lastLog = employeeLogs[0];
      const lastAction = lastLog["Akcia"];
      if (lastAction === "Príchod" || lastAction === "arrival") {
        throw new Error(`Zabudol si sa odhlásiť. Napíš manažérovi, ináč sa ti nezaráta zmena. Si prihlásený od ${lastLog["dátum"]} ${lastLog["Original čas príchodu"]} na prevádzke ${lastLog["Prevádzka"] || "neznámej"}`);
      }
    }
  }

  if (type === "departure" && !isManual) {
    const employeeLogs = logs
      .filter(l => String(l["Kód"]) === String(code))
      .sort((a, b) => {
        try {
          // Parse date DD.MM.YYYY and time HH:mm:ss
          const [d, m, y] = a["dátum"].split('.').map(Number);
          const [hh, mm, ss] = a["Original čas príchodu"].split(':').map(Number);
          const timeA = new Date(y, m - 1, d, hh, mm, ss).getTime();

          const [d2, m2, y2] = b["dátum"].split('.').map(Number);
          const [hh2, mm2, ss2] = b["Original čas príchodu"].split(':').map(Number);
          const timeB = new Date(y2, m2 - 1, d2, hh2, mm2, ss2).getTime();
          
          return timeB - timeA; // Descending (newest first)
        } catch(e) { 
          // Fallback to simpler comparison if parsing fails
          return 0; 
        }
      });

    const lastLog = employeeLogs.length > 0 ? employeeLogs.find(l => ["Príchod", "arrival", "Odchod", "departure"].includes(l["Akcia"])) : null;
    const lastAction = lastLog ? lastLog["Akcia"] : null;
    const lastStore = lastLog ? lastLog["Prevádzka"] : null;
    const currentStore = selectedStore || "Neznáma prevádzka";
    
    if (!lastLog || (lastAction !== "Príchod" && lastAction !== "arrival")) {
      throw new Error("ERR_NO_ARRIVAL");
    }

    // Check if last action was Departure - cannot depart twice in a row
    if (lastAction === "Odchod" || lastAction === "departure") {
      throw new Error("Zabudol si sa prihlásiť. Napíš manažérovi ináč sa ti nezapíše zmena.");
    }

    // New condition: Must be at the same store as arrival
    if (lastStore && lastStore !== currentStore) {
      throw new Error(`ERR_WRONG_STORE:${lastStore}`);
    }

    const lastArrivalDate = lastLog["dátum"];
    const now = clientTimestamp ? new Date(clientTimestamp) : await getBratislavaTime();
    const formattedNowDate = new Intl.DateTimeFormat('sk-SK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    if (lastArrivalDate !== formattedNowDate) {
      throw new Error("ERR_NEW_DAY");
    }
  }

  // Use client timestamp if provided, otherwise fallback to server time
  const now = clientTimestamp ? new Date(clientTimestamp) : await getBratislavaTime();

  // If we have a client timestamp, we want to format it exactly as it was on the client
  // without any further timezone shifts that might occur on the server.
  // We use sk-SK locale which should match the expected format.
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formattedDate = new Intl.DateTimeFormat('sk-SK', dateOptions).format(now);
  const formattedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(now);

  const daysSk: Record<string, string> = {
    "Monday": "Pondelok", "Tuesday": "Utorok", "Wednesday": "Streda", "Thursday": "Štvrtok",
    "Friday": "Piatok", "Saturday": "Sobota", "Sunday": "Nedeľa"
  };
  const dayNameEn = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  const dayNameSk = daysSk[dayNameEn];
  const prevadzka = selectedStore || "Neznáma prevádzka";

  let timestamp = now;
  let formattedRoundedTime = "";

  if ((type === "arrival" || type === "departure") && !isManual) {
    const hoursData = await firestoreGet(prevadzka, "Otvaracie_hodiny");
    const todayHours = hoursData?.[dayNameSk];

    if (todayHours && todayHours !== "Zatvorené") {
      const [openStr, closeStr] = todayHours.split('-').map((s: string) => s.trim());
      const [openH, openM] = openStr.split(':').map(Number);
      const [closeH, closeM] = closeStr.split(':').map(Number);

      const openingTime = new Date(now);
      openingTime.setHours(openH, openM, 0, 0);
      const closingTime = new Date(now);
      closingTime.setHours(closeH, closeM, 0, 0);

      if (type === "arrival") {
        if (now < openingTime) {
          // Round to opening time
          timestamp = openingTime;

          // FIX - Otvaracie Logic (ONLY if status is 1 and before opening)
          const fixHoursData = await firestoreGet(prevadzka, "Fix_Otvaracie");
          if (fixHoursData?.Status === "1") {
            const fixTimeStr = fixHoursData?.[dayNameSk];
            if (fixTimeStr && fixTimeStr.includes(":")) {
              const parts = fixTimeStr.split(":");
              const hh = parts[0].padStart(2, "0");
              const mm = parts[1].padStart(2, "0");
              formattedRoundedTime = `${hh}:${mm}:00`;
            } else {
              formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
            }
          } else {
            formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
          }
        } else if (now > closingTime) {
          // Block if after closing
          throw new Error("ERR_STORE_CLOSED|Je zatvorené nemôžeš sa prihlásiť!");
        } else {
          // Regular 30 min rounding
          const ms = 1000 * 60 * 30;
          const roundedTime = Math.round(now.getTime() / ms) * ms;
          timestamp = new Date(roundedTime);
          formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
        }
      } else if (type === "departure") {
        if (now < openingTime) {
          // Block if before opening
          throw new Error("ERR_STORE_CLOSED_DEPARTURE|Je zatvorené! Nemôžeš sa odhlásiť.");
        } else if (now > closingTime) {
          // Round to closing time
          timestamp = closingTime;

          // FIX - Zatvaracie Logic (ONLY if status is 1 and after closing)
          const fixClosingData = await firestoreGet(prevadzka, "Fix_Zatvaracie");
          if (fixClosingData?.Status === "1") {
            const fixTimeStr = fixClosingData?.[dayNameSk];
            if (fixTimeStr && fixTimeStr.includes(":")) {
              const parts = fixTimeStr.split(":");
              const hh = parts[0].padStart(2, "0");
              const mm = parts[1].padStart(2, "0");
              formattedRoundedTime = `${hh}:${mm}:00`;
            } else {
              formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
            }
          } else {
            formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
          }
        } else {
          // Regular 30 min rounding
          const ms = 1000 * 60 * 30;
          const roundedTime = Math.round(now.getTime() / ms) * ms;
          timestamp = new Date(roundedTime);
          formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
        }
      }
    } else if (todayHours === "Zatvorené") {
      const actionText = type === "arrival" ? "prihlásiť" : "odhlásiť";
      throw new Error(`ERR_STORE_CLOSED_DAY|Je zatvorené. Nemôžeš sa ${actionText}!`);
    } else {
      // Regular rounding if hours not found
      const ms = 1000 * 60 * 30;
      const roundedTime = Math.round(now.getTime() / ms) * ms;
      timestamp = new Date(roundedTime);
      formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
    }
  } else if ((type === "arrival" || type === "departure") && isManual) {
    // For manual entry, only apply regular 30 min rounding, bypass all other conditions
    const ms = 1000 * 60 * 30;
    const roundedTime = Math.round(now.getTime() / ms) * ms;
    timestamp = new Date(roundedTime);
    formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);
  }

  const logId = `log_${new Date().getTime()}`;
  
  const currentDbData = await firestoreGet("Global", "Databaza") || {};
  currentDbData[logId] = {
    "Kód": code,
    "Meno": employeeName,
    "dátum": formattedDate,
    "Original čas príchodu": formattedTime,
    "Zaokruhlený čas príchodu": formattedRoundedTime,
    "Akcia": type === "arrival" ? "Príchod" : type === "departure" ? "Odchod" : type === "lunch" ? "Obed" : "Dovolenka",
    "Prevádzka": prevadzka,
    "Foto": photoPath || ""
  };
  
  await firestoreSet("Global", "Databaza", currentDbData);
  
  console.log(`Log created for ${employeeName}:`, currentDbData[logId]);

  return {
    id: logId,
    code,
    type,
    meno: employeeName,
    createdAt: now
  };
}

async function uploadExportFTP(name: string, buffer: Buffer): Promise<{ success: boolean; objectPath: string }> {
  const client = new ftp.Client();
  await client.access({
    host: "37.9.175.156",
    user: "aplikacia.tofako.sk",
    password: "Aplikacia1",
    secure: false,
    port: 21
  });

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  // Ensure Exporty directory exists or just try to upload
  try {
    // We are uploading to Exporty/ prefix relative to the login directory
  } catch (e) {
    // ignore
  }

  await client.uploadFrom(stream, `Exporty/${name}`);
  client.close();
  return { success: true, objectPath: `https://aplikacia.tofako.sk/Exporty/${name}` };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/export/individual", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const dbData = await firestoreGet("Global", "Databaza") || {};
      let logs = Object.values(dbData) as any[];

      // Filtrovanie podľa dátumu
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        logs = logs.filter(log => {
          const logDateParts = log["dátum"].split('.');
          if (logDateParts.length !== 3) return false;
          const logDate = new Date(Number(logDateParts[2]), Number(logDateParts[1]) - 1, Number(logDateParts[0]));
          return logDate >= start && logDate <= end;
        });
      }

      // Formátovanie dát pre Excel
      const excelData = logs.map(log => ({
        "Kód zamestnanca": log["Kód"] || "",
        "Meno zamestnanca": log["Meno"] || "",
        "Dátum": log["dátum"] || "",
        "Čas": log["Original čas príchodu"] || "",
        "Zaokrúhlený čas": log["Zaokruhlený čas príchodu"] || "",
        "Akcia": log["Akcia"] || "",
        "Obed": log["Akcia"] === "Obed" ? "Áno" : "",
        "Trvanie dovolenky": log["Akcia"] === "Dovolenka" ? (log["Dovolenka (h)"] || log["Dĺžka"] || "") : "",
        "Prevádzka": log["Prevádzka"] || ""
      }));

      // Zoradenie podľa dátumu a času
      excelData.sort((a, b) => {
        const parseDateTime = (d: string, t: string) => {
          if (!d || !t) return 0;
          try {
            const [day, month, year] = d.split('.').map(Number);
            const [hh, mm, ss] = t.split(':').map(Number);
            if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hh) || isNaN(mm)) return 0;
            return new Date(year, month - 1, day, hh, mm, ss || 0).getTime();
          } catch (e) {
            return 0;
          }
        };
        return parseDateTime(a["Dátum"], a["Čas"]) - parseDateTime(b["Dátum"], b["Čas"]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Dochádzka");
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const now = await getBratislavaTime();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Vypis_Jednotlivo_${timestamp}.xlsx`;

      const result = await uploadExportFTP(fileName, buffer);
      res.json(result);
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: `Export zlyhal: ${error.message}` });
    }
  });

  app.post("/api/export/summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const dbData = await firestoreGet("Global", "Databaza") || {};
      const employees = await firestoreGet("Global", "Zamestnanci") || {};
      let logs = Object.values(dbData) as any[];

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filteredLogs = logs.filter(log => {
        const logDateParts = log["dátum"].split('.');
        if (logDateParts.length !== 3) return false;
        const logDate = new Date(Number(logDateParts[2]), Number(logDateParts[1]) - 1, Number(logDateParts[0]));
        return logDate >= start && logDate <= end;
      });

      const summary: Record<string, any> = {};

      filteredLogs.forEach(log => {
        const code = String(log["Kód"]);
        if (!summary[code]) {
          const rawMeno = employees[code] || log["Meno"] || "Neznámy";
          // Extract store from name if present (e.g., "Aneta - MerkurKE")
          const storeMatch = rawMeno.match(/-\s*(.+)$/);
          const storeGroup = storeMatch ? storeMatch[1].trim() : "Ostatné";
          
          summary[code] = {
            code,
            meno: rawMeno,
            storeGroup,
            origSeconds: 0,
            roundSeconds: 0,
            lunches: 0,
            vacationHours: 0,
            days: {} // day -> type (S, O, D)
          };
        }

        const s = summary[code];
        const logDate = log["dátum"];
        const day = logDate.split('.')[0];
        if (!s.days[day]) s.days[day] = [];

        if (log["Akcia"] === "Príchod" || log["Akcia"] === "arrival") {
          s.days[day].push("S");
        } else if (log["Akcia"] === "Obed" || log["Akcia"] === "lunch") {
          s.lunches++;
          s.days[day].push("O");
        } else if (log["Akcia"] === "Dovolenka" || log["Akcia"] === "vacation") {
          const dur = parseFloat(String(log["Dovolenka (h)"] || log["Dĺžka"] || "0"));
          s.vacationHours += dur;
          s.days[day].push("D");
        }
      });

      // Calculate hours from pairs
      const employeeLogsMap: Record<string, any[]> = {};
      filteredLogs.forEach(log => {
        const code = String(log["Kód"]);
        if (!employeeLogsMap[code]) employeeLogsMap[code] = [];
        employeeLogsMap[code].push(log);
      });

      Object.keys(employeeLogsMap).forEach(code => {
        const empLogs = employeeLogsMap[code].sort((a, b) => {
          const parseDateTime = (d: string, t: string) => {
            const [day, month, year] = d.split('.').map(Number);
            const [hh, mm, ss] = (t || "00:00:00").split(':').map(Number);
            return new Date(year, month - 1, day, hh, mm, ss || 0).getTime();
          };
          const timeA = parseDateTime(a["dátum"], a["Original čas príchodu"]);
          const timeB = parseDateTime(b["dátum"], b["Original čas príchodu"]);
          return timeA - timeB;
        });

        const s = summary[code];
        if (!s) return;

        for (let i = 0; i < empLogs.length; i++) {
          const current = empLogs[i];
          if (current["Akcia"] === "Príchod" || current["Akcia"] === "arrival") {
            const next = empLogs.find((l, idx) => idx > i && (l["Akcia"] === "Odchod" || l["Akcia"] === "departure") && l["dátum"] === current["dátum"]);
            if (next) {
              const parseTime = (t: string) => {
                if (!t) return 0;
                const [h, m, s] = t.split(':').map(Number);
                return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
              };
              const currentOrigTime = parseTime(current["Original čas príchodu"]);
              const nextOrigTime = parseTime(next["Original čas príchodu"]);
              const diffOrig = nextOrigTime - currentOrigTime;
              if (diffOrig > 0) s.origSeconds += diffOrig;
              
              const currentRoundTimeStr = current["Zaokruhlený čas príchodu"];
              const nextRoundTimeStr = next["Zaokruhlený čas príchodu"];
              if (currentRoundTimeStr && nextRoundTimeStr) {
                const diffRound = parseTime(nextRoundTimeStr) - parseTime(currentRoundTimeStr);
                if (diffRound > 0) s.roundSeconds += diffRound;
              }
            }
          }
        }
      });

      const sortedEmployees = Object.values(summary).sort((a, b) => {
        if (a.storeGroup !== b.storeGroup) return a.storeGroup.localeCompare(b.storeGroup);
        return a.meno.localeCompare(b.meno);
      });

      const formatHours = (sec: number) => (sec / 3600).toFixed(2);

      const excelSummary = sortedEmployees.map(s => ({
        "Kód zamestnanca": s.code,
        "Meno zamestnanca": s.meno,
        "Originálny čas": formatHours(s.origSeconds),
        "Zaokruhlený čas": formatHours(s.roundSeconds),
        "Obedy": s.lunches,
        "Dovolenka": s.vacationHours,
        "Spolu": (parseFloat(formatHours(s.roundSeconds)) + s.vacationHours).toFixed(2)
      }));

      const wb = XLSX.utils.book_new();
      const wsSum = XLSX.utils.json_to_sheet(excelSummary);
      XLSX.utils.book_append_sheet(wb, wsSum, "Súhrn");

      // Table 01-31
      const daysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();
      const lastDay = daysInMonth(start.getMonth() + 1, start.getFullYear());
      const daysHeader = Array.from({ length: lastDay }, (_, i) => String(i + 1).padStart(2, '0'));
      
      const tableData = sortedEmployees.map(s => {
        // Meno a Prevádzka na začiatku
        const row: any = { 
          "Meno zamestnanca": s.meno, 
          "Prevádzka": s.storeGroup 
        };
        
        // Dni za sebou
        daysHeader.forEach(d => {
          const dayLogs = s.days[d] || [];
          const uniqueLogs = Array.from(new Set(dayLogs));
          
          const displayParts: string[] = [];
          
          // Ak má smenu (S), vypočítame odpracovaný čas pre tento konkrétny deň
          if (uniqueLogs.includes("S")) {
            const empLogs = employeeLogsMap[s.code] || [];
            const dayShiftLogs = empLogs.filter(l => l["dátum"].split('.')[0] === d);
            
            let dayRoundSeconds = 0;
            const sortedDayLogs = dayShiftLogs.sort((a, b) => {
               const parseT = (t: string) => {
                 const timeStr = t || "00:00:00";
                 const [h, m, sec] = timeStr.split(':').map(Number);
                 return (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
               };
               return parseT(a["Original čas príchodu"]) - parseT(b["Original čas príchodu"]);
            });

            for (let i = 0; i < sortedDayLogs.length; i++) {
              const current = sortedDayLogs[i];
              if (current["Akcia"] === "Príchod" || current["Akcia"] === "arrival") {
                // Find next matching departure ON THE SAME DAY
                const next = sortedDayLogs.find((l, idx) => idx > i && (l["Akcia"] === "Odchod" || l["Akcia"] === "departure"));
                if (next && current["Zaokruhlený čas príchodu"] && next["Zaokruhlený čas príchodu"]) {
                  const parseT = (t: string) => {
                    const parts = t.split(':').map(Number);
                    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                  };
                  const diff = parseT(next["Zaokruhlený čas príchodu"]) - parseT(current["Zaokruhlený čas príchodu"]);
                  if (diff > 0) dayRoundSeconds += diff;
                }
              }
            }
            if (dayRoundSeconds > 0) {
              const hours = (dayRoundSeconds / 3600).toFixed(2);
              displayParts.push(`S${hours}`);
            } else {
              displayParts.push("S"); // Fallback if no departure found
            }
          }

          if (uniqueLogs.includes("O")) {
            displayParts.push("O");
          }

          if (uniqueLogs.includes("D")) {
            // Nájdeme dĺžku dovolenky pre tento deň
            const empLogs = employeeLogsMap[s.code] || [];
            const dayVacLog = empLogs.find(l => l["dátum"].split('.')[0] === d && (l["Akcia"] === "Dovolenka" || l["Akcia"] === "vacation"));
            const durRaw = dayVacLog ? (dayVacLog["Dovolenka (h)"] || dayVacLog["Dĺžka"] || "0") : "0";
            // Strip any non-numeric characters except decimal point to ensure we only have the number
            const dur = String(durRaw).replace(/[^0-9.]/g, '');
            if (dur && dur !== "0") {
              displayParts.push(`D${dur}`);
            } else if (uniqueLogs.includes("D")) {
               displayParts.push("D");
            }
          }

          row[d] = displayParts.join(',');
        });
        return row;
      });

      // Explicitne definujeme poradie stĺpcov pre XLSX, aby boli mená vľavo a dni za nimi
      const wsTable = XLSX.utils.json_to_sheet(tableData, { 
        header: ["Meno zamestnanca", "Prevádzka", ...daysHeader] 
      });
      XLSX.utils.book_append_sheet(wb, wsTable, "Tabuľka dní");

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const now = await getBratislavaTime();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Vypis_Spolu_${timestamp}.xlsx`;

      const result = await uploadExportFTP(fileName, buffer);
      res.json(result);
    } catch (error: any) {
      console.error("Summary export error:", error);
      res.status(500).json({ error: `Export zlyhal: ${error.message}` });
    }
  });

  app.post("/api/uploads/ftp", async (req, res) => {
    try {
      const { name, base64Data, logId } = req.body;
      if (!name || !base64Data) {
        return res.status(400).json({ error: "Chýbajúce údaje" });
      }
      const result = await uploadPhotoFTP(name, base64Data, logId);
      res.json(result);
    } catch (error: any) {
      console.error("FTP Upload Error:", error);
      res.status(500).json({ error: `FTP chyba: ${error.message}` });
    }
  });

  app.post(api.attendance.create.path, async (req, res) => {
    try {
      const { selectedStore, photoPath, clientTimestamp, ...rest } = req.body;
      const input = api.attendance.create.input.parse(rest);
      
      const log = await createAttendanceLog({ ...input, selectedStore, photoPath, clientTimestamp });
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      
      if (err instanceof Error) {
        return res.status(400).json({
          message: err.message,
          field: "code"
        });
      }
      
      throw err;
    }
  });

  app.get("/api/stores/limits", async (req, res) => {
    try {
      const stores = await getStores();
      const limits: Record<string, string> = {};
      
      for (const store of stores) {
        const data = await firestoreGet(store, "Pocet");
        limits[store] = data?.Pocet || "0";
      }
      
      res.json(limits);
    } catch (error) {
      console.error("Error fetching store limits:", error);
      res.status(500).json({ error: "Failed to fetch store limits" });
    }
  });

  app.post("/api/stores/limits", async (req, res) => {
    try {
      const { store, limit } = req.body;
      if (!store) return res.status(400).json({ error: "Store name is required" });
      
      await firestoreSet(store, "Pocet", { Pocet: String(limit) });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving store limit:", error);
      res.status(500).json({ error: "Failed to save store limit" });
    }
  });

  app.get("/api/stores/opening-hours", async (req, res) => {
    try {
      const { store } = req.query;
      if (!store) return res.status(400).json({ error: "Store name is required" });
      
      const data = await firestoreGet(String(store), "Otvaracie_hodiny");
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching opening hours:", error);
      res.status(500).json({ error: "Failed to fetch opening hours" });
    }
  });

  app.post("/api/stores/opening-hours", async (req, res) => {
    try {
      const { store, hours } = req.body;
      if (!store || !hours) return res.status(400).json({ error: "Store and hours are required" });
      
      await firestoreSet(String(store), "Otvaracie_hodiny", hours);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving opening hours:", error);
      res.status(500).json({ error: "Failed to save opening hours" });
    }
  });

  app.get("/api/stores/fix-opening-hours", async (req, res) => {
    try {
      const { store } = req.query;
      if (!store) return res.status(400).json({ error: "Store name is required" });
      
      const data = await firestoreGet(String(store), "Fix_Otvaracie");
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching fix opening hours:", error);
      res.status(500).json({ error: "Failed to fetch fix opening hours" });
    }
  });

  app.post("/api/stores/fix-opening-hours", async (req, res) => {
    try {
      const { store, hours } = req.body;
      if (!store || !hours) return res.status(400).json({ error: "Store and hours are required" });
      
      await firestoreSet(String(store), "Fix_Otvaracie", hours);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving fix opening hours:", error);
      res.status(500).json({ error: "Failed to save fix opening hours" });
    }
  });

  app.get("/api/stores/fix-closing-hours", async (req, res) => {
    try {
      const { store } = req.query;
      if (!store) return res.status(400).json({ error: "Store name is required" });
      
      const data = await firestoreGet(String(store), "Fix_Zatvaracie");
      res.json(data || {});
    } catch (error) {
      console.error("Error fetching fix closing hours:", error);
      res.status(500).json({ error: "Failed to fetch fix closing hours" });
    }
  });

  app.post("/api/stores/fix-closing-hours", async (req, res) => {
    try {
      const { store, hours } = req.body;
      if (!store || !hours) return res.status(400).json({ error: "Store and hours are required" });
      
      await firestoreSet(String(store), "Fix_Zatvaracie", hours);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving fix closing hours:", error);
      res.status(500).json({ error: "Failed to save fix closing hours" });
    }
  });

  app.get(api.attendance.list.path, async (req, res) => {
    res.json([]);
  });

  app.get(api.attendance.lunches.path, async (req, res) => {
    try {
      const { code, from, to } = req.query;
      if (!code || !from || !to) {
        return res.status(400).json({ message: "Chýbajúce parametre" });
      }

      const dbData = await firestoreGet("Global", "Databaza") || {};
      const logs = Object.values(dbData) as any[];

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);

      const filteredLunches = logs.filter(l => {
        if (String(l["Kód"]) !== String(code)) return false;
        if (l["Akcia"] !== "Obed") return false;

        // Parse date DD. MM. YYYY or D. M. YYYY
        const dateStr = String(l["dátum"]).trim();
        const parts = dateStr.split('.').map(p => p.trim());
        if (parts.length < 3) return false;
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        const logDate = new Date(year, month - 1, day);
        return logDate >= fromDate && logDate <= toDate;
      }).sort((a, b) => {
        const partsA = String(a["dátum"]).trim().split('.').map(p => p.trim());
        const partsB = String(b["dátum"]).trim().split('.').map(p => p.trim());
        const dateA = new Date(parseInt(partsA[2], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[0], 10));
        const dateB = new Date(parseInt(partsB[2], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[0], 10));
        return dateB.getTime() - dateA.getTime();
      });

      res.json(filteredLunches);
    } catch (error) {
      console.error("Error fetching lunch overview:", error);
      res.status(500).json({ message: "Chyba pri načítaní obedov" });
    }
  });

  app.get(api.attendance.adminCode.path, async (req, res) => {
    const adminCode = await getAdminCode();
    res.json({ adminCode });
  });

  app.get(api.attendance.stores.path, async (req, res) => {
    const stores = await getStores();
    res.json(stores);
  });

  app.get(api.attendance.employees.path, async (req, res) => {
    try {
      const employees = await firestoreGet("Global", "Zamestnanci");
      res.json(employees || {});
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees/rename", async (req, res) => {
    try {
      const { code, newName } = req.body;
      if (!code || !newName) {
        return res.status(400).json({ error: "Chýbajúce údaje" });
      }

      const employeesData = await firestoreGet("Global", "Zamestnanci") || {};
      const trimmedCode = String(code).trim();
      
      let foundKey = null;
      for (const key of Object.keys(employeesData)) {
        if (key.trim() === trimmedCode || Number(key.trim()) === Number(trimmedCode)) {
          foundKey = key;
          break;
        }
      }

      if (!foundKey) {
        return res.status(404).json({ error: "Zamestnanec s týmto kódom neexistuje" });
      }

      employeesData[foundKey] = newName;
      await firestoreSet("Global", "Zamestnanci", employeesData);
      
      res.json({ success: true, newName });
    } catch (error: any) {
      console.error("Error renaming employee:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/attendance/active", async (req, res) => {
    try {
      const dbData = await firestoreGet("Global", "Databaza") || {};
      const logs = Object.values(dbData) as any[];
      
      // Get all logs for each employee, sorted by time
      const employeeLogsMap: Record<string, any[]> = {};
      
      const parseTime = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return 0;
        const [d, m, y] = dateStr.split('.').map(Number);
        const [hh, mm, ss] = timeStr.split(':').map(Number);
        return new Date(y, m - 1, d, hh, mm, ss || 0).getTime();
      };

      logs.forEach(log => {
        const code = String(log["Kód"]);
        if (!code || code === "undefined" || code === "null") return;
        if (!employeeLogsMap[code]) {
          employeeLogsMap[code] = [];
        }
        employeeLogsMap[code].push(log);
      });
      
      const activeEmployees: any[] = [];
      
      Object.keys(employeeLogsMap).forEach(code => {
        // Sort employee logs descending by time
        const employeeLogs = employeeLogsMap[code].sort((a, b) => {
          const timeB = parseTime(b["dátum"], b["Original čas príchodu"]);
          const timeA = parseTime(a["dátum"], a["Original čas príchodu"]);
          return timeB - timeA;
        });
        
        if (employeeLogs.length > 0) {
          // Find the last attendance action (Príchod/Odchod)
          const lastAttendanceLog = employeeLogs.find(l => 
            l["Akcia"] === "Príchod" || l["Akcia"] === "arrival" || 
            l["Akcia"] === "Odchod" || l["Akcia"] === "departure"
          );

          // If the last attendance log is a Príchod, they are active
          if (lastAttendanceLog && (lastAttendanceLog["Akcia"] === "Príchod" || lastAttendanceLog["Akcia"] === "arrival")) {
            // BUT: We must also check if this Príchod happened today.
            // If the príchod is from a previous day, they should have been logged out.
            // However, the current system seems to allow multi-day "active" status if not logged out.
            // Let's stick to the "last action is Príchod" logic but ensure we take the ABSOLUTELY latest.
            
            activeEmployees.push({
              meno: lastAttendanceLog["Meno"],
              datum: lastAttendanceLog["dátum"],
              cas: lastAttendanceLog["Original čas príchodu"],
              zaokruhlenyCas: lastAttendanceLog["Zaokruhlený čas príchodu"],
              prevadzka: lastAttendanceLog["Prevádzka"]
            });
          }
        }
      });
        
      res.json(activeEmployees);
    } catch (error) {
      console.error("Error fetching active employees:", error);
      res.status(500).json({ error: "Failed to fetch active employees" });
    }
  });

  app.get("/api/attendance/overview", async (req, res) => {
    try {
      const { from, to } = req.query;
      const dbData = await firestoreGet("Global", "Databaza") || {};
      const logs = Object.values(dbData) as any[];
      
      const parseDate = (dateStr: string) => {
        if (!dateStr) return 0;
        const [d, m, y] = dateStr.split('.').map(Number);
        return new Date(y, m - 1, d).getTime();
      };

      const parseTime = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return 0;
        const [d, m, y] = dateStr.split('.').map(Number);
        const [hh, mm, ss] = timeStr.split(':').map(Number);
        return new Date(y, m - 1, d, hh, mm, ss || 0).getTime();
      };

      const fromTime = from ? new Date(from as string).setHours(0,0,0,0) : 0;
      const toTime = to ? new Date(to as string).setHours(23,59,59,999) : Infinity;

      const filteredLogs = logs.filter(log => {
        const logTime = parseDate(log["dátum"]);
        
        // Filter by date
        const inDateRange = logTime >= fromTime && logTime <= toTime;
        return inDateRange;
      }).sort((a, b) => {
        const timeB = parseTime(b["dátum"], b["Original čas príchodu"] || "00:00:00");
        const timeA = parseTime(a["dátum"], a["Original čas príchodu"] || "00:00:00");
        return timeB - timeA;
      });

      res.json(filteredLogs);
    } catch (error) {
      console.error("Error fetching attendance overview:", error);
      res.status(500).json({ error: "Failed to fetch attendance overview" });
    }
  });

  app.post(api.attendance.createLunch.path, async (req, res) => {
    try {
      const { code, date, selectedStore, clientTimestamp } = req.body;
      const employeeName = await verifyEmployee(code);
      if (!employeeName) {
        return res.status(400).json({ message: "Neplatný kód zamestnanca" });
      }

      const dbData = await firestoreGet("Global", "Databaza") || {};
      const logs = Object.values(dbData) as any[];

      const now = clientTimestamp ? new Date(clientTimestamp) : await getBratislavaTime();
      const formattedTime = new Intl.DateTimeFormat('sk-SK', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      // Normalize search date for various formats
      const [y, m, d] = date.split('-');
      const dNum = parseInt(d, 10);
      const mNum = parseInt(m, 10);
      
      const possibleFormats = [
        `${d}. ${m}. ${y}`,      // "10. 01. 2026"
        `${dNum}. ${mNum}. ${y}`, // "1. 1. 2026"
        `${dNum}. ${m}. ${y}`,    // "1. 01. 2026"
        `${d}.${m}.${y}`,         // "10.01.2026"
        `${dNum}.${mNum}.${y}`,   // "1.1.2026"
        `${dNum}. ${mNum}. ${y}`, // "10. 1. 2026"
        `${d}. ${mNum}. ${y}`,    // "10. 1. 2026" (common variant)
        `${d}.${mNum}.${y}`,      // "10.1.2026"
      ];

      const workLog = logs.find(l => {
        const logDate = String(l["dátum"] || "").trim().replace(/\s+/g, ' ');
        const logAction = String(l["Akcia"] || "").trim();
        const logCode = String(l["Kód"] || "").trim();
        return logCode === String(code) && 
          possibleFormats.some(f => logDate === f.replace(/\s+/g, ' ')) && 
          (logAction === "Príchod" || logAction === "arrival");
      });

      if (!workLog) {
        return res.status(400).json({ message: "ERR_NOT_WORKED" });
      }

      const lunchLog = logs.find(l => {
        const logDate = String(l["dátum"] || "").trim().replace(/\s+/g, ' ');
        const logAction = String(l["Akcia"] || "").trim();
        const logCode = String(l["Kód"] || "").trim();
        return logCode === String(code) && 
          possibleFormats.some(f => logDate === f.replace(/\s+/g, ' ')) && 
          (logAction === "Obed" || logAction === "lunch");
      });

      if (lunchLog) {
        return res.status(400).json({ message: "ERR_ALREADY_HAD_LUNCH" });
      }

      // Check if lunch is being recorded at the same store as arrival
      const arrivalStore = workLog["Prevádzka"];
      const currentStore = selectedStore || "Neznáma prevádzka";
      if (arrivalStore && arrivalStore !== currentStore) {
        return res.status(400).json({ message: `ERR_WRONG_STORE:${arrivalStore}` });
      }

      // Save lunch log
      const logId = `log_${new Date().getTime()}`;
      const prevadzka = selectedStore || "Neznáma prevádzka";
      const finalSlovakDate = possibleFormats[0]; 
      
      dbData[logId] = {
        "Kód": code,
        "Meno": employeeName,
        "dátum": finalSlovakDate,
        "Original čas príchodu": formattedTime,
        "Zaokruhlený čas príchodu": "",
        "Akcia": "Obed",
        "Prevádzka": prevadzka,
        "Foto": ""
      };
      
      await firestoreSet("Global", "Databaza", dbData);

      res.status(201).json({ success: true, meno: employeeName });
    } catch (error) {
      console.error("Error creating lunch log:", error);
      res.status(500).json({ message: "Interná chyba servera" });
    }
  });

  app.post(api.attendance.createVacation.path, async (req, res) => {
    try {
      const { code, date, duration, selectedStore, overwrite } = req.body;
      const employeeName = await verifyEmployee(code);
      if (!employeeName) {
        return res.status(400).json({ message: "Neplatný kód zamestnanca" });
      }

      const dbData = await firestoreGet("Global", "Databaza") || {};
      
      const [y, m, d] = date.split('-');
      const slovakDate = `${d}. ${m}. ${y}`;

      // Check for existing vacation on the same date for the same employee
      if (!overwrite) {
        const existingLog = Object.entries(dbData).find(([_, log]: [string, any]) => 
          log["Kód"] === code && 
          log["dátum"] === slovakDate && 
          log["Akcia"] === "Dovolenka"
        );

        if (existingLog) {
          return res.status(409).json({ message: "ERR_ALREADY_HAD_VACATION" });
        }
      } else {
        // If overwrite is true, remove existing vacation logs for this employee and date
        Object.keys(dbData).forEach(key => {
          const log = dbData[key];
          if (log["Kód"] === code && log["dátum"] === slovakDate && log["Akcia"] === "Dovolenka") {
            delete dbData[key];
          }
        });
      }

      const logId = `log_${new Date().getTime()}`;
      
      dbData[logId] = {
        "Kód": code,
        "Meno": employeeName,
        "dátum": slovakDate,
        "Original čas príchodu": "",
        "Zaokruhlený čas príchodu": "",
        "Akcia": "Dovolenka",
        "Dovolenka (h)": `${duration} hod`,
        "Prevádzka": "", // Prevádzka v tomto nehrá žiadnu rolu
        "Foto": ""
      };
      
      await firestoreSet("Global", "Databaza", dbData);
      res.status(201).json({ success: true, meno: employeeName });
    } catch (error) {
      console.error("Error creating vacation log:", error);
      res.status(500).json({ message: "Interná chyba servera" });
    }
  });

  app.delete(api.attendance.createVacation.path, async (req, res) => {
    try {
      const dbData = await firestoreGet("Global", "Databaza") || {};
      const newData: Record<string, any> = {};
      
      Object.keys(dbData).forEach(key => {
        if (dbData[key]["Akcia"] !== "Dovolenka") {
          newData[key] = dbData[key];
        }
      });
      
      await firestoreSet("Global", "Databaza", newData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vacations:", error);
      res.status(500).json({ message: "Chyba pri mazaní" });
    }
  });

  app.get(api.attendance.settings.path, async (req, res) => {
    res.json({});
  });

  app.post(api.attendance.updateSettings.path, async (req, res) => {
    res.json({ success: true });
  });

  app.post(api.attendance.updateAdminCode.path, async (req, res) => {
    const input = api.attendance.updateAdminCode.input.parse(req.body);
    await firestoreSet("Global", "adminCode", { adminCode: input.newCode });
    res.json({ success: true });
  });

  app.post("/api/verify-admin-code", async (req, res) => {
    try {
      const { code } = req.body;
      const adminCode = await getAdminCode();
      if (String(code) === String(adminCode)) {
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Nesprávny PIN kód" });
      }
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Chyba pri overovaní na serveri" });
    }
  });

  app.post("/api/attendance/delete-range", async (req, res) => {
    try {
      const { startDate, endDate, store } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Chýba dátum od alebo do" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dbData = await firestoreGet("Global", "Databaza") || {};
      const newData: Record<string, any> = {};
      let deletedCount = 0;

      Object.keys(dbData).forEach(key => {
        const log = dbData[key];
        const action = log["Akcia"];
        
        if (action === "Príchod" || action === "arrival" || action === "Odchod" || action === "departure") {
          const logDateParts = String(log["dátum"]).split('.');
          if (logDateParts.length >= 3) {
            const day = parseInt(logDateParts[0].trim(), 10);
            const month = parseInt(logDateParts[1].trim(), 10);
            const year = parseInt(logDateParts[2].trim(), 10);
            const logDate = new Date(year, month - 1, day);
            
            if (logDate >= start && logDate <= end) {
              if (store === "all" || log["Prevádzka"] === store) {
                deletedCount++;
                return;
              }
            }
          }
        }
        newData[key] = log;
      });

      await firestoreSet("Global", "Databaza", newData);
      res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error("Error deleting attendance range:", error);
      res.status(500).json({ error: `Chyba pri mazaní: ${error.message}` });
    }
  });

  app.post("/api/lunch/delete-range", async (req, res) => {
    try {
      const { startDate, endDate, store } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Chýba dátum od alebo do" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dbData = await firestoreGet("Global", "Databaza") || {};
      const newData: Record<string, any> = {};
      let deletedCount = 0;

      Object.keys(dbData).forEach(key => {
        const log = dbData[key];
        const action = log["Akcia"];
        
        if (action === "Obed" || action === "lunch") {
          const logDateParts = String(log["dátum"]).split('.');
          if (logDateParts.length >= 3) {
            const day = parseInt(logDateParts[0].trim(), 10);
            const month = parseInt(logDateParts[1].trim(), 10);
            const year = parseInt(logDateParts[2].trim(), 10);
            const logDate = new Date(year, month - 1, day);
            
            if (logDate >= start && logDate <= end) {
              if (store === "all" || log["Prevádzka"] === store) {
                deletedCount++;
                return;
              }
            }
          }
        }
        newData[key] = log;
      });

      await firestoreSet("Global", "Databaza", newData);
      res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error("Error deleting lunch range:", error);
      res.status(500).json({ error: `Chyba pri mazaní: ${error.message}` });
    }
  });

  app.post("/api/vacation/delete-range", async (req, res) => {
    try {
      const { startDate, endDate, store } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Chýba dátum od alebo do" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dbData = await firestoreGet("Global", "Databaza") || {};
      const newData: Record<string, any> = {};
      let deletedCount = 0;

      Object.keys(dbData).forEach(key => {
        const log = dbData[key];
        const action = log["Akcia"];
        
        if (action === "Dovolenka" || action === "vacation") {
          const logDateParts = String(log["dátum"]).split('.');
          if (logDateParts.length >= 3) {
            const day = parseInt(logDateParts[0].trim(), 10);
            const month = parseInt(logDateParts[1].trim(), 10);
            const year = parseInt(logDateParts[2].trim(), 10);
            const logDate = new Date(year, month - 1, day);
            
            if (logDate >= start && logDate <= end) {
              if (store === "all" || log["Prevádzka"] === store) {
                deletedCount++;
                return;
              }
            }
          }
        }
        newData[key] = log;
      });

      await firestoreSet("Global", "Databaza", newData);
      res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error("Error deleting vacation range:", error);
      res.status(500).json({ error: `Chyba pri mazaní: ${error.message}` });
    }
  });

  return httpServer;
}
