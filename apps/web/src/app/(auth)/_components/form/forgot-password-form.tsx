"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/lib/server/request-password-reset.action";
import {
  type PasswordResetRequestValues,
  passwordResetRequestSchema,
} from "@/lib/zod/auth-schemas";

export function ForgotPasswordForm() {
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: PasswordResetRequestValues) {
    const result = await requestPasswordResetAction(values);
    if (!result.ok) {
      toast.error("Não foi possível enviar o e-mail.", {
        description: result.message,
      });
      return;
    }

    reset({ email: values.email });
    setSubmittedMessage(result.message);
    toast.success("Solicitação enviada", {
      description: result.message,
    });
  }

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          error={errors.email?.message}
          label="E-mail"
          placeholder="exemplo@exemplo.com"
          registration={register("email")}
          type="email"
          autoComplete="email"
          autoCorrect="off"
          disabled={Boolean(submittedMessage)}
        />

        {submittedMessage ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-muted-foreground text-sm leading-relaxed">
            {submittedMessage}
          </p>
        ) : null}

        <Button
          loading={isSubmitting}
          disabled={isSubmitting || Boolean(submittedMessage)}
          type="submit"
        >
          Enviar link de redefinição
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link
          className="font-semibold text-primary hover:underline"
          href="/login"
        >
          Login
        </Link>
      </p>
    </>
  );
}
