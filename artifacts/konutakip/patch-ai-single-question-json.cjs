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

const oldBlock = `  const questionsValue =
    root.questions ??
    root.sorular ??
    root.items;

  if (!Array.isArray(questionsValue)) {
    return null;
  }`;

const newBlock = `  const listedQuestions =
    root.questions ??
    root.sorular ??
    root.items;

  /*
   * Model bazen tek soru için questions dizisi yerine
   * doğrudan şu nesneyi döndürüyor:
   *
   * {
   *   question: "...",
   *   options: { A: "...", ... },
   *   solution: "...",
   *   answer: "A"
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

  const questionsValue =
    Array.isArray(listedQuestions)
      ? listedQuestions
      : isSingleQuestionObject
        ? [root]
        : null;

  if (!questionsValue) {
    return null;
  }`;

const count =
  code.split(oldBlock).length - 1;

ensure(
  count === 1,
  `Tek soru JSON ankrajı: beklenen 1 eşleşme, bulunan ${count}`,
);

code = code.replace(
  oldBlock,
  newBlock,
);

ensure(
  code.includes(
    "const isSingleQuestionObject",
  ),
  "Tek soru JSON algılama eklenmedi",
);

ensure(
  code.includes(
    "? [root]",
  ),
  "Tek soru nesnesi diziye dönüştürülmedi",
);

fs.writeFileSync(
  filePath,
  code.trimEnd() + "\n",
  "utf8",
);

console.log(
  "AI_SINGLE_QUESTION_JSON_SUPPORT_OK",
);
