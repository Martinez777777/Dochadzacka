import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CodeInput({ value, onChange, className }: CodeInputProps) {
  const placeholder = "Zadajte kód";

  return (
    <div className={cn("relative w-full max-w-xs mx-auto mb-2", className)}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground z-10">
        <Lock className="w-5 h-5" />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-16 pl-12 pr-4 rounded-xl border-2 text-3xl font-mono transition-all duration-200 shadow-sm bg-white focus-visible:ring-black",
          value.length > 0 
            ? "border-black text-black" 
            : "border-black text-black/40"
        )}
      />
    </div>
  );
}
