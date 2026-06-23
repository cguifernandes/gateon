"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  type MutableRefObject,
  type ReactElement,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  type ArrowLeftIconHandle,
} from "@/components/icons/arrow-left";
import {
  ArrowRightIcon,
  type ArrowRightIconHandle,
} from "@/components/icons/arrow-right";
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
  useDialogStackNavigation,
} from "@/components/kibo-ui/dialog-stack";
import { SelectableOptionCard } from "@/components/selectable-option-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getIntegrationProvider,
  INTEGRATION_PROVIDERS,
} from "@/lib/integrations-config";
import type { GatewayId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  type StripeBillingConnectInput,
  type StripeBillingStatusDto,
  type StripeCatalogPriceDto,
  stripeBillingCatalogSchema,
  stripeBillingConnectSchema,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";
import type { StripePaymentGroupLimit } from "@/lib/zod/stripe-payment-group-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { StripeApiKeyStep } from "./stripe-api-key-step";
import { StripeConsentStep } from "./stripe-consent-step";
import { StripeGroupSelectStep } from "./stripe-group-select-step";
import { StripePriceSelectStep } from "./stripe-price-select-step";
import { StripeWebhookGuideStep } from "./stripe-webhook-guide-step";

type ConnectIntegrationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedPriceIds?: string[];
  onStripeConnected: (status: StripeBillingStatusDto) => void;
  stripePaymentGroupLimit: StripePaymentGroupLimit;
  groups: TelegramGroupSummaryDto[];
  existingConnections: Array<{
    id: string;
    telegramGroupId: string | null;
  }>;
};

type WizardStep = {
  title: string;
  description: string;
  content: ReactElement;
  showNextButton?: boolean;
  nextButton?: ReactElement;
  showPreviousButton?: boolean;
  footer?: ReactElement;
};

const dialogProgressSteps = [
  { id: "gateway", label: "Gateway" },
  { id: "api-key", label: "Chave API" },
  { id: "plan", label: "Plano" },
  { id: "group", label: "Grupo" },
  { id: "webhook", label: "Webhook" },
  { id: "confirm", label: "Confirmar" },
] as const;

function getErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

type GatewaySelectStepProps = {
  selectedGatewayId: GatewayId | null;
  onSelectGateway: (gatewayId: GatewayId) => void;
};

function GatewaySelectStep({
  selectedGatewayId,
  onSelectGateway,
}: GatewaySelectStepProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATION_PROVIDERS.map((provider, index) => {
          const isAvailable = provider.status === "available";
          const isLastOddItem =
            INTEGRATION_PROVIDERS.length % 2 !== 0 &&
            index === INTEGRATION_PROVIDERS.length - 1;

          return (
            <SelectableOptionCard
              key={provider.id}
              title={provider.name}
              description={provider.description}
              isSelected={selectedGatewayId === provider.id}
              disabled={!isAvailable}
              hideAction={!isAvailable}
              mediaVariant="logo"
              media={
                <Image
                  src={provider.logo}
                  alt={provider.name}
                  className="max-h-7 w-auto object-contain"
                />
              }
              headerAction={
                <Badge variant={isAvailable ? "default" : "outline"}>
                  {isAvailable ? "Disponível" : "Em breve"}
                </Badge>
              }
              onSelect={() => onSelectGateway(provider.id)}
              className={cn(isLastOddItem && "sm:col-span-2")}
            />
          );
        })}
      </div>
    </div>
  );
}

type CatalogNextButtonProps = {
  form: ReturnType<typeof useForm<StripeBillingConnectInput>>;
  arrowRightIconRefs: MutableRefObject<(ArrowRightIconHandle | null)[]>;
  iconIndex: number;
  onCatalogLoaded: (prices: StripeCatalogPriceDto[]) => void;
  onCatalogError: (message: string | null) => void;
  onCatalogLoadingChange: (loading: boolean) => void;
};

function CatalogNextButton({
  form,
  arrowRightIconRefs,
  iconIndex,
  onCatalogLoaded,
  onCatalogError,
  onCatalogLoadingChange,
}: CatalogNextButtonProps) {
  const { goNext } = useDialogStackNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    const isValid = await form.trigger("apiKey");
    if (!isValid) return;

    setIsLoading(true);
    onCatalogLoadingChange(true);
    onCatalogError(null);

    try {
      const response = await fetch("/api/stripe-billing/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: form.getValues("apiKey") }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Não foi possível listar os planos da Stripe."),
        );
      }

      const parsed = stripeBillingCatalogSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("A resposta da API veio em formato inválido.");
      }

      form.setValue("stripePriceId", "", { shouldValidate: false });
      onCatalogLoaded(parsed.data.prices);
      goNext();
    } catch (error) {
      onCatalogError(
        error instanceof Error
          ? error.message
          : "Não foi possível listar os planos da Stripe.",
      );
    } finally {
      setIsLoading(false);
      onCatalogLoadingChange(false);
    }
  }

  return (
    <Button
      className="ml-auto w-40"
      type="button"
      loading={isLoading}
      onClick={handleClick}
      onMouseEnter={() =>
        arrowRightIconRefs.current[iconIndex]?.startAnimation()
      }
      onMouseLeave={() =>
        arrowRightIconRefs.current[iconIndex]?.stopAnimation()
      }
    >
      Próximo
      <ArrowRightIcon
        ref={(element) => {
          arrowRightIconRefs.current[iconIndex] = element;
        }}
        isAnimateOnView={false}
        size={16}
      />
    </Button>
  );
}

type PlanNextButtonProps = {
  disabled: boolean;
  arrowRightIconRefs: MutableRefObject<(ArrowRightIconHandle | null)[]>;
  iconIndex: number;
};

function PlanNextButton({
  disabled,
  arrowRightIconRefs,
  iconIndex,
}: PlanNextButtonProps) {
  const { goNext } = useDialogStackNavigation();

  return (
    <Button
      className="ml-auto w-40"
      type="button"
      disabled={disabled}
      onClick={goNext}
      onMouseEnter={() =>
        arrowRightIconRefs.current[iconIndex]?.startAnimation()
      }
      onMouseLeave={() =>
        arrowRightIconRefs.current[iconIndex]?.stopAnimation()
      }
    >
      Próximo
      <ArrowRightIcon
        ref={(element) => {
          arrowRightIconRefs.current[iconIndex] = element;
        }}
        isAnimateOnView={false}
        size={16}
      />
    </Button>
  );
}

export function ConnectIntegrationDialog({
  open,
  onOpenChange,
  connectedPriceIds = [],
  onStripeConnected,
  stripePaymentGroupLimit,
  groups,
  existingConnections,
}: ConnectIntegrationDialogProps) {
  const [wizardKey, setWizardKey] = useState(0);
  const [selectedGatewayId, setSelectedGatewayId] = useState<GatewayId | null>(
    null,
  );
  const [catalogPrices, setCatalogPrices] = useState<StripeCatalogPriceDto[]>(
    [],
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] =
    useState<TelegramGroupSummaryDto | null>(null);
  const formId = useId();
  const apiKeyInputId = useId();
  const consentCheckboxId = useId();
  const xIconRefs = useRef<(XIconHandle | null)[]>([]);
  const arrowLeftIconRefs = useRef<(ArrowLeftIconHandle | null)[]>([]);
  const arrowRightIconRefs = useRef<(ArrowRightIconHandle | null)[]>([]);

  const form = useForm<StripeBillingConnectInput>({
    resolver: zodResolver(stripeBillingConnectSchema),
    defaultValues: {
      apiKey: "",
      stripePriceId: "",
      telegramGroupId: "",
      consentAccepted: false as unknown as true,
    },
  });
  const { reset: resetForm } = form;
  const selectedPriceId = form.watch("stripePriceId");
  const selectedGroupId = form.watch("telegramGroupId");
  const selectedPrice = catalogPrices.find(
    (price) => price.id === selectedPriceId,
  );

  const selectedProvider = selectedGatewayId
    ? getIntegrationProvider(selectedGatewayId)
    : null;
  const canProceedFromGatewayStep =
    selectedProvider?.status === "available" && selectedGatewayId === "stripe";
  const canProceedFromPlanStep = Boolean(
    selectedPriceId && !connectedPriceIds.includes(selectedPriceId),
  );
  const canProceedFromGroupStep = Boolean(selectedGroupId);

  const resetWizard = useCallback(() => {
    setSelectedGatewayId(null);
    setCatalogPrices([]);
    setCatalogError(null);
    setIsLoadingCatalog(false);
    setSelectedGroup(null);
    resetForm({
      apiKey: "",
      stripePriceId: "",
      telegramGroupId: "",
      consentAccepted: false as unknown as true,
    });
  }, [resetForm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen && open) {
        resetWizard();
        setWizardKey((current) => current + 1);
      }
    },
    [onOpenChange, open, resetWizard],
  );

  const onSubmit = useCallback(
    async (values: StripeBillingConnectInput) => {
      try {
        const response = await fetch("/api/stripe-billing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            getErrorMessage(body, "Não foi possível conectar a integração."),
          );
        }
        const parsed = stripeBillingStatusSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("A resposta da API veio em formato inválido.");
        }
        onStripeConnected(parsed.data);
        handleOpenChange(false);
        toast.success("Integração conectada", {
          description:
            "Sincronização inicial concluída. Configure o webhook no card da Stripe para alertas em tempo real.",
          duration: 8000,
        });
      } catch (error) {
        toast.error("Falha ao conectar integração", {
          description:
            error instanceof Error
              ? error.message
              : "Verifique a chave e tente novamente.",
        });
      }
    },
    [handleOpenChange, onStripeConnected],
  );

  const steps: WizardStep[] = [
    {
      title: "Escolher gateway",
      description:
        "Defina qual provedor enviará o status das assinaturas para o Gateon.",
      content: (
        <GatewaySelectStep
          selectedGatewayId={selectedGatewayId}
          onSelectGateway={setSelectedGatewayId}
        />
      ),
      showPreviousButton: false,
      nextButton: (
        <Button
          className="ml-auto w-40"
          type="button"
          disabled={!canProceedFromGatewayStep}
          onMouseEnter={() => arrowRightIconRefs.current[0]?.startAnimation()}
          onMouseLeave={() => arrowRightIconRefs.current[0]?.stopAnimation()}
        >
          Próximo
          <ArrowRightIcon
            ref={(element) => {
              arrowRightIconRefs.current[0] = element;
            }}
            isAnimateOnView={false}
            size={16}
          />
        </Button>
      ),
    },
    {
      title: `Conectar ${selectedProvider?.name ?? "gateway"}`,
      description: "Cole a chave secreta da sua conta Stripe.",
      content: <StripeApiKeyStep form={form} apiKeyInputId={apiKeyInputId} />,
      showPreviousButton: true,
      nextButton: (
        <CatalogNextButton
          form={form}
          arrowRightIconRefs={arrowRightIconRefs}
          iconIndex={1}
          onCatalogLoaded={setCatalogPrices}
          onCatalogError={setCatalogError}
          onCatalogLoadingChange={setIsLoadingCatalog}
        />
      ),
    },
    {
      title: "Escolher plano",
      description:
        "Escolha o preço recorrente ligado ao seu grupo pago. Só assinaturas desse plano entram na sincronização, nas métricas e nas automações.",
      content: (
        <StripePriceSelectStep
          prices={catalogPrices}
          selectedPriceId={selectedPriceId || null}
          connectedPriceIds={connectedPriceIds}
          onSelectPrice={(priceId) =>
            form.setValue("stripePriceId", priceId, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          isLoading={isLoadingCatalog}
          errorMessage={catalogError}
        />
      ),
      showPreviousButton: true,
      nextButton: (
        <PlanNextButton
          disabled={!canProceedFromPlanStep}
          arrowRightIconRefs={arrowRightIconRefs}
          iconIndex={2}
        />
      ),
    },
    {
      title: "Vincular grupo",
      description:
        "Defina para qual grupo do Telegram os assinantes deste plano serão enviados após o pagamento.",
      content: (
        <StripeGroupSelectStep
          groups={groups}
          selectedGroupId={selectedGroupId || null}
          onSelectGroup={(group) => {
            form.setValue("telegramGroupId", group.id, {
              shouldDirty: true,
              shouldValidate: true,
            });
            setSelectedGroup(group);
          }}
          stripePaymentGroupLimit={stripePaymentGroupLimit}
          existingConnections={existingConnections}
        />
      ),
      showPreviousButton: true,
      nextButton: (
        <PlanNextButton
          disabled={!canProceedFromGroupStep}
          arrowRightIconRefs={arrowRightIconRefs}
          iconIndex={3}
        />
      ),
    },
    {
      title: "Webhook para alertas em tempo real",
      description:
        "Entenda por que o webhook é necessário e como configurá-lo após conectar.",
      content: <StripeWebhookGuideStep />,
      showPreviousButton: true,
      nextButton: (
        <PlanNextButton
          disabled={false}
          arrowRightIconRefs={arrowRightIconRefs}
          iconIndex={4}
        />
      ),
    },
    {
      title: "Confirmar integração",
      description:
        "Confira o plano monitorado, o grupo vinculado, aceite o consentimento de uso dos dados e conclua a conexão.",
      content: (
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <StripeConsentStep
            form={form}
            consentCheckboxId={consentCheckboxId}
            selectedPrice={selectedPrice ?? null}
            selectedGroup={selectedGroup}
            gatewayName={selectedProvider?.name}
          />
        </form>
      ),
      showNextButton: false,
      showPreviousButton: true,
      footer: (
        <>
          <DialogStackPrevious asChild>
            <Button
              className="w-40"
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onMouseEnter={() =>
                arrowLeftIconRefs.current[5]?.startAnimation()
              }
              onMouseLeave={() => arrowLeftIconRefs.current[5]?.stopAnimation()}
            >
              <ArrowLeftIcon
                ref={(element) => {
                  arrowLeftIconRefs.current[5] = element;
                }}
                isAnimateOnView={false}
                size={16}
              />
              Anterior
            </Button>
          </DialogStackPrevious>
          <Button
            className="ml-auto w-40"
            type="submit"
            form={formId}
            loading={form.formState.isSubmitting}
          >
            Conectar
          </Button>
        </>
      ),
    },
  ];

  return (
    <DialogStack key={wizardKey} open={open} onOpenChange={handleOpenChange}>
      <DialogStackOverlay />

      <DialogStackBody className="max-w-2xl">
        {steps.map((step, index) => {
          const hasNext = step.showNextButton ?? index < steps.length - 1;
          const hasPrevious = step.showPreviousButton ?? index > 0;
          const showFooter = hasNext || hasPrevious || step.footer;

          return (
            <DialogStackContent
              key={`${step.title}-${index}`}
              className="flex h-[640px] flex-col overflow-hidden"
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
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleOpenChange(false)}
                    onMouseEnter={() =>
                      xIconRefs.current[index]?.startAnimation()
                    }
                  >
                    <XIcon
                      ref={(element) => {
                        xIconRefs.current[index] = element;
                      }}
                      size={16}
                    />
                  </Button>
                </div>
                <DialogStackProgress steps={[...dialogProgressSteps]} />
              </DialogStackHeader>

              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto overscroll-contain p-6",
                )}
              >
                {step.content}
              </div>

              {showFooter ? (
                <DialogStackFooter className="mt-auto flex w-full shrink-0 justify-between border-t border-border">
                  {step.footer ?? (
                    <>
                      {hasPrevious ? (
                        <DialogStackPrevious asChild>
                          <Button
                            className="w-40"
                            type="button"
                            variant="outline"
                            onMouseEnter={() =>
                              arrowLeftIconRefs.current[index]?.startAnimation()
                            }
                            onMouseLeave={() =>
                              arrowLeftIconRefs.current[index]?.stopAnimation()
                            }
                          >
                            <ArrowLeftIcon
                              ref={(element) => {
                                arrowLeftIconRefs.current[index] = element;
                              }}
                              isAnimateOnView={false}
                              size={16}
                            />
                            Anterior
                          </Button>
                        </DialogStackPrevious>
                      ) : (
                        <span />
                      )}
                      {hasNext ? (
                        <DialogStackNext asChild>
                          {step.nextButton ?? (
                            <Button
                              className="ml-auto w-40"
                              type="button"
                              onMouseEnter={() =>
                                arrowRightIconRefs.current[
                                  index
                                ]?.startAnimation()
                              }
                              onMouseLeave={() =>
                                arrowRightIconRefs.current[
                                  index
                                ]?.stopAnimation()
                              }
                            >
                              Próximo
                              <ArrowRightIcon
                                ref={(element) => {
                                  arrowRightIconRefs.current[index] = element;
                                }}
                                isAnimateOnView={false}
                                size={16}
                              />
                            </Button>
                          )}
                        </DialogStackNext>
                      ) : null}
                    </>
                  )}
                </DialogStackFooter>
              ) : null}
            </DialogStackContent>
          );
        })}
      </DialogStackBody>
    </DialogStack>
  );
}
