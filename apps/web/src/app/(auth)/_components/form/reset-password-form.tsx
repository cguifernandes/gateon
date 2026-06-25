"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { confirmPasswordResetAction } from "@/lib/server/confirm-password-reset.action";
import { cn } from "@/lib/utils";
import {
  type PasswordResetConfirmValues,
  passwordResetConfirmSchema,
} from "@/lib/zod/auth-schemas";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordResetConfirmValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordResetConfirmValues) {
    const result = await confirmPasswordResetAction(values);
    if (!result.ok) {
      toast.error("Não foi possível redefinir a senha.", {
        description: result.message,
      });
      return;
    }

    toast.success("Senha redefinida", {
      description: "Entre novamente com sua nova senha.",
    });
    router.push("/login");
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive text-sm">
          Link de redefinição inválido. Solicite um novo e-mail na página de
          recuperação.
        </p>
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          href="/forgot-password"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("token")} />

        <FormField
          error={errors.password?.message}
          label="Nova senha"
          placeholder="Mínimo de 8 caracteres"
          registration={register("password")}
          type="password"
          autoComplete="new-password"
        />

        <FormField
          error={errors.confirmPassword?.message}
          label="Confirmar nova senha"
          placeholder="Repita a nova senha"
          registration={register("confirmPassword")}
          type="password"
          autoComplete="new-password"
        />

        <Button loading={isSubmitting} disabled={isSubmitting} type="submit">
          Redefinir senha
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link
          className="font-semibold text-primary hover:underline"
          href="/login"
        >
          Voltar
        </Link>
      </p>
    </>
  );
}
