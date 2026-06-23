"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import TelegramIcon from "@/assets/telegram.svg";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import {
  ExternalLinkIcon,
  type ExternalLinkIconHandle,
} from "@/components/icons/external-link";
import { LoaderIcon } from "@/components/icons/loader";
import { PlusIcon, type PlusIconHandle } from "@/components/icons/plus";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGroupLimit } from "@/contexts/group-limit-context";
import { revalidateTelegramGroupsAction } from "@/lib/server/revalidate-telegram-groups.action";
import { cn, TELEGRAM_BOT_PERMISSION_GROUPS } from "@/lib/utils";
import type {
  TelegramConnectionStatusFromApi,
  TelegramGroupConnectionIntentStatusDto,
} from "@/lib/zod/telegram-group-connection-schemas";
import {
  startTelegramGroupConnectionResponseSchema,
  telegramConnectionStatusSchema,
  telegramGroupConnectionIntentStatusSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import { ArrowLeftIcon, type ArrowLeftIconHandle } from "./icons/arrow-left";
import { ArrowRightIcon, type ArrowRightIconHandle } from "./icons/arrow-right";

type AddGroupBotDialogProps = {
  presentation?: "default" | "icon";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConnectionCompleted?: () => void | Promise<void>;
  showTrigger?: boolean;
};

type AddGroupBotWizardStep = {
  title: string;
  description: string;
  content: ReactNode;
  showNextButton?: boolean;
  nextButton?: ReactElement;
};

const dialogProgressSteps = [
  { id: "permissions", label: "Permissões" },
  { id: "connect", label: "Conectar" },
  { id: "confirm", label: "Confirmar" },
] as const;

const TERMINAL_INTENT_STATUSES = new Set<TelegramConnectionStatusFromApi>([
  "CONNECTED",
  "EXPIRED",
  "FAILED",
]);

function openTelegramPrivateStart(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function PermissionsStep() {
  const shieldIconRefs = useRef<Record<string, ShieldCheckIconHandle | null>>(
    {},
  );

  return (
    <div className="flex w-full flex-col gap-6">
      {TELEGRAM_BOT_PERMISSION_GROUPS.map((group) => (
        <section key={group.id} className="space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-foreground leading-snug">
              {group.title}
            </h3>
            {"subtitle" in group && group.subtitle ? (
              <p className="text-muted-foreground text-sm">{group.subtitle}</p>
            ) : null}
          </div>
          <ul className="space-y-2">
            {group.subgroups.flatMap((sub) =>
              sub.items.map((permission) => (
                <li
                  key={permission.id}
                  className="flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                  onMouseEnter={() =>
                    shieldIconRefs.current[permission.id]?.startAnimation()
                  }
                  onMouseLeave={() =>
                    shieldIconRefs.current[permission.id]?.stopAnimation()
                  }
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ShieldCheckIcon
                      ref={(el) => {
                        shieldIconRefs.current[permission.id] = el;
                      }}
                      animateOnHover={false}
                      className="text-primary"
                      isAnimateOnView={false}
                      size={18}
                    />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium text-foreground text-sm">
                      {permission.title}
                    </p>
                    <p className="text-muted-foreground text-sm leading-snug">
                      {permission.description}
                    </p>
                  </div>
                </li>
              )),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ConnectStep({
  onIntentCreated,
}: {
  onIntentCreated: (intentId: string) => void;
}) {
  const { goNext } = useDialogStackNavigation();
  const externalLinkIcon = useRef<ExternalLinkIconHandle>(null);
  const [isStarting, setIsStarting] = useState(false);

  async function handleConnectTelegram() {
    setIsStarting(true);
    try {
      const res = await fetch("/api/telegram/group-connections/start", {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(20_000),
      });

      const bodyUnknown: unknown = await res.json().catch(() => null);

      if (res.status === 401) {
        toast.error("Sessão expirada", {
          description:
            "Sua sessão é inválida ou expirou. Entre novamente para conectar o bot.",
        });
        return;
      }

      if (res.status === 403) {
        const isGroupLimit =
          bodyUnknown &&
          typeof bodyUnknown === "object" &&
          "error" in bodyUnknown &&
          (bodyUnknown as { error?: unknown }).error === "GROUP_LIMIT_REACHED";
        const maxGroups =
          bodyUnknown &&
          typeof bodyUnknown === "object" &&
          "maxGroups" in bodyUnknown &&
          typeof (bodyUnknown as { maxGroups?: unknown }).maxGroups === "number"
            ? (bodyUnknown as { maxGroups: number }).maxGroups
            : null;

        if (isGroupLimit) {
          toast.error("Limite de grupos atingido", {
            description: maxGroups
              ? `Seu plano permite até ${maxGroups} grupos. Faça upgrade para adicionar mais.`
              : "Você atingiu o limite de grupos do seu plano atual.",
          });
        } else {
          toast.error("Não foi possível iniciar a conexão", {
            description:
              "Esta ação não é permitida no momento. Tente novamente.",
          });
        }
        return;
      }

      if (!res.ok) {
        const msg =
          bodyUnknown &&
          typeof bodyUnknown === "object" &&
          "message" in bodyUnknown &&
          typeof (bodyUnknown as { message?: unknown }).message === "string"
            ? (bodyUnknown as { message: string }).message
            : bodyUnknown &&
                typeof bodyUnknown === "object" &&
                "error" in bodyUnknown &&
                typeof (bodyUnknown as { error?: unknown }).error === "string"
              ? (bodyUnknown as { error: string }).error
              : "Tente novamente em instantes.";
        toast.error("Falha ao iniciar a conexão", {
          description: msg,
        });
        return;
      }

      const parsed =
        startTelegramGroupConnectionResponseSchema.safeParse(bodyUnknown);
      if (!parsed.success) {
        toast.error("Erro no servidor", {
          description: "A resposta recebida está em um formato inválido.",
        });
        return;
      }

      onIntentCreated(parsed.data.intentId);
      openTelegramPrivateStart(parsed.data.privateStartUrl);
      goNext();
    } catch {
      toast.error("Erro de conexão", {
        description:
          "Não foi possível falar com o servidor. Confira sua internet e tente novamente.",
      });
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <Empty>
      <EmptyHeader className="max-w-xl">
        <EmptyMedia className="size-16 rounded-xl bg-muted">
          <Image src={TelegramIcon} alt="Telegram" width={44} height={44} />
        </EmptyMedia>
        <EmptyTitle>Confirmar sua identidade no Telegram</EmptyTitle>
        <EmptyDescription className="text-pretty w-full">
          Abriremos o bot no chat privado. Toque em{" "}
          <strong>Start ou Iniciar</strong>. Depois use o botão do bot para{" "}
          <strong>selecionar o grupo</strong> onde o Gateon será adicionado.
          Isso irá garantir que a conta do painel corresponda à mesma pessoa no
          Telegram.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="w-full">
        <Button
          type="button"
          disabled={isStarting}
          loading={isStarting}
          className="w-full gap-x-2"
          onClick={() => void handleConnectTelegram()}
          onMouseEnter={() => externalLinkIcon.current?.startAnimation()}
          onMouseLeave={() => externalLinkIcon.current?.stopAnimation()}
        >
          Abrir Telegram <ExternalLinkIcon ref={externalLinkIcon} />
        </Button>
      </EmptyContent>
    </Empty>
  );
}

type ConfirmStatusView = {
  mediaClassName: string;
  icon: ReactNode;
  title?: string;
  description: ReactNode;
  footer?: ReactNode;
};

function ConfirmStatusEmpty({
  mediaClassName,
  icon,
  title,
  description,
  footer,
}: ConfirmStatusView) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia className={cn("mb-0 size-16 rounded-xl", mediaClassName)}>
          {icon}
        </EmptyMedia>
        {title ? <EmptyTitle className="text-base">{title}</EmptyTitle> : null}
        <EmptyDescription className="text-pretty font-light leading-relaxed">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {footer ? <EmptyContent>{footer}</EmptyContent> : null}
    </Empty>
  );
}

function resolveConfirmStatusView(
  intentId: string | null,
  status: TelegramConnectionStatusFromApi | null,
  pollError: string | null,
  onRestartWizard?: () => void,
): ConfirmStatusView {
  if (!intentId) {
    return {
      mediaClassName: "bg-yellow-500/10",
      icon: <BadgeAlertIcon size={40} className="text-yellow-500" />,
      description: (
        <>
          Volte ao passo anterior e abra o Telegram com o link seguro para
          acompanhar a conexão aqui.
        </>
      ),
    };
  }

  if (status === "CONNECTED") {
    return {
      mediaClassName: "bg-green-600/10",
      icon: <CircleCheckIcon size={40} className="text-green-600" />,
      title: "Grupo conectado ao Gateon",
      description: (
        <>
          Daqui você pode seguir no{" "}
          <Link
            href="/groups"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
          >
            painel principal
          </Link>{" "}
          para conectar o gateway de pagamento, revisar permissões do bot e
          personalizar mensagens automáticas.
        </>
      ),
    };
  }

  if (status === "EXPIRED" || status === "FAILED") {
    return {
      mediaClassName: "bg-destructive/10",
      icon: <BadgeAlertIcon size={40} className="text-destructive" />,
      title: "Conexão não concluída",
      description:
        status === "EXPIRED" ? (
          <Fragment key="expired">
            O prazo deste link de conexão acabou (ele é válido só por um tempo).
            Toque de novo em{" "}
            <button
              type="button"
              onClick={onRestartWizard}
              className="font-medium text-primary underline underline-offset-2 cursor-pointer hover:text-primary/90"
            >
              Cadastrar
            </button>{" "}
            para gerar um link novo e concluir no Telegram.
          </Fragment>
        ) : (
          <Fragment key="failed">
            A conexão não pôde ser concluída. Isso pode ter sido causado por uma
            falha temporária ou por algum problema no grupo. Toque em{" "}
            <button
              type="button"
              onClick={onRestartWizard}
              className="font-medium text-primary underline underline-offset-2 cursor-pointer hover:text-primary/90"
            >
              Cadastrar
            </button>{" "}
            para gerar um novo link e finalizar o cadastro no Telegram. Se o
            problema continuar, verifique as mensagens enviadas pelo bot no
            Telegram.
          </Fragment>
        ),
    };
  }

  const isWaitingPermissions = status === "WAITING_FOR_PERMISSIONS";

  return {
    mediaClassName: isWaitingPermissions ? "bg-yellow-500/10" : "bg-muted",
    icon: isWaitingPermissions ? (
      <BadgeAlertIcon size={40} className="text-yellow-500" />
    ) : (
      <LoaderIcon size={40} className="text-primary" />
    ),
    title: isWaitingPermissions
      ? "Faltam permissões no grupo"
      : "Continue no Telegram",
    description: isWaitingPermissions
      ? "O bot já está no grupo, mas ainda não tem permissão de administrador com todas as ações obrigatórias (por exemplo mensagens, restringir membros e convidar por link — conforme o Telegram mostrar ao editar o bot). Ajuste em Administradores no grupo e salve: esta tela será atualizada sozinha em instantes."
      : "Complete no app do Telegram o que aparece depois que você abrir o link: confirmar na conversa com o bot e adicioná-lo ao grupo como administrador. Você pode deixar esta janela aberta — assim que houver novidade lá, mostramos o resultado aqui automaticamente.",
    footer: pollError ? (
      <div className="flex px-2 py-1 rounded-lg border border-destructive/10 bg-destructive/5">
        <p className="text-destructive text-xs font-light">{pollError}</p>
      </div>
    ) : undefined,
  };
}

type ConfirmStepProps = {
  intentId: string | null;
  onConnectionCompleted: () => void;
  onResetWizard: () => void;
};

function ConfirmStep({
  intentId,
  onConnectionCompleted,
  onResetWizard,
}: ConfirmStepProps) {
  const { goToStart } = useDialogStackNavigation();
  const groupsRefreshedRef = useRef(false);
  const [latest, setLatest] =
    useState<TelegramGroupConnectionIntentStatusDto | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!intentId) {
      setLatest(null);
      setPollError(null);
      groupsRefreshedRef.current = false;
      return;
    }

    groupsRefreshedRef.current = false;
    let cancelled = false;
    const id = intentId;

    async function pollOnce(): Promise<boolean> {
      try {
        const res = await fetch(
          `/api/telegram/group-connections/${encodeURIComponent(id)}`,
          { credentials: "include", signal: AbortSignal.timeout(15_000) },
        );

        if (!res.ok) {
          if (!cancelled) {
            if (res.status === 401 || res.status === 403) {
              setPollError(
                "Sua sessão expirou. Atualize a página e entre de novo.",
              );
            } else {
              setPollError(
                "Não foi possível atualizar o status. Tentando novamente…",
              );
            }
          }
          return false;
        }

        const raw: unknown = await res.json();
        const parsed = telegramGroupConnectionIntentStatusSchema.safeParse(raw);
        if (!parsed.success) {
          if (!cancelled) {
            setPollError("Resposta inválida ao consultar status.");
          }
          return false;
        }

        if (cancelled) {
          return false;
        }

        setPollError(null);
        setLatest(parsed.data);

        if (parsed.data.status === "CONNECTED" && !groupsRefreshedRef.current) {
          groupsRefreshedRef.current = true;
          onConnectionCompleted();
        }

        return TERMINAL_INTENT_STATUSES.has(parsed.data.status);
      } catch {
        return false;
      }
    }

    const intervalId = setInterval(() => {
      void pollOnce().then((terminal) => {
        if (terminal) {
          clearInterval(intervalId);
        }
      });
    }, 2500);

    void pollOnce().then((terminal) => {
      if (terminal) {
        clearInterval(intervalId);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [intentId, onConnectionCompleted]);

  const statusParsed = latest
    ? telegramConnectionStatusSchema.safeParse(latest.status)
    : null;
  const status = statusParsed?.success ? statusParsed.data : null;

  const handleRestartWizard = useCallback(() => {
    onResetWizard();
    goToStart();
  }, [goToStart, onResetWizard]);

  return (
    <ConfirmStatusEmpty
      {...resolveConfirmStatusView(
        intentId,
        status,
        pollError,
        handleRestartWizard,
      )}
    />
  );
}

export function AddGroupBotDialog({
  presentation = "default",
  open: openProp,
  onOpenChange: onOpenChangeProp,
  onConnectionCompleted: onConnectionCompletedProp,
  showTrigger = true,
}: AddGroupBotDialogProps) {
  const { canAddGroup, isAtLimit, maxGroups } = useGroupLimit();
  const [internalOpen, setInternalOpen] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const xIconRefs = useRef<(XIconHandle | null)[]>([]);
  const plusIconRefs = useRef<PlusIconHandle | null>(null);
  const arrowLeftIconRefs = useRef<(ArrowLeftIconHandle | null)[]>([]);
  const arrowRightIconRefs = useRef<(ArrowRightIconHandle | null)[]>([]);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next && !canAddGroup) {
        return;
      }
      if (isControlled) {
        onOpenChangeProp?.(next);
      } else {
        setInternalOpen(next);
      }
      if (!next) {
        setIntentId(null);
      }
    },
    [canAddGroup, isControlled, onOpenChangeProp],
  );

  const handleIntentCreated = useCallback((id: string) => {
    setIntentId(id);
  }, []);

  const handleResetWizard = useCallback(() => {
    setIntentId(null);
  }, []);

  const handleConnectionCompleted = useCallback(async () => {
    toast.success("Grupo conectado ao Gateon", {
      description: "A lista de grupos foi atualizada no painel.",
    });
    handleOpenChange(false);
    setIntentId(null);
    await revalidateTelegramGroupsAction();
    await onConnectionCompletedProp?.();
  }, [handleOpenChange, onConnectionCompletedProp]);

  const steps: AddGroupBotWizardStep[] = useMemo(
    () => [
      {
        title: "Permissões do bot no grupo",
        description:
          "Antes de conectar, confira o que o Gateon precisa no Telegram. No grupo, promova o bot a administrador e marque as permissões da lista.",
        content: <PermissionsStep />,
      },
      {
        title: "Conectar no Telegram",
        description:
          "Abra o bot em uma conversa privada, confirme sua identidade e escolha o grupo onde o Gateon será adicionado.",
        content: <ConnectStep onIntentCreated={handleIntentCreated} />,
        showNextButton: false,
      },
      {
        title: "Confirmar conexão",
        description:
          "Acompanhamos automaticamente até o bot confirmar como administrador com as permissões corretas.",
        content: (
          <ConfirmStep
            intentId={intentId}
            onConnectionCompleted={handleConnectionCompleted}
            onResetWizard={handleResetWizard}
          />
        ),
        showNextButton: false,
      },
    ],
    [
      handleConnectionCompleted,
      handleIntentCreated,
      handleResetWizard,
      intentId,
    ],
  );

  const limitTitle = isAtLimit
    ? `Limite de ${maxGroups} grupos atingido no plano atual`
    : undefined;

  const defaultTrigger = (
    <Button
      type="button"
      variant="default"
      disabled={!canAddGroup}
      title={limitTitle}
      onClick={() => {
        if (canAddGroup) {
          handleOpenChange(true);
        }
      }}
      onMouseEnter={() => plusIconRefs.current?.startAnimation()}
      onMouseLeave={() => plusIconRefs.current?.stopAnimation()}
    >
      <PlusIcon ref={plusIconRefs} size={14} /> Conectar Novo Grupo
    </Button>
  );

  const iconTrigger = (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <DialogStackTrigger asChild>
            <Button
              {...triggerProps}
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!canAddGroup}
              title={limitTitle}
              aria-label="Conectar novo grupo"
              onClick={() => {
                if (canAddGroup) {
                  handleOpenChange(true);
                }
              }}
              onMouseEnter={() => plusIconRefs.current?.startAnimation()}
              onMouseLeave={() => plusIconRefs.current?.stopAnimation()}
            >
              <PlusIcon ref={plusIconRefs} size={16} />
            </Button>
          </DialogStackTrigger>
        )}
      />
      <TooltipContent side="bottom">
        {isAtLimit ? limitTitle : "Conectar novo grupo"}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <DialogStack
      open={open}
      onOpenChange={handleOpenChange}
      className={showTrigger ? undefined : "contents"}
    >
      {showTrigger ? (
        presentation === "icon" ? (
          iconTrigger
        ) : (
          <DialogStackTrigger asChild>{defaultTrigger}</DialogStackTrigger>
        )
      ) : null}

      <DialogStackOverlay />

      <DialogStackBody className="max-w-2xl">
        {steps.map((step, index) => {
          const hasNext = step.showNextButton ?? index < steps.length - 1;
          const hasPrevious = index > 0;
          const showFooter = hasNext || hasPrevious;

          return (
            <DialogStackContent
              className="flex h-[640px] flex-col overflow-hidden"
              key={`${step.title}-${index}`}
            >
              <DialogStackHeader className="shrink-0">
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
                    onClick={() => handleOpenChange(false)}
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

              <div
                className={cn(
                  "min-h-0 shrink-0 flex-1 h-full overflow-y-auto overscroll-contain p-6",
                  index !== 0 && "flex items-center justify-center",
                )}
              >
                {step.content}
              </div>

              {showFooter && (
                <DialogStackFooter className="mt-auto border-t border-border flex w-full shrink-0 justify-between">
                  {hasPrevious && (
                    <DialogStackPrevious asChild>
                      <Button
                        className="w-40"
                        variant="outline"
                        onMouseEnter={() =>
                          arrowLeftIconRefs.current[index]?.startAnimation()
                        }
                        onMouseLeave={() =>
                          arrowLeftIconRefs.current[index]?.stopAnimation()
                        }
                      >
                        <ArrowLeftIcon
                          ref={(el) => {
                            arrowLeftIconRefs.current[index] = el;
                          }}
                          isAnimateOnView={false}
                          size={16}
                        />
                        Anterior
                      </Button>
                    </DialogStackPrevious>
                  )}
                  {hasNext && (
                    <DialogStackNext asChild>
                      {step.nextButton ?? (
                        <Button
                          className="w-40 ml-auto"
                          type="button"
                          onMouseEnter={() =>
                            arrowRightIconRefs.current[index]?.startAnimation()
                          }
                          onMouseLeave={() =>
                            arrowRightIconRefs.current[index]?.stopAnimation()
                          }
                        >
                          Próximo
                          <ArrowRightIcon
                            ref={(el) => {
                              arrowRightIconRefs.current[index] = el;
                            }}
                            isAnimateOnView={false}
                            size={16}
                          />
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
