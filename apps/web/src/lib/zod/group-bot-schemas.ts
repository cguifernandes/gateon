import { z } from "zod";

export const connectGroupBotSchema = z.object({
  groupId: z
    .string()
    .trim()
    .min(1, "Informe o ID do grupo")
    .max(64, "ID muito longo"),
});

export type ConnectGroupBotFormValues = z.infer<typeof connectGroupBotSchema>;
