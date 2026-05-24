import { cn } from "@/lib/utils";

type GateonLogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function GateonLogo({
  className,
  showWordmark = true,
}: GateonLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-primary to-blue-700 shadow-md shadow-primary/30 ring-1 ring-black/5 ring-inset dark:ring-white/10">
        <svg
          viewBox="0 0 24 24"
          className="size-5 text-primary-foreground"
          fill="none"
          aria-hidden
        >
          <title>Gateon mark</title>
          <path
            d="M7 20V10.5Q12 4.5 17 10.5V20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="font-bold tracking-[-0.02em] text-foreground text-lg leading-none sm:text-xl">
          Gate<span className="text-primary">on</span>
        </span>
      ) : null}
    </span>
  );
}
