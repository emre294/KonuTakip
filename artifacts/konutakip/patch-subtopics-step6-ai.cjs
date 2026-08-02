const fs = require("fs");

const teacherPath = "./app/ai-teacher.tsx";
const coachPath = "./app/ai-coach.tsx";
const backendPath = "./backend/src/routes/ai.ts";

let teacher = fs.readFileSync(
  teacherPath,
  "utf8",
).replace(/\r\n/g, "\n");

let coach = fs.readFileSync(
  coachPath,
  "utf8",
).replace(/\r\n/g, "\n");

let backend = fs.readFileSync(
  backendPath,
  "utf8",
).replace(/\r\n/g, "\n");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeTurkish(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
 * 1. AI ÖĞRETMEN — TYT VERİSİNİ İÇE AKTAR
 * ========================================================= */

if (
  !teacher.includes(
    'import { TYT_SUBJECTS } from "@/data/subjects";',
  )
) {
  const teacherImport =
    'import { useApp } from "@/contexts/AppContext";';

  ensure(
    teacher.includes(teacherImport),
    "AI Öğretmen useApp importu bulunamadı",
  );

  teacher = teacher.replace(
    teacherImport,
`${teacherImport}
import { TYT_SUBJECTS } from "@/data/subjects";`,
  );
}

/* =========================================================
 * 2. AI ÖĞRETMEN — KONU/ALT KAZANIM BULUCU
 * ========================================================= */

if (
  !teacher.includes(
    "function buildTytCurriculumContext(",
  )
) {
  const teacherMarker =
    "// â”€â”€â”€ Main content";

  const teacherMarkerIndex =
    teacher.indexOf(teacherMarker);

  ensure(
    teacherMarkerIndex !== -1,
    "AI Öğretmen ana içerik işaretçisi bulunamadı",
  );

  const teacherHelper = `type MatchedCurriculumContext = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopicNames: string[];
};

function normalizeCurriculumText(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\\s]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function buildTytCurriculumContext(
  userText: string,
): MatchedCurriculumContext | null {
  const normalizedText =
    normalizeCurriculumText(userText);

  if (!normalizedText) {
    return null;
  }

  let bestMatch:
    | {
        score: number;
        context: MatchedCurriculumContext;
      }
    | null = null;

  for (const subject of TYT_SUBJECTS) {
    const normalizedSubject =
      normalizeCurriculumText(subject.name);

    for (const topic of subject.topics) {
      const normalizedTopic =
        normalizeCurriculumText(topic.name);

      const matchingSubtopics =
        (topic.subtopics ?? []).filter(
          (subtopic) => {
            const normalizedSubtopic =
              normalizeCurriculumText(
                subtopic.name,
              );

            return (
              normalizedSubtopic.length >= 4 &&
              normalizedText.includes(
                normalizedSubtopic,
              )
            );
          },
        );

      let score = 0;

      if (
        normalizedTopic.length >= 4 &&
        normalizedText.includes(
          normalizedTopic,
        )
      ) {
        score += 100;
      }

      if (
        normalizedSubject.length >= 4 &&
        normalizedText.includes(
          normalizedSubject,
        )
      ) {
        score += 15;
      }

      score +=
        matchingSubtopics.length * 140;

      if (score <= 0) {
        continue;
      }

      const selectedSubtopics =
        matchingSubtopics.length > 0
          ? matchingSubtopics.map(
              (subtopic) => subtopic.name,
            )
          : (topic.subtopics ?? []).map(
              (subtopic) => subtopic.name,
            );

      if (
        !bestMatch ||
        score > bestMatch.score
      ) {
        bestMatch = {
          score,
          context: {
            subjectId: subject.id,
            subjectName: subject.name,
            topicId: topic.id,
            topicName: topic.name,
            subtopicNames:
              selectedSubtopics,
          },
        };
      }
    }
  }

  return bestMatch?.context ?? null;
}

function formatCurriculumContext(
  context: MatchedCurriculumContext | null,
): string {
  if (!context) {
    return "";
  }

  return [
    "MÜFREDAT BAĞLAMI:",
    \`Ders: \${context.subjectName}\`,
    \`Ana konu: \${context.topicName}\`,
    context.subtopicNames.length > 0
      ? [
          "Alt kazanımlar:",
          ...context.subtopicNames.map(
            (name) => \`- \${name}\`,
          ),
        ].join("\\n")
      : "",
    "Yanıtı bu ana konu ve alt kazanım sınırları içinde hazırla.",
    "Kullanıcının özellikle belirttiği alt kazanımı önceliklendir.",
    "TYT dışına ve gereksiz ileri ayrıntılara çıkma.",
  ]
    .filter(Boolean)
    .join("\\n");
}

`;

  teacher =
    teacher.slice(0, teacherMarkerIndex) +
    teacherHelper +
    teacher.slice(teacherMarkerIndex);
}

/* =========================================================
 * 3. AI ÖĞRETMEN — İSTEĞE MÜFREDAT BAĞLAMI EKLE
 * ========================================================= */

const teacherStudentNameLine =
  '          const studentName = profile?.name?.trim() || "Ã–ÄŸrenci";';

ensure(
  teacher.includes(teacherStudentNameLine),
  "AI Öğretmen öğrenci adı satırı bulunamadı",
);

if (
  !teacher.includes(
    "const curriculumContext =",
  )
) {
  teacher = teacher.replace(
    teacherStudentNameLine,
`${teacherStudentNameLine}

          const curriculumContext =
            buildTytCurriculumContext(
              trimmed ||
              recentConversation,
            );

          const curriculumPrompt =
            formatCurriculumContext(
              curriculumContext,
            );`,
  );
}

const teacherQuestionArray = `          const contextualQuestion = [
            \`Ã–ÄŸrencinin adÄ±: \${studentName}\`,
            recentConversation`;

ensure(
  teacher.includes(teacherQuestionArray),
  "AI Öğretmen contextualQuestion bloğu bulunamadı",
);

if (
  !teacher.includes(
    "            curriculumPrompt,",
  )
) {
  teacher = teacher.replace(
    teacherQuestionArray,
`          const contextualQuestion = [
            \`Ã–ÄŸrencinin adÄ±: \${studentName}\`,
            curriculumPrompt,
            recentConversation`,
  );
}

const oldTeacherRequest = `          topicId: \`chat_\${Date.now()}\`,
          topicName: trimmed,
          subjectName: "Genel",
          examType: "TYT",`;

ensure(
  teacher.includes(oldTeacherRequest),
  "AI Öğretmen istek konu alanları bulunamadı",
);

teacher = teacher.replace(
  oldTeacherRequest,
`          topicId:
            curriculumContext?.topicId ??
            \`chat_\${Date.now()}\`,
          topicName:
            curriculumContext?.topicName ??
            trimmed,
          subjectName:
            curriculumContext?.subjectName ??
            "Genel",
          examType: "TYT",`,
);

/* =========================================================
 * 4. AI KOÇ — TYT VERİSİNİ İÇE AKTAR
 * ========================================================= */

if (
  !coach.includes(
    'import { TYT_SUBJECTS } from "@/data/subjects";',
  )
) {
  const coachImport =
    'import { useApp } from "@/contexts/AppContext";';

  ensure(
    coach.includes(coachImport),
    "AI Koç useApp importu bulunamadı",
  );

  coach = coach.replace(
    coachImport,
`${coachImport}
import { TYT_SUBJECTS } from "@/data/subjects";`,
  );
}

/* =========================================================
 * 5. AI KOÇ — ALT KAZANIM DURUM ÖZETİ
 * ========================================================= */

if (
  !coach.includes(
    "function buildCoachCurriculumSnapshot(",
  )
) {
  const coachMarker =
    "function AICoachContent()";

  const coachMarkerIndex =
    coach.indexOf(coachMarker);

  ensure(
    coachMarkerIndex !== -1,
    "AI Koç içerik başlangıcı bulunamadı",
  );

  const coachHelper = `function buildCoachCurriculumSnapshot(
  topicCompletion: Record<string, boolean>,
  subtopicCompletion: Record<string, boolean>,
): string {
  const topicStates = TYT_SUBJECTS.flatMap(
    (subject) =>
      subject.topics.map((topic) => {
        const subtopics =
          topic.subtopics ?? [];

        const completedSubtopics =
          subtopics.filter(
            (subtopic) =>
              !!subtopicCompletion[
                subtopic.id
              ],
          );

        const incompleteSubtopics =
          subtopics.filter(
            (subtopic) =>
              !subtopicCompletion[
                subtopic.id
              ],
          );

        return {
          subjectName: subject.name,
          topicName: topic.name,
          topicCompleted:
            !!topicCompletion[topic.id],
          completedCount:
            completedSubtopics.length,
          totalCount: subtopics.length,
          incompleteNames:
            incompleteSubtopics.map(
              (subtopic) =>
                subtopic.name,
            ),
        };
      }),
  );

  const activeWeakAreas = topicStates
    .filter(
      (item) =>
        !item.topicCompleted &&
        item.totalCount > 0 &&
        item.completedCount > 0,
    )
    .sort(
      (a, b) =>
        b.completedCount -
        a.completedCount,
    );

  const untouchedAreas = topicStates
    .filter(
      (item) =>
        !item.topicCompleted &&
        item.totalCount > 0 &&
        item.completedCount === 0,
    );

  const selected = [
    ...activeWeakAreas,
    ...untouchedAreas,
  ].slice(0, 12);

  const completedTopicCount =
    topicStates.filter(
      (item) => item.topicCompleted,
    ).length;

  if (selected.length === 0) {
    return [
      "KAZANIM DURUMU:",
      \`Tamamlanan TYT ana konu: \${completedTopicCount}/\${topicStates.length}\`,
      "Listelenebilir eksik alt kazanım bulunmuyor.",
    ].join("\\n");
  }

  return [
    "KAZANIM DURUMU:",
    \`Tamamlanan TYT ana konu: \${completedTopicCount}/\${topicStates.length}\`,
    "Öncelikli çalışılması gereken ana konu ve alt kazanımlar:",
    ...selected.map((item) => {
      const incomplete =
        item.incompleteNames
          .slice(0, 5)
          .join(", ");

      return (
        \`- \${item.subjectName} / \${item.topicName}: \` +
        \`\${item.completedCount}/\${item.totalCount} tamamlandı. \` +
        \`Eksikler: \${incomplete}\`
      );
    }),
    "Plan ve önerileri mümkün olduğunca bu eksik kazanımlara dayandır.",
    "Tamamlanmış kazanımları yeniden ana çalışma hedefi yapma; yalnızca tekrar gerekiyorsa belirt.",
  ].join("\\n");
}

`;

  coach =
    coach.slice(0, coachMarkerIndex) +
    coachHelper +
    coach.slice(coachMarkerIndex);
}

/* =========================================================
 * 6. AI KOÇ — CONTEXT VERİLERİNİ AL
 * ========================================================= */

const oldCoachUseApp =
  "  const { profile } = useApp();";

ensure(
  coach.includes(oldCoachUseApp),
  "AI Koç useApp satırı bulunamadı",
);

coach = coach.replace(
  oldCoachUseApp,
`  const {
    profile,
    topicCompletion,
    subtopicCompletion,
    tytProgress,
    aytProgress,
    studyStreak,
    totalTopicsCompleted,
  } = useApp();`,
);

/* =========================================================
 * 7. AI KOÇ — KİŞİSEL MESAJI KAZANIMLARLA ZENGİNLEŞTİR
 * ========================================================= */

const coachTryMarker = `    try {
      const personalizedMessage = [`;

ensure(
  coach.includes(coachTryMarker),
  "AI Koç personalizedMessage başlangıcı bulunamadı",
);

if (
  !coach.includes(
    "const curriculumSnapshot =",
  )
) {
  coach = coach.replace(
    coachTryMarker,
`    try {
      const curriculumSnapshot =
        buildCoachCurriculumSnapshot(
          topicCompletion,
          subtopicCompletion,
        );

      const learnerSummary = [
        "ÖĞRENCİ İLERLEME ÖZETİ:",
        \`TYT genel ilerleme: %\${tytProgress}\`,
        \`AYT genel ilerleme: %\${aytProgress}\`,
        \`Çalışma serisi: \${studyStreak} gün\`,
        \`Tamamlanan ana konu: \${totalTopicsCompleted}\`,
      ].join("\\n");

      const personalizedMessage = [`,
  );
}

const coachNameBlock = `          profile?.name?.trim()
            ? \`Öğrencinin adı: \${profile.name.trim()}\`
            : "",
          cleanMessage,`;

ensure(
  coach.includes(coachNameBlock),
  "AI Koç mesaj dizisi bulunamadı",
);

coach = coach.replace(
  coachNameBlock,
`          profile?.name?.trim()
            ? \`Öğrencinin adı: \${profile.name.trim()}\`
            : "",
          learnerSummary,
          curriculumSnapshot,
          cleanMessage,`,
);

/* =========================================================
 * 8. BACKEND — MÜFREDAT HİYERARŞİ KURALLARI
 * ========================================================= */

if (
  !backend.includes(
    "function getCurriculumHierarchyRules(",
  )
) {
  const backendMarker =
    "function getSubjectExpertRules(";

  const backendMarkerIndex =
    backend.indexOf(backendMarker);

  ensure(
    backendMarkerIndex !== -1,
    "Backend ders uzmanı başlangıcı bulunamadı",
  );

  const backendHelper = `function getCurriculumHierarchyRules(
  requestData: Record<string, unknown>,
): string {
  const requestText = String(
    requestData.userQuestion ??
    requestData.message ??
    requestData.prompt ??
    "",
  );

  const subjectName = String(
    requestData.subjectName ??
    requestData.lessonName ??
    requestData.courseName ??
    "",
  ).trim();

  const topicName = String(
    requestData.topicName ??
    requestData.topic ??
    "",
  ).trim();

  const hasCurriculumContext =
    /MÜFREDAT BAĞLAMI:|KAZANIM DURUMU:|Alt kazanımlar:|Eksikler:/i.test(
      requestText,
    );

  if (
    !hasCurriculumContext &&
    !topicName
  ) {
    return "";
  }

  return \`
ANA KONU VE ALT KAZANIM KURALLARI:

- Ders: \${subjectName || "Belirtilmedi"}
- Ana konu: \${topicName || "Kullanıcı mesajından belirle"}
- Kullanıcı mesajında "MÜFREDAT BAĞLAMI" varsa bunu temel kapsam kabul et.
- Kullanıcı mesajında listelenen alt kazanımları ayrı öğrenme hedefleri olarak değerlendir.
- Konu anlatımında bütün alt kazanımları gelişigüzel karıştırma.
- Kullanıcının özellikle sorduğu alt kazanımı önce açıkla.
- Soru üretiminde soru kökünün hangi alt kazanımı ölçtüğünü sessizce belirle.
- Soru yalnızca listelenen ana konu ve alt kazanım sınırında kalmalıdır.
- Çeldiricileri ilgili alt kazanımdaki gerçek kavram yanılgılarından üret.
- Çözümde kullanılan ana konu ve alt kazanım mantığını açıkla.
- AI Koç isteğinde tamamlanmamış alt kazanımları önceliklendir.
- Tamamlanmış kazanımları gereksiz yere yeniden ana hedef yapma.
- Müfredat bağlamı ile kullanıcının açık isteği çelişirse kullanıcının açık isteğini takip et fakat çelişkiyi kısa biçimde belirt.
\`.trim();
}

`;

  backend =
    backend.slice(0, backendMarkerIndex) +
    backendHelper +
    backend.slice(backendMarkerIndex);
}

/* =========================================================
 * 9. BACKEND PROMPT ZİNCİRİNE BAĞLA
 * ========================================================= */

const oldPromptChain = `    prompt = [
      prompt,
      getSubjectExpertRules(parsed.data),
      getStudentLevelRules(parsed.data),
      getAdaptiveTeachingRules(parsed.data),
    ].join("\\n\\n");`;

ensure(
  backend.includes(oldPromptChain),
  "Backend prompt zinciri bulunamadı",
);

backend = backend.replace(
  oldPromptChain,
`    prompt = [
      prompt,
      getCurriculumHierarchyRules(
        parsed.data,
      ),
      getSubjectExpertRules(parsed.data),
      getStudentLevelRules(parsed.data),
      getAdaptiveTeachingRules(parsed.data),
    ]
      .filter(Boolean)
      .join("\\n\\n");`,
);

/* =========================================================
 * 10. SON KONTROLLER
 * ========================================================= */

ensure(
  teacher.includes(
    "function buildTytCurriculumContext(",
  ),
  "AI Öğretmen konu bulucu eklenmedi",
);

ensure(
  teacher.includes(
    "curriculumContext?.topicId",
  ),
  "AI Öğretmen topicId bağlanmadı",
);

ensure(
  teacher.includes(
    "curriculumContext?.subjectName",
  ),
  "AI Öğretmen subjectName bağlanmadı",
);

ensure(
  coach.includes(
    "function buildCoachCurriculumSnapshot(",
  ),
  "AI Koç kazanım özeti eklenmedi",
);

ensure(
  coach.includes(
    "subtopicCompletion,",
  ),
  "AI Koç alt kazanım ilerlemesini almıyor",
);

ensure(
  coach.includes(
    "curriculumSnapshot,",
  ),
  "AI Koç kazanım özeti mesaja eklenmedi",
);

ensure(
  backend.includes(
    "function getCurriculumHierarchyRules(",
  ),
  "Backend müfredat kuralları eklenmedi",
);

ensure(
  backend.includes(
    "getCurriculumHierarchyRules(",
  ),
  "Backend müfredat kuralları prompta bağlanmadı",
);

fs.writeFileSync(
  teacherPath,
  teacher,
  "utf8",
);

fs.writeFileSync(
  coachPath,
  coach,
  "utf8",
);

fs.writeFileSync(
  backendPath,
  backend,
  "utf8",
);

console.log("PATCH_OK");
