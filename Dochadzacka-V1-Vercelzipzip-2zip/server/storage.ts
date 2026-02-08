import {
  type AttendanceLog,
  type InsertAttendanceLog,
} from "@shared/schema";
import { firestoreGet, firestoreSet } from "./firebase";

export interface IStorage {
  createAttendanceLog(log: InsertAttendanceLog): Promise<AttendanceLog>;
  getAttendanceLogs(): Promise<AttendanceLog[]>;
  getLunchLogs(): Promise<AttendanceLog[]>;
  getAdminCode(): Promise<string>;
  verifyEmployee(code: string): Promise<string | null>;
  getStores(): Promise<string[]>;
  getSettings(): Promise<{ selectedStore?: string }>;
  updateSettings(settings: { selectedStore: string }): Promise<void>;
  updateAdminCode(newCode: string): Promise<void>;
}

export class FirebaseStorage implements IStorage {
  async getStores(): Promise<string[]> {
    const data = await firestoreGet("Global", "Prevadzky");
    if (!data) return [];
    return Object.keys(data)
      .sort((a, b) => Number(a) - Number(b))
      .map(key => data[key]);
  }

  async getSettings(): Promise<{ selectedStore?: string }> {
    return {};
  }

  async updateSettings(settings: { selectedStore: string }): Promise<void> {
    // We no longer store this in Firestore to allow device-specific selection
    return;
  }

  async updateAdminCode(newCode: string): Promise<void> {
    await firestoreSet("Global", "adminCode", { adminCode: newCode });
  }

  async updateAttendanceLogPhoto(logId: string, photoPath: string): Promise<void> {
    const databazaData = await firestoreGet("Global", "Databaza") || {};
    if (databazaData[logId]) {
      databazaData[logId]["Foto"] = photoPath;
      await firestoreSet("Global", "Databaza", databazaData);
    }
  }

  async verifyEmployee(code: string): Promise<string | null> {
    try {
      const employees = await firestoreGet("Global", "Zamestnanci");
      
      if (!employees || typeof employees !== 'object') {
        console.error("Firebase response invalid for Global/Zamestnanci");
        return null;
      }
      
      const searchCode = String(code).trim();
      
      // Look for the name by the key (PIN)
      for (const [key, value] of Object.entries(employees)) {
        const trimmedKey = String(key).trim();
        // Exact string match OR numeric value match
        if (trimmedKey === searchCode || Number(trimmedKey) === Number(searchCode)) {
          return String(value);
        }
      }

      console.log(`Auth failed: Code "${searchCode}" not found in Firestore document keys.`);
      return null;
    } catch (error) {
      console.error("Error verifying employee:", error);
      return null;
    }
  }

  async getAdminCode(): Promise<string> {
    try {
      const data = await firestoreGet("Global", "adminCode");
      if (!data) return "12345";
      return String(data.adminCode || "");
    } catch (error) {
      console.error("Error fetching admin code from Firestore:", error);
      return "12345";
    }
  }

  async createAttendanceLog(log: InsertAttendanceLog & { selectedStore?: string, photoPath?: string }): Promise<AttendanceLog> {
    const employeeName = await this.verifyEmployee(log.code);
    if (!employeeName) {
      throw new Error("Neplatný kód zamestnanca");
    }
    
    const dbData = await firestoreGet("Global", "Databaza") || {};
    const logs = Object.values(dbData) as any[];
    
    if (log.type === "arrival") {
      const employeeLogs = logs
        .filter(l => String(l["Kód"]) === String(log.code))
        .sort((a, b) => {
          try {
            const timeA = new Date(`${a["dátum"].split('.').reverse().join('-')}T${a["Original čas príchodu"]}`).getTime();
            const timeB = new Date(`${b["dátum"].split('.').reverse().join('-')}T${b["Original čas príchodu"]}`).getTime();
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

    const getBratislavaTime = async () => {
      const d = new Date();
      const bratislavaString = d.toLocaleString("en-US", { 
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
    };

    const now = await getBratislavaTime();
    
    // Explicitly set locale and timezone for strings
    const dateOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'Europe/Bratislava',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'Europe/Bratislava',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const formattedDate = new Intl.DateTimeFormat('sk-SK', dateOptions).format(now);
    const formattedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(now);
    
    let timestamp = now;
    if (log.type === "arrival") {
      const ms = 1000 * 60 * 30; // 30 minutes in milliseconds
      timestamp = new Date(Math.round(now.getTime() / ms) * ms);
    }
    const formattedRoundedTime = new Intl.DateTimeFormat('sk-SK', timeOptions).format(timestamp);

    const logId = `log_${new Date().getTime()}`;
    const prevadzka = log.selectedStore || "Neznáma prevádzka";
    
    const currentDbData = await firestoreGet("Global", "Databaza") || {};
    currentDbData[logId] = {
      "Kód": log.code,
      "Meno": employeeName,
      "dátum": formattedDate,
      "Original čas príchodu": formattedTime,
      "Zaokruhlený čas príchodu": formattedRoundedTime,
      "Akcia": log.type === "arrival" ? "Príchod" : log.type === "departure" ? "Odchod" : log.type === "lunch" ? "Obed" : "Dovolenka",
      "Prevádzka": prevadzka,
      "Foto": log.photoPath || ""
    };
    
    await firestoreSet("Global", "Databaza", currentDbData);
    
    console.log(`Log created for ${employeeName}:`, currentDbData[logId]);

    return {
      id: logId,
      ...log,
      meno: employeeName,
      createdAt: now,
    };
  }

  async getAttendanceLogs(): Promise<AttendanceLog[]> {
    return [];
  }

  async getLunchLogs(): Promise<AttendanceLog[]> {
    return [];
  }
}

export const storage = new FirebaseStorage();
