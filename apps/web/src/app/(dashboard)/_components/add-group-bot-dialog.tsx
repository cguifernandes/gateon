"use client";

import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
import TelegramIcon from "@/assets/telegram.svg";
import {
  ExternalLinkIcon,
  type ExternalLinkIconHandle,
} from "@/components/icons/external-link";
import { PlusIcon } from "@/components/icons/plus";
import {
  ShieldCheckIcon,
  type ShieldCheckIconHandle,
} from "@/components/icons/shield-check";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import {
  DialogStack,
  DialogStackBody,
  DialogStackContent,
  DialogStackDescription,
  DialogStackFooter,
  DialogStackHeader,
  DialogStackNext,
  DialogStackOverlay,
  DialogStackPrevious,
  DialogStackProgress,
  DialogStackTitle,
  DialogStackTrigger,
  useDialogStackNavigation,
} from "@/components/kibo-ui/dialog-stack";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, TELEGRAM_BOT_PERMISSION_GROUPS } from "@/lib/utils";

const TELEGRAM_BOT_URL = "https://t.me/SEU_BOT?startgroup=true";

type AddGroupBotWizardStep = {
  title: string;
  description: string;
  content: ReactNode;
  showNextButton?: boolean;
  nextButton?: ReactElement;
};

const dialogProgressSteps = [
  { id: "add-bot", label: "Conectar" },
  { id: "permissions", label: "Permissões" },
  { id: "confirm", label: "Confirmar" },
] as const;

function openTelegramBotInvite() {
  window.open(TELEGRAM_BOT_URL, "_blank", "noopener,noreferrer");
}

function Step1() {
  const { goNext } = useDialogStackNavigation();
  const externalLinkIcon = useRef<ExternalLinkIconHandle>(null);

  function handleTelegramPrimaryAction() {
    openTelegramBotInvite();
    goNext();
  }

  return (
    <div className="rounded-2xl border w-full flex items-center flex-col gap-y-6 border-border px-4 py-6">
      <div className="flex size-16 items-center justify-center rounded-xl bg-muted">
        <Image src={TelegramIcon} alt="Telegram" width={44} height={44} />
      </div>
      <div className="flex max-w-md w-full flex-col gap-y-1 items-center">
        <h3 className="font-medium font-heading text-center text-foreground">
          Adicione o bot ao grupo
        </h3>
        <p className="text-muted-foreground text-center text-sm">
          Clique no botão abaixo para abrir o Telegram e selecione o grupo em
          que deseja adicionar o bot.
        </p>
      </div>
      <Button
        type="button"
        className="max-w-md w-full flex items-center gap-x-2"
        onClick={handleTelegramPrimaryAction}
        onMouseEnter={() => externalLinkIcon.current?.startAnimation()}
        onMouseLeave={() => externalLinkIcon.current?.stopAnimation()}
      >
        Abrir Telegram <ExternalLinkIcon ref={externalLinkIcon} />
      </Button>
    </div>
  );
}

function Step2() {
  const shieldIconRefs = useRef<Record<string, ShieldCheckIconHandle | null>>(
    {},
  );

  return (
    <div className="flex flex-col w-full gap-y-4">
      {TELEGRAM_BOT_PERMISSION_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-y-2">
          <h3 className="font-semibold text-foreground text-base leading-snug">
            {group.title}
          </h3>
          {group.subgroups.map((sub) => (
            <div key={sub.id} className="space-y-2">
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {sub.items.map((permission) => (
                  <Tooltip key={permission.id}>
                    <TooltipTrigger
                      render={(props) => (
                        <li
                          {...props}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border border-border bg-card p-2",
                            props.className,
                          )}
                          onMouseEnter={(e: MouseEvent<HTMLLIElement>) => {
                            props.onMouseEnter?.(e);
                            shieldIconRefs.current[
                              permission.id
                            ]?.startAnimation();
                          }}
                          onMouseLeave={(e: MouseEvent<HTMLLIElement>) => {
                            props.onMouseLeave?.(e);
                            shieldIconRefs.current[
                              permission.id
                            ]?.stopAnimation();
                          }}
                        >
                          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                            <ShieldCheckIcon
                              ref={(el) => {
                                shieldIconRefs.current[permission.id] = el;
                              }}
                              animateOnHover={false}
                              className="text-primary"
                              isAnimateOnView={false}
                              size={14}
                            />
                          </span>
                          <p
                            className={cn(
                              "min-w-0 flex-1 truncate font-medium text-foreground text-sm",
                              "underline decoration-dotted decoration-primary/60 underline-offset-2",
                            )}
                          >
                            {permission.title}
                          </p>
                        </li>
                      )}
                    />
                    <TooltipContent className="max-w-sm" side="top">
                      {permission.description}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Step3() {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
        <LoaderCircle className="size-6 animate-spin" />
      </span>
      <div>
        <h3 className="font-semibold text-foreground text-base">
          Finalizando configuracao do bot...
        </h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Aguarde enquanto o bot cadastra tudo que precisa para iniciar o
          gerenciamento automatico.
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
      </div>
    </div>
  );
}

export function AddGroupBotDialog() {
  const [open, setOpen] = useState(false);
  const xIconRefs = useRef<(XIconHandle | null)[]>([]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  const steps: AddGroupBotWizardStep[] = [
    {
      title: "Adicionar o bot ao grupo",
      description:
        "Clique no botão abaixo e selecione o grupo onde deseja integrar o bot para iniciar a configuração.",
      content: <Step1 />,
      showNextButton: false,
    },
    {
      title: "Conceder permissões ao bot",
      description:
        "Para garantir o funcionamento correto da automação, conceda as permissões necessárias ao bot no grupo.",
      content: <Step2 />,
    },
    {
      title: "Confirmação da conexão",
      description:
        "Após a adição, o bot enviará automaticamente uma mensagem no grupo confirmando que a conexão foi estabelecida com sucesso.",
      content: <Step3 />,
    },
  ];

  return (
    <DialogStack open={open} onOpenChange={handleOpenChange}>
      <DialogStackTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <PlusIcon size={16} /> Cadastrar um novo
        </Button>
      </DialogStackTrigger>

      <DialogStackOverlay />

      <DialogStackBody className="max-w-2xl">
        {steps.map((step, index) => {
          const hasNext = step.showNextButton ?? index < steps.length - 1;
          const hasPrevious = index > 0;
          const showFooter = hasNext || hasPrevious;

          return (
            <DialogStackContent
              className="h-[550px]"
              key={`${step.title}-${index}`}
            >
              <DialogStackHeader>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-y-1 pr-2">
                    <DialogStackTitle>{step.title}</DialogStackTitle>
                    <DialogStackDescription>
                      {step.description}
                    </DialogStackDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => {
                      xIconRefs.current[index]?.startAnimation();
                    }}
                  >
                    <XIcon
                      ref={(el) => {
                        xIconRefs.current[index] = el;
                      }}
                      size={16}
                    />
                  </Button>
                </div>
                <DialogStackProgress steps={[...dialogProgressSteps]} />
              </DialogStackHeader>
              <div className="min-h-0 flex items-center justify-center w-full h-full p-6 flex-1 overflow-y-auto">
                {step.content}
              </div>
              {showFooter && (
                <DialogStackFooter className="mt-auto border-t border-border flex w-full shrink-0 justify-between">
                  {hasPrevious && (
                    <DialogStackPrevious asChild>
                      <Button className="w-40" variant="outline">
                        Anterior
                      </Button>
                    </DialogStackPrevious>
                  )}
                  {hasNext && (
                    <DialogStackNext asChild>
                      {step.nextButton ?? (
                        <Button className="w-40 ml-auto" type="button">
                          Proximo
                        </Button>
                      )}
                    </DialogStackNext>
                  )}
                </DialogStackFooter>
              )}
            </DialogStackContent>
          );
        })}
      </DialogStackBody>
    </DialogStack>
  );
}
