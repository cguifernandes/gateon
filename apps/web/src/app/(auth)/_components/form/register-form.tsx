"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  type AuthFormValues,
  createAuthSchema,
} from "../../../../lib/zod/auth-schemas";

export function RegisterForm() {
  const {
    formState: { errors },
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

  function handleRegisterSubmit(_values: AuthFormValues) {
    // Frontend-only screen: connect this handler to the auth API when available.
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
        />

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

        <FormField
          error={errors.confirmPassword?.message}
          label="Confirmar senha"
          placeholder="Digite novamente sua senha"
          registration={register("confirmPassword")}
          type="password"
        />

        <Button type="submit">Registrar</Button>
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
