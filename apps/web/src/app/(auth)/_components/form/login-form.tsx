"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { type AuthFormValues, createAuthSchema } from "@/lib/zod/auth-schemas";

export function LoginForm() {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(createAuthSchema("login")),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function handleLoginSubmit(_values: AuthFormValues) {
    // Frontend-only screen: connect this handler to the auth API when available.
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
        />

        <FormField
          error={errors.password?.message}
          label="Senha"
          placeholder="Digite sua senha"
          registration={register("password")}
          type="password"
        />

        <Button type="submit">Entrar</Button>
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
