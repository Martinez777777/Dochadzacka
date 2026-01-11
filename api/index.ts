import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ftp from 'basic-ftp';

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
  const d = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Bratislava',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const map: any = {};
    parts.forEach(p => map[p.type] = p.value);
    return new Date(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  } catch (e) {
    console.error("Intl failure:", e);
  }
  return d;
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

  const { Readable } = await import("stream");
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
  clientTimestamp?: string;
}

interface AttendanceResult {
  id: string;
  code: string;
  type: string;
  meno: string;
  createdAt: Date;
}

async function createAttendanceLog(input: CreateAttendanceInput): Promise<AttendanceResult> {
  const { code, type, selectedStore, photoPath, clientTimestamp } = input;

  const employeeName = await verifyEmployee(code);
  if (!employeeName) {
    throw new Error("Neplatný kód zamestnanca");
  }

  const dbData = await firestoreGet("Global", "Databaza") || {};
  const logs = Object.values(dbData) as any[];

  if (type === "arrival") {
    const employeeLogs = logs
      .filter(l => String(l["Kód"]) === String(code))
      .sort((a, b) => {
        try {
          const [d, m, y] = a["dátum"].split('.').map(Number);
          const [hh, mm, ss] = a["Original čas príchodu"].split(':').map(Number);
          const timeA = new Date(y, m - 1, d, hh, mm, ss).getTime();

          const [d2, m2, y2] = b["dátum"].split('.').map(Number);
          const [hh2, mm2, ss2] = b["Original čas príchodu"].split(':').map(Number);
          const timeB = new Date(y2, m2 - 1, d2, hh2, mm2, ss2).getTime();
          
          return timeB - timeA;
        } catch(e) { return 0; }
      });

    if (employeeLogs.length > 0) {
      const lastLog = employeeLogs[0];
      const lastAction = lastLog["Akcia"];
      if (lastAction === "Príchod" || lastAction === "arrival") {
        throw new Error(`Zabudol si sa odhlásiť. Napíš manažérovi, ináč sa ti nezaráta zmena. Si prihlásený od ${lastLog["dátum"]} ${lastLog["Original čas príchodu"]} na prevádzke ${lastLog["Prevádzka"] || "neznámej"}`);
      }
    }
  }

  if (type === "departure") {
    const employeeLogs = logs
      .filter(l => String(l["Kód"]) === String(code))
      .sort((a, b) => {
        try {
          const [d, m, y] = a["dátum"].split('.').map(Number);
          const [hh, mm, ss] = a["Original čas príchodu"].split(':').map(Number);
          const timeA = new Date(y, m - 1, d, hh, mm, ss).getTime();

          const [d2, m2, y2] = b["dátum"].split('.').map(Number);
          const [hh2, mm2, ss2] = b["Original čas príchodu"].split(':').map(Number);
          const timeB = new Date(y2, m2 - 1, d2, hh2, mm2, ss2).getTime();
          
          return timeB - timeA;
        } catch(e) { return 0; }
      });

    const lastLog = employeeLogs.length > 0 ? employeeLogs[0] : null;
    const lastAction = lastLog ? lastLog["Akcia"] : null;
    const lastStore = lastLog ? lastLog["Prevádzka"] : null;
    const currentStore = selectedStore || "Neznáma prevádzka";
    
    if (!lastLog || lastAction !== "Príchod") {
      throw new Error("ERR_NO_ARRIVAL");
    }

    if (lastAction === "Odchod" || lastAction === "departure") {
      throw new Error("Zabudol si sa prihlásiť. Napíš manažérovi ináč sa ti nezapíše zmena.");
    }

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

  const now = clientTimestamp ? new Date(clientTimestamp) : await getBratislavaTime();
  
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
  
  let timestamp = now;
  if (type === "arrival" || type === "departure") {
    const ms = 1000 * 60 * 30;
    const roundedTime = Math.round(now.getTime() / ms) * ms;
    timestamp = new Date(roundedTime);
  }
  const formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);

  const logId = `log_${new Date().getTime()}`;
  const prevadzka = selectedStore || "Neznáma prevádzka";
  
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
  
  return {
    id: logId,
    code,
    type,
    meno: employeeName,
    createdAt: now
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let url = req.url || '';
  if (!url.startsWith('/api')) {
    url = '/api' + (url.startsWith('/') ? url : '/' + url);
  }
  url = url.split('?')[0];
  const method = req.method || 'GET';

  try {
    if (url.includes('/api/uploads/ftp') && method === 'POST') {
      const { name, base64Data, logId } = req.body;
      if (!name || !base64Data) {
        return res.status(400).json({ error: "Chýbajúce údaje" });
      }
      const result = await uploadPhotoFTP(name, base64Data, logId);
      return res.json(result);
    }

    if (url.includes('/api/verify-admin-code') && method === 'POST') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Invalid code" });
      
      const adminCode = await getAdminCode();
      if (String(adminCode) === String(code)) {
        return res.json({ success: true });
      }
      return res.status(401).json({ message: "Nesprávny PIN kód" });
    }

    if (url.includes('/api/admin-code') && method === 'GET') {
      const adminCode = await getAdminCode();
      return res.json({ adminCode });
    }

    if (url.includes('/api/admin-code') && method === 'POST') {
      const { newCode } = req.body;
      await firestoreSet("Global", "adminCode", { adminCode: newCode });
      return res.json({ success: true });
    }

    if (url.includes('/api/stores') && method === 'GET') {
      const stores = await getStores();
      return res.json(stores);
    }

    if (url.includes('/api/settings') && method === 'GET') {
      const data = await firestoreGet("Global", "Nastavenia");
      return res.json(data || {});
    }

    if (url.includes('/api/settings') && method === 'POST') {
      const { selectedStore } = req.body;
      await firestoreSet("Global", "Nastavenia", { selectedStore });
      return res.json({ success: true });
    }

    if (url.includes('/api/employees') && method === 'GET') {
      const employees = await firestoreGet("Global", "Zamestnanci");
      return res.json(employees || {});
    }

    if (url.includes('/api/attendance/lunch') && method === 'POST') {
      const { code, date, selectedStore } = req.body;
      const employeeName = await verifyEmployee(code);
      if (!employeeName) {
        return res.status(400).json({ message: "Neplatný kód zamestnanca" });
      }

      const dbData = await firestoreGet("Global", "Databaza") || {};
      const logs = Object.values(dbData) as any[];

      const [y, m, d] = date.split('-');
      const dNum = parseInt(d, 10);
      const mNum = parseInt(m, 10);
      
      const possibleFormats = [
        `${d}. ${m}. ${y}`,
        `${dNum}. ${mNum}. ${y}`,
        `${dNum}. ${m}. ${y}`,
        `${d}.${m}.${y}`,
        `${dNum}.${mNum}.${y}`,
        `${dNum}. ${mNum}. ${y}`,
        `${d}. ${mNum}. ${y}`,
        `${d}.${mNum}.${y}`,
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

      const logId = `log_${new Date().getTime()}`;
      const prevadzka = selectedStore || "Neznáma prevádzka";
      const finalSlovakDate = possibleFormats[0];
      
      dbData[logId] = {
        "Kód": code,
        "Meno": employeeName,
        "dátum": finalSlovakDate,
        "Original čas príchodu": new Date().toLocaleTimeString("sk-SK", { hour12: false }),
        "Zaokruhlený čas príchodu": "",
        "Akcia": "Obed",
        "Prevádzka": prevadzka,
        "Foto": ""
      };
      
      await firestoreSet("Global", "Databaza", dbData);
      return res.status(201).json({ success: true, meno: employeeName });
    }

    if (url.includes('/api/lunches') && method === 'GET') {
      try {
        const queryParams = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
        const code = queryParams.get('code');
        const from = queryParams.get('from');
        const to = queryParams.get('to');

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

        return res.json(filteredLunches);
      } catch (error) {
        console.error("Error fetching lunch overview:", error);
        return res.status(500).json({ message: "Chyba pri načítaní obedov" });
      }
    }

    if (url.includes('/api/lunches') && method === 'GET') {
      try {
        const queryParams = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
        const code = queryParams.get('code');
        const from = queryParams.get('from');
        const to = queryParams.get('to');

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

        return res.json(filteredLunches);
      } catch (error) {
        console.error("Error fetching lunch overview:", error);
        return res.status(500).json({ message: "Chyba pri načítaní obedov" });
      }
    }

    if (url.includes('/api/attendance/vacation') && method === 'DELETE') {
      const dbData = await firestoreGet("Global", "Databaza") || {};
      const newData: Record<string, any> = {};
      
      Object.keys(dbData).forEach(key => {
        if (dbData[key]["Akcia"] !== "Dovolenka") {
          newData[key] = dbData[key];
        }
      });
      
      await firestoreSet("Global", "Databaza", newData);
      return res.json({ success: true });
    }

    if (url.includes('/api/attendance/vacation') && method === 'POST') {
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
      return res.status(201).json({ success: true, meno: employeeName });
    }

    if (url.includes('/api/attendance/lunches') && method === 'GET') {
      return res.json([]);
    }

    if (url.includes('/api/attendance') && method === 'GET') {
      return res.json([]);
    }

    if (url.includes('/api/attendance') && method === 'POST') {
      const { code, type, selectedStore, photoPath, clientTimestamp } = req.body;
      
      try {
        const result = await createAttendanceLog({ code, type, selectedStore, photoPath, clientTimestamp });
        return res.status(201).json(result);
      } catch (err: any) {
        return res.status(400).json({
          message: err.message,
          field: "code"
        });
      }
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
