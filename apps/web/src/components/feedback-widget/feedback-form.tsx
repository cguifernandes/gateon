"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { useController, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "@/lib/server/actions/submit-feedback.action";
import {
  type CreateFeedbackInput,
  createFeedbackSchema,
} from "@/lib/zod/feedback-schemas";
import { Label } from "../ui/label";
import { FeedbackRatingSelector } from "./feedback-rating-selector";
import { FeedbackTypeSelector } from "./feedback-type-selector";
import { useCurrentScreenLabel } from "./use-current-screen-label";

type FeedbackFormProps = {
  onSuccess: () => void;
};

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [isPending, startTransition] = useTransition();
  const { path, label } = useCurrentScreenLabel();

  const form = useForm<CreateFeedbackInput>({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: {
      message: "",
      sourcePath: path,
    },
  });

  useEffect(() => {
    form.setValue("sourcePath", path);
  }, [path, form]);

  const type = useController({ control: form.control, name: "type" });
  const rating = useController({ control: form.control, name: "rating" });
  const message = useController({ control: form.control, name: "message" });

  function onSubmit(values: CreateFeedbackInput) {
    startTransition(async () => {
      const result = await submitFeedbackAction(values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Feedback enviado, obrigado!", {
        description: "Sua opinião nos ajuda a melhorar o Gateon.",
      });
      form.reset({ message: "", sourcePath: path });
      onSuccess();
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <PopoverHeader>
        <PopoverTitle>Enviar feedback</PopoverTitle>
        <PopoverDescription>
          Conte o que está funcionando e o que atrapalha.
        </PopoverDescription>
      </PopoverHeader>

      <div className="space-y-1.5">
        <FeedbackTypeSelector
          value={type.field.value ?? null}
          onChange={type.field.onChange}
        />
        {type.fieldState.error ? (
          <p className="text-destructive text-xs">
            {type.fieldState.error.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <FeedbackRatingSelector
          value={rating.field.value ?? null}
          onChange={rating.field.onChange}
        />
        {rating.fieldState.error ? (
          <p className="text-destructive text-xs">
            {rating.fieldState.error.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Comentário</Label>
        <Textarea
          value={message.field.value}
          onChange={message.field.onChange}
          onBlur={message.field.onBlur}
          placeholder="Ex.: a lista de membros demora para filtrar por grupo."
          rows={3}
          aria-invalid={!!message.fieldState.error}
        />
        {message.fieldState.error ? (
          <p className="text-destructive text-xs">
            {message.fieldState.error.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending} loading={isPending}>
        Enviar feedback
      </Button>
    </form>
  );
}
