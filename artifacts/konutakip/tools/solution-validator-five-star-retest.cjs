const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const SOURCE_REPORT = path.join(
  ROOT,
  "tyt-ai-final-audit",
  "report.json",
);

const OUTPUT_DIR = path.join(
  ROOT,
  "tyt-ai-final-audit",
  "solution-validator-retest",
);

const PROGRESS_FILE = path.join(
  OUTPUT_DIR,
  "progress.json",
);

const REPORT_JSON = path.join(
  OUTPUT_DIR,
  "report.json",
);

const REPORT_TEXT = path.join(
  OUTPUT_DIR,
  "report.txt",
);

const ANSWERS_DIR = path.join(
  OUTPUT_DIR,
  "answers",
);

const API_URL =
  "https://konutakip-backend.onrender.com/api/v1/ai/teach-topic";

const REQUEST_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const RETRY_WAIT_MS = 20_000;
const TOPIC_WAIT_MS = 10_000;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(ANSWERS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    );
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

function safeFileName(value) {
  return String(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasBrokenEncoding(value) {
  return /Ã|Ä|Å|â€|�/.test(String(value));
}

function analyzeStructure(content) {
  const normalized = String(content ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  const questionArea =
    normalized.split(
      /^##\s+Cevap Anahtarı\s*$/im,
    )[0] ?? "";

  const answerKeyArea =
    normalized
      .split(/^##\s+Cevap Anahtarı\s*$/im)[1]
      ?.split(/^##\s+Çözümler\s*$/im)[0] ?? "";

  const solutionArea =
    normalized.split(
      /^##\s+Çözümler\s*$/im,
    )[1] ?? "";

  const questionMatches = [
    ...questionArea.matchAll(
      /^###\s+(\d+)\.\s+Soru\s*$/gim,
    ),
  ];

  const solutionMatches = [
    ...solutionArea.matchAll(
      /^###\s+(\d+)\.\s+Soru Çözümü\s*$/gim,
    ),
  ];

  const answerKeyMatches = [
    ...answerKeyArea.matchAll(
      /^\s*(\d+)[.)]\s*([A-E])\s*$/gim,
    ),
  ];

  const issues = [];

  if (!/^##\s+Sorular\s*$/im.test(normalized)) {
    issues.push("Sorular bölümü eksik.");
  }

  if (
    !/^##\s+Cevap Anahtarı\s*$/im.test(
      normalized,
    )
  ) {
    issues.push("Cevap anahtarı bölümü eksik.");
  }

  if (!/^##\s+Çözümler\s*$/im.test(normalized)) {
    issues.push("Çözümler bölümü eksik.");
  }

  if (questionMatches.length !== 1) {
    issues.push(
      `Beklenen 1 soru yerine ${questionMatches.length} soru bulundu.`,
    );
  }

  if (
    solutionMatches.length !==
    questionMatches.length
  ) {
    issues.push(
      `Soru sayısı ${questionMatches.length}, çözüm sayısı ${solutionMatches.length}.`,
    );
  }

  if (
    answerKeyMatches.length !==
    questionMatches.length
  ) {
    issues.push(
      `Soru sayısı ${questionMatches.length}, cevap anahtarı sayısı ${answerKeyMatches.length}.`,
    );
  }

  for (
    let index = 0;
    index < questionMatches.length;
    index += 1
  ) {
    const current = questionMatches[index];
    const next = questionMatches[index + 1];

    const sectionStart =
      (current.index ?? 0) + current[0].length;

    const sectionEnd =
      next?.index ?? questionArea.length;

    const section = questionArea.slice(
      sectionStart,
      sectionEnd,
    );

    for (const letter of ["A", "B", "C", "D", "E"]) {
      if (
        !new RegExp(
          `^\\s*${letter}\\)\\s+\\S.+$`,
          "im",
        ).test(section)
      ) {
        issues.push(
          `${current[1]}. soruda ${letter} seçeneği eksik.`,
        );
      }
    }
  }

  if (hasBrokenEncoding(normalized)) {
    issues.push("Bozuk Türkçe karakter var.");
  }

  return {
    passed: issues.length === 0,
    issues,
    questionCount: questionMatches.length,
    solutionCount: solutionMatches.length,
    answerKeyCount: answerKeyMatches.length,
    answerEntries: answerKeyMatches.map(
      (match) => ({
        questionNumber: match[1],
        answerLetter: match[2].toUpperCase(),
      }),
    ),
    solutionArea,
  };
}

function analyzeSolutionSynchronization(
  content,
  structure,
) {
  const issues = [];

  for (const entry of structure.answerEntries) {
    const questionNumber = entry.questionNumber;
    const answerLetter = entry.answerLetter;

    const solutionHeading = new RegExp(
      `^###\\s+${questionNumber}\\.\\s+Soru Çözümü\\s*$`,
      "im",
    );

    const currentMatch = solutionHeading.exec(
      structure.solutionArea,
    );

    if (!currentMatch) {
      issues.push(
        `${questionNumber}. soru çözümü bulunamadı.`,
      );
      continue;
    }

    const nextHeading = new RegExp(
      `^###\\s+${Number(questionNumber) + 1}\\.\\s+Soru Çözümü\\s*$`,
      "im",
    );

    const remaining = structure.solutionArea.slice(
      currentMatch.index + currentMatch[0].length,
    );

    const nextMatch = nextHeading.exec(remaining);

    const section = nextMatch
      ? remaining.slice(0, nextMatch.index)
      : remaining;

    const labelMatch = section.match(
      /\*\*Doğru cevap:\s*([A-E])\*\*/i,
    );

    if (!labelMatch) {
      issues.push(
        `${questionNumber}. çözümde "Doğru cevap: ${answerLetter}" etiketi yok.`,
      );
      continue;
    }

    const solutionLetter =
      labelMatch[1].toUpperCase();

    if (solutionLetter !== answerLetter) {
      issues.push(
        `${questionNumber}. soruda cevap anahtarı ${answerLetter}, çözüm etiketi ${solutionLetter}.`,
      );
    }

    if (
      !/##\s+Soru Analizi/i.test(section)
    ) {
      issues.push(
        `${questionNumber}. çözümde Soru Analizi bölümü yok.`,
      );
    }

    if (
      !/##\s+Adım Adım Çözüm/i.test(section)
    ) {
      issues.push(
        `${questionNumber}. çözümde Adım Adım Çözüm bölümü yok.`,
      );
    }

    if (!/##\s+Sonuç/i.test(section)) {
      issues.push(
        `${questionNumber}. çözümde Sonuç bölümü yok.`,
      );
    }

    if (!/##\s+Kontrol/i.test(section)) {
      issues.push(
        `${questionNumber}. çözümde Kontrol bölümü yok.`,
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

async function requestTopic(item) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    const startedAt = Date.now();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json; charset=utf-8",
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
            `1 adet özgün A-B-C-D-E seçenekli soru hazırla. ` +
            `Tam olarak bir doğru cevap bulunsun. ` +
            `Bütün seçenekleri bağımsız çözerek doğrula. ` +
            `Cevap anahtarını ve ayrıntılı çözümü ayrı bölümlerde ver. ` +
            `Çözümde Soru Analizi, Adım Adım Çözüm, Sonuç ve Kontrol bölümleri bulunsun. ` +
            `Her çözümün en sonunda cevap anahtarıyla aynı harfi ` +
            `"**Doğru cevap: X**" biçiminde açıkça yaz.`,
          attachments: [],
        }),
        signal: controller.signal,
      });

      const rawText = await response.text();

      let payload;

      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = {
          error: rawText,
        };
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${
            payload.error ??
            payload.message ??
            rawText
          }`,
        );
      }

      const content =
        typeof payload.content === "string"
          ? payload.content.trim()
          : "";

      if (!content) {
        throw new Error("Backend boş cevap döndürdü.");
      }

      return {
        statusCode: response.status,
        content,
        provider: payload.provider ?? "-",
        model: payload.model ?? "-",
        attempt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;

      if (attempt < MAX_ATTEMPTS) {
        console.log(
          `DENEME ${attempt} BASARISIZ. ` +
          `${RETRY_WAIT_MS / 1000} SANIYE SONRA TEKRAR...`,
        );

        await sleep(RETRY_WAIT_MS);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function buildReport(
  queue,
  results,
  nextIndex,
) {
  const passed = results.filter(
    (item) => item.status === "BASARILI",
  ).length;

  const failed = results.filter(
    (item) => item.status !== "BASARILI",
  ).length;

  const lines = [
    "TYT COZUM VE VALIDATOR 5 YILDIZ SON TEST RAPORU",
    "",
    `YENIDEN TEST EDILEN: ${queue.length}`,
    `TAMAMLANAN: ${results.length}`,
    `BASARILI: ${passed}`,
    `KALAN HATA: ${failed}`,
    `KALAN TEST: ${queue.length - nextIndex}`,
    "",
  ];

  for (const result of results) {
    lines.push(
      "============================================================",
      `DERS: ${result.subjectName}`,
      `KONU: ${result.topicName}`,
      `DURUM: ${result.status}`,
      `HTTP: ${result.statusCode ?? "-"}`,
      `DENEME: ${result.attempt ?? "-"}`,
      `SURE: ${Math.round((result.durationMs ?? 0) / 1000)} saniye`,
      `PROVIDER: ${result.provider ?? "-"}`,
      `MODEL: ${result.model ?? "-"}`,
      "",
      "YAPISAL KONTROL:",
      ...(result.structureIssues?.length
        ? result.structureIssues.map(
            (issue) => `- ${issue}`,
          )
        : ["- BASARILI"]),
      "",
      "COZUM-CEVAP SENKRONU:",
      ...(result.solutionIssues?.length
        ? result.solutionIssues.map(
            (issue) => `- ${issue}`,
          )
        : ["- BASARILI"]),
      "",
      result.error
        ? `GERCEK HATA:\n${result.error}`
        : "",
      "",
    );
  }

  lines.push(
    "============================================================",
    `SONRAKI INDEX: ${nextIndex}`,
  );

  return lines.join("\n");
}

async function main() {
  const oldReport = loadJson(
    SOURCE_REPORT,
    null,
  );

  if (
    !oldReport ||
    !Array.isArray(oldReport.results)
  ) {
    throw new Error(
      "tyt-ai-final-audit/report.json bulunamadı.",
    );
  }

  const queue = oldReport.results.filter(
    (item) =>
      item.status !== "BASARILI",
  );

  if (queue.length === 0) {
    console.log("YENIDEN TEST EDILECEK KONU YOK");
    return;
  }

  const progress = loadJson(
    PROGRESS_FILE,
    {
      nextIndex: 0,
      results: [],
      startedAt: new Date().toISOString(),
    },
  );

  console.log("");
  console.log(
    "COZUM VE VALIDATOR 5 YILDIZ TESTI BASLADI",
  );
  console.log(
    `KONU SAYISI: ${queue.length}`,
  );
  console.log(
    `DEVAM NOKTASI: ${progress.nextIndex}/${queue.length}`,
  );
  console.log("");

  for (
    let index = progress.nextIndex;
    index < queue.length;
    index += 1
  ) {
    const item = queue[index];

    console.log(
      "============================================================",
    );

    console.log(
      `[${index + 1}/${queue.length}] ` +
      `${item.subjectName} / ${item.topicName}`,
    );

    const startedAt = Date.now();

    let result;

    try {
      const response = await requestTopic(item);

      const structure = analyzeStructure(
        response.content,
      );

      const solutionAudit =
        analyzeSolutionSynchronization(
          response.content,
          structure,
        );

      const status =
        structure.passed &&
        solutionAudit.passed
          ? "BASARILI"
          : "KONTROL_GEREKLI";

      result = {
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        topicId: item.topicId,
        topicName: item.topicName,
        status,
        statusCode: response.statusCode,
        attempt: response.attempt,
        provider: response.provider,
        model: response.model,
        durationMs: response.durationMs,
        structureIssues: structure.issues,
        solutionIssues: solutionAudit.issues,
        completedAt: new Date().toISOString(),
      };

      const answerPath = path.join(
        ANSWERS_DIR,
        `${String(index + 1).padStart(2, "0")}-` +
        `${safeFileName(item.subjectName)}-` +
        `${safeFileName(item.topicName)}.txt`,
      );

      fs.writeFileSync(
        answerPath,
        response.content,
        "utf8",
      );
    } catch (error) {
      result = {
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        topicId: item.topicId,
        topicName: item.topicName,
        status: "HATA",
        statusCode: null,
        attempt: null,
        provider: null,
        model: null,
        durationMs: Date.now() - startedAt,
        structureIssues: [],
        solutionIssues: [],
        error:
          error instanceof Error
            ? error.message
            : String(error),
        completedAt: new Date().toISOString(),
      };
    }

    progress.results.push(result);
    progress.nextIndex = index + 1;
    progress.updatedAt = new Date().toISOString();

    saveJson(PROGRESS_FILE, progress);

    saveJson(REPORT_JSON, {
      startedAt: progress.startedAt,
      updatedAt: progress.updatedAt,
      totalTopics: queue.length,
      nextIndex: progress.nextIndex,
      results: progress.results,
    });

    fs.writeFileSync(
      REPORT_TEXT,
      buildReport(
        queue,
        progress.results,
        progress.nextIndex,
      ),
      "utf8",
    );

    console.log(`SONUC: ${result.status}`);

    if (result.error) {
      console.log(`HATA: ${result.error}`);
    }

    if (index < queue.length - 1) {
      await sleep(TOPIC_WAIT_MS);
    }
  }

  console.log("");
  console.log(
    "COZUM_VALIDATOR_5_YILDIZ_TESTI_TAMAMLANDI",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
