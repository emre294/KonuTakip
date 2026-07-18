/**
 * IAIProvider — contract every AI provider must implement.
 *
 * Adding a new provider (OpenAI, Gemini, Claude, etc.):
 *   1. Create a new file in providers/ (e.g. GeminiProvider.ts)
 *   2. Implement this interface — every method, every type
 *   3. Reject with AIError (never a raw Error) so call-sites rely on a
 *      consistent error shape regardless of which provider is active
 *   4. Register the provider with AIManager.configure() at app bootstrap
 *
 * The UI layer never imports a concrete provider directly.
 * It only talks to AIManager, so swapping providers requires zero UI changes.
 *
 * Adding a new feature method:
 *   1. Add the method signature here
 *   2. Implement it in every provider (start with LocalMockAIProvider)
 *   3. Add the public wrapper in AIManager
 *   4. Register the feature key in AIFeatureRegistry
 */

import type { AIProviderKind } from "./types";
import type {
  // ── Original operations ──────────────────────────────────────────────────
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
  // ── New operations ───────────────────────────────────────────────────────
  ExplainQuestionRequest,
  ExplainQuestionResponse,
  AnalyzeMistakesRequest,
  AnalyzeMistakesResponse,
  PracticeQuestionRequest,
  PracticeQuestionResponse,
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
  // All methods must reject with an AIError, never a raw Error, so callers
  // can rely on a consistent error shape and toUserMessage() works everywhere.

  /** Batch question generation for a topic */
  generateQuestions(req: QuestionGenerationRequest): Promise<QuestionGenerationResponse>;

  /** Grade a single answer and provide feedback */
  evaluateQuestion(req: QuestionEvaluationRequest): Promise<QuestionEvaluationResponse>;

  /** Conversational topic explanation (chat-style AI teacher) */
  teachTopic(req: AITeacherRequest): Promise<AITeacherResponse>;

  /**
   * Full worked solution for a specific question.
   * Always returns the complete explanation; optionally explains
   * why the student's wrong answer was incorrect.
   */
  explainQuestion(req: ExplainQuestionRequest): Promise<ExplainQuestionResponse>;

  /**
   * Analyse a batch of wrong answers and surface recurring patterns.
   * Use this to power "Hata Analizi" screens.
   */
  analyzeMistakes(req: AnalyzeMistakesRequest): Promise<AnalyzeMistakesResponse>;

  /**
   * Generate a single targeted practice question.
   * Lighter interface than generateQuestions for "give me another" flows.
   */
  generatePracticeQuestion(req: PracticeQuestionRequest): Promise<PracticeQuestionResponse>;

  /** Personalised study coaching based on the learner's current snapshot */
  coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse>;

  /** Adaptive mini exam from a list of weak topic IDs */
  generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse>;

  /** Weekly study plan covering incomplete topics and weak subjects */
  generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse>;
}
