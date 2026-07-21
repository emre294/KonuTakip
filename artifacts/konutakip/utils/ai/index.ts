// ─── Public AI layer exports ──────────────────────────────────────────────────
// Always import from "@/utils/ai" — never from individual files inside this
// folder. The internal module structure may change without notice.

export { AIManager } from "./AIManager";
export { AIError } from "./AIError";
export type { IAIProvider } from "./AIProvider";
export { LocalMockAIProvider } from "./providers/LocalMockAIProvider";
export { NvidiaAIProvider } from "./providers/NvidiaAIProvider";
export {
  AI_FEATURE_REGISTRY,
  getAIFeatureConfig,
  isAIFeatureEnabled,
  getEnabledAIFeatures,
  getAllAIFeatures,
} from "./AIFeatureRegistry";
export type { AIFeatureConfig } from "./AIFeatureRegistry";
export {
  AIProviderKind,
  AIFeatureKey,
  AIErrorCode,
} from "./types";
export type {
  // ── Primitives ────────────────────────────────────────────────────────────
  ExamType,
  DifficultyLevel,
  GeneratedQuestion,
  ExplanationStep,
  CoachRecommendation,
  StudyPlanDay,
  MiniExam,
  MistakeRecord,
  MistakePattern,
  // ── Request types ─────────────────────────────────────────────────────────
  BaseAIRequest,
  QuestionGenerationRequest,
  QuestionEvaluationRequest,
  AITeacherRequest,
  ExplainQuestionRequest,
  AnalyzeMistakesRequest,
  PracticeQuestionRequest,
  StudyCoachRequest,
  MiniExamRequest,
  StudyPlanRequest,
  // ── Response types ────────────────────────────────────────────────────────
  BaseAIResponse,
  QuestionGenerationResponse,
  QuestionEvaluationResponse,
  AITeacherResponse,
  ExplainQuestionResponse,
  AnalyzeMistakesResponse,
  PracticeQuestionResponse,
  StudyCoachResponse,
  MiniExamResponse,
  StudyPlanResponse,
  // ── Union types ───────────────────────────────────────────────────────────
  AnyAIRequest,
  AnyAIResponse,
  // ── Hook state ────────────────────────────────────────────────────────────
  AIStatus,
  AIState,
} from "./types";

