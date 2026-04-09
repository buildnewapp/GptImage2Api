"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface Template2ThemeToggleProps {
  className?: string;
  overlay?: boolean;
}

export function ThemeToggle({
  className,
  overlay = false,
}: Template2ThemeToggleProps) {
  const { setTheme, theme } = useTheme();

  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        overlay
          ? "border-white/16 bg-white/8 text-white hover:bg-white/12"
          : "border-border/75 bg-background/70 text-foreground hover:bg-card",
        className
      )}
      aria-label="Switch to dark mode"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
