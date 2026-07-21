import {
  CoachMemory,
  DailyCoachEntry,
  MotivationTrend,
  WeeklySummary,
} from "./CoachTypes";
import {
  calculateCompletionRate,
  calculateStudyAverage,
  calculateStrongSubjects,
  calculateWeakSubjects,
  getLast7Days,
} from "./CoachMemory";

function calculateMotivationTrend(
  entries: DailyCoachEntry[]
): MotivationTrend {
  if (entries.length < 3) {
    return "insufficient_data";
  }

  const midpoint = Math.floor(entries.length / 2);
  const firstHalf = entries.slice(0, midpoint);
  const secondHalf = entries.slice(midpoint);

  const average = (items: DailyCoachEntry[]): number =>
    items.reduce(
      (sum, entry) => sum + entry.motivationLevel,
      0
    ) / items.length;

  const firstAverage = average(firstHalf);
  const secondAverage = average(secondHalf);
  const difference = secondAverage - firstAverage;

  if (difference >= 0.5) {
    return "rising";
  }

  if (difference <= -0.5) {
    return "falling";
  }

  return "stable";
}

function getMotivationLabel(
  trend: MotivationTrend
): string {
  switch (trend) {
    case "rising":
      return "Yükseliyor";
    case "falling":
      return "Düşüyor";
    case "stable":
      return "Dengeli";
    default:
      return "Yeterli veri yok";
  }
}

function createCoachSummaryText(
  completionRate: number,
  weakestSubject: string | null,
  motivationTrend: MotivationTrend
): string {
  const parts: string[] = [];

  if (completionRate >= 80) {
    parts.push("Öğrenci planına düzenli şekilde uyuyor.");
  } else if (completionRate >= 50) {
    parts.push("Öğrencinin ilerlemesi olumlu ancak istikrar artırılmalı.");
  } else {
    parts.push("Plan daha gerçekçi ve uygulanabilir hale getirilmeli.");
  }

  if (weakestSubject) {
    parts.push(`${weakestSubject} dersine daha fazla öncelik verilmeli.`);
  }

  if (motivationTrend === "falling") {
    parts.push(
      "Motivasyon düşüşü nedeniyle daha küçük ve ulaşılabilir hedefler önerilmeli."
    );
  }

  return parts.join(" ");
}

export function buildWeeklySummary(
  memory: CoachMemory
): WeeklySummary {
  const entries = getLast7Days(memory);
  const knownSubjects = [
    ...(memory.profile?.weakSubjects ?? []),
    ...(memory.profile?.strongSubjects ?? []),
  ];

  const strongSubjects = calculateStrongSubjects(
    entries,
    knownSubjects
  );

  const weakSubjects = calculateWeakSubjects(
    entries,
    knownSubjects
  );

  const motivationTrend = calculateMotivationTrend(entries);
  const completionRate = calculateCompletionRate(entries);

  return {
    completedTopics: Array.from(
      new Set(entries.flatMap((entry) => entry.completedTopics))
    ),
    solvedQuestions: entries.reduce(
      (sum, entry) => sum + entry.solvedQuestions,
      0
    ),
    strongestSubject: strongSubjects[0] ?? null,
    weakestSubject: weakSubjects[0] ?? null,
    completionRate,
    averageStudyMinutes: calculateStudyAverage(entries),
    motivationTrend,
    coachSummary: createCoachSummaryText(
      completionRate,
      weakSubjects[0] ?? null,
      motivationTrend
    ),
  };
}

export function generateCoachSummary(
  memory: CoachMemory
): string {
  const profile = memory.profile;
  const weekly = buildWeeklySummary(memory);

  const profileText = profile
    ? [
        `Öğrenci: ${
          profile.studentType === "mezun"
            ? "Mezun"
            : "12. sınıf"
        }`,
        `Hedef: TYT ${profile.targetTYT}, AYT ${profile.targetAYT}`,
        `Günlük hedef: ${profile.dailyStudyMinutes} dakika`,
      ].join("\n")
    : "Öğrenci profili henüz tamamlanmadı.";

  const topics =
    weekly.completedTopics.length > 0
      ? weekly.completedTopics.slice(-6).join(", ")
      : "Henüz tamamlanan konu yok.";

  const summary = [
    "ÖĞRENCİ PROFİLİ",
    profileText,
    "",
    "SON 7 GÜN",
    `Plan tamamlama: %${weekly.completionRate}`,
    `Ortalama çalışma: ${weekly.averageStudyMinutes} dakika`,
    `Çözülen soru: ${weekly.solvedQuestions}`,
    `Güçlü ders: ${weekly.strongestSubject ?? "Belirlenemedi"}`,
    `Öncelikli ders: ${weekly.weakestSubject ?? "Belirlenemedi"}`,
    `Motivasyon: ${getMotivationLabel(
      weekly.motivationTrend
    )}`,
    "",
    "TAMAMLANAN KONULAR",
    topics,
    "",
    "KOÇ NOTU",
    weekly.coachSummary,
  ].join("\n");

  return summary.slice(0, 1000);
}
