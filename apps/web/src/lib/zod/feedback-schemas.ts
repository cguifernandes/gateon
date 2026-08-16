import { z } from "zod";

export const feedbackTypeSchema = z.enum(
  ["PROBLEMA", "SUGESTAO", "ELOGIO"],
  "Selecione o tipo do feedback.",
);

export const createFeedbackSchema = z.object({
  type: feedbackTypeSchema,
  rating: z
    .number("Selecione uma nota de 1 a 5.")
    .int()
    .min(1, "Selecione uma nota de 1 a 5.")
    .max(5, "Selecione uma nota de 1 a 5."),
  message: z
    .string()
    .trim()
    .min(15, "O comentário deve ter no mínimo 15 caracteres.")
    .max(2000, "O comentário deve ter no máximo 2000 caracteres."),
  sourcePath: z.string().trim().min(1).max(200),
});

export const feedbackCreatedResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
});

export type FeedbackType = z.infer<typeof feedbackTypeSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
