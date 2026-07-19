import { z } from "zod";

export const aiRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Mesaj boş olamaz.")
    .max(8000, "Mesaj en fazla 8000 karakter olabilir."),

  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8000)
      })
    )
    .max(20, "En fazla 20 geçmiş mesaj gönderilebilir.")
    .default([])
});

export type AIRequest = z.infer<typeof aiRequestSchema>;
