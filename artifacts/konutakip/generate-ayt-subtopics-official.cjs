const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const API_URL =
  "https://konutakip-backend.onrender.com/api/v1/ai/teach-topic";

const SUBJECTS_PATH = path.join(
  ROOT,
  "data",
  "subjects.ts",
);

const EVIDENCE_PATH = path.join(
  ROOT,
  "data",
  "aytOfficialTopicEvidence.json",
);

const OUTPUT_PATH = path.join(
  ROOT,
  "data",
  "aytSubtopics.ts",
);

const PROGRESS_PATH = path.join(
  ROOT,
  "ayt-step3-generation-progress.json",
);

const REPORT_PATH = path.join(
  ROOT,
  "ayt-step3-subtopics-report.txt",
);

const REQUEST_TIMEOUT_MS =
  15 * 60 * 1000;

const MAX_ATTEMPTS = 3;
const WAIT_BETWEEN_REQUESTS_MS = 3000;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function read(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

function write(filePath, content) {
  fs.writeFileSync(
    filePath,
    content.trimEnd() + "\n",
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
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAytTopics(source) {
  const start = source.indexOf(
    "const AYT_MATEMATIK_TOPICS",
  );

  const end = source.indexOf(
    "export const FIELD_LABELS",
    start,
  );

  ensure(
    start !== -1 && end !== -1,
    "AYT veri bloğu bulunamadı",
  );

  const block = source.slice(start, end);

  const rawTopics = [
    ...block.matchAll(
      /makeTopic\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g,
    ),
  ].map((match) => ({
    id: match[1],
    name: match[2],
  }));

  const unique = [];
  const seen = new Set();

  for (const topic of rawTopics) {
    if (!seen.has(topic.id)) {
      seen.add(topic.id);
      unique.push(topic);
    }
  }

  return unique;
}

function getSubjectName(topicId) {
  const mapping = [
    ["ayt-matematik-", "AYT Matematik"],
    ["ayt-geometri-", "AYT Geometri"],
    ["ayt-fizik-", "AYT Fizik"],
    ["ayt-kimya-", "AYT Kimya"],
    ["ayt-biyoloji-", "AYT Biyoloji"],
    ["ayt-edebiyat-", "AYT Türk Dili ve Edebiyatı"],
    ["ayt-tarih1-", "AYT Tarih 1"],
    ["ayt-cografya1-", "AYT Coğrafya 1"],
    ["ayt-tarih2-", "AYT Tarih 2"],
    ["ayt-cografya2-", "AYT Coğrafya 2"],
    ["ayt-felsefe-", "AYT Felsefe Grubu"],
    ["ayt-din-", "AYT Din Kültürü"],
  ];

  return (
    mapping.find(([prefix]) =>
      topicId.startsWith(prefix),
    )?.[1] ?? "AYT"
  );
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_PATH)) {
    return {
      completed: {},
      failed: {},
    };
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        PROGRESS_PATH,
        "utf8",
      ),
    );
  } catch {
    return {
      completed: {},
      failed: {},
    };
  }
}

function saveProgress(progress) {
  write(
    PROGRESS_PATH,
    JSON.stringify(
      progress,
      null,
      2,
    ),
  );
}

function extractJsonArray(content) {
  const cleaned = String(content ?? "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const arrayStart =
    cleaned.indexOf("[");

  const arrayEnd =
    cleaned.lastIndexOf("]");

  if (
    arrayStart !== -1 &&
    arrayEnd > arrayStart
  ) {
    try {
      const parsed = JSON.parse(
        cleaned.slice(
          arrayStart,
          arrayEnd + 1,
        ),
      );

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Aşağıdaki güvenli liste parserına geç.
    }
  }

  const objectStart =
    cleaned.indexOf("{");

  const objectEnd =
    cleaned.lastIndexOf("}");

  if (
    objectStart !== -1 &&
    objectEnd > objectStart
  ) {
    try {
      const parsedObject = JSON.parse(
        cleaned.slice(
          objectStart,
          objectEnd + 1,
        ),
      );

      const arrayValue = Object.values(
        parsedObject,
      ).find(Array.isArray);

      if (Array.isArray(arrayValue)) {
        return arrayValue;
      }
    } catch {
      // Satır parserına geç.
    }
  }

  const quotedItems = [
    ...cleaned.matchAll(
      /["“”]([^"“”]{3,180})["“”]/g,
    ),
  ].map((match) => match[1]);

  if (quotedItems.length >= 3) {
    return quotedItems;
  }

  const listItems = cleaned
    .split("\n")
    .map((line) =>
      line
        .replace(
          /^\s*(?:[-•*]|\d+[.)])\s*/,
          "",
        )
        .trim(),
    )
    .filter(
      (line) =>
        line.length >= 3 &&
        line.length <= 180 &&
        !/^(?:açıklama|not|sonuç|json|alt kazanımlar?)\s*:?$/i.test(
          line,
        ),
    );

  if (listItems.length >= 3) {
    return listItems;
  }

  throw new Error(
    "AI cevabında ayrıştırılabilir alt kazanım listesi bulunamadı",
  );
}

function sanitizeSubtopics(
  topicName,
  values,
) {
  const seen = new Set();

  const metaPattern =
    /^(?:not|uyarı|açıklama|gerekçe|kanıt|resmî kanıt|verilen metin|bu konu|aşağıdaki alt kazanımlar)/i;

  const studyPattern =
    /genel tekrar|konu anlatımı|soru çözümü|test çözme|çalışma programı/i;

  const cleaned = values
    .map((value) =>
      String(value ?? "")
        .replace(
          /^\s*[-•*\d.)]+\s*/,
          "",
        )
        .replace(/^["“”]|["“”]$/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .filter(
      (value) =>
        !metaPattern.test(value) &&
        !studyPattern.test(value),
    )
    .filter((value) => {
      const key = normalize(value);

      if (
        key.length < 3 ||
        key === normalize(topicName) ||
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 10);

  ensure(
    cleaned.length >= 3,
    `En az 3 geçerli alt kazanım gerekli: ${cleaned.length}`,
  );

  ensure(
    cleaned.length <= 10,
    "En fazla 10 alt kazanım olabilir",
  );

  for (const item of cleaned) {
    ensure(
      item.length <= 150,
      `Alt kazanım çok uzun: ${item}`,
    );
  }

  return cleaned;
}

async function callBackend({
  subjectName,
  topicId,
  topicName,
  prompt,
}) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(
        API_URL,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            feature: "ai_coach",
            requestedAt:
              new Date().toISOString(),
            topicId,
            topicName,
            subjectName,
            examType: "AYT",
            userQuestion: prompt,
            attachments: [],
          }),
          signal: controller.signal,
        },
      );

      const raw = await response.text();

      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          error: raw,
        };
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${
            parsed.error ??
            parsed.message ??
            raw
          }`,
        );
      }

      const content =
        typeof parsed.content === "string"
          ? parsed.content.trim()
          : "";

      ensure(
        content.length > 0,
        "Backend boş cevap döndürdü",
      );

      return content;
    } catch (error) {
      lastError = error;

      if (attempt < MAX_ATTEMPTS) {
        await sleep(
          15000 * attempt,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

async function repairCandidate(
  topic,
  evidenceText,
  rawCandidate,
  failureReason,
) {
  const subjectName =
    getSubjectName(topic.id);

  const prompt = [
    "AYT ALT KAZANIM KISA ONARIM GÖREVİ",
    "",
    `Ders: ${subjectName}`,
    `Ana konu: ${topic.name}`,
    "",
    "Aşağıdaki önceki cevap geçersiz veya fazla uzun bulundu.",
    `Hata nedeni: ${failureReason}`,
    "",
    "Cevabı sıfırdan düzelt.",
    "Tam olarak 3 ile 8 arasında alt kazanım üret.",
    "Her alt kazanım en fazla 100 karakter olsun.",
    "Her madde tek bir öğrenme hedefi içersin.",
    "Uzun maddeleri iki kısa kazanıma böl.",
    "Not, açıklama, uyarı veya çalışma tavsiyesi yazma.",
    "Soru, seçenek, cevap anahtarı ve çözüm üretme.",
    "Ana konudan başka konuya geçme.",
    "Yalnızca JSON string dizisi döndür.",
    "",
    "ÖNCEKİ CEVAP:",
    String(rawCandidate ?? "").slice(0, 6000),
    "",
    "KONU KANITI:",
    evidenceText.slice(0, 7000),
  ].join("\n");

  const response = await callBackend({
    subjectName,
    topicId: topic.id,
    topicName: topic.name,
    prompt,
  });

  return sanitizeSubtopics(
    topic.name,
    extractJsonArray(response),
  );
}

async function parseOrRepairCandidate(
  topic,
  evidenceText,
  response,
) {
  try {
    return sanitizeSubtopics(
      topic.name,
      extractJsonArray(response),
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : String(error);

    return repairCandidate(
      topic,
      evidenceText,
      response,
      reason,
    );
  }
}

async function repairCandidate(
  topic,
  evidenceText,
  rawCandidate,
  failureReason,
) {
  const subjectName =
    getSubjectName(topic.id);

  const prompt = [
    "AYT ALT KAZANIM KISA ONARIM GÖREVİ",
    "",
    `Ders: ${subjectName}`,
    `Ana konu: ${topic.name}`,
    "",
    "Aşağıdaki önceki cevap geçersiz veya fazla uzun bulundu.",
    `Hata nedeni: ${failureReason}`,
    "",
    "Cevabı sıfırdan düzelt.",
    "Tam olarak 3 ile 8 arasında alt kazanım üret.",
    "Her alt kazanım en fazla 100 karakter olsun.",
    "Her madde tek bir öğrenme hedefi içersin.",
    "Uzun maddeleri iki kısa kazanıma böl.",
    "Not, açıklama, uyarı veya çalışma tavsiyesi yazma.",
    "Soru, seçenek, cevap anahtarı ve çözüm üretme.",
    "Ana konudan başka konuya geçme.",
    "Yalnızca JSON string dizisi döndür.",
    "",
    "ÖNCEKİ CEVAP:",
    String(rawCandidate ?? "").slice(0, 6000),
    "",
    "KONU KANITI:",
    evidenceText.slice(0, 7000),
  ].join("\n");

  const response = await callBackend({
    subjectName,
    topicId: topic.id,
    topicName: topic.name,
    prompt,
  });

  return sanitizeSubtopics(
    topic.name,
    extractJsonArray(response),
  );
}

async function parseOrRepairCandidate(
  topic,
  evidenceText,
  response,
) {
  try {
    return sanitizeSubtopics(
      topic.name,
      extractJsonArray(response),
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : String(error);

    return repairCandidate(
      topic,
      evidenceText,
      response,
      reason,
    );
  }
}

async function generateCandidate(
  topic,
  evidenceText,
) {
  const subjectName =
    getSubjectName(topic.id);

  const prompt = [
    "AYT ALT KAZANIM ÇIKARMA GÖREVİ",
    "",
    `Ders: ${subjectName}`,
    `Ana konu: ${topic.name}`,
    "",
    "Verilen konu kanıtını temel al.",
    "Ana konu dışındaki kazanımları ekleme.",
    "Tam olarak 3 ile 8 arasında alt kazanım üret.",
    "Her alt kazanım en fazla 100 karakter olsun.",
    "Her madde yalnızca tek öğrenme hedefi içersin.",
    "Not, açıklama veya çalışma tavsiyesi yazma.",
    "Kesinlikle soru, seçenek, cevap anahtarı veya çözüm üretme.",
    "Yalnızca JSON string dizisi döndür.",
    "",
    'Örnek: ["Alt kazanım 1", "Alt kazanım 2", "Alt kazanım 3"]',
    "",
    "KONU KANITI:",
    evidenceText,
  ].join("\n");

  const response = await callBackend({
    subjectName,
    topicId: topic.id,
    topicName: topic.name,
    prompt,
  });

  return parseOrRepairCandidate(
    topic,
    evidenceText,
    response,
  );
}

async function validateCandidate(
  topic,
  evidenceText,
  candidate,
) {
  const subjectName =
    getSubjectName(topic.id);

  const prompt = [
    "AYT ALT KAZANIM BAĞIMSIZ DENETİMİ",
    "",
    `Ders: ${subjectName}`,
    `Ana konu: ${topic.name}`,
    "",
    "Aday alt kazanımları konu kanıtıyla denetle.",
    "Ana konu dışına çıkan maddeleri kaldır.",
    "Tekrar eden maddeleri birleştir.",
    "Uzun maddeleri kısa ve tek hedefli maddelere böl.",
    "Nihai listede 3 ile 8 arasında kazanım olsun.",
    "Her kazanım en fazla 100 karakter olsun.",
    "Not, açıklama veya çalışma tavsiyesi yazma.",
    "Soru, seçenek, cevap anahtarı veya çözüm üretme.",
    "Yalnızca düzeltilmiş JSON string dizisini döndür.",
    "",
    "ADAY ALT KAZANIMLAR:",
    JSON.stringify(candidate),
    "",
    "KONU KANITI:",
    evidenceText,
  ].join("\n");

  const response = await callBackend({
    subjectName,
    topicId: topic.id,
    topicName: topic.name,
    prompt,
  });

  return parseOrRepairCandidate(
    topic,
    evidenceText,
    response,
  );
}

function buildEvidenceText(
  topic,
  evidenceEntry,
) {
  const directEvidence = String(
    evidenceEntry?.evidence ?? "",
  )
    .replace(/\s+/g, " ")
    .trim();

  const ignoredWords = new Set([
    "sistemi",
    "donemi",
    "bilgisi",
    "temelleri",
    "devleti",
    "kimyasi",
    "edebiyati",
    "cografyasi",
    "tarihi",
  ]);

  const topicWords = normalize(
    topic.name,
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >= 5 &&
        !ignoredWords.has(word),
    );

  const normalizedEvidence =
    normalize(directEvidence);

  const matchingWordCount =
    topicWords.filter(
      (word) =>
        normalizedEvidence.includes(word),
    ).length;

  const requiredMatchCount =
    topicWords.length <= 1
      ? topicWords.length
      : 2;

  const evidenceIsRelevant =
    directEvidence.length >= 250 &&
    requiredMatchCount > 0 &&
    matchingWordCount >=
      requiredMatchCount;

  if (evidenceIsRelevant) {
    return directEvidence.slice(
      0,
      9000,
    );
  }

  return [
    "Resmî AYT ana konu başlığı:",
    topic.name,
    "",
    "Yalnızca bu ana konunun doğrudan kavram,",
    "işlem, yorumlama ve uygulama kazanımlarını çıkar.",
    "Başka ders veya ana konudan kazanım ekleme.",
    "Kazanımları AYT düzeyinde, kısa ve tek hedefli yaz.",
  ].join("\n");
}

function escapeTs(value) {
  return JSON.stringify(value);
}

function createOutputSource(
  topics,
  completed,
) {
  const lines = [
    "export const AYT_SUBTOPICS_BY_TOPIC_ID: Record<string, string[]> = {",
  ];

  for (const topic of topics) {
    const values =
      completed[topic.id];

    ensure(
      Array.isArray(values) &&
      values.length >= 3,
      `Alt kazanım eksik: ${topic.id}`,
    );

    lines.push(
      `  ${escapeTs(topic.id)}: [`,
    );

    for (const value of values) {
      lines.push(
        `    ${escapeTs(value)},`,
      );
    }

    lines.push("  ],");
  }

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  ensure(
    fs.existsSync(SUBJECTS_PATH),
    "data/subjects.ts bulunamadı",
  );

  ensure(
    fs.existsSync(EVIDENCE_PATH),
    "AYT resmî kanıt dosyası bulunamadı",
  );

  const subjectsSource =
    read(SUBJECTS_PATH);

  const topics =
    extractAytTopics(subjectsSource);

  ensure(
    topics.length === 197,
    `AYT konu sayısı 197 değil: ${topics.length}`,
  );

  const evidenceData =
    JSON.parse(read(EVIDENCE_PATH));

  const evidenceById =
    new Map(
      (evidenceData.topics ?? []).map(
        (item) => [item.id, item],
      ),
    );

  const progress =
    loadProgress();

  progress.completed ??= {};
  progress.failed ??= {};

  const alreadyCompleted =
    Object.keys(
      progress.completed,
    ).length;

  console.log("");
  console.log(
    "AYT 3/7-B ALT KAZANIM URETIMI BASLADI",
  );

  console.log(
    `TOPLAM KONU: ${topics.length}`,
  );

  console.log(
    `ONCEDEN TAMAMLANAN: ${alreadyCompleted}`,
  );

  console.log("");

  const maxTopicsThisRun = Math.max(
    1,
    Number(
      process.env.AYT_MAX_TOPICS_PER_RUN ??
      "12",
    ),
  );

  let attemptedThisRun = 0;

  for (
    let index = 0;
    index < topics.length;
    index += 1
  ) {
    const topic = topics[index];

    if (
      Array.isArray(
        progress.completed[topic.id],
      ) &&
      progress.completed[topic.id]
        .length >= 3
    ) {
      console.log(
        `[${index + 1}/${topics.length}] ATLANDI: ${topic.name}`,
      );

      continue;
    }

    if (
      attemptedThisRun >=
      maxTopicsThisRun
    ) {
      break;
    }

    attemptedThisRun += 1;

    console.log(
      "============================================================",
    );

    console.log(
      `[${index + 1}/${topics.length}] ${getSubjectName(topic.id)} / ${topic.name}`,
    );

    try {
      const evidenceText =
        buildEvidenceText(
          topic,
          evidenceById.get(
            topic.id,
          ),
        );

      const candidate =
        await generateCandidate(
          topic,
          evidenceText,
        );

      await sleep(
        WAIT_BETWEEN_REQUESTS_MS,
      );

      const validated =
        await validateCandidate(
          topic,
          evidenceText,
          candidate,
        );

      progress.completed[
        topic.id
      ] = validated;

      delete progress.failed[
        topic.id
      ];

      saveProgress(progress);

      console.log(
        `BASARILI: ${validated.length} alt kazanım`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      progress.failed[
        topic.id
      ] = {
        name: topic.name,
        error: message,
        updatedAt:
          new Date().toISOString(),
      };

      saveProgress(progress);

      console.log(
        `HATA: ${message}`,
      );
    }

    await sleep(
      WAIT_BETWEEN_REQUESTS_MS,
    );
  }

  const missingTopics =
    topics.filter(
      (topic) =>
        !Array.isArray(
          progress.completed[
            topic.id
          ],
        ) ||
        progress.completed[
          topic.id
        ].length < 3,
    );

  const completedCount =
    topics.length -
    missingTopics.length;

  if (missingTopics.length === 0) {
    write(
      OUTPUT_PATH,
      createOutputSource(
        topics,
        progress.completed,
      ),
    );
  }

  const totalSubtopics =
    Object.values(
      progress.completed,
    ).reduce(
      (sum, values) =>
        sum +
        (
          Array.isArray(values)
            ? values.length
            : 0
        ),
      0,
    );

  const report = [
    "AYT 3/7-B ALT KAZANIM URETIM RAPORU",
    "",
    `AYT ANA KONU: ${topics.length}`,
    `TAMAMLANAN KONU: ${completedCount}`,
    `ALT KAZANIMSIZ KONU: ${missingTopics.length}`,
    `TOPLAM ALT KAZANIM: ${totalSubtopics}`,
    "",
    "KALAN KONULAR:",
    ...(missingTopics.length > 0
      ? missingTopics.map(
          (topic) =>
            `- ${topic.id} | ${topic.name}`,
        )
      : ["YOK"]),
    "",
    missingTopics.length === 0
      ? "SONUC: AYT ALT KAZANIM DOSYASI HAZIR"
      : "SONUC: KOMUTU TEKRAR CALISTIR; KALDIGI YERDEN DEVAM EDER",
  ].join("\n");

  write(
    REPORT_PATH,
    report,
  );

  console.log("");
  console.log(report);

  if (missingTopics.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.stack
      : String(error),
  );

  process.exit(1);
});
