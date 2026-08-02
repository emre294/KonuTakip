const fs = require("fs");

const filePath =
  "./test-ayt-ai-teacher-quality.cjs";

let code = fs
  .readFileSync(filePath, "utf8")
  .replace(/^\uFEFF/, "")
  .replace(/\r\n/g, "\n");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const functionStart =
  code.indexOf(
    "function countQuestions(content) {",
  );

const functionEnd =
  code.indexOf(
    "\nfunction ",
    functionStart + 1,
  );

ensure(
  functionStart !== -1 &&
  functionEnd !== -1,
  "countQuestions fonksiyonu bulunamadı",
);

const oldFunction = code.slice(
  functionStart,
  functionEnd,
);

const newFunction = `function countQuestions(content) {
  const numbered = [
    ...content.matchAll(
      /(?:^|\\n)\\s*(?:#{1,4}\\s*)?(\\d+)\\.\\s*Soru\\b(?!\\s*(?:Çözümü|Cozumu))/gi,
    ),
  ];

  if (numbered.length > 0) {
    return numbered.length;
  }

  const headings = [
    ...content.matchAll(
      /(?:^|\\n)\\s*(?:#{1,4}\\s*)?Soru\\b(?!\\s*(?:Çözümü|Cozumu))\\s*[:\\-]?\\s*/gi,
    ),
  ];

  return Math.max(
    1,
    headings.length,
  );
}
`;

ensure(
  oldFunction.includes(
    "function countQuestions(content)",
  ),
  "Eski soru sayacı tanınamadı",
);

code =
  code.slice(0, functionStart) +
  newFunction +
  code.slice(functionEnd);

ensure(
  code.includes(
    "Soru\\\\b(?!\\\\s*(?:Çözümü|Cozumu))",
  ),
  "Soru çözümü hariç tutma kuralı eklenmedi",
);

fs.writeFileSync(
  filePath,
  code.trimEnd() + "\n",
  "utf8",
);

console.log(
  "AYT_TEST_QUESTION_COUNTER_FIXED",
);
