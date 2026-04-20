"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  /** Header row: match language/support controls (h-9) */
  compact?: boolean;
};

export function ThemeToggle({ compact }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        compact
          ? "size-9 shrink-0 rounded-full border border-primary/35 bg-primary/10 text-primary transition-colors hover:bg-primary/15 hover:text-primary dark:border-primary/45 dark:bg-primary/15 dark:hover:bg-primary/20 dark:hover:text-primary"
          : "rounded-full text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-white dark:hover:text-foreground",
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className={compact ? "size-4" : "h-5 w-5"} />
      ) : (
        <Moon className={compact ? "size-4" : "h-5 w-5"} />
      )}
    </Button>
  );
}