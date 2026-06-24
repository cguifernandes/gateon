"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, type CheckIconHandle } from "@/components/icons/check";
import { CopyIcon, type CopyIconHandle } from "@/components/icons/copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyToClipboardButtonProps = {
  value: string;
  label: string;
  className?: string;
  successToast?: { title: string; description?: string };
  errorToast?: { title: string; description?: string };
};

export function CopyToClipboardButton({
  value,
  label,
  className,
  successToast,
  errorToast,
}: CopyToClipboardButtonProps) {
  const [copied, setCopied] = useState(false);
  const copyIconRef = useRef<CopyIconHandle>(null);
  const checkIconRef = useRef<CheckIconHandle>(null);

  useEffect(() => {
    if (copied) {
      checkIconRef.current?.startAnimation();
    }
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (successToast) {
        toast.success(successToast.title, {
          description: successToast.description,
        });
      }
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      if (errorToast) {
        toast.error(errorToast.title, {
          description: errorToast.description,
        });
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("shrink-0", className)}
      onClick={handleCopy}
      onMouseEnter={() => {
        if (!copied) {
          copyIconRef.current?.startAnimation();
        }
      }}
      onMouseLeave={() => {
        if (!copied) {
          copyIconRef.current?.stopAnimation();
        }
      }}
    >
      {copied ? (
        <CheckIcon ref={checkIconRef} size={16} isAnimateOnView={false} />
      ) : (
        <CopyIcon
          ref={copyIconRef}
          size={16}
          isAnimateOnView={false}
          animateOnHover={false}
        />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
