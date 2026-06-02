"use client";

import { ImageComponent } from "@/components/image-component";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AlertRunFailureGroup } from "./run-error-groups";

type AlertRunErrorAccordionProps = {
  failureGroups: AlertRunFailureGroup[];
};

export function AlertRunErrorAccordion({
  failureGroups,
}: AlertRunErrorAccordionProps) {
  if (failureGroups.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        Nenhum erro registrado nesta execução.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-medium text-muted-foreground text-sm">
          Erros contabilizados
        </h3>
      </div>

      <Accordion
        defaultValue={failureGroups.map((group) => group.id)}
        className="gap-2"
      >
        {failureGroups.map((group) => (
          <AccordionItem key={group.id} value={group.id}>
            <AccordionTrigger>
              <span className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                <ImageComponent
                  src={group.imageSrc}
                  alt={group.imageAlt}
                  width={28}
                  height={28}
                  sizes="28px"
                  avatarFallbackClassName="text-xs!"
                  className="size-[28px] shrink-0 rounded-lg object-cover"
                />
                <span className="truncate font-semibold text-foreground text-sm">
                  {group.name}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-pretty text-muted-foreground text-sm leading-relaxed">
                {group.error}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
