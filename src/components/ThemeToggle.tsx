"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex items-center justify-center h-8 w-8 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/60 transition-colors ${className}`}
    >
      {theme === "dark"
        ? <Sun  className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
    </button>
  );
}
