"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { notifyNavigationStart } from "@/components/navigation-progress-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { loginAction } from "@/lib/server/actions/login.action";
import { cn } from "@/lib/utils";
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

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Ao continuar, você concorda com nossos{" "}
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
          Entrar
        </Button>
      </form>

      <div className="flex w-full justify-center items-center flex-col gap-y-2">
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            className={cn(
              buttonVariants({ variant: "link" }),
              "w-fit h-fit p-0 text-sm",
            )}
            href="/register"
          >
            Criar conta
          </Link>
        </p>
        <Link
          className={cn(
            buttonVariants({ variant: "link" }),
            "w-fit h-fit text-center p-0 text-sm",
          )}
          href="/forgot-password"
        >
          Esqueceu a senha?
        </Link>
      </div>
    </>
  );
}
