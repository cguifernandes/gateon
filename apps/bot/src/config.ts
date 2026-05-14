import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1, "TELEGRAM_BOT_TOKEN must be set to a non-empty value")
    .transform((value) => value.trim()),
  GATEON_API_BASE_URL: z
    .url("GATEON_API_BASE_URL must be a valid URL")
    .default("http://localhost:4000")
    .transform((value) => value.trim().replace(/\/+$/, "")),
  TELEGRAM_BOT_INTERNAL_SECRET: z
    .string()
    .min(32, "TELEGRAM_BOT_INTERNAL_SECRET must be at least 32 characters")
    .transform((value) => value.trim()),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
