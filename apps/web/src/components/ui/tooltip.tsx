"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-110"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "relative z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 overflow-visible rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className={cn(
              "relative isolate z-50 block h-1.5 w-3 overflow-clip bg-inherit",
              "data-[side=bottom]:-top-1.5",
              "data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180",
              "data-[side=left]:right-[-9px] data-[side=left]:rotate-90",
              "data-[side=right]:left-[-9px] data-[side=right]:-rotate-90",
              "data-[side=inline-start]:right-[-9px] data-[side=inline-start]:rotate-90",
              "data-[side=inline-end]:left-[-9px] data-[side=inline-end]:-rotate-90",
              "before:absolute before:bottom-0 before:left-1/2 before:block before:content-['']",
              "before:size-[calc(6px*sqrt(2))] before:border before:border-border before:bg-inherit",
              "before:transform-[translate(-50%,50%)_rotate(45deg)]",
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
