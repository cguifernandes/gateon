"use client";

import { useState } from "react";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { XIcon } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FeedbackForm } from "./feedback-form";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            variant="default"
            className={cn(
              "fixed right-4 bottom-4 z-50 gap-2 rounded-full px-4 shadow-lg",
              triggerProps.className,
            )}
          >
            {open ? (
              <XIcon size={16} isAnimateOnView={false} />
            ) : (
              <MessageCircleIcon size={16} isAnimateOnView={false} />
            )}
            Feedback
          </Button>
        )}
      />
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-88 gap-4 p-4"
      >
        <FeedbackForm onSuccess={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
