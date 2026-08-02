const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SUBJECTS_PATH = path.join(ROOT, "data", "subjects.ts");
const OUTPUT_DIR = path.join(ROOT, "tyt-ai-audit");
const STATE_PATH = path.join(OUTPUT_DIR, "progress.json");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const TEXT_REPORT_PATH = path.join(OUTPUT_DIR, "report.txt");

const API_URL =
  "https://konutakip-backend.onrender.com/api/v1/ai/teach-topic";

const BATCH_SIZE = Number(process.env.TYT_AUDIT_BATCH_SIZE || 3);

function repairText(value) {
  if (!/[ÃÄÅâ]/.test(value)) return value;

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function normalize(value) {
  return String(value)
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

function extractTytSubjects() {
  const source = fs.readFileSync(SUBJECTS_PATH, "utf8");

  const start = source.indexOf("export const TYT_SUBJECTS");
  const end = source.indexOf("const AYT_MATEMATIK_TOPICS", start);

  if (start === -1 || end === -1) {
    throw new Error("TYT_SUBJECTS bloğu bulunamadı.");
  }

  const block = source.slice(start, end);

  const subjectPattern =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?topics:\s*makeTopics\(\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\),\s*\}/g;

  const subjects = [];
  let subjectMatch;

  while ((subjectMatch = subjectPattern.exec(block)) !== null) {
    const [, id, rawName, topicPrefix, topicBlock] = subjectMatch;

    const topics = [];
    const topicPattern = /"([^"]+)"/g;
    let topicMatch;
    let index = 0;

    while ((topicMatch = topicPattern.exec(topicBlock)) !== null) {
      topics.push({
        id: `${topicPrefix}-${index}`,
        name: repairText(topicMatch[1]),
      });

      index += 1;
    }

    subjects.push({
      id,
      name: repairText(rawName),
      topics,
    });
  }

  if (subjects.length === 0) {
    throw new Error("TYT dersleri ayrıştırılamadı.");
  }

  return subjects;
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

async function postWithRetry(body, timeoutMs, maxAttempts = 2) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();

      let payload = {};

      try {
        payload = JSON.parse(text);
      } catch {
        payload = { error: text };
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${
            payload.error || payload.message || text
          }`,
        );
      }

      const content =
        typeof payload.content === "string"
          ? payload.content.trim()
          : "";

      if (!content) {
        throw new Error("Boş AI cevabı.");
      }

      return {
        content,
        provider: payload.provider || "-",
        model: payload.model || "-",
      };
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 8000),
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function hasBrokenEncoding(content) {
  return /Ã|Ä|Å|â€|�/.test(content);
}

function inspectExplanation(content, subjectName, topicName) {
  const issues = [];

  if (content.length < 350) {
    issues.push("Konu anlatımı çok kısa.");
  }

  if (content.length > 14000) {
    issues.push("Konu anlatımı gereksiz uzun.");
  }

  if (hasBrokenEncoding(content)) {
    issues.push("Bozuk Türkçe karakter var.");
  }

  if (/```json|<html|<div|<br\s*\/?>/i.test(content)) {
    issues.push("İstenmeyen JSON veya HTML var.");
  }

  const normalizedContent = normalize(content);
  const topicWords = normalize(topicName)
    .split(" ")
    .filter((word) => word.length >= 4);

  const topicMentioned = topicWords.some((word) =>
    normalizedContent.includes(word),
  );

  if (!topicMentioned) {
    issues.push("Anlatım konu adıyla yeterince ilişkili görünmüyor.");
  }

  if (
    !/örnek|uygulama|çözüm|sık yapılan hata|ösym|sınav/i.test(
      content,
    )
  ) {
    issues.push("Örnek, sınav ipucu veya hata bölümü bulunamadı.");
  }

  return {
    passed: issues.length === 0,
    issues,
    length: content.length,
    subjectName,
    topicName,
  };
}

function inspectQuestion(content) {
  const issues = [];

  for (const letter of ["A", "B", "C", "D", "E"]) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${letter}\\)\\s+`,
      "m",
    );

    if (!pattern.test(content)) {
      issues.push(`${letter} seçeneği bulunamadı.`);
    }
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

  if (/hiçbiri|hepsi|dey|day/i.test(content)) {
    issues.push("Yasaklı veya zayıf seçenek tespit edildi.");
  }

  const answerMatch = content.match(
    /cevap anahtarı[\s\S]{0,150}?\b(?:1[.)]?\s*)?([A-E])\b/i,
  );

  if (!answerMatch) {
    issues.push("Doğru cevap harfi okunamadı.");
  } else {
    const answerLetter = answerMatch[1].toUpperCase();

    const solutionArea =
      content.split(/##\s*Çözümler/i)[1] || "";

    if (
      solutionArea &&
      !new RegExp(
        `(?:doğru (?:cevap|seçenek)|sonuç)[^\\n]{0,80}\\b${answerLetter}\\b`,
        "i",
      ).test(solutionArea) &&
      !new RegExp(
        `\\b${answerLetter}\\s+seçeneği`,
        "i",
      ).test(solutionArea)
    ) {
      issues.push(
        `Çözümde cevap anahtarındaki ${answerLetter} seçeneği açıkça doğrulanmıyor.`,
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    length: content.length,
  };
}

async function auditTopic(subject, topic) {
  const base = {
    feature: "ai_teacher",
    requestedAt: new Date().toISOString(),
    topicId: topic.id,
    topicName: topic.name,
    subjectName: subject.name,
    examType: "TYT",
    attachments: [],
  };

  const startedAt = Date.now();

  const result = {
    subjectId: subject.id,
    subjectName: subject.name,
    topicId: topic.id,
    topicName: topic.name,
    startedAt: new Date().toISOString(),
    explanation: null,
    question: null,
    overallPassed: false,
    durationMs: 0,
  };

  try {
    const explanationResponse = await postWithRetry(
      {
        ...base,
        userQuestion:
          `${topic.name} konusunu TYT öğrencisine dengeli, doğru ve sınav odaklı anlat. ` +
          `Temel mantığı, önemli kuralları, kısa örneği, sık yapılan hataları ve ÖSYM ipucunu ver.`,
      },
      300000,
    );

    result.explanation = {
      status: "SUCCESS",
      provider: explanationResponse.provider,
      model: explanationResponse.model,
      content: explanationResponse.content,
      audit: inspectExplanation(
        explanationResponse.content,
        subject.name,
        topic.name,
      ),
    };
  } catch (error) {
    result.explanation = {
      status: "ERROR",
      error:
        error instanceof Error
          ? error.message
          : String(error),
      audit: {
        passed: false,
        issues: ["Konu anlatımı isteği başarısız."],
      },
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    const questionResponse = await postWithRetry(
      {
        ...base,
        userQuestion:
          `${topic.name} konusundan TYT düzeyinde orta seviye 1 adet özgün, ` +
          `5 seçenekli çoktan seçmeli soru hazırla. Tam olarak bir doğru cevap olsun. ` +
          `Cevap anahtarını ve doğrulanmış çözümü ayrı bölümlerde ver.`,
      },
      600000,
    );

    result.question = {
      status: "SUCCESS",
      provider: questionResponse.provider,
      model: questionResponse.model,
      content: questionResponse.content,
      audit: inspectQuestion(questionResponse.content),
    };
  } catch (error) {
    result.question = {
      status: "ERROR",
      error:
        error instanceof Error
          ? error.message
          : String(error),
      audit: {
        passed: false,
        issues: ["Soru üretimi veya kalite kontrolü başarısız."],
      },
    };
  }

  result.durationMs = Date.now() - startedAt;

  result.overallPassed =
    result.explanation?.audit?.passed === true &&
    result.question?.audit?.passed === true;

  return result;
}

function buildTextReport(subjects, results, progress) {
  const totalTopics = subjects.reduce(
    (sum, subject) => sum + subject.topics.length,
    0,
  );

  const completed = results.length;
  const passed = results.filter(
    (result) => result.overallPassed,
  ).length;
  const failed = completed - passed;

  const lines = [
    "TYT AI TAM DENETIM RAPORU",
    "",
    `TOPLAM DERS: ${subjects.length}`,
    `TOPLAM KONU: ${totalTopics}`,
    `TAMAMLANAN: ${completed}`,
    `BASARILI: ${passed}`,
    `KONTROL GEREKLI: ${failed}`,
    `KALAN: ${totalTopics - completed}`,
    "",
  ];

  for (const result of results) {
    lines.push(
      "============================================================",
      `DERS: ${result.subjectName}`,
      `KONU: ${result.topicName}`,
      `DURUM: ${
        result.overallPassed
          ? "BASARILI"
          : "KONTROL GEREKLI"
      }`,
      `SURE: ${Math.round(result.durationMs / 1000)} saniye`,
      "",
      `ANLATIM: ${
        result.explanation?.audit?.passed
          ? "BASARILI"
          : "HATALI"
      }`,
      ...(result.explanation?.audit?.issues || []).map(
        (issue) => `- ${issue}`,
      ),
      "",
      `SORU/CEVAP/COZUM: ${
        result.question?.audit?.passed
          ? "BASARILI"
          : "HATALI"
      }`,
      ...(result.question?.audit?.issues || []).map(
        (issue) => `- ${issue}`,
      ),
      "",
    );
  }

  lines.push(
    "============================================================",
    `SONRAKI KONU INDEXI: ${progress.nextIndex}`,
  );

  return lines.join("\n");
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const subjects = extractTytSubjects();

  const queue = subjects.flatMap((subject) =>
    subject.topics.map((topic) => ({
      subject,
      topic,
    })),
  );

  const progress = loadJson(STATE_PATH, {
    nextIndex: 0,
    completedTopicIds: [],
  });

  const report = loadJson(REPORT_PATH, {
    createdAt: new Date().toISOString(),
    results: [],
  });

  const batch = queue.slice(
    progress.nextIndex,
    progress.nextIndex + BATCH_SIZE,
  );

  if (batch.length === 0) {
    console.log("TYT_TAM_DENETIM_BITTI");
    console.log(`TOPLAM_KONU=${queue.length}`);
    return;
  }

  console.log(
    `TYT_DENETIM_BASLADI ${progress.nextIndex + 1}-${Math.min(
      progress.nextIndex + batch.length,
      queue.length,
    )}/${queue.length}`,
  );

  for (const item of batch) {
    console.log(
      `TEST: ${item.subject.name} / ${item.topic.name}`,
    );

    const result = await auditTopic(
      item.subject,
      item.topic,
    );

    report.results.push(result);
    report.updatedAt = new Date().toISOString();

    progress.nextIndex += 1;
    progress.completedTopicIds.push(item.topic.id);

    saveJson(REPORT_PATH, report);
    saveJson(STATE_PATH, progress);

    fs.writeFileSync(
      TEXT_REPORT_PATH,
      buildTextReport(
        subjects,
        report.results,
        progress,
      ),
      "utf8",
    );

    console.log(
      result.overallPassed
        ? "SONUC: BASARILI"
        : "SONUC: KONTROL GEREKLI",
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 8000),
    );
  }

  console.log(
    `PARTI_TAMAM ${progress.nextIndex}/${queue.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
