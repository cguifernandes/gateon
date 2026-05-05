import { z } from "zod";

export type AuthMode = "login" | "register";

export type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

export function createAuthSchema(mode: AuthMode) {
  return z
    .object({
      name: z.string().trim().optional(),
      email: z
        .email("Informe um e-mail válido.")
        .trim()
        .min(1, "Este campo é obrigatório."),
      password: z
        .string()
        .min(1, "Este campo é obrigatório.")
        .min(8, "A senha deve ter pelo menos 8 caracteres."),
      confirmPassword: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (mode !== "register") {
        return;
      }

      if (!values.name || values.name.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Informe seu nome.",
          path: ["name"],
        });
      }

      if (!values.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "Confirme sua senha.",
          path: ["confirmPassword"],
        });
        return;
      }

      if (values.password !== values.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "As senhas não conferem.",
          path: ["confirmPassword"],
        });
      }
    });
}
