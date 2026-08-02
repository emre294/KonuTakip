const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "tyt-ai-audit", "report.json");
const OUTPUT_PATH = path.join(ROOT, "tyt-ai-audit", "recheck-report.txt");
const OUTPUT_JSON = path.join(ROOT, "tyt-ai-audit", "recheck-report.json");
const PROGRESS_PATH = path.join(ROOT, "tyt-ai-audit", "recheck-progress.json");

const API_URL =
  "https://konutakip-backend.onrender.com/api/v1/ai/teach-topic";

function normalize(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, value) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(value, null, 2),
    "utf8",
  );
}

function hasBrokenEncoding(content) {
  return /Ã|Ä|Å|â€|�/.test(content);
}

function getQuestionArea(content) {
  return String(content ?? "")
    .split(/##\s*Cevap Anahtarı/i)[0];
}

function getSolutionArea(content) {
  return String(content ?? "")
    .split(/##\s*Çözümler/i)[1] ?? "";
}

function getAnswerLetter(content) {
  const match = String(content ?? "").match(
    /##\s*Cevap Anahtarı[\s\S]{0,200}?\b(?:1[.)]?\s*)?([A-E])\b/i,
  );

  return match ? match[1].toUpperCase() : null;
}

function hasAllOptions(content) {
  return ["A", "B", "C", "D", "E"].every((letter) =>
    new RegExp(
      `(?:^|\\n)\\s*${letter}\\)\\s+`,
      "m",
    ).test(content),
  );
}

function detectWeakOption(content) {
  const questionArea = getQuestionArea(content);

  const optionLines = questionArea
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-E]\)/.test(line));

  return optionLines.some((line) =>
    /^[A-E]\)\s*(hepsi|hiçbiri|dey|day)\b/i.test(line),
  );
}

function solutionConfirmsAnswer(content, answerLetter) {
  if (!answerLetter) return false;

  const solution = getSolutionArea(content);

  if (!solution.trim()) return false;

  const patterns = [
    new RegExp(`\\b${answerLetter}\\s+seçeneği\\b`, "i"),
    new RegExp(`\\b${answerLetter}\\)`, "i"),
    new RegExp(`doğru\\s+(?:cevap|seçenek)[^\\n]{0,80}\\b${answerLetter}\\b`, "i"),
    new RegExp(`sonuç[^\\n]{0,80}\\b${answerLetter}\\b`, "i"),
    new RegExp(`cevap[^\\n]{0,40}\\b${answerLetter}\\b`, "i"),
    new RegExp(`\\*\\*${answerLetter}\\*\\*`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(solution));
}

function topicIsRelevant(content, subjectName, topicName) {
  const normalizedContent = normalize(content);

  const keywords = [
    ...normalize(topicName).split(" "),
    ...normalize(subjectName).split(" "),
  ].filter((word) => word.length >= 4);

  return keywords.some((word) =>
    normalizedContent.includes(word),
  );
}

function reAuditExplanation(result) {
  const explanation = result.explanation;

  if (!explanation || explanation.status !== "SUCCESS") {
    return {
      passed: false,
      category: "GERCEK_ISTEK_HATASI",
      issues: ["Konu anlatımı isteği başarısız."],
    };
  }

  const content = String(explanation.content ?? "");
  const issues = [];

  if (content.length < 300) {
    issues.push("Konu anlatımı çok kısa.");
  }

  if (hasBrokenEncoding(content)) {
    issues.push("Bozuk Türkçe karakter var.");
  }

  if (
    !topicIsRelevant(
      content,
      result.subjectName,
      result.topicName,
    )
  ) {
    issues.push("Konu ilişkisi manuel kontrol edilmeli.");
  }

  return {
    passed: issues.length === 0,
    category:
      issues.length === 0
        ? "BASARILI"
        : "PROMPT_IYILESTIRME",
    issues,
  };
}

function reAuditQuestion(result) {
  const question = result.question;

  if (!question || question.status !== "SUCCESS") {
    return {
      passed: false,
      category: "YENIDEN_URETIM_GEREKLI",
      issues: [
        question?.error ??
        "Soru üretimi veya kalite kontrolü başarısız.",
      ],
    };
  }

  const content = String(question.content ?? "");
  const issues = [];

  if (!hasAllOptions(content)) {
    issues.push("A-E seçeneklerinden biri eksik.");
  }

  if (!/cevap anahtarı/i.test(content)) {
    issues.push("Cevap anahtarı bulunamadı.");
  }

  if (!/çözüm/i.test(content)) {
    issues.push("Çözüm bulunamadı.");
  }

  if (hasBrokenEncoding(content)) {
    issues.push("Bozuk Türkçe karakter var.");
  }

  if (detectWeakOption(content)) {
    issues.push("Zayıf veya uydurma seçenek kullanılmış.");
  }

  const answerLetter = getAnswerLetter(content);

  if (!answerLetter) {
    issues.push("Cevap anahtarı harfi okunamadı.");
  }
  else if (!solutionConfirmsAnswer(content, answerLetter)) {
    issues.push(
      `Çözüm ${answerLetter} cevabını açık biçimde doğrulamıyor.`,
    );
  }

  return {
    passed: issues.length === 0,
    category:
      issues.length === 0
        ? "BASARILI"
        : "PROMPT_IYILESTIRME",
    issues,
  };
}

async function requestQuestion(result) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    600000,
  );

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        feature: "ai_teacher",
        requestedAt: new Date().toISOString(),
        topicId: result.topicId,
        topicName: result.topicName,
        subjectName: result.subjectName,
        examType: "TYT",
        userQuestion:
          `${result.topicName} konusundan TYT düzeyinde orta seviye ` +
          `1 adet özgün, A-B-C-D-E seçenekli soru hazırla. ` +
          `Tam olarak bir doğru cevap bulunsun. ` +
          `Cevap anahtarını ve çözümü ayrı bölümlerde ver. ` +
          `Çözümün sonunda "Doğru cevap: X" biçiminde cevap harfini açıkça yaz.`,
        attachments: [],
      }),
      signal: controller.signal,
    });

    const text = await response.text();

    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${
          payload.error ?? payload.message ?? text
        }`,
      );
    }

    if (
      typeof payload.content !== "string" ||
      !payload.content.trim()
    ) {
      throw new Error("Boş soru cevabı.");
    }

    return {
      status: "SUCCESS",
      provider: payload.provider ?? "-",
      model: payload.model ?? "-",
      content: payload.content.trim(),
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildReport(results) {
  const successful = results.filter(
    (item) => item.finalStatus === "BASARILI",
  );

  const promptIssues = results.filter(
    (item) =>
      item.finalStatus === "PROMPT_IYILESTIRME",
  );

  const realFailures = results.filter(
    (item) =>
      item.finalStatus === "GERCEK_ISTEK_HATASI",
  );

  const lines = [
    "TYT AI YENIDEN SINIFLANDIRMA RAPORU",
    "",
    `TOPLAM KONU: ${results.length}`,
    `BASARILI: ${successful.length}`,
    `PROMPT IYILESTIRME: ${promptIssues.length}`,
    `GERCEK ISTEK HATASI: ${realFailures.length}`,
    "",
  ];

  for (const item of results) {
    lines.push(
      "============================================================",
      `DERS: ${item.subjectName}`,
      `KONU: ${item.topicName}`,
      `SON DURUM: ${item.finalStatus}`,
      "",
      `ANLATIM: ${item.explanation.category}`,
      ...item.explanation.issues.map(
        (issue) => `- ${issue}`,
      ),
      "",
      `SORU/CEVAP/COZUM: ${item.question.category}`,
      ...item.question.issues.map(
        (issue) => `- ${issue}`,
      ),
      "",
    );
  }

  return lines.join("\n");
}

async function main() {
  const report = loadJson(REPORT_PATH, null);

  if (!report || !Array.isArray(report.results)) {
    throw new Error("report.json bulunamadı.");
  }

  const failedResults = report.results.filter(
    (result) => !result.overallPassed,
  );

  const progress = loadJson(PROGRESS_PATH, {
    nextIndex: 0,
    results: [],
  });

  for (
    let index = progress.nextIndex;
    index < failedResults.length;
    index += 1
  ) {
    const original = failedResults[index];

    console.log(
      `[${index + 1}/${failedResults.length}] ` +
      `${original.subjectName} / ${original.topicName}`,
    );

    const updated = JSON.parse(
      JSON.stringify(original),
    );

    if (
      !updated.question ||
      updated.question.status !== "SUCCESS"
    ) {
      try {
        updated.question = await requestQuestion(
          updated,
        );
      } catch (error) {
        updated.question = {
          status: "ERROR",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        };
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 8000),
      );
    }

    const explanationAudit =
      reAuditExplanation(updated);

    const questionAudit =
      reAuditQuestion(updated);

    let finalStatus = "BASARILI";

    if (
      explanationAudit.category ===
        "GERCEK_ISTEK_HATASI" ||
      questionAudit.category ===
        "YENIDEN_URETIM_GEREKLI"
    ) {
      finalStatus = "GERCEK_ISTEK_HATASI";
    }
    else if (
      !explanationAudit.passed ||
      !questionAudit.passed
    ) {
      finalStatus = "PROMPT_IYILESTIRME";
    }

    progress.results.push({
      subjectName: updated.subjectName,
      topicName: updated.topicName,
      explanation: explanationAudit,
      question: questionAudit,
      finalStatus,
    });

    progress.nextIndex = index + 1;

    saveJson(PROGRESS_PATH, progress);
    saveJson(OUTPUT_JSON, {
      updatedAt: new Date().toISOString(),
      results: progress.results,
    });

    fs.writeFileSync(
      OUTPUT_PATH,
      buildReport(progress.results),
      "utf8",
    );
  }

  console.log("TYT_YENIDEN_KONTROL_TAMAMLANDI");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
