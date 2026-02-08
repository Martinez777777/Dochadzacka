import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Utensils, Palmtree, List, Shield, ChefHat, Camera } from "lucide-react";
import { Keypad } from "@/components/Keypad";
import { CodeInput } from "@/components/CodeInput";
import { useCreateAttendance } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getNetworkTime } from "@/utils/time";

const DEVICE_AUTH_KEY = "tofako_device_authorized";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Home() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false);
  const [isManagerMenuOpen, setIsManagerMenuOpen] = useState(false);
  const [managerInput, setManagerInput] = useState("");
  const [managerTarget, setManagerTarget] = useState<"menu" | "prevadzka" | "logout">("menu");
  const [isLunchDialogOpen, setIsLunchDialogOpen] = useState(false);
  const [isVacationDialogOpen, setIsVacationDialogOpen] = useState(false);
  const [isActiveEmployeesDialogOpen, setIsActiveEmployeesDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isOpeningHoursDialogOpen, setIsOpeningHoursDialogOpen] = useState(false);
  const [isFixOpeningHoursDialogOpen, setIsFixOpeningHoursDialogOpen] = useState(false);
  const [isFixClosingHoursDialogOpen, setIsFixClosingHoursDialogOpen] = useState(false);
  const [openingHoursData, setOpeningHoursData] = useState<Record<string, string>>({});
  const [fixOpeningHoursData, setFixOpeningHoursData] = useState<Record<string, string>>({});
  const [fixClosingHoursData, setFixClosingHoursData] = useState<Record<string, string>>({});
  const [renameCode, setRenameCode] = useState("");
  const [renameNewName, setRenameNewName] = useState("");
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
  const [isAttendanceOverviewDialogOpen, setIsAttendanceOverviewDialogOpen] = useState(false);
  const [isStoreClosedDialogOpen, setIsStoreClosedDialogOpen] = useState(false);
  const [isStoreClosedDepartureDialogOpen, setIsStoreClosedDepartureDialogOpen] = useState(false);
  const [isStoreClosedDayDialogOpen, setIsStoreClosedDayDialogOpen] = useState(false);
  const [storeClosedDayMessage, setStoreClosedDayMessage] = useState("");
  const [isVacationOverviewDialogOpen, setIsVacationOverviewDialogOpen] = useState(false);
  const [isStoreCountDialogOpen, setIsStoreCountDialogOpen] = useState(false);
  const [isLunchOverviewDialogOpen, setIsLunchOverviewDialogOpen] = useState(false);

  const [manualEntryEmployee, setManualEntryEmployee] = useState("");
  const [manualEntryAction, setManualEntryAction] = useState("arrival");
  const [manualEntryStore, setManualEntryStore] = useState("");
  const [manualEntryDate, setManualEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualEntryTime, setManualEntryTime] = useState(new Date().toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", hour12: false }));
  const [lunchOverviewEmployee, setLunchOverviewEmployee] = useState("");
  const [lunchOverviewFromDate, setLunchOverviewFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [lunchOverviewToDate, setLunchOverviewToDate] = useState(new Date().toISOString().split('T')[0]);
  const [lunchOverviewResults, setLunchOverviewResults] = useState<any[]>([]);
  const [isViewingLunchOverview, setIsViewingLunchOverview] = useState(false);
  const [lunchEmployee, setLunchEmployee] = useState("");
  const [attendanceOverviewFromDate, setAttendanceOverviewFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceOverviewToDate, setAttendanceOverviewToDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceOverviewStore, setAttendanceOverviewStore] = useState("all");
  const [vacationOverviewFromDate, setVacationOverviewFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationOverviewToDate, setVacationOverviewToDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceOverviewResults, setAttendanceOverviewResults] = useState<any[]>([]);
  const [lunchDate, setLunchDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationEmployee, setVacationEmployee] = useState("");
  const [vacationDate, setVacationDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationDuration, setVacationDuration] = useState("8");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!isLunchDialogOpen) {
      setLunchEmployee("");
      setLunchDate(new Date().toISOString().split('T')[0]);
    }
  }, [isLunchDialogOpen]);

  useEffect(() => {
    if (!isVacationDialogOpen) {
      setVacationEmployee("");
      setVacationDate(new Date().toISOString().split('T')[0]);
      setVacationDuration("8");
    }
  }, [isVacationDialogOpen]);

  useEffect(() => {
    if (!isLunchOverviewDialogOpen) {
      setLunchOverviewEmployee("");
      setLunchOverviewResults([]);
      setIsViewingLunchOverview(false);
      const today = new Date().toISOString().split('T')[0];
      setLunchOverviewFromDate(today);
      setLunchOverviewToDate(today);
    }
  }, [isLunchOverviewDialogOpen]);

  useEffect(() => {
    if (!isAttendanceOverviewDialogOpen) {
      const today = new Date().toISOString().split('T')[0];
      setAttendanceOverviewFromDate(today);
      setAttendanceOverviewToDate(today);
    }
  }, [isAttendanceOverviewDialogOpen]);

  useEffect(() => {
    if (!isVacationOverviewDialogOpen) {
      const today = new Date().toISOString().split('T')[0];
      setVacationOverviewFromDate(today);
      setVacationOverviewToDate(today);
    }
  }, [isVacationOverviewDialogOpen]);

  const { data: stores } = useQuery<any[]>({
    queryKey: [api.attendance.stores.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.stores.path);
      return res.json();
    }
  });

  const { data: localStore } = useQuery({
    queryKey: ["localSettings"],
    queryFn: () => localStorage.getItem("selectedStore") || null
  });

  const { toast, dismiss } = useToast();
  const createAttendance = useCreateAttendance();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: adminData } = useQuery({
    queryKey: [api.attendance.adminCode.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.adminCode.path);
      return res.json();
    }
  });

  const { data: employees } = useQuery<Record<string, string>>({
    queryKey: [api.attendance.employees.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.employees.path);
      return res.json();
    }
  });

  const [, setLocation] = useLocation();

  const { data: activeEmployees, isLoading: isActiveEmployeesLoading } = useQuery<any[]>({
    queryKey: ["/api/attendance/active"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/active", {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch active employees");
      return res.json();
    },
    enabled: isActiveEmployeesDialogOpen,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const { data: attendanceOverview, isLoading: isAttendanceOverviewLoading, refetch: refetchAttendanceOverview } = useQuery<any[]>({
    queryKey: ["/api/attendance/overview", attendanceOverviewFromDate, attendanceOverviewToDate, attendanceOverviewStore],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/overview?from=${attendanceOverviewFromDate}&to=${attendanceOverviewToDate}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch attendance overview");
      const allData = await res.json();
      // Filter by store if selected
      const filteredByStore = attendanceOverviewStore === "all" 
        ? allData 
        : allData.filter((log: any) => log["Prevádzka"] === attendanceOverviewStore);

      // Filter out vacations - only show arrival, departure, and lunch
      return filteredByStore.filter((log: any) => 
        log["Akcia"] === "Príchod" || log["Akcia"] === "arrival" || 
        log["Akcia"] === "Odchod" || log["Akcia"] === "departure" ||
        log["Akcia"] === "Obed" || log["Akcia"] === "lunch"
      );
    },
    enabled: isAttendanceOverviewDialogOpen,
    refetchOnMount: true,
  });

  const { data: vacationOverview, isLoading: isVacationOverviewLoading } = useQuery<any[]>({
    queryKey: ["/api/attendance/overview", vacationOverviewFromDate, vacationOverviewToDate, "Dovolenka"],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/overview?from=${vacationOverviewFromDate}&to=${vacationOverviewToDate}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch vacation overview");
      const allData = await res.json();
      return allData.filter((log: any) => log["Akcia"] === "Dovolenka" || log["Akcia"] === "vacation")
        .sort((a: any, b: any) => {
          const [dA, mA, yA] = a["dátum"].split('.').map(Number);
          const [dB, mB, yB] = b["dátum"].split('.').map(Number);
          return new Date(yB, mB - 1, dB).getTime() - new Date(yA, mA - 1, dA).getTime();
        });
    },
    enabled: isVacationOverviewDialogOpen,
    refetchOnMount: true,
  });

  const { data: storeCounts, isLoading: isStoreCountsLoading, refetch: refetchStoreCounts } = useQuery<any[]>({
    queryKey: ["/api/attendance/active"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/active", {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch store counts");
      const active = await res.json();
      
      // Group by store and count
      const counts: Record<string, number> = {};
      active.forEach((emp: any) => {
        const store = emp.prevadzka || "Neznáma prevádzka";
        counts[store] = (counts[store] || 0) + 1;
      });
      
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
    enabled: isStoreCountDialogOpen,
    refetchOnMount: true,
  });

  const { data: storeLimits, refetch: refetchStoreLimits } = useQuery<Record<string, string>>({
    queryKey: ["/api/stores/limits"],
    queryFn: async () => {
      const res = await fetch("/api/stores/limits");
      if (!res.ok) throw new Error("Failed to fetch limits");
      return res.json();
    },
    enabled: isStoreCountDialogOpen
  });

  const saveStoreLimit = useMutation({
    mutationFn: async ({ store, limit }: { store: string, limit: string }) => {
      const res = await fetch("/api/stores/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, limit })
      });
      if (!res.ok) throw new Error("Failed to save limit");
      return res.json();
    },
    onSuccess: () => {
      refetchStoreLimits();
      toast({ title: "✅ Limit úspešne uložený", className: "bg-green-600 text-white" });
    }
  });

  const prevadzkaName = localStore || "Neznáma prevádzka";

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isRenameDialogOpen) {
      setRenameCode("");
      setRenameNewName("");
    }
  }, [isRenameDialogOpen]);

  const handleRenameSave = async () => {
    if (!renameCode || !renameNewName) {
      toast({
        title: "❌ Chýbajú údaje",
        description: "Prosím vyplňte kód aj nové meno.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/employees/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: renameCode, newName: renameNewName }),
      });

      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        toast({
          title: "❌ Chyba",
          description: data.error || "Nepodarilo sa zmeniť meno.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Meno úspešne zmenené",
        description: `Nové meno: ${renameNewName}`,
        className: "bg-green-600 text-white",
      });
      
      queryClient.invalidateQueries({ queryKey: [api.attendance.employees.path] });
      setIsRenameDialogOpen(false);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "❌ Chyba",
        description: "Chyba pripojenia k serveru.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isManualEntryDialogOpen) {
      setManualEntryEmployee("");
      setManualEntryAction("arrival");
      setManualEntryStore(localStore || "");
      setManualEntryDate(new Date().toISOString().split('T')[0]);
      setManualEntryTime(new Date().toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }
  }, [isManualEntryDialogOpen, localStore]);

  const handleManagerSubmit = () => {
    if (adminData?.adminCode === managerInput) {
      setManagerInput("");
      setIsManagerDialogOpen(false);
      // Use setTimeout to ensure the first dialog is fully closed before opening the next one
      setTimeout(() => {
        if (managerTarget === "menu") {
          setIsManagerMenuOpen(true);
        } else if (managerTarget === "prevadzka") {
          setLocation("/prevadzka");
        } else if (managerTarget === "logout") {
          if (confirm("Naozaj chcete odhlásiť zariadenie?")) {
            localStorage.removeItem(DEVICE_AUTH_KEY);
            window.location.reload();
          }
        }
      }, 100);
    } else {
      toast({
        title: "Nesprávny kód",
        description: "Zadaný manažérsky kód je nesprávny.",
        variant: "destructive",
      });
    }
  };

  const handleLunchOverviewShow = async () => {
    if (!lunchOverviewEmployee || !lunchOverviewFromDate || !lunchOverviewToDate) {
      toast({
        title: "❌ Zabudol si niečo vyplniť, oprav to.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`${api.attendance.lunches.path}?code=${lunchOverviewEmployee}&from=${lunchOverviewFromDate}&to=${lunchOverviewToDate}`);
      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        toast({
          title: "❌ Chyba",
          description: data.message || "Nepodarilo sa načítať obedy.",
          variant: "destructive",
        });
        return;
      }

      setLunchOverviewResults(data);
      setIsViewingLunchOverview(true);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "❌ Chyba",
        description: "Chyba pripojenia k serveru.",
        variant: "destructive",
      });
    }
  };

  const handleLunchSave = async () => {
    if (!lunchEmployee || !lunchDate) {
      toast({
        title: "❌ Zabudol si niečo vyplniť, oprav to.",
        variant: "destructive",
      });
      return;
    }

    const networkTime = await getNetworkTime();
    const clientTimestamp = networkTime.toLocaleString("sv-SE", { timeZone: "Europe/Bratislava" }).replace(' ', 'T') + '.000Z';
    setIsProcessing(true);
    try {
      const res = await fetch(api.attendance.createLunch.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: lunchEmployee,
          date: lunchDate,
          selectedStore: localStore,
          clientTimestamp
        }),
      });

      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        if (data.message === "ERR_NOT_WORKED") {
          toast({
            title: "❌ V tento deň si nepracoval. Skontroluj to.",
            description: "Pre zápis obeda musíš mať v daný deň príchod.",
            variant: "destructive",
            duration: 999999, // Set high duration so it doesn't auto-dismiss
            className: "bg-red-600 text-white",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        } else if (data.message.startsWith("ERR_WRONG_STORE:")) {
          const storeName = data.message.split(":")[1];
          toast({
            title: "❌ Nesprávna prevádzka",
            description: `POZOR! Príchod máš na inej prevádzke ${storeName}. Tam by si mal mať aj obed. Napíš manažérovi.`,
            variant: "destructive",
            duration: 999999,
            className: "bg-red-600 text-white",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        } else if (data.message === "ERR_ALREADY_HAD_LUNCH") {
          toast({
            title: "❌ Obed si už mal. Skontroluj to.",
            description: "Záznam o obede pre tento deň už existuje.",
            variant: "destructive",
            duration: 999999,
            className: "bg-red-600 text-white",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        } else {
          toast({
            title: "❌ Chyba",
            description: data.message || "Nepodarilo sa uložiť obed.",
            variant: "destructive",
            duration: 999999,
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        }
        return;
      }

      const meno = data.meno || "zamestnanec";
      const formattedDate = new Date(lunchDate).toLocaleDateString("sk-SK");
      
      toast({
        title: `✅ Super ${meno}. Zapísal si si obed na dátum ${formattedDate}.`,
        duration: 10000,
        className: "bg-green-600 text-white",
      });
      
      setIsLunchDialogOpen(false);
      setLunchEmployee("");
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "❌ Chyba",
        description: "Chyba pripojenia k serveru.",
        variant: "destructive",
      });
    }
  };

  const handleVacationSave = async (overwrite: boolean = false) => {
    if (!vacationEmployee || !vacationDate || !vacationDuration) {
      toast({
        title: "❌ Zabudol si niečo vyplniť, oprav to.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(api.attendance.createVacation.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: vacationEmployee,
          date: vacationDate,
          duration: vacationDuration,
          selectedStore: localStore,
          overwrite
        }),
      });

      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        if (res.status === 409 && data.message === "ERR_ALREADY_HAD_VACATION") {
          toast({
            title: "❌ Dovolenku už máš nahratú, chceš to opraviť?",
            description: (
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                <ToastAction 
                  altText="Nie"
                  onClick={() => {
                    dismiss();
                  }}
                  className="h-11 bg-white text-black border-2 border-white hover:bg-gray-100 font-bold flex items-center justify-center rounded-md cursor-pointer"
                >
                  Nie
                </ToastAction>
                <ToastAction 
                  altText="Opraviť"
                  onClick={() => {
                    dismiss(); // Close the toast first
                    handleVacationSave(true); // Then start the save process
                  }}
                  className="h-11 bg-white text-black border-2 border-white hover:bg-gray-100 font-bold flex items-center justify-center rounded-md cursor-pointer"
                >
                  Opraviť
                </ToastAction>
              </div>
            ),
            variant: "destructive",
            duration: 999999,
            className: "bg-red-600 text-white flex-col items-start p-6 [&>button]:hidden",
          });
        } else {
          toast({
            title: "❌ Chyba",
            description: data.message || "Nepodarilo sa uložiť dovolenku.",
            variant: "destructive",
            duration: 999999,
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        }
        return;
      }

      const meno = data.meno || "zamestnanec";
      const formattedDate = new Date(vacationDate).toLocaleDateString("sk-SK");
      
      toast({
        title: `✅ Super ${meno}. Zapísal si si dovolenku (${vacationDuration}h) na dátum ${formattedDate}.`,
        duration: 10000,
        className: "bg-green-600 text-white",
      });
      
      setIsVacationDialogOpen(false);
      setVacationEmployee("");
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "❌ Chyba",
        description: "Chyba pripojenia k serveru.",
        variant: "destructive",
      });
    }
  };

  const [isExportDatesDialogOpen, setIsExportDatesDialogOpen] = useState(false);
  const [isExportSummaryDialogOpen, setIsExportSummaryDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isDeleteAttendanceDialogOpen, setIsDeleteAttendanceDialogOpen] = useState(false);
  const [deleteAttendanceStartDate, setDeleteAttendanceStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteAttendanceEndDate, setDeleteAttendanceEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteAttendanceStore, setDeleteAttendanceStore] = useState("all");

  const [isDeleteLunchDialogOpen, setIsDeleteLunchDialogOpen] = useState(false);
  const [deleteLunchStartDate, setDeleteLunchStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteLunchEndDate, setDeleteLunchEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteLunchStore, setDeleteLunchStore] = useState("all");

  const [isDeleteVacationDialogOpen, setIsDeleteVacationDialogOpen] = useState(false);
  const [deleteVacationStartDate, setDeleteVacationStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteVacationEndDate, setDeleteVacationEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteVacationStore, setDeleteVacationStore] = useState("all");

  const handleExportIndividual = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch(api.attendance.exportIndividual.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: exportStartDate,
          endDate: exportEndDate
        }),
      });
      
      const data = await res.json();
      setIsProcessing(false);
      setIsExportDatesDialogOpen(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: data.error, variant: "destructive" });
        return;
      }

      toast({ 
        title: "✅ Export úspešný", 
        description: "Súbor bol uložený do priečinka Exporty.",
        className: "bg-green-600 text-white" 
      });
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba pripojenia", variant: "destructive" });
    }
  };

  const handleExportSummary = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch("/api/export/summary", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: exportStartDate,
          endDate: exportEndDate
        }),
      });
      
      const data = await res.json();
      setIsProcessing(false);
      setIsExportSummaryDialogOpen(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: data.error, variant: "destructive" });
        return;
      }

      toast({ 
        title: "✅ Export úspešný", 
        description: "Súbor (Súhrn) bol uložený do priečinka Exporty.",
        className: "bg-green-600 text-white" 
      });
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba pripojenia", variant: "destructive" });
    }
  };

  const handleDeleteAttendance = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch("/api/attendance/delete-range", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: deleteAttendanceStartDate,
          endDate: deleteAttendanceEndDate,
          store: deleteAttendanceStore
        }),
      });
      
      const data = await res.json();
      setIsProcessing(false);
      setIsDeleteAttendanceDialogOpen(false);

      if (!res.ok) {
        toast({ title: "Chyba", description: data.error || data.message, variant: "destructive" });
        return;
      }

      toast({ 
        title: "Úspešne vymazané", 
        description: `Vymazaných ${data.deletedCount || 0} záznamov (príchody a odchody).`,
        className: "bg-green-600 text-white" 
      });
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "Chyba pripojenia", variant: "destructive" });
    }
  };

  const handleDeleteLunch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch("/api/lunch/delete-range", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: deleteLunchStartDate,
          endDate: deleteLunchEndDate,
          store: deleteLunchStore
        }),
      });
      
      const data = await res.json();
      setIsProcessing(false);
      setIsDeleteLunchDialogOpen(false);

      if (!res.ok) {
        toast({ title: "Chyba", description: data.error || data.message, variant: "destructive" });
        return;
      }

      toast({ 
        title: "Úspešne vymazané", 
        description: `Vymazaných ${data.deletedCount || 0} záznamov obedov.`,
        className: "bg-green-600 text-white" 
      });
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "Chyba pripojenia", variant: "destructive" });
    }
  };

  const handleDeleteVacation = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch("/api/vacation/delete-range", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: deleteVacationStartDate,
          endDate: deleteVacationEndDate,
          store: deleteVacationStore
        }),
      });
      
      const data = await res.json();
      setIsProcessing(false);
      setIsDeleteVacationDialogOpen(false);

      if (!res.ok) {
        toast({ title: "Chyba", description: data.error || data.message, variant: "destructive" });
        return;
      }

      toast({ 
        title: "Úspešne vymazané", 
        description: `Vymazaných ${data.deletedCount || 0} záznamov dovoleniek.`,
        className: "bg-green-600 text-white" 
      });
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "Chyba pripojenia", variant: "destructive" });
    }
  };

  const handleManualEntrySave = async () => {
    if (!manualEntryEmployee || !manualEntryAction || !manualEntryStore || !manualEntryDate || !manualEntryTime) {
      toast({
        title: "❌ Zabudol si niečo vyplniť, oprav to.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create a local date string that preserves the selected time
      const [hours, minutes] = manualEntryTime.split(':');
      const [year, month, day] = manualEntryDate.split('-');
      
      // We construct a date in the local timezone and then format it to ISO while keeping the local time values
      // This ensures that "9:00" in the picker remains "09:00" in the database/ISO string
      const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
      
      // To get an ISO-like string with local time: YYYY-MM-DDTHH:mm:ss.sss
      const pad = (n: number) => n.toString().padStart(2, '0');
      const clientTimestamp = `${year}-${month}-${day}T${pad(Number(hours))}:${pad(Number(minutes))}:00.000`;

      const res = await fetch(api.attendance.create.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: manualEntryEmployee,
          type: manualEntryAction,
          selectedStore: manualEntryStore,
          clientTimestamp: clientTimestamp,
          isManual: true
        }),
      });

      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        toast({
          title: "❌ Chyba pri zápise",
          description: data.message || "Nepodarilo sa uložiť manuálny záznam.",
          variant: "destructive",
          duration: 999999,
          action: (
            <ToastAction altText="OK" onClick={() => dismiss()}>
              OK
            </ToastAction>
          ),
        });
        return;
      }

      const meno = data.meno || "zamestnanec";
      const formattedDate = new Date(manualEntryDate).toLocaleDateString("sk-SK");
      const actionLabel = manualEntryAction === "arrival" ? "príchod" : "odchod";
      
      toast({
        title: `✅ Manuálny záznam uložený pre ${meno}.`,
        description: `Zapísaný ${actionLabel} na ${formattedDate} o ${manualEntryTime}.`,
        duration: 10000,
        className: "bg-green-600 text-white",
      });
      
      setIsManualEntryDialogOpen(false);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "❌ Chyba",
        description: "Chyba pripojenia k serveru.",
        variant: "destructive",
      });
    }
  };

  const handleAction = async (type: string) => {
    if (!localStore) {
      toast({
        title: "Nemáš vybratú prevádzku",
        description: "Pred vykonaním akcie musíš v nastaveniach vybrať prevádzku.",
        variant: "destructive",
      });
      return;
    }

    if (!code) {
      toast({
        title: "Chýbajúci kód",
        description: "Prosím zadajte osobný kód.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const networkTime = await getNetworkTime();
    const clientTimestamp = networkTime.toLocaleString("sv-SE", { timeZone: "Europe/Bratislava" }).replace(' ', 'T') + '.000Z';
    createAttendance.mutate({ 
      code: code.trim(), 
      type, 
      photoData: "",
      clientTimestamp
    } as any, {
      onSuccess: async (data: any) => {
        // Okamžite skryjeme loading a vyčistíme kód, aby mohol ísť ďalší človek
        setIsProcessing(false);
        setCode("");

        if (type === "arrival" || type === "departure") {
          // Fotenie a nahrávanie beží úplne na pozadí
          (async () => {
            let stream: MediaStream | null = null;
            try {
              stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user" },
                audio: false 
              });
              
              const video = document.createElement('video');
              video.srcObject = stream;
              await video.play();

              const canvas = canvasRef.current;
              if (canvas) {
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const context = canvas.getContext("2d");
                if (context) {
                  context.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const photoBlob = await new Promise<Blob | null>((resolve) => 
                    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8)
                  );

                  if (photoBlob) {
                    const now = new Date();
                    const datum = now.toLocaleDateString("sk-SK").replace(/\./g, "-");
                    const cas = now.toLocaleTimeString("sk-SK", { hour12: false }).replace(/:/g, "-");
                    const meno = data.meno || "neznami";
                    const akcia = type === "arrival" ? "Prichod" : type === "departure" ? "Odchod" : type === "lunch" ? "Obed" : "Dovolenka";
                    const fileName = `${datum}_${cas}_${akcia}_${meno}_${prevadzkaName}.jpg`.replace(/\s/g, "");
                    
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                      reader.onloadend = () => {
                        const base64String = (reader.result as string).split(',')[1];
                        resolve(base64String);
                      };
                    });
                    reader.readAsDataURL(photoBlob);
                    const base64Data = await base64Promise;

                    await fetch("/api/uploads/ftp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: fileName,
                        base64Data,
                        logId: data.id
                      }),
                    });
                  }
                }
              }
            } catch (err) {
              console.error("Photo capture error:", err);
            } finally {
              if (stream) {
                stream.getTracks().forEach(track => track.stop());
              }
            }
          })();
        }
        
        const nameToDisplay = data.meno || "zamestnanec";
        if (type === "departure") {
          toast({
            title: `✅ Si odhlásený/a ${nameToDisplay}.`,
            description: `Práve si sa odhlásil/a!`,
            duration: 10000,
            variant: "default",
            className: "bg-green-600 text-white border-0 shadow-2xl z-[10000] scale-105 transition-all duration-200",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        } else {
          toast({
            title: `✅ Si super ${nameToDisplay}.`,
            description: `Práve si sa prihlásil/a!`,
            duration: 10000,
            variant: "default",
            className: "bg-green-600 text-white border-0 shadow-2xl z-[10000] scale-105 transition-all duration-200",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
        }
      },
      onError: (error: any) => {
        setIsProcessing(false);
        setCode("");
        const message = error.message || "";

        if (message.startsWith("ERR_STORE_CLOSED")) {
          if (message.startsWith("ERR_STORE_CLOSED_DAY")) {
            setStoreClosedDayMessage(message.split("|")[1] || "Je zatvorené.");
            setIsStoreClosedDayDialogOpen(true);
          } else if (message.startsWith("ERR_STORE_CLOSED_DEPARTURE")) {
            setIsStoreClosedDepartureDialogOpen(true);
          } else {
            setIsStoreClosedDialogOpen(true);
          }
          return;
        }

        if (message.startsWith("ERR_LIMIT_EXCEEDED|")) {
          const details = message.split("|")[1] || "";
          toast({
            title: "Je Vás veľa prihlasených kto tu nemá byť? Napíš manažérovi",
            description: (
              <div className="mt-4 space-y-3 w-full text-white">
                <div className="bg-black/20 p-3 rounded-xl space-y-2 max-h-[30vh] overflow-y-auto">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1 border-b border-white/10 pb-1">
                    Aktuálne prihlásení:
                  </p>
                  {String(details).split("\n").map((line: string, i: number) => {
                    const parts = line.split(" ");
                    if (parts.length < 3) return null;
                    const name = parts.slice(0, -2).join(" ");
                    const date = parts[parts.length - 2];
                    const time = parts[parts.length - 1];
                    return (
                      <div key={i} className="flex flex-col bg-white/10 p-2 rounded-lg gap-0.5 text-left">
                        <span className="font-bold text-sm text-white">{name}</span>
                        <div className="flex justify-between text-[10px] opacity-80 font-medium text-white/90">
                          <span>{date}</span>
                          <span>{time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <ToastAction 
                    altText="OK" 
                    onClick={() => dismiss()}
                    className="w-full h-14 bg-white text-red-600 hover:bg-white/90 font-black text-lg rounded-xl border-none shadow-lg"
                  >
                    OK
                  </ToastAction>
                </div>
              </div>
            ),
            variant: "destructive",
            duration: 999999,
            className: "bg-red-600 text-white p-6 border-none flex-col items-center shadow-2xl z-[99999] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[400px] rounded-3xl animate-in fade-in zoom-in duration-300 [&>button]:hidden",
          });
          return;
        }
        
        if (error.message === "ERR_NO_ARRIVAL") {
          toast({
            title: "❌ Chyba",
            description: "Zabudol si sa prihlásiť. Napíš manažérovi ináč sa ti nezapíše zmena.",
            duration: 999999,
            variant: "destructive",
            className: "shadow-2xl z-[10000] scale-105 transition-all duration-200",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
          return;
        }

        if (error.message === "ERR_NEW_DAY") {
          toast({
            title: "❌ Chyba",
            description: "Je nový deň, včera si sa neodhlásil!. Napíš manažérovi ináč sa ti nezaráta zmena.",
            duration: 999999,
            variant: "destructive",
            className: "shadow-2xl z-[10000] scale-105 transition-all duration-200",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
          return;
        }

        if (error.message.startsWith("ERR_WRONG_STORE:")) {
          const storeName = error.message.split(":")[1];
          toast({
            title: "❌ Chyba",
            description: `Prihlásil si sa na inej prevádzke ${storeName}. Napíš manažérovi.`,
            duration: 999999,
            variant: "destructive",
            className: "shadow-2xl z-[10000] scale-105 transition-all duration-200",
            action: (
              <ToastAction altText="OK" onClick={() => dismiss()}>
                OK
              </ToastAction>
            ),
          });
          return;
        }

        const isForgetError = error.message && error.message.includes("Zabudol si sa odhlásiť");
        const isAuthError = error.message && (error.message.includes("Neplatný kód") || error.message.includes("zlé heslo") || error.message.includes("employee"));
        
        toast({
          title: isAuthError ? "❌ Zadal si zlé heslo!" : isForgetError ? "❌ Upozornenie" : "❌ Chyba",
          description: error.message || "Nastala neznáma chyba",
          duration: 999999,
          variant: "destructive",
          className: "shadow-2xl z-[10000] scale-105 transition-all duration-200",
          action: (
            <ToastAction altText="OK" onClick={() => dismiss()}>
              OK
            </ToastAction>
          ),
        });
      }
    });
  };

  const handleOpeningHoursShow = async () => {
    if (!localStore) {
      toast({ title: "Nemáš vybratú prevádzku", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/stores/opening-hours?store=${localStore}`);
      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: "Nepodarilo sa načítať otváracie hodiny.", variant: "destructive" });
        return;
      }

      setOpeningHoursData(data);
      setIsOpeningHoursDialogOpen(true);
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba", description: "Chyba pripojenia k serveru.", variant: "destructive" });
    }
  };

  const handleOpeningHoursSave = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stores/opening-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: localStore, hours: openingHoursData }),
      });
      setIsProcessing(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: "Nepodarilo sa uložiť otváracie hodiny.", variant: "destructive" });
        return;
      }

      toast({ title: "✅ Otváracie hodiny uložené", className: "bg-green-600 text-white" });
      setIsOpeningHoursDialogOpen(false);
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba", description: "Chyba pripojenia k serveru.", variant: "destructive" });
    }
  };

  const handleFixOpeningHoursShow = async () => {
    if (!localStore) {
      toast({ title: "Nemáš vybratú prevádzku", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/stores/fix-opening-hours?store=${localStore}`);
      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: "Nepodarilo sa načítať Fix otváracie hodiny.", variant: "destructive" });
        return;
      }

      setFixOpeningHoursData(data);
      setIsFixOpeningHoursDialogOpen(true);
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba", description: "Chyba pripojenia k serveru.", variant: "destructive" });
    }
  };

  const handleFixOpeningHoursSave = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stores/fix-opening-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: localStore, hours: fixOpeningHoursData }),
      });
      setIsProcessing(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: "Nepodarilo sa uložiť Fix otváracie hodiny.", variant: "destructive" });
        return;
      }

      toast({ title: "✅ Fix otváracie hodiny uložené", className: "bg-green-600 text-white" });
      setIsFixOpeningHoursDialogOpen(false);
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba", description: "Chyba pripojenia k serveru.", variant: "destructive" });
    }
  };

  const handleFixClosingHoursShow = async () => {
    if (!localStore) {
      toast({ title: "Nemáš vybratú prevádzku", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/stores/fix-closing-hours?store=${localStore}`);
      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: "Nepodarilo sa načítať Fix zatváracie hodiny.", variant: "destructive" });
        return;
      }

      setFixClosingHoursData(data);
      setIsFixClosingHoursDialogOpen(true);
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba", description: "Chyba pripojenia k serveru.", variant: "destructive" });
    }
  };

  const handleFixClosingHoursSave = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stores/fix-closing-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: localStore, hours: fixClosingHoursData }),
      });
      setIsProcessing(false);

      if (!res.ok) {
        toast({ title: "❌ Chyba", description: "Nepodarilo sa uložiť Fix zatváracie hodiny.", variant: "destructive" });
        return;
      }

      toast({ title: "✅ Fix zatváracie hodiny uložené", className: "bg-green-600 text-white" });
      setIsFixClosingHoursDialogOpen(false);
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "❌ Chyba", description: "Chyba pripojenia k serveru.", variant: "destructive" });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const syncTime = async () => {
      const networkTime = await getNetworkTime();
      setCurrentTime(networkTime);
    };
    
    syncTime(); // Initial sync
    
    const timer = setInterval(async () => {
      setCurrentTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);

    const resyncTimer = setInterval(syncTime, 60000); // Resync every minute

    return () => {
      clearInterval(timer);
      clearInterval(resyncTimer);
    };
  }, []);

  const formatBratislavaTime = (date: Date) => {
    return new Intl.DateTimeFormat('sk-SK', {
      timeZone: 'Europe/Bratislava',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const formatBratislavaDate = (date: Date) => {
    return new Intl.DateTimeFormat('sk-SK', {
      timeZone: 'Europe/Bratislava',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/20">
      <motion.div 
        className="w-full max-w-md flex flex-col items-center gap-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="text-center space-y-1 mb-2" variants={itemVariants}>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Dochádzačka
          </h1>
          <div className="space-y-0">
            <h2 className="text-xl text-muted-foreground font-medium tracking-tight">
              {localStore || "Poctivá pekáreň & Bistro"}
            </h2>
            <p className="text-sm text-muted-foreground/60">Martin Gašpar</p>
          </div>
        </motion.div>

        <motion.div className="text-center mb-2" variants={itemVariants}>
          <div className="text-4xl font-mono font-bold text-primary tabular-nums">
            {formatBratislavaTime(currentTime)}
          </div>
          <div className="text-sm text-muted-foreground capitalize">
            {formatBratislavaDate(currentTime)}
          </div>
        </motion.div>

        <motion.div className="w-full mb-4" variants={itemVariants}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="hidden"
          />
          <canvas ref={canvasRef} className="hidden" />
          <CodeInput value={code} onChange={setCode} />
        </motion.div>

        <Dialog open={isProcessing}>
          <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm border-none shadow-2xl flex flex-col items-center justify-center p-12 [&>button]:hidden transition-all duration-200">
            <DialogHeader className="hidden">
              <DialogTitle>Spracúvam</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-xl font-bold text-foreground">
                Čakaj, pracujem...
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <motion.div className="w-full flex flex-col gap-3" variants={itemVariants}>
          <Button
            onClick={() => handleAction("arrival")}
            disabled={createAttendance.isPending}
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm border-0 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            <span className="text-base font-semibold">Príchod</span>
          </Button>

          <Button
            onClick={() => handleAction("departure")}
            disabled={createAttendance.isPending}
            className="w-full h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-sm border-0 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-base font-semibold">Odchod</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsLunchDialogOpen(true)}
            disabled={createAttendance.isPending}
            className="w-full h-12 rounded-xl border-border bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all gap-2"
          >
            <span className="text-base font-semibold">Obed</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsVacationDialogOpen(true)}
            disabled={createAttendance.isPending}
            className="w-full h-12 rounded-xl border-border bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all gap-2"
          >
            <span className="text-base font-semibold">Dovolenka</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all gap-2"
            onClick={() => setIsLunchOverviewDialogOpen(true)}
          >
            <span className="text-base font-semibold">Prehľad obedy</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setManagerTarget("menu");
              setIsManagerDialogOpen(true);
            }}
            className="w-full h-12 rounded-xl border-border bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all gap-2"
          >
            <span className="text-base font-semibold">Manažér</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all gap-2"
            onClick={() => {
              setManagerTarget("prevadzka");
              setIsManagerDialogOpen(true);
            }}
          >
            <span className="text-base font-semibold">Prevádzka</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all gap-2"
            onClick={() => {
              setManagerTarget("logout");
              setIsManagerDialogOpen(true);
            }}
          >
            <span className="text-base font-semibold">Odhlásiť zariadenie</span>
          </Button>

          <Dialog open={isManagerDialogOpen} onOpenChange={setIsManagerDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Zadajte manažérsky kód</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="password"
                  placeholder="Kód"
                  value={managerInput}
                  onChange={(e) => setManagerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManagerSubmit()}
                  className="h-12 border-black focus-visible:ring-black"
                />
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleManagerSubmit}
                  className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold"
                >
                  Vstúpiť
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isManagerMenuOpen} onOpenChange={setIsManagerMenuOpen}>
            <DialogContent className="sm:max-w-md bg-white overflow-y-auto max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Manažérske menu</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2 py-4 text-center">
                {[
                  "Manuálny záznam",
                  "Aktuálne prihlasení",
                  "Prehľad dochádzka",
                  "Prehľad dovolenka",
                  "Počet na prevádzke",
                  "Zmena kódu",
                  "Otváracie hod.",
                  "Fix - Otváracie h.",
                  "Fix - Zatváracie h.",
                  "Výpis jednotlivo",
                  "Výpis - spolu",
                  "Mazanie dochádzka",
                  "Mazanie obedy",
                  "Mazanie dovolenka"
                ].map((item) => (
                  <Button 
                    key={item}
                    variant="outline"
                    className="w-full h-10 border-black font-semibold text-sm"
                    onClick={() => {
                      if (item === "Manuálny záznam") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsManualEntryDialogOpen(true), 100);
                      } else if (item === "Aktuálne prihlasení") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsActiveEmployeesDialogOpen(true), 100);
                      } else if (item === "Prehľad dochádzka") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsAttendanceOverviewDialogOpen(true), 100);
                      } else if (item === "Prehľad dovolenka") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsVacationOverviewDialogOpen(true), 100);
                      } else if (item === "Počet na prevádzke") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsStoreCountDialogOpen(true), 100);
                      } else if (item === "Zmena kódu") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsRenameDialogOpen(true), 100);
                      } else if (item === "Otváracie hod.") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => handleOpeningHoursShow(), 100);
                      } else if (item === "Fix - Otváracie h.") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => handleFixOpeningHoursShow(), 100);
                      } else if (item === "Fix - Zatváracie h.") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => handleFixClosingHoursShow(), 100);
                      } else if (item === "Výpis jednotlivo") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsExportDatesDialogOpen(true), 100);
                      } else if (item === "Výpis - spolu") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsExportSummaryDialogOpen(true), 100);
                      } else if (item === "Mazanie dochádzka") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsDeleteAttendanceDialogOpen(true), 100);
                      } else if (item === "Mazanie obedy") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsDeleteLunchDialogOpen(true), 100);
                      } else if (item === "Mazanie dovolenka") {
                        setIsManagerMenuOpen(false);
                        setTimeout(() => setIsDeleteVacationDialogOpen(true), 100);
                      } else {
                        setIsManagerMenuOpen(false);
                        toast({ title: `Funkcia ${item} bude doplnená neskôr.` });
                      }
                    }}
                  >
                    {item}
                  </Button>
                ))}
                <Button 
                  variant="outline"
                  className="w-full h-10 border-black font-semibold text-rose-600 hover:text-rose-700 text-sm mt-2"
                  onClick={() => {
                    setIsManagerMenuOpen(false);
                    if (confirm("Naozaj chcete odhlásiť zariadenie?")) {
                      localStorage.removeItem(DEVICE_AUTH_KEY);
                      window.location.reload();
                    }
                  }}
                >
                  Odhlásiť zariadenie (Odhlásenie)
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isExportDatesDialogOpen} onOpenChange={setIsExportDatesDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Výber obdobia pre export</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Od</label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do</label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsExportDatesDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleExportIndividual}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                >
                  Exportovať
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isExportSummaryDialogOpen} onOpenChange={setIsExportSummaryDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Výber obdobia pre súhrnný výpis</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Od</label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do</label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsExportSummaryDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleExportSummary}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                >
                  Exportovať spolu
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteAttendanceDialogOpen} onOpenChange={setIsDeleteAttendanceDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Mazanie dochádzky</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <p className="text-sm text-gray-600">Vyberte obdobie a prevádzku pre vymazanie príchodov a odchodov. Obedy a dovolenky zostanú zachované.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prevádzka</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={deleteAttendanceStore}
                    onChange={(e) => setDeleteAttendanceStore(e.target.value)}
                  >
                    <option value="all">Všetky prevádzky</option>
                    {stores && stores.map((store: string) => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Od</label>
                  <Input
                    type="date"
                    value={deleteAttendanceStartDate}
                    onChange={(e) => setDeleteAttendanceStartDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do</label>
                  <Input
                    type="date"
                    value={deleteAttendanceEndDate}
                    onChange={(e) => setDeleteAttendanceEndDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsDeleteAttendanceDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleDeleteAttendance}
                  className="flex-1 h-12 bg-red-600 text-white hover:bg-red-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Mazanie..." : "Vymazať"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteLunchDialogOpen} onOpenChange={setIsDeleteLunchDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Mazanie obedov</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <p className="text-sm text-gray-600">Vyberte obdobie a prevádzku pre vymazanie obedov. Príchody, odchody a dovolenky zostanú zachované.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prevádzka</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={deleteLunchStore}
                    onChange={(e) => setDeleteLunchStore(e.target.value)}
                  >
                    <option value="all">Všetky prevádzky</option>
                    {stores && stores.map((store: string) => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Od</label>
                  <Input
                    type="date"
                    value={deleteLunchStartDate}
                    onChange={(e) => setDeleteLunchStartDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do</label>
                  <Input
                    type="date"
                    value={deleteLunchEndDate}
                    onChange={(e) => setDeleteLunchEndDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsDeleteLunchDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleDeleteLunch}
                  className="flex-1 h-12 bg-red-600 text-white hover:bg-red-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Mazanie..." : "Vymazať"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteVacationDialogOpen} onOpenChange={setIsDeleteVacationDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Mazanie dovoleniek</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <p className="text-sm text-gray-600">Vyberte obdobie a prevádzku pre vymazanie dovoleniek. Príchody, odchody a obedy zostanú zachované.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prevádzka</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={deleteVacationStore}
                    onChange={(e) => setDeleteVacationStore(e.target.value)}
                  >
                    <option value="all">Všetky prevádzky</option>
                    {stores && stores.map((store: string) => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Od</label>
                  <Input
                    type="date"
                    value={deleteVacationStartDate}
                    onChange={(e) => setDeleteVacationStartDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do</label>
                  <Input
                    type="date"
                    value={deleteVacationEndDate}
                    onChange={(e) => setDeleteVacationEndDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsDeleteVacationDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleDeleteVacation}
                  className="flex-1 h-12 bg-red-600 text-white hover:bg-red-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Mazanie..." : "Vymazať"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isLunchDialogOpen} onOpenChange={setIsLunchDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Záznam obeda</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zamestnanec</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={lunchEmployee}
                    onChange={(e) => setLunchEmployee(e.target.value)}
                  >
                    <option value="">Vybrať zamestnanca...</option>
                    {employees && Object.entries(employees).map(([pin, name]) => (
                      <option key={pin} value={pin}>{String(name)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dátum</label>
                  <Input
                    type="date"
                    value={lunchDate}
                    onChange={(e) => setLunchDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsLunchDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleLunchSave}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                >
                  Uložiť
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <Dialog open={isVacationDialogOpen} onOpenChange={setIsVacationDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Záznam dovolenky</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Zamestnanec</label>
                <select 
                  className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={vacationEmployee}
                  onChange={(e) => setVacationEmployee(e.target.value)}
                >
                  <option value="">Vybrať zamestnanca...</option>
                  {employees && Object.entries(employees).map(([pin, name]) => (
                    <option key={pin} value={pin}>{String(name)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trvanie (hodiny)</label>
                <select 
                  className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={vacationDuration}
                  onChange={(e) => setVacationDuration(e.target.value)}
                >
                  <option value="4">4 hodiny</option>
                  <option value="8">8 hodín</option>
                  <option value="12">12 hodín</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dátum</label>
                <Input
                  type="date"
                  value={vacationDate}
                  onChange={(e) => setVacationDate(e.target.value)}
                  className="h-12 border-black focus-visible:ring-black"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button 
                variant="outline"
                onClick={() => setIsVacationDialogOpen(false)}
                className="flex-1 h-12 border-black"
              >
                Zrušiť
              </Button>
              <Button 
                onClick={() => handleVacationSave(false)}
                className="flex-1 h-12 bg-black text-white hover:bg-black/90"
              >
                Uložiť
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          <Dialog open={isManualEntryDialogOpen} onOpenChange={setIsManualEntryDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Manuálny záznam</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zamestnanec</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={manualEntryEmployee}
                    onChange={(e) => setManualEntryEmployee(e.target.value)}
                  >
                    <option value="">Vybrať zamestnanca...</option>
                    {employees && Object.entries(employees).map(([pin, name]) => (
                      <option key={pin} value={pin}>{String(name)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Akcia</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={manualEntryAction}
                    onChange={(e) => setManualEntryAction(e.target.value)}
                  >
                    <option value="arrival">Príchod</option>
                    <option value="departure">Odchod</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prevádzka</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={manualEntryStore}
                    onChange={(e) => setManualEntryStore(e.target.value)}
                  >
                    <option value="">Vybrať prevádzku...</option>
                    {stores && Array.isArray(stores) && stores.map((store: any) => {
                      const name = typeof store === 'string' ? store : (store.name || store.id);
                      return (
                        <option key={name} value={name}>{name}</option>
                      );
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dátum</label>
                    <Input
                      type="date"
                      value={manualEntryDate}
                      onChange={(e) => setManualEntryDate(e.target.value)}
                      className="h-12 border-black focus-visible:ring-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Čas</label>
                    <Input
                      type="time"
                      value={manualEntryTime}
                      onChange={(e) => setManualEntryTime(e.target.value)}
                      className="h-12 border-black focus-visible:ring-black"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsManualEntryDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleManualEntrySave}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                >
                  Uložiť
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Zmena mena zamestnanca</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vyberte zamestnanca</label>
                  <select 
                    className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={renameCode}
                    onChange={(e) => setRenameCode(e.target.value)}
                  >
                    <option value="">Vybrať zamestnanca...</option>
                    {employees && Object.entries(employees).map(([pin, name]) => (
                      <option key={pin} value={pin}>{String(name)} ({pin})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nové meno</label>
                  <Input
                    placeholder="Zadajte nové meno"
                    value={renameNewName}
                    onChange={(e) => setRenameNewName(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsRenameDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleRenameSave}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Ukladám..." : "Uložiť zmenu"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isFixClosingHoursDialogOpen} onOpenChange={setIsFixClosingHoursDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Fix - Zatváracie hodiny - {localStore}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                {["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa", "Status"].map((field) => (
                  <div key={field} className="grid grid-cols-2 items-center gap-4">
                    <label className="text-sm font-bold">{field}</label>
                    <Input
                      value={fixClosingHoursData[field] || ""}
                      onChange={(e) => setFixClosingHoursData({ ...fixClosingHoursData, [field]: e.target.value })}
                      placeholder={field === "Status" ? "0 alebo 1" : "napr. 20:00"}
                      className="h-10 border-black focus-visible:ring-black"
                    />
                  </div>
                ))}
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsFixClosingHoursDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleFixClosingHoursSave}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Ukladám..." : "Uložiť"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isFixOpeningHoursDialogOpen} onOpenChange={setIsFixOpeningHoursDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Fix - Otváracie hodiny - {localStore}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                {["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa", "Status"].map((field) => (
                  <div key={field} className="grid grid-cols-2 items-center gap-4">
                    <label className="text-sm font-bold">{field}</label>
                    <Input
                      value={fixOpeningHoursData[field] || ""}
                      onChange={(e) => setFixOpeningHoursData({ ...fixOpeningHoursData, [field]: e.target.value })}
                      placeholder={field === "Status" ? "0 alebo 1" : "napr. 08:00"}
                      className="h-10 border-black focus-visible:ring-black"
                    />
                  </div>
                ))}
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsFixOpeningHoursDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleFixOpeningHoursSave}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Ukladám..." : "Uložiť"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpeningHoursDialogOpen} onOpenChange={setIsOpeningHoursDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Otváracie hodiny - {localStore}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                {["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"].map((day) => (
                  <div key={day} className="grid grid-cols-2 items-center gap-4">
                    <label className="text-sm font-bold">{day}</label>
                    <Input
                      value={openingHoursData[day] || ""}
                      onChange={(e) => setOpeningHoursData({ ...openingHoursData, [day]: e.target.value })}
                      placeholder="napr. 08:00-16:00 alebo Zatvorené"
                      className="h-10 border-black focus-visible:ring-black"
                    />
                  </div>
                ))}
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsOpeningHoursDialogOpen(false)}
                  className="flex-1 h-12 border-black"
                >
                  Zrušiť
                </Button>
                <Button 
                  onClick={handleOpeningHoursSave}
                  className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Ukladám..." : "Uložiť"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <Dialog open={isAttendanceOverviewDialogOpen} onOpenChange={setIsAttendanceOverviewDialogOpen}>
          <DialogContent className="sm:max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prehľad dochádzky</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Od</label>
                    <Input
                      type="date"
                      value={attendanceOverviewFromDate}
                      onChange={(e) => setAttendanceOverviewFromDate(e.target.value)}
                      className="h-12 border-black focus-visible:ring-black font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Do</label>
                    <Input
                      type="date"
                      value={attendanceOverviewToDate}
                      onChange={(e) => setAttendanceOverviewToDate(e.target.value)}
                      className="h-12 border-black focus-visible:ring-black font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Prevádzka</label>
                  <select 
                    className="w-full h-12 rounded-md border-2 border-black bg-background px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={attendanceOverviewStore}
                    onChange={(e) => setAttendanceOverviewStore(e.target.value)}
                  >
                    <option value="all">Všetky prevádzky</option>
                    {stores && Array.isArray(stores) && stores.map((store: any) => {
                      const name = typeof store === 'string' ? store : (store.name || store.id);
                      return (
                        <option key={name} value={name}>{name}</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {isAttendanceOverviewLoading ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-sm font-medium animate-pulse">Načítavam záznamy...</p>
                </div>
              ) : attendanceOverview && attendanceOverview.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {attendanceOverview.map((log, idx) => (
                    <div key={idx} className="flex flex-col p-4 border-2 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-black text-xl text-black">{log["Meno"]}</span>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{log["Prevádzka"]}</span>
                        </div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                          log["Akcia"] === "Príchod" ? "bg-emerald-100 text-emerald-800" : 
                          log["Akcia"] === "Odchod" ? "bg-rose-100 text-rose-800" :
                          log["Akcia"] === "Obed" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {log["Akcia"]}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2 pt-3 border-t-2 border-dashed border-muted">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Dátum</span>
                          <span className="font-bold text-sm">{log["dátum"]}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Čas</span>
                          <span className="font-bold text-sm">{log["Original čas príchodu"] || "-"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Zaokrúhlený</span>
                          <span className="font-bold text-sm text-emerald-600">{log["Zaokruhlený čas príchodu"] || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                  <p className="text-muted-foreground text-sm font-medium">Žiadne záznamy pre vybrané obdobie.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                className="w-full h-14 bg-black text-white hover:bg-black/90 font-black text-lg rounded-xl"
                onClick={() => setIsAttendanceOverviewDialogOpen(false)}
              >
                Zavrieť prehľad
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isVacationOverviewDialogOpen} onOpenChange={setIsVacationOverviewDialogOpen}>
          <DialogContent className="sm:max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prehľad dovoleniek</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Od</label>
                  <Input
                    type="date"
                    value={vacationOverviewFromDate}
                    onChange={(e) => setVacationOverviewFromDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Do</label>
                  <Input
                    type="date"
                    value={vacationOverviewToDate}
                    onChange={(e) => setVacationOverviewToDate(e.target.value)}
                    className="h-12 border-black focus-visible:ring-black font-bold"
                  />
                </div>
              </div>

              {isVacationOverviewLoading ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-sm font-medium animate-pulse">Načítavam záznamy...</p>
                </div>
              ) : vacationOverview && vacationOverview.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {vacationOverview.map((log, idx) => (
                    <div key={idx} className="flex flex-col p-4 border-2 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-black text-xl text-black">{log["Meno"]}</span>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{log["Prevádzka"]}</span>
                        </div>
                        <span className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest bg-amber-100 text-amber-800">
                          Dovolenka
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t-2 border-dashed border-muted">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Dátum</span>
                          <span className="font-bold text-sm">{log["dátum"]}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Trvanie (hod)</span>
                          <span className="font-bold text-sm">{log["Dovolenka (h)"] || log["Trvanie"] || log["trvanie"] || "8"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                  <p className="text-muted-foreground text-sm font-medium">Žiadne záznamy o dovolenke.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                className="w-full h-14 bg-black text-white hover:bg-black/90 font-black text-lg rounded-xl"
                onClick={() => setIsVacationOverviewDialogOpen(false)}
              >
                Zavrieť prehľad
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isStoreClosedDayDialogOpen} onOpenChange={setIsStoreClosedDayDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border-red-600 border-2">
            <DialogHeader>
              <DialogTitle className="text-red-600 text-2xl font-bold text-center">
                ⚠️ Obchod je zatvorený
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <p className="text-xl font-bold text-black">
                {storeClosedDayMessage}
              </p>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setIsStoreClosedDayDialogOpen(false)}
                className="w-full h-16 bg-red-600 text-white hover:bg-red-700 text-xl font-bold"
              >
                ROZUMIEM
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isStoreClosedDepartureDialogOpen} onOpenChange={setIsStoreClosedDepartureDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border-red-600 border-2">
            <DialogHeader>
              <DialogTitle className="text-red-600 text-2xl font-bold text-center">
                ⚠️ Obchod je zatvorený
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <p className="text-xl font-bold text-black">
                Je zatvorené! Nemôžeš sa odhlásiť.
              </p>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setIsStoreClosedDepartureDialogOpen(false)}
                className="w-full h-16 bg-red-600 text-white hover:bg-red-700 text-xl font-bold"
              >
                ROZUMIEM
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isStoreClosedDialogOpen} onOpenChange={setIsStoreClosedDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border-red-600 border-2">
            <DialogHeader>
              <DialogTitle className="text-red-600 text-2xl font-bold text-center">
                ⚠️ Obchod je zatvorený
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <p className="text-xl font-bold text-black">
                Je zatvorené nemôžeš sa prihlásiť!
              </p>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setIsStoreClosedDialogOpen(false)}
                className="w-full h-16 bg-red-600 text-white hover:bg-red-700 text-xl font-bold"
              >
                ROZUMIEM
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isStoreCountDialogOpen} onOpenChange={setIsStoreCountDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Počet zamestnancov na prevádzke</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {isStoreCountsLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm font-medium animate-pulse">Načítavam...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(() => {
                    const storeName = localStore || "Neznáma prevádzka";
                    const storeData = storeCounts?.find(s => s.name === storeName) || { name: storeName, count: 0 };
                    const limit = storeLimits?.[storeName] || "0";
                    
                    return (
                      <div className="flex flex-col p-4 border-2 rounded-2xl bg-white shadow-sm gap-4">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-lg text-black">{storeName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-emerald-600">{storeData.count}</span>
                            <span className="text-sm font-bold text-muted-foreground uppercase">osôb</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-3 border-t-2 border-dashed">
                          <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">Limit prihlásených:</span>
                          <Input
                            type="number"
                            id="store-limit-input"
                            defaultValue={limit}
                            className="h-10 w-20 text-center font-bold border-black"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button 
                variant="outline"
                onClick={() => setIsStoreCountDialogOpen(false)}
                className="flex-1 h-12 border-black font-bold"
              >
                Zrušiť
              </Button>
              <Button 
                onClick={() => {
                  const input = document.getElementById('store-limit-input') as HTMLInputElement;
                  if (input) {
                    saveStoreLimit.mutate({ 
                      store: localStore || "Neznáma prevádzka", 
                      limit: input.value 
                    }, {
                      onSuccess: () => setIsStoreCountDialogOpen(false)
                    });
                  }
                }}
                className="flex-1 h-12 bg-black text-white hover:bg-black/90 font-bold"
              >
                Uložiť
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isActiveEmployeesDialogOpen} onOpenChange={setIsActiveEmployeesDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aktuálne prihlasení zamestnanci</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {isActiveEmployeesLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm font-medium">Načítavam...</p>
                </div>
              ) : activeEmployees && activeEmployees.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {activeEmployees.map((emp, idx) => (
                    <div key={idx} className="flex flex-col p-4 border rounded-xl bg-white shadow-sm gap-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-lg">{emp.meno}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {emp.prevadzka}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Dátum</span>
                          <span>{emp.datum}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Čas</span>
                          <span>{emp.cas}</span>
                        </div>
                        <div className="flex flex-col col-span-2 mt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Zaokrúhlený čas</span>
                          <span className="font-semibold text-emerald-600">{emp.zaokruhlenyCas || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm font-medium">Momentálne nie sú prihlásení žiadni zamestnanci.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold"
                onClick={() => setIsActiveEmployeesDialogOpen(false)}
              >
                Zavrieť
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          <Dialog open={isLunchOverviewDialogOpen} onOpenChange={setIsLunchOverviewDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prehľad obedy</DialogTitle>
            </DialogHeader>
            {!isViewingLunchOverview ? (
              <>
                <div className="flex flex-col gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Zamestnanec</label>
                    <select 
                      className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={lunchOverviewEmployee}
                      onChange={(e) => setLunchOverviewEmployee(e.target.value)}
                    >
                      <option value="">Vybrať zamestnanca...</option>
                      {employees && Object.entries(employees).map(([pin, name]) => (
                        <option key={pin} value={pin}>{String(name)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Od</label>
                      <Input
                        type="date"
                        value={lunchOverviewFromDate}
                        onChange={(e) => setLunchOverviewFromDate(e.target.value)}
                        className="h-12 border-black focus-visible:ring-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Do</label>
                      <Input
                        type="date"
                        value={lunchOverviewToDate}
                        onChange={(e) => setLunchOverviewToDate(e.target.value)}
                        className="h-12 border-black focus-visible:ring-black"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex gap-2 sm:justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => setIsLunchOverviewDialogOpen(false)}
                    className="flex-1 h-12 border-black"
                  >
                    Zrušiť
                  </Button>
                  <Button 
                    onClick={handleLunchOverviewShow}
                    className="flex-1 h-12 bg-black text-white hover:bg-black/90"
                  >
                    Ukázať
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-sm font-bold text-emerald-900">
                    {employees && lunchOverviewEmployee ? employees[lunchOverviewEmployee] : "Zamestnanec"}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">
                    {new Date(lunchOverviewFromDate).toLocaleDateString("sk-SK")} - {new Date(lunchOverviewToDate).toLocaleDateString("sk-SK")}
                  </span>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200/50">
                    <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Počet obedov:</span>
                    <span className="text-2xl font-black text-emerald-600">{lunchOverviewResults.length}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                  {lunchOverviewResults.length > 0 ? (
                    lunchOverviewResults.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border rounded-xl hover:bg-muted/50 transition-colors bg-white shadow-sm">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{log["Prevádzka"]}</span>
                        <span className="font-bold text-sm">{log["dátum"]}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground text-sm font-medium">Žiadne obedy v tomto období.</p>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-black font-semibold" 
                  onClick={() => setIsViewingLunchOverview(false)}
                >
                  Späť na výber
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </motion.div>
      </motion.div>
    </div>
  );
}
