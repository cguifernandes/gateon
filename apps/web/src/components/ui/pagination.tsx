"use client";

import type * as React from "react";
import { useRef } from "react";
import {
  ChevronLeftIcon,
  type ChevronLeftIconHandle,
} from "@/components/icons/chevron-left";
import {
  ChevronRightIcon,
  type ChevronRightIconHandle,
} from "@/components/icons/chevron-right";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"button">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={className}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  text = "Anterior",
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  const iconRef = useRef<ChevronLeftIconHandle>(null);

  return (
    <PaginationLink
      aria-label="Ir para a página anterior"
      size="sm"
      disabled={disabled}
      className={cn("pl-1.5!", className)}
      onMouseEnter={(event) => {
        if (!disabled) {
          iconRef.current?.startAnimation();
        }
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (!disabled) {
          iconRef.current?.stopAnimation();
        }
        onMouseLeave?.(event);
      }}
      {...props}
    >
      <ChevronLeftIcon
        ref={iconRef}
        size={16}
        animateOnHover={false}
        isAnimateOnView={false}
        data-icon="inline-start"
      />
      {text}
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Próxima",
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  const iconRef = useRef<ChevronRightIconHandle>(null);

  return (
    <PaginationLink
      aria-label="Ir para a próxima página"
      size="sm"
      disabled={disabled}
      className={cn("pr-1.5!", className)}
      onMouseEnter={(event) => {
        if (!disabled) {
          iconRef.current?.startAnimation();
        }
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (!disabled) {
          iconRef.current?.stopAnimation();
        }
        onMouseLeave?.(event);
      }}
      {...props}
    >
      {text}
      <ChevronRightIcon
        ref={iconRef}
        size={16}
        animateOnHover={false}
        isAnimateOnView={false}
        data-icon="inline-end"
      />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="inline-flex size-4 items-center justify-center text-muted-foreground">
        …
      </span>
      <span className="sr-only">Mais páginas</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
