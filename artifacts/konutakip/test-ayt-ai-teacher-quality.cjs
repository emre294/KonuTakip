const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const API_BASE =
  process.env.KONUTAKIP_API_URL ??
  "https://konutakip-backend.onrender.com/api/v1/ai";

const REPORT_PATH = path.join(
  ROOT,
  "ayt-ai-teacher-quality-report.txt",
);

const PROGRESS_PATH = path.join(
  ROOT,
  "ayt-ai-teacher-quality-progress.json",
);

const ANSWERS_DIR = path.join(
  ROOT,
  "ayt-ai-teacher-quality-answers",
);

const TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 2;
const WAIT_MS = 2500;

const subjects = [
  {
    id: "matematik",
    subjectName: "AYT Matematik",
    generationTopic: "Türev",
    generationTerms: ["türev", "teğet", "değişim"],
    solveTopic: "Türev",
    solveQuestion: `
f(x) = x^3 - 3x^2 + 2 olduğuna göre f'(2) kaçtır?

A) -2
B) 0
C) 2
D) 4
E) 6
`.trim(),
    expectedLetter: "B",
    expectedTokens: ["0"],
    solutionTerms: ["3x", "türev"],
  },
  {
    id: "geometri",
    subjectName: "AYT Geometri",
    generationTopic: "Analitik Geometri - Doğru",
    generationTerms: ["doğru", "eğim", "analitik"],
    solveTopic: "Analitik Geometri - Doğru",
    solveQuestion: `
Eğimi -1 olan ve (2, 3) noktasından geçen doğrunun y eksenini kestiği noktanın ordinatı kaçtır?

A) 1
B) 2
C) 3
D) 5
E) 7
`.trim(),
    expectedLetter: "D",
    expectedTokens: ["5"],
    solutionTerms: ["eğim", "y"],
  },
  {
    id: "fizik",
    subjectName: "AYT Fizik",
    generationTopic: "Kondansatörler",
    generationTerms: ["kondansatör", "sığa", "yük"],
    solveTopic: "Kondansatörler",
    solveQuestion: `
Sığası 2 mikrofarad olan bir kondansatörün uçları arasındaki potansiyel fark 3 volttur.

Kondansatörde depolanan yük kaç mikrocoulombdur?

A) 1
B) 2
C) 6
D) 9
E) 12
`.trim(),
    expectedLetter: "C",
    expectedTokens: ["6", "q", "cv"],
    solutionTerms: ["sığa", "yük"],
  },
  {
    id: "kimya",
    subjectName: "AYT Kimya",
    generationTopic: "Kimyasal Denge",
    generationTerms: ["denge", "kc", "derişim"],
    solveTopic: "Kimyasal Denge",
    solveQuestion: `
H2(g) + I2(g) ⇌ 2HI(g)

tepkimesi dengedeyken H2, I2 ve HI derişimleri sırasıyla 1 M, 1 M ve 2 M'dir.

Buna göre Kc kaçtır?

A) 1/4
B) 1/2
C) 2
D) 4
E) 8
`.trim(),
    expectedLetter: "D",
    expectedTokens: ["4"],
    solutionTerms: ["kc", "denge"],
  },
  {
    id: "biyoloji",
    subjectName: "AYT Biyoloji",
    generationTopic: "Nükleik Asitler",
    generationTerms: ["dna", "nükleik", "nükleotit"],
    solveTopic: "Nükleik Asitler",
    solveQuestion: `
DNA'nın yarı korunumlu eşlenmesiyle ilgili aşağıdakilerden hangisi doğrudur?

A) Yeni DNA'ların ikisi de yalnızca eski zincirlerden oluşur.
B) Yeni DNA'ların ikisi de yalnızca yeni zincirlerden oluşur.
C) Her yeni DNA bir eski ve bir yeni zincir içerir.
D) Eski DNA tamamen parçalanır.
E) Yalnızca bir DNA molekülü oluşur.
`.trim(),
    expectedLetter: "C",
    expectedTokens: [
      "bir eski",
      "bir yeni",
      "yarı korunumlu",
    ],
    solutionTerms: ["dna", "zincir"],
  },
  {
    id: "edebiyat",
    subjectName: "AYT Türk Dili ve Edebiyatı",
    generationTopic: "Divan Edebiyatı",
    generationTerms: ["divan", "gazel", "beyit"],
    solveTopic: "Divan Edebiyatı",
    solveQuestion: `
Aşağıdakilerden hangisi Divan edebiyatının genel özelliklerinden biridir?

A) Sade halk dili temel alınmıştır.
B) Nazım birimi çoğunlukla beyittir.
C) Yalnızca hece ölçüsü kullanılmıştır.
D) Anonim ürünlere dayanır.
E) Batı edebiyatı örnek alınmıştır.
`.trim(),
    expectedLetter: "B",
    expectedTokens: ["beyit"],
    solutionTerms: ["divan", "nazım"],
  },
  {
    id: "tarih1",
    subjectName: "AYT Tarih 1",
    generationTopic: "II. Meşrutiyet",
    generationTerms: ["meşrutiyet", "anayasa", "meclis"],
    solveTopic: "I. Meşrutiyet",
    solveQuestion: `
Osmanlı Devleti'nde Kanun-ı Esasi'nin ilan edilerek anayasal yönetime geçildiği dönem aşağıdakilerden hangisidir?

A) Tanzimat Dönemi
B) Islahat Dönemi
C) I. Meşrutiyet
D) II. Meşrutiyet
E) Lale Devri
`.trim(),
    expectedLetter: "C",
    expectedTokens: ["I. Meşrutiyet", "1. Meşrutiyet"],
    solutionTerms: ["kanun", "esasi"],
  },
  {
    id: "cografya1",
    subjectName: "AYT Coğrafya 1",
    generationTopic: "Türkiye'nin İklimi",
    generationTerms: ["iklim", "türkiye", "yağış"],
    solveTopic: "Türkiye'nin İklimi",
    solveQuestion: `
Akdeniz ikliminin doğal bitki örtüsü aşağıdakilerden hangisidir?

A) Tundra
B) Tayga
C) Maki
D) Bozkır
E) Savan
`.trim(),
    expectedLetter: "C",
    expectedTokens: ["maki"],
    solutionTerms: ["akdeniz", "bitki"],
  },
  {
    id: "tarih2",
    subjectName: "AYT Tarih 2",
    generationTopic: "Soğuk Savaş Dönemi",
    generationTerms: ["soğuk savaş", "blok", "abd"],
    solveTopic: "Soğuk Savaş Dönemi",
    solveQuestion: `
II. Dünya Savaşı sonrasında Avrupa ülkelerinin ekonomik olarak desteklenmesi amacıyla ABD tarafından uygulanan program hangisidir?

A) Truman Doktrini
B) Marshall Planı
C) Varşova Paktı
D) Schuman Planı
E) Molotov Planı
`.trim(),
    expectedLetter: "B",
    expectedTokens: ["marshall"],
    solutionTerms: ["abd", "avrupa"],
  },
  {
    id: "cografya2",
    subjectName: "AYT Coğrafya 2",
    generationTopic: "Türkiye'nin Jeopolitiği",
    generationTerms: ["jeopolitik", "türkiye", "boğaz"],
    solveTopic: "Türkiye'nin Jeopolitiği",
    solveQuestion: `
Türkiye'nin İstanbul ve Çanakkale boğazlarına sahip olması aşağıdaki konum özelliklerinden hangisiyle açıklanır?

A) Matematik konum
B) Mutlak konum
C) Özel konum
D) Enlem
E) Boylam
`.trim(),
    expectedLetter: "C",
    expectedTokens: ["özel konum", "ozel konum"],
    solutionTerms: ["boğaz", "konum"],
  },
  {
    id: "felsefe",
    subjectName: "AYT Felsefe Grubu",
    generationTopic: "Klasik Mantık",
    generationTerms: ["mantık", "önerme", "çıkarım"],
    solveTopic: "Klasik Mantık",
    solveQuestion: `
Bütün insanlar ölümlüdür.
Sokrates insandır.
O hâlde Sokrates ölümlüdür.

Bu akıl yürütme aşağıdakilerden hangisine örnektir?

A) Analoji
B) Tümevarım
C) Dedüksiyon
D) Hipotez
E) Gözlem
`.trim(),
    expectedLetter: "C",
    expectedTokens: ["dedüksiyon", "tümdengelim"],
    solutionTerms: ["çıkarım", "öncül"],
  },
  {
    id: "din",
    subjectName: "AYT Din Kültürü",
    generationTopic: "İslam'ın Temel Kaynakları",
    generationTerms: ["kur'an", "sünnet", "kaynak"],
    solveTopic: "İslam'ın Temel Kaynakları",
    solveQuestion: `
İslam dininin iki temel kaynağı aşağıdakilerden hangisidir?

A) Kur'an ve sünnet
B) İcma ve kıyas
C) Örf ve gelenek
D) Akıl ve deney
E) Tarih ve coğrafya
`.trim(),
    expectedLetter: "A",
    expectedTokens: ["kur'an", "sünnet"],
    solutionTerms: ["kaynak", "islam"],
  },
];

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
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_PATH)) {
    return {};
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        PROGRESS_PATH,
        "utf8",
      ),
    );
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  fs.writeFileSync(
    PROGRESS_PATH,
    JSON.stringify(
      progress,
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

function sanitizeFileName(value) {
  return value.replace(
    /[^a-z0-9_-]/gi,
    "-",
  );
}

function findAnswerLetters(content) {
  const letters = [];

  const patterns = [
    /doğru\s*cevap\s*[:\-]\s*\**([A-E])\b/gi,
    /cevap\s*[:\-]\s*\**([A-E])\b/gi,
    /cevap\s*anahtarı[\s\S]{0,80}?\b1\s*[.)\-:]\s*\**([A-E])\b/gi,
    /sonuç[\s\S]{0,80}?\b([A-E])\s*(?:seçeneği|şıkkı|şıkkıdır)/gi,
  ];

  for (const pattern of patterns) {
    for (
      const match of content.matchAll(pattern)
    ) {
      letters.push(
        String(match[1]).toUpperCase(),
      );
    }
  }

  return [...new Set(letters)];
}

function countOptions(content) {
  const optionLetters = [];

  for (
    const match of content.matchAll(
      /^\s*([A-E])\s*[\).:\-]\s+.+$/gim,
    )
  ) {
    optionLetters.push(
      match[1].toUpperCase(),
    );
  }

  return {
    count: optionLetters.length,
    unique: [
      ...new Set(optionLetters),
    ],
  };
}

function countQuestions(content) {
  const normalized = String(
    content ?? "",
  )
    .replace(/\r\n/g, "\n")
    .trim();

  const answerKeyIndex =
    normalized.search(
      /^##\s+Cevap\s+Anahtar(?:ı|i)\s*$/im,
    );

  const solutionsIndex =
    normalized.search(
      /^##\s+(?:Çözümler|Cozumler)\s*$/im,
    );

  const boundaryIndexes = [
    answerKeyIndex,
    solutionsIndex,
  ].filter(
    (index) => index >= 0,
  );

  const questionArea =
    boundaryIndexes.length > 0
      ? normalized.slice(
          0,
          Math.min(
            ...boundaryIndexes,
          ),
        )
      : normalized;

  const numberedQuestions = [
    ...questionArea.matchAll(
      /(?:^|\n)\s*(?:#{1,6}\s*)?(\d+)\.\s*Soru\s*(?=\n|$)/gi,
    ),
  ];

  if (numberedQuestions.length > 0) {
    return numberedQuestions.length;
  }

  const plainQuestions = [
    ...questionArea.matchAll(
      /(?:^|\n)\s*(?:#{1,6}\s*)?Soru\s*[:\-]?\s*(?=\n|$)/gi,
    ),
  ];

  return Math.max(
    1,
    plainQuestions.length,
  );
}

function includesAny(
  content,
  values,
) {
  const normalized =
    normalize(content);

  return values.some((value) =>
    normalized.includes(
      normalize(value),
    ),
  );
}

async function callEndpoint({
  endpoint,
  payload,
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
      TIMEOUT_MS,
    );

    const startedAt = Date.now();

    try {
      const response = await fetch(
        `${API_BASE}/${endpoint}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const raw = await response.text();

      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          content: raw,
        };
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${
            parsed.error ??
            parsed.message ??
            raw.slice(0, 1000)
          }`,
        );
      }

      const content =
        String(
          parsed.content ?? "",
        ).trim();

      if (!content) {
        throw new Error(
          "Backend boş cevap döndürdü",
        );
      }

      return {
        http: response.status,
        duration:
          Math.round(
            (Date.now() - startedAt) /
            1000,
          ),
        attempt,
        provider:
          parsed.provider ?? "-",
        model:
          parsed.model ?? "-",
        content,
      };
    } catch (error) {
      lastError = error;

      if (attempt < MAX_ATTEMPTS) {
        await sleep(
          10_000 * attempt,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function validateGeneration(
  subject,
  response,
) {
  const findings = [];

  const options =
    countOptions(response.content);

  const questionCount =
    countQuestions(response.content);

  const answerLetters =
    findAnswerLetters(
      response.content,
    );

  if (questionCount !== 1) {
    findings.push(
      `Soru sayısı 1 değil: ${questionCount}`,
    );
  }

  if (
    options.count !== 5 ||
    options.unique.length !== 5
  ) {
    findings.push(
      `A-E seçenek yapısı hatalı: toplam ${options.count}, benzersiz ${options.unique.length}`,
    );
  }

  if (answerLetters.length === 0) {
    findings.push(
      "Doğru cevap harfi bulunamadı",
    );
  }

  if (answerLetters.length > 1) {
    findings.push(
      `Cevap-çözüm harfleri çelişiyor: ${answerLetters.join(", ")}`,
    );
  }

  if (
    !/çözüm|adım|gerekçe|neden/i.test(
      response.content,
    )
  ) {
    findings.push(
      "Açıklamalı çözüm bulunamadı",
    );
  }

  if (
    !includesAny(
      response.content,
      subject.generationTerms,
    )
  ) {
    findings.push(
      `Konu terimi bulunamadı: ${subject.generationTerms.join(" / ")}`,
    );
  }

  if (
    /üniversite düzeyi|lisans düzeyi|yüksek lisans/i.test(
      response.content,
    )
  ) {
    findings.push(
      "AYT dışı akademik seviye ifadesi bulundu",
    );
  }

  return {
    status:
      findings.length === 0
        ? "BASARILI"
        : "KONTROL_GEREKLI",
    findings,
    answerLetters,
    optionCount: options.count,
    questionCount,
  };
}

function validateSolution(
  subject,
  response,
) {
  const findings = [];

  const answerLetters =
    findAnswerLetters(
      response.content,
    );

  const hasExpectedLetter =
    answerLetters.includes(
      subject.expectedLetter,
    );

  const hasExpectedToken =
    includesAny(
      response.content,
      subject.expectedTokens,
    );

  if (
    !hasExpectedLetter &&
    !hasExpectedToken
  ) {
    findings.push(
      `Beklenen cevap bulunamadı: ${subject.expectedLetter}`,
    );
  }

  if (
    answerLetters.length > 0 &&
    !hasExpectedLetter
  ) {
    findings.push(
      `Yanlış cevap harfi: ${answerLetters.join(", ")}; beklenen ${subject.expectedLetter}`,
    );
  }

  if (
    !includesAny(
      response.content,
      subject.solutionTerms,
    )
  ) {
    findings.push(
      `Çözüm kavramı bulunamadı: ${subject.solutionTerms.join(" / ")}`,
    );
  }

  if (
    !/çünkü|bu nedenle|dolayısıyla|adım|formül|kural|gerekçe/i.test(
      response.content,
    )
  ) {
    findings.push(
      "Yeterli çözüm gerekçesi bulunamadı",
    );
  }

  return {
    status:
      findings.length === 0
        ? "BASARILI"
        : "KONTROL_GEREKLI",
    findings,
    answerLetters,
  };
}

async function run() {
  fs.mkdirSync(
    ANSWERS_DIR,
    {
      recursive: true,
    },
  );

  const progress =
    loadProgress();

  const tests = [];

  for (const subject of subjects) {
    tests.push({
      id: `${subject.id}-generation`,
      type: "SORU_HAZIRLAMA",
      subject,
    });

    tests.push({
      id: `${subject.id}-solution`,
      type: "SORU_COZME",
      subject,
    });
  }

  console.log(
    "AYT AI OGRETMEN KALITE TESTI BASLADI",
  );

  console.log(
    `TOPLAM TEST: ${tests.length}`,
  );

  for (
    let index = 0;
    index < tests.length;
    index += 1
  ) {
    const current =
      tests[index];

    if (
      progress[current.id]?.completed
    ) {
      console.log(
        `[${index + 1}/${tests.length}] ATLANDI: ${current.id}`,
      );

      continue;
    }

    console.log(
      "============================================================",
    );

    console.log(
      `[${index + 1}/${tests.length}] ${current.subject.subjectName} - ${current.type}`,
    );

    try {
      let apiResponse;
      let validation;

      if (
        current.type ===
        "SORU_HAZIRLAMA"
      ) {
        apiResponse =
          await callEndpoint({
            endpoint:
              "practice-question",

            payload: {
              feature:
                "ai_teacher",
              requestedAt:
                new Date()
                  .toISOString(),
              topicId:
                `quality-${current.subject.id}`,
              topicName:
                current.subject
                  .generationTopic,
              subjectName:
                current.subject
                  .subjectName,
              examType: "AYT",
              userQuestion: [
                `${current.subject.generationTopic} konusunda`,
                "tam 1 adet AYT düzeyinde,",
                "5 seçenekli ve tek doğru cevaplı soru hazırla.",
                "Cevap anahtarını ve ayrıntılı çözümü sorudan sonra ver.",
                "Soruyu göndermeden önce bütün seçenekleri sessizce kontrol et.",
              ].join(" "),
              attachments: [],
            },
          });

        validation =
          validateGeneration(
            current.subject,
            apiResponse,
          );
      }
      else {
        apiResponse =
          await callEndpoint({
            endpoint:
              "explain-question",

            payload: {
              feature:
                "ai_teacher",
              requestedAt:
                new Date()
                  .toISOString(),
              topicId:
                `quality-solve-${current.subject.id}`,
              topicName:
                current.subject
                  .solveTopic,
              subjectName:
                current.subject
                  .subjectName,
              examType: "AYT",
              userQuestion: [
                "Aşağıdaki AYT sorusunu çöz.",
                "Doğru seçeneği açıkça belirt.",
                "Neden doğru olduğunu adım adım veya kavramsal gerekçeyle açıkla.",
                "",
                current.subject
                  .solveQuestion,
              ].join("\n"),
              attachments: [],
            },
          });

        validation =
          validateSolution(
            current.subject,
            apiResponse,
          );
      }

      const answerFile =
        path.join(
          ANSWERS_DIR,
          `${String(index + 1).padStart(2, "0")}-${sanitizeFileName(current.id)}.txt`,
        );

      fs.writeFileSync(
        answerFile,
        apiResponse.content +
          "\n",
        "utf8",
      );

      progress[current.id] = {
        completed: true,
        type: current.type,
        subjectName:
          current.subject
            .subjectName,
        topicName:
          current.type ===
          "SORU_HAZIRLAMA"
            ? current.subject
                .generationTopic
            : current.subject
                .solveTopic,
        ...apiResponse,
        content: undefined,
        validation,
        answerFile:
          path.relative(
            ROOT,
            answerFile,
          ),
        updatedAt:
          new Date().toISOString(),
      };

      saveProgress(progress);

      console.log(
        `${validation.status} - ${apiResponse.duration} saniye`,
      );
    } catch (error) {
      progress[current.id] = {
        completed: false,
        type: current.type,
        subjectName:
          current.subject
            .subjectName,
        error:
          error instanceof Error
            ? error.message
            : String(error),
        updatedAt:
          new Date().toISOString(),
      };

      saveProgress(progress);

      console.log(
        `HATA: ${progress[current.id].error}`,
      );
    }

    await sleep(WAIT_MS);
  }

  const resultItems =
    tests.map((test) => ({
      test,
      result:
        progress[test.id] ?? null,
    }));

  const successful =
    resultItems.filter(
      ({ result }) =>
        result?.completed &&
        result.validation?.status ===
          "BASARILI",
    );

  const review =
    resultItems.filter(
      ({ result }) =>
        result?.completed &&
        result.validation?.status ===
          "KONTROL_GEREKLI",
    );

  const errors =
    resultItems.filter(
      ({ result }) =>
        !result?.completed,
    );

  const generationResults =
    resultItems.filter(
      ({ test }) =>
        test.type ===
        "SORU_HAZIRLAMA",
    );

  const solutionResults =
    resultItems.filter(
      ({ test }) =>
        test.type ===
        "SORU_COZME",
    );

  const report = [
    "AYT AI OGRETMEN SORU HAZIRLAMA VE COZME KALITE RAPORU",
    "",
    `TOPLAM DERS: ${subjects.length}`,
    `TOPLAM TEST: ${tests.length}`,
    `BASARILI: ${successful.length}`,
    `KONTROL GEREKLI: ${review.length}`,
    `HATA: ${errors.length}`,
    "",
    `SORU HAZIRLAMA TESTI: ${generationResults.length}`,
    `SORU COZME TESTI: ${solutionResults.length}`,
    "",
    ...resultItems.flatMap(
      (
        {
          test,
          result,
        },
        index,
      ) => [
        "============================================================",
        `${index + 1}. TEST: ${test.subject.subjectName} - ${test.type}`,
        `KONU: ${
          test.type ===
          "SORU_HAZIRLAMA"
            ? test.subject
                .generationTopic
            : test.subject
                .solveTopic
        }`,
        `DURUM: ${
          !result?.completed
            ? "HATA"
            : result.validation
                ?.status ??
              "KONTROL_GEREKLI"
        }`,
        `HTTP: ${result?.http ?? "-"}`,
        `DENEME: ${result?.attempt ?? "-"}`,
        `SURE: ${result?.duration ?? "-"} saniye`,
        `PROVIDER: ${result?.provider ?? "-"}`,
        `MODEL: ${result?.model ?? "-"}`,
        "",
        "BULGULAR:",
        ...(
          result?.validation
            ?.findings?.length > 0
            ? result.validation
                .findings.map(
                  (finding) =>
                    `- ${finding}`,
                )
            : result?.error
              ? [
                  `- ${result.error}`,
                ]
              : ["YOK"]
        ),
        "",
        `CEVAP: ${
          result?.answerFile ??
          "-"
        }`,
        "",
      ],
    ),
    "============================================================",
    successful.length ===
      tests.length
      ? "SONUC: 24/24 TAMAM - AYT AI OGRETMEN SORU HAZIRLAMA VE COZME KALITESI BASARILI"
      : "SONUC: BAZI DERSLER DETAYLI INCELENMELI",
    "",
    `CEVAPLAR: ${ANSWERS_DIR}`,
  ].join("\n");

  fs.writeFileSync(
    REPORT_PATH,
    report + "\n",
    "utf8",
  );

  console.log(report);
}

run().catch((error) => {
  console.error(
    error instanceof Error
      ? error.stack
      : String(error),
  );

  process.exit(1);
});
