/**
 * LocalMockAIProvider — deterministic mock provider for development and testing.
 *
 * • Always available (no credentials required)
 * • Returns realistic Turkish YKS-themed mock data
 * • Simulates a realistic network delay (400–900 ms)
 * • Never throws unless explicitly asked to via simulateError()
 *
 * This is the ONLY provider active until a real provider is wired in.
 * Swap it out in AIManager.configure() — the rest of the app is unaffected.
 */

import type { IAIProvider } from "../AIProvider";
import {
  AIProviderKind,
  type QuestionGenerationRequest,
  type QuestionGenerationResponse,
  type QuestionEvaluationRequest,
  type QuestionEvaluationResponse,
  type AITeacherRequest,
  type AITeacherResponse,
  type StudyCoachRequest,
  type StudyCoachResponse,
  type MiniExamRequest,
  type MiniExamResponse,
  type StudyPlanRequest,
  type StudyPlanResponse,
  type GeneratedQuestion,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function mockDelay(minMs = 400, maxMs = 900): Promise<void> {
  return new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

function now(): string {
  return new Date().toISOString();
}

function baseResponse(startMs: number): {
  provider: typeof AIProviderKind.LOCAL_MOCK;
  durationMs: number;
  generatedAt: string;
} {
  return {
    provider: AIProviderKind.LOCAL_MOCK,
    durationMs: Date.now() - startMs,
    generatedAt: now(),
  };
}

function makeQuestionId(topicId: string, index: number): string {
  return `mock_q_${topicId}_${index}_${Date.now()}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class LocalMockAIProvider implements IAIProvider {
  readonly kind = AIProviderKind.LOCAL_MOCK;
  readonly isAvailable = true;

  // ── Question Generation ────────────────────────────────────────────────────

  async generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    const start = Date.now();
    await mockDelay();

    const questions: GeneratedQuestion[] = Array.from({ length: req.count }, (_, i) => ({
      id: makeQuestionId(req.topicId, i),
      topicId: req.topicId,
      topicName: req.topicName,
      subjectName: req.subjectName,
      questionText: `[MOCK] ${req.topicName} konusunda örnek soru ${i + 1}: Bu konuyla ilgili hangisi doğrudur?`,
      options: [
        { key: "A", text: "Birinci şık — doğru yanıt" },
        { key: "B", text: "İkinci şık — yanlış" },
        { key: "C", text: "Üçüncü şık — yanlış" },
        { key: "D", text: "Dördüncü şık — yanlış" },
        { key: "E", text: "Beşinci şık — yanlış" },
      ],
      correctAnswer: "A",
      explanation: `[MOCK] Bu soruda ${req.topicName} konusunun temel kavramı test edilmektedir. Doğru yanıt A şıkkıdır çünkü tanım bunu gerektirir.`,
      difficulty: req.difficulty === "mixed" ? (["easy", "medium", "hard"] as const)[i % 3] : req.difficulty,
      estimatedTimeSeconds: req.difficulty === "hard" ? 90 : req.difficulty === "medium" ? 60 : 45,
    }));

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      questions,
      requestedCount: req.count,
      deliveredCount: questions.length,
    };
  }

  // ── Question Evaluation ────────────────────────────────────────────────────

  async evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse> {
    const start = Date.now();
    await mockDelay(300, 600);

    const isCorrect = req.userAnswer === req.correctAnswer;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      isCorrect,
      explanation: `[MOCK] ${req.topicName} sorusunun doğru yanıtı "${req.correctAnswer}" şıkkıdır. ${isCorrect ? "Tebrikler, doğru yanıtladın!" : `Sen "${req.userAnswer}" seçtin ancak bu yanlış.`}`,
      improvementTip: isCorrect
        ? ""
        : `[MOCK] ${req.topicName} konusunu tekrar çalışmanı öneririz. Özellikle temel tanımlara odaklan.`,
      relatedTopicsToReview: isCorrect ? [] : [req.topicName, req.subjectName],
    };
  }

  // ── AI Teacher ─────────────────────────────────────────────────────────────

  async teachTopic(req: AITeacherRequest): Promise<AITeacherResponse> {
    const start = Date.now();
    await mockDelay();

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      summary: `[MOCK] ${req.topicName} konusu, ${req.subjectName} dersinin temel kavramlarından biridir. Bu özet, gerçek AI entegrasyonu tamamlandığında dinamik içerikle değiştirilecektir.`,
      steps: [
        {
          stepNumber: 1,
          title: "Temel Kavramlar",
          content: `[MOCK] ${req.topicName} konusunun temel kavramları burada açıklanır.`,
          example: `Örnek: ${req.topicName} ile ilgili basit bir örnek.`,
        },
        {
          stepNumber: 2,
          title: "Derinlemesine İnceleme",
          content: `[MOCK] Konuyu daha iyi anlamak için bu adımda ileri kavramlar ele alınır.`,
          example: `Örnek: Daha karmaşık bir uygulama örneği.`,
        },
        {
          stepNumber: 3,
          title: "Sınav İpuçları",
          content: `[MOCK] ${req.examType} sınavında bu konudan genellikle şu tür sorular çıkar.`,
        },
      ],
      keyPoints: [
        `[MOCK] ${req.topicName} konusunun birinci anahtar noktası`,
        `[MOCK] ${req.topicName} konusunun ikinci anahtar noktası`,
        `[MOCK] Sınav için en önemli formül veya kural`,
      ],
      commonMistakes: [
        `[MOCK] Öğrencilerin en sık yaptığı hata: temel tanımı karıştırmak`,
        `[MOCK] Sınav baskısı altında sıkça yapılan hata`,
      ],
      practiceHint: `[MOCK] Bu konuyu pekiştirmek için günde 3–5 soru çözmeni öneririz.`,
    };
  }

  // ── Study Coach ────────────────────────────────────────────────────────────

  async coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse> {
    const start = Date.now();
    await mockDelay();

    const { learnerSnapshot: s } = req;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      overallAssessment: `[MOCK] TYT ilerlemesi %${s.tytProgressPct}, AYT ilerlemesi %${s.aytProgressPct}. ${s.studyStreakDays} günlük seri harika! Sınava ${s.daysUntilExam} gün kaldı.`,
      recommendations: [
        {
          id: "mock_rec_1",
          type: "action",
          priority: "high",
          title: "[MOCK] Bu Haftanın Önceliği",
          body: s.weakSubjectNames.length > 0
            ? `${s.weakSubjectNames.slice(0, 2).join(", ")} derslerinde eksikler var. Bu hafta bunlara odaklan.`
            : "Genel ilerleme iyi görünüyor. Tempo koru.",
          estimatedImpact: "high",
          relatedTopicIds: [],
        },
        {
          id: "mock_rec_2",
          type: "insight",
          priority: "medium",
          title: "[MOCK] Tempo Analizi",
          body: `Günde ortalama ${Math.ceil(s.totalTopicsCompleted / Math.max(1, 30))} konu tamamlıyorsun. Sınava yetişmek için bu tempoyu koru.`,
          estimatedImpact: "medium",
        },
        {
          id: "mock_rec_3",
          type: "encouragement",
          priority: "low",
          title: "[MOCK] Motivasyon",
          body: "Her gün küçük adımlar atmak, büyük hedefe ulaşmanın en güvenilir yoludur. Devam et!",
          estimatedImpact: "low",
        },
      ],
      weeklyFocusSuggestion: `[MOCK] Bu hafta TYT'ye ağırlık ver ve her gün en az 1 AYT konusu ekle.`,
      motivationalMessage: "[MOCK] Başarı bir yolculuktur, varış değil. Sen bu yolun en doğru yolcususun!",
    };
  }

  // ── Mini Exams ─────────────────────────────────────────────────────────────

  async generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse> {
    const start = Date.now();
    await mockDelay(600, 1200);

    const questions: GeneratedQuestion[] = Array.from(
      { length: req.questionCount },
      (_, i) => {
        const topicId = req.weakTopicIds[i % Math.max(1, req.weakTopicIds.length)] ?? "mock_topic";
        return {
          id: makeQuestionId(topicId, i),
          topicId,
          topicName: `[MOCK] Zayıf Konu ${(i % Math.max(1, req.weakTopicIds.length)) + 1}`,
          subjectName: req.examType === "TYT" ? "Türkçe" : "Matematik",
          questionText: `[MOCK] ${req.examType} Mini Sınavı — Soru ${i + 1}`,
          options: [
            { key: "A", text: "Doğru şık" },
            { key: "B", text: "Yanlış şık" },
            { key: "C", text: "Yanlış şık" },
            { key: "D", text: "Yanlış şık" },
            { key: "E", text: "Yanlış şık" },
          ],
          correctAnswer: "A",
          explanation: `[MOCK] Soru ${i + 1} açıklaması — gerçek AI ile içerik üretilecek.`,
          difficulty: req.difficulty,
          estimatedTimeSeconds: (req.targetDurationMinutes * 60) / req.questionCount,
        };
      }
    );

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      exam: {
        id: `mock_exam_${Date.now()}`,
        title: `[MOCK] ${req.examType} Mini Denemesi`,
        description: `Zayıf konularına odaklanan ${req.questionCount} soruluk mini deneme.`,
        examType: req.examType,
        questions,
        totalTimeSeconds: req.targetDurationMinutes * 60,
        targetedWeakAreas: req.weakTopicIds,
      },
    };
  }

  // ── Study Plans ────────────────────────────────────────────────────────────

  async generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    const start = Date.now();
    await mockDelay();

    const today = new Date();
    const weeklyPlan: StudyPlanResponse["weeklyPlan"] = Array.from(
      { length: Math.min(req.planDurationDays, 7) },
      (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return {
          date: date.toISOString().split("T")[0],
          dayLabel: DAYS_TR[date.getDay() === 0 ? 6 : date.getDay() - 1],
          totalMinutes: req.dailyAvailableMinutes,
          sessions: [
            {
              subjectName: "Matematik",
              topicNames: [`[MOCK] Konu ${i * 2 + 1}`, `[MOCK] Konu ${i * 2 + 2}`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.4),
              priority: i < 2 ? "high" : "medium",
            },
            {
              subjectName: "Türkçe",
              topicNames: [`[MOCK] Paragraf Türleri`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.3),
              priority: "medium",
            },
            {
              subjectName: req.studyField === "say" ? "Fizik" : "Tarih",
              topicNames: [`[MOCK] ${req.studyField.toUpperCase()} Konusu`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.3),
              priority: "low",
            },
          ],
        };
      }
    );

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      weeklyPlan,
      totalTopicsCovered: weeklyPlan.length * 3,
      estimatedCompletionPct: Math.min(
        100,
        Math.round(
          ((req.incompleteTYTTopicIds.length + req.incompleteAYTTopicIds.length > 0)
            ? (weeklyPlan.length * 3 * 100) /
              (req.incompleteTYTTopicIds.length + req.incompleteAYTTopicIds.length)
            : 100)
        )
      ),
      notes:
        "[MOCK] Bu plan örnek verilerle oluşturulmuştur. Gerçek AI entegrasyonu tamamlandığında kişiselleştirilmiş plan üretilecektir.",
    };
  }
}
