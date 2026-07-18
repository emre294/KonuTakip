/**
 * useStudyCoach — hook for AI-powered personalised coaching.
 *
 * Returns mock data via LocalMockAIProvider until a real provider is wired in.
 * Not yet used in any UI screen — infrastructure only.
 *
 * The hook automatically derives the learnerSnapshot from AppContext so
 * call-sites only need to call `coach()` — no manual data assembly required.
 *
 * Usage:
 *   const { coach, isLoading, recommendations, overallAssessment } =
 *     useStudyCoach();
 *
 *   await coach(); // uses app state automatically
 *   await coach({ focusArea: "motivation" }); // optional focus
 */

import { useCallback } from "react";
import { AIManager } from "@/utils/ai";
import type {
  StudyCoachRequest,
  StudyCoachResponse,
  CoachRecommendation,
} from "@/utils/ai/types";
import { useAI } from "./useAI";
import { useApp } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_EXAM_DATE, TYT_SUBJECTS } from "@/data/subjects";

// ─── Optional call-site overrides ────────────────────────────────────────────

export interface CoachOptions {
  focusArea?: StudyCoachRequest["focusArea"];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseStudyCoachResult {
  /** Trigger a coaching session — snapshot is assembled automatically */
  coach: (options?: CoachOptions) => Promise<StudyCoachResponse>;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  overallAssessment: string | null;
  recommendations: CoachRecommendation[];
  weeklyFocusSuggestion: string | null;
  motivationalMessage: string | null;
  response: StudyCoachResponse | null;
  error: import("@/utils/ai/AIError").AIError | null;
  errorMessage: string | null;
  reset: () => void;
}

export function useStudyCoach(): UseStudyCoachResult {
  const ai = useAI<StudyCoachRequest, StudyCoachResponse>(
    AIManager.coachStudent.bind(AIManager)
  );

  const {
    profile,
    topicCompletion,
    tytProgress,
    aytProgress,
    studyStreak,
    sessions,
    totalTopicsCompleted,
  } = useApp();

  const coach = useCallback(
    async (options: CoachOptions = {}): Promise<StudyCoachResponse> => {
      // ── Derive weak subjects ──────────────────────────────────────────────
      const weakSubjectNames: string[] = [];

      if (profile) {
        const aytSubjects = AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [];
        for (const subject of aytSubjects) {
          const completed = subject.topics.filter((t) => topicCompletion[t.id]).length;
          const pct = subject.topics.length > 0 ? (completed / subject.topics.length) * 100 : 100;
          if (pct < 25) weakSubjectNames.push(subject.name);
        }
        for (const subject of TYT_SUBJECTS) {
          const completed = subject.topics.filter((t) => topicCompletion[t.id]).length;
          const pct = subject.topics.length > 0 ? (completed / subject.topics.length) * 100 : 100;
          if (pct < 20) weakSubjectNames.push(subject.name);
        }
      }

      const daysUntilExam = Math.max(
        0,
        Math.floor((TYT_EXAM_DATE.getTime() - Date.now()) / 86400000)
      );

      const req: StudyCoachRequest = {
        feature: "study_coach",
        requestedAt: new Date().toISOString(),
        learnerSnapshot: {
          tytProgressPct: tytProgress,
          aytProgressPct: aytProgress,
          studyStreakDays: studyStreak,
          totalSessionsCompleted: sessions.filter((s) => s.completed).length,
          totalTopicsCompleted,
          weakSubjectNames,
          daysUntilExam,
          studyField: profile?.studyField ?? "say",
        },
        focusArea: options.focusArea,
      };

      return ai.execute(req);
    },
    [ai, profile, topicCompletion, tytProgress, aytProgress, studyStreak, sessions, totalTopicsCompleted]
  );

  return {
    coach,
    isIdle: ai.isIdle,
    isLoading: ai.isLoading,
    isSuccess: ai.isSuccess,
    isError: ai.isError,
    overallAssessment: ai.data?.overallAssessment ?? null,
    recommendations: ai.data?.recommendations ?? [],
    weeklyFocusSuggestion: ai.data?.weeklyFocusSuggestion ?? null,
    motivationalMessage: ai.data?.motivationalMessage ?? null,
    response: ai.data,
    error: ai.error,
    errorMessage: ai.errorMessage,
    reset: ai.reset,
  };
}
