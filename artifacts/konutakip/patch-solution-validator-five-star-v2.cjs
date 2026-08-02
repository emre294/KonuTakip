const fs = require("fs");

const path = "./backend/src/routes/ai.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/* =========================================================
 * 1. VALIDATOR SON KARAR OKUMASINI GÜÇLENDİR
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
  "isValidationSuccessful başlangıcı bulunamadı",
);

ensure(
  validationEnd !== -1,
  "isValidationSuccessful bitişi bulunamadı",
);

const newValidationFunction = `function isValidationSuccessful(
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
  newValidationFunction +
  code.slice(validationEnd);

/* =========================================================
 * 2. ÇÖZÜM SONUNA CEVAP HARFİ EKLEYEN MOTOR
 * ========================================================= */

if (!code.includes("function ensureSolutionAnswerLabels(")) {
  const marker =
    "async function generateVerifiedQuestionAnswer(";

  const markerIndex = code.indexOf(marker);

  ensure(
    markerIndex !== -1,
    "generateVerifiedQuestionAnswer bulunamadı",
  );

  const helper = `function ensureSolutionAnswerLabels(
  answer: string,
): string {
  const normalized = answer
    .replace(/\\r\\n/g, "\\n")
    .trim();

  const answerKeyBlock =
    normalized
      .split(/^##\\s+Cevap Anahtarı\\s*$/im)[1]
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

  const solutionAreaParts =
    normalized.split(/^##\\s+Çözümler\\s*$/im);

  if (solutionAreaParts.length < 2) {
    return normalized;
  }

  const beforeSolutions = solutionAreaParts[0];
  const solutionArea = solutionAreaParts
    .slice(1)
    .join("\\n## Çözümler\\n");

  const solutionMatches = [
    ...solutionArea.matchAll(
      /^###\\s+(\\d+)\\.\\s+Soru Çözümü\\s*$/gim,
    ),
  ];

  if (solutionMatches.length === 0) {
    return normalized;
  }

  let rebuiltSolutions = "";

  for (
    let index = 0;
    index < solutionMatches.length;
    index += 1
  ) {
    const current = solutionMatches[index];
    const next = solutionMatches[index + 1];

    const sectionStart = current.index ?? 0;
    const sectionEnd =
      next?.index ?? solutionArea.length;

    let section = solutionArea.slice(
      sectionStart,
      sectionEnd,
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

    rebuiltSolutions += section;
  }

  return (
    beforeSolutions.trimEnd() +
    "\\n\\n## Çözümler\\n\\n" +
    rebuiltSolutions.trim()
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
 * 3. DRAFT ÜRETİMİNİ ETİKET MOTORUNA BAĞLA
 * ========================================================= */

const draftStart = code.indexOf(
  "  const draft = await askNvidia("
);

ensure(
  draftStart !== -1,
  "draft askNvidia başlangıcı bulunamadı",
);

const draftEnd = code.indexOf(
  "\n  );",
  draftStart,
);

ensure(
  draftEnd !== -1,
  "draft askNvidia bitişi bulunamadı",
);

const draftBlock = code.slice(
  draftStart,
  draftEnd + 5,
);

const wrappedDraft = draftBlock
  .replace(
    "  const draft = await askNvidia(",
    "  const draft = ensureSolutionAnswerLabels(\n    await askNvidia(",
  )
  .replace(
    /\n  \);$/,
    "\n    ),\n  );",
  );

code = code.replace(
  draftBlock,
  wrappedDraft,
);

/* =========================================================
 * 4. REPAIRED ÜRETİMİNİ ETİKET MOTORUNA BAĞLA
 * ========================================================= */

const repairedStart = code.indexOf(
  "  const repaired = await askNvidia("
);

ensure(
  repairedStart !== -1,
  "repaired askNvidia başlangıcı bulunamadı",
);

const repairedEnd = code.indexOf(
  "\n  );",
  repairedStart,
);

ensure(
  repairedEnd !== -1,
  "repaired askNvidia bitişi bulunamadı",
);

const repairedBlock = code.slice(
  repairedStart,
  repairedEnd + 5,
);

const wrappedRepaired = repairedBlock
  .replace(
    "  const repaired = await askNvidia(",
    "  const repaired = ensureSolutionAnswerLabels(\n    await askNvidia(",
  )
  .replace(
    /\n  \);$/,
    "\n    ),\n  );",
  );

code = code.replace(
  repairedBlock,
  wrappedRepaired,
);

/* =========================================================
 * 5. FINAL SAFE ÜRETİMİNİ ETİKET MOTORUNA BAĞLA
 * ========================================================= */

const finalSafeStart = code.indexOf(
  "  const finalSafeAnswer = await askNvidia("
);

ensure(
  finalSafeStart !== -1,
  "finalSafeAnswer askNvidia başlangıcı bulunamadı",
);

const finalSafeEnd = code.indexOf(
  "\n  );",
  finalSafeStart,
);

ensure(
  finalSafeEnd !== -1,
  "finalSafeAnswer askNvidia bitişi bulunamadı",
);

const finalSafeBlock = code.slice(
  finalSafeStart,
  finalSafeEnd + 5,
);

const wrappedFinalSafe = finalSafeBlock
  .replace(
    "  const finalSafeAnswer = await askNvidia(",
    "  const finalSafeAnswer = ensureSolutionAnswerLabels(\n    await askNvidia(",
  )
  .replace(
    /\n  \);$/,
    "\n    ),\n  );",
  );

code = code.replace(
  finalSafeBlock,
  wrappedFinalSafe,
);

/* =========================================================
 * 6. ÜRETİM PROMPTUNDA CEVAP HARFİNİ ZORUNLU KIL
 * ========================================================= */

const teacherRule =
  "- Çözüm ile cevap anahtarının aynı sonucu verdiğini doğrula.";

ensure(
  code.includes(teacherRule),
  "Öğretmen çözüm uyumu kuralı bulunamadı",
);

if (
  !code.includes(
    'Her çözümün son satırında "**Doğru cevap: X**" yaz.',
  )
) {
  code = code.replace(
    teacherRule,
`${teacherRule}
- Her çözümün son satırında "**Doğru cevap: X**" yaz.
- X yerine cevap anahtarındaki gerçek A-E harfini kullan.
- Sonuç doğru olsa bile cevap harfini yazmadan çözümü bitirme.`,
  );
}

const finalSafeRule =
  "- Çözümü kısa, doğru ve yeterli yaz.";

ensure(
  code.includes(finalSafeRule),
  "Son güvenli çözüm kuralı bulunamadı",
);

if (
  !code.includes(
    "Her çözümün sonunda cevap anahtarındaki harfi",
  )
) {
  code = code.replace(
    finalSafeRule,
`${finalSafeRule}
- Her çözümün sonunda cevap anahtarındaki harfi "**Doğru cevap: X**" biçiminde açıkça yaz.
- Cevap harfi ile cevap anahtarı birebir aynı olmalıdır.`,
  );
}

const repairRule =
  "- Cevap anahtarı ve çözümleri sorulardan sonra ayrı bölümlerde ver.";

ensure(
  code.includes(repairRule),
  "Soru onarım çözüm kuralı bulunamadı",
);

if (
  !code.includes(
    "Her düzeltilmiş çözümün son satırına",
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
 * 7. VALIDATOR ÇÖZÜM-HARF EKSİKLİĞİNİ YALANCI INVALID SAYMASIN
 * ========================================================= */

const oldAuditRule =
  '- Çözüm doğru cevabı harf olarak açıkça tekrar etmese bile mantıksal olarak doğru seçeneği kanıtlıyorsa geçerli kabul et.';

ensure(
  code.includes(oldAuditRule),
  "Validator çözüm-harf kuralı bulunamadı",
);

code = code.replace(
  oldAuditRule,
`- Çözümün matematiksel, bilimsel veya mantıksal sonucu cevap anahtarıyla uyumlu olmalıdır.
- Çözüm sonunda bulunan "Doğru cevap: X" satırı cevap anahtarıyla aynı olmalıdır.
- Harf etiketi eksikse bunu yalnızca biçim sorunu say; çözüm ve cevap anahtarı doğruysa INVALID verme.`,
);

/* =========================================================
 * 8. VALIDATOR SON KARARI TEK SATIRA ZORLA
 * ========================================================= */

const auditEnding = `En son yalnızca şu iki sonuçtan biriyle bitir:

FINAL: VALID

veya

FINAL: INVALID`;

ensure(
  code.includes(auditEnding),
  "Validator final karar bölümü bulunamadı",
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
  code.includes(
    "function ensureSolutionAnswerLabels(",
  ),
  "Çözüm etiketi motoru eklenemedi",
);

ensure(
  code.includes(
    "const draft = ensureSolutionAnswerLabels(",
  ),
  "Draft etikete bağlanamadı",
);

ensure(
  code.includes(
    "const repaired = ensureSolutionAnswerLabels(",
  ),
  "Repaired etikete bağlanamadı",
);

ensure(
  code.includes(
    "const finalSafeAnswer = ensureSolutionAnswerLabels(",
  ),
  "Final safe etikete bağlanamadı",
);

ensure(
  code.includes(
    'return lastVerdict === "VALID";',
  ),
  "Validator son karar motoru eklenemedi",
);

ensure(
  code.includes(
    '"**Doğru cevap: " +',
  ),
  "Kodla cevap harfi ekleme uygulanamadı",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
