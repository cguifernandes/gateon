"use client";

import Image, { type ImageProps, type StaticImageData } from "next/image";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function isSessionProxiedSrc(src: ImageProps["src"]): boolean {
  return typeof src === "string" && src.startsWith("/api/");
}

function resolveImageKey(src: ImageProps["src"]): string {
  return typeof src === "string" ? src : (src as StaticImageData).src;
}

type ImageComponentProps = ImageProps & {
  containerClassName?: string;
  showLoadingSkeleton?: boolean;
};

export function ImageComponent(props: ImageComponentProps) {
  return <ImageComponentInner key={resolveImageKey(props.src)} {...props} />;
}

function ImageComponentInner({
  alt,
  className,
  containerClassName,
  onError,
  onLoad,
  quality = 100,
  showLoadingSkeleton = true,
  src,
  unoptimized,
  ...props
}: ImageComponentProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  const resolvedUnoptimized = unoptimized ?? isSessionProxiedSrc(src);
  const isLoading = status === "loading";
  const isLoaded = status === "loaded";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden",
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
        src={src}
        quality={quality}
        unoptimized={resolvedUnoptimized}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          status === "error" && "hidden",
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
