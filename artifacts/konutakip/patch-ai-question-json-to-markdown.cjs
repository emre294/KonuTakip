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

const normalizerMarker =
  "function normalizeQuestionResponseStructure(";

const normalizerStart =
  code.indexOf(normalizerMarker);

ensure(
  normalizerStart !== -1,
  "normalizeQuestionResponseStructure bulunamadı",
);

/*
 * JSON soru çıktısını standart Markdown yapısına dönüştüren motor.
 */
if (
  !code.includes(
    "function convertQuestionJsonToMarkdown(",
  )
) {
  const helper = `function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readIndexedValue(
  container: unknown,
  index: number,
): unknown {
  if (Array.isArray(container)) {
    return container[index];
  }

  const record = asRecord(container);

  if (!record) {
    return undefined;
  }

  return (
    record[String(index + 1)] ??
    record[String(index)] ??
    undefined
  );
}

function normalizeQuestionOptions(
  value: unknown,
): Record<string, string> | null {
  const letters = [
    "A",
    "B",
    "C",
    "D",
    "E",
  ];

  const result: Record<string, string> =
    {};

  if (Array.isArray(value)) {
    value
      .slice(0, 5)
      .forEach((item, index) => {
        if (typeof item === "string") {
          result[letters[index]] =
            item.trim();

          return;
        }

        const record = asRecord(item);

        if (!record) {
          return;
        }

        const text =
          record.text ??
          record.option ??
          record.value ??
          record.secenek;

        if (typeof text === "string") {
          result[letters[index]] =
            text.trim();
        }
      });
  }
  else {
    const record = asRecord(value);

    if (!record) {
      return null;
    }

    for (const letter of letters) {
      const raw =
        record[letter] ??
        record[letter.toLowerCase()];

      if (typeof raw === "string") {
        result[letter] = raw.trim();
      }
    }
  }

  const complete =
    letters.every(
      (letter) =>
        typeof result[letter] ===
          "string" &&
        result[letter].length > 0,
    );

  return complete
    ? result
    : null;
}

function normalizeAnswerLetter(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  const match = value
    .trim()
    .toUpperCase()
    .match(/\\b([A-E])\\b/);

  return match?.[1] ?? "";
}

function convertQuestionJsonToMarkdown(
  rawValue: string,
): string | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  }
  catch {
    return null;
  }

  /*
   * Cevap JSON string içinde JSON olarak geldiyse
   * ikinci kez aç.
   */
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    }
    catch {
      return null;
    }
  }

  const root = Array.isArray(parsed)
    ? {
        questions: parsed,
      }
    : asRecord(parsed);

  if (!root) {
    return null;
  }

  const questionsValue =
    root.questions ??
    root.sorular ??
    root.items;

  if (!Array.isArray(questionsValue)) {
    return null;
  }

  const answerKey =
    root.answerKey ??
    root.answer_key ??
    root.cevapAnahtari ??
    root.cevap_anahtari;

  const solutions =
    root.solutions ??
    root.cozumler ??
    root.çözümler;

  const renderedQuestions: string[] = [];
  const renderedAnswers: string[] = [];
  const renderedSolutions: string[] = [];

  for (
    let index = 0;
    index < questionsValue.length;
    index += 1
  ) {
    const questionRecord =
      asRecord(
        questionsValue[index],
      );

    if (!questionRecord) {
      return null;
    }

    const questionTextValue =
      questionRecord.question ??
      questionRecord.soru ??
      questionRecord.text ??
      questionRecord.questionText;

    if (
      typeof questionTextValue !==
        "string" ||
      !questionTextValue.trim()
    ) {
      return null;
    }

    const options =
      normalizeQuestionOptions(
        questionRecord.options ??
        questionRecord.secenekler ??
        questionRecord.choices,
      );

    if (!options) {
      return null;
    }

    const indexedAnswer =
      readIndexedValue(
        answerKey,
        index,
      );

    const answerLetter =
      normalizeAnswerLetter(
        questionRecord.answer ??
        questionRecord.correctAnswer ??
        questionRecord.correct_option ??
        indexedAnswer,
      );

    if (!answerLetter) {
      return null;
    }

    const indexedSolution =
      readIndexedValue(
        solutions,
        index,
      );

    const solutionValue =
      questionRecord.solution ??
      questionRecord.cozum ??
      questionRecord.çözüm ??
      indexedSolution;

    if (
      typeof solutionValue !==
        "string" ||
      !solutionValue.trim()
    ) {
      return null;
    }

    const questionNumber =
      index + 1;

    renderedQuestions.push(
      [
        \`### \${questionNumber}. Soru\`,
        "",
        questionTextValue.trim(),
        "",
        \`A) \${options.A}\`,
        \`B) \${options.B}\`,
        \`C) \${options.C}\`,
        \`D) \${options.D}\`,
        \`E) \${options.E}\`,
      ].join("\\n"),
    );

    renderedAnswers.push(
      \`\${questionNumber}. \${answerLetter}\`,
    );

    let solutionText =
      solutionValue.trim();

    if (
      !/doğru\\s*cevap\\s*:\\s*\\**[A-E]\\b/i.test(
        solutionText,
      )
    ) {
      solutionText +=
        \`\\n\\n**Doğru cevap: \${answerLetter}**\`;
    }

    renderedSolutions.push(
      [
        \`### \${questionNumber}. Soru Çözümü\`,
        "",
        solutionText,
      ].join("\\n"),
    );
  }

  if (
    renderedQuestions.length === 0
  ) {
    return null;
  }

  return [
    "## Sorular",
    "",
    renderedQuestions.join(
      "\\n\\n",
    ),
    "",
    "## Cevap Anahtarı",
    "",
    renderedAnswers.join("\\n"),
    "",
    "## Çözümler",
    "",
    renderedSolutions.join(
      "\\n\\n",
    ),
  ]
    .join("\\n")
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();
}

`;

  code =
    code.slice(0, normalizerStart) +
    helper +
    code.slice(normalizerStart);
}

/*
 * Normalizasyon fonksiyonunda ilk trim işleminden hemen
 * sonra JSON dönüştürme motorunu çalıştır.
 */
const updatedNormalizerStart =
  code.indexOf(normalizerMarker);

const updatedNormalizerEnd =
  code.indexOf(
    "\n}",
    updatedNormalizerStart,
  );

ensure(
  updatedNormalizerStart !== -1 &&
  updatedNormalizerEnd !== -1,
  "Normalizasyon fonksiyon sınırları bulunamadı",
);

const normalizerBlock =
  code.slice(
    updatedNormalizerStart,
    updatedNormalizerEnd + 2,
  );

if (
  !normalizerBlock.includes(
    "convertQuestionJsonToMarkdown(",
  )
) {
  const trimMatch =
    normalizerBlock.match(
      /let normalized = String\(answer \?\? ""\)[\s\S]*?\.trim\(\);/,
    );

  ensure(
    !!trimMatch,
    "Normalizasyon başlangıç bloğu bulunamadı",
  );

  const injected =
    trimMatch[0] +
`
  
  const jsonMarkdown =
    convertQuestionJsonToMarkdown(
      normalized,
    );

  if (jsonMarkdown) {
    normalized = jsonMarkdown;
  }`;

  const newNormalizerBlock =
    normalizerBlock.replace(
      trimMatch[0],
      injected,
    );

  code =
    code.slice(
      0,
      updatedNormalizerStart,
    ) +
    newNormalizerBlock +
    code.slice(
      updatedNormalizerEnd + 2,
    );
}

ensure(
  code.includes(
    "function convertQuestionJsonToMarkdown(",
  ),
  "JSON soru dönüştürücüsü eklenmedi",
);

ensure(
  code.includes(
    "const jsonMarkdown =",
  ),
  "JSON dönüşümü normalizasyona bağlanmadı",
);

ensure(
  code.includes(
    'root.answerKey ??',
  ),
  "JSON cevap anahtarı desteği eklenmedi",
);

ensure(
  code.includes(
    'root.solutions ??',
  ),
  "JSON çözüm desteği eklenmedi",
);

ensure(
  code.includes(
    'questionRecord.options ??',
  ),
  "JSON seçenek desteği eklenmedi",
);

fs.writeFileSync(
  filePath,
  code.trimEnd() + "\n",
  "utf8",
);

console.log(
  "AI_QUESTION_JSON_TO_MARKDOWN_OK",
);
