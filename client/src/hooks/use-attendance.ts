import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertAttendanceLog } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import * as React from "react";

export function useAttendanceLogs() {
  return useQuery({
    queryKey: [api.attendance.list.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return (await res.json()) as any[];
    },
  });
}

export function useLunchLogs() {
  return useQuery({
    queryKey: [api.attendance.lunches.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.lunches.path);
      if (!res.ok) throw new Error("Failed to fetch lunch logs");
      return (await res.json()) as any[];
    },
  });
}

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAttendanceLog) => {
      const validated = api.attendance.create.input.parse(data);
      const selectedStore = localStorage.getItem("selectedStore");
      
      const res = await fetch(api.attendance.create.path, {
        method: api.attendance.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...validated,
          selectedStore: selectedStore 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to create attendance log' }));
        throw new Error(errorData.message || 'Failed to create attendance log');
      }
      return (await res.json()) as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.attendance.lunches.path] });
    },
    onError: (error: any) => {
      // Logic moved to component to handle dialog sequence
    },
  });
}
