"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { notifyNavigationStart } from "@/components/navigation-progress-bar";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/lib/server/actions/login.action";
import { type AuthFormValues, createAuthSchema } from "@/lib/zod/auth-schemas";

export function LoginForm() {
  const router = useRouter();

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(createAuthSchema("login")),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleLoginSubmit(values: AuthFormValues) {
    const result = await loginAction(values);
    if (!result.ok) {
      toast.error("Não foi possível entrar.", {
        description: result.message,
      });
      return;
    }

    router.refresh();
    notifyNavigationStart();
    router.push("/dashboard");
  }

  return (
    <>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(handleLoginSubmit)}
      >
        <FormField
          error={errors.email?.message}
          label="E-mail"
          placeholder="exemplo@exemplo.com"
          registration={register("email")}
          type="email"
          autoComplete="email"
          autoCorrect="off"
        />

        <FormField
          error={errors.password?.message}
          label="Senha"
          placeholder="Digite sua senha"
          registration={register("password")}
          type="password"
          autoComplete="current-password"
        />

        <Link
          className="text-primary text-sm w-fit font-medium hover:underline"
          href="/forgot-password"
        >
          Esqueceu a senha?
        </Link>

        <Button loading={isSubmitting} disabled={isSubmitting} type="submit">
          Entrar
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          className="font-semibold text-primary hover:underline"
          href="/register"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}
