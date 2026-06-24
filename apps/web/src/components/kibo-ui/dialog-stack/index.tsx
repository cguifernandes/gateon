"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Portal } from "radix-ui";
import type {
  ButtonHTMLAttributes,
  Dispatch,
  HTMLAttributes,
  MouseEvent,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  SetStateAction,
} from "react";
import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckIcon } from "@/components/icons/check";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogStackContextType = {
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  totalDialogs: number;
  setTotalDialogs: Dispatch<SetStateAction<number>>;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  clickable: boolean;
};

const DialogStackContext = createContext<DialogStackContextType>({
  activeIndex: 0,
  setActiveIndex: () => {},
  totalDialogs: 0,
  setTotalDialogs: () => {},
  isOpen: false,
  setIsOpen: () => {},
  clickable: false,
});

type DialogStackChildProps = {
  index?: number;
};

export type DialogStackProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  clickable?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};

export const DialogStack = ({
  children,
  className,
  open,
  defaultOpen = false,
  onOpenChange,
  clickable = false,
  ...props
}: DialogStackProps) => {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useControllableState({
    defaultProp: defaultOpen,
    prop: open,
    onChange: onOpenChange,
  });

  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousPathnameRef.current === null) {
      previousPathnameRef.current = pathname;
      return;
    }
    if (previousPathnameRef.current === pathname) {
      return;
    }
    previousPathnameRef.current = pathname;
    setIsOpen(false);
    setActiveIndex(0);
  }, [pathname, setIsOpen]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, [setIsOpen]);

  return (
    <DialogStackContext.Provider
      value={{
        activeIndex,
        setActiveIndex,
        totalDialogs: 0,
        setTotalDialogs: () => {},
        isOpen: isOpen ?? false,
        setIsOpen: (value) => setIsOpen(Boolean(value)),
        clickable,
      }}
    >
      <div className={className} {...props}>
        {children}
      </div>
    </DialogStackContext.Provider>
  );
};

export type DialogStackTriggerProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

export const DialogStackTrigger = ({
  children,
  className,
  onClick,
  asChild,
  ...props
}: DialogStackTriggerProps) => {
  const context = useContext(DialogStackContext);

  if (!context) {
    throw new Error("DialogStackTrigger must be used within a DialogStack");
  }

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    context.setIsOpen(true);
    onClick?.(e);
  };

  if (asChild && children) {
    const child = children as ReactElement<{
      onClick: MouseEventHandler<HTMLButtonElement>;
      className?: string;
    }>;
    return cloneElement(child, {
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        handleClick(e);
        child.props.onClick?.(e);
      },
      className: cn(className, child.props.className),
      ...props,
    });
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm",
        "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "h-10 px-4 py-2",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export type DialogStackOverlayProps = HTMLMotionProps<"div">;

export const DialogStackOverlay = ({
  className,
  ...props
}: DialogStackOverlayProps) => {
  const context = useContext(DialogStackContext);

  if (!context) {
    throw new Error("DialogStackOverlay must be used within a DialogStack");
  }

  const handleClick = useCallback(() => {
    context.setIsOpen(false);
  }, [context.setIsOpen]);

  return (
    <AnimatePresence>
      {context.isOpen ? (
        <Portal.Root>
          <motion.div
            key="dialog-stack-overlay"
            animate={{ opacity: 1 }}
            className={cn("fixed inset-0 z-100 bg-black/40", className)}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            initial={{ opacity: 0, backdropFilter: "blur(2px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={handleClick}
            {...props}
          />
        </Portal.Root>
      ) : null}
    </AnimatePresence>
  );
};

export type DialogStackBodyProps = HTMLAttributes<HTMLDivElement> & {
  children:
    | ReactElement<DialogStackChildProps>[]
    | ReactElement<DialogStackChildProps>;
};

export const DialogStackBody = ({
  children,
  className,
  ...props
}: DialogStackBodyProps) => {
  const context = useContext(DialogStackContext);
  const [totalDialogs, setTotalDialogs] = useState(Children.count(children));

  if (!context) {
    throw new Error("DialogStackBody must be used within a DialogStack");
  }

  if (!context.isOpen) {
    return null;
  }

  return (
    <DialogStackContext.Provider
      value={{
        ...context,
        totalDialogs,
        setTotalDialogs,
      }}
    >
      <Portal.Root>
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-100 mx-auto flex w-full max-w-lg flex-col items-center justify-center p-4",
            className,
          )}
          {...props}
        >
          <div className="pointer-events-auto relative flex max-h-dvh w-full flex-col items-center justify-start overflow-y-auto overscroll-contain">
            {Children.map(children, (child, index) => {
              const childElement = child as ReactElement<{
                index: number;
                onClick: MouseEventHandler<HTMLButtonElement>;
                className?: string;
              }>;

              return cloneElement(childElement, {
                ...childElement.props,
                index,
              });
            })}
          </div>
        </div>
      </Portal.Root>
    </DialogStackContext.Provider>
  );
};

export type DialogStackContentProps = HTMLAttributes<HTMLDivElement> & {
  index?: number;
  offset?: number;
};

export const DialogStackContent = ({
  children,
  className,
  index = 0,
  offset = 2,
  ...props
}: DialogStackContentProps) => {
  const context = useContext(DialogStackContext);

  if (!context) {
    throw new Error("DialogStackContent must be used within a DialogStack");
  }

  if (!context.isOpen) {
    return null;
  }

  const handleClick = () => {
    if (context.clickable && context.activeIndex > index) {
      context.setActiveIndex(index ?? 0);
    }
  };

  const distanceFromActive = index - context.activeIndex;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: "This is a clickable dialog"
    // biome-ignore lint/a11y/useKeyWithClickEvents: "This is a clickable dialog"
    <div
      className={cn(
        "h-auto w-full rounded-lg border border-border bg-background shadow-lg transition-all duration-300",
        className,
      )}
      onClick={handleClick}
      style={{
        top: 0,
        transform: `translateY(5px)`,
        width: `calc(100% - ${Math.abs(distanceFromActive) * 10}px)`,
        zIndex: 50 - Math.abs(context.activeIndex - (index ?? 0)),
        position: distanceFromActive ? "absolute" : "relative",
        opacity: distanceFromActive > 0 ? 0 : 1,
        cursor:
          context.clickable && context.activeIndex > index
            ? "pointer"
            : "default",
      }}
      {...props}
    >
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col transition-all duration-300",
          context.activeIndex !== index &&
            "pointer-events-none select-none opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
};

export type DialogStackTitleProps = HTMLAttributes<HTMLHeadingElement>;

export const DialogStackTitle = ({
  children,
  className,
  ...props
}: DialogStackTitleProps) => (
  <h2
    className={cn(
      "font-semibold font-heading text-lg leading-none tracking-tight",
      className,
    )}
    {...props}
  >
    {children}
  </h2>
);

export type DialogStackDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const DialogStackDescription = ({
  children,
  className,
  ...props
}: DialogStackDescriptionProps) => (
  <p
    className={cn("font-light text-muted-foreground text-sm", className)}
    {...props}
  >
    {children}
  </p>
);

export type DialogStackHeaderProps = HTMLAttributes<HTMLDivElement>;

export const DialogStackHeader = ({
  className,
  ...props
}: DialogStackHeaderProps) => (
  <div
    className={cn(
      "flex flex-col gap-3.5 border-b border-border p-4 text-start",
      className,
    )}
    {...props}
  />
);

export type DialogStackFooterProps = HTMLAttributes<HTMLDivElement>;

export const DialogStackFooter = ({
  children,
  className,
  ...props
}: DialogStackFooterProps) => (
  <div
    className={cn(
      "flex items-center justify-end gap-2 border-t border-border p-4",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type DialogStackCloseButtonProps = {
  className?: string;
};

export function DialogStackCloseButton({
  className,
}: DialogStackCloseButtonProps) {
  const context = useContext(DialogStackContext);
  const xIconRef = useRef<XIconHandle>(null);

  if (!context) {
    throw new Error("DialogStackCloseButton must be used within a DialogStack");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("shrink-0", className)}
      aria-label="Fechar"
      onClick={() => context.setIsOpen(false)}
      onMouseEnter={() => xIconRef.current?.startAnimation()}
      onMouseLeave={() => xIconRef.current?.stopAnimation()}
    >
      <XIcon size={14} isAnimateOnView={false} ref={xIconRef} />
      <span className="sr-only">Fechar</span>
    </Button>
  );
}

export type DialogStackNextProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export const DialogStackNext = ({
  children,
  className,
  asChild,
  ...props
}: DialogStackNextProps) => {
  const context = useContext(DialogStackContext);

  if (!context) {
    throw new Error("DialogStackNext must be used within a DialogStack");
  }

  const handleNext = () => {
    if (context.activeIndex < context.totalDialogs - 1) {
      context.setActiveIndex(context.activeIndex + 1);
    }
  };

  if (asChild && children) {
    const child = children as ReactElement<{
      onClick: MouseEventHandler<HTMLButtonElement>;
      className?: string;
    }>;

    return cloneElement(child, {
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(e);
        if (!e.defaultPrevented) {
          handleNext();
        }
      },
      className: cn(className, child.props.className),
      ...props,
    });
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      disabled={context.activeIndex >= context.totalDialogs - 1}
      onClick={handleNext}
      type="button"
      {...props}
    >
      {children || "Next"}
    </button>
  );
};

export type DialogStackPreviousProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

export const DialogStackPrevious = ({
  children,
  className,
  asChild,
  ...props
}: DialogStackPreviousProps) => {
  const context = useContext(DialogStackContext);

  if (!context) {
    throw new Error("DialogStackPrevious must be used within a DialogStack");
  }

  const handlePrevious = () => {
    if (context.activeIndex > 0) {
      context.setActiveIndex(context.activeIndex - 1);
    }
  };

  if (asChild && children) {
    const child = children as ReactElement<{
      onClick: MouseEventHandler<HTMLButtonElement>;
      className?: string;
    }>;

    return cloneElement(child, {
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(e);
        if (!e.defaultPrevented) {
          handlePrevious();
        }
      },
      className: cn(className, child.props.className),
      ...props,
    });
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      disabled={context.activeIndex <= 0}
      onClick={handlePrevious}
      type="button"
      {...props}
    >
      {children || "Previous"}
    </button>
  );
};

/**
 * Imperative navigation for the dialog stack (e.g. advance after an in-flow action).
 * Must be used under `DialogStack` and `DialogStackBody` so `totalDialogs` is set.
 */
export function useDialogStackNavigation() {
  const context = useContext(DialogStackContext);

  if (!context) {
    throw new Error(
      "useDialogStackNavigation must be used within a DialogStack",
    );
  }

  const goNext = useCallback(() => {
    if (context.activeIndex < context.totalDialogs - 1) {
      context.setActiveIndex(context.activeIndex + 1);
    }
  }, [context.activeIndex, context.setActiveIndex, context.totalDialogs]);

  const goPrevious = useCallback(() => {
    if (context.activeIndex > 0) {
      context.setActiveIndex(context.activeIndex - 1);
    }
  }, [context.activeIndex, context.setActiveIndex]);

  const goToStart = useCallback(() => {
    context.setActiveIndex(0);
  }, [context.setActiveIndex]);

  const canGoNext =
    context.totalDialogs > 0 && context.activeIndex < context.totalDialogs - 1;
  const canGoPrevious = context.activeIndex > 0;

  return {
    goNext,
    goPrevious,
    goToStart,
    activeIndex: context.activeIndex,
    totalDialogs: context.totalDialogs,
    canGoNext,
    canGoPrevious,
  };
}

export type DialogStepMeta = {
  id?: string | number;
  label: string;
  icon?: ReactNode;
};

export type DialogStackProgressProps = HTMLAttributes<HTMLDivElement> & {
  steps?: DialogStepMeta[];
};

export const DialogStackProgress = ({
  steps,
  className,
  ...props
}: DialogStackProgressProps) => {
  const context = useContext(DialogStackContext);

  if (!context || !context.isOpen) return null;

  const total = steps?.length ?? (context.totalDialogs || 1);
  const current = Math.min(context.activeIndex + 1, total);

  if (!steps?.length) {
    return null;
  }

  return (
    <div {...props} className={cn("w-full", className)}>
      <div className="relative flex w-full justify-between gap-1 px-2">
        <div
          className="pointer-events-none mx-10 absolute inset-x-0 top-[15px] z-0 h-px bg-border sm:top-4"
          aria-hidden
        />
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCurrent = stepNumber === current;
          const isFuture = stepNumber > current;
          const isPast = stepNumber < current;

          return (
            <div
              key={step.id ?? idx}
              className="relative z-10 flex min-w-0 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors sm:size-8",
                  isCurrent &&
                    "bg-primary text-white shadow-[0_0_0_4px_var(--muted)]",
                  isPast && "bg-primary text-white",
                  isFuture && "bg-muted text-muted-foreground",
                )}
              >
                {isPast ? <CheckIcon size={16} /> : (step.icon ?? stepNumber)}
              </div>
              <span
                className={cn(
                  "w-full px-0.5 text-center text-xs leading-snug sm:text-sm",
                  isCurrent && "font-semibold text-foreground",
                  !isCurrent && "font-normal text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
