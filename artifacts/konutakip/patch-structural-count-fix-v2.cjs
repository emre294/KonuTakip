const fs = require("fs");

const path = "./backend/src/routes/ai.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const completeStart = code.indexOf(
  "function isQuestionResponseStructurallyComplete("
);

ensure(
  completeStart !== -1,
  "isQuestionResponseStructurallyComplete bulunamadı",
);

const diagnosticStart = code.indexOf(
  "function getQuestionStructureIssue("
);

const replaceStart =
  diagnosticStart !== -1 &&
  diagnosticStart < completeStart
    ? diagnosticStart
    : completeStart;

const replaceEnd = code.indexOf(
  "async function generateVerifiedQuestionAnswer(",
  completeStart,
);

ensure(
  replaceEnd !== -1,
  "generateVerifiedQuestionAnswer başlangıcı bulunamadı",
);

const structuralFunctions = `function analyzeQuestionStructure(
  answer: string,
): {
  complete: boolean;
  questionCount: number;
  solutionCount: number;
  answerKeyCount: number;
  missingSections: string[];
  missingOptionDetails: string[];
} {
  const normalized = answer
    .replace(/\\r\\n/g, "\\n")
    .trim();

  const missingSections: string[] = [];

  if (!/^##\\s+Sorular\\s*$/im.test(normalized)) {
    missingSections.push("Sorular");
  }

  if (!/^##\\s+Cevap Anahtarı\\s*$/im.test(normalized)) {
    missingSections.push("Cevap Anahtarı");
  }

  if (!/^##\\s+Çözümler\\s*$/im.test(normalized)) {
    missingSections.push("Çözümler");
  }

  const questionArea =
    normalized.split(/^##\\s+Cevap Anahtarı\\s*$/im)[0] ?? "";

  const answerKeyArea =
    normalized
      .split(/^##\\s+Cevap Anahtarı\\s*$/im)[1]
      ?.split(/^##\\s+Çözümler\\s*$/im)[0] ?? "";

  const solutionArea =
    normalized.split(/^##\\s+Çözümler\\s*$/im)[1] ?? "";

  /*
   * Yalnızca tam satır hâlindeki "### 1. Soru" başlığını sayar.
   * "### 1. Soru Çözümü" artık soru sayılmaz.
   */
  const questionHeadings =
    questionArea.match(
      /^###\\s+\\d+\\.\\s+Soru\\s*$/gim,
    ) ?? [];

  const solutionHeadings =
    solutionArea.match(
      /^###\\s+\\d+\\.\\s+Soru Çözümü\\s*$/gim,
    ) ?? [];

  const answerKeyEntries =
    answerKeyArea.match(
      /^\\s*\\d+[.)]\\s*[A-E]\\s*$/gim,
    ) ?? [];

  const questionCount = questionHeadings.length;
  const solutionCount = solutionHeadings.length;
  const answerKeyCount = answerKeyEntries.length;

  const missingOptionDetails: string[] = [];

  for (let index = 1; index <= questionCount; index += 1) {
    const currentHeading = new RegExp(
      \`^###\\\\s+\${index}\\\\.\\\\s+Soru\\\\s*$\`,
      "im",
    );

    const nextHeading = new RegExp(
      \`^###\\\\s+\${index + 1}\\\\.\\\\s+Soru\\\\s*$\`,
      "im",
    );

    const currentMatch = currentHeading.exec(questionArea);

    if (!currentMatch) {
      missingOptionDetails.push(
        \`Soru \${index}: başlık bulunamadı\`,
      );
      continue;
    }

    const sectionStart =
      currentMatch.index + currentMatch[0].length;

    const remaining = questionArea.slice(sectionStart);
    const nextMatch = nextHeading.exec(remaining);

    const section =
      nextMatch
        ? remaining.slice(0, nextMatch.index)
        : remaining;

    for (const letter of ["A", "B", "C", "D", "E"]) {
      const optionPattern = new RegExp(
        \`^\\\\s*\${letter}\\\\)\\\\s+.+$\`,
        "im",
      );

      if (!optionPattern.test(section)) {
        missingOptionDetails.push(
          \`Soru \${index}: \${letter} seçeneği eksik\`,
        );
      }
    }
  }

  const complete =
    normalized.length > 0 &&
    missingSections.length === 0 &&
    questionCount > 0 &&
    solutionCount === questionCount &&
    answerKeyCount === questionCount &&
    missingOptionDetails.length === 0;

  return {
    complete,
    questionCount,
    solutionCount,
    answerKeyCount,
    missingSections,
    missingOptionDetails,
  };
}

function getQuestionStructureIssue(
  answer: string,
): string {
  const result = analyzeQuestionStructure(answer);

  return [
    \`complete=\${result.complete}\`,
    \`questionCount=\${result.questionCount}\`,
    \`solutionCount=\${result.solutionCount}\`,
    \`answerKeyCount=\${result.answerKeyCount}\`,
    result.missingSections.length > 0
      ? \`missingSections=\${result.missingSections.join(",")}\`
      : "missingSections=NONE",
    result.missingOptionDetails.length > 0
      ? \`missingOptions=\${result.missingOptionDetails.join(" | ")}\`
      : "missingOptions=NONE",
  ].join("; ");
}

function isQuestionResponseStructurallyComplete(
  answer: string,
): boolean {
  return analyzeQuestionStructure(answer).complete;
}

`;

code =
  code.slice(0, replaceStart) +
  structuralFunctions +
  code.slice(replaceEnd);

/*
 * Son hata mesajında yapı tanılaması henüz yoksa ekle.
 */
if (
  !code.includes(
    "const structureReason = getQuestionStructureIssue(finalSafeAnswer);"
  )
) {
  const finalReasonPattern =
    /const finalReason = compactValidationLog\(\s*thirdValidation,\s*\)\s*\.replace\(\/\\\\s\+\/g,\s*" "\)\s*\.slice\(0,\s*1500\);/;

  ensure(
    finalReasonPattern.test(code),
    "finalReason bloğu bulunamadı",
  );

  code = code.replace(
    finalReasonPattern,
`const finalReason = compactValidationLog(
    thirdValidation,
  )
    .replace(/\\s+/g, " ")
    .slice(0, 1500);

  const structureReason =
    getQuestionStructureIssue(finalSafeAnswer);`
  );
}

if (
  !code.includes(
    "`Yapısal kontrol: ${structureReason}`"
  )
) {
  const validatorErrorLine =
    '`Son denetim sonucu: ${finalReason}`,';

  ensure(
    code.includes(validatorErrorLine),
    "Son denetim hata satırı bulunamadı",
  );

  code = code.replace(
    validatorErrorLine,
`${validatorErrorLine}
      \`Yapısal kontrol: \${structureReason}\`,`
  );
}

ensure(
  code.includes(
    '/^###\\\\s+\\\\d+\\\\.\\\\s+Soru\\\\s*$/gim'
  ),
  "Normal soru başlığı sayımı eklenemedi",
);

ensure(
  code.includes(
    '/^###\\\\s+\\\\d+\\\\.\\\\s+Soru Çözümü\\\\s*$/gim'
  ),
  "Çözüm başlığı sayımı eklenemedi",
);

ensure(
  code.includes(
    "return analyzeQuestionStructure(answer).complete;"
  ),
  "Yeni yapısal kontrol bağlanamadı",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
