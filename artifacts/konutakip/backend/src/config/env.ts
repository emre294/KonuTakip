import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  NVIDIA_API_KEY: z
    .string()
    .min(10, "NVIDIA_API_KEY eksik veya geçersiz."),

  NVIDIA_MODEL: z
    .string()
    .default("openai/gpt-oss-120b"),

  NVIDIA_API_URL: z
    .string()
    .url()
    .default("https://integrate.api.nvidia.com/v1/chat/completions"),

  ALLOWED_ORIGINS: z
    .string()
    .default("*")
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Ortam değişkenleri geçersiz:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
