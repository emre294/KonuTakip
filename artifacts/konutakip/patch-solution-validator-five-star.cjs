const fs = require("fs");

const path = "./backend/src/routes/ai.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/* =========================================================
 * 1. VALIDATOR KARAR OKUMASINI KESİNLEŞTİR
 * ========================================================= */

const validationPattern =
  /function isValidationSuccessful\([\s\S]*?\n\}\n\nfunction buildFinalSafeQuestionPrompt\(/;

ensure(
  validationPattern.test(code),
  "isValidationSuccessful bloğu bulunamadı",
);

code = code.replace(
  validationPattern,
`function isValidationSuccessful(
  validation: string,
): boolean {
  const normalized = validation
    .replace(/^\\uFEFF/, "")
    .replace(/[\\u200B-\\u200D\\u2060]/g, "")
    .replace(/：/g, ":")
    .replace(/\\r\\n/g, "\\n")
    .replace(/[*_` + "`" + `]/g, "")
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
    verdictMatches[verdictMatches.length - 1][1]
      .toUpperCase();

  return lastVerdict === "VALID";
}

function buildFinalSafeQuestionPrompt(`
);

/* =========================================================
 * 2. ÇÖZÜM SONUNA CEVAP HARFİNİ KODLA GARANTİLE
 * ========================================================= */

if (!code.includes("function ensureSolutionAnswerLabels(")) {
  const marker =
    "async function generateVerifiedQuestionAnswer(";

  const index = code.indexOf(marker);

  ensure(
    index !== -1,
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

  const solutionHeader =
    /^###\\s+(\\d+)\\.\\s+Soru Çözümü\\s*$/gim;

  const matches = [
    ...normalized.matchAll(solutionHeader),
  ];

  if (matches.length === 0) {
    return normalized;
  }

  const sections: string[] = [];
  let cursor = 0;

  for (
    let index = 0;
    index < matches.length;
    index += 1
  ) {
    const current = matches[index];
    const next = matches[index + 1];

    const sectionStart = current.index ?? 0;
    const sectionEnd =
      next?.index ?? normalized.length;

    sections.push(
      normalized.slice(cursor, sectionStart),
    );

    let solutionSection = normalized.slice(
      sectionStart,
      sectionEnd,
    );

    const questionNumber = current[1];
    const answerLetter =
      answerMap.get(questionNumber);

    if (
      answerLetter &&
      !/doğru\\s+cevap\\s*:\\s*[A-E]\\b/i.test(
        solutionSection,
      )
    ) {
      solutionSection =
        solutionSection.trimEnd() +
        \`\\n\\n**Doğru cevap: \${answerLetter}**\\n\`;
    }

    sections.push(solutionSection);
    cursor = sectionEnd;
  }

  if (cursor < normalized.length) {
    sections.push(normalized.slice(cursor));
  }

  return sections
    .join("")
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();
}

`;

  code =
    code.slice(0, index) +
    helper +
    code.slice(index);
}

/* =========================================================
 * 3. TÜM ÜRETİM TURLARINA ÇÖZÜM ETİKETİNİ BAĞLA
 * ========================================================= */

function wrapAskAssignment(variableName) {
  const startText =
    \`const \${variableName} = await askNvidia(\`;

  if (
    code.includes(
      \`const \${variableName} = ensureSolutionAnswerLabels(\`
    )
  ) {
    return;
  }

  const startIndex = code.indexOf(startText);

  ensure(
    startIndex !== -1,
    \`\${variableName} askNvidia başlangıcı bulunamadı\`,
  );

  code = code.replace(
    startText,
    \`const \${variableName} = ensureSolutionAnswerLabels(\\n    await askNvidia(\`,
  );

  const updatedStart = code.indexOf(
    \`const \${variableName} = ensureSolutionAnswerLabels(\`,
  );

  const closeIndex = code.indexOf(
    "\\n  );",
    updatedStart,
  );

  ensure(
    closeIndex !== -1,
    \`\${variableName} askNvidia bitişi bulunamadı\`,
  );

  code =
    code.slice(0, closeIndex) +
    "\\n    ),\\n  );" +
    code.slice(closeIndex + 5);
}

wrapAskAssignment("draft");
wrapAskAssignment("repaired");
wrapAskAssignment("finalSafeAnswer");

/* =========================================================
 * 4. ÜRETİM PROMPTLARINDA CEVAP HARFİNİ ZORUNLU KIL
 * ========================================================= */

const teacherRule =
  "- Çözüm ile cevap anahtarının aynı sonucu verdiğini doğrula.";

ensure(
  code.includes(teacherRule),
  "Öğretmen çözüm uyumu kuralı bulunamadı",
);

if (
  !code.includes(
    '- Her çözümün son satırında "**Doğru cevap: X**" yaz.'
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
    '- Her çözümün sonunda cevap anahtarındaki harfi'
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
    '- Her düzeltilmiş çözümün son satırına'
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
 * 5. VALIDATOR ÇIKTISINI TEK VE NET KARARA ZORLA
 * ========================================================= */

const auditEnding = `En son yalnızca şu iki sonuçtan biriyle bitir:

FINAL: VALID

veya

FINAL: INVALID`;

ensure(
  code.includes(auditEnding),
  "Ders validator final biçimi bulunamadı",
);

code = code.replace(
  auditEnding,
`En son mutlaka tek bir nihai karar ver.

Karar son satırda olmalıdır.
Karardan sonra hiçbir karakter veya açıklama yazma.

Yalnızca:

FINAL: VALID

veya

FINAL: INVALID`,
);

const deDaEnding =
  "- Bütün sorular kusursuzsa yalnızca VALID yaz.";

if (code.includes(deDaEnding)) {
  code = code.replace(
    deDaEnding,
`- Bütün sorular kusursuzsa son satıra yalnızca VALID yaz.
- INVALID ve VALID kararlarını aynı yanıtta birlikte kullanma.`,
  );
}

/* =========================================================
 * 6. VALİDATORA ÇÖZÜM-HARF KURALINI DOĞRU YORUMLAT
 * ========================================================= */

const auditSolutionRule =
  "- Çözüm doğru cevabı harf olarak açıkça tekrar etmese bile mantıksal olarak doğru seçeneği kanıtlıyorsa geçerli kabul et.";

ensure(
  code.includes(auditSolutionRule),
  "Validator çözüm mantığı kuralı bulunamadı",
);

code = code.replace(
  auditSolutionRule,
`- Çözümün matematiksel veya bilimsel sonucu cevap anahtarıyla uyumlu olmalıdır.
- Çözüm sonunda bulunan "Doğru cevap: X" satırı cevap anahtarıyla aynı olmalıdır.
- Harf etiketi eksikse yalnızca biçim sorunu olarak belirt; çözüm ve cevap anahtarı doğruysa INVALID verme.`,
);

/* =========================================================
 * 7. SON GÜVENLİK KONTROLLERİ
 * ========================================================= */

ensure(
  code.includes("function ensureSolutionAnswerLabels("),
  "Çözüm cevap etiketi motoru eklenemedi",
);

ensure(
  code.includes(
    "const draft = ensureSolutionAnswerLabels("
  ),
  "İlk üretim etikete bağlanamadı",
);

ensure(
  code.includes(
    "const repaired = ensureSolutionAnswerLabels("
  ),
  "Onarım üretimi etikete bağlanamadı",
);

ensure(
  code.includes(
    "const finalSafeAnswer = ensureSolutionAnswerLabels("
  ),
  "Son üretim etikete bağlanamadı",
);

ensure(
  code.includes(
    "return lastVerdict === \"VALID\";"
  ),
  "Validator son karar motoru eklenemedi",
);

ensure(
  code.includes(
    "**Doğru cevap: ${answerLetter}**"
  ),
  "Deterministik cevap etiketi eklenemedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
