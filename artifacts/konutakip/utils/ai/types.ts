/**
 * AI Infrastructure — Core TypeScript Types
 *
 * All request models, response models, enums, and shared types live here.
 * No provider-specific logic. No React. No side effects.
 *
 * Adding a new AI feature:
 *   1. Add its request type (extends BaseAIRequest)
 *   2. Add its response type (extends BaseAIResponse)
 *   3. Add the method to IAIProvider in AIProvider.ts
 *   4. Implement it in LocalMockAIProvider (and future real providers)
 *   5. Register it in AIFeatureRegistry.ts
 */

// ─── Provider identifiers ─────────────────────────────────────────────────────

export const AIProviderKind = {
  LOCAL_MOCK: "local_mock",
  OPENAI: "openai",
  GOOGLE_GEMINI: "google_gemini",
  ANTHROPIC_CLAUDE: "anthropic_claude",
} as const;

export type AIProviderKind = (typeof AIProviderKind)[keyof typeof AIProviderKind];

// ─── AI feature identifiers ───────────────────────────────────────────────────

export const AIFeatureKey = {
  QUESTION_GENERATOR: "question_generator",
  QUESTION_EVALUATOR: "question_evaluator",
  AI_TEACHER: "ai_teacher",
  STUDY_COACH: "study_coach",
  MINI_EXAMS: "mini_exams",
  STUDY_PLANS: "study_plans",
} as const;

export type AIFeatureKey = (typeof AIFeatureKey)[keyof typeof AIFeatureKey];

// ─── Error codes ──────────────────────────────────────────────────────────────

export const AIErrorCode = {
  /** Provider is not configured or unavailable */
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  /** Feature is disabled in AIFeatureRegistry */
  FEATURE_DISABLED: "FEATURE_DISABLED",
  /** Request validation failed */
  INVALID_REQUEST: "INVALID_REQUEST",
  /** Provider returned an unexpected response shape */
  INVALID_RESPONSE: "INVALID_RESPONSE",
  /** Rate limit hit on the provider */
  RATE_LIMITED: "RATE_LIMITED",
  /** Network or API connectivity issue */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** Provider authentication failure */
  AUTH_ERROR: "AUTH_ERROR",
  /** Generic catch-all */
  UNKNOWN: "UNKNOWN",
} as const;

export type AIErrorCode = (typeof AIErrorCode)[keyof typeof AIErrorCode];

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Exam type — determines which subject pool to draw from */
export type ExamType = "TYT" | "AYT";

/** Difficulty level for generated questions */
export type DifficultyLevel = "easy" | "medium" | "hard" | "mixed";

/** A single generated multiple-choice question */
export interface GeneratedQuestion {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  questionText: string;
  options: {
    key: "A" | "B" | "C" | "D" | "E";
    text: string;
  }[];
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  difficulty: DifficultyLevel;
  estimatedTimeSeconds: number;
}

/** A step in an AI Teacher explanation */
export interface ExplanationStep {
  stepNumber: number;
  title: string;
  content: string;
  example?: string;
}

/** A single recommendation from the Study Coach */
export interface CoachRecommendation {
  id: string;
  type: "action" | "insight" | "warning" | "encouragement";
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  relatedTopicIds?: string[];
  estimatedImpact: "high" | "medium" | "low";
}

/** A daily slot in a study plan */
export interface StudyPlanDay {
  date: string; // ISO date
  dayLabel: string; // e.g. "Pazartesi"
  totalMinutes: number;
  sessions: {
    subjectName: string;
    topicNames: string[];
    durationMinutes: number;
    priority: "high" | "medium" | "low";
  }[];
}

/** A mini exam with a set of questions */
export interface MiniExam {
  id: string;
  title: string;
  description: string;
  examType: ExamType;
  questions: GeneratedQuestion[];
  totalTimeSeconds: number;
  targetedWeakAreas: string[];
}

// ─── Base request / response shapes ──────────────────────────────────────────

export interface BaseAIRequest {
  /** Which feature is being invoked — used for routing and logging */
  feature: AIFeatureKey;
  /** ISO timestamp of the request */
  requestedAt: string;
  /** Optional idempotency key (caller-provided) */
  requestId?: string;
}

export interface BaseAIResponse {
  /** Mirrors the requestId from the request if one was provided */
  requestId?: string;
  /** Which provider fulfilled this response */
  provider: AIProviderKind;
  /** How long the provider took in ms */
  durationMs: number;
  /** ISO timestamp of when the response was generated */
  generatedAt: string;
}

// ─── Question Generation ──────────────────────────────────────────────────────

export interface QuestionGenerationRequest extends BaseAIRequest {
  feature: "question_generator";
  topicId: string;
  topicName: string;
  subjectName: string;
  examType: ExamType;
  count: number;
  difficulty: DifficultyLevel;
  /** Previously seen question IDs to avoid duplicates */
  excludeQuestionIds?: string[];
}

export interface QuestionGenerationResponse extends BaseAIResponse {
  questions: GeneratedQuestion[];
  /** How many were requested vs delivered (may differ if topic is narrow) */
  requestedCount: number;
  deliveredCount: number;
}

// ─── Question Evaluation ──────────────────────────────────────────────────────

export interface QuestionEvaluationRequest extends BaseAIRequest {
  feature: "question_evaluator";
  questionId: string;
  questionText: string;
  correctAnswer: string;
  userAnswer: string;
  topicName: string;
  subjectName: string;
}

export interface QuestionEvaluationResponse extends BaseAIResponse {
  isCorrect: boolean;
  explanation: string;
  /**
   * Personalised advice based on what the user got wrong.
   * Empty string when the answer was correct.
   */
  improvementTip: string;
  relatedTopicsToReview: string[];
}

// ─── AI Teacher ───────────────────────────────────────────────────────────────

export interface AITeacherRequest extends BaseAIRequest {
  feature: "ai_teacher";
  topicId: string;
  topicName: string;
  subjectName: string;
  examType: ExamType;
  /**
   * Optional follow-up question from the user.
   * When undefined, the teacher gives an introductory explanation.
   */
  userQuestion?: string;
  /** Prior explanation steps for context in multi-turn sessions */
  conversationHistory?: {
    role: "teacher" | "student";
    content: string;
  }[];
}

export interface AITeacherResponse extends BaseAIResponse {
  summary: string;
  steps: ExplanationStep[];
  keyPoints: string[];
  commonMistakes: string[];
  practiceHint: string;
}

// ─── Study Coach ──────────────────────────────────────────────────────────────

export interface StudyCoachRequest extends BaseAIRequest {
  feature: "study_coach";
  /** Snapshot of the learner's current state — passed by the calling hook */
  learnerSnapshot: {
    tytProgressPct: number;
    aytProgressPct: number;
    studyStreakDays: number;
    totalSessionsCompleted: number;
    totalTopicsCompleted: number;
    weakSubjectNames: string[];
    daysUntilExam: number;
    studyField: string;
  };
  /** Focus for this coaching session */
  focusArea?: "motivation" | "planning" | "technique" | "overall";
}

export interface StudyCoachResponse extends BaseAIResponse {
  overallAssessment: string;
  recommendations: CoachRecommendation[];
  weeklyFocusSuggestion: string;
  motivationalMessage: string;
}

// ─── Mini Exams ───────────────────────────────────────────────────────────────

export interface MiniExamRequest extends BaseAIRequest {
  feature: "mini_exams";
  examType: ExamType;
  weakTopicIds: string[];
  questionCount: number;
  targetDurationMinutes: number;
  difficulty: DifficultyLevel;
}

export interface MiniExamResponse extends BaseAIResponse {
  exam: MiniExam;
}

// ─── Study Plans ──────────────────────────────────────────────────────────────

export interface StudyPlanRequest extends BaseAIRequest {
  feature: "study_plans";
  daysUntilExam: number;
  dailyAvailableMinutes: number;
  incompleteTYTTopicIds: string[];
  incompleteAYTTopicIds: string[];
  weakSubjectNames: string[];
  studyField: string;
  planDurationDays: number; // e.g. 7 for a weekly plan
}

export interface StudyPlanResponse extends BaseAIResponse {
  weeklyPlan: StudyPlanDay[];
  totalTopicsCovered: number;
  estimatedCompletionPct: number;
  notes: string;
}

// ─── Union types for convenience ──────────────────────────────────────────────

export type AnyAIRequest =
  | QuestionGenerationRequest
  | QuestionEvaluationRequest
  | AITeacherRequest
  | StudyCoachRequest
  | MiniExamRequest
  | StudyPlanRequest;

export type AnyAIResponse =
  | QuestionGenerationResponse
  | QuestionEvaluationResponse
  | AITeacherResponse
  | StudyCoachResponse
  | MiniExamResponse
  | StudyPlanResponse;

// ─── Hook state types ─────────────────────────────────────────────────────────

export type AIStatus = "idle" | "loading" | "success" | "error";

export interface AIState<TResponse> {
  status: AIStatus;
  data: TResponse | null;
  error: import("./AIError").AIError | null;
  /** ISO timestamp of the last successful response */
  lastSuccessAt: string | null;
}
