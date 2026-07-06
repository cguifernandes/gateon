import { motion } from "motion/react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import type { Gateway } from "@/lib/utils";

type GatewayCardProps = {
  gateway: Gateway;
  logo: StaticImageData;
  index: number;
};

export function GatewayCard({ gateway, index, logo }: GatewayCardProps) {
  const MotionCard = motion.create(Card);

  return (
    <MotionCard
      initial={{
        opacity: 0,
        y: 20,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: false,
        amount: 0.3,
      }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: "linear",
      }}
      className="group relative h-full rounded-2xl border border-border bg-card py-0 ring-0 gap-0"
    >
      {!gateway.isAvaliable && (
        <div className="absolute top-4 right-[-34px] z-10 w-32 rotate-45 bg-primary py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
          Em breve
        </div>
      )}

      <div className="flex h-28 items-center justify-center border-b border-border px-6">
        <Image
          src={logo}
          alt={gateway.name}
          height={38}
          className="max-h-10 w-auto object-contain"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <p className="font-bold font-heading text-sm text-foreground">
            {gateway.name}
          </p>
          <p className="text-xs font-light leading-snug text-muted-foreground">
            {gateway.description}
          </p>
        </div>
      </div>
    </MotionCard>
  );
}
