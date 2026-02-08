import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save } from "lucide-react";

export default function Prevadzka() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string>("");

  const { data: stores, isLoading: loadingStores, refetch } = useQuery({
    queryKey: [api.attendance.stores.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.stores.path);
      return res.json();
    },
    staleTime: 0, // Vynútiť čerstvé dáta pri každom vstupe
  });

  useEffect(() => {
    // Vynútiť znovunačítanie pri každom namontovaní komponentu
    refetch();
  }, [refetch]);

  useEffect(() => {
    const savedStore = localStorage.getItem("selectedStore");
    if (savedStore) {
      setSelectedStore(savedStore);
    }
  }, []);

  const handleSave = () => {
    if (!selectedStore) {
      toast({
        title: "Chýba",
        description: "Prosím vyberte prevádzku.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("selectedStore", selectedStore);
    toast({
      title: "Uložené",
      description: "Prevádzka bola úspešne nastavená lokálne v tomto zariadení.",
    });
    queryClient.invalidateQueries({ queryKey: ["localSettings"] });
    setLocation("/");
  };

  if (loadingStores) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg border-2 border-black">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <CardTitle className="text-2xl font-bold">Výber prevádzky</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Aktuálne zvolená prevádzka</label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="h-14 text-lg border-black focus:ring-black">
                <SelectValue placeholder="Vyberte prevádzku" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((store: string) => (
                  <SelectItem key={store} value={store}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-6">
          <Button 
            className="w-full h-14 bg-black text-white hover:bg-black/90 text-lg font-bold"
            onClick={handleSave}
          >
            <Save className="mr-2 h-5 w-5" />
            Uložiť
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-12 text-muted-foreground"
            onClick={() => setLocation("/")}
          >
            Naspäť na domov
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
