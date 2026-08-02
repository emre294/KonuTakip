const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ORIGINAL_PATH = path.join(ROOT, "tyt-ai-audit", "report.json");
const RECHECK_PATH = path.join(ROOT, "tyt-ai-audit", "recheck-report.json");
const PROGRESS_PATH = path.join(ROOT, "tyt-ai-audit", "smart-retest-progress.json");
const OUTPUT_JSON = path.join(ROOT, "tyt-ai-audit", "smart-retest-report.json");
const OUTPUT_TEXT = path.join(ROOT, "tyt-ai-audit", "smart-retest-report.txt");

const API_URL =
  "https://konutakip-backend.onrender.com/api/v1/ai/teach-topic";

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

function getAnswerLetter(content) {
  const match = content.match(
    /##\s*Cevap Anahtarı[\s\S]{0,200}?\b(?:1[.)]?\s*)?([A-E])\b/i,
  );

  return match ? match[1].toUpperCase() : null;
}

function getSolutionArea(content) {
  return content.split(/##\s*Çözümler/i)[1] ?? "";
}

function hasAllOptions(content) {
  return ["A", "B", "C", "D", "E"].every((letter) =>
    new RegExp(
      `(?:^|\\n)\\s*${letter}\\)\\s+`,
      "m",
    ).test(content),
  );
}

function solutionSupportsAnswer(content, answerLetter) {
  if (!answerLetter) return false;

  const solution = getSolutionArea(content);

  if (!solution.trim()) return false;

  const patterns = [
    new RegExp(`\\b${answerLetter}\\s+seçeneği\\b`, "i"),
    new RegExp(`\\b${answerLetter}\\)`, "i"),
    new RegExp(`doğru\\s+(?:cevap|seçenek)[^\\n]{0,100}\\b${answerLetter}\\b`, "i"),
    new RegExp(`sonuç[^\\n]{0,100}\\b${answerLetter}\\b`, "i"),
    new RegExp(`cevap[^\\n]{0,60}\\b${answerLetter}\\b`, "i"),
    new RegExp(`\\*\\*${answerLetter}\\*\\*`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(solution));
}

function inspectQuestion(content) {
  const issues = [];

  if (!hasAllOptions(content)) {
    issues.push("A-E seçeneklerinden biri eksik.");
  }

  if (!/##\s*Cevap Anahtarı/i.test(content)) {
    issues.push("Cevap anahtarı bulunamadı.");
  }

  if (!/##\s*Çözümler/i.test(content)) {
    issues.push("Çözüm bölümü bulunamadı.");
  }

  if (/Ã|Ä|Å|â€|�/.test(content)) {
    issues.push("Bozuk Türkçe karakter var.");
  }

  if (
    /^[A-E]\)\s*(dey|day)\b/im.test(content)
  ) {
    issues.push("Uydurma seçenek kullanılmış.");
  }

  const answerLetter = getAnswerLetter(content);

  if (!answerLetter) {
    issues.push("Cevap harfi okunamadı.");
  }
  else if (!solutionSupportsAnswer(content, answerLetter)) {
    issues.push(
      `Çözüm ${answerLetter} cevabını açık biçimde doğrulamıyor.`,
    );
  }

  return {
    passed: issues.length === 0,
    issues,
    answerLetter,
  };
}

async function requestWithRetry(item) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
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
          topicId: item.topicId,
          topicName: item.topicName,
          subjectName: item.subjectName,
          examType: "TYT",
          userQuestion:
            `${item.topicName} konusundan TYT düzeyinde orta seviye ` +
            `1 adet özgün A-B-C-D-E seçenekli soru oluştur. ` +
            `Tam olarak bir doğru cevap olsun. ` +
            `Soruyu ve bütün seçenekleri bağımsız olarak kontrol et. ` +
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
        throw new Error("Boş cevap.");
      }

      return {
        content: payload.content.trim(),
        provider: payload.provider ?? "-",
        model: payload.model ?? "-",
        attempt,
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) =>
          setTimeout(resolve, 15000),
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function buildTextReport(results, totalOriginalPassed) {
  const passed = results.filter(
    (result) => result.status === "BASARILI",
  ).length;

  const failed = results.length - passed;
  const totalPassed = totalOriginalPassed + passed;

  const lines = [
    "TYT AKILLI KALITE KAPISI SON TEST RAPORU",
    "",
    `ONCEDEN BASARILI: ${totalOriginalPassed}`,
    `YENIDEN TEST EDILEN: ${results.length}`,
    `YENIDEN BASARILI: ${passed}`,
    `KALAN HATA: ${failed}`,
    `TOPLAM BASARILI: ${totalPassed} / 62`,
    "",
  ];

  for (const result of results) {
    lines.push(
      "============================================================",
      `DERS: ${result.subjectName}`,
      `KONU: ${result.topicName}`,
      `DURUM: ${result.status}`,
      `DENEME: ${result.attempt ?? "-"}`,
      `SURE: ${Math.round((result.durationMs ?? 0) / 1000)} saniye`,
      "",
      ...(result.issues ?? []).map(
        (issue) => `- ${issue}`,
      ),
      result.error ? `- ${result.error}` : "",
      "",
    );
  }

  return lines.join("\n");
}

async function main() {
  const original = loadJson(ORIGINAL_PATH, null);
  const recheck = loadJson(RECHECK_PATH, null);

  if (!original?.results || !recheck?.results) {
    throw new Error("Gerekli eski raporlar bulunamadı.");
  }

  const originalPassed = original.results.filter(
    (item) => item.overallPassed,
  ).length;

  const unresolvedNames = new Set(
    recheck.results
      .filter((item) => item.finalStatus !== "BASARILI")
      .map(
        (item) =>
          `${normalize(item.subjectName)}::${normalize(item.topicName)}`,
      ),
  );

  const queue = original.results.filter((item) =>
    unresolvedNames.has(
      `${normalize(item.subjectName)}::${normalize(item.topicName)}`,
    ),
  );

  const progress = loadJson(PROGRESS_PATH, {
    nextIndex: 0,
    results: [],
  });

  for (
    let index = progress.nextIndex;
    index < queue.length;
    index += 1
  ) {
    const item = queue[index];

    console.log(
      `[${index + 1}/${queue.length}] ` +
      `${item.subjectName} / ${item.topicName}`,
    );

    const startedAt = Date.now();

    let result;

    try {
      const response = await requestWithRetry(item);
      const audit = inspectQuestion(response.content);

      result = {
        subjectName: item.subjectName,
        topicName: item.topicName,
        topicId: item.topicId,
        status: audit.passed
          ? "BASARILI"
          : "KONTROL_GEREKLI",
        issues: audit.issues,
        provider: response.provider,
        model: response.model,
        attempt: response.attempt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      result = {
        subjectName: item.subjectName,
        topicName: item.topicName,
        topicId: item.topicId,
        status: "GERCEK_ISTEK_HATASI",
        issues: [],
        error:
          error instanceof Error
            ? error.message
            : String(error),
        durationMs: Date.now() - startedAt,
      };
    }

    progress.results.push(result);
    progress.nextIndex = index + 1;

    saveJson(PROGRESS_PATH, progress);
    saveJson(OUTPUT_JSON, {
      updatedAt: new Date().toISOString(),
      originalPassed,
      results: progress.results,
    });

    fs.writeFileSync(
      OUTPUT_TEXT,
      buildTextReport(
        progress.results,
        originalPassed,
      ),
      "utf8",
    );

    console.log(`SONUC: ${result.status}`);

    await new Promise((resolve) =>
      setTimeout(resolve, 10000),
    );
  }

  console.log("TYT_AKILLI_VALIDATOR_SON_TEST_BITTI");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
