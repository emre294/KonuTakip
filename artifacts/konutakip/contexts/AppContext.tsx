import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AYT_SUBJECTS_BY_FIELD, StudyField, TYT_SUBJECTS } from "@/data/subjects";

export interface UserProfile {
  name: string;
  grade: "12" | "mezun";
  targetUniversity: string;
  targetDepartment: string;
  tytTargetScore: number;
  aytTargetScore: number;
  studyStartDate: string;
  studyField: StudyField;
}

export interface DailySession {
  id: string;
  date: string;
  time: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  targetQuestions: number;
  notes: string;
  completed: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  addedDate: string;
  notes: string;
  understood: boolean;
  nextReviewDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
}

const ACHIEVEMENTS_TEMPLATE: Achievement[] = [
  { id: "first_topic", title: "İlk Adım", description: "İlk konuyu tamamladın!", icon: "star", unlocked: false },
  { id: "streak_7", title: "Devamlılık", description: "7 günlük çalışma serisi", icon: "zap", unlocked: false },
  { id: "topics_10", title: "Çalışkan", description: "10 konu tamamladın", icon: "book", unlocked: false },
  { id: "topics_50", title: "Azimli", description: "50 konu tamamladın", icon: "award", unlocked: false },
  { id: "topics_100", title: "Yüzlük Kulüp", description: "100 konu tamamladın", icon: "award", unlocked: false },
  { id: "tyt_50", title: "TYT Yarısı", description: "TYT'nin %50'sini bitirdin", icon: "target", unlocked: false },
  { id: "tyt_100", title: "TYT Fatihi", description: "Tüm TYT konularını bitirdin!", icon: "crown", unlocked: false },
  { id: "ayt_50", title: "AYT Yarısı", description: "AYT'nin %50'sini bitirdin", icon: "target", unlocked: false },
  { id: "ayt_100", title: "AYT Fatihi", description: "Tüm AYT konularını bitirdin!", icon: "crown", unlocked: false },
  { id: "sessions_5", title: "Plan Ustası", description: "5 çalışma oturumu planladın", icon: "calendar", unlocked: false },
  { id: "questions_10", title: "Soru Takipçisi", description: "10 soru ekledin", icon: "help-circle", unlocked: false },
];

interface AppContextValue {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  topicCompletion: Record<string, boolean>;
  toggleTopic: (topicId: string) => void;
  sessions: DailySession[];
  addSession: (s: Omit<DailySession, "id">) => void;
  completeSession: (id: string) => void;
  deleteSession: (id: string) => void;
  questions: Question[];
  addQuestion: (q: Omit<Question, "id" | "addedDate" | "understood" | "nextReviewDate">) => void;
  markQuestionUnderstood: (id: string) => void;
  achievements: Achievement[];
  newAchievement: Achievement | null;
  clearNewAchievement: () => void;
  tytProgress: number;
  aytProgress: number;
  totalTopicsCompleted: number;
  studyStreak: number;
  studyDays: string[];
  markStudyDay: () => void;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "konutakip_v2";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getNextReviewDate(from: Date): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let current = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = current.toISOString().split("T")[0];
    if (sorted.includes(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [topicCompletion, setTopicCompletion] = useState<Record<string, boolean>>({});
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS_TEMPLATE);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.profile) setProfileState(data.profile);
        if (data.topicCompletion) setTopicCompletion(data.topicCompletion);
        if (data.sessions) setSessions(data.sessions);
        if (data.questions) setQuestions(data.questions);
        if (data.achievements) setAchievements(data.achievements);
        if (data.studyDays) setStudyDays(data.studyDays);
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }

  async function saveData(updates: Partial<{
    profile: UserProfile | null;
    topicCompletion: Record<string, boolean>;
    sessions: DailySession[];
    questions: Question[];
    achievements: Achievement[];
    studyDays: string[];
  }>) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      const merged = { ...existing, ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    saveData({ profile: p });
  }, []);

  const tytProgress = useMemo(() => {
    const allTopics = TYT_SUBJECTS.flatMap((s) => s.topics);
    if (allTopics.length === 0) return 0;
    const done = allTopics.filter((t) => topicCompletion[t.id]).length;
    return Math.round((done / allTopics.length) * 100);
  }, [topicCompletion]);

  const aytProgress = useMemo(() => {
    if (!profile) return 0;
    const aytSubjects = AYT_SUBJECTS_BY_FIELD[profile.studyField] || [];
    const allTopics = aytSubjects.flatMap((s) => s.topics);
    if (allTopics.length === 0) return 0;
    const done = allTopics.filter((t) => topicCompletion[t.id]).length;
    return Math.round((done / allTopics.length) * 100);
  }, [topicCompletion, profile]);

  const totalTopicsCompleted = useMemo(
    () => Object.values(topicCompletion).filter(Boolean).length,
    [topicCompletion]
  );

  const studyStreak = useMemo(() => computeStreak(studyDays), [studyDays]);

  function checkAndUnlockAchievements(
    newCompletion: Record<string, boolean>,
    newSessions: DailySession[],
    newQuestions: Question[],
    currentAchievements: Achievement[],
    field: StudyField | undefined
  ) {
    const total = Object.values(newCompletion).filter(Boolean).length;
    const tytTopics = TYT_SUBJECTS.flatMap((s) => s.topics);
    const tytDone = tytTopics.filter((t) => newCompletion[t.id]).length;
    const tytPct = tytTopics.length > 0 ? (tytDone / tytTopics.length) * 100 : 0;
    let aytPct = 0;
    if (field) {
      const aytTopics = (AYT_SUBJECTS_BY_FIELD[field] || []).flatMap((s) => s.topics);
      const aytDone = aytTopics.filter((t) => newCompletion[t.id]).length;
      aytPct = aytTopics.length > 0 ? (aytDone / aytTopics.length) * 100 : 0;
    }

    const conditions: Record<string, boolean> = {
      first_topic: total >= 1,
      topics_10: total >= 10,
      topics_50: total >= 50,
      topics_100: total >= 100,
      tyt_50: tytPct >= 50,
      tyt_100: tytPct >= 100,
      ayt_50: aytPct >= 50,
      ayt_100: aytPct >= 100,
      sessions_5: newSessions.length >= 5,
      questions_10: newQuestions.length >= 10,
    };

    let triggered: Achievement | null = null;
    const updated = currentAchievements.map((a) => {
      if (!a.unlocked && conditions[a.id]) {
        triggered = { ...a, unlocked: true, unlockedDate: new Date().toISOString() };
        return triggered;
      }
      return a;
    });

    return { updated, triggered };
  }

  const toggleTopic = useCallback(
    (topicId: string) => {
      setTopicCompletion((prev) => {
        const next = { ...prev, [topicId]: !prev[topicId] };
        saveData({ topicCompletion: next });

        setAchievements((prevA) => {
          const { updated, triggered } = checkAndUnlockAchievements(
            next, sessions, questions, prevA, profile?.studyField
          );
          if (triggered) {
            setNewAchievement(triggered);
            saveData({ achievements: updated });
          }
          return updated;
        });

        return next;
      });

      markStudyDay();
    },
    [sessions, questions, profile]
  );

  const addSession = useCallback((s: Omit<DailySession, "id">) => {
    const session: DailySession = { ...s, id: generateId() };
    setSessions((prev) => {
      const next = [...prev, session];
      saveData({ sessions: next });

      setAchievements((prevA) => {
        const { updated, triggered } = checkAndUnlockAchievements(
          topicCompletion, next, questions, prevA, profile?.studyField
        );
        if (triggered) {
          setNewAchievement(triggered);
          saveData({ achievements: updated });
        }
        return updated;
      });

      return next;
    });
  }, [topicCompletion, questions, profile]);

  const completeSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, completed: true } : s);
      saveData({ sessions: next });
      return next;
    });
    markStudyDay();
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveData({ sessions: next });
      return next;
    });
  }, []);

  const addQuestion = useCallback((q: Omit<Question, "id" | "addedDate" | "understood" | "nextReviewDate">) => {
    const question: Question = {
      ...q,
      id: generateId(),
      addedDate: new Date().toISOString().split("T")[0],
      understood: false,
      nextReviewDate: getNextReviewDate(new Date()),
    };
    setQuestions((prev) => {
      const next = [...prev, question];
      saveData({ questions: next });

      setAchievements((prevA) => {
        const { updated, triggered } = checkAndUnlockAchievements(
          topicCompletion, sessions, next, prevA, profile?.studyField
        );
        if (triggered) {
          setNewAchievement(triggered);
          saveData({ achievements: updated });
        }
        return updated;
      });

      return next;
    });
  }, [topicCompletion, sessions, profile]);

  const markQuestionUnderstood = useCallback((id: string) => {
    setQuestions((prev) => {
      const next = prev.map((q) => q.id === id ? { ...q, understood: true } : q);
      saveData({ questions: next });
      return next;
    });
  }, []);

  const clearNewAchievement = useCallback(() => setNewAchievement(null), []);

  const markStudyDay = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setStudyDays((prev) => {
      if (prev.includes(today)) return prev;
      const next = [...prev, today];
      saveData({ studyDays: next });

      setAchievements((prevA) => {
        const streak = computeStreak(next);
        if (streak >= 7) {
          const updated = prevA.map((a) =>
            a.id === "streak_7" && !a.unlocked
              ? { ...a, unlocked: true, unlockedDate: new Date().toISOString() }
              : a
          );
          const triggered = updated.find((a) => a.id === "streak_7" && a.unlocked && !prevA.find((pa) => pa.id === "streak_7")?.unlocked) ?? null;
          if (triggered) setNewAchievement(triggered);
          saveData({ achievements: updated });
          return updated;
        }
        return prevA;
      });

      return next;
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      setProfile,
      topicCompletion,
      toggleTopic,
      sessions,
      addSession,
      completeSession,
      deleteSession,
      questions,
      addQuestion,
      markQuestionUnderstood,
      achievements,
      newAchievement,
      clearNewAchievement,
      tytProgress,
      aytProgress,
      totalTopicsCompleted,
      studyStreak,
      studyDays,
      markStudyDay,
      isLoaded,
    }),
    [
      profile, setProfile, topicCompletion, toggleTopic,
      sessions, addSession, completeSession, deleteSession,
      questions, addQuestion, markQuestionUnderstood,
      achievements, newAchievement, clearNewAchievement,
      tytProgress, aytProgress, totalTopicsCompleted,
      studyStreak, studyDays, markStudyDay, isLoaded,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
