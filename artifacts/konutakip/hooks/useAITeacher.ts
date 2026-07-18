/**
 * useAITeacher — hook for AI topic explanations.
 *
 * Returns mock data via LocalMockAIProvider until a real provider is wired in.
 * Not yet used in any UI screen — infrastructure only.
 *
 * Usage:
 *   const { explain, isLoading, summary, steps, keyPoints, error } =
 *     useAITeacher();
 *
 *   await explain({
 *     topicId: "fizik_ivme",
 *     topicName: "İvme",
 *     subjectName: "Fizik",
 *     examType: "AYT",
 *   });
 *
 *   // Follow-up question:
 *   await explain({
 *     topicId: "fizik_ivme",
 *     topicName: "İvme",
 *     subjectName: "Fizik",
 *     examType: "AYT",
 *     userQuestion: "Negatif ivme ne anlama gelir?",
 *   });
 */

import { useCallback, useState } from "react";
import { AIManager } from "@/utils/ai";
import type {
  AITeacherRequest,
  AITeacherResponse,
  ExplanationStep,
  ExamType,
} from "@/utils/ai/types";
import { useAI } from "./useAI";

// ─── Simplified input ─────────────────────────────────────────────────────────

export interface ExplainTopicInput {
  topicId: string;
  topicName: string;
  subjectName: string;
  examType: ExamType;
  userQuestion?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAITeacherResult {
  /** Explain a topic (or answer a follow-up question) */
  explain: (input: ExplainTopicInput) => Promise<AITeacherResponse>;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  summary: string | null;
  steps: ExplanationStep[];
  keyPoints: string[];
  commonMistakes: string[];
  practiceHint: string | null;
  response: AITeacherResponse | null;
  error: import("@/utils/ai/AIError").AIError | null;
  errorMessage: string | null;
  /** Clears state and conversation history */
  reset: () => void;
}

export function useAITeacher(): UseAITeacherResult {
  const ai = useAI<AITeacherRequest, AITeacherResponse>(
    AIManager.teachTopic.bind(AIManager)
  );

  // Keep a rolling conversation history for multi-turn sessions.
  const [history, setHistory] = useState<AITeacherRequest["conversationHistory"]>([]);

  const explain = useCallback(
    async (input: ExplainTopicInput): Promise<AITeacherResponse> => {
      const req: AITeacherRequest = {
        feature: "ai_teacher",
        requestedAt: new Date().toISOString(),
        topicId: input.topicId,
        topicName: input.topicName,
        subjectName: input.subjectName,
        examType: input.examType,
        userQuestion: input.userQuestion,
        conversationHistory: history,
      };

      const response = await ai.execute(req);

      // Append this exchange to the conversation history for future calls.
      setHistory((prev) => [
        ...(prev ?? []),
        ...(input.userQuestion
          ? [{ role: "student" as const, content: input.userQuestion }]
          : []),
        { role: "teacher" as const, content: response.summary },
      ]);

      return response;
    },
    [ai, history]
  );

  const reset = useCallback(() => {
    ai.reset();
    setHistory([]);
  }, [ai]);

  return {
    explain,
    isIdle: ai.isIdle,
    isLoading: ai.isLoading,
    isSuccess: ai.isSuccess,
    isError: ai.isError,
    summary: ai.data?.summary ?? null,
    steps: ai.data?.steps ?? [],
    keyPoints: ai.data?.keyPoints ?? [],
    commonMistakes: ai.data?.commonMistakes ?? [],
    practiceHint: ai.data?.practiceHint ?? null,
    response: ai.data,
    error: ai.error,
    errorMessage: ai.errorMessage,
    reset,
  };
}
