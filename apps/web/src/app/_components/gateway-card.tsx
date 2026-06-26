import type { StaticImageData } from "next/image";
import Image from "next/image";
import { CheckIcon } from "@/components/icons/check";
import { Card } from "@/components/ui/card";
import type { Gateway } from "@/lib/utils";

type GatewayCardProps = {
  gateway: Gateway;
  logo: StaticImageData;
};

export function GatewayCard({ gateway, logo }: GatewayCardProps) {
  return (
    <Card className="group h-full rounded-2xl border border-border bg-card py-0 ring-0 gap-0">
      <div className="flex h-28 items-center justify-center border-b border-border px-6">
        <Image
          src={logo}
          alt={gateway.name}
          height={44}
          className="max-h-11 w-auto object-contain"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="font-bold font-heading text-sm text-foreground">
            {gateway.name}
          </p>
          <p className="text-xs font-light leading-snug text-muted-foreground">
            {gateway.description}
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {gateway.points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckIcon className="text-primary" size={10} aria-hidden />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
