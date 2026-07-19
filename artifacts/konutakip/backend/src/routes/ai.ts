import { Router } from "express";
import { askNvidia } from "../services/nvidiaService.js";
import { aiRequestSchema } from "../validation/aiRequestSchema.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

export const aiRouter = Router();

aiRouter.post("/", aiRateLimiter, async (request, response, next) => {
  try {
    const parsed = aiRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "Geçersiz istek.",
        details: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const answer = await askNvidia(
      parsed.data.message,
      parsed.data.history
    );

    response.json({
      answer
    });
  } catch (error) {
    next(error);
  }
});
