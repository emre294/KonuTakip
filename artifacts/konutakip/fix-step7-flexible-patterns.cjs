const fs = require("fs");

const patchPath =
  "./patch-subtopics-step7-progress.cjs";

let code = fs.readFileSync(
  patchPath,
  "utf8",
).replace(/\r\n/g, "\n");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function replaceSection(
  startMarker,
  endMarker,
  replacement,
  label,
) {
  const start = code.indexOf(startMarker);
  const end = code.indexOf(
    endMarker,
    start,
  );

  ensure(
    start !== -1,
    `${label} başlangıcı bulunamadı`,
  );

  ensure(
    end !== -1,
    `${label} bitişi bulunamadı`,
  );

  code =
    code.slice(0, start) +
    replacement +
    code.slice(end);
}

/* =========================================================
 * SUBJECT CARD İLERLEME HESABINI ESNEK YAP
 * ========================================================= */

replaceSection(
  "const oldSubjectProgress =",
  "/* Ders kartındaki konu sayacı */",
`const subjectProgressPattern =
  /const\\s+completed\\s*=\\s*subject\\.topics\\.filter\\([\\s\\S]*?const\\s+pct\\s*=\\s*subject\\.topics\\.length\\s*>\\s*0\\s*\\?[\\s\\S]*?;\\n/;

ensure(
  subjectProgressPattern.test(subjects),
  "SubjectCard ilerleme hesabı bulunamadı",
);

subjects = subjects.replace(
  subjectProgressPattern,
\`const subjectProgress =
    getSubjectProgressUnits(
      subject,
      topicCompletion,
      subtopicCompletion,
    );

  const completed =
    subjectProgress.completed;

  const total =
    subjectProgress.total;

  const pct =
    subjectProgress.percentage;
\`,
);

`,
  "SubjectCard ilerleme bölümü",
);

/* =========================================================
 * EXAM SECTION İLERLEME HESABINI ESNEK YAP
 * ========================================================= */

replaceSection(
  "const oldExamProgress =",
  "subjects = subjects.replace(\n  \"{done}/{allTopics.length} konu\",",
`const examProgressPattern =
  /const\\s+allTopics\\s*=\\s*subjects\\.flatMap\\([\\s\\S]*?const\\s+pct\\s*=\\s*allTopics\\.length\\s*>\\s*0\\s*\\?[\\s\\S]*?;\\n/;

ensure(
  examProgressPattern.test(subjects),
  "ExamSection ilerleme hesabı bulunamadı",
);

subjects = subjects.replace(
  examProgressPattern,
\`const examProgress =
    getSubjectsProgressUnits(
      subjects,
      topicCompletion,
      subtopicCompletion,
    );

  const done =
    examProgress.completed;

  const total =
    examProgress.total;

  const remaining =
    total - done;

  const pct =
    examProgress.percentage;
\`,
);

`,
  "ExamSection ilerleme bölümü",
);

/* =========================================================
 * REMAINING TOPICS PROP BLOĞUNU ESNEK YAP
 * ========================================================= */

replaceSection(
  "const oldRemainingProps =",
  "const oldRemainingCalculation =",
`const remainingPropsPattern =
  /function\\s+RemainingTopicsCard\\(\\{[\\s\\S]*?topicCompletion,[\\s\\S]*?\\}:\\s*\\{[\\s\\S]*?topicCompletion:\\s*Record<string,\\s*boolean>;[\\s\\S]*?totalSolvedQuestions:\\s*number;/;

ensure(
  remainingPropsPattern.test(home),
  "RemainingTopicsCard prop bloğu bulunamadı",
);

home = home.replace(
  remainingPropsPattern,
\`function RemainingTopicsCard({
  tytPct,
  aytPct,
  profile,
  topicCompletion,
  subtopicCompletion,
  totalSolvedQuestions,
  colors,
}: {
  tytPct: number;
  aytPct: number;
  profile: import("@/contexts/AppContext").UserProfile | null;
  topicCompletion: Record<string, boolean>;
  subtopicCompletion: Record<string, boolean>;
  totalSolvedQuestions: number;\`,
);

const oldRemainingCalculation =`,
  "RemainingTopicsCard prop bölümü",
);

/* =========================================================
 * REMAINING TOPICS HESABINI ESNEK YAP
 * ========================================================= */

replaceSection(
  "const oldRemainingCalculation =",
  "/* Ana sayfa useApp */",
`const remainingCalculationPattern =
  /const\\s+\\{\\s*tytTotal,[\\s\\S]*?\\}\\s*=\\s*useMemo\\(\\(\\)\\s*=>\\s*\\{[\\s\\S]*?\\},\\s*\\[[\\s\\S]*?\\]\\);/;

ensure(
  remainingCalculationPattern.test(home),
  "RemainingTopicsCard eski hesap bulunamadı",
);

home = home.replace(
  remainingCalculationPattern,
\`const {
    tytTotal,
    tytDone,
    aytTotal,
    aytDone,
  } = useMemo(() => {
    const tyt =
      getSubjectsProgressUnits(
        TYT_SUBJECTS,
        topicCompletion,
        subtopicCompletion,
      );

    const ayt =
      getSubjectsProgressUnits(
        profile
          ? AYT_SUBJECTS_BY_FIELD[
              profile.studyField
            ] ?? []
          : [],
        topicCompletion,
        subtopicCompletion,
      );

    return {
      tytTotal: tyt.total,
      tytDone: tyt.completed,
      aytTotal: ayt.total,
      aytDone: ayt.completed,
    };
  }, [
    profile,
    topicCompletion,
    subtopicCompletion,
  ]);\`,
);

`,
  "RemainingTopicsCard hesap bölümü",
);

/* =========================================================
 * HOME useApp BLOĞUNU ESNEK YAP
 * ========================================================= */

replaceSection(
  "const oldHomeUseApp =",
  "/* RemainingTopicsCard çağrısına prop ekle */",
`const homeUseAppPattern =
  /const\\s*\\{[\\s\\S]*?profile,[\\s\\S]*?topicCompletion,[\\s\\S]*?totalSolvedQuestions[\\s\\S]*?\\}\\s*=\\s*useApp\\(\\);/;

ensure(
  homeUseAppPattern.test(home),
  "Home useApp bloğu bulunamadı",
);

home = home.replace(
  homeUseAppPattern,
\`const {
    profile,
    sessions,
    completeSession,
    tytProgress,
    aytProgress,
    totalTopicsCompleted,
    studyStreak,
    topicCompletion,
    subtopicCompletion,
    totalSolvedQuestions,
  } = useApp();\`,
);

`,
  "Home useApp bölümü",
);

fs.writeFileSync(
  patchPath,
  code,
  "utf8",
);

console.log("FLEXIBLE_PATCH_OK");
