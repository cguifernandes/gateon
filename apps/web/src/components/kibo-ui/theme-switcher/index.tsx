"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const themes = [
  {
    key: "system",
    icon: Monitor,
    label: "Tema do sistema",
  },
  {
    key: "light",
    icon: Sun,
    label: "Tema claro",
  },
  {
    key: "dark",
    icon: Moon,
    label: "Tema escuro",
  },
] as const;

export type ThemeMode = (typeof themes)[number]["key"];

export type ThemeSwitcherProps = {
  value?: ThemeMode;
  onChange?: (theme: ThemeMode) => void;
  className?: string;
};

export function ThemeSwitcher({
  value,
  onChange,
  className,
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const activeTheme = (value ?? theme ?? "system") as ThemeMode;

  const handleThemeClick = useCallback(
    (themeKey: ThemeMode) => {
      setTheme(themeKey);
      onChange?.(themeKey);
    },
    [onChange, setTheme],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <motion.div
        aria-hidden
        className={cn(
          "h-8 w-18 rounded-full bg-background ring-1 ring-border",
          className,
        )}
      />
    );
  }

  return (
    <motion.div
      className={cn(
        "relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border",
        className,
      )}
    >
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = activeTheme === key;

        return (
          <Tooltip key={key}>
            <TooltipTrigger
              render={(props) => (
                <button
                  {...props}
                  aria-label={label}
                  aria-pressed={isActive}
                  className={cn(
                    "relative h-6 w-6 cursor-pointer rounded-full",
                    props.className,
                  )}
                  onClick={() => handleThemeClick(key)}
                  type="button"
                >
                  {isActive ? (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-muted"
                      layoutId="activeTheme"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      "relative z-10 m-auto h-4 w-4",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </button>
              )}
            />
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </motion.div>
  );
}
