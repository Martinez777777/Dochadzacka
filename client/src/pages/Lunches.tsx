import { useLunchLogs } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Utensils, Clock, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { motion } from "framer-motion";

export default function Lunches() {
  const { data: logs, isLoading, error } = useLunchLogs();
  const [, setLocation] = useLocation();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="gap-2 hover:bg-muted/50 -ml-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Späť
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full text-sm">
            <Calendar className="w-4 h-4" />
            {format(new Date(), "d. MMMM yyyy", { locale: sk })}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
              <Utensils className="w-8 h-8" />
            </div>
            Dnešné obedy
          </h1>
          <p className="text-muted-foreground text-lg pl-16">
            Zoznam zamestnancov, ktorí dnes išli na obed.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-center">
            Nepodarilo sa načítať dáta. Skúste to prosím neskôr.
          </div>
        ) : logs?.length === 0 ? (
          <div className="p-12 rounded-3xl bg-muted/20 border-2 border-dashed border-muted text-center space-y-4">
            <div className="inline-flex p-4 bg-background rounded-full shadow-sm">
              <Utensils className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">Dnes zatiaľ žiadne obedy.</p>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3"
          >
            {logs?.map((log) => (
              <motion.div 
                key={log.id} 
                variants={item}
                className="group bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-border/50 flex items-center justify-between hover:shadow-md hover:border-border transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-mono font-bold text-lg border border-amber-100 group-hover:bg-amber-100 group-hover:scale-105 transition-all">
                    {log.code}
                  </div>
                  <div>
                    <span className="block font-medium text-foreground text-lg">Zamestnanec #{log.code}</span>
                    <span className="text-sm text-muted-foreground capitalize">{log.type === 'lunch' ? 'Obed' : log.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/10 px-3 py-1.5 rounded-lg border border-transparent group-hover:border-border/50 group-hover:bg-background transition-all">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-medium">
                    {format(new Date(log.createdAt), "HH:mm")}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
