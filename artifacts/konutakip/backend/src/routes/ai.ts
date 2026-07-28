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
  /\bsoru(?:su|ları|lar|luk|lik)?\b[\s\S]{0,60}\b(hazırla|oluştur|üret|yaz|sor)\b/i,
  /\b(hazırla|oluştur|üret|yaz)\b[\s\S]{0,60}\bsoru(?:su|ları|lar|luk|lik)?\b/i,
  /\b\d+\s*(?:adet|tane)?[\s\S]{0,40}\bsoru(?:su|ları|lar|luk|lik)?\b/i,
  /\btest\b[\s\S]{0,40}\b(hazırla|oluştur|üret|yaz)\b/i,
  /\bmini\s*(sınav|deneme)\b/i,
  /\bçoktan\s*seçmeli\b/i,
  /\b5\s*şık(?:lı)?\b/i,
  /\bbeş\s*şık(?:lı)?\b/i,
  /\bpratik\s*soru(?:su)?\b/i,
  /\bcevap\s*anahtarı\b/i,
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

const TEACHER_QUESTION_GENERATION_RULES = `
AI ÖĞRETMEN SORU ÜRETİM MODU:

Kullanıcı soru, test, mini sınav veya çoktan seçmeli alıştırma istiyor.

ZORUNLU KURALLAR:
- İstenen soru sayısına tam uy.
- Her soru A, B, C, D ve E olmak üzere 5 seçenekli olsun.
- Her soruda tam olarak bir doğru cevap bulunsun.
- Her soruyu göndermeden önce sessizce çöz.
- Bütün seçenekleri tek tek kontrol et.
- Birden fazla doğru seçenek varsa soruyu yeniden oluştur.
- Hiç doğru seçenek yoksa soruyu yeniden oluştur.
- Doğru cevabı soru kökünde, başlıkta veya seçenek biçiminde ele verme.
- Soru metnine çözüm, cevap veya öğretici ipucu ekleme.
- Aynı, eş anlamlı veya birbirini kapsayan seçenekler üretme.
- "Hepsi", "Hiçbiri" ve benzeri toplu seçenekleri kullanma.
- Çeldiricileri gerçek öğrenci hatalarına dayandır.
- Seçenek uzunluklarını birbirine yakın tut.
- Cevap anahtarını bütün sorulardan sonra ayrı bölümde ver.
- Çözümleri cevap anahtarından sonra ayrı bölümde ver.
- Çözüm ile cevap anahtarının aynı sonucu verdiğini doğrula.

TÜRKÇE SORULARINDA:
- Bağlaç olan "de/da" ayrı yazılır.
- Bulunma hâl eki "-de/-da/-te/-ta" bitişik yazılır.
- Bağlaç ile hâl ekini birbirine karıştırma.
- Bağlaç olan "ki" ayrı, ek olan "-ki" bitişik yazılır.
- "mi" soru edatı ayrı yazılır.
- Bütün seçenekleri kurala göre ayrı ayrı kontrol et.
- Tartışmalı veya birden fazla doğru cevap doğurabilecek örnek kullanma.

ÇIKTI DÜZENİ:
## Sorular

### 1. Soru
Soru metni

A) ...
B) ...
C) ...
D) ...
E) ...

## Cevap Anahtarı

1. X

## Çözümler

### 1. Soru Çözümü
Kısa, doğru ve adım adım çözüm.

Yalnızca okunabilir Türkçe Markdown üret.
JSON, HTML veya kod bloğu üretme.
Cevabın başında boş satır bırakma.
`.trim();

function buildQuestionValidationPrompt(
  answer: string,
): string {
  return `
Aşağıdaki çoktan seçmeli soruları bağımsız bir YKS soru denetçisi olarak kontrol et.

DENETİM KURALLARI:
- İstenen soru sayısı doğru mu?
- Her soru A, B, C, D ve E olmak üzere 5 seçenekli mi?
- Her soruda tam olarak bir doğru seçenek var mı?
- Birden fazla doğru seçenek bulunuyor mu?
- Hiç doğru seçenek bulunmayan soru var mı?
- Cevap, soru kökünde veya açıklamada sızdırılmış mı?
- Aynı veya eş anlamlı seçenekler var mı?
- Soru kökü açık ve tek anlamlı mı?
- Cevap anahtarı ile çözüm aynı sonucu veriyor mu?
- Türkçe sorularında bağlaç olan "de/da" ile bulunma hâl eki doğru ayrılmış mı?
- Yazım, noktalama veya anlatım bozukluğu var mı?
- Matematik ve fen sorularında işlem, birim, işaret veya koşul hatası var mı?

YANIT BİÇİMİ:
- Bütün sorular kusursuzsa yalnızca VALID yaz.
- En az bir sorun varsa INVALID: ile başla.
- Ardından soru numarasını ve hatayı kısa, açık biçimde yaz.
- Soruları yeniden çözerek kontrol et.
- Başka açıklama ekleme.

DENETLENECEK TASLAK:

${answer}
`.trim();
}

function buildQuestionRepairPrompt(
  originalPrompt: string,
  draft: string,
  validation: string,
): string {
  return `
${originalPrompt}

ÖNCEKİ TASLAK:

${draft}

BAĞIMSIZ DENETİM SONUCU:

${validation}

ZORUNLU DÜZELTME:
- Denetimde belirtilen bütün hataları düzelt.
- Hatalı soruları tamamen yeniden yaz.
- Her soruyu yeniden çöz.
- Her soruda tam olarak bir doğru seçenek bulunduğunu doğrula.
- Cevabı soru kökünde ele verme.
- Cevap anahtarı ve çözümleri sorulardan sonra ayrı bölümlerde ver.
- Denetim sonucunu kullanıcıya gösterme.
- Yalnızca düzeltilmiş nihai soruları üret.
`.trim();
}

async function generateVerifiedQuestionAnswer(
  prompt: string,
  attachments: NvidiaAttachment[],
  options: NvidiaRequestOptions,
): Promise<string> {
  const draft = await askNvidia(
    prompt,
    [],
    attachments,
    options,
  );

  const firstValidation = await askNvidia(
    buildQuestionValidationPrompt(draft),
    [],
    [],
    {
      temperature: 0.05,
      topP: 0.35,
      maxTokens: 4096,
    },
  );

  if (firstValidation.trim().toUpperCase() === "VALID") {
    return draft;
  }

  const repaired = await askNvidia(
    buildQuestionRepairPrompt(
      prompt,
      draft,
      firstValidation,
    ),
    [],
    attachments,
    {
      temperature: 0.12,
      topP: 0.65,
      maxTokens: Math.max(options.maxTokens ?? 4096, 4096),
    },
  );

  const secondValidation = await askNvidia(
    buildQuestionValidationPrompt(repaired),
    [],
    [],
    {
      temperature: 0.03,
      topP: 0.3,
      maxTokens: 4096,
    },
  );

  if (secondValidation.trim().toUpperCase() === "VALID") {
    return repaired;
  }

  const finalRepair = await askNvidia(
    buildQuestionRepairPrompt(
      prompt,
      repaired,
      secondValidation,
    ),
    [],
    attachments,
    {
      temperature: 0.08,
      topP: 0.55,
      maxTokens: Math.max(options.maxTokens ?? 4096, 4096),
    },
  );

  return finalRepair;
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

    let prompt = buildFeaturePrompt(feature, parsed.data);

    if (
      feature === "teach-topic" &&
      isQuestionGenerationRequest(feature, parsed.data)
    ) {
      prompt = [
        prompt,
        TEACHER_QUESTION_GENERATION_RULES,
      ].join("\n\n");
    }

    console.log("[ROUTE] askNvidia baÅŸladÄ±");

    const attachments =
      feature === "teach-topic" && Array.isArray(parsed.data.attachments)
        ? (parsed.data.attachments as NvidiaAttachment[])
        : [];

    const options = getNvidiaOptions(feature, parsed.data);

    const answer = isQuestionGenerationRequest(
      feature,
      parsed.data,
    )
      ? await generateVerifiedQuestionAnswer(
          prompt,
          attachments,
          options,
        )
      : await askNvidia(
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
