"use client";

import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { BadgeAlertIcon } from "../icons/badge-alert";
import { CircleCheckIcon } from "../icons/circle-check";
import { CircleErrorIcon } from "../icons/circle-error";
import { LoaderIcon } from "../icons/loader";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={5000}
      icons={{
        success: (
          <CircleCheckIcon
            isAnimateOnView={true}
            animateOnHover={false}
            size={20}
            className="mt-1 text-green-500"
          />
        ),
        info: (
          <BadgeAlertIcon
            isAnimateOnView={true}
            animateOnHover={false}
            size={20}
            className="mt-1 text-primary"
          />
        ),
        warning: (
          <BadgeAlertIcon
            isAnimateOnView={true}
            animateOnHover={false}
            size={20}
            className="mt-1 text-yellow-500"
          />
        ),
        error: (
          <CircleErrorIcon
            isAnimateOnView={true}
            animateOnHover={false}
            size={20}
            className="mt-1 text-destructive"
          />
        ),
        loading: (
          <LoaderIcon isAnimateOnView={true} animateOnHover={false} size={20} />
        ),
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
          toast: "cn-toast gap-x-3! !w-96",
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
