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
- Her çözümün son satırında "**Doğru cevap: X**" yaz.
- X yerine cevap anahtarındaki gerçek A-E harfini kullan.
- Cevap harfini yazmadan çözümü bitirme.

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

function isValidationSuccessful(
  validation: string,
): boolean {
  const normalized = String(
    validation ?? "",
  )
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/：/g, ":")
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
Aşağıdaki soru üretim isteğini sıfırdan yeniden hazırla.

Bu son ve en sıkı üretim turudur.

ORİJİNAL İSTEK:

${originalPrompt}

ÖNCEKİ HATALI TASLAK:

${previousAnswer}

DENETİM HATALARI:

${validation}

ZORUNLU KURALLAR:

- Önceki taslağı düzeltmeye çalışma; soruyu tamamen yeniden üret.
- İstenen soru sayısına tam uy.
- Her soru A, B, C, D ve E olmak üzere 5 seçenekli olsun.
- Her soruda tam olarak bir doğru cevap bulunsun.
- Bütün seçenekleri tek tek çözmeden cevabı gönderme.
- Cevap anahtarı ile çözüm birebir uyumlu olsun.
- Tartışmalı, istisnalı veya birden fazla yoruma açık soru kullanma.
- Şekil olmadan çözülemeyen soru üretme.
- Müfredat dışı ayrıntı kullanma.
- Soru zorluğunu uzunlukla değil düşünme gereksinimiyle oluştur.
- Cevabı soru kökünde ele verme.
- Çözümü kısa, doğru ve yeterli yaz.
- Her çözümün sonunda cevap anahtarındaki harfi "**Doğru cevap: X**" biçiminde yaz.
- Cevap harfi cevap anahtarıyla birebir aynı olmalıdır.
- Yalnızca nihai soruları göster.
- Denetim notlarını kullanıcıya gösterme.

MATEMATİK:
- Sonucu yeniden hesapla.
- Yüzde, kâr, indirim ve karışım oranlarının hangi değer üzerinden alındığını kontrol et.
- Geometri sorusunda verilenlerin tek sonuca yettiğini doğrula.
- Aynı sayısal değeri veren iki seçenek oluşturma.

FİZİK:
- TYT düzeyinde günlük yaşam, grafik ve temel yorum ağırlıklı soru üret.
- Kullanıcı özellikle istemedikçe eğik düzlem sürtünmesi, basit harmonik hareket veya ileri işlem kullanma.
- Yön, işaret, vektör ve birimleri kontrol et.
- Tam değer ile yaklaşık değeri iki farklı doğru seçenek hâline getirme.

KİMYA:
- TYT sorularında kompleks iyon, ileri denge veya tartışmalı moleküller arası etkileşim örnekleri kullanma.
- Atom, yük ve denklem denkliğini kontrol et.
- Redoks sorusunda bütün seçeneklerin yükseltgenme basamaklarını ayrı ayrı kontrol et.
- Birden fazla doğru tepkime oluşturma.

BİYOLOJİ:
- Salt ezber yerine kısa deney, gözlem veya neden-sonuç yorumu kullan.
- Organelleri yalnızca tek göreve sahipmiş gibi anlatma.
- Kloroplast ve mitokondride ATP üretimi gibi bilimsel ayrıntıları yanlış sınıflandırma.
- "Her zaman", "yalnızca" ve "kesinlikle" ifadelerini dikkatle kontrol et.

TÜRKÇE:
- Doğru cevap yalnızca metinden çıkarılabilsin.
- Yakın anlamlı iki seçenek birlikte doğru olmasın.
- Dil bilgisi sorularında bütün seçenekleri TDK kuralına göre kontrol et.

TARİH:
- Yalnızca doğruluğundan emin olduğun tarih, olay, kişi ve devlet bilgilerini kullan.
- Kronoloji sorusunda sıralamayı yeniden kontrol et.
- Tartışmalı yorumu kesin bilgi gibi sunma.
- Ezber ayrıntısı yerine neden-sonuç ve kavram bilgisi ölç.

COĞRAFYA:
- Ölçek ve birim dönüşümünü yeniden hesapla.
- Harita, yön ve projeksiyon sorularında genellemeleri kontrol et.
- Görsel olmadan çözülemeyen soru üretme.
- "Kuzey her zaman üsttedir" gibi istisnası bulunan genellemeleri kesin kural gibi kullanma.

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
Kısa ve doğrulanmış çözüm.
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
    /hedef seçenek sayısı\s*0\b/.test(normalized) ||
    /0 hedef seçenek\b/.test(normalized);

  const hasNoConcreteFault =
    /hatalı seçenek(?:ler)?\s*[-:]*\s*(?:yok|-|none)\b/.test(
      normalized,
    ) ||
    /issue:\s*none\b/.test(normalized) ||
    /hatalı seçenek yok\b/.test(normalized);

  return hasZeroTarget && hasNoConcreteFault;
}

function buildQuestionAdjudicationPrompt(
  originalPrompt: string,
  answer: string,
  previousValidation: string,
): string {
  return `
Sen önceki validatordan tamamen bağımsız son karar hakemisin.

ÖNCEKİ VALIDATOR KARARSIZ SONUÇ ÜRETTİ:

${previousValidation}

Bu sonuçta "0 hedef seçenek" denmesine rağmen somut hatalı seçenek
gösterilmemiş olabilir. Önceki karara güvenme.

ZORUNLU İŞLEM:

1. Soru kökünü dikkatle oku.
2. Soru "hangisi doğrudur" diyorsa doğru seçenekleri say.
3. Soru "hangisi yanlıştır" diyorsa yanlış seçenekleri say.
4. A, B, C, D ve E seçeneklerini bağımsız biçimde çöz.
5. Her seçeneğin neden doğru veya yanlış olduğunu içinden doğrula.
6. Cevap anahtarına güvenmeden kendi cevabını bul.
7. Kendi cevabını cevap anahtarıyla karşılaştır.
8. Çözümün kendi bulduğun cevabı desteklediğini kontrol et.
9. Bilimsel, matematiksel veya dil bilgisel hata varsa INVALID ver.
10. Tam olarak bir hedef seçenek varsa, cevap anahtarı ve çözüm de
    onunla uyumluysa VALID ver.
11. Emin değilsen VALID verme.

YANIT BİÇİMİ:

QUESTION 1
STEM_TARGET: TRUE veya FALSE
A: TRUE veya FALSE
B: TRUE veya FALSE
C: TRUE veya FALSE
D: TRUE veya FALSE
E: TRUE veya FALSE
STEM_TARGET: TRUE veya FALSE
TARGET_COUNT: sayı
INDEPENDENT_ANSWER: A-E
ANSWER_KEY_MATCH: YES veya NO
SOLUTION_MATCH: YES veya NO
ISSUE: NONE veya somut hata

En son yalnızca şu satırlardan biriyle bitir:

FINAL: VALID

veya

FINAL: INVALID
REASONS:
- Somut hata

ORİJİNAL İSTEK:

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
Aşağıdaki soru setini soruları üreten öğretmenden bağımsız,
çok sıkı bir YKS editörü olarak denetle.

ÖNEMLİ:
- Soru üretme.
- Yalnızca öğrenciyi yanlış yönlendirecek gerçek hatalarda INVALID kararı ver.
- Üslup, uzunluk, başlık, küçük ifade tercihi veya çeldirici gücü gibi küçük sorunlarda INVALID verme.
- Tek doğru cevap, bilimsel doğruluk, cevap anahtarı ve çözüm doğruysa FINAL: VALID ile bitir.
- Önce bütün soruları kendin çöz.
- Cevap anahtarına güvenme.
- Her seçeneği ayrı ayrı incele.
- Benzer görünen seçenekleri eş değerlik açısından kontrol et.
- Tam olarak bir doğru seçenek yoksa set geçersizdir.
- Bilimsel veya matematiksel olarak tartışmalı ifade varsa set geçersizdir.
- Müfredat dışı veya sınav türüne uygun olmayan soru varsa set geçersizdir.
- Çözüm yanlış, çelişkili veya cevap anahtarıyla uyumsuzsa set geçersizdir.
- Çözümün matematiksel, bilimsel veya mantıksal sonucu cevap anahtarıyla uyumlu olmalıdır.
- Çözüm sonunda bulunan "Doğru cevap: X" satırı cevap anahtarıyla aynı olmalıdır.
- Harf etiketi eksikse yalnızca biçim sorunu olarak belirt; çözüm ve cevap anahtarı doğruysa INVALID verme.
- Küçük anlatım ve biçim sorunlarını ISSUE alanına yaz fakat seti geçersiz sayma.

MATEMATİK:
- Her işlemi bağımsız yeniden yap.
- Yüzde, kâr, indirim ve karışım sorularında oranın hangi büyüklük üzerinden alındığını kontrol et.
- Birim, yuvarlama, tanım kümesi ve özel durumları kontrol et.
- Aynı değeri veren iki farklı seçenek bulunup bulunmadığını kontrol et.
- Geometri sorularında verilenlerin tek bir sonuca yetip yetmediğini kontrol et.

FİZİK:
- Net kuvvet, yön, işaret, vektör ve birimleri kontrol et.
- Yaklaşık değer ile tam değerin iki ayrı doğru seçenek oluşturup oluşturmadığını kontrol et.
- Şekil olmadan çözülemeyen soru varsa geçersiz say.
- TYT sorusunda gereksiz ileri düzey içerik varsa belirt.

KİMYA:
- Bütün seçeneklerde yükseltgenme basamaklarını ayrı ayrı kontrol et.
- Birden fazla redoks, çökelme veya doğru tepkime bulunup bulunmadığını kontrol et.
- Denklemde atom ve yük denkliğini kontrol et.
- TYT kapsamını aşan kompleks iyon veya ileri ayrıntıyı kontrol et.
- "Her zaman", "tümü" gibi genellemelerin istisnalarını kontrol et.

BİYOLOJİ:
- Organellerin birden fazla işlevi olabileceğini dikkate al.
- Kloroplastta ATP üretimi gibi bilimsel istisnaları kontrol et.
- "Kesinlikle", "yalnızca", "her zaman" ifadelerini kontrol et.
- Birden fazla doğru yoruma izin veren seçenek varsa geçersiz say.

TÜRKÇE VE EDEBİYAT:
- Doğru cevap yalnızca metinden çıkarılabilmeli.
- Yakın anlamlı iki seçeneğin birlikte doğru olup olmadığını kontrol et.
- Yazım ve dil bilgisi sorularında bütün seçenekleri ayrı ayrı çöz.
- Olumsuz soru kökünü ve cevap anahtarını kontrol et.

TARİH:
- Tarih, devlet, kişi, antlaşma ve olay eşleşmelerini kontrol et.
- Kronolojiyi bağımsız olarak sırala.
- Tartışmalı yorumu kesin bilgi gibi sunan soruyu geçersiz say.

COĞRAFYA:
- Ölçek ve birim dönüşümünü bağımsız hesapla.
- Projeksiyon, yön, izohips ve harita sembollerini kontrol et.
- Harita veya şekil olmadan çözülemeyen soruyu geçersiz say.
- Genellemelerin istisnalarını kontrol et.

ZORUNLU DENETİM ÇIKTISI:

QUESTION 1
A: TRUE veya FALSE
B: TRUE veya FALSE
C: TRUE veya FALSE
D: TRUE veya FALSE
E: TRUE veya FALSE
TARGET_COUNT: sayı
ANSWER_KEY_MATCH: YES veya NO
ISSUE: yoksa NONE, varsa kısa hata

Aynı düzeni bütün sorular için uygula.

En son mutlaka tek bir nihai karar ver.

Karar son satırda olmalıdır.
Karardan sonra hiçbir karakter veya açıklama yazma.
VALID ve INVALID kararlarını aynı yanıtta birlikte kullanma.

Yalnızca:

FINAL: VALID

veya

FINAL: INVALID
REASONS:
- Soru numarası: hata

ORİJİNAL İSTEK:

${originalPrompt}

DENETLENECEK SORULAR:

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
- Her düzeltilmiş çözümün son satırına "**Doğru cevap: X**" ekle.
- X harfi cevap anahtarıyla aynı olmalıdır.
- Denetim sonucunu kullanıcıya gösterme.
- Yalnızca düzeltilmiş nihai soruları üret.
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
    /^##\s+Cevap Anahtarı\s*$/im.test(
      normalized,
    );

  const hasSolutionsHeading =
    /^##\s+Çözümler\s*$/im.test(
      normalized,
    );

  /*
   * Seçenekler şu biçimlerin tamamında algılanır:
   *
   * A) Metin
   * **A)** Metin
   * - A) Metin
   * • **A.** Metin
   * A - Metin
   * A) ... B) ... C) ... aynı satır
   */
  let optionScanText = normalized;

  const lineOptionPattern =
    /^(?:\s*[-•*]\s*)?(?:\*\*)?\s*([A-E])\s*(?:\*\*)?\s*[).:\-]\s*.+$/gim;

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
     * Model seçenekleri tek satırda döndürdüyse her seçenek
     * etiketinin önüne gerçek satır sonu ekle.
     *
     * Yalnız A-E etiketi ve hemen arkasında ayraç bulunan
     * kalıplara dokunulur; normal metindeki harfler etkilenmez.
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
      /(?:doğru\s*cevap|cevap)\s*[:\-]\s*\**([A-E])\b/gi,
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
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\d+\.\s*Soru\s*)?(?:Çözümü|Çözüm|Çözümler)\b/im.test(
      normalized,
    );

  const hasReasoningText =
    /çünkü|bu nedenle|dolayısıyla|formül|kural|hesaplanır|bulunur|elde edilir|açıklanır|göre|sonuç olarak/i.test(
      normalized,
    );

  const hasExplicitAnswer =
    /doğru\s*cevap\s*[:\-]\s*\**[A-E]\b/i.test(
      normalized,
    );

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
      /^##\s+Cevap Anahtarı\s*$/im,
    );

  if (answerKeyParts.length < 2) {
    return normalized;
  }

  const answerKeyBlock =
    answerKeyParts[1]
      ?.split(/^##\s+Çözümler\s*$/im)[0] ?? "";

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
      /^##\s+Çözümler\s*$/im,
    );

  if (solutionParts.length < 2) {
    return normalized;
  }

  const beforeSolutions =
    solutionParts[0].trimEnd();

  const solutionArea =
    solutionParts
      .slice(1)
      .join("\n## Çözümler\n");

  const headings = [
    ...solutionArea.matchAll(
      /^###\s+(\d+)\.\s+Soru Çözümü\s*$/gim,
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
      !/doğru\s+cevap\s*:\s*[A-E]\b/i.test(
        section,
      )
    ) {
      section =
        section.trimEnd() +
        "\n\n**Doğru cevap: " +
        answerLetter +
        "**\n";
    }

    rebuilt += section;
  }

  return (
    beforeSolutions +
    "\n\n## Çözümler\n\n" +
    rebuilt.trim()
  )
    .replace(/\n{3,}/g, "\n\n")
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
   * Model veya taşıma katmanı bazen gerçek satır sonu yerine
   * metin olarak \\n döndürüyor. Yalnız satır/sekme kaçışlarını
   * çözüyoruz; matematiksel ters eğik çizgilere dokunmuyoruz.
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
   * JSON string biçiminde sarılmış tek bir cevap geldiyse,
   * güvenli şekilde string değerini aç.
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
      // Normal metin işlemine devam et.
    }
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
      /^\s*#{1,6}\s*(?:cevaplar|cevap anahtarı|cevap anahtari)\s*:?\s*$/gim,
      "## Cevap Anahtarı",
    )
    .replace(
      /^\s*(?:cevaplar|cevap anahtarı|cevap anahtari)\s*:?\s*$/gim,
      "## Cevap Anahtarı",
    )
    .replace(
      /^\s*#{1,6}\s*(?:çözüm|çözümler|cozum|cozumler)\s*:?\s*$/gim,
      "## Çözümler",
    )
    .replace(
      /^\s*(?:çözüm|çözümler|cozum|cozumler)\s*:?\s*$/gim,
      "## Çözümler",
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
      /^\s*#{1,6}\s*(\d+)\.\s*Soru\s*Çözümü\s*:?\s*$/gim,
      "### $1. Soru Çözümü",
    )
    .replace(
      /^\s*Soru\s+(\d+)\s*Çözümü\s*:?\s*$/gim,
      "### $1. Soru Çözümü",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  /*
   * Aynı satırdaki A-E seçeneklerini standart satırlara ayır.
   * Markdown kalın işaretleri ve madde işaretleri korunabilir;
   * yapı analiz motoru bunları okuyabilir.
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
    /^##\s+Cevap Anahtarı\s*$/im.test(normalized) &&
    /^##\s+Çözümler\s*$/im.test(normalized);

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
    /doğru\s*cevap\s*[:\-]\s*\**([A-E])\b/i,
    /cevap\s*anahtarı[\s\S]{0,100}?\b1\s*[.)\-:]\s*\**([A-E])\b/i,
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
      /(?:^|\n)\s*(?:#{1,6}\s*)?(?:çözüm|çözümler|cozum|cozumler|1\.\s*soru\s*çözümü)\s*:?\s*(?:\n|$)/i,
    );

  let solutionText = "";

  if (solutionMarker !== -1) {
    solutionText =
      normalized
        .slice(solutionMarker)
        .replace(
          /^\s*(?:#{1,6}\s*)?(?:çözüm|çözümler|cozum|cozumler|1\.\s*soru\s*çözümü)\s*:?\s*/i,
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
          /(?:^|\n)\s*(?:cevap|cevap anahtarı|doğru cevap)\s*[:\-]?[\s\S]{0,30}?\b[A-E]\b/i,
          "",
        )
        .trim();
    }
  }

  if (!solutionText) {
    solutionText =
      "Doğru seçenek, soru kökü ve seçenekler karşılaştırılarak belirlenir.";
  }

  if (
    !/doğru\s*cevap\s*:\s*[A-E]\b/i.test(
      solutionText,
    )
  ) {
    solutionText =
      solutionText.trimEnd() +
      `\n\n**Doğru cevap: ${answerLetter}**`;
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
    "## Cevap Anahtarı",
    "",
    `1. ${answerLetter}`,
    "",
    "## Çözümler",
    "",
    "### 1. Soru Çözümü",
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

  throw new Error(
    [
      "Soru seti üç bağımsız kalite kontrolünden geçemedi.",
      "Hatalı soru kullanıcıya gösterilmedi.",
      `Son denetim sonucu: ${finalReason}`,
      `Yapısal kontrol: ${structureReason}`,
    ].join(" "),
  );
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

function getRequestedQuestionCount(
  requestText: string,
): number {
  const normalized = requestText
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
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
  return /kural(?:i|ını|ini)?\s*(?:anlat|acikla)|anlat(?:ir|im)?|acikla|ogret|karsilastir/i.test(
    requestText
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c"),
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
    /## Sorular\s*\n([\s\S]*?)\n## Cevap Anahtarı/,
  );

  const answersMatch = fullQuiz.match(
    /## Cevap Anahtarı\s*\n([\s\S]*?)\n## Çözümler/,
  );

  const solutionsMatch = fullQuiz.match(
    /## Çözümler\s*\n([\s\S]*)$/,
  );

  if (
    !questionsMatch ||
    !answersMatch ||
    !solutionsMatch
  ) {
    throw new Error(
      "Yerel de/da soru paketi ayrıştırılamadı",
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
      "Soru Çözümü",
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
      "İstenen sayıda de/da sorusu seçilemedi",
    );
  }

  if (
    solutionBlocks.length !== requestedCount
  ) {
    throw new Error(
      "İstenen sayıda de/da çözümü seçilemedi",
    );
  }

  const explanation =
    shouldExplainDeDaRule(requestText)
      ? `## Kural Anlatımı

Bağlaç olan **de/da** cümleye ekleme anlamı katar ve ayrı yazılır. Cümleden çıkarıldığında temel anlam büyük ölçüde korunur:

- Ben **de** geleceğim.
- O **da** kitabı okudu.

Bulunma hâl eki olan **-de/-da/-te/-ta** yer, zaman veya bulunma anlamı verir ve kelimeye bitişik yazılır:

- Ev**de**
- Park**ta**
- Ankara'**da**

Bağlaç olan de/da hiçbir zaman te/ta biçimine dönüşmez. Özel adlara gelen bulunma hâl eki ise kesme işaretiyle ayrılır.

`
      : "";

  return [
    explanation.trim(),
    "## Sorular",
    "",
    questionBlocks.join("\n\n"),
    "",
    "## Cevap Anahtarı",
    "",
    answerLines.join("\n"),
    "",
    "## Çözümler",
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
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
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
    /MÜFREDAT BAĞLAMI:|KAZANIM DURUMU:|Alt kazanımlar:|Eksikler:/i.test(
      requestText,
    );

  if (!hasCurriculumContext && !topicName) {
    return "";
  }

  return `
ANA KONU VE ALT KAZANIM KURALLARI:

- Ders: ${subjectName || "Belirtilmedi"}
- Ana konu: ${topicName || "Kullanıcı mesajından belirle"}
- MÜFREDAT BAĞLAMI içindeki ana konu ve alt kazanımları temel kapsam kabul et.
- Kullanıcının özellikle sorduğu alt kazanımı önce ele al.
- Konu anlatımını ve soru üretimini ilgili kazanım sınırında tut.
- Soru üretirken ölçülen alt kazanımı sessizce belirle.
- ALT KAZANIM TYT SINIRI: TYT isteğinde AYT'ye ait yöntem, kavram veya çözüm tekniğini kullanıcı açıkça istemedikçe kullanma.
- Özellikle TYT Üslü İfadeler konusunda logaritma yöntemini önerme; üs kuralları ve taban eşitleme kullan.
- Çeldiricileri ilgili kazanımdaki gerçek kavram yanılgılarından üret.
- Çözümde kullanılan ana konu ve alt kazanım mantığını açıkla.
- AI Koç isteklerinde tamamlanmamış alt kazanımları önceliklendir.
- Tamamlanan kazanımları gereksiz yere yeniden ana hedef yapma.
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

- Öğrencinin seviyesine uygun, anlaşılır ve öğretici ol.
- TYT ve AYT kapsamını birbirine karıştırma.
- İstek TYT ise kullanıcı açıkça istemedikçe logaritma, türev, integral, ileri trigonometri, limit veya başka AYT yöntemlerini çözüm ve çalışma tekniği olarak önerme.
- TYT Üslü İfadeler ve Üslü Denklemler çalışmalarında yalnızca üs kuralları, taban eşitleme, ortak üs, çarpanlara ayırma ve TYT düzeyindeki cebirsel yöntemleri kullan.
- Bir TYT kazanımı daha ileri bir yöntemle çözülebiliyor olsa bile öğrenciyi müfredat dışı yönteme yönlendirme.
- AI Koç çalışma planında önerilen her yöntem, ilgili sınav türü ve listelenen alt kazanımla doğrudan uyumlu olmalıdır.
- Sorular kazanım ölçsün; yalnızca ezber veya işlem kalabalığı oluşturmasın.
- Her soruda tam olarak bir doğru cevap bulunsun.
- Soruyu göndermeden önce sessizce çöz ve bütün seçenekleri kontrol et.
- Çeldiricileri öğrencilerin gerçek hata türlerinden üret.
- Gereksiz zorlaştırma, tartışmalı bilgi ve müfredat dışı ayrıntı kullanma.
- Kolay sorularda temel kazanımı, orta sorularda iki kazanımı, zor sorularda yorum ve bağlantı kurmayı ölç.
- Çözümde yalnızca doğru cevabı değil, kullanılan mantığı da açıkla.
- Gereksiz uzun çözüm ve aynı bilginin tekrarından kaçın.
- Öğrencinin isteği soru üretmekse cevap anahtarı ve çözümleri sorulardan sonra ayrı bölümlerde ver.
- Öğrencinin isteği konu anlatımıysa önce temel mantığı, sonra kuralları, ardından örnek ve sık hataları açıkla.
- Kullanıcının istemediği ileri seviye ayrıntıları ana anlatıma ekleme.
- Konu: ${topic || "Belirtilmedi"}
- Sınav türü: ${examType}
`.trim();

  let subjectRules = "";

  if (
    subject.includes("matematik") ||
    subject.includes("geometri")
  ) {
    subjectRules = `
MATEMATİK VE GEOMETRİ UZMANI:

- İşlem ezberinden çok problem çözme, akıl yürütme ve modelleme becerisini ölç.
- Yeni nesil sorularda gereksiz uzun hikâye kullanma.
- Verilen bilgilerin tamamı gerekli ve tutarlı olsun.
- Sayısal sonucu bağımsız olarak yeniden hesapla.
- Mümkünse ters işlem, yerine koyma veya farklı yöntemle doğrula.
- Tanım kümesi, işaret, birim, özel durum ve yaklaşık değerleri kontrol et.
- Geometri sorularında şekil yoksa bütün geometrik bilgileri açıkça yaz.
- Şekle bağlı ama şekilsiz çözülemeyen soru üretme.
- TYT sorularında temel kavram ve yorum; AYT sorularında fonksiyonel düşünme ve bağlantı kurma öne çıksın.
- Problemler sorularında gerçekçi sayılar kullan ve sonuçların seçeneklerde tam karşılığını ver.
- Yuvarlama gerekiyorsa soru kökünde açıkça belirt.
`.trim();
  }
  else if (subject.includes("fizik")) {
    subjectRules = `
FİZİK UZMANI:

- Formül ezberinden çok fiziksel yorum, grafik okuma ve günlük yaşam bağlantısı ölç.
- TYT düzeyinde gereksiz üniversite fiziği ayrıntısı kullanma.
- AYT düzeyinde kavramlar arası bağlantı ve çok adımlı yorum kullan.
- Kuvvet yönü, işaret, referans noktası, birim ve vektörel büyüklükleri kontrol et.
- Sürtünme, eğik düzlem, elektrik ve hareket sorularında bütün gerekli bilgileri ver.
- Şekil olmadan çözülemeyen soru üretme; şekil gerekiyorsa durumu metinle eksiksiz tanımla.
- Sonucu fiziksel mantıkla da kontrol et.
- Aynı soruda birden fazla fiziksel yorumun doğru olmasına izin verme.
- Çözümlerde önce kavramı, sonra işlemi açıkla.
`.trim();
  }
  else if (subject.includes("kimya")) {
    subjectRules = `
KİMYA UZMANI:

- TYT ve AYT kimya kapsamını ayır.
- Tepkime, çözünürlük, periyodik özellik ve bağ sorularında bilimsel doğruluğu kontrol et.
- Denklem kullanılıyorsa atom ve yük denkliğini doğrula.
- Çözünürlük, asit-baz ve redoks sorularında istisnaları gözden geçir.
- Birden fazla doğru cevap doğurabilecek genel ifadeler kullanma.
- Kompleks iyon, ileri organik kimya veya üniversite düzeyi ayrıntıları TYT sorularına gereksiz yere ekleme.
- Günlük yaşam örneklerini bilimsel olarak doğru ve müfredata uygun seç.
- Çözümlerde kavramı açıklamadan yalnızca ezber kural yazma.
- Şıklardaki bileşik, iyon ve tepkime gösterimlerini kontrol et.
`.trim();
  }
  else if (subject.includes("biyoloji")) {
    subjectRules = `
BİYOLOJİ UZMANI:

- Salt ezber yerine bilgi, yorum, karşılaştırma ve neden-sonuç ilişkisini birlikte ölç.
- Kesinlik bildiren "her zaman", "yalnızca", "tüm canlılar" gibi ifadeleri dikkatle kontrol et.
- Canlı grupları, organeller, metabolizma ve genetik konularındaki istisnaları gözden geçir.
- TYT sorularında temel biyoloji ve günlük yaşam bağlantısı; AYT sorularında sistemler arası ilişki ve deney yorumu kullan.
- Grafik veya deney sorusunda değişkenleri açıkça tanımla.
- Şekil olmadan çözülemeyen soru üretme.
- Organelleri tek işlevle sınırlandıran yanıltıcı ve bilimsel açıdan eksik ifadelerden kaçın.
- Çözümde diğer seçeneklerin neden uygun olmadığını kısa biçimde açıkla.
`.trim();
  }
  else if (
    subject.includes("turkce") ||
    subject.includes("edebiyat")
  ) {
    subjectRules = `
TÜRKÇE VE EDEBİYAT UZMANI:

- Yazım ve dil bilgisi sorularında bütün seçenekleri TDK kurallarına göre tek tek kontrol et.
- Birden fazla doğru cevap doğurabilecek tartışmalı örnek kullanma.
- Paragraf sorularında doğru cevap metinden çıkarılabilir olsun.
- Çeldiriciler metindeki yakın anlamlardan oluşsun ancak yalnızca biri tam karşılık versin.
- Paragrafları doğal, özgün ve yaş grubuna uygun yaz.
- Ana düşünce, yardımcı düşünce, çıkarım ve sözcük anlamını birbirine karıştırma.
- Edebiyat sorularında dönem, sanatçı ve eser bilgisini doğrula.
- Kullanıcı istemedikçe aşırı uzun paragraf üretme.
- Soru kökünü olumsuz yapıyorsan "değildir", "çıkarılamaz" veya "söylenemez" ifadesini görünür biçimde kullan.
`.trim();
  }
  else if (subject.includes("tarih")) {
    subjectRules = `
TARİH UZMANI:

- Kronoloji, neden-sonuç, değişim-süreklilik ve kavram bilgisini dengeli ölç.
- Tarih, devlet, antlaşma, kişi ve olay bilgilerini doğrula.
- Tartışmalı tarih yorumlarını kesin bilgi gibi sunma.
- Aynı döneme ait olmayan olayları yanlış biçimde ilişkilendirme.
- TYT sorularında temel kavram ve yorum; AYT sorularında dönemler arası bağlantı ve kaynak yorumu kullan.
- Uzun ezber listeleri yerine olayların anlamını ve sonuçlarını ölç.
- Cevap seçenekleri aynı dönem ve bağlam içinde mantıklı çeldiriciler olsun.
- Kronoloji sorularında tarih sırasını yeniden kontrol et.
- Bilgi kesin değilse uydurma ayrıntı üretme.
`.trim();
  }
  else if (subject.includes("cografya")) {
    subjectRules = `
COĞRAFYA UZMANI:

- Harita, grafik, tablo ve günlük yaşam yorumunu öne çıkar.
- Şekil olmadan çözülemeyen soru üretme.
- Ölçek sorularında birim dönüşümlerini iki kez kontrol et.
- Harita projeksiyonu, iklim, nüfus ve yer şekilleri sorularında genellemeleri dikkatle kullan.
- "Her zaman", "kesinlikle" gibi ifadelerin istisnalarını kontrol et.
- TYT sorularında temel harita ve çevre yorumu; AYT sorularında bölgesel analiz ve bağlantı kurma kullan.
- Ezber bilgi yerine konum, dağılış, neden ve sonuç ilişkisi ölç.
- Türkiye coğrafyası verilerinde güncelliğe bağlı sayı kullanmak yerine kalıcı kavramları tercih et.
`.trim();
  }
  else if (subject.includes("felsefe")) {
    subjectRules = `
FELSEFE UZMANI:

- Kavramları filozofların görüşleriyle doğru eşleştir.
- Görüşleri aşırı genelleyerek veya birbirine karıştırarak sunma.
- Parçada verilen düşünceyi esas al; dışarıdan gereksiz bilgi isteme.
- Çeldiricileri yakın felsefi kavramlardan oluştur ancak yalnızca biri parçaya tam uysun.
- Bilgi sorularında dönem, akım, filozof ve temel görüşü doğrula.
- Çözümde kavramın ayırt edici özelliğini açıkla.
`.trim();
  }
  else if (
    subject.includes("din") ||
    subject.includes("din kulturu")
  ) {
    subjectRules = `
DİN KÜLTÜRÜ UZMANI:

- TYT müfredatındaki kavram, değer ve temel bilgileri esas al.
- Mezhepsel veya tartışmalı yorumları kesin ve tek doğru bilgi gibi sunma.
- Ayet veya hadis aktarımında emin olunmayan ifadeyi doğrudan alıntı gibi yazma.
- Soruları bilgi, anlam ve günlük yaşam bağlantısı üzerinden oluştur.
- Kavramları birbirine karıştırma.
- Saygılı, tarafsız ve öğretici dil kullan.
`.trim();
  }
  else {
    subjectRules = `
GENEL DERS UZMANI:

- Konunun temel kazanımlarını belirle.
- Bilgi, uygulama ve yorum sorularını dengeli dağıt.
- Müfredat dışı ayrıntı ve tartışmalı bilgi kullanma.
- Her soruyu bağımsız olarak çöz ve doğrula.
- Öğrencinin seviyesine uygun, açık ve doğal dil kullan.
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
    /başlangıç|temel|hiç bilmiyorum|sıfırdan|yeni başladım/.test(
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
    /çok zor|ileri|üst düzey|derece/.test(
      rawLevel + " " + rawQuestion,
    )
  ) {
    level = "advanced";
  }
  else if (
    /zor|orta-zor|ösym ayarında|ösym seviyesinde/.test(
      rawLevel + " " + rawQuestion,
    )
  ) {
    level = "hard";
  }

  const shared = `
ÖĞRENCİ SEVİYESİNE UYARLAMA:

- Aynı konuyu her öğrenciye aynı zorlukta anlatma.
- Öğrencinin isteğindeki seviye ifadesini dikkate al.
- Bilinmeyen ön koşulları kısa biçimde hatırlat.
- Öğrenciyi gereksiz ayrıntıyla boğma.
- Anlatım ve soru zorluğu birbiriyle uyumlu olsun.
- Çözümde seviyeye uygun miktarda ara adım göster.
- Kolay soruyu yapay biçimde uzatma.
- Zor soruda kritik düşünme adımlarını atlama.
- Soru setinde aynı kazanımı tekrar tekrar ölçme.
- Beş soruluk bir sette mümkünse farklı alt kazanımlar kullan.
`.trim();

  const rules = {
    beginner: `
BAŞLANGIÇ SEVİYESİ:

- Konuya kısa tanım ve temel kavramlarla başla.
- Teknik terimi ilk kullanımda açıkla.
- Tek adımlı ve doğrudan örnekler kullan.
- Sorularda temel kazanımı ölç.
- Güçlü çeldiriciler yerine öğretici ve ayırt edilebilir seçenekler kullan.
- Çözümde hiçbir temel adımı atlama.
- Kullanıcı istemedikçe ileri seviye istisna ekleme.
`.trim(),

    easy: `
KOLAY SEVİYE:

- Temel bilgiyi kısa hatırlat.
- Bir veya iki adımlı sorular üret.
- Günlük yaşam bağlantısı kullanılabilir.
- Çeldiriciler yaygın temel hatalara dayansın.
- Çözüm açık fakat gereksiz uzun olmasın.
`.trim(),

    medium: `
ORTA SEVİYE:

- Temel bilgi ile yorum becerisini birlikte ölç.
- Sorular iki kazanımı ilişkilendirebilir.
- Çeldiriciler gerçek öğrenci hatalarına dayansın.
- Çözümde kullanılan yöntemin nedenini açıkla.
- Soru setinde kolaydan zora doğal geçiş yap.
`.trim(),

    hard: `
ZOR SEVİYE:

- Ezberden çok analiz, yorum ve bağlantı kurma ölç.
- Sorunun zorluğu uzun metinden değil düşünme gereksiniminden gelsin.
- Yakın ve güçlü çeldiriciler kullan fakat belirsizlik oluşturma.
- Çok adımlı sorularda bütün verilerin gerekli olduğundan emin ol.
- Çözümde kritik karar noktalarını açıkla.
- Müfredat dışına çıkmadan ÖSYM düzeyinde seçicilik sağla.
`.trim(),

    advanced: `
İLERİ SEVİYE:

- Konunun sınav kapsamındaki en seçici bağlantılarını ölç.
- Birden fazla kazanımı doğal biçimde birleştir.
- Çeldiriciler ileri düzey kavram yanılgılarına dayansın.
- Yine de yalnızca bir doğru cevap bulunduğunu kesin olarak doğrula.
- Gereksiz üniversite düzeyi bilgi kullanma.
- Çözümde alternatif kontrol yöntemi kullan.
`.trim(),
  } as const;

  return [
    shared,
    `ALGILANAN SEVİYE: ${level.toUpperCase()}`,
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
    /kısa|özet|özetle|kısaca|tek cümle/.test(requestText);

  const wantsDetailed =
    /detaylı|ayrıntılı|adım adım|sıfırdan|mantığıyla/.test(
      requestText,
    );

  const wantsExamples =
    /örnek|örneklerle|uygulama|soru çöz/.test(requestText);

  const wantsExamFocus =
    /ösym|tyt|ayt|sınav|deneme|çıkmış soru|yeni nesil/.test(
      requestText,
    );

  const rules = `
UYARLANABİLİR ÖĞRETİM KURALLARI:

- Öğrencinin isteğine doğrudan cevap ver.
- Bilgiyi ezberletmek yerine neden-sonuç ilişkisi kur.
- Yeni kavramı bilinen bir kavramla ilişkilendir.
- Ön koşul bilgi gerekiyorsa en fazla 2 cümleyle hatırlat.
- Bir kavramı açıklarken tanım, mantık ve uygulama sırasını koru.
- Öğrencinin sık yapabileceği kavram yanılgılarını önceden belirt.
- Yanlış bir yaklaşımı yalnızca "yanlış" diye işaretleme; neden yanlış olduğunu açıkla.
- Aynı konuyu tekrar anlatırken önceki cevabı birebir tekrarlama.
- Karmaşık anlatımı kısa parçalara böl.
- Her bölümde tek ana fikir kullan.
- Gereksiz emoji, süs cümlesi ve uzun motivasyon paragrafı kullanma.
- Öğrenciye küçümseyici, yargılayıcı veya aşırı resmi dil kullanma.
- Emin olmadığın bilgiyi kesinmiş gibi sunma.
- Müfredat dışı ayrıntıyı ana cevaba ekleme.
- Cevabın başında veya sonunda gereksiz boşluk bırakma.
`.trim();

  const outputRules: string[] = [];

  if (wantsShort) {
    outputRules.push(`
KISA CEVAP MODU:
- En önemli bilgiyi doğrudan ver.
- Gereksiz başlık kullanma.
- En fazla 5 kısa madde veya 2 kısa paragraf kullan.
- Kullanıcı istemedikçe örnek ve ayrıntılı çözüm ekleme.
`.trim());
  }
  else if (wantsDetailed) {
    outputRules.push(`
DETAYLI ÖĞRETİM MODU:
- Konuyu sıfırdan anlaşılabilir biçimde kur.
- Tanım, mantık, temel kurallar, örnek ve sık hata sırasını kullan.
- Önemli ara adımları atlama.
- Her formülün veya kuralın ne zaman kullanıldığını açıkla.
- Sonunda kısa tekrar özeti ver.
`.trim());
  }
  else {
    outputRules.push(`
DENGELİ ANLATIM MODU:
- Cevabı yeterince açıklayıcı fakat gereksiz uzun olmayacak şekilde yaz.
- Temel mantığı, gerekli kuralı ve kısa örneği birlikte ver.
- Tekrar eden bölümler oluşturma.
`.trim());
  }

  if (wantsExamples) {
    outputRules.push(`
ÖRNEK ODAKLI MOD:
- En az bir doğru ve öğretici örnek kullan.
- Örneğin çözümünde kritik adımları açıkla.
- Örnek ile anlatılan kuralın doğrudan ilişkili olmasını sağla.
- Örnek sonucunu kısa bir kontrolle doğrula.
`.trim());
  }

  if (wantsExamFocus) {
    outputRules.push(`
SINAV ODAKLI MOD:
- Konunun TYT veya AYT'de nasıl ölçüldüğünü belirt.
- Gereksiz akademik ayrıntı yerine sınav kazanımına odaklan.
- Sık yapılan sınav hatalarını açıkla.
- ÖSYM tarzı soru üretirken uzunlukla değil düşünme gereksinimiyle seçicilik sağla.
- İpucu verirken cevabı ele verme.
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
