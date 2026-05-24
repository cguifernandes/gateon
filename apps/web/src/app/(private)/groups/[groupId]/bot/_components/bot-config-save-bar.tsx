"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BotConfigSaveBarProps = {
  visible: boolean;
  isSubmitting: boolean;
  onDiscard: () => void;
};

export function BotConfigSaveBar({
  visible,
  isSubmitting,
  onDiscard,
}: BotConfigSaveBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-3">
      <div
        className={cn(
          "pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-border bg-background/95 py-1.5 pr-1.5 pl-4 shadow-lg backdrop-blur-sm",
        )}
      >
        <span className="text-muted-foreground text-sm">
          Existem alterações não salvas.
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onDiscard}
            className="rounded-full"
          >
            Descartar
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={isSubmitting}
            className="rounded-full"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
