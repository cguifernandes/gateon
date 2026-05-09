"use client";

import { InfoIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon } from "../icons/circle-check";
import { CircleErrorIcon } from "../icons/circle-error";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon
            isAnimateOnView
            animateOnHover={false}
            size={20}
            className="mt-1 text-green-500"
          />
        ),
        info: <InfoIcon className="size-4 mt-1 text-primary" />,
        warning: <TriangleAlertIcon className="size-4 mt-1 text-yellow-500" />,
        error: (
          <CircleErrorIcon
            isAnimateOnView
            animateOnHover={false}
            size={20}
            className="mt-1 text-destructive"
          />
        ),
        loading: <Loader2Icon className="size-4 animate-spin mt-1" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title:
            "font-semibold font-heading text-sm leading-snug text-foreground",
          description:
            "text-xs font-sans leading-relaxed !text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
