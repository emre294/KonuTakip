/**
 * AIManager — singleton orchestrator for all AI requests.
 *
 * Responsibilities:
 *   • Holds the active IAIProvider
 *   • Validates that a feature is enabled before delegating
 *   • Wraps all errors in AIError for consistent handling
 *   • Provides a configure() method for swapping providers at runtime
 *
 * The UI layer and hooks never import a provider directly.
 * They only use AIManager, so swapping providers requires zero UI changes.
 *
 * Usage:
 *   // In _layout.tsx or app bootstrap:
 *   AIManager.configure(new OpenAIProvider(apiKey));
 *
 *   // In a hook or component:
 *   const result = await AIManager.generateQuestions(req);
 */

import { AIError } from "./AIError";
import type { IAIProvider } from "./AIProvider";
import { isAIFeatureEnabled, getAIFeatureConfig } from "./AIFeatureRegistry";
import { LocalMockAIProvider } from "./providers/LocalMockAIProvider";
import type {
  AIProviderKind,
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
  AIFeatureKey,
} from "./types";

// ─── Manager class ────────────────────────────────────────────────────────────

class AIManagerClass {
  private _provider: IAIProvider = new LocalMockAIProvider();
  private _devMode: boolean = __DEV__;

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Swap the active provider.
   * Call this once on app start once a real provider is configured.
   *
   * @example
   *   AIManager.configure(new OpenAIProvider({ apiKey: OPENAI_KEY }));
   */
  configure(provider: IAIProvider): void {
    this._provider = provider;
    if (this._devMode) {
      console.log(`[AIManager] Provider set to: ${provider.kind}`);
    }
  }

  /** Returns the kind of the currently active provider */
  get activeProvider(): AIProviderKind {
    return this._provider.kind;
  }

  /** Returns true when the active provider reports it is ready */
  get isProviderAvailable(): boolean {
    return this._provider.isAvailable;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates provider availability and feature enabled status.
   * Resolves to the provider instance to call.
   */
  private _getProvider(featureKey: AIFeatureKey): IAIProvider {
    if (!this._provider.isAvailable) {
      throw AIError.providerUnavailable(this._provider.kind);
    }
    if (!isAIFeatureEnabled(featureKey)) {
      throw AIError.featureDisabled(featureKey);
    }

    // Per-feature provider override (e.g. route mini-exams to a cheaper model)
    const config = getAIFeatureConfig(featureKey);
    if (config?.providerOverride) {
      // In the future: look up the override provider from a registry.
      // For now, fall through to the default provider.
      if (this._devMode) {
        console.log(
          `[AIManager] Feature "${featureKey}" has a provider override configured (${config.providerOverride}) — falling back to default for now.`
        );
      }
    }

    return this._provider;
  }

  /** Wraps any thrown value into an AIError */
  private _wrap(e: unknown): never {
    if (e instanceof AIError) throw e;
    throw AIError.unknown(e);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    try {
      const provider = this._getProvider("question_generator");
      return await provider.generateQuestions(req);
    } catch (e) {
      return this._wrap(e);
    }
  }

  async evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse> {
    try {
      const provider = this._getProvider("question_evaluator");
      return await provider.evaluateQuestion(req);
    } catch (e) {
      return this._wrap(e);
    }
  }

  async teachTopic(req: AITeacherRequest): Promise<AITeacherResponse> {
    try {
      const provider = this._getProvider("ai_teacher");
      return await provider.teachTopic(req);
    } catch (e) {
      return this._wrap(e);
    }
  }

  async coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse> {
    try {
      const provider = this._getProvider("study_coach");
      return await provider.coachStudent(req);
    } catch (e) {
      return this._wrap(e);
    }
  }

  async generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse> {
    try {
      const provider = this._getProvider("mini_exams");
      return await provider.generateMiniExam(req);
    } catch (e) {
      return this._wrap(e);
    }
  }

  async generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    try {
      const provider = this._getProvider("study_plans");
      return await provider.generateStudyPlan(req);
    } catch (e) {
      return this._wrap(e);
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const AIManager = new AIManagerClass();
