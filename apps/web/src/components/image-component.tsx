"use client";

import Image, { type ImageProps, type StaticImageData } from "next/image";
import { type ReactNode, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function isSessionProxiedSrc(src: ImageProps["src"]): boolean {
  return typeof src === "string" && src.startsWith("/api/");
}

function isExternalAbsoluteUrl(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function shouldUseUnoptimizedSrc(
  src: ImageProps["src"],
  unoptimized?: boolean,
): boolean {
  if (unoptimized != null) return unoptimized;
  return isSessionProxiedSrc(src) || isExternalAbsoluteUrl(src);
}

function hasValidSrc(src: ImageComponentProps["src"]): boolean {
  if (src == null) return false;
  if (typeof src === "string") return src.trim().length > 0;
  return true;
}

function resolveImageKey(src: ImageComponentProps["src"]): string {
  if (!hasValidSrc(src)) return "fallback";
  return typeof src === "string" ? src : (src as StaticImageData).src;
}

function getFallbackLabel(alt: string) {
  const letter = alt.trim()[0];
  return letter ? letter.toUpperCase() : "?";
}

type ImageComponentProps = Omit<ImageProps, "src"> & {
  src?: ImageProps["src"] | null;
  containerClassName?: string;
  avatarFallbackClassName?: string;
  showLoadingSkeleton?: boolean;
  fallback?: ReactNode;
};

export function ImageComponent(props: ImageComponentProps) {
  return (
    <ImageComponentInner
      key={`${resolveImageKey(props.src)}-${props.alt}`}
      {...props}
    />
  );
}

function ImageComponentInner({
  alt,
  className,
  containerClassName,
  fallback,
  onError,
  onLoad,
  quality = 100,
  avatarFallbackClassName,
  showLoadingSkeleton = true,
  src,
  unoptimized,
  ...props
}: ImageComponentProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    hasValidSrc(src) ? "loading" : "error",
  );

  const isLoading = status === "loading";
  const isLoaded = status === "loaded";
  const shouldShowFallback = !hasValidSrc(src) || status === "error";

  if (shouldShowFallback) {
    return (
      <Avatar
        aria-label={alt}
        className={cn("ring-0", containerClassName, className)}
      >
        <AvatarFallback
          className={cn(
            "text-xs rounded-none font-semibold uppercase",
            avatarFallbackClassName,
          )}
        >
          {fallback ?? getFallbackLabel(alt)}
        </AvatarFallback>
      </Avatar>
    );
  }

  const resolvedSrc = src as NonNullable<typeof src>;
  const resolvedUnoptimized = shouldUseUnoptimizedSrc(resolvedSrc, unoptimized);

  return (
    <span
      className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden",
        containerClassName,
      )}
    >
      {showLoadingSkeleton && isLoading ? (
        <Skeleton
          aria-hidden
          className={cn(
            "absolute inset-0 size-full rounded-[inherit]",
            className,
          )}
        />
      ) : null}

      <Image
        alt={alt}
        src={resolvedSrc}
        quality={quality}
        unoptimized={resolvedUnoptimized}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={(event) => {
          setStatus("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          setStatus("error");
          onError?.(event);
        }}
        {...props}
      />
    </span>
  );
}
