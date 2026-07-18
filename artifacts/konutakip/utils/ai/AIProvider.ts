/**
 * IAIProvider — contract every AI provider must implement.
 *
 * Adding a new provider (OpenAI, Gemini, Claude, etc.):
 *   1. Create a new file in providers/ (e.g. OpenAIProvider.ts)
 *   2. Implement this interface
 *   3. Register the provider in AIManager.ts
 *
 * The UI layer never imports a concrete provider directly — it only talks to
 * AIManager, which delegates to whichever provider is currently active.
 */

import type { AIProviderKind } from "./types";
import type {
  QuestionGenerationRequest,
  QuestionGenerationResponse,
  QuestionEvaluationRequest,
  QuestionEvaluationResponse,
  AITeacherRequest,
  AITeacherResponse,
  StudyCoachRequest,
  StudyCoachResponse,
  MiniExamRequest,
  MiniExamResponse,
  StudyPlanRequest,
  StudyPlanResponse,
} from "./types";

export interface IAIProvider {
  /** Identifies this provider — used for logging and response tagging */
  readonly kind: AIProviderKind;

  /**
   * True when the provider is ready to accept requests.
   * For the mock provider this is always true.
   * For real providers this reflects whether the SDK is initialized and
   * credentials are present.
   */
  readonly isAvailable: boolean;

  // ── Feature methods ────────────────────────────────────────────────────────
  // Each method must reject with an AIError (never a raw Error) so callers
  // can rely on the consistent error shape.

  generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse>;

  evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse>;

  teachTopic(req: AITeacherRequest): Promise<AITeacherResponse>;

  coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse>;

  generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse>;

  generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse>;
}
