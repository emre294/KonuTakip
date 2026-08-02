const fs = require("fs");

const path = "./backend/src/routes/ai.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/*
 * Eski regex "### 1. Soru Çözümü" başlığını da normal soru
 * olarak sayıyordu. Böylece 1 soru + 1 çözüm, 2 soru gibi
 * algılanıyor ve geçerli cevap yapısal kontrolden kalıyordu.
 */
const oldQuestionCount = `  const questionCount =
    normalized.match(/###\\s*\\d+\\.\\s*Soru(?:\\s|$)/gi)?.length ?? 0;`;

ensure(
  code.includes(oldQuestionCount),
  "Eski questionCount kontrolü bulunamadı",
);

const newQuestionCount = `  const questionCount =
    normalized.match(
      /###\\s*\\d+\\.\\s*Soru(?!\\s*Çözümü)(?:\\s|$)/gi,
    )?.length ?? 0;`;

code = code.replace(
  oldQuestionCount,
  newQuestionCount,
);

/*
 * Çözüm başlığı sayımını da satır başlangıcına sabitle.
 */
const oldSolutionCount = `  const solutionCount =
    normalized.match(/###\\s*\\d+\\.\\s*Soru Çözümü/gi)?.length ?? 0;`;

ensure(
  code.includes(oldSolutionCount),
  "Eski solutionCount kontrolü bulunamadı",
);

const newSolutionCount = `  const solutionCount =
    normalized.match(
      /^###\\s*\\d+\\.\\s*Soru Çözümü\\s*$/gim,
    )?.length ?? 0;`;

code = code.replace(
  oldSolutionCount,
  newSolutionCount,
);

/*
 * Normal soru başlığını da satır başlangıcında doğrula.
 */
code = code.replace(
  `/###\\s*\\d+\\.\\s*Soru(?!\\s*Çözümü)(?:\\s|$)/gi`,
  `/^###\\s*\\d+\\.\\s*Soru\\s*$/gim`,
);

/*
 * Yapısal kontrol başarısızsa nedenini loglamak için
 * yardımcı tanılama fonksiyonu ekle.
 */
if (!code.includes("function getQuestionStructureIssue(")) {
  const marker = "function isQuestionResponseStructurallyComplete(";
  const index = code.indexOf(marker);

  ensure(
    index !== -1,
    "isQuestionResponseStructurallyComplete bulunamadı",
  );

  const helper = `function getQuestionStructureIssue(
  answer: string,
): string {
  const normalized = answer
    .replace(/\\r\\n/g, "\\n")
    .trim();

  const questionCount =
    normalized.match(
      /^###\\s*\\d+\\.\\s*Soru\\s*$/gim,
    )?.length ?? 0;

  const solutionCount =
    normalized.match(
      /^###\\s*\\d+\\.\\s*Soru Çözümü\\s*$/gim,
    )?.length ?? 0;

  const missingSections = [
    !/##\\s*Sorular/i.test(normalized) ? "Sorular" : "",
    !/##\\s*Cevap Anahtarı/i.test(normalized)
      ? "Cevap Anahtarı"
      : "",
    !/##\\s*Çözümler/i.test(normalized)
      ? "Çözümler"
      : "",
  ].filter(Boolean);

  return [
    \`questionCount=\${questionCount}\`,
    \`solutionCount=\${solutionCount}\`,
    missingSections.length > 0
      ? \`missingSections=\${missingSections.join(",")}\`
      : "missingSections=NONE",
  ].join("; ");
}

`;

  code =
    code.slice(0, index) +
    helper +
    code.slice(index);
}

/*
 * Son hata mesajına yapı durumu da eklensin.
 */
const oldFinalReason = `  const finalReason = compactValidationLog(
    thirdValidation,
  )
    .replace(/\\s+/g, " ")
    .slice(0, 1500);`;

ensure(
  code.includes(oldFinalReason),
  "finalReason bloğu bulunamadı",
);

const newFinalReason = `  const finalReason = compactValidationLog(
    thirdValidation,
  )
    .replace(/\\s+/g, " ")
    .slice(0, 1500);

  const structureReason =
    getQuestionStructureIssue(finalSafeAnswer);`;

code = code.replace(
  oldFinalReason,
  newFinalReason,
);

const oldErrorArray = `      \`Son denetim sonucu: \${finalReason}\`,`;

ensure(
  code.includes(oldErrorArray),
  "Son denetim hata satırı bulunamadı",
);

code = code.replace(
  oldErrorArray,
`      \`Son denetim sonucu: \${finalReason}\`,
      \`Yapısal kontrol: \${structureReason}\`,`,
);

/*
 * Güvenlik kontrolleri
 */
ensure(
  code.includes(
    "/^###\\\\s*\\\\d+\\\\.\\\\s*Soru\\\\s*$/gim",
  ),
  "Normal soru başlığı regexi düzeltilemedi",
);

ensure(
  code.includes(
    "/^###\\\\s*\\\\d+\\\\.\\\\s*Soru Çözümü\\\\s*$/gim",
  ),
  "Çözüm başlığı regexi düzeltilemedi",
);

ensure(
  code.includes("function getQuestionStructureIssue("),
  "Yapısal tanılama fonksiyonu eklenemedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
