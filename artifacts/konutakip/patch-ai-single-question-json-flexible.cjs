const fs = require("fs");

const filePath =
  "./backend/src/routes/ai.ts";

let code = fs
  .readFileSync(filePath, "utf8")
  .replace(/^\uFEFF/, "")
  .replace(/\r\n/g, "\n");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const functionStart = code.indexOf(
  "function convertQuestionJsonToMarkdown(",
);

ensure(
  functionStart !== -1,
  "convertQuestionJsonToMarkdown fonksiyonu bulunamadı",
);

const functionEnd = code.indexOf(
  "\nfunction normalizeQuestionResponseStructure(",
  functionStart,
);

ensure(
  functionEnd !== -1,
  "convertQuestionJsonToMarkdown fonksiyon bitişi bulunamadı",
);

let functionCode = code.slice(
  functionStart,
  functionEnd,
);

/*
 * Daha önce başarıyla eklendiyse tekrar dokunma.
 */
if (
  functionCode.includes(
    "const isSingleQuestionObject =",
  )
) {
  console.log(
    "AI_SINGLE_QUESTION_JSON_SUPPORT_ALREADY_ACTIVE",
  );

  process.exit(0);
}

const possibleStarts = [
  "  const listedQuestions =",
  "  const questionsValue =",
];

let blockStart = -1;

for (const marker of possibleStarts) {
  const found = functionCode.indexOf(
    marker,
  );

  if (
    found !== -1 &&
    (
      blockStart === -1 ||
      found < blockStart
    )
  ) {
    blockStart = found;
  }
}

ensure(
  blockStart !== -1,
  "Soru listesi başlangıç bloğu bulunamadı",
);

const blockEnd = functionCode.indexOf(
  "  const answerKey =",
  blockStart,
);

ensure(
  blockEnd !== -1,
  "answerKey ankrajı bulunamadı",
);

const replacement = `  const listedQuestions =
    root.questions ??
    root.sorular ??
    root.items;

  /*
   * Çoklu soru JSON biçimi:
   *
   * {
   *   questions: [
   *     {
   *       question: "...",
   *       options: { A: "...", B: "...", ... }
   *     }
   *   ],
   *   answerKey: { "1": "A" },
   *   solutions: { "1": "..." }
   * }
   *
   * Tek soru JSON biçimi:
   *
   * {
   *   question: "...",
   *   options: { A: "...", B: "...", ... },
   *   answer: "A",
   *   solution: "..."
   * }
   */
  const isSingleQuestionObject =
    (
      typeof root.question === "string" ||
      typeof root.soru === "string" ||
      typeof root.text === "string" ||
      typeof root.questionText === "string"
    ) &&
    (
      root.options !== undefined ||
      root.secenekler !== undefined ||
      root.choices !== undefined
    );

  const questionsValue:
    unknown[] | null =
    Array.isArray(listedQuestions)
      ? listedQuestions
      : isSingleQuestionObject
        ? [root]
        : null;

  if (!questionsValue) {
    return null;
  }

`;

functionCode =
  functionCode.slice(0, blockStart) +
  replacement +
  functionCode.slice(blockEnd);

code =
  code.slice(0, functionStart) +
  functionCode +
  code.slice(functionEnd);

ensure(
  code.includes(
    "const isSingleQuestionObject =",
  ),
  "Tek soru JSON algılama eklenmedi",
);

ensure(
  code.includes(
    "isSingleQuestionObject\n        ? [root]",
  ),
  "Tek soru nesnesi diziye çevrilmedi",
);

ensure(
  code.includes(
    "const questionsValue:",
  ),
  "questionsValue tipi eklenmedi",
);

fs.writeFileSync(
  filePath,
  code.trimEnd() + "\n",
  "utf8",
);

console.log(
  "AI_SINGLE_QUESTION_JSON_FLEXIBLE_PATCH_OK",
);
