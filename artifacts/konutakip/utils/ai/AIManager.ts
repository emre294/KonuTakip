/**
 * AIManager — singleton orchestrator for all AI requests.
 *
 * Responsibilities:
 *   • Holds the active IAIProvider
 *   • Validates feature availability before delegating
 *   • Enforces per-feature concurrency limits (maxConcurrent from registry)
 *   • Applies a configurable request timeout (default 30 s)
 *   • Retries once on transient failures (rate limit, network, timeout)
 *   • Wraps all errors in AIError for consistent handling
 *   • Provides configure() for swapping providers at runtime
 *
 * The UI layer and hooks never import a provider directly.
 * They only use AIManager, so swapping providers requires zero UI changes.
 *
 * Usage:
 *   // At app bootstrap (e.g. _layout.tsx):
 *   AIManager.configure(new GeminiProvider({ apiKey: GEMINI_KEY }));
 *
 *   // Anywhere in the app:
 *   const result = await AIManager.teachTopic(req);
 *   const plan   = await AIManager.createStudyPlan(req);  // alias → generateStudyPlan
 */

import { AIError } from "./AIError";
import type { IAIProvider } from "./AIProvider";
import { isAIFeatureEnabled, getAIFeatureConfig } from "./AIFeatureRegistry";
import { NvidiaAIProvider } from "./providers/NvidiaAIProvider";
import type {
  AIProviderKind,
  AIFeatureKey,
  // Request types
  QuestionGenerationRequest,
  QuestionEvaluationRequest,
  AITeacherRequest,
  ExplainQuestionRequest,
  AnalyzeMistakesRequest,
  PracticeQuestionRequest,
  StudyCoachRequest,
  MiniExamRequest,
  StudyPlanRequest,
  // Response types
  QuestionGenerationResponse,
  QuestionEvaluationResponse,
  AITeacherResponse,
  ExplainQuestionResponse,
  AnalyzeMistakesResponse,
  PracticeQuestionResponse,
  StudyCoachResponse,
  MiniExamResponse,
  StudyPlanResponse,
} from "./types";

// ─── Manager class ────────────────────────────────────────────────────────────

class AIManagerClass {
  private _provider: IAIProvider = new NvidiaAIProvider();
  private _devMode: boolean = __DEV__;
  /** Total timeout per request attempt in ms. Override with setTimeoutMs(). */
  private _requestTimeoutMs: number = 120_000;
  /** Tracks how many requests are currently in-flight per feature key */
  private readonly _inFlight = new Map<string, number>();

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Swap the active provider.
   * Call this once on app start after a real provider is configured.
   *
   * @example
   *   AIManager.configure(new GeminiProvider({ apiKey: GEMINI_KEY }));
   *   AIManager.configure(new GeminiProvider({ apiKey }), { timeoutMs: 20_000 });
   */
  configure(provider: IAIProvider, options?: { timeoutMs?: number }): void {
    this._provider = provider;
    if (options?.timeoutMs !== undefined) {
      this._requestTimeoutMs = options.timeoutMs;
    }
    if (this._devMode) {
      console.log(`[AIManager] Provider → ${provider.kind} | timeout: ${this._requestTimeoutMs}ms`);
    }
  }

  /**
   * Override the per-request timeout in ms.
   * Useful in tests or when provider SLAs differ between environments.
   */
  setTimeoutMs(ms: number): void {
    this._requestTimeoutMs = ms;
  }

  /** Returns the kind identifier of the currently active provider */
  get activeProvider(): AIProviderKind {
    return this._provider.kind;
  }

  /** True when the active provider reports it is ready */
  get isProviderAvailable(): boolean {
    return this._provider.isAvailable;
  }

  /**
   * Current in-flight count per feature and the active provider kind.
   * Useful for debug UIs and integration tests.
   */
  getStats(): { provider: AIProviderKind; inFlight: Record<string, number> } {
    return {
      provider: this._provider.kind,
      inFlight: Object.fromEntries(this._inFlight),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates provider availability and feature enabled status.
   * Returns the provider instance to use (currently always the global provider;
   * per-feature overrides are logged but not yet resolved to a second provider).
   */
  private _validate(featureKey: AIFeatureKey): IAIProvider {
    if (!this._provider.isAvailable) {
      throw AIError.providerUnavailable(this._provider.kind);
    }
    if (!isAIFeatureEnabled(featureKey)) {
      throw AIError.featureDisabled(featureKey);
    }
    const config = getAIFeatureConfig(featureKey);
    if (config?.providerOverride && this._devMode) {
      console.log(
        `[AIManager] Feature "${featureKey}" has a provider override (${config.providerOverride}) — using default provider for now.`
      );
    }
    return this._provider;
  }

  /** Increment the in-flight counter for a feature. Returns a cleanup fn. */
  private _enter(feature: string): () => void {
    this._inFlight.set(feature, (this._inFlight.get(feature) ?? 0) + 1);
    return () => {
      const n = this._inFlight.get(feature) ?? 1;
      n <= 1 ? this._inFlight.delete(feature) : this._inFlight.set(feature, n - 1);
    };
  }

  /**
   * Core execution wrapper applied to every provider call.
   *
   * Enforces concurrency limits → validates feature → runs the call with a
   * timeout → retries once on transient errors → propagates AIError to callers.
   */
  private async _execute<T>(
    featureKey: AIFeatureKey,
    call: (provider: IAIProvider) => Promise<T>
  ): Promise<T> {
    const startMs = Date.now();

    // ── 1. Validate provider + feature ───────────────────────────────────────
    const provider = this._validate(featureKey);

    // ── 2. Enforce concurrency limit ─────────────────────────────────────────
    const config = getAIFeatureConfig(featureKey)!;
    const inFlight = this._inFlight.get(featureKey) ?? 0;
    if (inFlight >= config.maxConcurrent) {
      throw AIError.concurrentLimit(featureKey, config.maxConcurrent);
    }

    // ── 3. Track in-flight ───────────────────────────────────────────────────
    const leave = this._enter(featureKey);

    try {
      // ── 4. Execute with timeout + 1 retry on transient failures ─────────────
      for (let attempt = 0; attempt <= 1; attempt++) {
        if (attempt > 0) {
          if (this._devMode) {
            console.warn(`[AIManager] ↩ retrying "${featureKey}" (attempt ${attempt + 1})...`);
          }
          await new Promise<void>((r) => setTimeout(r, 1_000));
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(AIError.timeout(this._requestTimeoutMs)),
            this._requestTimeoutMs
          );
        });

        try {
          const result = await Promise.race([call(provider), timeoutPromise]);
          clearTimeout(timeoutId);

          if (this._devMode) {
            console.log(
              `[AIManager] ✓ "${featureKey}" via ${provider.kind} — ${Date.now() - startMs}ms`
            );
          }
          return result;
        } catch (e) {
          clearTimeout(timeoutId);
          const err = e instanceof AIError ? e : AIError.unknown(e);

          console.error("[AIManager DEBUG]", {
            featureKey,
            attempt: attempt + 1,
            code: err.code,
            message: err.message,
            retryable: err.retryable,
            originalError: e,
          });

          // Non-retryable → throw immediately, don't waste the retry
          if (!err.retryable || attempt >= 1) throw err;
          // Retryable on first attempt → loop continues
        }
      }

      // Unreachable — the loop always returns or throws
      throw AIError.unknown(new Error("unreachable"));
    } finally {
      leave();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  // All public methods follow the same pattern:
  //   return this._execute("feature_key", (p) => p.method(req));

  // ── Original operations ────────────────────────────────────────────────────

  async generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    return this._execute("question_generator", (p) => p.generateQuestions(req));
  }

  async evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse> {
    return this._execute("question_evaluator", (p) => p.evaluateQuestion(req));
  }

  async teachTopic(req: AITeacherRequest): Promise<AITeacherResponse> {
    return this._execute("ai_teacher", (p) => p.teachTopic(req));
  }

  async coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse> {
    return this._execute("study_coach", (p) => p.coachStudent(req));
  }

  async generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse> {
    return this._execute("mini_exams", (p) => p.generateMiniExam(req));
  }

  async generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    return this._execute("study_plans", (p) => p.generateStudyPlan(req));
  }

  // ── New operations ─────────────────────────────────────────────────────────

  /**
   * Full worked solution for a specific question.
   * Optionally explains why the student's wrong answer was incorrect.
   */
  async explainQuestion(
    req: ExplainQuestionRequest
  ): Promise<ExplainQuestionResponse> {
    return this._execute("explain_question", (p) => p.explainQuestion(req));
  }

  /**
   * Analyse a batch of wrong answers and surface recurring mistake patterns.
   */
  async analyzeMistakes(
    req: AnalyzeMistakesRequest
  ): Promise<AnalyzeMistakesResponse> {
    return this._execute("analyze_mistakes", (p) => p.analyzeMistakes(req));
  }

  /**
   * Generate a single targeted practice question for one topic.
   * Lighter-weight alternative to generateQuestions() for "give me another" UIs.
   */
  async generatePracticeQuestion(
    req: PracticeQuestionRequest
  ): Promise<PracticeQuestionResponse> {
    return this._execute("practice_question", (p) => p.generatePracticeQuestion(req));
  }

  // ── Convenience aliases ────────────────────────────────────────────────────

  /**
   * Alias for generateStudyPlan().
   * "createStudyPlan" is the user-facing verb; "generateStudyPlan" is the
   * technical name used internally. Both use the same feature key and types.
   */
  async createStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    return this.generateStudyPlan(req);
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const AIManager = new AIManagerClass();


