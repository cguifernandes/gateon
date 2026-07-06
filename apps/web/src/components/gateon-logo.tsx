import Image from "next/image";
import Logo from "@/app/logo.svg";
import { cn } from "@/lib/utils";

type GateonLogoProps = {
  className?: string;
};

export function GateonLogo({ className }: GateonLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        className="size-9 bg-white rounded-full"
        width={36}
        height={36}
        alt="Logo"
        src={Logo}
      />
    </div>
  );
}
