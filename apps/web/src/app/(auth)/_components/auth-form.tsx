"use client";

import { GoogleLoginButton } from "@/components/google-login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthMode } from "@/lib/zod/auth-schemas";
import { LoginForm } from "./form/login-form";
import { RegisterForm } from "./form/register-form";

type AuthFormProps = {
  title: string;
  description: string;
  mode: AuthMode;
};

export function AuthForm({ title, description, mode }: AuthFormProps) {
  return (
    <Card className="w-full rounded-3xl border-border bg-card py-0 shadow-xl shadow-primary/10 ring-0">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <GoogleLoginButton />
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {mode === "login" ? <LoginForm /> : <RegisterForm />}
      </CardContent>
    </Card>
  );
}
