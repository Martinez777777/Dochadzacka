import { useAttendanceLogs } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Download, Filter, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

const DEVICE_AUTH_KEY = "tofako_device_authorized";

const typeLabels: Record<string, string> = {
  arrival: "Príchod",
  departure: "Odchod",
  lunch: "Obed",
  vacation: "Dovolenka"
};

const typeColors: Record<string, string> = {
  arrival: "bg-emerald-50 text-emerald-700 border-emerald-100",
  departure: "bg-rose-50 text-rose-700 border-rose-100",
  lunch: "bg-amber-50 text-amber-700 border-amber-100",
  vacation: "bg-sky-50 text-sky-700 border-sky-100"
};

export default function Admin() {
  const { data: logs, isLoading, error } = useAttendanceLogs();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");

  const handleLogoutDevice = () => {
    if (confirm("Naozaj chcete odhlásiť toto zariadenie? Bude potrebné znova zadať PIN kód.")) {
      localStorage.removeItem(DEVICE_AUTH_KEY);
      window.location.reload();
    }
  };

  const filteredLogs = logs?.filter(log => 
    filter === "all" ? true : log.type === filter
  );

  return (
    <div className="min-h-screen bg-muted/10 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/")}
              className="rounded-full hover:bg-white hover:shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
                <Database className="w-6 h-6 text-primary" />
                Administrácia
              </h1>
              <p className="text-sm text-muted-foreground">Kompletný prehľad dochádzky</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 bg-white border-border shadow-sm">
              <Download className="w-4 h-4" />
              Exportovať CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="rounded-full"
          >
            Všetky
          </Button>
          {Object.entries(typeLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border transition-all",
                filter === key ? "" : "bg-white border-border hover:bg-muted/50"
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-muted/5 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Záznamy ({filteredLogs?.length || 0})</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white px-3 py-1 rounded-lg border border-border/50 shadow-sm">
              <Filter className="w-3.5 h-3.5" />
              <span>Zobrazených posledných 50 záznamov</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/5 text-muted-foreground font-medium border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 w-32">Kód</th>
                  <th className="px-6 py-4">Typ akcie</th>
                  <th className="px-6 py-4">Dátum</th>
                  <th className="px-6 py-4 text-right">Čas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Načítavam dáta...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-destructive">
                      Chyba pri načítaní dát
                    </td>
                  </tr>
                ) : filteredLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Žiadne záznamy na zobrazenie
                    </td>
                  </tr>
                ) : (
                  filteredLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-foreground bg-muted/10 px-2 py-1 rounded border border-border/50">
                          {log.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          typeColors[log.type] || "bg-gray-100 text-gray-800"
                        )}>
                          {typeLabels[log.type] || log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(log.createdAt), "d. MMMM yyyy", { locale: sk })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                        {format(new Date(log.createdAt), "HH:mm:ss")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
