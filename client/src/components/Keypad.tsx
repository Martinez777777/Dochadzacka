import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Delete, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Keypad({ value, onChange, className }: KeypadProps) {
  const handleNumberClick = (num: string) => {
    onChange(value + num);
  };

  const handleClear = () => {
    onChange("");
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className={cn("grid grid-cols-3 gap-3 w-full max-w-xs mx-auto", className)}>
      {keys.map((key) => (
        <Button
          key={key}
          variant="outline"
          onClick={() => handleNumberClick(key)}
          className="h-16 text-2xl font-mono font-medium hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 shadow-sm border-border/50"
        >
          {key}
        </Button>
      ))}
      <Button
        variant="ghost"
        onClick={handleClear}
        className="h-16 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95"
      >
        <Eraser className="w-6 h-6" />
      </Button>
      <Button
        variant="outline"
        onClick={() => handleNumberClick("0")}
        className="h-16 text-2xl font-mono font-medium hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 shadow-sm border-border/50"
      >
        0
      </Button>
      <Button
        variant="ghost"
        onClick={handleDelete}
        className="h-16 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
      >
        <Delete className="w-6 h-6" />
      </Button>
    </div>
  );
}
