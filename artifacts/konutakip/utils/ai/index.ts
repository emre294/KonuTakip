// ─── Public AI layer exports ──────────────────────────────────────────────────
// Import from "@/utils/ai" — never from individual files inside this folder.

export { AIManager } from "./AIManager";
export { AIError } from "./AIError";
export type { IAIProvider } from "./AIProvider";
export { LocalMockAIProvider } from "./providers/LocalMockAIProvider";
export {
  AI_FEATURE_REGISTRY,
  getAIFeatureConfig,
  isAIFeatureEnabled,
  getEnabledAIFeatures,
} from "./AIFeatureRegistry";
export type { AIFeatureConfig } from "./AIFeatureRegistry";
export {
  AIProviderKind,
  AIFeatureKey,
  AIErrorCode,
} from "./types";
export type {
  // Request types
  QuestionGenerationRequest,
  QuestionEvaluationRequest,
  AITeacherRequest,
  StudyCoachRequest,
  MiniExamRequest,
  StudyPlanRequest,
  // Response types
  QuestionGenerationResponse,
  QuestionEvaluationResponse,
  AITeacherResponse,
  StudyCoachResponse,
  MiniExamResponse,
  StudyPlanResponse,
  // Primitives
  GeneratedQuestion,
  ExplanationStep,
  CoachRecommendation,
  StudyPlanDay,
  MiniExam,
  ExamType,
  DifficultyLevel,
  AIStatus,
  AIState,
  AnyAIRequest,
  AnyAIResponse,
  BaseAIRequest,
  BaseAIResponse,
} from "./types";
