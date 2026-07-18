/**
 * useQuestionGenerator — hook for AI-powered question generation.
 *
 * Returns mock data via LocalMockAIProvider until a real provider is wired in.
 * All existing screens are unaffected — this hook is not yet used in any UI.
 *
 * Usage:
 *   const { generate, isLoading, questions, error, errorMessage } =
 *     useQuestionGenerator();
 *
 *   await generate({
 *     topicId: "mat_turev",
 *     topicName: "Türev",
 *     subjectName: "Matematik",
 *     examType: "AYT",
 *     count: 5,
 *     difficulty: "medium",
 *   });
 */

import { useCallback } from "react";
import { AIManager } from "@/utils/ai";
import type {
  QuestionGenerationRequest,
  QuestionGenerationResponse,
  GeneratedQuestion,
  ExamType,
  DifficultyLevel,
} from "@/utils/ai/types";
import { useAI } from "./useAI";

// ─── Simplified request for call-sites ───────────────────────────────────────

export interface GenerateQuestionsInput {
  topicId: string;
  topicName: string;
  subjectName: string;
  examType: ExamType;
  count?: number;
  difficulty?: DifficultyLevel;
  excludeQuestionIds?: string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseQuestionGeneratorResult {
  /** Trigger question generation */
  generate: (input: GenerateQuestionsInput) => Promise<QuestionGenerationResponse>;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** The generated questions from the last successful call */
  questions: GeneratedQuestion[];
  /** Full response (includes metadata like deliveredCount) */
  response: QuestionGenerationResponse | null;
  /** AIError from the last failed call */
  error: import("@/utils/ai/AIError").AIError | null;
  /** Turkish UI-ready error string */
  errorMessage: string | null;
  reset: () => void;
}

export function useQuestionGenerator(): UseQuestionGeneratorResult {
  const ai = useAI<QuestionGenerationRequest, QuestionGenerationResponse>(
    AIManager.generateQuestions.bind(AIManager)
  );

  const generate = useCallback(
    async (input: GenerateQuestionsInput): Promise<QuestionGenerationResponse> => {
      const req: QuestionGenerationRequest = {
        feature: "question_generator",
        requestedAt: new Date().toISOString(),
        topicId: input.topicId,
        topicName: input.topicName,
        subjectName: input.subjectName,
        examType: input.examType,
        count: input.count ?? 5,
        difficulty: input.difficulty ?? "medium",
        excludeQuestionIds: input.excludeQuestionIds,
      };
      return ai.execute(req);
    },
    [ai]
  );

  return {
    generate,
    isIdle: ai.isIdle,
    isLoading: ai.isLoading,
    isSuccess: ai.isSuccess,
    isError: ai.isError,
    questions: ai.data?.questions ?? [],
    response: ai.data,
    error: ai.error,
    errorMessage: ai.errorMessage,
    reset: ai.reset,
  };
}
