import {
  type AlertReviewField,
  AlertReviewSummary,
  formatReviewBoolean,
  formatReviewValue,
} from "@/components/alert-review-summary";
import type { QuickAlertOption } from "@/lib/quick-alerts";
import { cn } from "@/lib/utils";

type QuickAlertSelectedDetailsProps = {
  alert: QuickAlertOption;
  className?: string;
};

function buildInlineButtonsSummary(
  inlineButtons: QuickAlertOption["content"]["inlineButtons"],
): string | undefined {
  if (!inlineButtons?.length) return undefined;

  return (
    inlineButtons
      .map((button, index) => {
        const text = button.text?.trim();
        if (!text) return null;
        return `${index + 1}. ${text}`;
      })
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

function buildQuickAlertReviewFields(
  alert: QuickAlertOption,
): AlertReviewField[] {
  const { title, body, imageUrl, inlineButtons } = alert.content;
  const { silent, pinMessage, mentionUsers } = alert.options;

  return [
    {
      label: "Nome interno",
      value: formatReviewValue(alert.name),
      lineClamp: 2,
    },
    { label: "Título da mensagem", value: formatReviewValue(title) },
    {
      label: "Mensagem",
      value: formatReviewValue(body),
      lineClamp: 3,
    },
    {
      label: "URL da imagem",
      value: formatReviewValue(imageUrl),
      lineClamp: 2,
    },
    { label: "Destino", value: "Aviso Rápido" },
    {
      label: "Uso",
      value: "Modelo reutilizável nas tabelas de membros e grupos",
    },
    {
      label: "Tipo de envio",
      value: "Modelo — envio nas tabelas de membros ou grupos",
    },
    {
      label: "Botões inline",
      value: formatReviewValue(buildInlineButtonsSummary(inlineButtons)),
      lineClamp: 2,
    },
    {
      label: "Envio silencioso",
      value: formatReviewBoolean(silent),
    },
    { label: "Fixar mensagem", value: formatReviewBoolean(pinMessage) },
    {
      label: "Mencionar usuários",
      value: formatReviewBoolean(mentionUsers),
    },
  ];
}

export function QuickAlertSelectedDetails({
  alert,
  className,
}: QuickAlertSelectedDetailsProps) {
  return (
    <AlertReviewSummary
      className={cn(className)}
      fields={buildQuickAlertReviewFields(alert)}
    />
  );
}
