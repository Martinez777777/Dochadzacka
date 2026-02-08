import { z } from "zod";

// Simplified schema without Drizzle/DB dependencies for easy export
export interface AttendanceLog {
  id: string | number;
  code: string;
  type: string;
  meno?: string;
  createdAt: Date;
}

export const adminCodeUpdateSchema = z.object({
  newCode: z.string().min(4, "Kód musí mať aspoň 4 znaky"),
});

export type AdminCodeUpdate = z.infer<typeof adminCodeUpdateSchema>;

export const insertAttendanceLogSchema = z.object({
  code: z.string().min(1, "Zadajte kód"),
  type: z.string(),
  photoData: z.string().optional(),
  photoPath: z.string().optional(),
  clientTimestamp: z.string().optional(),
  isManual: z.boolean().optional(),
});

export type InsertAttendanceLog = z.infer<typeof insertAttendanceLogSchema>;
