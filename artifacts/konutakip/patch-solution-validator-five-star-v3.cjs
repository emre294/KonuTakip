const fs = require("fs");

const path = "./backend/src/routes/ai.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/* =========================================================
 * 1. VALIDATOR KARAR OKUMASINI KESINLESTIR
 * ========================================================= */

const validationStart = code.indexOf(
  "function isValidationSuccessful("
);

const validationEnd = code.indexOf(
  "function buildFinalSafeQuestionPrompt(",
  validationStart,
);

ensure(
  validationStart !== -1,
  "isValidationSuccessful bulunamadi",
);

ensure(
  validationEnd !== -1,
  "isValidationSuccessful bitisi bulunamadi",
);

const validationFunction = `function isValidationSuccessful(
  validation: string,
): boolean {
  const normalized = validation
    .replace(/^\\uFEFF/, "")
    .replace(/[\\u200B-\\u200D\\u2060]/g, "")
    .replace(/：/g, ":")
    .replace(/\\r\\n/g, "\\n")
    .replace(/[\\*_\\x60]/g, "")
    .trim();

  const verdictMatches = [
    ...normalized.matchAll(
      /(?:^|\\n)\\s*(?:FINAL\\s*:\\s*)?(VALID|INVALID)\\s*(?=\\n|$)/gi,
    ),
  ];

  if (verdictMatches.length === 0) {
    return false;
  }

  const lastVerdict =
    verdictMatches[
      verdictMatches.length - 1
    ][1].toUpperCase();

  return lastVerdict === "VALID";
}

`;

code =
  code.slice(0, validationStart) +
  validationFunction +
  code.slice(validationEnd);

/* =========================================================
 * 2. COZUM SONUNA CEVAP HARFI EKLEYEN MOTOR
 * ========================================================= */

if (!code.includes("function ensureSolutionAnswerLabels(")) {
  const marker =
    "async function generateVerifiedQuestionAnswer(";

  const markerIndex = code.indexOf(marker);

  ensure(
    markerIndex !== -1,
    "generateVerifiedQuestionAnswer bulunamadi",
  );

  const helper = `function ensureSolutionAnswerLabels(
  answer: string,
): string {
  const normalized = answer
    .replace(/\\r\\n/g, "\\n")
    .trim();

  const answerKeyParts =
    normalized.split(
      /^##\\s+Cevap Anahtarı\\s*$/im,
    );

  if (answerKeyParts.length < 2) {
    return normalized;
  }

  const answerKeyBlock =
    answerKeyParts[1]
      ?.split(/^##\\s+Çözümler\\s*$/im)[0] ?? "";

  const answerMap = new Map<string, string>();

  for (
    const match of answerKeyBlock.matchAll(
      /^\\s*(\\d+)[.)]\\s*([A-E])\\s*$/gim,
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
      /^##\\s+Çözümler\\s*$/im,
    );

  if (solutionParts.length < 2) {
    return normalized;
  }

  const beforeSolutions =
    solutionParts[0].trimEnd();

  const solutionArea =
    solutionParts.slice(1).join(
      "\\n## Çözümler\\n",
    );

  const headings = [
    ...solutionArea.matchAll(
      /^###\\s+(\\d+)\\.\\s+Soru Çözümü\\s*$/gim,
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
      !/doğru\\s+cevap\\s*:\\s*[A-E]\\b/i.test(
        section,
      )
    ) {
      section =
        section.trimEnd() +
        "\\n\\n**Doğru cevap: " +
        answerLetter +
        "**\\n";
    }

    rebuilt += section;
  }

  return (
    beforeSolutions +
    "\\n\\n## Çözümler\\n\\n" +
    rebuilt.trim()
  )
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();
}

`;

  code =
    code.slice(0, markerIndex) +
    helper +
    code.slice(markerIndex);
}

/* =========================================================
 * 3. ILK URETIM CEVABINI ETIKET MOTORUNDAN GECIR
 * ========================================================= */

const draftPattern =
  /(const draft = await askNvidia\([\s\S]*?\n  \);)(\n\n  const isDeDaQuestion)/;

ensure(
  draftPattern.test(code),
  "draft uretim blogu bulunamadi",
);

if (!code.includes("draft = ensureSolutionAnswerLabels(draft);")) {
  code = code.replace(
    draftPattern,
`let draft = await askNvidia(
    prompt,
    [],
    attachments,
    options,
  );

  draft = ensureSolutionAnswerLabels(draft);$2`
  );
}

/* =========================================================
 * 4. ONARILMIS URETIMI ETIKET MOTORUNDAN GECIR
 * ========================================================= */

const repairedPattern =
  /(const repaired = await askNvidia\([\s\S]*?\n  \);)(\n\n  const secondValidation)/;

ensure(
  repairedPattern.test(code),
  "repaired uretim blogu bulunamadi",
);

if (!code.includes("repaired = ensureSolutionAnswerLabels(repaired);")) {
  code = code.replace(
    repairedPattern,
`let repaired = await askNvidia(
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
  );

  repaired = ensureSolutionAnswerLabels(repaired);$2`
  );
}

/* =========================================================
 * 5. SON GUVENLI URETIMI ETIKET MOTORUNDAN GECIR
 * ========================================================= */

const finalPattern =
  /(const finalSafeAnswer = await askNvidia\([\s\S]*?\n  \);)(\n\n  const thirdValidation)/;

ensure(
  finalPattern.test(code),
  "finalSafeAnswer uretim blogu bulunamadi",
);

if (
  !code.includes(
    "finalSafeAnswer = ensureSolutionAnswerLabels(finalSafeAnswer);"
  )
) {
  code = code.replace(
    finalPattern,
`let finalSafeAnswer = await askNvidia(
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
  );

  finalSafeAnswer =
    ensureSolutionAnswerLabels(
      finalSafeAnswer,
    );$2`
  );
}

/* =========================================================
 * 6. PROMPTTA CEVAP HARFINI ZORUNLU KIL
 * ========================================================= */

const teacherRule =
  "- Çözüm ile cevap anahtarının aynı sonucu verdiğini doğrula.";

ensure(
  code.includes(teacherRule),
  "Ogretmen cozum kurali bulunamadi",
);

if (
  !code.includes(
    'Her çözümün son satırında "**Doğru cevap: X**" yaz.'
  )
) {
  code = code.replace(
    teacherRule,
`${teacherRule}
- Her çözümün son satırında "**Doğru cevap: X**" yaz.
- X yerine cevap anahtarındaki gerçek A-E harfini kullan.
- Cevap harfini yazmadan çözümü bitirme.`,
  );
}

const finalSafeRule =
  "- Çözümü kısa, doğru ve yeterli yaz.";

ensure(
  code.includes(finalSafeRule),
  "Son guvenli cozum kurali bulunamadi",
);

if (
  !code.includes(
    "Her çözümün sonunda cevap anahtarındaki harfi"
  )
) {
  code = code.replace(
    finalSafeRule,
`${finalSafeRule}
- Her çözümün sonunda cevap anahtarındaki harfi "**Doğru cevap: X**" biçiminde yaz.
- Cevap harfi cevap anahtarıyla birebir aynı olmalıdır.`,
  );
}

const repairRule =
  "- Cevap anahtarı ve çözümleri sorulardan sonra ayrı bölümlerde ver.";

ensure(
  code.includes(repairRule),
  "Onarim cozum kurali bulunamadi",
);

if (
  !code.includes(
    "Her düzeltilmiş çözümün son satırına"
  )
) {
  code = code.replace(
    repairRule,
`${repairRule}
- Her düzeltilmiş çözümün son satırına "**Doğru cevap: X**" ekle.
- X harfi cevap anahtarıyla aynı olmalıdır.`,
  );
}

/* =========================================================
 * 7. VALIDATOR HARF EKSIKLIGINI GERCEK HATA SAYMASIN
 * ========================================================= */

const oldAuditRule =
  '- Çözüm doğru cevabı harf olarak açıkça tekrar etmese bile mantıksal olarak doğru seçeneği kanıtlıyorsa geçerli kabul et.';

ensure(
  code.includes(oldAuditRule),
  "Validator cozum-harf kurali bulunamadi",
);

code = code.replace(
  oldAuditRule,
`- Çözümün matematiksel, bilimsel veya mantıksal sonucu cevap anahtarıyla uyumlu olmalıdır.
- Çözüm sonunda bulunan "Doğru cevap: X" satırı cevap anahtarıyla aynı olmalıdır.
- Harf etiketi eksikse yalnızca biçim sorunu olarak belirt; çözüm ve cevap anahtarı doğruysa INVALID verme.`,
);

/* =========================================================
 * 8. VALIDATOR SON KARARINI TEK SATIRA ZORLA
 * ========================================================= */

const auditEnding = `En son yalnızca şu iki sonuçtan biriyle bitir:

FINAL: VALID

veya

FINAL: INVALID`;

ensure(
  code.includes(auditEnding),
  "Validator final karar bolumu bulunamadi",
);

code = code.replace(
  auditEnding,
`En son mutlaka tek bir nihai karar ver.

Karar son satırda olmalıdır.
Karardan sonra hiçbir karakter veya açıklama yazma.
VALID ve INVALID kararlarını aynı yanıtta birlikte kullanma.

Yalnızca:

FINAL: VALID

veya

FINAL: INVALID`,
);

/* =========================================================
 * 9. SON KONTROLLER
 * ========================================================= */

ensure(
  code.includes("function ensureSolutionAnswerLabels("),
  "Cozum etiketi motoru eklenemedi",
);

ensure(
  code.includes(
    "draft = ensureSolutionAnswerLabels(draft);"
  ),
  "Draft etikete baglanamadi",
);

ensure(
  code.includes(
    "repaired = ensureSolutionAnswerLabels(repaired);"
  ),
  "Repaired etikete baglanamadi",
);

ensure(
  code.includes(
    "ensureSolutionAnswerLabels(\n      finalSafeAnswer,"
  ),
  "Final safe etikete baglanamadi",
);

ensure(
  code.includes(
    'return lastVerdict === "VALID";'
  ),
  "Validator son karar motoru eklenemedi",
);

ensure(
  code.includes(
    '"\\n\\n**Doğru cevap: " +'
  ),
  "Cevap harfi kodla eklenemedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
