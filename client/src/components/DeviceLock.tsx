import { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEVICE_AUTH_KEY = "tofako_device_authorized";

interface DeviceLockProps {
  children: React.ReactNode;
}

export function DeviceLock({ children }: DeviceLockProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const authorized = localStorage.getItem(DEVICE_AUTH_KEY);
    setIsAuthorized(authorized === "true");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/verify-admin-code", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ code: pin }),
      });

      if (response.ok) {
        localStorage.setItem(DEVICE_AUTH_KEY, "true");
        setIsAuthorized(true);
      } else {
        const errorData = await response.json().catch(() => ({ message: "Nesprávny PIN kód" }));
        setError(errorData.message || "Nesprávny PIN kód");
        setPin("");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Chyba pripojenia k serveru");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-xl p-8 border">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Zadajte PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="text-center text-2xl tracking-[0.5em] h-14"
            autoFocus
          />
          
          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={!pin || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Odomknúť"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
