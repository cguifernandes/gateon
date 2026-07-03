"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { notifyNavigationStart } from "@/components/navigation-progress-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { registerAction } from "@/lib/server/actions/register.action";
import { cn } from "@/lib/utils";
import { type AuthFormValues, createAuthSchema } from "@/lib/zod/auth-schemas";

export function RegisterForm() {
  const router = useRouter();

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(createAuthSchema("register")),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleRegisterSubmit(values: AuthFormValues) {
    const result = await registerAction(values);
    if (!result.ok) {
      toast.error("Erro ao registrar usuário.", {
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
        onSubmit={handleSubmit(handleRegisterSubmit)}
      >
        <FormField
          error={errors.name?.message}
          label="Nome"
          placeholder="Seu nome"
          registration={register("name")}
          autoComplete="name"
        />

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
          autoComplete="new-password"
        />

        <FormField
          error={errors.confirmPassword?.message}
          label="Confirmar senha"
          placeholder="Digite novamente sua senha"
          registration={register("confirmPassword")}
          type="password"
          autoComplete="new-password"
        />

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Ao criar sua conta, você concorda com nossos{" "}
          <Link
            className={cn(
              buttonVariants({ variant: "link" }),
              "w-fit h-fit p-0 text-xs",
            )}
            href="/terms"
            target="_blank"
          >
            Termos de Serviço
          </Link>{" "}
          e{" "}
          <Link
            className={cn(
              buttonVariants({ variant: "link" }),
              "w-fit h-fit p-0 text-xs",
            )}
            href="/privacy"
            target="_blank"
          >
            Política de Privacidade
          </Link>
          , conforme a Lei Geral de Proteção de Dados (LGPD).
        </p>

        <Button loading={isSubmitting} disabled={isSubmitting} type="submit">
          Registrar
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link
          className="font-semibold text-primary hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
