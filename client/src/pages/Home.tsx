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
  const [isAttendanceOverviewDialogOpen, setIsAttendanceOverviewDialogOpen] = useState(false);
  const [isVacationOverviewDialogOpen, setIsVacationOverviewDialogOpen] = useState(false);
  const [isLunchOverviewDialogOpen, setIsLunchOverviewDialogOpen] = useState(false);
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
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
  const [vacationOverviewFromDate, setVacationOverviewFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationOverviewToDate, setVacationOverviewToDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceOverviewResults, setAttendanceOverviewResults] = useState<any[]>([]);
  const [lunchDate, setLunchDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationEmployee, setVacationEmployee] = useState("");
  const [vacationDate, setVacationDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationDuration, setVacationDuration] = useState("8");

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
    queryKey: ["/api/attendance/overview", attendanceOverviewFromDate, attendanceOverviewToDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/overview?from=${attendanceOverviewFromDate}&to=${attendanceOverviewToDate}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch attendance overview");
      const allData = await res.json();
      // Filter out vacations - only show arrival, departure, and lunch
      return allData.filter((log: any) => 
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
      return allData.filter((log: any) => log["Akcia"] === "Dovolenka" || log["Akcia"] === "vacation");
    },
    enabled: isVacationOverviewDialogOpen,
    refetchOnMount: true,
  });

  const prevadzkaName = localStore || "Neznáma prevádzka";

  const [isProcessing, setIsProcessing] = useState(false);

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

    setIsProcessing(true);
    try {
      const res = await fetch(api.attendance.createLunch.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: lunchEmployee,
          date: lunchDate,
          selectedStore: localStore
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
      const clientTimestamp = `${year}-${month}-${day}T${pad(Number(hours))}:${pad(Number(minutes))}:00.000Z`;

      const res = await fetch(api.attendance.create.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: manualEntryEmployee,
          type: manualEntryAction,
          selectedStore: manualEntryStore,
          clientTimestamp: clientTimestamp
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

    createAttendance.mutate({ 
      code: code.trim(), 
      type, 
      photoData: "",
      clientTimestamp: new Date().toISOString()
    } as any, {
      onSuccess: async (data: any) => {
        if (type === "arrival" || type === "departure") {
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
        }
        
        setIsProcessing(false);
        setCode("");
        
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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
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
                  "Výpis - jednotlivo",
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

        <Dialog open={isAttendanceOverviewDialogOpen} onOpenChange={setIsAttendanceOverviewDialogOpen}>
          <DialogContent className="sm:max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prehľad dochádzky</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
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
                          <span className="font-bold text-sm">{log["Trvanie"] || log["trvanie"] || "8"} h</span>
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
