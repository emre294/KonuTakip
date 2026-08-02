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
  /\bsoru(?:su|larÄ±|lar|luk|lik)?\b[\s\S]{0,60}\b(hazÄ±rla|oluÅŸtur|Ã¼ret|yaz|sor)\b/i,
  /\b(hazÄ±rla|oluÅŸtur|Ã¼ret|yaz)\b[\s\S]{0,60}\bsoru(?:su|larÄ±|lar|luk|lik)?\b/i,
  /\b\d+\s*(?:adet|tane)?[\s\S]{0,40}\bsoru(?:su|larÄ±|lar|luk|lik)?\b/i,
  /\btest\b[\s\S]{0,40}\b(hazÄ±rla|oluÅŸtur|Ã¼ret|yaz)\b/i,
  /\bmini\s*(sÄ±nav|deneme)\b/i,
  /\bÃ§oktan\s*seÃ§meli\b/i,
  /\b5\s*ÅŸÄ±k(?:lÄ±)?\b/i,
  /\bbeÅŸ\s*ÅŸÄ±k(?:lÄ±)?\b/i,
  /\bpratik\s*soru(?:su)?\b/i,
  /\bcevap\s*anahtarÄ±\b/i,
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

  const currentUserMessage = String(
    requestData.lastUserMessage ??
    requestData.message ??
    requestData.prompt ??
    requestData.userQuestion ??
    "",
  ).trim();

  if (!currentUserMessage) {
    return false;
  }

  return QUESTION_GENERATION_PATTERNS.some(
    (pattern) =>
      pattern.test(currentUserMessage),
  );
}

const TEACHER_QUESTION_GENERATION_RULES = `
AI Ã–ÄžRETMEN SORU ÃœRETÄ°M MODU:

KullanÄ±cÄ± soru, test, mini sÄ±nav veya Ã§oktan seÃ§meli alÄ±ÅŸtÄ±rma istiyor.

ZORUNLU KURALLAR:
- Ä°stenen soru sayÄ±sÄ±na tam uy.
- Her soru A, B, C, D ve E olmak Ã¼zere 5 seÃ§enekli olsun.
- Her soruda tam olarak bir doÄŸru cevap bulunsun.
- Her soruyu gÃ¶ndermeden Ã¶nce sessizce Ã§Ã¶z.
- BÃ¼tÃ¼n seÃ§enekleri tek tek kontrol et.
- Birden fazla doÄŸru seÃ§enek varsa soruyu yeniden oluÅŸtur.
- HiÃ§ doÄŸru seÃ§enek yoksa soruyu yeniden oluÅŸtur.
- DoÄŸru cevabÄ± soru kÃ¶kÃ¼nde, baÅŸlÄ±kta veya seÃ§enek biÃ§iminde ele verme.
- Soru metnine Ã§Ã¶zÃ¼m, cevap veya Ã¶ÄŸretici ipucu ekleme.
- AynÄ±, eÅŸ anlamlÄ± veya birbirini kapsayan seÃ§enekler Ã¼retme.
- "Hepsi", "HiÃ§biri" ve benzeri toplu seÃ§enekleri kullanma.
- Ã‡eldiricileri gerÃ§ek Ã¶ÄŸrenci hatalarÄ±na dayandÄ±r.
- SeÃ§enek uzunluklarÄ±nÄ± birbirine yakÄ±n tut.
- Cevap anahtarÄ±nÄ± bÃ¼tÃ¼n sorulardan sonra ayrÄ± bÃ¶lÃ¼mde ver.
- Ã‡Ã¶zÃ¼mleri cevap anahtarÄ±ndan sonra ayrÄ± bÃ¶lÃ¼mde ver.
- Ã‡Ã¶zÃ¼m ile cevap anahtarÄ±nÄ±n aynÄ± sonucu verdiÄŸini doÄŸrula.
- Her Ã§Ã¶zÃ¼mÃ¼n son satÄ±rÄ±nda "**DoÄŸru cevap: X**" yaz.
- X yerine cevap anahtarÄ±ndaki gerÃ§ek A-E harfini kullan.
- Cevap harfini yazmadan Ã§Ã¶zÃ¼mÃ¼ bitirme.

TÃœRKÃ‡E SORULARINDA:
- BaÄŸlaÃ§ olan "de/da" ayrÄ± yazÄ±lÄ±r.
- Bulunma hÃ¢l eki "-de/-da/-te/-ta" bitiÅŸik yazÄ±lÄ±r.
- BaÄŸlaÃ§ ile hÃ¢l ekini birbirine karÄ±ÅŸtÄ±rma.
- BaÄŸlaÃ§ olan "ki" ayrÄ±, ek olan "-ki" bitiÅŸik yazÄ±lÄ±r.
- "mi" soru edatÄ± ayrÄ± yazÄ±lÄ±r.
- BÃ¼tÃ¼n seÃ§enekleri kurala gÃ¶re ayrÄ± ayrÄ± kontrol et.
- TartÄ±ÅŸmalÄ± veya birden fazla doÄŸru cevap doÄŸurabilecek Ã¶rnek kullanma.

Ã‡IKTI DÃœZENÄ°:
## Sorular

### 1. Soru
Soru metni

A) ...
B) ...
C) ...
D) ...
E) ...

## Cevap AnahtarÄ±

1. X

## Ã‡Ã¶zÃ¼mler

### 1. Soru Ã‡Ã¶zÃ¼mÃ¼
KÄ±sa, doÄŸru ve adÄ±m adÄ±m Ã§Ã¶zÃ¼m.

YalnÄ±zca okunabilir TÃ¼rkÃ§e Markdown Ã¼ret.
JSON, HTML veya kod bloÄŸu Ã¼retme.
CevabÄ±n baÅŸÄ±nda boÅŸ satÄ±r bÄ±rakma.
`.trim();

function buildDeDaValidationPrompt(
  answer: string,
): string {
  return `
AÅŸaÄŸÄ±daki de/da sorularÄ±nÄ± Ã§ok sÄ±kÄ± biÃ§imde denetle.

HER SORU Ä°Ã‡Ä°N:
1. Soru kÃ¶kÃ¼ "doÄŸrudur" mu, "yanlÄ±ÅŸtÄ±r" mÄ± belirle.
2. A, B, C, D ve E seÃ§eneklerini tek tek Ã§Ã¶z.
3. Her seÃ§eneÄŸi DOÄžRU veya YANLIÅž diye sÄ±nÄ±flandÄ±r.
4. "YanlÄ±ÅŸtÄ±r" sorusunda tam olarak 1 yanlÄ±ÅŸ ve 4 doÄŸru olmalÄ±.
5. "DoÄŸrudur" sorusunda tam olarak 1 doÄŸru ve 4 yanlÄ±ÅŸ olmalÄ±.
6. Ä°ki veya daha fazla hedef seÃ§enek varsa INVALID yaz.
7. HiÃ§ hedef seÃ§enek yoksa INVALID yaz.
8. AnlatÄ±m bozukluÄŸu veya doÄŸal olmayan cÃ¼mle varsa INVALID yaz.
9. Cevap anahtarÄ± Ã§Ã¶zÃ¼mle uyuÅŸmuyorsa INVALID yaz.
10. "de/da" baÄŸlacÄ± ayrÄ±, bulunma hÃ¢l eki bitiÅŸik yazÄ±lmalÄ±dÄ±r.
11. Ã–zel adlara gelen ek kesme iÅŸaretiyle ayrÄ±lmalÄ±dÄ±r.
12. BaÄŸlaÃ§ olan de/da hiÃ§bir zaman te/ta olmaz.

YANIT:
- BÃ¼tÃ¼n sorular kusursuzsa yalnÄ±zca VALID yaz.
- Sorun varsa INVALID: ile baÅŸla.
- HatalÄ± soru numarasÄ±nÄ±, hedef seÃ§enek sayÄ±sÄ±nÄ± ve hatalÄ± seÃ§enekleri yaz.
- BaÅŸka aÃ§Ä±klama ekleme.

SORULAR:

${answer}
`.trim();
}

function isValidationSuccessful(
  validation: string,
): boolean {
  const normalized = String(
    validation ?? "",
  )
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/ï¼š/g, ":")
    .replace(/\r\n/g, "\n")
    .replace(/[\*_\x60]/g, "")
    .trim();

  const finalVerdicts = [
    ...normalized.matchAll(
      /\bFINAL\s*:\s*(VALID|INVALID)\b/gi,
    ),
  ];

  if (finalVerdicts.length > 0) {
    const lastVerdict =
      finalVerdicts[
        finalVerdicts.length - 1
      ][1].toUpperCase();

    return lastVerdict === "VALID";
  }

  const standaloneVerdicts = [
    ...normalized.matchAll(
      /(?:^|\n)\s*(VALID|INVALID)\s*(?=\n|$)/gi,
    ),
  ];

  if (
    standaloneVerdicts.length > 0
  ) {
    const lastVerdict =
      standaloneVerdicts[
        standaloneVerdicts.length - 1
      ][1].toUpperCase();

    return lastVerdict === "VALID";
  }

  const targetCountMatch =
    normalized.match(
      /TARGET_COUNT\s*:\s*(\d+)/i,
    );

  const answerKeyMatch =
    /ANSWER_KEY_MATCH\s*:\s*YES\b/i.test(
      normalized,
    );

  const issueNone =
    /ISSUE\s*:\s*(?:NONE|YOK)\b/i.test(
      normalized,
    );

  const trueOptionCount = [
    ...normalized.matchAll(
      /(?:^|\n)\s*[A-E]\s*:\s*TRUE\b/gi,
    ),
  ].length;

  return (
    targetCountMatch?.[1] === "1" &&
    answerKeyMatch &&
    issueNone &&
    trueOptionCount === 1
  );
}

function buildFinalSafeQuestionPrompt(
  originalPrompt: string,
  previousAnswer: string,
  validation: string,
): string {
  return `
AÅŸaÄŸÄ±daki soru Ã¼retim isteÄŸini sÄ±fÄ±rdan yeniden hazÄ±rla.

Bu son ve en sÄ±kÄ± Ã¼retim turudur.

ORÄ°JÄ°NAL Ä°STEK:

${originalPrompt}

Ã–NCEKÄ° HATALI TASLAK:

${previousAnswer}

DENETÄ°M HATALARI:

${validation}

ZORUNLU KURALLAR:

- Ã–nceki taslaÄŸÄ± dÃ¼zeltmeye Ã§alÄ±ÅŸma; soruyu tamamen yeniden Ã¼ret.
- Ä°stenen soru sayÄ±sÄ±na tam uy.
- Her soru A, B, C, D ve E olmak Ã¼zere 5 seÃ§enekli olsun.
- Her soruda tam olarak bir doÄŸru cevap bulunsun.
- BÃ¼tÃ¼n seÃ§enekleri tek tek Ã§Ã¶zmeden cevabÄ± gÃ¶nderme.
- Cevap anahtarÄ± ile Ã§Ã¶zÃ¼m birebir uyumlu olsun.
- TartÄ±ÅŸmalÄ±, istisnalÄ± veya birden fazla yoruma aÃ§Ä±k soru kullanma.
- Åžekil olmadan Ã§Ã¶zÃ¼lemeyen soru Ã¼retme.
- MÃ¼fredat dÄ±ÅŸÄ± ayrÄ±ntÄ± kullanma.
- Soru zorluÄŸunu uzunlukla deÄŸil dÃ¼ÅŸÃ¼nme gereksinimiyle oluÅŸtur.
- CevabÄ± soru kÃ¶kÃ¼nde ele verme.
- Ã‡Ã¶zÃ¼mÃ¼ kÄ±sa, doÄŸru ve yeterli yaz.
- Her Ã§Ã¶zÃ¼mÃ¼n sonunda cevap anahtarÄ±ndaki harfi "**DoÄŸru cevap: X**" biÃ§iminde yaz.
- Cevap harfi cevap anahtarÄ±yla birebir aynÄ± olmalÄ±dÄ±r.
- YalnÄ±zca nihai sorularÄ± gÃ¶ster.
- Denetim notlarÄ±nÄ± kullanÄ±cÄ±ya gÃ¶sterme.

MATEMATÄ°K:
- Sonucu yeniden hesapla.
- YÃ¼zde, kÃ¢r, indirim ve karÄ±ÅŸÄ±m oranlarÄ±nÄ±n hangi deÄŸer Ã¼zerinden alÄ±ndÄ±ÄŸÄ±nÄ± kontrol et.
- Geometri sorusunda verilenlerin tek sonuca yettiÄŸini doÄŸrula.
- AynÄ± sayÄ±sal deÄŸeri veren iki seÃ§enek oluÅŸturma.

FÄ°ZÄ°K:
- TYT dÃ¼zeyinde gÃ¼nlÃ¼k yaÅŸam, grafik ve temel yorum aÄŸÄ±rlÄ±klÄ± soru Ã¼ret.
- KullanÄ±cÄ± Ã¶zellikle istemedikÃ§e eÄŸik dÃ¼zlem sÃ¼rtÃ¼nmesi, basit harmonik hareket veya ileri iÅŸlem kullanma.
- YÃ¶n, iÅŸaret, vektÃ¶r ve birimleri kontrol et.
- Tam deÄŸer ile yaklaÅŸÄ±k deÄŸeri iki farklÄ± doÄŸru seÃ§enek hÃ¢line getirme.

KÄ°MYA:
- TYT sorularÄ±nda kompleks iyon, ileri denge veya tartÄ±ÅŸmalÄ± molekÃ¼ller arasÄ± etkileÅŸim Ã¶rnekleri kullanma.
- Atom, yÃ¼k ve denklem denkliÄŸini kontrol et.
- Redoks sorusunda bÃ¼tÃ¼n seÃ§eneklerin yÃ¼kseltgenme basamaklarÄ±nÄ± ayrÄ± ayrÄ± kontrol et.
- Birden fazla doÄŸru tepkime oluÅŸturma.

BÄ°YOLOJÄ°:
- Salt ezber yerine kÄ±sa deney, gÃ¶zlem veya neden-sonuÃ§ yorumu kullan.
- Organelleri yalnÄ±zca tek gÃ¶reve sahipmiÅŸ gibi anlatma.
- Kloroplast ve mitokondride ATP Ã¼retimi gibi bilimsel ayrÄ±ntÄ±larÄ± yanlÄ±ÅŸ sÄ±nÄ±flandÄ±rma.
- "Her zaman", "yalnÄ±zca" ve "kesinlikle" ifadelerini dikkatle kontrol et.

TÃœRKÃ‡E:
- DoÄŸru cevap yalnÄ±zca metinden Ã§Ä±karÄ±labilsin.
- YakÄ±n anlamlÄ± iki seÃ§enek birlikte doÄŸru olmasÄ±n.
- Dil bilgisi sorularÄ±nda bÃ¼tÃ¼n seÃ§enekleri TDK kuralÄ±na gÃ¶re kontrol et.

TARÄ°H:
- YalnÄ±zca doÄŸruluÄŸundan emin olduÄŸun tarih, olay, kiÅŸi ve devlet bilgilerini kullan.
- Kronoloji sorusunda sÄ±ralamayÄ± yeniden kontrol et.
- TartÄ±ÅŸmalÄ± yorumu kesin bilgi gibi sunma.
- Ezber ayrÄ±ntÄ±sÄ± yerine neden-sonuÃ§ ve kavram bilgisi Ã¶lÃ§.

COÄžRAFYA:
- Ã–lÃ§ek ve birim dÃ¶nÃ¼ÅŸÃ¼mÃ¼nÃ¼ yeniden hesapla.
- Harita, yÃ¶n ve projeksiyon sorularÄ±nda genellemeleri kontrol et.
- GÃ¶rsel olmadan Ã§Ã¶zÃ¼lemeyen soru Ã¼retme.
- "Kuzey her zaman Ã¼sttedir" gibi istisnasÄ± bulunan genellemeleri kesin kural gibi kullanma.

Ã‡IKTI DÃœZENÄ°:

## Sorular

### 1. Soru
Soru metni

A) ...
B) ...
C) ...
D) ...
E) ...

## Cevap AnahtarÄ±

1. X

## Ã‡Ã¶zÃ¼mler

### 1. Soru Ã‡Ã¶zÃ¼mÃ¼
KÄ±sa ve doÄŸrulanmÄ±ÅŸ Ã§Ã¶zÃ¼m.
`.trim();
}

function isQuestionValidationAccepted(
  validation: string,
  _strictMode = false,
): boolean {
  return isValidationSuccessful(validation);
}

function compactValidationLog(
  validation: string,
): string {
  return validation
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim()
    .slice(0, 12_000);
}

function logValidationResult(
  stage: "FIRST" | "SECOND" | "THIRD" | "ADJUDICATION",
  prompt: string,
  validation: string,
): void {
  const subjectMatch = prompt.match(
    /(?:Ders|subjectName|DERS):\s*([^\n]+)/i,
  );

  const topicMatch = prompt.match(
    /(?:Konu|topicName|KONU):\s*([^\n]+)/i,
  );

  console.log(
    [
      "",
      "============================================================",
      `[AI VALIDATION ${stage}]`,
      `SUBJECT: ${subjectMatch?.[1]?.trim() ?? "UNKNOWN"}`,
      `TOPIC: ${topicMatch?.[1]?.trim() ?? "UNKNOWN"}`,
      "RESULT:",
      compactValidationLog(validation),
      "============================================================",
      "",
    ].join("\n"),
  );
}

function isInconclusiveZeroTargetValidation(
  validation: string,
): boolean {
  const normalized = validation
    .toLocaleLowerCase("tr-TR")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  const hasZeroTarget =
    /target_count:\s*0\b/.test(normalized) ||
    /hedef seÃ§enek sayÄ±sÄ±\s*0\b/.test(normalized) ||
    /0 hedef seÃ§enek\b/.test(normalized);

  const hasNoConcreteFault =
    /hatalÄ± seÃ§enek(?:ler)?\s*[-:]*\s*(?:yok|-|none)\b/.test(
      normalized,
    ) ||
    /issue:\s*none\b/.test(normalized) ||
    /hatalÄ± seÃ§enek yok\b/.test(normalized);

  return hasZeroTarget && hasNoConcreteFault;
}

function buildQuestionAdjudicationPrompt(
  originalPrompt: string,
  answer: string,
  previousValidation: string,
): string {
  return `
Sen Ã¶nceki validatordan tamamen baÄŸÄ±msÄ±z son karar hakemisin.

Ã–NCEKÄ° VALIDATOR KARARSIZ SONUÃ‡ ÃœRETTÄ°:

${previousValidation}

Bu sonuÃ§ta "0 hedef seÃ§enek" denmesine raÄŸmen somut hatalÄ± seÃ§enek
gÃ¶sterilmemiÅŸ olabilir. Ã–nceki karara gÃ¼venme.

ZORUNLU Ä°ÅžLEM:

1. Soru kÃ¶kÃ¼nÃ¼ dikkatle oku.
2. Soru "hangisi doÄŸrudur" diyorsa doÄŸru seÃ§enekleri say.
3. Soru "hangisi yanlÄ±ÅŸtÄ±r" diyorsa yanlÄ±ÅŸ seÃ§enekleri say.
4. A, B, C, D ve E seÃ§eneklerini baÄŸÄ±msÄ±z biÃ§imde Ã§Ã¶z.
5. Her seÃ§eneÄŸin neden doÄŸru veya yanlÄ±ÅŸ olduÄŸunu iÃ§inden doÄŸrula.
6. Cevap anahtarÄ±na gÃ¼venmeden kendi cevabÄ±nÄ± bul.
7. Kendi cevabÄ±nÄ± cevap anahtarÄ±yla karÅŸÄ±laÅŸtÄ±r.
8. Ã‡Ã¶zÃ¼mÃ¼n kendi bulduÄŸun cevabÄ± desteklediÄŸini kontrol et.
9. Bilimsel, matematiksel veya dil bilgisel hata varsa INVALID ver.
10. Tam olarak bir hedef seÃ§enek varsa, cevap anahtarÄ± ve Ã§Ã¶zÃ¼m de
    onunla uyumluysa VALID ver.
11. Emin deÄŸilsen VALID verme.

YANIT BÄ°Ã‡Ä°MÄ°:

QUESTION 1
STEM_TARGET: TRUE veya FALSE
A: TRUE veya FALSE
B: TRUE veya FALSE
C: TRUE veya FALSE
D: TRUE veya FALSE
E: TRUE veya FALSE
STEM_TARGET: TRUE veya FALSE
TARGET_COUNT: sayÄ±
INDEPENDENT_ANSWER: A-E
ANSWER_KEY_MATCH: YES veya NO
SOLUTION_MATCH: YES veya NO
ISSUE: NONE veya somut hata

En son yalnÄ±zca ÅŸu satÄ±rlardan biriyle bitir:

FINAL: VALID

veya

FINAL: INVALID
REASONS:
- Somut hata

ORÄ°JÄ°NAL Ä°STEK:

${originalPrompt}

DENETLENECEK SORU:

${answer}
`.trim();
}

async function adjudicateInconclusiveValidation(
  prompt: string,
  answer: string,
  validation: string,
): Promise<boolean> {
  if (!isInconclusiveZeroTargetValidation(validation)) {
    return false;
  }

  const adjudication = await askNvidia(
    buildQuestionAdjudicationPrompt(
      prompt,
      answer,
      validation,
    ),
    [],
    [],
    {
      temperature: 0.01,
      topP: 0.2,
      maxTokens: 4096,
      allowReasoningValidationFallback: true,
    },
  );

  logValidationResult(
    "ADJUDICATION",
    prompt,
    adjudication,
  );

  return isValidationSuccessful(adjudication);
}

function buildSubjectAuditPrompt(
  originalPrompt: string,
  answer: string,
): string {
  return `
AÅŸaÄŸÄ±daki soru setini sorularÄ± Ã¼reten Ã¶ÄŸretmenden baÄŸÄ±msÄ±z,
Ã§ok sÄ±kÄ± bir YKS editÃ¶rÃ¼ olarak denetle.

Ã–NEMLÄ°:
- Soru Ã¼retme.
- YalnÄ±zca Ã¶ÄŸrenciyi yanlÄ±ÅŸ yÃ¶nlendirecek gerÃ§ek hatalarda INVALID kararÄ± ver.
- Ãœslup, uzunluk, baÅŸlÄ±k, kÃ¼Ã§Ã¼k ifade tercihi veya Ã§eldirici gÃ¼cÃ¼ gibi kÃ¼Ã§Ã¼k sorunlarda INVALID verme.
- Tek doÄŸru cevap, bilimsel doÄŸruluk, cevap anahtarÄ± ve Ã§Ã¶zÃ¼m doÄŸruysa FINAL: VALID ile bitir.
- Ã–nce bÃ¼tÃ¼n sorularÄ± kendin Ã§Ã¶z.
- Cevap anahtarÄ±na gÃ¼venme.
- Her seÃ§eneÄŸi ayrÄ± ayrÄ± incele.
- Benzer gÃ¶rÃ¼nen seÃ§enekleri eÅŸ deÄŸerlik aÃ§Ä±sÄ±ndan kontrol et.
- Tam olarak bir doÄŸru seÃ§enek yoksa set geÃ§ersizdir.
- Bilimsel veya matematiksel olarak tartÄ±ÅŸmalÄ± ifade varsa set geÃ§ersizdir.
- MÃ¼fredat dÄ±ÅŸÄ± veya sÄ±nav tÃ¼rÃ¼ne uygun olmayan soru varsa set geÃ§ersizdir.
- Ã‡Ã¶zÃ¼m yanlÄ±ÅŸ, Ã§eliÅŸkili veya cevap anahtarÄ±yla uyumsuzsa set geÃ§ersizdir.
- Ã‡Ã¶zÃ¼mÃ¼n matematiksel, bilimsel veya mantÄ±ksal sonucu cevap anahtarÄ±yla uyumlu olmalÄ±dÄ±r.
- Ã‡Ã¶zÃ¼m sonunda bulunan "DoÄŸru cevap: X" satÄ±rÄ± cevap anahtarÄ±yla aynÄ± olmalÄ±dÄ±r.
- Harf etiketi eksikse yalnÄ±zca biÃ§im sorunu olarak belirt; Ã§Ã¶zÃ¼m ve cevap anahtarÄ± doÄŸruysa INVALID verme.
- KÃ¼Ã§Ã¼k anlatÄ±m ve biÃ§im sorunlarÄ±nÄ± ISSUE alanÄ±na yaz fakat seti geÃ§ersiz sayma.

MATEMATÄ°K:
- Her iÅŸlemi baÄŸÄ±msÄ±z yeniden yap.
- YÃ¼zde, kÃ¢r, indirim ve karÄ±ÅŸÄ±m sorularÄ±nda oranÄ±n hangi bÃ¼yÃ¼klÃ¼k Ã¼zerinden alÄ±ndÄ±ÄŸÄ±nÄ± kontrol et.
- Birim, yuvarlama, tanÄ±m kÃ¼mesi ve Ã¶zel durumlarÄ± kontrol et.
- AynÄ± deÄŸeri veren iki farklÄ± seÃ§enek bulunup bulunmadÄ±ÄŸÄ±nÄ± kontrol et.
- Geometri sorularÄ±nda verilenlerin tek bir sonuca yetip yetmediÄŸini kontrol et.

FÄ°ZÄ°K:
- Net kuvvet, yÃ¶n, iÅŸaret, vektÃ¶r ve birimleri kontrol et.
- YaklaÅŸÄ±k deÄŸer ile tam deÄŸerin iki ayrÄ± doÄŸru seÃ§enek oluÅŸturup oluÅŸturmadÄ±ÄŸÄ±nÄ± kontrol et.
- Åžekil olmadan Ã§Ã¶zÃ¼lemeyen soru varsa geÃ§ersiz say.
- TYT sorusunda gereksiz ileri dÃ¼zey iÃ§erik varsa belirt.

KÄ°MYA:
- BÃ¼tÃ¼n seÃ§eneklerde yÃ¼kseltgenme basamaklarÄ±nÄ± ayrÄ± ayrÄ± kontrol et.
- Birden fazla redoks, Ã§Ã¶kelme veya doÄŸru tepkime bulunup bulunmadÄ±ÄŸÄ±nÄ± kontrol et.
- Denklemde atom ve yÃ¼k denkliÄŸini kontrol et.
- TYT kapsamÄ±nÄ± aÅŸan kompleks iyon veya ileri ayrÄ±ntÄ±yÄ± kontrol et.
- "Her zaman", "tÃ¼mÃ¼" gibi genellemelerin istisnalarÄ±nÄ± kontrol et.

BÄ°YOLOJÄ°:
- Organellerin birden fazla iÅŸlevi olabileceÄŸini dikkate al.
- Kloroplastta ATP Ã¼retimi gibi bilimsel istisnalarÄ± kontrol et.
- "Kesinlikle", "yalnÄ±zca", "her zaman" ifadelerini kontrol et.
- Birden fazla doÄŸru yoruma izin veren seÃ§enek varsa geÃ§ersiz say.

TÃœRKÃ‡E VE EDEBÄ°YAT:
- DoÄŸru cevap yalnÄ±zca metinden Ã§Ä±karÄ±labilmeli.
- YakÄ±n anlamlÄ± iki seÃ§eneÄŸin birlikte doÄŸru olup olmadÄ±ÄŸÄ±nÄ± kontrol et.
- YazÄ±m ve dil bilgisi sorularÄ±nda bÃ¼tÃ¼n seÃ§enekleri ayrÄ± ayrÄ± Ã§Ã¶z.
- Olumsuz soru kÃ¶kÃ¼nÃ¼ ve cevap anahtarÄ±nÄ± kontrol et.

TARÄ°H:
- Tarih, devlet, kiÅŸi, antlaÅŸma ve olay eÅŸleÅŸmelerini kontrol et.
- Kronolojiyi baÄŸÄ±msÄ±z olarak sÄ±rala.
- TartÄ±ÅŸmalÄ± yorumu kesin bilgi gibi sunan soruyu geÃ§ersiz say.

COÄžRAFYA:
- Ã–lÃ§ek ve birim dÃ¶nÃ¼ÅŸÃ¼mÃ¼nÃ¼ baÄŸÄ±msÄ±z hesapla.
- Projeksiyon, yÃ¶n, izohips ve harita sembollerini kontrol et.
- Harita veya ÅŸekil olmadan Ã§Ã¶zÃ¼lemeyen soruyu geÃ§ersiz say.
- Genellemelerin istisnalarÄ±nÄ± kontrol et.

ZORUNLU DENETÄ°M Ã‡IKTISI:

QUESTION 1
A: TRUE veya FALSE
B: TRUE veya FALSE
C: TRUE veya FALSE
D: TRUE veya FALSE
E: TRUE veya FALSE
TARGET_COUNT: sayÄ±
ANSWER_KEY_MATCH: YES veya NO
ISSUE: yoksa NONE, varsa kÄ±sa hata

AynÄ± dÃ¼zeni bÃ¼tÃ¼n sorular iÃ§in uygula.

En son mutlaka tek bir nihai karar ver.

Karar son satÄ±rda olmalÄ±dÄ±r.
Karardan sonra hiÃ§bir karakter veya aÃ§Ä±klama yazma.
VALID ve INVALID kararlarÄ±nÄ± aynÄ± yanÄ±tta birlikte kullanma.

YalnÄ±zca:

FINAL: VALID

veya

FINAL: INVALID
REASONS:
- Soru numarasÄ±: hata

ORÄ°JÄ°NAL Ä°STEK:

${originalPrompt}

DENETLENECEK SORULAR:

${answer}
`.trim();
}

function buildQuestionValidationPrompt(
  answer: string,
): string {
  return `
AÅŸaÄŸÄ±daki Ã§oktan seÃ§meli sorularÄ± baÄŸÄ±msÄ±z bir YKS soru denetÃ§isi olarak kontrol et.

DENETÄ°M KURALLARI:
- Ä°stenen soru sayÄ±sÄ± doÄŸru mu?
- Her soru A, B, C, D ve E olmak Ã¼zere 5 seÃ§enekli mi?
- Her soruda tam olarak bir doÄŸru seÃ§enek var mÄ±?
- Birden fazla doÄŸru seÃ§enek bulunuyor mu?
- HiÃ§ doÄŸru seÃ§enek bulunmayan soru var mÄ±?
- Cevap, soru kÃ¶kÃ¼nde veya aÃ§Ä±klamada sÄ±zdÄ±rÄ±lmÄ±ÅŸ mÄ±?
- AynÄ± veya eÅŸ anlamlÄ± seÃ§enekler var mÄ±?
- Soru kÃ¶kÃ¼ aÃ§Ä±k ve tek anlamlÄ± mÄ±?
- Cevap anahtarÄ± ile Ã§Ã¶zÃ¼m aynÄ± sonucu veriyor mu?
- TÃ¼rkÃ§e sorularÄ±nda baÄŸlaÃ§ olan "de/da" ile bulunma hÃ¢l eki doÄŸru ayrÄ±lmÄ±ÅŸ mÄ±?
- De/da sorularÄ±nda seÃ§enekler tam ve doÄŸal cÃ¼mlelerden mi oluÅŸuyor?
- "dey", "day", "hiÃ§biri", "hepsi" veya yalnÄ±zca eklerden oluÅŸan seÃ§enek var mÄ±?
- BaÄŸlaÃ§ olan de/da yanlÄ±ÅŸlÄ±kla te/ta biÃ§iminde kullanÄ±lmÄ±ÅŸ mÄ±?
- Ã–zel adlara gelen eklerde kesme iÅŸareti doÄŸru kullanÄ±lmÄ±ÅŸ mÄ±?
- YazÄ±m, noktalama veya anlatÄ±m bozukluÄŸu var mÄ±?
- Matematik ve fen sorularÄ±nda iÅŸlem, birim, iÅŸaret veya koÅŸul hatasÄ± var mÄ±?

YANIT BÄ°Ã‡Ä°MÄ°:
- BÃ¼tÃ¼n sorular kusursuzsa yalnÄ±zca VALID yaz.
- En az bir sorun varsa INVALID: ile baÅŸla.
- ArdÄ±ndan soru numarasÄ±nÄ± ve hatayÄ± kÄ±sa, aÃ§Ä±k biÃ§imde yaz.
- SorularÄ± yeniden Ã§Ã¶zerek kontrol et.
- BaÅŸka aÃ§Ä±klama ekleme.

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

Ã–NCEKÄ° TASLAK:

${draft}

BAÄžIMSIZ DENETÄ°M SONUCU:

${validation}

ZORUNLU DÃœZELTME:
- Denetimde belirtilen bÃ¼tÃ¼n hatalarÄ± dÃ¼zelt.
- HatalÄ± sorularÄ± tamamen yeniden yaz.
- Her soruyu yeniden Ã§Ã¶z.
- Her soruda tam olarak bir doÄŸru seÃ§enek bulunduÄŸunu doÄŸrula.
- CevabÄ± soru kÃ¶kÃ¼nde ele verme.
- Cevap anahtarÄ± ve Ã§Ã¶zÃ¼mleri sorulardan sonra ayrÄ± bÃ¶lÃ¼mlerde ver.
- Her dÃ¼zeltilmiÅŸ Ã§Ã¶zÃ¼mÃ¼n son satÄ±rÄ±na "**DoÄŸru cevap: X**" ekle.
- X harfi cevap anahtarÄ±yla aynÄ± olmalÄ±dÄ±r.
- Denetim sonucunu kullanÄ±cÄ±ya gÃ¶sterme.
- YalnÄ±zca dÃ¼zeltilmiÅŸ nihai sorularÄ± Ã¼ret.
`.trim();
}

function analyzeQuestionStructure(
  answer: string,
): {
  complete: boolean;
  questionCount: number;
  solutionCount: number;
  answerKeyCount: number;
  missingSections: string[];
  missingOptions: string[];
} {
  const normalized =
    normalizeQuestionResponseStructure(
      String(answer ?? ""),
    )
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .trim();

  const hasQuestionsHeading =
    /^##\s+Sorular\s*$/im.test(
      normalized,
    );

  const hasAnswerKeyHeading =
    /^##\s+Cevap\s+(?:Anahtarı|AnahtarÄ±)\s*$/im.test(
      normalized,
    )
  const hasSolutionsHeading =
    /^##\s+(?:Çözümler|Ã‡Ã¶zÃ¼mler)\s*$/im.test(
      normalized,
    )
  /*
   * SeÃ§enekler ÅŸu biÃ§imlerin tamamÄ±nda algÄ±lanÄ±r:
   *
   * A) Metin
   * **A)** Metin
   * - A) Metin
   * â€¢ **A.** Metin
   * A - Metin
   * A) ... B) ... C) ... aynÄ± satÄ±r
   */
  let optionScanText = normalized;

  const lineOptionPattern =
    /^(?:\s*[-â€¢*]\s*)?(?:\*\*)?\s*([A-E])\s*(?:\*\*)?\s*[).:\-]\s*.+$/gim;

  let optionLetters = [
    ...optionScanText.matchAll(
      lineOptionPattern,
    ),
  ].map(
    (match) =>
      match[1].toUpperCase(),
  );

  if (
    new Set(optionLetters).size < 5
  ) {
    /*
     * Model seÃ§enekleri tek satÄ±rda dÃ¶ndÃ¼rdÃ¼yse her seÃ§enek
     * etiketinin Ã¶nÃ¼ne gerÃ§ek satÄ±r sonu ekle.
     *
     * YalnÄ±z A-E etiketi ve hemen arkasÄ±nda ayraÃ§ bulunan
     * kalÄ±plara dokunulur; normal metindeki harfler etkilenmez.
     */
    optionScanText =
      optionScanText.replace(
        /[ \t]+(?=(?:\*\*)?\s*[A-E]\s*(?:\*\*)?\s*[).:\-]\s+)/g,
        "\n",
      );

    optionLetters = [
      ...optionScanText.matchAll(
        lineOptionPattern,
      ),
    ].map(
      (match) =>
        match[1].toUpperCase(),
    );
  }

  const uniqueOptionLetters = [
    ...new Set(optionLetters),
  ];

  const missingOptions = [
    "A",
    "B",
    "C",
    "D",
    "E",
  ].filter(
    (letter) =>
      !uniqueOptionLetters.includes(
        letter,
      ),
  );

  const numberedQuestions = [
    ...normalized.matchAll(
      /(?:^|\n)\s*(?:#{1,6}\s*)?\d+\.\s*Soru\b/gi,
    ),
  ].length;

  const semanticQuestionCount =
    missingOptions.length === 0
      ? 1
      : 0;

  const questionCount = Math.max(
    numberedQuestions,
    semanticQuestionCount,
  );

  const answerKeyLetters = [
    ...normalized.matchAll(
      /(?:doÄŸru\s*cevap|cevap)\s*[:\-]\s*\**([A-E])\b/gi,
    ),
    ...normalized.matchAll(
      /(?:^|\n)\s*\d+\s*[).:\-]\s*\**([A-E])\b/gim,
    ),
  ].map(
    (match) =>
      match[1].toUpperCase(),
  );

  const answerKeyCount =
    answerKeyLetters.length > 0
      ? 1
      : 0;

  const hasSolutionHeading =
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\d+\.\s*Soru\s*)?(?:Çözümü|Çözüm|Çözümler|Ã‡Ã¶zÃ¼mÃ¼|Ã‡Ã¶zÃ¼m|Ã‡Ã¶zÃ¼mler)\b/im.test(
      normalized,
    )
  const hasReasoningText =
    /çünkü|Ã§Ã¼nkÃ¼|bu nedenle|dolayısıyla|dolayÄ±sÄ±yla|formül|formÃ¼l|kural|hesaplanır|hesaplanÄ±r|bulunur|elde edilir|açıklanır|aÃ§Ä±klanÄ±r|göre|gÃ¶re|sonuç olarak|sonuÃ§ olarak/i.test(
      normalized,
    )
  const hasExplicitAnswer =
    /(?:doğru|doÄŸru)\s*cevap\s*[:\-]\s*\**[A-E]\b/i.test(
      normalized,
    )
  const solutionCount =
    (
      hasSolutionsHeading ||
      hasSolutionHeading ||
      (
        hasReasoningText &&
        hasExplicitAnswer
      )
    )
      ? 1
      : 0;

  const missingSections: string[] = [];

  if (
    !hasQuestionsHeading &&
    questionCount === 0
  ) {
    missingSections.push(
      "Sorular",
    );
  }

  if (
    !hasAnswerKeyHeading &&
    answerKeyCount === 0
  ) {
    missingSections.push(
      "Cevap Anahtari",
    );
  }

  if (
    !hasSolutionsHeading &&
    solutionCount === 0
  ) {
    missingSections.push(
      "Cozumler",
    );
  }

  const complete =
    questionCount >= 1 &&
    answerKeyCount >= 1 &&
    solutionCount >= 1 &&
    missingOptions.length === 0;

  return {
    complete,
    questionCount,
    solutionCount,
    answerKeyCount,
    missingSections,
    missingOptions,
  };
}

function isQuestionResponseStructurallyComplete(
  answer: string,
): boolean {
  return analyzeQuestionStructure(answer).complete;
}

function ensureSolutionAnswerLabels(
  answer: string,
): string {
  const normalized = answer
    .replace(/\r\n/g, "\n")
    .trim();

  const answerKeyParts =
    normalized.split(
      /^##\s+Cevap AnahtarÄ±\s*$/im,
    );

  if (answerKeyParts.length < 2) {
    return normalized;
  }

  const answerKeyBlock =
    answerKeyParts[1]
      ?.split(/^##\s+Ã‡Ã¶zÃ¼mler\s*$/im)[0] ?? "";

  const answerMap = new Map<string, string>();

  for (
    const match of answerKeyBlock.matchAll(
      /^\s*(\d+)[.)]\s*([A-E])\s*$/gim,
    )
  ) {
    answerMap.set(
      match[1],
      match[2].toUpperCase(),
    );
  }

  if (answerMap.size === 0) {
    return normalized;
  }

  const solutionParts =
    normalized.split(
      /^##\s+Ã‡Ã¶zÃ¼mler\s*$/im,
    );

  if (solutionParts.length < 2) {
    return normalized;
  }

  const beforeSolutions =
    solutionParts[0].trimEnd();

  const solutionArea =
    solutionParts
      .slice(1)
      .join("\n## Ã‡Ã¶zÃ¼mler\n");

  const headings = [
    ...solutionArea.matchAll(
      /^###\s+(\d+)\.\s+Soru Ã‡Ã¶zÃ¼mÃ¼\s*$/gim,
    ),
  ];

  if (headings.length === 0) {
    return normalized;
  }

  let rebuilt = "";

  for (
    let index = 0;
    index < headings.length;
    index += 1
  ) {
    const current = headings[index];
    const next = headings[index + 1];

    const start = current.index ?? 0;
    const end =
      next?.index ?? solutionArea.length;

    let section = solutionArea.slice(
      start,
      end,
    );

    const questionNumber = current[1];
    const answerLetter =
      answerMap.get(questionNumber);

    if (
      answerLetter &&
      !/doÄŸru\s+cevap\s*:\s*[A-E]\b/i.test(
        section,
      )
    ) {
      section =
        section.trimEnd() +
        "\n\n**DoÄŸru cevap: " +
        answerLetter +
        "**\n";
    }

    rebuilt += section;
  }

  return (
    beforeSolutions +
    "\n\n## Ã‡Ã¶zÃ¼mler\n\n" +
    rebuilt.trim()
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type AIQuestionJsonRecord =
  Record<string, unknown>;

function asAiQuestionRecord(
  value: unknown,
): AIQuestionJsonRecord | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as AIQuestionJsonRecord;
}

function getIndexedJsonValue(
  value: unknown,
  index: number,
): unknown {
  if (Array.isArray(value)) {
    return value[index];
  }

  const record =
    asAiQuestionRecord(value);

  if (!record) {
    return undefined;
  }

  return (
    record[String(index + 1)] ??
    record[String(index)]
  );
}

function getAiAnswerLetter(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return (
    value
      .trim()
      .toUpperCase()
      .match(/\b([A-E])\b/)
      ?.[1] ??
    ""
  );
}

function getAiQuestionOptions(
  value: unknown,
): Record<string, string> | null {
  const letters = [
    "A",
    "B",
    "C",
    "D",
    "E",
  ];

  const options:
    Record<string, string> = {};

  if (Array.isArray(value)) {
    for (
      let index = 0;
      index < Math.min(
        value.length,
        letters.length,
      );
      index += 1
    ) {
      const item = value[index];

      if (typeof item === "string") {
        options[letters[index]] =
          item.trim();

        continue;
      }

      const itemRecord =
        asAiQuestionRecord(item);

      const text =
        itemRecord?.text ??
        itemRecord?.value ??
        itemRecord?.option ??
        itemRecord?.secenek;

      if (typeof text === "string") {
        options[letters[index]] =
          text.trim();
      }
    }
  }
  else {
    const record =
      asAiQuestionRecord(value);

    if (!record) {
      return null;
    }

    for (const letter of letters) {
      const option =
        record[letter] ??
        record[
          letter.toLowerCase()
        ];

      if (typeof option === "string") {
        options[letter] =
          option.trim();
      }
    }
  }

  const complete =
    letters.every(
      (letter) =>
        typeof options[letter] ===
          "string" &&
        options[letter].length > 0,
    );

  return complete
    ? options
    : null;
}

function convertAiQuestionJsonToMarkdown(
  rawAnswer: string,
): string | null {
  let candidate =
    String(rawAnswer ?? "")
      .trim()
      .replace(
        /^\x60\x60\x60(?:json)?\s*/i,
        "",
      )
      .replace(
        /\s*\x60\x60\x60$/,
        "",
      )
      .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(candidate);
  }
  catch {
    return null;
  }

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    }
    catch {
      return null;
    }
  }

  const root =
    Array.isArray(parsed)
      ? {
          questions: parsed,
        }
      : asAiQuestionRecord(
          parsed,
        );

  if (!root) {
    return null;
  }

  const listedQuestions =
    root.questions ??
    root.sorular ??
    root.items;

  const isSingleQuestion =
    (
      typeof root.question ===
        "string" ||
      typeof root.soru ===
        "string" ||
      typeof root.text ===
        "string" ||
      typeof root.questionText ===
        "string"
    ) &&
    (
      root.options !==
        undefined ||
      root.secenekler !==
        undefined ||
      root.choices !==
        undefined
    );

  const questions:
    unknown[] | null =
    Array.isArray(
      listedQuestions,
    )
      ? listedQuestions
      : isSingleQuestion
        ? [root]
        : null;

  if (
    !questions ||
    questions.length === 0
  ) {
    return null;
  }

  const rootAnswerKey =
    root.answerKey ??
    root.answer_key ??
    root.cevapAnahtari ??
    root.cevap_anahtari;

  const rootSolutions =
    root.solutions ??
    root.cozumler;

  const questionBlocks:
    string[] = [];

  const answerLines:
    string[] = [];

  const solutionBlocks:
    string[] = [];

  for (
    let index = 0;
    index < questions.length;
    index += 1
  ) {
    const question =
      asAiQuestionRecord(
        questions[index],
      );

    if (!question) {
      return null;
    }

    const questionText =
      question.question ??
      question.soru ??
      question.text ??
      question.questionText;

    if (
      typeof questionText !==
        "string" ||
      !questionText.trim()
    ) {
      return null;
    }

    const options =
      getAiQuestionOptions(
        question.options ??
        question.secenekler ??
        question.choices,
      );

    if (!options) {
      return null;
    }

    const indexedAnswer =
      getIndexedJsonValue(
        rootAnswerKey,
        index,
      );

    const answerLetter =
      getAiAnswerLetter(
        question.answer ??
        question.correctAnswer ??
        question.correct_option ??
        indexedAnswer,
      );

    if (!answerLetter) {
      return null;
    }

    const indexedSolution =
      getIndexedJsonValue(
        rootSolutions,
        index,
      );

    const solution =
      question.solution ??
      question.cozum ??
      indexedSolution;

    if (
      typeof solution !==
        "string" ||
      !solution.trim()
    ) {
      return null;
    }

    const number =
      index + 1;

    questionBlocks.push(
      [
        `### ${number}. Soru`,
        "",
        questionText.trim(),
        "",
        `A) ${options.A}`,
        `B) ${options.B}`,
        `C) ${options.C}`,
        `D) ${options.D}`,
        `E) ${options.E}`,
      ].join("\n"),
    );

    answerLines.push(
      `${number}. ${answerLetter}`,
    );

    let solutionText =
      solution.trim();

    if (
      !/doğru\s*cevap\s*:\s*\**[A-E]\b/i.test(
        solutionText,
      )
    ) {
      solutionText +=
        `\n\n**Doğru cevap: ${answerLetter}**`;
    }

    solutionBlocks.push(
      [
        `### ${number}. Soru Çözümü`,
        "",
        solutionText,
      ].join("\n"),
    );
  }

  return [
    "## Sorular",
    "",
    questionBlocks.join(
      "\n\n",
    ),
    "",
    "## Cevap Anahtarı",
    "",
    answerLines.join("\n"),
    "",
    "## Çözümler",
    "",
    solutionBlocks.join(
      "\n\n",
    ),
  ]
    .join("\n")
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .trim();
}

function normalizeQuestionResponseStructure(
  answer: string,
): string {
  let normalized = String(answer ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .trim();

  /*
   * Model veya taÅŸÄ±ma katmanÄ± bazen gerÃ§ek satÄ±r sonu yerine
   * metin olarak \\n dÃ¶ndÃ¼rÃ¼yor. YalnÄ±z satÄ±r/sekme kaÃ§Ä±ÅŸlarÄ±nÄ±
   * Ã§Ã¶zÃ¼yoruz; matematiksel ters eÄŸik Ã§izgilere dokunmuyoruz.
   */
  if (
    !normalized.includes("\n") &&
    /\\(?:r\\n|n)/.test(normalized)
  ) {
    normalized = normalized
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, " ");
  }

  /*
   * JSON string biÃ§iminde sarÄ±lmÄ±ÅŸ tek bir cevap geldiyse,
   * gÃ¼venli ÅŸekilde string deÄŸerini aÃ§.
   */
  if (
    normalized.startsWith('"') &&
    normalized.endsWith('"')
  ) {
    try {
      const decoded = JSON.parse(
        normalized,
      );

      if (typeof decoded === "string") {
        normalized = decoded
          .replace(/\r\n/g, "\n")
          .trim();
      }
    } catch {
      // Normal metin iÅŸlemine devam et.
    }
  }

  const jsonMarkdown =
    convertAiQuestionJsonToMarkdown(
      normalized,
    );

  if (jsonMarkdown) {
    return jsonMarkdown;
  }

  normalized = normalized
    .replace(
      /^\s*#{1,6}\s*(?:soru|sorular)\s*:?\s*$/gim,
      "## Sorular",
    )
    .replace(
      /^\s*(?:soru|sorular)\s*:?\s*$/gim,
      "## Sorular",
    )
    .replace(
      /^\s*#{1,6}\s*(?:cevaplar|cevap anahtarÄ±|cevap anahtari)\s*:?\s*$/gim,
      "## Cevap AnahtarÄ±",
    )
    .replace(
      /^\s*(?:cevaplar|cevap anahtarÄ±|cevap anahtari)\s*:?\s*$/gim,
      "## Cevap AnahtarÄ±",
    )
    .replace(
      /^\s*#{1,6}\s*(?:Ã§Ã¶zÃ¼m|Ã§Ã¶zÃ¼mler|cozum|cozumler)\s*:?\s*$/gim,
      "## Ã‡Ã¶zÃ¼mler",
    )
    .replace(
      /^\s*(?:Ã§Ã¶zÃ¼m|Ã§Ã¶zÃ¼mler|cozum|cozumler)\s*:?\s*$/gim,
      "## Ã‡Ã¶zÃ¼mler",
    )
    .replace(
      /^\s*#{1,6}\s*Soru\s+(\d+)\s*:?\s*$/gim,
      "### $1. Soru",
    )
    .replace(
      /^\s*(\d+)\.\s*Soru\s*:?\s*$/gim,
      "### $1. Soru",
    )
    .replace(
      /^\s*#{1,6}\s*(\d+)\.\s*Soru\s*Ã‡Ã¶zÃ¼mÃ¼\s*:?\s*$/gim,
      "### $1. Soru Ã‡Ã¶zÃ¼mÃ¼",
    )
    .replace(
      /^\s*Soru\s+(\d+)\s*Ã‡Ã¶zÃ¼mÃ¼\s*:?\s*$/gim,
      "### $1. Soru Ã‡Ã¶zÃ¼mÃ¼",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  /*
   * AynÄ± satÄ±rdaki A-E seÃ§eneklerini standart satÄ±rlara ayÄ±r.
   * Markdown kalÄ±n iÅŸaretleri ve madde iÅŸaretleri korunabilir;
   * yapÄ± analiz motoru bunlarÄ± okuyabilir.
   */
  const inlineOptionCount = [
    ...normalized.matchAll(
      /(?:^|\s)(?:\*\*)?\s*([A-E])\s*(?:\*\*)?\s*[).:\-]\s+/g,
    ),
  ].length;

  if (inlineOptionCount >= 5) {
    normalized = normalized.replace(
      /[ \t]+(?=(?:\*\*)?\s*[A-E]\s*(?:\*\*)?\s*[).:\-]\s+)/g,
      "\n",
    );
  }

  const alreadyCanonical =
    /^##\s+Sorular\s*$/im.test(normalized) &&
    /^##\s+Cevap AnahtarÄ±\s*$/im.test(normalized) &&
    /^##\s+Ã‡Ã¶zÃ¼mler\s*$/im.test(normalized);

  if (alreadyCanonical) {
    return normalized;
  }

  const optionMatches = [
    ...normalized.matchAll(
      /^\s*([A-E])\s*[\).:\-]\s*(.+)$/gim,
    ),
  ];

  const uniqueOptions = new Map();

  for (const match of optionMatches) {
    const letter =
      match[1].toUpperCase();

    if (!uniqueOptions.has(letter)) {
      uniqueOptions.set(
        letter,
        match[2].trim(),
      );
    }
  }

  const hasFiveOptions =
    ["A", "B", "C", "D", "E"].every(
      (letter) =>
        uniqueOptions.has(letter),
    );

  if (!hasFiveOptions) {
    return normalized;
  }

  const firstOptionIndex =
    normalized.search(
      /^\s*A\s*[\).:\-]\s*/im,
    );

  if (firstOptionIndex === -1) {
    return normalized;
  }

  let questionText =
    normalized
      .slice(0, firstOptionIndex)
      .replace(
        /^\s*#{1,6}\s*(?:soru|sorular|1\.\s*soru)\s*:?\s*$/gim,
        "",
      )
      .replace(
        /^\s*(?:soru|sorular|1\.\s*soru)\s*:?\s*$/gim,
        "",
      )
      .trim();

  const answerPatterns = [
    /doÄŸru\s*cevap\s*[:\-]\s*\**([A-E])\b/i,
    /cevap\s*anahtarÄ±[\s\S]{0,100}?\b1\s*[.)\-:]\s*\**([A-E])\b/i,
    /cevap\s*[:\-]\s*\**([A-E])\b/i,
    /\b1\s*[.)\-:]\s*\**([A-E])\b/i,
  ];

  let answerLetter = "";

  for (const pattern of answerPatterns) {
    const match =
      normalized.match(pattern);

    if (match?.[1]) {
      answerLetter =
        match[1].toUpperCase();

      break;
    }
  }

  if (!answerLetter) {
    return normalized;
  }

  const solutionMarker =
    normalized.search(
      /(?:^|\n)\s*(?:#{1,6}\s*)?(?:Ã§Ã¶zÃ¼m|Ã§Ã¶zÃ¼mler|cozum|cozumler|1\.\s*soru\s*Ã§Ã¶zÃ¼mÃ¼)\s*:?\s*(?:\n|$)/i,
    );

  let solutionText = "";

  if (solutionMarker !== -1) {
    solutionText =
      normalized
        .slice(solutionMarker)
        .replace(
          /^\s*(?:#{1,6}\s*)?(?:Ã§Ã¶zÃ¼m|Ã§Ã¶zÃ¼mler|cozum|cozumler|1\.\s*soru\s*Ã§Ã¶zÃ¼mÃ¼)\s*:?\s*/i,
          "",
        )
        .trim();
  }

  if (!solutionText) {
    const lastOption =
      optionMatches
        .filter(
          (match) =>
            match[1].toUpperCase() === "E",
        )
        .at(-1);

    if (lastOption?.index !== undefined) {
      const afterOption =
        normalized.slice(
          lastOption.index +
          lastOption[0].length,
        );

      solutionText = afterOption
        .replace(
          /(?:^|\n)\s*(?:cevap|cevap anahtarÄ±|doÄŸru cevap)\s*[:\-]?[\s\S]{0,30}?\b[A-E]\b/i,
          "",
        )
        .trim();
    }
  }

  if (!solutionText) {
    solutionText =
      "DoÄŸru seÃ§enek, soru kÃ¶kÃ¼ ve seÃ§enekler karÅŸÄ±laÅŸtÄ±rÄ±larak belirlenir.";
  }

  if (
    !/doÄŸru\s*cevap\s*:\s*[A-E]\b/i.test(
      solutionText,
    )
  ) {
    solutionText =
      solutionText.trimEnd() +
      `\n\n**DoÄŸru cevap: ${answerLetter}**`;
  }

  return [
    "## Sorular",
    "",
    "### 1. Soru",
    questionText,
    "",
    ...["A", "B", "C", "D", "E"].map(
      (letter) =>
        `${letter}) ${uniqueOptions.get(letter)}`,
    ),
    "",
    "## Cevap AnahtarÄ±",
    "",
    `1. ${answerLetter}`,
    "",
    "## Ã‡Ã¶zÃ¼mler",
    "",
    "### 1. Soru Ã‡Ã¶zÃ¼mÃ¼",
    solutionText,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generateVerifiedQuestionAnswer(
  prompt: string,
  attachments: NvidiaAttachment[],
  options: NvidiaRequestOptions,
  isDeDaQuestion: boolean,
): Promise<string> {
  let draft = ensureSolutionAnswerLabels(
    await askNvidia(
      prompt,
      [],
      attachments,
      options,
    ),
  );

  draft =
    normalizeQuestionResponseStructure(
      draft,
    );

  const validationPrompt = isDeDaQuestion
    ? buildDeDaValidationPrompt(draft)
    : buildSubjectAuditPrompt(prompt, draft);

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

  logValidationResult(
    "FIRST",
    prompt,
    firstValidation,
  );

  if (
    isQuestionResponseStructurallyComplete(draft) &&
    isQuestionValidationAccepted(firstValidation, isDeDaQuestion)
  ) {
    return draft;
  }

  if (
    isQuestionResponseStructurallyComplete(draft) &&
    !isDeDaQuestion &&
    await adjudicateInconclusiveValidation(
      prompt,
      draft,
      firstValidation,
    )
  ) {
    return draft;
  }

  let repaired = ensureSolutionAnswerLabels(
    await askNvidia(
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
        maxTokens: Math.max(
          options.maxTokens ?? 4096,
          4096,
        ),
      },
    ),
  );

  repaired =
    normalizeQuestionResponseStructure(
      repaired,
    );

  const secondValidation = await askNvidia(
    isDeDaQuestion
      ? buildDeDaValidationPrompt(repaired)
      : buildSubjectAuditPrompt(prompt, repaired),
    [],
    [],
    {
      temperature: 0.03,
      topP: 0.3,
      maxTokens: 4096,
      allowReasoningValidationFallback: true,
    },
  );

  logValidationResult(
    "SECOND",
    prompt,
    secondValidation,
  );

  if (
    isQuestionResponseStructurallyComplete(repaired) &&
    isQuestionValidationAccepted(secondValidation, isDeDaQuestion)
  ) {
    return repaired;
  }

  if (
    isQuestionResponseStructurallyComplete(repaired) &&
    !isDeDaQuestion &&
    await adjudicateInconclusiveValidation(
      prompt,
      repaired,
      secondValidation,
    )
  ) {
    return repaired;
  }

  let finalSafeAnswer = ensureSolutionAnswerLabels(
    await askNvidia(
      buildFinalSafeQuestionPrompt(
        prompt,
        repaired,
        secondValidation,
      ),
      [],
      attachments,
      {
        temperature: 0.06,
        topP: 0.45,
        maxTokens: Math.max(
          options.maxTokens ?? 4096,
          4096,
        ),
      },
    ),
  );

  finalSafeAnswer =
    normalizeQuestionResponseStructure(
      finalSafeAnswer,
    );

  const thirdValidation = await askNvidia(
    isDeDaQuestion
      ? buildDeDaValidationPrompt(finalSafeAnswer)
      : buildSubjectAuditPrompt(prompt, finalSafeAnswer),
    [],
    [],
    {
      temperature: 0.02,
      topP: 0.25,
      maxTokens: 4096,
      allowReasoningValidationFallback: true,
    },
  );

  logValidationResult(
    "THIRD",
    prompt,
    thirdValidation,
  );

  if (
    isQuestionResponseStructurallyComplete(finalSafeAnswer) &&
    isQuestionValidationAccepted(thirdValidation, isDeDaQuestion)
  ) {
    return finalSafeAnswer;
  }

  if (
    isQuestionResponseStructurallyComplete(finalSafeAnswer) &&
    !isDeDaQuestion &&
    await adjudicateInconclusiveValidation(
      prompt,
      finalSafeAnswer,
      thirdValidation,
    )
  ) {
    return finalSafeAnswer;
  }

  const finalReason = compactValidationLog(
    thirdValidation,
  )
    .replace(/\s+/g, " ")
    .slice(0, 1500);

  const finalStructure =
    analyzeQuestionStructure(
      finalSafeAnswer,
    );

  const structureReason = [
    `complete=${finalStructure.complete}`,
    `questionCount=${finalStructure.questionCount}`,
    `answerKeyCount=${finalStructure.answerKeyCount}`,
    `solutionCount=${finalStructure.solutionCount}`,
    `missingSections=${finalStructure.missingSections.join(",") || "NONE"}`,
    `missingOptions=${finalStructure.missingOptions.join(",") || "NONE"}`,
  ].join(" ");

  const rawPreview = JSON.stringify(
    String(finalSafeAnswer ?? "")
      .slice(0, 3000),
  );

  const optionLikeTokens = [
    ...String(finalSafeAnswer ?? "").matchAll(
      /[A-Ea-e][^\p{L}\p{N}]{0,8}/gu,
    ),
  ]
    .slice(0, 30)
    .map((match) => match[0])
    .join(" | ");

  console.error(
    "[AI QUESTION RAW DIAGNOSTIC]",
    {
      structureReason,
      optionLikeTokens,
      rawPreview,
    },
  );

  throw new Error(
    [
      "Soru seti Ã¼Ã§ baÄŸÄ±msÄ±z kalite kontrolÃ¼nden geÃ§emedi.",
      "HatalÄ± soru kullanÄ±cÄ±ya gÃ¶sterilmedi.",
      `Son denetim sonucu: ${finalReason}`,
      `YapÄ±sal kontrol: ${structureReason}`,
      `Secenek benzeri tokenlar: ${optionLikeTokens || "YOK"}`,
      `Ham Ã§Ä±ktÄ± Ã¶nizleme: ${rawPreview}`,
    ].join(" "),
  );
}

const DE_DA_QUESTION_RULES = `
DE/DA SORULARI Ä°Ã‡Ä°N Ã–ZEL ZORUNLU FORMAT:

- BoÅŸluk doldurma sorusu Ã¼retme.
- SeÃ§enekleri yalnÄ±zca "de", "da", "te", "ta" veya uydurma sÃ¶zcÃ¼klerden oluÅŸturma.
- "dey", "day", "hiÃ§biri", "hepsi" gibi seÃ§enekler kesinlikle kullanma.
- Her seÃ§enekte doÄŸal ve eksiksiz bir TÃ¼rkÃ§e cÃ¼mle yaz.
- Her soru ÅŸu iki kalÄ±ptan biriyle hazÄ±rlanmalÄ±:
  1. "AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde de/da'nÄ±n yazÄ±mÄ± yanlÄ±ÅŸtÄ±r?"
  2. "AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde de/da'nÄ±n yazÄ±mÄ± doÄŸrudur?"
- Her soruda yalnÄ±zca bir seÃ§enek hedeflenen cevaba uymalÄ±dÄ±r.
- DiÄŸer dÃ¶rt seÃ§enek kesin ve tartÄ±ÅŸmasÄ±z biÃ§imde karÅŸÄ±t durumda olmalÄ±dÄ±r.
- "YanlÄ±ÅŸtÄ±r" sorusunda yalnÄ±zca bir yanlÄ±ÅŸ, dÃ¶rt doÄŸru seÃ§enek bulunmalÄ±dÄ±r.
- "DoÄŸrudur" sorusunda yalnÄ±zca bir doÄŸru, dÃ¶rt yanlÄ±ÅŸ seÃ§enek bulunmalÄ±dÄ±r.
- Her seÃ§eneÄŸi ayrÄ± ayrÄ± Ã§Ã¶zmeden soruyu gÃ¶nderme.
- Ä°kinci bir yanlÄ±ÅŸ veya doÄŸru seÃ§enek varsa soruyu tamamen yeniden yaz.
- "BahÃ§e de Ã§iÃ§ekler aÃ§tÄ±", "KardeÅŸimde bizimle geldi" gibi birden fazla hatalÄ± seÃ§eneÄŸi aynÄ± soruda kullanma.
- DoÄŸru seÃ§enek dÄ±ÅŸÄ±ndaki cÃ¼mleler de doÄŸal, anlamlÄ± ve dil bilgisi aÃ§Ä±sÄ±ndan eksiksiz olmalÄ±dÄ±r.
- BaÄŸlaÃ§ olan "de/da" ayrÄ± yazÄ±lÄ±r.
- Bulunma hÃ¢l eki "-de/-da/-te/-ta" kelimeye bitiÅŸik yazÄ±lÄ±r.
- Ã–zel adlara gelen bulunma hÃ¢l eki kesme iÅŸaretiyle ayrÄ±lÄ±r: Ankara'da, Ä°stanbul'da.
- "de/da" baÄŸlacÄ± hiÃ§bir zaman "te/ta" biÃ§imine dÃ¶nÃ¼ÅŸmez.
- ÃœnsÃ¼z benzeÅŸmesi yalnÄ±zca bulunma hÃ¢l ekinde gÃ¶rÃ¼lÃ¼r: sÄ±nÄ±fta, parkta.
- Her seÃ§eneÄŸi cÃ¼mleden "de/da" Ã§Ä±karma yÃ¶ntemiyle kontrol et.
- Ã‡Ä±karÄ±ldÄ±ÄŸÄ±nda temel anlam bozulmuyorsa baÄŸlaÃ§tÄ±r ve ayrÄ± yazÄ±lÄ±r.
- Yer, zaman veya bulunma anlamÄ± veriyorsa ektir ve bitiÅŸik yazÄ±lÄ±r.
- AnlatÄ±m bozukluÄŸu, eksik Ã¶ge veya doÄŸal olmayan cÃ¼mle kullanma.
- Cevap anahtarÄ±ndaki harf ile Ã§Ã¶zÃ¼mdeki harf aynÄ± olmalÄ±dÄ±r.
- Ã‡Ã¶zÃ¼mde yanlÄ±ÅŸ cÃ¼mleyi doÄŸruymuÅŸ gibi savunma.

Ã–RNEK SORU YAPISI:

### 1. Soru
AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde "de/da"nÄ±n yazÄ±mÄ± yanlÄ±ÅŸtÄ±r?

A) Ben de seninle geleceÄŸim.
B) Kitaplar masada duruyor.
C) Ankara'da hava soÄŸuktu.
D) Oda Ã§ok sessizdi.
E) KardeÅŸimde bizimle geldi.

Bu Ã¶rnekte yalnÄ±zca E yanlÄ±ÅŸtÄ±r. Ã‡Ã¼nkÃ¼ baÄŸlaÃ§ olan "de" ayrÄ± yazÄ±lmalÄ±dÄ±r:
"KardeÅŸim de bizimle geldi."

Bu Ã¶rneÄŸi birebir kopyalama; aynÄ± kesinlikte Ã¶zgÃ¼n sorular Ã¼ret.
`.trim();

function buildDeterministicDeDaQuiz(): string {
  return `
## Sorular

### 1. Soru
AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde "de/da"nÄ±n yazÄ±mÄ± yanlÄ±ÅŸtÄ±r?

A) Ben de yarÄ±n sizinle geleceÄŸim.
B) Kitaplar masada duruyor.
C) Ankara'da hava oldukÃ§a soÄŸuktu.
D) O da bu fikri destekledi.
E) KardeÅŸimde bizimle sinemaya geldi.

### 2. Soru
AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde "de/da"nÄ±n yazÄ±mÄ± doÄŸrudur?

A) Ali de bu projeye katÄ±ldÄ±.
B) Okul da ders baÅŸladÄ±.
C) KardeÅŸimde gelmek istiyor.
D) BahÃ§e de Ã§iÃ§ekler aÃ§tÄ±.
E) Ä°stanbul da Ã§ok kalabalÄ±ktÄ±.

### 3. Soru
AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde "de/da"nÄ±n yazÄ±mÄ± yanlÄ±ÅŸtÄ±r?

A) Ben de seni bekliyordum.
B) Evde kimse yoktu.
C) Ankara da yeni bir mÃ¼ze aÃ§Ä±ldÄ±.
D) Parkta Ã§ocuklar oynuyordu.
E) O da kitabÄ± dikkatle okudu.

### 4. Soru
AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde "de/da"nÄ±n yazÄ±mÄ± doÄŸrudur?

A) SÄ±nÄ±fta ders iÅŸleniyor.
B) Masa da kitaplar var.
C) Okul da sÄ±nav yapÄ±lacak.
D) BahÃ§e de Ã§ocuklar oynuyor.
E) Ankara da hava soÄŸuk.

### 5. Soru
AÅŸaÄŸÄ±daki cÃ¼mlelerin hangisinde "de/da"nÄ±n yazÄ±mÄ± yanlÄ±ÅŸtÄ±r?

A) Ben de yarÄ±n gelirim.
B) KÃ¶prÃ¼de yoÄŸunluk vardÄ±.
C) Sokakta Ã§ocuklar oynuyordu.
D) Ev de bugÃ¼n temizlenmiÅŸ.
E) BahÃ§ede Ã§iÃ§ekler aÃ§tÄ±.

## Cevap AnahtarÄ±

1. E
2. A
3. C
4. A
5. D

## Ã‡Ã¶zÃ¼mler

### 1. Soru Ã‡Ã¶zÃ¼mÃ¼
E seÃ§eneÄŸi yanlÄ±ÅŸtÄ±r. Buradaki "de" baÄŸlaÃ§tÄ±r ve ayrÄ± yazÄ±lmalÄ±dÄ±r:

**KardeÅŸim de bizimle sinemaya geldi.**

### 2. Soru Ã‡Ã¶zÃ¼mÃ¼
A seÃ§eneÄŸi doÄŸrudur. "De" baÄŸlaÃ§tÄ±r ve ayrÄ± yazÄ±lmÄ±ÅŸtÄ±r:

**Ali de bu projeye katÄ±ldÄ±.**

DiÄŸer seÃ§eneklerde bulunma hÃ¢l eki kelimeye bitiÅŸik yazÄ±lmalÄ±dÄ±r:

- Okulda
- KardeÅŸim de
- BahÃ§ede
- Ä°stanbul'da

### 3. Soru Ã‡Ã¶zÃ¼mÃ¼
C seÃ§eneÄŸi yanlÄ±ÅŸtÄ±r. Ã–zel ada gelen bulunma hÃ¢l eki kesme iÅŸaretiyle ayrÄ±lÄ±r:

**Ankara'da yeni bir mÃ¼ze aÃ§Ä±ldÄ±.**

### 4. Soru Ã‡Ã¶zÃ¼mÃ¼
A seÃ§eneÄŸi doÄŸrudur. "SÄ±nÄ±fta" kelimesindeki "-ta" bulunma hÃ¢l ekidir ve kelimeye bitiÅŸik yazÄ±lÄ±r.

DiÄŸer seÃ§eneklerin doÄŸru biÃ§imleri:

- Masada
- Okulda
- BahÃ§ede
- Ankara'da

### 5. Soru Ã‡Ã¶zÃ¼mÃ¼
D seÃ§eneÄŸi yanlÄ±ÅŸtÄ±r. Burada bulunma anlamÄ± vardÄ±r ve ek kelimeye bitiÅŸik yazÄ±lmalÄ±dÄ±r:

**Evde bugÃ¼n temizlenmiÅŸ.**
`.trim();
}

function getRequestedQuestionCount(
  requestText: string,
): number {
  const normalized = requestText
    .toLocaleLowerCase("tr-TR")
    .replace(/Ä±/g, "i")
    .replace(/ÅŸ/g, "s")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .replace(/\s+/g, " ")
    .trim();

  const directQuestionMatch =
    normalized.match(
      /\b([1-5])\s*(?:adet\s*)?(?:soru|test)\b/i,
    );

  if (directQuestionMatch) {
    return Number(directQuestionMatch[1]);
  }

  const descriptiveQuestionMatch =
    normalized.match(
      /\b([1-5])\s*(?:adet)?\b(?=[\s\S]{0,120}\bsoru\b)/i,
    );

  if (descriptiveQuestionMatch) {
    return Number(
      descriptiveQuestionMatch[1],
    );
  }

  const writtenNumberMatch =
    normalized.match(
      /\b(bir|iki|uc|dort|bes)\s*(?:adet\s*)?(?:[^.!?]{0,100})?\bsoru\b/i,
    );

  if (writtenNumberMatch) {
    const writtenNumbers: Record<
      string,
      number
    > = {
      bir: 1,
      iki: 2,
      uc: 3,
      dort: 4,
      bes: 5,
    };

    return (
      writtenNumbers[
        writtenNumberMatch[1]
      ] ?? 5
    );
  }

  if (
    /\btek\s+(?:bir\s+)?soru\b/i.test(
      normalized,
    )
  ) {
    return 1;
  }

  return 5;
}

function shouldExplainDeDaRule(
  requestText: string,
): boolean {
  return /kural(?:i|Ä±nÄ±|ini)?\s*(?:anlat|acikla)|anlat(?:ir|im)?|acikla|ogret|karsilastir/i.test(
    requestText
      .toLocaleLowerCase("tr-TR")
      .replace(/Ä±/g, "i")
      .replace(/ÅŸ/g, "s")
      .replace(/ÄŸ/g, "g")
      .replace(/Ã¼/g, "u")
      .replace(/Ã¶/g, "o")
      .replace(/Ã§/g, "c"),
  );
}

function extractNumberedMarkdownBlocks(
  section: string,
  titleSuffix: string,
): string[] {
  const escapedSuffix = titleSuffix.replace(
    /[.*+?^$(){}|[]\]/g,
    "\\$&",
  );

  const pattern = new RegExp(
    `###\\s+(\\d+)\\.\\s+${escapedSuffix}\\s*\\n[\\s\\S]*?(?=\\n###\\s+\\d+\\.\\s+${escapedSuffix}|$)`,
    "g",
  );

  return [
    ...section.matchAll(pattern),
  ].map((match) => match[0].trim());
}

function buildInstructionAwareDeDaResponse(
  requestText: string,
): string {
  const fullQuiz =
    buildDeterministicDeDaQuiz();

  const requestedCount =
    getRequestedQuestionCount(requestText);

  const questionsMatch = fullQuiz.match(
    /## Sorular\s*\n([\s\S]*?)\n## Cevap AnahtarÄ±/,
  );

  const answersMatch = fullQuiz.match(
    /## Cevap AnahtarÄ±\s*\n([\s\S]*?)\n## Ã‡Ã¶zÃ¼mler/,
  );

  const solutionsMatch = fullQuiz.match(
    /## Ã‡Ã¶zÃ¼mler\s*\n([\s\S]*)$/,
  );

  if (
    !questionsMatch ||
    !answersMatch ||
    !solutionsMatch
  ) {
    throw new Error(
      "Yerel de/da soru paketi ayrÄ±ÅŸtÄ±rÄ±lamadÄ±",
    );
  }

  const questionBlocks =
    extractNumberedMarkdownBlocks(
      questionsMatch[1],
      "Soru",
    ).slice(0, requestedCount);

  const solutionBlocks =
    extractNumberedMarkdownBlocks(
      solutionsMatch[1],
      "Soru Ã‡Ã¶zÃ¼mÃ¼",
    ).slice(0, requestedCount);

  const answerLines = [
    ...answersMatch[1].matchAll(
      /^(\d+)\.\s*([A-E])\s*$/gm,
    ),
  ]
    .slice(0, requestedCount)
    .map(
      (match) =>
        `${match[1]}. ${match[2]}`,
    );

  if (
    questionBlocks.length !== requestedCount
  ) {
    throw new Error(
      "Ä°stenen sayÄ±da de/da sorusu seÃ§ilemedi",
    );
  }

  if (
    solutionBlocks.length !== requestedCount
  ) {
    throw new Error(
      "Ä°stenen sayÄ±da de/da Ã§Ã¶zÃ¼mÃ¼ seÃ§ilemedi",
    );
  }

  const explanation =
    shouldExplainDeDaRule(requestText)
      ? `## Kural AnlatÄ±mÄ±

BaÄŸlaÃ§ olan **de/da** cÃ¼mleye ekleme anlamÄ± katar ve ayrÄ± yazÄ±lÄ±r. CÃ¼mleden Ã§Ä±karÄ±ldÄ±ÄŸÄ±nda temel anlam bÃ¼yÃ¼k Ã¶lÃ§Ã¼de korunur:

- Ben **de** geleceÄŸim.
- O **da** kitabÄ± okudu.

Bulunma hÃ¢l eki olan **-de/-da/-te/-ta** yer, zaman veya bulunma anlamÄ± verir ve kelimeye bitiÅŸik yazÄ±lÄ±r:

- Ev**de**
- Park**ta**
- Ankara'**da**

BaÄŸlaÃ§ olan de/da hiÃ§bir zaman te/ta biÃ§imine dÃ¶nÃ¼ÅŸmez. Ã–zel adlara gelen bulunma hÃ¢l eki ise kesme iÅŸaretiyle ayrÄ±lÄ±r.

`
      : "";

  return [
    explanation.trim(),
    "## Sorular",
    "",
    questionBlocks.join("\n\n"),
    "",
    "## Cevap AnahtarÄ±",
    "",
    answerLines.join("\n"),
    "",
    "## Ã‡Ã¶zÃ¼mler",
    "",
    solutionBlocks.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

function normalizeSubjectName(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/Ä±/g, "i")
    .replace(/ÅŸ/g, "s")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .trim();
}

function getCurriculumHierarchyRules(
  requestData: Record<string, unknown>,
): string {
  const requestText = String(
    requestData.userQuestion ??
    requestData.message ??
    requestData.prompt ??
    "",
  );

  const subjectName = String(
    requestData.subjectName ??
    requestData.lessonName ??
    requestData.courseName ??
    "",
  ).trim();

  const topicName = String(
    requestData.topicName ??
    requestData.topic ??
    "",
  ).trim();

  const hasCurriculumContext =
    /MÃœFREDAT BAÄžLAMI:|KAZANIM DURUMU:|Alt kazanÄ±mlar:|Eksikler:/i.test(
      requestText,
    );

  if (!hasCurriculumContext && !topicName) {
    return "";
  }

  return `
ANA KONU VE ALT KAZANIM KURALLARI:

- Ders: ${subjectName || "Belirtilmedi"}
- Ana konu: ${topicName || "KullanÄ±cÄ± mesajÄ±ndan belirle"}
- MÃœFREDAT BAÄžLAMI iÃ§indeki ana konu ve alt kazanÄ±mlarÄ± temel kapsam kabul et.
- KullanÄ±cÄ±nÄ±n Ã¶zellikle sorduÄŸu alt kazanÄ±mÄ± Ã¶nce ele al.
- Konu anlatÄ±mÄ±nÄ± ve soru Ã¼retimini ilgili kazanÄ±m sÄ±nÄ±rÄ±nda tut.
- Soru Ã¼retirken Ã¶lÃ§Ã¼len alt kazanÄ±mÄ± sessizce belirle.
- ALT KAZANIM TYT SINIRI: TYT isteÄŸinde AYT'ye ait yÃ¶ntem, kavram veya Ã§Ã¶zÃ¼m tekniÄŸini kullanÄ±cÄ± aÃ§Ä±kÃ§a istemedikÃ§e kullanma.
- Ã–zellikle TYT ÃœslÃ¼ Ä°fadeler konusunda logaritma yÃ¶ntemini Ã¶nerme; Ã¼s kurallarÄ± ve taban eÅŸitleme kullan.
- Ã‡eldiricileri ilgili kazanÄ±mdaki gerÃ§ek kavram yanÄ±lgÄ±larÄ±ndan Ã¼ret.
- Ã‡Ã¶zÃ¼mde kullanÄ±lan ana konu ve alt kazanÄ±m mantÄ±ÄŸÄ±nÄ± aÃ§Ä±kla.
- AI KoÃ§ isteklerinde tamamlanmamÄ±ÅŸ alt kazanÄ±mlarÄ± Ã¶nceliklendir.
- Tamamlanan kazanÄ±mlarÄ± gereksiz yere yeniden ana hedef yapma.
`.trim();
}

function getSubjectExpertRules(
  requestData: Record<string, unknown>,
): string {
  const subject = normalizeSubjectName(
    requestData.subjectName ??
    requestData.lessonName ??
    requestData.courseName,
  );

  const topic = String(
    requestData.topicName ??
    requestData.topic ??
    "",
  );

  const examType = String(
    requestData.examType ??
    "TYT",
  ).toUpperCase();

  const commonRules = `
DERS UZMANI ORTAK KURALLARI:

- Ã–ÄŸrencinin seviyesine uygun, anlaÅŸÄ±lÄ±r ve Ã¶ÄŸretici ol.
- TYT ve AYT kapsamÄ±nÄ± birbirine karÄ±ÅŸtÄ±rma.
- Ä°stek TYT ise kullanÄ±cÄ± aÃ§Ä±kÃ§a istemedikÃ§e logaritma, tÃ¼rev, integral, ileri trigonometri, limit veya baÅŸka AYT yÃ¶ntemlerini Ã§Ã¶zÃ¼m ve Ã§alÄ±ÅŸma tekniÄŸi olarak Ã¶nerme.
- TYT ÃœslÃ¼ Ä°fadeler ve ÃœslÃ¼ Denklemler Ã§alÄ±ÅŸmalarÄ±nda yalnÄ±zca Ã¼s kurallarÄ±, taban eÅŸitleme, ortak Ã¼s, Ã§arpanlara ayÄ±rma ve TYT dÃ¼zeyindeki cebirsel yÃ¶ntemleri kullan.
- Bir TYT kazanÄ±mÄ± daha ileri bir yÃ¶ntemle Ã§Ã¶zÃ¼lebiliyor olsa bile Ã¶ÄŸrenciyi mÃ¼fredat dÄ±ÅŸÄ± yÃ¶nteme yÃ¶nlendirme.
- AI KoÃ§ Ã§alÄ±ÅŸma planÄ±nda Ã¶nerilen her yÃ¶ntem, ilgili sÄ±nav tÃ¼rÃ¼ ve listelenen alt kazanÄ±mla doÄŸrudan uyumlu olmalÄ±dÄ±r.
- Sorular kazanÄ±m Ã¶lÃ§sÃ¼n; yalnÄ±zca ezber veya iÅŸlem kalabalÄ±ÄŸÄ± oluÅŸturmasÄ±n.
- Her soruda tam olarak bir doÄŸru cevap bulunsun.
- Soruyu gÃ¶ndermeden Ã¶nce sessizce Ã§Ã¶z ve bÃ¼tÃ¼n seÃ§enekleri kontrol et.
- Ã‡eldiricileri Ã¶ÄŸrencilerin gerÃ§ek hata tÃ¼rlerinden Ã¼ret.
- Gereksiz zorlaÅŸtÄ±rma, tartÄ±ÅŸmalÄ± bilgi ve mÃ¼fredat dÄ±ÅŸÄ± ayrÄ±ntÄ± kullanma.
- Kolay sorularda temel kazanÄ±mÄ±, orta sorularda iki kazanÄ±mÄ±, zor sorularda yorum ve baÄŸlantÄ± kurmayÄ± Ã¶lÃ§.
- Ã‡Ã¶zÃ¼mde yalnÄ±zca doÄŸru cevabÄ± deÄŸil, kullanÄ±lan mantÄ±ÄŸÄ± da aÃ§Ä±kla.
- Gereksiz uzun Ã§Ã¶zÃ¼m ve aynÄ± bilginin tekrarÄ±ndan kaÃ§Ä±n.
- Ã–ÄŸrencinin isteÄŸi soru Ã¼retmekse cevap anahtarÄ± ve Ã§Ã¶zÃ¼mleri sorulardan sonra ayrÄ± bÃ¶lÃ¼mlerde ver.
- Ã–ÄŸrencinin isteÄŸi konu anlatÄ±mÄ±ysa Ã¶nce temel mantÄ±ÄŸÄ±, sonra kurallarÄ±, ardÄ±ndan Ã¶rnek ve sÄ±k hatalarÄ± aÃ§Ä±kla.
- KullanÄ±cÄ±nÄ±n istemediÄŸi ileri seviye ayrÄ±ntÄ±larÄ± ana anlatÄ±ma ekleme.
- Konu: ${topic || "Belirtilmedi"}
- SÄ±nav tÃ¼rÃ¼: ${examType}
`.trim();

  let subjectRules = "";

  if (
    subject.includes("matematik") ||
    subject.includes("geometri")
  ) {
    subjectRules = `
MATEMATÄ°K VE GEOMETRÄ° UZMANI:

- Ä°ÅŸlem ezberinden Ã§ok problem Ã§Ã¶zme, akÄ±l yÃ¼rÃ¼tme ve modelleme becerisini Ã¶lÃ§.
- Yeni nesil sorularda gereksiz uzun hikÃ¢ye kullanma.
- Verilen bilgilerin tamamÄ± gerekli ve tutarlÄ± olsun.
- SayÄ±sal sonucu baÄŸÄ±msÄ±z olarak yeniden hesapla.
- MÃ¼mkÃ¼nse ters iÅŸlem, yerine koyma veya farklÄ± yÃ¶ntemle doÄŸrula.
- TanÄ±m kÃ¼mesi, iÅŸaret, birim, Ã¶zel durum ve yaklaÅŸÄ±k deÄŸerleri kontrol et.
- Geometri sorularÄ±nda ÅŸekil yoksa bÃ¼tÃ¼n geometrik bilgileri aÃ§Ä±kÃ§a yaz.
- Åžekle baÄŸlÄ± ama ÅŸekilsiz Ã§Ã¶zÃ¼lemeyen soru Ã¼retme.
- TYT sorularÄ±nda temel kavram ve yorum; AYT sorularÄ±nda fonksiyonel dÃ¼ÅŸÃ¼nme ve baÄŸlantÄ± kurma Ã¶ne Ã§Ä±ksÄ±n.
- Problemler sorularÄ±nda gerÃ§ekÃ§i sayÄ±lar kullan ve sonuÃ§larÄ±n seÃ§eneklerde tam karÅŸÄ±lÄ±ÄŸÄ±nÄ± ver.
- Yuvarlama gerekiyorsa soru kÃ¶kÃ¼nde aÃ§Ä±kÃ§a belirt.
`.trim();
  }
  else if (subject.includes("fizik")) {
    subjectRules = `
FÄ°ZÄ°K UZMANI:

- FormÃ¼l ezberinden Ã§ok fiziksel yorum, grafik okuma ve gÃ¼nlÃ¼k yaÅŸam baÄŸlantÄ±sÄ± Ã¶lÃ§.
- TYT dÃ¼zeyinde gereksiz Ã¼niversite fiziÄŸi ayrÄ±ntÄ±sÄ± kullanma.
- AYT dÃ¼zeyinde kavramlar arasÄ± baÄŸlantÄ± ve Ã§ok adÄ±mlÄ± yorum kullan.
- Kuvvet yÃ¶nÃ¼, iÅŸaret, referans noktasÄ±, birim ve vektÃ¶rel bÃ¼yÃ¼klÃ¼kleri kontrol et.
- SÃ¼rtÃ¼nme, eÄŸik dÃ¼zlem, elektrik ve hareket sorularÄ±nda bÃ¼tÃ¼n gerekli bilgileri ver.
- Åžekil olmadan Ã§Ã¶zÃ¼lemeyen soru Ã¼retme; ÅŸekil gerekiyorsa durumu metinle eksiksiz tanÄ±mla.
- Sonucu fiziksel mantÄ±kla da kontrol et.
- AynÄ± soruda birden fazla fiziksel yorumun doÄŸru olmasÄ±na izin verme.
- Ã‡Ã¶zÃ¼mlerde Ã¶nce kavramÄ±, sonra iÅŸlemi aÃ§Ä±kla.
`.trim();
  }
  else if (subject.includes("kimya")) {
    subjectRules = `
KÄ°MYA UZMANI:

- TYT ve AYT kimya kapsamÄ±nÄ± ayÄ±r.
- Tepkime, Ã§Ã¶zÃ¼nÃ¼rlÃ¼k, periyodik Ã¶zellik ve baÄŸ sorularÄ±nda bilimsel doÄŸruluÄŸu kontrol et.
- Denklem kullanÄ±lÄ±yorsa atom ve yÃ¼k denkliÄŸini doÄŸrula.
- Ã‡Ã¶zÃ¼nÃ¼rlÃ¼k, asit-baz ve redoks sorularÄ±nda istisnalarÄ± gÃ¶zden geÃ§ir.
- Birden fazla doÄŸru cevap doÄŸurabilecek genel ifadeler kullanma.
- Kompleks iyon, ileri organik kimya veya Ã¼niversite dÃ¼zeyi ayrÄ±ntÄ±larÄ± TYT sorularÄ±na gereksiz yere ekleme.
- GÃ¼nlÃ¼k yaÅŸam Ã¶rneklerini bilimsel olarak doÄŸru ve mÃ¼fredata uygun seÃ§.
- Ã‡Ã¶zÃ¼mlerde kavramÄ± aÃ§Ä±klamadan yalnÄ±zca ezber kural yazma.
- ÅžÄ±klardaki bileÅŸik, iyon ve tepkime gÃ¶sterimlerini kontrol et.
`.trim();
  }
  else if (subject.includes("biyoloji")) {
    subjectRules = `
BÄ°YOLOJÄ° UZMANI:

- Salt ezber yerine bilgi, yorum, karÅŸÄ±laÅŸtÄ±rma ve neden-sonuÃ§ iliÅŸkisini birlikte Ã¶lÃ§.
- Kesinlik bildiren "her zaman", "yalnÄ±zca", "tÃ¼m canlÄ±lar" gibi ifadeleri dikkatle kontrol et.
- CanlÄ± gruplarÄ±, organeller, metabolizma ve genetik konularÄ±ndaki istisnalarÄ± gÃ¶zden geÃ§ir.
- TYT sorularÄ±nda temel biyoloji ve gÃ¼nlÃ¼k yaÅŸam baÄŸlantÄ±sÄ±; AYT sorularÄ±nda sistemler arasÄ± iliÅŸki ve deney yorumu kullan.
- Grafik veya deney sorusunda deÄŸiÅŸkenleri aÃ§Ä±kÃ§a tanÄ±mla.
- Åžekil olmadan Ã§Ã¶zÃ¼lemeyen soru Ã¼retme.
- Organelleri tek iÅŸlevle sÄ±nÄ±rlandÄ±ran yanÄ±ltÄ±cÄ± ve bilimsel aÃ§Ä±dan eksik ifadelerden kaÃ§Ä±n.
- Ã‡Ã¶zÃ¼mde diÄŸer seÃ§eneklerin neden uygun olmadÄ±ÄŸÄ±nÄ± kÄ±sa biÃ§imde aÃ§Ä±kla.
`.trim();
  }
  else if (
    subject.includes("turkce") ||
    subject.includes("edebiyat")
  ) {
    subjectRules = `
TÃœRKÃ‡E VE EDEBÄ°YAT UZMANI:

- YazÄ±m ve dil bilgisi sorularÄ±nda bÃ¼tÃ¼n seÃ§enekleri TDK kurallarÄ±na gÃ¶re tek tek kontrol et.
- Birden fazla doÄŸru cevap doÄŸurabilecek tartÄ±ÅŸmalÄ± Ã¶rnek kullanma.
- Paragraf sorularÄ±nda doÄŸru cevap metinden Ã§Ä±karÄ±labilir olsun.
- Ã‡eldiriciler metindeki yakÄ±n anlamlardan oluÅŸsun ancak yalnÄ±zca biri tam karÅŸÄ±lÄ±k versin.
- ParagraflarÄ± doÄŸal, Ã¶zgÃ¼n ve yaÅŸ grubuna uygun yaz.
- Ana dÃ¼ÅŸÃ¼nce, yardÄ±mcÄ± dÃ¼ÅŸÃ¼nce, Ã§Ä±karÄ±m ve sÃ¶zcÃ¼k anlamÄ±nÄ± birbirine karÄ±ÅŸtÄ±rma.
- Edebiyat sorularÄ±nda dÃ¶nem, sanatÃ§Ä± ve eser bilgisini doÄŸrula.
- KullanÄ±cÄ± istemedikÃ§e aÅŸÄ±rÄ± uzun paragraf Ã¼retme.
- Soru kÃ¶kÃ¼nÃ¼ olumsuz yapÄ±yorsan "deÄŸildir", "Ã§Ä±karÄ±lamaz" veya "sÃ¶ylenemez" ifadesini gÃ¶rÃ¼nÃ¼r biÃ§imde kullan.
`.trim();
  }
  else if (subject.includes("tarih")) {
    subjectRules = `
TARÄ°H UZMANI:

- Kronoloji, neden-sonuÃ§, deÄŸiÅŸim-sÃ¼reklilik ve kavram bilgisini dengeli Ã¶lÃ§.
- Tarih, devlet, antlaÅŸma, kiÅŸi ve olay bilgilerini doÄŸrula.
- TartÄ±ÅŸmalÄ± tarih yorumlarÄ±nÄ± kesin bilgi gibi sunma.
- AynÄ± dÃ¶neme ait olmayan olaylarÄ± yanlÄ±ÅŸ biÃ§imde iliÅŸkilendirme.
- TYT sorularÄ±nda temel kavram ve yorum; AYT sorularÄ±nda dÃ¶nemler arasÄ± baÄŸlantÄ± ve kaynak yorumu kullan.
- Uzun ezber listeleri yerine olaylarÄ±n anlamÄ±nÄ± ve sonuÃ§larÄ±nÄ± Ã¶lÃ§.
- Cevap seÃ§enekleri aynÄ± dÃ¶nem ve baÄŸlam iÃ§inde mantÄ±klÄ± Ã§eldiriciler olsun.
- Kronoloji sorularÄ±nda tarih sÄ±rasÄ±nÄ± yeniden kontrol et.
- Bilgi kesin deÄŸilse uydurma ayrÄ±ntÄ± Ã¼retme.
`.trim();
  }
  else if (subject.includes("cografya")) {
    subjectRules = `
COÄžRAFYA UZMANI:

- Harita, grafik, tablo ve gÃ¼nlÃ¼k yaÅŸam yorumunu Ã¶ne Ã§Ä±kar.
- Åžekil olmadan Ã§Ã¶zÃ¼lemeyen soru Ã¼retme.
- Ã–lÃ§ek sorularÄ±nda birim dÃ¶nÃ¼ÅŸÃ¼mlerini iki kez kontrol et.
- Harita projeksiyonu, iklim, nÃ¼fus ve yer ÅŸekilleri sorularÄ±nda genellemeleri dikkatle kullan.
- "Her zaman", "kesinlikle" gibi ifadelerin istisnalarÄ±nÄ± kontrol et.
- TYT sorularÄ±nda temel harita ve Ã§evre yorumu; AYT sorularÄ±nda bÃ¶lgesel analiz ve baÄŸlantÄ± kurma kullan.
- Ezber bilgi yerine konum, daÄŸÄ±lÄ±ÅŸ, neden ve sonuÃ§ iliÅŸkisi Ã¶lÃ§.
- TÃ¼rkiye coÄŸrafyasÄ± verilerinde gÃ¼ncelliÄŸe baÄŸlÄ± sayÄ± kullanmak yerine kalÄ±cÄ± kavramlarÄ± tercih et.
`.trim();
  }
  else if (subject.includes("felsefe")) {
    subjectRules = `
FELSEFE UZMANI:

- KavramlarÄ± filozoflarÄ±n gÃ¶rÃ¼ÅŸleriyle doÄŸru eÅŸleÅŸtir.
- GÃ¶rÃ¼ÅŸleri aÅŸÄ±rÄ± genelleyerek veya birbirine karÄ±ÅŸtÄ±rarak sunma.
- ParÃ§ada verilen dÃ¼ÅŸÃ¼nceyi esas al; dÄ±ÅŸarÄ±dan gereksiz bilgi isteme.
- Ã‡eldiricileri yakÄ±n felsefi kavramlardan oluÅŸtur ancak yalnÄ±zca biri parÃ§aya tam uysun.
- Bilgi sorularÄ±nda dÃ¶nem, akÄ±m, filozof ve temel gÃ¶rÃ¼ÅŸÃ¼ doÄŸrula.
- Ã‡Ã¶zÃ¼mde kavramÄ±n ayÄ±rt edici Ã¶zelliÄŸini aÃ§Ä±kla.
`.trim();
  }
  else if (
    subject.includes("din") ||
    subject.includes("din kulturu")
  ) {
    subjectRules = `
DÄ°N KÃœLTÃœRÃœ UZMANI:

- TYT mÃ¼fredatÄ±ndaki kavram, deÄŸer ve temel bilgileri esas al.
- Mezhepsel veya tartÄ±ÅŸmalÄ± yorumlarÄ± kesin ve tek doÄŸru bilgi gibi sunma.
- Ayet veya hadis aktarÄ±mÄ±nda emin olunmayan ifadeyi doÄŸrudan alÄ±ntÄ± gibi yazma.
- SorularÄ± bilgi, anlam ve gÃ¼nlÃ¼k yaÅŸam baÄŸlantÄ±sÄ± Ã¼zerinden oluÅŸtur.
- KavramlarÄ± birbirine karÄ±ÅŸtÄ±rma.
- SaygÄ±lÄ±, tarafsÄ±z ve Ã¶ÄŸretici dil kullan.
`.trim();
  }
  else {
    subjectRules = `
GENEL DERS UZMANI:

- Konunun temel kazanÄ±mlarÄ±nÄ± belirle.
- Bilgi, uygulama ve yorum sorularÄ±nÄ± dengeli daÄŸÄ±t.
- MÃ¼fredat dÄ±ÅŸÄ± ayrÄ±ntÄ± ve tartÄ±ÅŸmalÄ± bilgi kullanma.
- Her soruyu baÄŸÄ±msÄ±z olarak Ã§Ã¶z ve doÄŸrula.
- Ã–ÄŸrencinin seviyesine uygun, aÃ§Ä±k ve doÄŸal dil kullan.
`.trim();
  }

  return [
    commonRules,
    subjectRules,
  ].join("\n\n");
}

function getStudentLevelRules(
  requestData: Record<string, unknown>,
): string {
  const rawLevel = String(
    requestData.level ??
    requestData.difficulty ??
    requestData.studentLevel ??
    requestData.gradeLevel ??
    "orta",
  )
    .toLocaleLowerCase("tr-TR")
    .trim();

  const rawQuestion = String(
    requestData.userQuestion ??
    requestData.message ??
    requestData.prompt ??
    "",
  ).toLocaleLowerCase("tr-TR");

  let level: "beginner" | "easy" | "medium" | "hard" | "advanced" =
    "medium";

  if (
    /baÅŸlangÄ±Ã§|temel|hiÃ§ bilmiyorum|sÄ±fÄ±rdan|yeni baÅŸladÄ±m/.test(
      rawLevel + " " + rawQuestion,
    )
  ) {
    level = "beginner";
  }
  else if (
    /kolay|basit/.test(rawLevel + " " + rawQuestion)
  ) {
    level = "easy";
  }
  else if (
    /Ã§ok zor|ileri|Ã¼st dÃ¼zey|derece/.test(
      rawLevel + " " + rawQuestion,
    )
  ) {
    level = "advanced";
  }
  else if (
    /zor|orta-zor|Ã¶sym ayarÄ±nda|Ã¶sym seviyesinde/.test(
      rawLevel + " " + rawQuestion,
    )
  ) {
    level = "hard";
  }

  const shared = `
Ã–ÄžRENCÄ° SEVÄ°YESÄ°NE UYARLAMA:

- AynÄ± konuyu her Ã¶ÄŸrenciye aynÄ± zorlukta anlatma.
- Ã–ÄŸrencinin isteÄŸindeki seviye ifadesini dikkate al.
- Bilinmeyen Ã¶n koÅŸullarÄ± kÄ±sa biÃ§imde hatÄ±rlat.
- Ã–ÄŸrenciyi gereksiz ayrÄ±ntÄ±yla boÄŸma.
- AnlatÄ±m ve soru zorluÄŸu birbiriyle uyumlu olsun.
- Ã‡Ã¶zÃ¼mde seviyeye uygun miktarda ara adÄ±m gÃ¶ster.
- Kolay soruyu yapay biÃ§imde uzatma.
- Zor soruda kritik dÃ¼ÅŸÃ¼nme adÄ±mlarÄ±nÄ± atlama.
- Soru setinde aynÄ± kazanÄ±mÄ± tekrar tekrar Ã¶lÃ§me.
- BeÅŸ soruluk bir sette mÃ¼mkÃ¼nse farklÄ± alt kazanÄ±mlar kullan.
`.trim();

  const rules = {
    beginner: `
BAÅžLANGIÃ‡ SEVÄ°YESÄ°:

- Konuya kÄ±sa tanÄ±m ve temel kavramlarla baÅŸla.
- Teknik terimi ilk kullanÄ±mda aÃ§Ä±kla.
- Tek adÄ±mlÄ± ve doÄŸrudan Ã¶rnekler kullan.
- Sorularda temel kazanÄ±mÄ± Ã¶lÃ§.
- GÃ¼Ã§lÃ¼ Ã§eldiriciler yerine Ã¶ÄŸretici ve ayÄ±rt edilebilir seÃ§enekler kullan.
- Ã‡Ã¶zÃ¼mde hiÃ§bir temel adÄ±mÄ± atlama.
- KullanÄ±cÄ± istemedikÃ§e ileri seviye istisna ekleme.
`.trim(),

    easy: `
KOLAY SEVÄ°YE:

- Temel bilgiyi kÄ±sa hatÄ±rlat.
- Bir veya iki adÄ±mlÄ± sorular Ã¼ret.
- GÃ¼nlÃ¼k yaÅŸam baÄŸlantÄ±sÄ± kullanÄ±labilir.
- Ã‡eldiriciler yaygÄ±n temel hatalara dayansÄ±n.
- Ã‡Ã¶zÃ¼m aÃ§Ä±k fakat gereksiz uzun olmasÄ±n.
`.trim(),

    medium: `
ORTA SEVÄ°YE:

- Temel bilgi ile yorum becerisini birlikte Ã¶lÃ§.
- Sorular iki kazanÄ±mÄ± iliÅŸkilendirebilir.
- Ã‡eldiriciler gerÃ§ek Ã¶ÄŸrenci hatalarÄ±na dayansÄ±n.
- Ã‡Ã¶zÃ¼mde kullanÄ±lan yÃ¶ntemin nedenini aÃ§Ä±kla.
- Soru setinde kolaydan zora doÄŸal geÃ§iÅŸ yap.
`.trim(),

    hard: `
ZOR SEVÄ°YE:

- Ezberden Ã§ok analiz, yorum ve baÄŸlantÄ± kurma Ã¶lÃ§.
- Sorunun zorluÄŸu uzun metinden deÄŸil dÃ¼ÅŸÃ¼nme gereksiniminden gelsin.
- YakÄ±n ve gÃ¼Ã§lÃ¼ Ã§eldiriciler kullan fakat belirsizlik oluÅŸturma.
- Ã‡ok adÄ±mlÄ± sorularda bÃ¼tÃ¼n verilerin gerekli olduÄŸundan emin ol.
- Ã‡Ã¶zÃ¼mde kritik karar noktalarÄ±nÄ± aÃ§Ä±kla.
- MÃ¼fredat dÄ±ÅŸÄ±na Ã§Ä±kmadan Ã–SYM dÃ¼zeyinde seÃ§icilik saÄŸla.
`.trim(),

    advanced: `
Ä°LERÄ° SEVÄ°YE:

- Konunun sÄ±nav kapsamÄ±ndaki en seÃ§ici baÄŸlantÄ±larÄ±nÄ± Ã¶lÃ§.
- Birden fazla kazanÄ±mÄ± doÄŸal biÃ§imde birleÅŸtir.
- Ã‡eldiriciler ileri dÃ¼zey kavram yanÄ±lgÄ±larÄ±na dayansÄ±n.
- Yine de yalnÄ±zca bir doÄŸru cevap bulunduÄŸunu kesin olarak doÄŸrula.
- Gereksiz Ã¼niversite dÃ¼zeyi bilgi kullanma.
- Ã‡Ã¶zÃ¼mde alternatif kontrol yÃ¶ntemi kullan.
`.trim(),
  } as const;

  return [
    shared,
    `ALGILANAN SEVÄ°YE: ${level.toUpperCase()}`,
    rules[level],
  ].join("\n\n");
}

function getAdaptiveTeachingRules(
  requestData: Record<string, unknown>,
): string {
  const requestText = String(
    requestData.userQuestion ??
    requestData.message ??
    requestData.prompt ??
    "",
  ).toLocaleLowerCase("tr-TR");

  const wantsShort =
    /kÄ±sa|Ã¶zet|Ã¶zetle|kÄ±saca|tek cÃ¼mle/.test(requestText);

  const wantsDetailed =
    /detaylÄ±|ayrÄ±ntÄ±lÄ±|adÄ±m adÄ±m|sÄ±fÄ±rdan|mantÄ±ÄŸÄ±yla/.test(
      requestText,
    );

  const wantsExamples =
    /Ã¶rnek|Ã¶rneklerle|uygulama|soru Ã§Ã¶z/.test(requestText);

  const wantsExamFocus =
    /Ã¶sym|tyt|ayt|sÄ±nav|deneme|Ã§Ä±kmÄ±ÅŸ soru|yeni nesil/.test(
      requestText,
    );

  const rules = `
UYARLANABÄ°LÄ°R Ã–ÄžRETÄ°M KURALLARI:

- Ã–ÄŸrencinin isteÄŸine doÄŸrudan cevap ver.
- Bilgiyi ezberletmek yerine neden-sonuÃ§ iliÅŸkisi kur.
- Yeni kavramÄ± bilinen bir kavramla iliÅŸkilendir.
- Ã–n koÅŸul bilgi gerekiyorsa en fazla 2 cÃ¼mleyle hatÄ±rlat.
- Bir kavramÄ± aÃ§Ä±klarken tanÄ±m, mantÄ±k ve uygulama sÄ±rasÄ±nÄ± koru.
- Ã–ÄŸrencinin sÄ±k yapabileceÄŸi kavram yanÄ±lgÄ±larÄ±nÄ± Ã¶nceden belirt.
- YanlÄ±ÅŸ bir yaklaÅŸÄ±mÄ± yalnÄ±zca "yanlÄ±ÅŸ" diye iÅŸaretleme; neden yanlÄ±ÅŸ olduÄŸunu aÃ§Ä±kla.
- AynÄ± konuyu tekrar anlatÄ±rken Ã¶nceki cevabÄ± birebir tekrarlama.
- KarmaÅŸÄ±k anlatÄ±mÄ± kÄ±sa parÃ§alara bÃ¶l.
- Her bÃ¶lÃ¼mde tek ana fikir kullan.
- Gereksiz emoji, sÃ¼s cÃ¼mlesi ve uzun motivasyon paragrafÄ± kullanma.
- Ã–ÄŸrenciye kÃ¼Ã§Ã¼mseyici, yargÄ±layÄ±cÄ± veya aÅŸÄ±rÄ± resmi dil kullanma.
- Emin olmadÄ±ÄŸÄ±n bilgiyi kesinmiÅŸ gibi sunma.
- MÃ¼fredat dÄ±ÅŸÄ± ayrÄ±ntÄ±yÄ± ana cevaba ekleme.
- CevabÄ±n baÅŸÄ±nda veya sonunda gereksiz boÅŸluk bÄ±rakma.
`.trim();

  const outputRules: string[] = [];

  if (wantsShort) {
    outputRules.push(`
KISA CEVAP MODU:
- En Ã¶nemli bilgiyi doÄŸrudan ver.
- Gereksiz baÅŸlÄ±k kullanma.
- En fazla 5 kÄ±sa madde veya 2 kÄ±sa paragraf kullan.
- KullanÄ±cÄ± istemedikÃ§e Ã¶rnek ve ayrÄ±ntÄ±lÄ± Ã§Ã¶zÃ¼m ekleme.
`.trim());
  }
  else if (wantsDetailed) {
    outputRules.push(`
DETAYLI Ã–ÄžRETÄ°M MODU:
- Konuyu sÄ±fÄ±rdan anlaÅŸÄ±labilir biÃ§imde kur.
- TanÄ±m, mantÄ±k, temel kurallar, Ã¶rnek ve sÄ±k hata sÄ±rasÄ±nÄ± kullan.
- Ã–nemli ara adÄ±mlarÄ± atlama.
- Her formÃ¼lÃ¼n veya kuralÄ±n ne zaman kullanÄ±ldÄ±ÄŸÄ±nÄ± aÃ§Ä±kla.
- Sonunda kÄ±sa tekrar Ã¶zeti ver.
`.trim());
  }
  else {
    outputRules.push(`
DENGELÄ° ANLATIM MODU:
- CevabÄ± yeterince aÃ§Ä±klayÄ±cÄ± fakat gereksiz uzun olmayacak ÅŸekilde yaz.
- Temel mantÄ±ÄŸÄ±, gerekli kuralÄ± ve kÄ±sa Ã¶rneÄŸi birlikte ver.
- Tekrar eden bÃ¶lÃ¼mler oluÅŸturma.
`.trim());
  }

  if (wantsExamples) {
    outputRules.push(`
Ã–RNEK ODAKLI MOD:
- En az bir doÄŸru ve Ã¶ÄŸretici Ã¶rnek kullan.
- Ã–rneÄŸin Ã§Ã¶zÃ¼mÃ¼nde kritik adÄ±mlarÄ± aÃ§Ä±kla.
- Ã–rnek ile anlatÄ±lan kuralÄ±n doÄŸrudan iliÅŸkili olmasÄ±nÄ± saÄŸla.
- Ã–rnek sonucunu kÄ±sa bir kontrolle doÄŸrula.
`.trim());
  }

  if (wantsExamFocus) {
    outputRules.push(`
SINAV ODAKLI MOD:
- Konunun TYT veya AYT'de nasÄ±l Ã¶lÃ§Ã¼ldÃ¼ÄŸÃ¼nÃ¼ belirt.
- Gereksiz akademik ayrÄ±ntÄ± yerine sÄ±nav kazanÄ±mÄ±na odaklan.
- SÄ±k yapÄ±lan sÄ±nav hatalarÄ±nÄ± aÃ§Ä±kla.
- Ã–SYM tarzÄ± soru Ã¼retirken uzunlukla deÄŸil dÃ¼ÅŸÃ¼nme gereksinimiyle seÃ§icilik saÄŸla.
- Ä°pucu verirken cevabÄ± ele verme.
`.trim());
  }

  return [
    rules,
    ...outputRules,
  ].join("\n\n");
}

function getNvidiaOptions(
  feature: AIFeature,
  requestData: Record<string, unknown>,
): NvidiaRequestOptions {
  if (isQuestionGenerationRequest(feature, requestData)) {
    return {
      temperature: 0.22,
      topP: 0.78,
      maxTokens: 4096,
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
        error: "GeÃƒÂ§ersiz istek.",
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
        error: "Desteklenmeyen AI ÃƒÂ¶zelliÃ„Å¸i.",
        feature,
      });
    }

    const parsed = aiFeatureRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: "GeÃƒÂ§ersiz istek.",
        details: parsed.error.flatten(),
      });
    }

    const requestTextForDeterministicQuiz = String(
      parsed.data.lastUserMessage ??
      parsed.data.userQuestion ??
      parsed.data.message ??
      parsed.data.prompt ??
      "",
    );

    const isDeDaQuizRequest =
      isQuestionGenerationRequest(feature, parsed.data) &&
      /de\s*(?:ve|\/)\s*da|de\/da|de-da/i.test(
        requestTextForDeterministicQuiz,
      );

    if (isDeDaQuizRequest) {
      return response.json({
        content:
          buildInstructionAwareDeDaResponse(
            requestTextForDeterministicQuiz,
          ),
        provider: "local_verified",
        model: "konutakip-de-da-v2",
        usage: null,
      });
    }

    let prompt = buildFeaturePrompt(feature, parsed.data);

    prompt = [
      prompt,
      getCurriculumHierarchyRules(
        parsed.data,
      ),
      getSubjectExpertRules(parsed.data),
      getStudentLevelRules(parsed.data),
      getAdaptiveTeachingRules(parsed.data),
    ]
      .filter(Boolean)
      .join("\n\n");

    if (
      feature === "teach-topic" &&
      isQuestionGenerationRequest(feature, parsed.data)
    ) {
      prompt = [
        prompt,
        TEACHER_QUESTION_GENERATION_RULES,
      ].join("\n\n");
    }

    const requestText = requestTextForDeterministicQuiz;

    if (
      isQuestionGenerationRequest(feature, parsed.data) &&
      /de\s*(?:ve|\/)\s*da|de\/da|de-da/i.test(requestText)
    ) {
      prompt = [
        prompt,
        DE_DA_QUESTION_RULES,
      ].join("\n\n");
    }

    console.log("[ROUTE] askNvidia baÃ…Å¸ladÃ„Â±");

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
          /de\s*(?:ve|\/)\s*da|de\/da|de-da/i.test(
            requestText,
          ),
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
