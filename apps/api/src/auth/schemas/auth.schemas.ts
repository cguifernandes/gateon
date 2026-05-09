import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Este campo é obrigatório.")
    .min(2, "Informe seu nome."),
  email: z
    .string()
    .email("Informe um e-mail válido.")
    .trim()
    .min(1, "Este campo é obrigatório."),
  password: z
    .string()
    .min(1, "Este campo é obrigatório.")
    .min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Informe um e-mail válido.")
    .trim()
    .min(1, "Este campo é obrigatório."),
  password: z
    .string()
    .min(1, "Este campo é obrigatório.")
    .min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;