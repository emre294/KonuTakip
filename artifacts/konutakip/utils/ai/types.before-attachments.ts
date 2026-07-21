/**
 * AI Infrastructure — Core TypeScript Types
 *
 * All request models, response models, enums, and shared types live here.
 * No provider-specific logic. No React. No side effects.
 *
 * Adding a new AI feature:
 *   1. Add its feature key to AIFeatureKey
 *   2. Add its request type (extends BaseAIRequest with the matching feature literal)
 *   3. Add its response type (extends BaseAIResponse)
 *   4. Add the method to IAIProvider in AIProvider.ts
 *   5. Implement it in LocalMockAIProvider (and future real providers)
 *   6. Register it in AIFeatureRegistry.ts with enabled: true when ready
 *   7. Export the new types from index.ts
 */

// ─── Provider identifiers ─────────────────────────────────────────────────────

export const AIProviderKind = {
  LOCAL_MOCK:       "local_mock",
  NVIDIA:          "nvidia",
  OPENAI:           "openai",
  GOOGLE_GEMINI:    "google_gemini",
  ANTHROPIC_CLAUDE: "anthropic_claude",
} as const;

export type AIProviderKind = (typeof AIProviderKind)[keyof typeof AIProviderKind];

// ─── AI feature identifiers ───────────────────────────────────────────────────

export const AIFeatureKey = {
  // ── Original features ──────────────────────────────────────────────────────
  QUESTION_GENERATOR: "question_generator",
  QUESTION_EVALUATOR: "question_evaluator",
  AI_TEACHER:         "ai_teacher",
  STUDY_COACH:        "study_coach",
  MINI_EXAMS:         "mini_exams",
  STUDY_PLANS:        "study_plans",
  // ── New features ───────────────────────────────────────────────────────────
  /** Step-by-step worked explanation for a specific question */
  EXPLAIN_QUESTION:   "explain_question",
  /** Pattern analysis across a set of wrong answers */
  ANALYZE_MISTAKES:   "analyze_mistakes",
  /** Single targeted practice question for one topic */
  PRACTICE_QUESTION:  "practice_question",
} as const;

export type AIFeatureKey = (typeof AIFeatureKey)[keyof typeof AIFeatureKey];

// ─── Error codes ──────────────────────────────────────────────────────────────

export const AIErrorCode = {
  /** Provider is not configured or unavailable */
  PROVIDER_UNAVAILABLE:    "PROVIDER_UNAVAILABLE",
  /** Feature is disabled in AIFeatureRegistry */
  FEATURE_DISABLED:        "FEATURE_DISABLED",
  /** Request validation failed */
  INVALID_REQUEST:         "INVALID_REQUEST",
  /** Provider returned an unexpected response shape */
  INVALID_RESPONSE:        "INVALID_RESPONSE",
  /** Rate limit hit on the provider */
  RATE_LIMITED:            "RATE_LIMITED",
  /** Network or API connectivity issue */
  NETWORK_ERROR:           "NETWORK_ERROR",
  /** Provider authentication failure */
  AUTH_ERROR:              "AUTH_ERROR",
  /** Feature is at its maxConcurrent limit — try again shortly */
  CONCURRENT_LIMIT:        "CONCURRENT_LIMIT",
  /** Provider did not respond within the configured timeout */
  TIMEOUT:                 "TIMEOUT",
  /** Generic catch-all */
  UNKNOWN:                 "UNKNOWN",
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

/** A step in an AI Teacher or question-explanation sequence */
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
  date: string;     // ISO date e.g. "2025-06-01"
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

/** A single wrong answer recorded for mistake analysis */
export interface MistakeRecord {
  questionId: string;
  topicName: string;
  subjectName: string;
  correctAnswer: string;
  userAnswer: string;
  /** ISO timestamp of when the mistake was made */
  answeredAt: string;
}

/**
 * A recurring mistake pattern identified by the AI.
 * patternType values:
 *   - topic_gap: user is missing foundational knowledge
 *   - calculation_error: correct concept but arithmetic/algebraic slip
 *   - concept_confusion: mixing up two similar concepts
 *   - careless_mistake: correct knowledge but attention failure under pressure
 */
export interface MistakePattern {
  patternType: "topic_gap" | "calculation_error" | "concept_confusion" | "careless_mistake";
  affectedTopicNames: string[];
  /** How many of the submitted mistakes fall into this pattern */
  frequency: number;
  description: string;
  recommendedAction: string;
}

// ─── Base request / response shapes ──────────────────────────────────────────

export interface BaseAIRequest {
  /** Which feature is being invoked — used for routing and logging */
  feature: AIFeatureKey;
  /** ISO timestamp of the request */
  requestedAt: string;
  /** Optional idempotency / tracking key (caller-provided) */
  requestId?: string;
}

export interface BaseAIResponse {
  /** Mirrors the requestId from the request when one was provided */
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
  /** Prior exchanges for multi-turn sessions */
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

// ─── Explain Question ─────────────────────────────────────────────────────────

/**
 * Requests a full worked solution for a specific question the user has seen.
 * Unlike evaluateQuestion (which grades an answer), this always returns the
 * complete step-by-step explanation regardless of what the user chose.
 */
export interface ExplainQuestionRequest extends BaseAIRequest {
  feature: "explain_question";
  questionId: string;
  questionText: string;
  options: { key: "A" | "B" | "C" | "D" | "E"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  topicName: string;
  subjectName: string;
  examType: ExamType;
  /**
   * The answer the student chose.
   * When provided and different from correctAnswer, the response also
   * includes a wrongAnswerAnalysis explaining the specific misconception.
   */
  userAnswer?: "A" | "B" | "C" | "D" | "E";
}

export interface ExplainQuestionResponse extends BaseAIResponse {
  /** Why the correct answer is right — a clear, direct statement */
  correctAnswerExplanation: string;
  /**
   * Why the user's chosen option was wrong.
   * undefined when userAnswer is absent or was correct.
   */
  wrongAnswerAnalysis?: string;
  /** Ordered solution steps */
  steps: ExplanationStep[];
  /** Concepts and formulas applied in the solution */
  keyConceptsUsed: string[];
  /** Related topics the student should review to avoid this type of error */
  similarTopicsToStudy: string[];
}

// ─── Analyze Mistakes ─────────────────────────────────────────────────────────

export interface AnalyzeMistakesRequest extends BaseAIRequest {
  feature: "analyze_mistakes";
  mistakes: MistakeRecord[];
  examType: ExamType;
  /**
   * How many distinct weak areas to surface (default 3).
   * Capped at mistakes.length.
   */
  topWeakAreasCount?: number;
}

export interface AnalyzeMistakesResponse extends BaseAIResponse {
  patterns: MistakePattern[];
  /** Subjects ranked by mistake count, highest first */
  weakestSubjects: { subjectName: string; mistakeCount: number }[];
  /** Ordered list of concrete next actions the student should take */
  topRecommendations: string[];
  /** One-paragraph holistic insight about the student's performance */
  overallInsight: string;
}

// ─── Practice Question ────────────────────────────────────────────────────────

/**
 * Requests a single targeted practice question for one specific topic.
 * Simpler interface than QuestionGenerationRequest (which is batch-oriented).
 * Use this for quick "give me another question" flows in the UI.
 */
export interface PracticeQuestionRequest extends BaseAIRequest {
  feature: "practice_question";
  topicId: string;
  topicName: string;
  subjectName: string;
  examType: ExamType;
  difficulty: DifficultyLevel;
  /** Question IDs the student has already seen — skip these */
  excludeQuestionIds?: string[];
}

export interface PracticeQuestionResponse extends BaseAIResponse {
  question: GeneratedQuestion;
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
  /** How many days the plan should cover, e.g. 7 for a weekly plan */
  planDurationDays: number;
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
  | ExplainQuestionRequest
  | AnalyzeMistakesRequest
  | PracticeQuestionRequest
  | StudyCoachRequest
  | MiniExamRequest
  | StudyPlanRequest;

export type AnyAIResponse =
  | QuestionGenerationResponse
  | QuestionEvaluationResponse
  | AITeacherResponse
  | ExplainQuestionResponse
  | AnalyzeMistakesResponse
  | PracticeQuestionResponse
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

