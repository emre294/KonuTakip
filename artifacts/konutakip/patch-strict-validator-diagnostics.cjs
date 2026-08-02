const fs = require("fs");

const path = "./backend/src/routes/ai.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

if (!code.includes("function logValidationResult(")) {
  const marker = "function buildSubjectAuditPrompt(";
  const index = code.indexOf(marker);

  ensure(index !== -1, "buildSubjectAuditPrompt bulunamadı");

  const helper = `function compactValidationLog(
  validation: string,
): string {
  return validation
    .replace(/\\r\\n/g, "\\n")
    .replace(/[ \\t]+$/gm, "")
    .trim()
    .slice(0, 12_000);
}

function logValidationResult(
  stage: "FIRST" | "SECOND" | "THIRD",
  prompt: string,
  validation: string,
): void {
  const subjectMatch = prompt.match(
    /(?:Ders|subjectName|DERS):\\s*([^\\n]+)/i,
  );

  const topicMatch = prompt.match(
    /(?:Konu|topicName|KONU):\\s*([^\\n]+)/i,
  );

  console.log(
    [
      "",
      "============================================================",
      \`[AI VALIDATION \${stage}]\`,
      \`SUBJECT: \${subjectMatch?.[1]?.trim() ?? "UNKNOWN"}\`,
      \`TOPIC: \${topicMatch?.[1]?.trim() ?? "UNKNOWN"}\`,
      "RESULT:",
      compactValidationLog(validation),
      "============================================================",
      "",
    ].join("\\n"),
  );
}

`;

  code =
    code.slice(0, index) +
    helper +
    code.slice(index);
}

/*
 * Kaliteyi düşürmeden validator kararını tekrar kesinleştir:
 * yalnızca açık VALID kabul edilir.
 */
const validatorStart = code.indexOf(
  "function isQuestionValidationAccepted("
);

const validatorEndMarker =
  "\n}\n\nfunction buildSubjectAuditPrompt(";

const validatorEnd = code.indexOf(
  validatorEndMarker,
  validatorStart,
);

ensure(
  validatorStart !== -1,
  "isQuestionValidationAccepted bulunamadı",
);

ensure(
  validatorEnd !== -1,
  "isQuestionValidationAccepted bitişi bulunamadı",
);

const strictValidator = `function isQuestionValidationAccepted(
  validation: string,
  _strictMode = false,
): boolean {
  return isValidationSuccessful(validation);
}`;

code =
  code.slice(0, validatorStart) +
  strictValidator +
  code.slice(validatorEnd + 2);

/*
 * Birinci, ikinci ve üçüncü validator çıktısını Render loglarına yaz.
 */
const firstValidationBlock = `  const firstValidation = await askNvidia(
    validationPrompt,
    [],
    [],
    {
      temperature: 0.05,
      topP: 0.35,
      maxTokens: 4096,
      allowReasoningValidationFallback: true,
    },
  );`;

ensure(
  code.includes(firstValidationBlock),
  "Birinci validation bloğu bulunamadı",
);

if (!code.includes('logValidationResult("FIRST"')) {
  code = code.replace(
    firstValidationBlock,
`${firstValidationBlock}

  logValidationResult(
    "FIRST",
    prompt,
    firstValidation,
  );`,
  );
}

const secondValidationBlock = `  const secondValidation = await askNvidia(
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
  );`;

ensure(
  code.includes(secondValidationBlock),
  "İkinci validation bloğu bulunamadı",
);

if (!code.includes('logValidationResult("SECOND"')) {
  code = code.replace(
    secondValidationBlock,
`${secondValidationBlock}

  logValidationResult(
    "SECOND",
    prompt,
    secondValidation,
  );`,
  );
}

const thirdValidationBlock = `  const thirdValidation = await askNvidia(
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
  );`;

ensure(
  code.includes(thirdValidationBlock),
  "Üçüncü validation bloğu bulunamadı",
);

if (!code.includes('logValidationResult("THIRD"')) {
  code = code.replace(
    thirdValidationBlock,
`${thirdValidationBlock}

  logValidationResult(
    "THIRD",
    prompt,
    thirdValidation,
  );`,
  );
}

/*
 * 500 cevabına son validator nedenini ekle.
 * Böylece test raporunda gerçek hata sebebi görülecek.
 */
const oldFinalThrow = `  throw new Error(
    [
      "Soru seti üç bağımsız kalite kontrolünden geçemedi.",
      "Hatalı soru kullanıcıya gösterilmedi.",
      "Lütfen isteği farklı bir konu veya seviye belirterek yeniden gönderin.",
    ].join(" "),
  );`;

ensure(
  code.includes(oldFinalThrow),
  "Son hata bloğu bulunamadı",
);

const newFinalThrow = `  const finalReason = compactValidationLog(
    thirdValidation,
  )
    .replace(/\\s+/g, " ")
    .slice(0, 1500);

  throw new Error(
    [
      "Soru seti üç bağımsız kalite kontrolünden geçemedi.",
      "Hatalı soru kullanıcıya gösterilmedi.",
      \`Son denetim sonucu: \${finalReason}\`,
    ].join(" "),
  );`;

code = code.replace(
  oldFinalThrow,
  newFinalThrow,
);

ensure(
  code.includes("function logValidationResult("),
  "Validator log sistemi eklenemedi",
);

ensure(
  code.includes('logValidationResult("FIRST"'),
  "Birinci validator logu bağlanamadı",
);

ensure(
  code.includes('logValidationResult("SECOND"'),
  "İkinci validator logu bağlanamadı",
);

ensure(
  code.includes('logValidationResult("THIRD"'),
  "Üçüncü validator logu bağlanamadı",
);

ensure(
  code.includes("return isValidationSuccessful(validation);"),
  "Sıkı validator kararı uygulanamadı",
);

ensure(
  code.includes("Son denetim sonucu:"),
  "Gerçek hata nedeni 500 cevabına eklenemedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
