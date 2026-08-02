const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SUBJECTS_FILE = path.join(ROOT, "data", "subjects.ts");
const OUTPUT_DIR = path.join(ROOT, "tyt-ai-final-audit");

const PROGRESS_FILE = path.join(OUTPUT_DIR, "progress.json");
const REPORT_JSON = path.join(OUTPUT_DIR, "report.json");
const REPORT_TEXT = path.join(OUTPUT_DIR, "report.txt");
const ANSWERS_DIR = path.join(OUTPUT_DIR, "answers");

const API_URL =
  "https://konutakip-backend.onrender.com/api/v1/ai/teach-topic";

const REQUEST_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const WAIT_BETWEEN_ATTEMPTS_MS = 20_000;
const WAIT_BETWEEN_TOPICS_MS = 10_000;

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

function repairText(value) {
  let text = String(value ?? "");

  if (/[ÃÄÅâ]/.test(text)) {
    try {
      const repaired = Buffer
        .from(text, "latin1")
        .toString("utf8");

      if (
        repaired &&
        !repaired.includes("�")
      ) {
        text = repaired;
      }
    } catch {}
  }

  const replacements = new Map([
    ["Y�zde ve K�r-Zarar", "Yüzde ve Kâr-Zarar"],
    ["T�rk�e", "Türkçe"],
    ["Co�rafya", "Coğrafya"],
    ["Din K�lt�r�", "Din Kültürü"],
  ]);

  return replacements.get(text) ?? text;
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

function extractTytSubjects() {
  const source = fs.readFileSync(SUBJECTS_FILE, "utf8");

  const start = source.indexOf(
    "export const TYT_SUBJECTS",
  );

  const end = source.indexOf(
    "const AYT_MATEMATIK_TOPICS",
    start,
  );

  if (start === -1 || end === -1) {
    throw new Error(
      "subjects.ts içindeki TYT_SUBJECTS bloğu bulunamadı.",
    );
  }

  const block = source.slice(start, end);

  const subjectRegex =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?topics:\s*makeTopics\(\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\),\s*\}/g;

  const subjects = [];
  let subjectMatch;

  while (
    (subjectMatch = subjectRegex.exec(block)) !== null
  ) {
    const subjectId = subjectMatch[1];
    const subjectName = repairText(subjectMatch[2]);
    const topicPrefix = subjectMatch[3];
    const topicBlock = subjectMatch[4];

    const topics = [];
    const topicRegex = /"([^"]+)"/g;

    let topicMatch;
    let topicIndex = 0;

    while (
      (topicMatch = topicRegex.exec(topicBlock)) !== null
    ) {
      topics.push({
        id: `${topicPrefix}-${topicIndex}`,
        name: repairText(topicMatch[1]),
      });

      topicIndex += 1;
    }

    subjects.push({
      id: subjectId,
      name: subjectName,
      topics,
    });
  }

  if (subjects.length !== 9) {
    throw new Error(
      `Beklenen 9 TYT dersi yerine ${subjects.length} ders bulundu.`,
    );
  }

  const totalTopics = subjects.reduce(
    (sum, subject) => sum + subject.topics.length,
    0,
  );

  if (totalTopics !== 62) {
    throw new Error(
      `Beklenen 62 TYT konusu yerine ${totalTopics} konu bulundu.`,
    );
  }

  return subjects;
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

    for (
      const letter of ["A", "B", "C", "D", "E"]
    ) {
      const optionRegex = new RegExp(
        `^\\s*${letter}\\)\\s+\\S.+$`,
        "im",
      );

      if (!optionRegex.test(section)) {
        issues.push(
          `${current[1]}. soruda ${letter} seçeneği eksik.`,
        );
      }
    }
  }

  if (hasBrokenEncoding(normalized)) {
    issues.push("Bozuk Türkçe karakter tespit edildi.");
  }

  if (
    /^[A-E]\)\s*(dey|day)\b/im.test(
      questionArea,
    )
  ) {
    issues.push("Uydurma seçenek tespit edildi.");
  }

  return {
    passed: issues.length === 0,
    issues,
    questionCount: questionMatches.length,
    solutionCount: solutionMatches.length,
    answerKeyCount: answerKeyMatches.length,
    answerLetter:
      answerKeyMatches[0]?.[2]?.toUpperCase() ?? null,
  };
}

function solutionSupportsAnswer(
  content,
  answerLetter,
) {
  if (!answerLetter) {
    return false;
  }

  const solutionArea =
    String(content)
      .split(/^##\s+Çözümler\s*$/im)[1] ?? "";

  const patterns = [
    new RegExp(
      `\\b${answerLetter}\\s+(?:seçeneği|şıkkı)\\b`,
      "i",
    ),
    new RegExp(
      `\\bdoğru\\s+(?:cevap|seçenek)[^\\n]{0,100}\\b${answerLetter}\\b`,
      "i",
    ),
    new RegExp(
      `\\b${answerLetter}\\s*\\)`,
      "i",
    ),
    new RegExp(
      `\\*\\*${answerLetter}\\*\\*`,
      "i",
    ),
    new RegExp(
      `seçenek\\s+${answerLetter}\\b`,
      "i",
    ),
  ];

  return patterns.some((pattern) =>
    pattern.test(solutionArea),
  );
}

function inspectContent(content, structure) {
  const issues = [];

  if (content.length < 450) {
    issues.push("Cevap olağandan kısa.");
  }

  if (!/##\s+Soru Analizi/i.test(content)) {
    issues.push("Soru analizi bölümü bulunamadı.");
  }

  if (!/##\s+Adım Adım Çözüm/i.test(content)) {
    issues.push("Adım adım çözüm bölümü bulunamadı.");
  }

  if (!/##\s+Sonuç/i.test(content)) {
    issues.push("Sonuç bölümü bulunamadı.");
  }

  if (!/##\s+Kontrol/i.test(content)) {
    issues.push("Kontrol bölümü bulunamadı.");
  }

  if (
    structure.answerLetter &&
    !solutionSupportsAnswer(
      content,
      structure.answerLetter,
    )
  ) {
    issues.push(
      `Çözüm cevap anahtarındaki ${structure.answerLetter} seçeneğini açıkça desteklemiyor.`,
    );
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
          topicId: item.topic.id,
          topicName: item.topic.name,
          subjectName: item.subject.name,
          examType: "TYT",
          userQuestion:
            `${item.topic.name} konusundan TYT düzeyinde orta seviye ` +
            `1 adet özgün A-B-C-D-E seçenekli soru hazırla. ` +
            `Tam olarak bir doğru cevap bulunsun. ` +
            `Soruyu ve bütün seçenekleri bağımsız biçimde kontrol et. ` +
            `Cevap anahtarını ve ayrıntılı çözümü ayrı bölümlerde ver. ` +
            `Çözümde soru analizi, adım adım çözüm, sonuç ve kontrol bölümleri bulunsun.`,
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
          `DENEME ${attempt} BASARISIZ. ${WAIT_BETWEEN_ATTEMPTS_MS / 1000} saniye sonra tekrar...`,
        );

        await sleep(WAIT_BETWEEN_ATTEMPTS_MS);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function buildTextReport(
  queue,
  results,
  nextIndex,
) {
  const successful = results.filter(
    (item) => item.status === "BASARILI",
  ).length;

  const contentReview = results.filter(
    (item) =>
      item.status === "ICERIK_KONTROLU_GEREKLI",
  ).length;

  const failed = results.filter(
    (item) => item.status === "HATA",
  ).length;

  const durations = results
    .map((item) => item.durationMs ?? 0)
    .filter((value) => value > 0);

  const totalDurationMs = durations.reduce(
    (sum, value) => sum + value,
    0,
  );

  const averageSeconds =
    durations.length > 0
      ? Math.round(
          totalDurationMs /
          durations.length /
          1000,
        )
      : 0;

  const lines = [
    "TYT AI OGRETMEN 62 KONU CANLI SON DENETIM RAPORU",
    "",
    `TOPLAM DERS: 9`,
    `TOPLAM KONU: ${queue.length}`,
    `TAMAMLANAN: ${results.length}`,
    `BASARILI: ${successful}`,
    `ICERIK KONTROLU GEREKLI: ${contentReview}`,
    `HATA: ${failed}`,
    `KALAN: ${queue.length - nextIndex}`,
    `ORTALAMA SURE: ${averageSeconds} saniye`,
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
      "ICERIK KONTROLU:",
      ...(result.contentIssues?.length
        ? result.contentIssues.map(
            (issue) => `- ${issue}`,
          )
        : ["- BASARILI"]),
      "",
      result.error
        ? `GERCEK HATA:\n${result.error}\n`
        : "",
    );
  }

  lines.push(
    "============================================================",
    `SONRAKI KONU INDEXI: ${nextIndex}`,
  );

  return lines.join("\n");
}

async function main() {
  const subjects = extractTytSubjects();

  const queue = subjects.flatMap((subject) =>
    subject.topics.map((topic) => ({
      subject,
      topic,
    })),
  );

  const progress = loadJson(PROGRESS_FILE, {
    nextIndex: 0,
    results: [],
    startedAt: new Date().toISOString(),
  });

  console.log("");
  console.log("TYT 62 KONU CANLI DENETIM BASLADI");
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
      `${item.subject.name} / ${item.topic.name}`,
    );

    const startedAt = Date.now();

    let result;

    try {
      const response = await requestTopic(item);

      const structure = analyzeStructure(
        response.content,
      );

      const contentAudit = inspectContent(
        response.content,
        structure,
      );

      let status = "BASARILI";

      if (!structure.passed) {
        status = "HATA";
      } else if (!contentAudit.passed) {
        status = "ICERIK_KONTROLU_GEREKLI";
      }

      result = {
        index: index + 1,
        subjectId: item.subject.id,
        subjectName: item.subject.name,
        topicId: item.topic.id,
        topicName: item.topic.name,
        status,
        statusCode: response.statusCode,
        attempt: response.attempt,
        provider: response.provider,
        model: response.model,
        durationMs: response.durationMs,
        structureIssues: structure.issues,
        contentIssues: contentAudit.issues,
        answerLetter: structure.answerLetter,
        completedAt: new Date().toISOString(),
      };

      const answerFile = path.join(
        ANSWERS_DIR,
        `${String(index + 1).padStart(2, "0")}-` +
        `${safeFileName(item.subject.name)}-` +
        `${safeFileName(item.topic.name)}.txt`,
      );

      fs.writeFileSync(
        answerFile,
        response.content,
        "utf8",
      );
    } catch (error) {
      result = {
        index: index + 1,
        subjectId: item.subject.id,
        subjectName: item.subject.name,
        topicId: item.topic.id,
        topicName: item.topic.name,
        status: "HATA",
        statusCode: null,
        attempt: null,
        provider: null,
        model: null,
        durationMs: Date.now() - startedAt,
        structureIssues: [],
        contentIssues: [],
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
      buildTextReport(
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
      console.log(
        `${WAIT_BETWEEN_TOPICS_MS / 1000} saniye bekleniyor...`,
      );

      await sleep(WAIT_BETWEEN_TOPICS_MS);
    }
  }

  console.log("");
  console.log("TYT_62_KONU_CANLI_DENETIM_TAMAMLANDI");
  console.log(`RAPOR=${REPORT_TEXT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
