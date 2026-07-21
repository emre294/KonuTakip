import {
  CoachContextInput,
  CoachMemory,
  CoachStudyPlanTask,
} from "./CoachTypes";
import {
  calculateCompletionRate,
  calculateStrongSubjects,
  calculateWeakSubjects,
  getLast7Days,
} from "./CoachMemory";
import { generateCoachSummary } from "./CoachSummary";

function formatPlan(
  tasks: CoachStudyPlanTask[]
): string {
  if (tasks.length === 0) {
    return "Bugün için kayıtlı çalışma planı yok.";
  }

  return tasks
    .map((task, index) => {
      const status = task.completed
        ? "Tamamlandı"
        : task.postponed
        ? "Ertelendi"
        : "Bekliyor";

      return `${index + 1}. ${task.subjectName} - ${
        task.topic
      } | ${task.plannedMinutes} dk | ${
        task.targetQuestions
      } soru | ${status}`;
    })
    .join("\n");
}

export function buildCoachContext(
  memory: CoachMemory,
  input: CoachContextInput = {}
): string {
  const today =
    input.currentDate ??
    new Date().toISOString().split("T")[0];

  const last7Days = getLast7Days(memory);
  const knownSubjects = [
    ...(memory.profile?.weakSubjects ?? []),
    ...(memory.profile?.strongSubjects ?? []),
  ];

  const weakSubjects = calculateWeakSubjects(
    last7Days,
    knownSubjects
  );

  const strongSubjects = calculateStrongSubjects(
    last7Days,
    knownSubjects
  );

  const todayPlan =
    input.todayPlan ??
    memory.lastStudyPlan.filter((task) => task.date === today);

  const recentNotes = memory.aiNotes
    .slice(-5)
    .map((note) => `- ${note.text}`)
    .join("\n");

  const totalStudyMinutes = last7Days.reduce(
    (sum, day) =>
      sum +
      Object.values(day.subjectStudyMinutes).reduce(
        (a, b) => a + b,
        0
      ),
    0
  );

  const totalSolvedQuestions = last7Days.reduce(
    (sum, day) => sum + day.solvedQuestions,
    0
  );

  const totalCompletedTopics = last7Days.reduce(
    (sum, day) => sum + day.completedTopics.length,
    0
  );

  const latestExam = null;

  const postponedTasks = memory.postponedTasks
    .filter((task) => !task.completed)
    .slice(-5)
    .map(
      (task) =>
        `- ${task.subjectName}: ${task.topic} (${task.originalDate})`
    )
    .join("\n");

  return [
    "KONU TAKİP AI KOÇ BAĞLAMI",
    "",
    `Tarih: ${today}`,
    "",
    generateCoachSummary(memory),
    "",
    "SON 7 GÜN İSTATİSTİKLERİ",
    `Toplam çalışma süresi: ${totalStudyMinutes} dk`,
    `Çözülen soru: ${totalSolvedQuestions}`,
    `Tamamlanan konu: ${totalCompletedTopics}`,
    `Son deneme: ${
"Kayıt yok"
    }`,
    "",
    "BUGÜNÜN PLANI",
    formatPlan(todayPlan),
    "",
    `Son 7 gün plan tamamlama oranı: %${calculateCompletionRate(
      last7Days
    )}`,
    `Güçlü dersler: ${
      strongSubjects.join(", ") || "Belirlenemedi"
    }`,
    `Öncelik verilmesi gereken dersler: ${
      weakSubjects.join(", ") || "Belirlenemedi"
    }`,
    "",
    "ERTELENEN GÖREVLER",
    postponedTasks || "Aktif ertelenmiş görev yok.",
    "",
    "SON AI NOTLARI",
    recentNotes || "Henüz AI notu yok.",
    "",
    "SON KONUŞMA ÖZETİ",
    memory.lastConversationSummary ||
      "Önceki konuşma özeti bulunmuyor.",
    "",
    "DAVRANIŞ KURALLARI",
    "- Öğrenciyi yargılama veya suçlama.",
    "- Sıcak, destekleyici ve gerçekçi bir dil kullan.",
    "- Geçmiş ilerlemeyi dikkate al.",
    "- Tamamlanmayan görevleri nazikçe yeniden planla.",
    "- Küçük başarıları fark et ve somut biçimde öv.",
    "- Gereksiz genel motivasyon sözleri kullanma.",
    "- Öğrencinin mevcut kapasitesini aşan plan verme.",
    "- Gerektiğinde dinlenme öner.",
  ].join("\n");
}


