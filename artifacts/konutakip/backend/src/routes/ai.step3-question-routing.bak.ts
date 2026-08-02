import { Router } from "express";
import {
  askNvidia,
  type NvidiaAttachment,
  type NvidiaRequestOptions,
} from "../services/nvidiaService.js";
import { aiRequestSchema } from "../validation/aiRequestSchema.js";
import { aiFeatureRequestSchema } from "../validation/aiFeatureRequestSchema.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import {
  buildFeaturePrompt,
  type AIFeature,
} from "../featurePrompts.js";

export const aiRouter = Router();

const AI_FEATURES: readonly AIFeature[] = [
  "generate-questions",
  "evaluate-question",
  "teach-topic",
  "explain-question",
  "analyze-mistakes",
  "practice-question",
  "coach",
  "mini-exam",
  "study-plan",
];

function isAIFeature(value: string): value is AIFeature {
  return AI_FEATURES.includes(value as AIFeature);
}

const QUESTION_GENERATION_PATTERNS = [
  /soru\s*(hazırla|oluştur|üret|yaz)/i,
  /test\s*(hazırla|oluştur|üret)/i,
  /mini\s*(sınav|deneme)/i,
  /\b\d+\s*(adet|tane)?\s*soru\b/i,
  /çoktan\s*seçmeli/i,
  /5\s*şık/i,
  /beş\s*şık/i,
  /pratik\s*soru/i,
];

function isQuestionGenerationRequest(
  feature: AIFeature,
  requestData: Record<string, unknown>,
): boolean {
  if (
    feature === "generate-questions" ||
    feature === "practice-question" ||
    feature === "mini-exam"
  ) {
    return true;
  }

  const serialized = JSON.stringify(requestData);

  return QUESTION_GENERATION_PATTERNS.some((pattern) =>
    pattern.test(serialized),
  );
}

function getNvidiaOptions(
  feature: AIFeature,
  requestData: Record<string, unknown>,
): NvidiaRequestOptions {
  if (isQuestionGenerationRequest(feature, requestData)) {
    return {
      temperature: 0.22,
      topP: 0.78,
      maxTokens: 2600,
    };
  }

  if (
    feature === "evaluate-question" ||
    feature === "explain-question"
  ) {
    return {
      temperature: 0.18,
      topP: 0.75,
      maxTokens: 2200,
    };
  }

  if (feature === "teach-topic") {
    return {
      temperature: 0.38,
      topP: 0.84,
      maxTokens: 2400,
    };
  }

  return {
    temperature: 0.5,
    topP: 0.9,
    maxTokens: 2200,
  };
}

/**
 * Eski endpoint
 * POST /api/v1/ai
 */
aiRouter.post("/", aiRateLimiter, async (request, response, next) => {
  try {
    const parsed = aiRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: "GeÃ§ersiz istek.",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const answer = await askNvidia(
      parsed.data.message,
      parsed.data.history
    );

    return response.json({
      content: answer,
      provider: "nvidia",
      model: process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b",
      usage: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Yeni endpointler
 * /api/v1/ai/teach-topic
 * /api/v1/ai/coach
 * /api/v1/ai/practice-question
 * vb.
 */
aiRouter.post("/:feature", aiRateLimiter, async (request, response, next) => {
  try {
    const feature = Array.isArray(request.params.feature)
      ? request.params.feature[0]
      : request.params.feature;

    if (!feature || !isAIFeature(feature)) {
      return response.status(404).json({
        error: "Desteklenmeyen AI Ã¶zelliÄŸi.",
        feature,
      });
    }

    const parsed = aiFeatureRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: "GeÃ§ersiz istek.",
        details: parsed.error.flatten(),
      });
    }

    const prompt = buildFeaturePrompt(feature, parsed.data);

    console.log("[ROUTE] askNvidia baÅŸladÄ±");

    const attachments =
      feature === "teach-topic" && Array.isArray(parsed.data.attachments)
        ? (parsed.data.attachments as NvidiaAttachment[])
        : [];

    const options = getNvidiaOptions(feature, parsed.data);

    const answer = await askNvidia(
      prompt,
      [],
      attachments,
      options,
    );

    console.log("[ROUTE] askNvidia bitti");

    return response.json({
      content: answer,
      provider: "nvidia",
      model: process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b",
      usage: null,
    });
  } catch (error) {
    next(error);
  }
});
