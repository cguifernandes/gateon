"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { useRef } from "react";
import {
  ChevronDownIcon,
  type ChevronDownIconHandle,
} from "@/components/icons/chevron-down";
import {
  ChevronUpIcon,
  type ChevronUpIconHandle,
} from "@/components/icons/chevron-up";
import { cn } from "@/lib/utils";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "not-last:border-b rounded-xl px-3 cursor-pointer border border-border bg-background transition-all",
        "hover:bg-muted/50 hover:text-foreground",
        "dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        "has-[[data-slot=accordion-trigger][aria-expanded=true]]:bg-muted has-[[data-slot=accordion-trigger][aria-expanded=true]]:text-foreground",
        "dark:has-[[data-slot=accordion-trigger][aria-expanded=true]]:bg-input/50",
        className,
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  const chevronDownRef = useRef<ChevronDownIconHandle>(null);
  const chevronUpRef = useRef<ChevronUpIconHandle>(null);

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          chevronDownRef.current?.startAnimation();
          chevronUpRef.current?.startAnimation();
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          chevronDownRef.current?.stopAnimation();
          chevronUpRef.current?.stopAnimation();
        }}
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-center justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:shrink-0 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          ref={chevronDownRef}
          data-slot="accordion-trigger-icon"
          isAnimateOnView={false}
          animateOnHover={false}
          size={16}
          className="pointer-events-none group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          ref={chevronUpRef}
          data-slot="accordion-trigger-icon"
          isAnimateOnView={false}
          animateOnHover={false}
          size={16}
          className="pointer-events-none hidden group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
