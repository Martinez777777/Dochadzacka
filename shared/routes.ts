import { z } from 'zod';
import { insertAttendanceLogSchema, type AttendanceLog } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  attendance: {
    create: {
      method: 'POST' as const,
      path: '/api/attendance',
      input: insertAttendanceLogSchema,
      responses: {
        201: z.custom<AttendanceLog>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/attendance',
      responses: {
        200: z.array(z.custom<AttendanceLog>()),
      },
    },
    lunches: {
      method: 'GET' as const,
      path: '/api/attendance/lunches',
      responses: {
        200: z.array(z.custom<AttendanceLog>()),
      },
    },
    adminCode: {
      method: 'GET' as const,
      path: '/api/admin-code',
      responses: {
        200: z.object({ adminCode: z.string() }),
      },
    },
    stores: {
      method: 'GET' as const,
      path: '/api/stores',
      responses: {
        200: z.array(z.string()),
      },
    },
    settings: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.object({ selectedStore: z.string().optional() }),
      },
    },
    updateSettings: {
      method: 'POST' as const,
      path: '/api/settings',
      input: z.object({ selectedStore: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    updateAdminCode: {
      method: 'POST' as const,
      path: '/api/admin-code',
      input: z.object({ newCode: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    employees: {
      method: 'GET' as const,
      path: '/api/employees',
      responses: {
        200: z.record(z.string()),
      },
    },
    activeEmployees: {
      method: 'GET' as const,
      path: '/api/attendance/active',
      responses: {
        200: z.array(z.object({
          meno: z.string(),
          datum: z.string(),
          cas: z.string(),
          zaokruhlenyCas: z.string(),
          prevadzka: z.string()
        })),
      },
    },
    createLunch: {
      method: 'POST' as const,
      path: '/api/attendance/lunch',
      input: z.object({
        code: z.string(),
        date: z.string(),
        selectedStore: z.string().optional()
      }),
      responses: {
        201: z.object({ success: z.boolean(), meno: z.string() }),
        400: errorSchemas.validation,
      },
    },
    createVacation: {
      method: 'POST' as const,
      path: '/api/attendance/vacation',
      input: z.object({
        code: z.string(),
        date: z.string(),
        duration: z.string(),
        selectedStore: z.string().optional(),
        overwrite: z.boolean().optional()
      }),
      responses: {
        201: z.object({ success: z.boolean(), meno: z.string() }),
        400: errorSchemas.validation,
        409: z.object({ message: z.string() })
      },
    },
    openingHours: {
      method: 'GET' as const,
      path: '/api/stores/opening-hours',
      responses: {
        200: z.record(z.string()),
      },
    },
    updateOpeningHours: {
      method: 'POST' as const,
      path: '/api/stores/opening-hours',
      input: z.object({
        store: z.string(),
        hours: z.record(z.string()),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    exportIndividual: {
      method: 'POST' as const,
      path: '/api/export/individual',
      input: z.object({
        startDate: z.string(),
        endDate: z.string()
      }),
      responses: {
        200: z.object({ success: z.boolean(), objectPath: z.string() }),
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
