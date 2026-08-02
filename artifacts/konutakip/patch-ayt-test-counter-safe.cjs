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

const start = code.indexOf(
  "function countQuestions(content) {",
);

ensure(
  start !== -1,
  "countQuestions başlangıcı bulunamadı",
);

const end = code.indexOf(
  "\nfunction ",
  start + 1,
);

ensure(
  end !== -1,
  "countQuestions bitişi bulunamadı",
);

const replacement = [
  "function countQuestions(content) {",
  "  const questionArea = String(content ?? \"\")",
  "    .split(/^##\\s+Cevap\\s+Anahtar(?:ı|i)\\s*$/im)[0]",
  "    .split(/^##\\s+(?:Çözümler|Cozumler)\\s*$/im)[0];",
  "",
  "  const numbered = [",
  "    ...questionArea.matchAll(",
  "      /(?:^|\\n)\\s*(?:#{1,4}\\s*)?(\\d+)\\.\\s*Soru\\s*(?=\\n|$)/gi,",
  "    ),",
  "  ];",
  "",
  "  if (numbered.length > 0) {",
  "    return numbered.length;",
  "  }",
  "",
  "  const plainHeadings = [",
  "    ...questionArea.matchAll(",
  "      /(?:^|\\n)\\s*(?:#{1,4}\\s*)?Soru\\s*[:\\-]?\\s*(?=\\n|$)/gi,",
  "    ),",
  "  ];",
  "",
  "  return Math.max(",
  "    1,",
  "    plainHeadings.length,",
  "  );",
  "}",
  "",
].join("\n");

code =
  code.slice(0, start) +
  replacement +
  code.slice(end);

ensure(
  code.includes(
    "const questionArea =",
  ),
  "Yeni soru alanı sayacı eklenmedi",
);

ensure(
  code.includes(
    ".split(/^##\\\\s+Cevap",
  ),
  "Cevap anahtarı öncesi sınır eklenmedi",
);

fs.writeFileSync(
  filePath,
  code.trimEnd() + "\n",
  "utf8",
);

console.log(
  "AYT_TEST_COUNTER_SAFE_FIX_OK",
);
