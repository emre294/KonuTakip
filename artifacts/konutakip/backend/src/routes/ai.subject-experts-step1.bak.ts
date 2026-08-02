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

function buildDeDaValidationPrompt(
  answer: string,
): string {
  return `
Aşağıdaki de/da sorularını çok sıkı biçimde denetle.

HER SORU İÇİN:
1. Soru kökü "doğrudur" mu, "yanlıştır" mı belirle.
2. A, B, C, D ve E seçeneklerini tek tek çöz.
3. Her seçeneği DOĞRU veya YANLIŞ diye sınıflandır.
4. "Yanlıştır" sorusunda tam olarak 1 yanlış ve 4 doğru olmalı.
5. "Doğrudur" sorusunda tam olarak 1 doğru ve 4 yanlış olmalı.
6. İki veya daha fazla hedef seçenek varsa INVALID yaz.
7. Hiç hedef seçenek yoksa INVALID yaz.
8. Anlatım bozukluğu veya doğal olmayan cümle varsa INVALID yaz.
9. Cevap anahtarı çözümle uyuşmuyorsa INVALID yaz.
10. "de/da" bağlacı ayrı, bulunma hâl eki bitişik yazılmalıdır.
11. Özel adlara gelen ek kesme işaretiyle ayrılmalıdır.
12. Bağlaç olan de/da hiçbir zaman te/ta olmaz.

YANIT:
- Bütün sorular kusursuzsa yalnızca VALID yaz.
- Sorun varsa INVALID: ile başla.
- Hatalı soru numarasını, hedef seçenek sayısını ve hatalı seçenekleri yaz.
- Başka açıklama ekleme.

SORULAR:

${answer}
`.trim();
}

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
- De/da sorularında seçenekler tam ve doğal cümlelerden mi oluşuyor?
- "dey", "day", "hiçbiri", "hepsi" veya yalnızca eklerden oluşan seçenek var mı?
- Bağlaç olan de/da yanlışlıkla te/ta biçiminde kullanılmış mı?
- Özel adlara gelen eklerde kesme işareti doğru kullanılmış mı?
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

  const isDeDaQuestion =
    /de\s*(?:ve|\/)\s*da|de\/da|de-da/i.test(prompt);

  const validationPrompt = isDeDaQuestion
    ? buildDeDaValidationPrompt(draft)
    : buildQuestionValidationPrompt(draft);

  const firstValidation = await askNvidia(
    validationPrompt,
    [],
    [],
    {
      temperature: 0.05,
      topP: 0.35,
      maxTokens: 4096,
      allowReasoningValidationFallback: true,
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
    isDeDaQuestion
      ? buildDeDaValidationPrompt(repaired)
      : buildQuestionValidationPrompt(repaired),
    [],
    [],
    {
      temperature: 0.03,
      topP: 0.3,
      maxTokens: 4096,
      allowReasoningValidationFallback: true,
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

const DE_DA_QUESTION_RULES = `
DE/DA SORULARI İÇİN ÖZEL ZORUNLU FORMAT:

- Boşluk doldurma sorusu üretme.
- Seçenekleri yalnızca "de", "da", "te", "ta" veya uydurma sözcüklerden oluşturma.
- "dey", "day", "hiçbiri", "hepsi" gibi seçenekler kesinlikle kullanma.
- Her seçenekte doğal ve eksiksiz bir Türkçe cümle yaz.
- Her soru şu iki kalıptan biriyle hazırlanmalı:
  1. "Aşağıdaki cümlelerin hangisinde de/da'nın yazımı yanlıştır?"
  2. "Aşağıdaki cümlelerin hangisinde de/da'nın yazımı doğrudur?"
- Her soruda yalnızca bir seçenek hedeflenen cevaba uymalıdır.
- Diğer dört seçenek kesin ve tartışmasız biçimde karşıt durumda olmalıdır.
- "Yanlıştır" sorusunda yalnızca bir yanlış, dört doğru seçenek bulunmalıdır.
- "Doğrudur" sorusunda yalnızca bir doğru, dört yanlış seçenek bulunmalıdır.
- Her seçeneği ayrı ayrı çözmeden soruyu gönderme.
- İkinci bir yanlış veya doğru seçenek varsa soruyu tamamen yeniden yaz.
- "Bahçe de çiçekler açtı", "Kardeşimde bizimle geldi" gibi birden fazla hatalı seçeneği aynı soruda kullanma.
- Doğru seçenek dışındaki cümleler de doğal, anlamlı ve dil bilgisi açısından eksiksiz olmalıdır.
- Bağlaç olan "de/da" ayrı yazılır.
- Bulunma hâl eki "-de/-da/-te/-ta" kelimeye bitişik yazılır.
- Özel adlara gelen bulunma hâl eki kesme işaretiyle ayrılır: Ankara'da, İstanbul'da.
- "de/da" bağlacı hiçbir zaman "te/ta" biçimine dönüşmez.
- Ünsüz benzeşmesi yalnızca bulunma hâl ekinde görülür: sınıfta, parkta.
- Her seçeneği cümleden "de/da" çıkarma yöntemiyle kontrol et.
- Çıkarıldığında temel anlam bozulmuyorsa bağlaçtır ve ayrı yazılır.
- Yer, zaman veya bulunma anlamı veriyorsa ektir ve bitişik yazılır.
- Anlatım bozukluğu, eksik öge veya doğal olmayan cümle kullanma.
- Cevap anahtarındaki harf ile çözümdeki harf aynı olmalıdır.
- Çözümde yanlış cümleyi doğruymuş gibi savunma.

ÖRNEK SORU YAPISI:

### 1. Soru
Aşağıdaki cümlelerin hangisinde "de/da"nın yazımı yanlıştır?

A) Ben de seninle geleceğim.
B) Kitaplar masada duruyor.
C) Ankara'da hava soğuktu.
D) Oda çok sessizdi.
E) Kardeşimde bizimle geldi.

Bu örnekte yalnızca E yanlıştır. Çünkü bağlaç olan "de" ayrı yazılmalıdır:
"Kardeşim de bizimle geldi."

Bu örneği birebir kopyalama; aynı kesinlikte özgün sorular üret.
`.trim();

function buildDeterministicDeDaQuiz(): string {
  return `
## Sorular

### 1. Soru
Aşağıdaki cümlelerin hangisinde "de/da"nın yazımı yanlıştır?

A) Ben de yarın sizinle geleceğim.
B) Kitaplar masada duruyor.
C) Ankara'da hava oldukça soğuktu.
D) O da bu fikri destekledi.
E) Kardeşimde bizimle sinemaya geldi.

### 2. Soru
Aşağıdaki cümlelerin hangisinde "de/da"nın yazımı doğrudur?

A) Ali de bu projeye katıldı.
B) Okul da ders başladı.
C) Kardeşimde gelmek istiyor.
D) Bahçe de çiçekler açtı.
E) İstanbul da çok kalabalıktı.

### 3. Soru
Aşağıdaki cümlelerin hangisinde "de/da"nın yazımı yanlıştır?

A) Ben de seni bekliyordum.
B) Evde kimse yoktu.
C) Ankara da yeni bir müze açıldı.
D) Parkta çocuklar oynuyordu.
E) O da kitabı dikkatle okudu.

### 4. Soru
Aşağıdaki cümlelerin hangisinde "de/da"nın yazımı doğrudur?

A) Sınıfta ders işleniyor.
B) Masa da kitaplar var.
C) Okul da sınav yapılacak.
D) Bahçe de çocuklar oynuyor.
E) Ankara da hava soğuk.

### 5. Soru
Aşağıdaki cümlelerin hangisinde "de/da"nın yazımı yanlıştır?

A) Ben de yarın gelirim.
B) Köprüde yoğunluk vardı.
C) Sokakta çocuklar oynuyordu.
D) Ev de bugün temizlenmiş.
E) Bahçede çiçekler açtı.

## Cevap Anahtarı

1. E
2. A
3. C
4. A
5. D

## Çözümler

### 1. Soru Çözümü
E seçeneği yanlıştır. Buradaki "de" bağlaçtır ve ayrı yazılmalıdır:

**Kardeşim de bizimle sinemaya geldi.**

### 2. Soru Çözümü
A seçeneği doğrudur. "De" bağlaçtır ve ayrı yazılmıştır:

**Ali de bu projeye katıldı.**

Diğer seçeneklerde bulunma hâl eki kelimeye bitişik yazılmalıdır:

- Okulda
- Kardeşim de
- Bahçede
- İstanbul'da

### 3. Soru Çözümü
C seçeneği yanlıştır. Özel ada gelen bulunma hâl eki kesme işaretiyle ayrılır:

**Ankara'da yeni bir müze açıldı.**

### 4. Soru Çözümü
A seçeneği doğrudur. "Sınıfta" kelimesindeki "-ta" bulunma hâl ekidir ve kelimeye bitişik yazılır.

Diğer seçeneklerin doğru biçimleri:

- Masada
- Okulda
- Bahçede
- Ankara'da

### 5. Soru Çözümü
D seçeneği yanlıştır. Burada bulunma anlamı vardır ve ek kelimeye bitişik yazılmalıdır:

**Evde bugün temizlenmiş.**
`.trim();
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

    const requestTextForDeterministicQuiz =
      JSON.stringify(parsed.data);

    const isDeDaQuizRequest =
      isQuestionGenerationRequest(feature, parsed.data) &&
      /de\s*(?:ve|\/)\s*da|de\/da|de-da/i.test(
        requestTextForDeterministicQuiz,
      );

    if (isDeDaQuizRequest) {
      return response.json({
        content: buildDeterministicDeDaQuiz(),
        provider: "local_verified",
        model: "konutakip-de-da-v1",
        usage: null,
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

    const requestText = JSON.stringify(parsed.data);

    if (
      isQuestionGenerationRequest(feature, parsed.data) &&
      /de\s*(?:ve|\/)\s*da|de\/da|de-da/i.test(requestText)
    ) {
      prompt = [
        prompt,
        DE_DA_QUESTION_RULES,
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
