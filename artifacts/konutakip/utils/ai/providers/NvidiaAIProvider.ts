import type { IAIProvider } from "../AIProvider";
import { AIError } from "../AIError";
import { LocalMockAIProvider } from "./LocalMockAIProvider";
import {
  AIProviderKind,
  type BaseAIRequest,
  type QuestionGenerationRequest,
  type QuestionGenerationResponse,
  type QuestionEvaluationRequest,
  type QuestionEvaluationResponse,
  type AITeacherRequest,
  type AITeacherResponse,
  type ExplainQuestionRequest,
  type ExplainQuestionResponse,
  type AnalyzeMistakesRequest,
  type AnalyzeMistakesResponse,
  type PracticeQuestionRequest,
  type PracticeQuestionResponse,
  type StudyCoachRequest,
  type StudyCoachResponse,
  type MiniExamRequest,
  type MiniExamResponse,
  type StudyPlanRequest,
  type StudyPlanResponse,
} from "../types";

type NvidiaEndpoint =
  | "generate-questions"
  | "evaluate-question"
  | "teach-topic"
  | "explain-question"
  | "analyze-mistakes"
  | "practice-question"
  | "coach"
  | "mini-exam"
  | "study-plan";

interface NvidiaBackendResponse {
  /** New standardised field (v2 backend) */
  content?: unknown;
  /** Legacy field — kept for backward compatibility with older deployments */
  answer?: unknown;
  error?: unknown;
  message?: unknown;
}

interface NvidiaAIProviderOptions {
  baseUrl?: string;
}

const DEFAULT_BACKEND_URL = "https://konutakip-backend.onrender.com";

const CONTENT_FIELDS = [
  "summary",
  "explanation",
  "overallAnalysis",
  "analysisSummary",
  "overview",
  "notes",
  "message",
  "body",
  "description",
  "practiceHint",
  "improvementTip",
  "weeklyFocusSuggestion",
  "motivationalMessage",
  "solution",
  "workedSolution",
] as const;

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Mevcut response yapısını bozmadan NVIDIA cevabını kullanıcıya gösterilen
 * ana metin alanına yerleştirir.
 */
function injectAnswer(target: unknown, answer: string): boolean {
  if (!isRecord(target)) {
    if (Array.isArray(target)) {
      for (const item of target) {
        if (injectAnswer(item, answer)) return true;
      }
    }
    return false;
  }

  for (const key of CONTENT_FIELDS) {
    if (key in target && typeof target[key] === "string") {
      target[key] = answer;
      return true;
    }
  }

  for (const value of Object.values(target)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (injectAnswer(item, answer)) return true;
      }
    } else if (isRecord(value) && injectAnswer(value, answer)) {
      return true;
    }
  }

  return false;
}

export class NvidiaAIProvider implements IAIProvider {
  readonly kind = AIProviderKind.NVIDIA;
  readonly isAvailable = true;

  private readonly baseUrl: string;
  private readonly mockShapeProvider = new LocalMockAIProvider();

  constructor(options: NvidiaAIProviderOptions = {}) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl?.trim() || DEFAULT_BACKEND_URL
    );
  }

  private async request(
    endpoint: NvidiaEndpoint,
    request: BaseAIRequest
  ): Promise<{ answer: string; durationMs: number }> {
    const startedAt = Date.now();

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/ai/${endpoint}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );

      let payload: NvidiaBackendResponse = {};

      try {
        payload = (await response.json()) as NvidiaBackendResponse;
      } catch {
        payload = {};
      }

      if (response.status === 401 || response.status === 403) {
        throw AIError.authError(this.kind);
      }

      if (response.status === 429) {
        throw AIError.rateLimited(this.kind);
      }

      if (!response.ok) {
        const detail =
          typeof payload.error === "string"
            ? payload.error
            : typeof payload.message === "string"
              ? payload.message
              : `HTTP ${response.status}`;

        throw AIError.networkError(detail);
      }

      // Prefer `content` (v2 backend), fall back to `answer` (legacy).
      const rawAnswer =
        typeof payload.content === "string" && payload.content.trim().length > 0
          ? payload.content.trim()
          : typeof payload.answer === "string" && payload.answer.trim().length > 0
            ? payload.answer.trim()
            : null;

      if (!rawAnswer) {
        throw AIError.invalidResponse(
          "Backend cevabında geçerli bir content alanı bulunamadı."
        );
      }

      return {
        answer: rawAnswer,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      const detail =
        error instanceof Error ? error.message : String(error);

      throw AIError.networkError(detail);
    }
  }

  private async buildResponse<T extends object>(
    endpoint: NvidiaEndpoint,
    request: BaseAIRequest,
    createShape: () => Promise<T>
  ): Promise<T> {
    const [{ answer, durationMs }, responseShape] = await Promise.all([
      this.request(endpoint, request),
      createShape(),
    ]);

    const mutable = responseShape as unknown as Record<string, unknown>;

    mutable.provider = AIProviderKind.NVIDIA;
    mutable.durationMs = durationMs;
    mutable.generatedAt = new Date().toISOString();

    if (request.requestId) {
      mutable.requestId = request.requestId;
    }

    const injected = injectAnswer(mutable, answer);

    if (!injected) {
      mutable.answer = answer;
    }

    return responseShape;
  }

  generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    return this.buildResponse(
      "generate-questions",
      req,
      () => this.mockShapeProvider.generateQuestions(req)
    );
  }

  evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse> {
    return this.buildResponse(
      "evaluate-question",
      req,
      () => this.mockShapeProvider.evaluateQuestion(req)
    );
  }

  teachTopic(req: AITeacherRequest): Promise<AITeacherResponse> {
    return this.buildResponse(
      "teach-topic",
      req,
      () => this.mockShapeProvider.teachTopic(req)
    );
  }

  explainQuestion(
    req: ExplainQuestionRequest
  ): Promise<ExplainQuestionResponse> {
    return this.buildResponse(
      "explain-question",
      req,
      () => this.mockShapeProvider.explainQuestion(req)
    );
  }

  analyzeMistakes(
    req: AnalyzeMistakesRequest
  ): Promise<AnalyzeMistakesResponse> {
    return this.buildResponse(
      "analyze-mistakes",
      req,
      () => this.mockShapeProvider.analyzeMistakes(req)
    );
  }

  generatePracticeQuestion(
    req: PracticeQuestionRequest
  ): Promise<PracticeQuestionResponse> {
    return this.buildResponse(
      "practice-question",
      req,
      () => this.mockShapeProvider.generatePracticeQuestion(req)
    );
  }

  coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse> {
    return this.buildResponse(
      "coach",
      req,
      () => this.mockShapeProvider.coachStudent(req)
    );
  }

  generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse> {
    return this.buildResponse(
      "mini-exam",
      req,
      () => this.mockShapeProvider.generateMiniExam(req)
    );
  }

  generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    return this.buildResponse(
      "study-plan",
      req,
      () => this.mockShapeProvider.generateStudyPlan(req)
    );
  }
}
