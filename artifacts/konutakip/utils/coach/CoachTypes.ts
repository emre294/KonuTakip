export type StudentType = "mezun" | "12";

export type MotivationTrend =
  | "rising"
  | "stable"
  | "falling"
  | "insufficient_data";

export interface AICoachProfile {
  studentType: StudentType;
  targetTYT: number;
  targetAYT: number;
  dailyStudyMinutes: number;
  examDate: string;
  studyDays: number[];
  weakSubjects: string[];
  strongSubjects: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CoachStudyPlanTask {
  id: string;
  date: string;
  subjectId?: string;
  subjectName: string;
  topic: string;
  plannedMinutes: number;
  targetQuestions: number;
  completed: boolean;
  postponed: boolean;
  completedAt?: string;
}

export interface DailyCoachEntry {
  id: string;
  date: string;
  studiedMinutes: number;
  solvedQuestions: number;
  completedTopics: string[];
  skippedTopics: string[];
  completedPlan: boolean;
  motivationLevel: 1 | 2 | 3 | 4 | 5;
  mood: string;
  aiNote: string;
  subjectStudyMinutes: Record<string, number>;
  completedSessionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CoachAINote {
  id: string;
  text: string;
  createdAt: string;
  category:
    | "general"
    | "motivation"
    | "weakness"
    | "achievement"
    | "plan";
}

export interface PostponedTask {
  id: string;
  subjectName: string;
  topic: string;
  originalDate: string;
  postponedTo?: string;
  reason?: string;
  completed: boolean;
  createdAt: string;
}

export interface CoachMemory {
  profile: AICoachProfile | null;
  dailyHistory: DailyCoachEntry[];
  lastConversationSummary: string;
  lastStudyPlan: CoachStudyPlanTask[];
  postponedTasks: PostponedTask[];
  aiNotes: CoachAINote[];
  updatedAt: string;
}

export interface WeeklySummary {
  completedTopics: string[];
  solvedQuestions: number;
  strongestSubject: string | null;
  weakestSubject: string | null;
  completionRate: number;
  averageStudyMinutes: number;
  motivationTrend: MotivationTrend;
  coachSummary: string;
}

export interface CoachContextInput {
  todayPlan?: CoachStudyPlanTask[];
  currentDate?: string;
}

export const EMPTY_COACH_MEMORY: CoachMemory = {
  profile: null,
  dailyHistory: [],
  lastConversationSummary: "",
  lastStudyPlan: [],
  postponedTasks: [],
  aiNotes: [],
  updatedAt: new Date(0).toISOString(),
};

