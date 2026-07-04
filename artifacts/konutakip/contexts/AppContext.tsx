import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AYT_SUBJECTS_BY_FIELD, StudyField, TYT_SUBJECTS } from "@/data/subjects";
import {
  cancelAllSessionReminders,
  cancelDailyStudyReminder,
  cancelQuestionReminder,
  cancelTopicReminder,
  scheduleDailyStudyReminder,
  scheduleEveryDaySessionReminder,
  scheduleQuestionReminder,
  scheduleSessionReminder,
  scheduleTopicReminder,
  scheduleWeeklySessionReminder,
  syncNotifications,
} from "@/utils/notifications";

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

export type RepeatType = "one_time" | "every_day" | "every_week";

export interface DailySession {
  id: string;
  date: string;          // YYYY-MM-DD — only meaningful for one_time
  time: string;          // HH:mm
  subjectId: string;
  subjectName: string;
  topic: string;
  targetQuestions: number;
  notes: string;
  completed: boolean;    // only used for one_time sessions
  repeatType: RepeatType;
  weekdays?: number[];   // JS: 0=Sun … 6=Sat; only for every_week
  // Guards against double-counting this session's targetQuestions into
  // dailySolvedQuestions. Set true the moment completeSession() adds its
  // count; checked again on edit/delete so the running total stays correct.
  countedInStatistics?: boolean;
}

export interface QuestionAttachment {
  type: "image" | "pdf";
  uri: string;
  name: string;
}

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  addedDate: string;
  notes: string;
  understood: boolean;
  nextReviewDate: string;
  attachments: QuestionAttachment[];
  reminderInterval: 3 | 5 | 7;
}

export interface MockExamResult {
  id: string;
  name: string;
  date: string;
  type: "TYT" | "AYT";
  turkishNet: number;
  mathNet: number;
  scienceNet: number;
  socialNet: number;
  fieldNets: Record<string, number>;
  totalNet: number;
  notes: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
}

export interface DailyReminderSetting {
  hour: number;
  minute: number;
  enabled: boolean;
}

// Topic reminder record now also stores topicName/subjectName so that sync can
// rebuild the notification after a device restart without extra data lookups.
export interface TopicReminderRecord {
  interval: 3 | 5 | 7;
  nextDate: string; // YYYY-MM-DD
  topicName?: string;
  subjectName?: string;
}

const ACHIEVEMENTS_TEMPLATE: Achievement[] = [
  // Topics
  { id: "first_topic",        title: "İlk Adım",            description: "İlk konunu tamamladın!",                  icon: "star",         unlocked: false },
  { id: "topics_10",          title: "Çalışkan",             description: "10 konu tamamladın",                      icon: "book",         unlocked: false },
  { id: "topics_25",          title: "Azimli",               description: "25 konu tamamladın",                      icon: "book",         unlocked: false },
  { id: "topics_50",          title: "50'lik Kulüp",         description: "50 konu tamamladın",                      icon: "award",        unlocked: false },
  { id: "topics_100",         title: "Yüzlük Kulüp",         description: "100 konu tamamladın",                     icon: "award",        unlocked: false },
  { id: "all_topics",         title: "Konu Fatihi",          description: "Tüm konuları tamamladın!",                icon: "crown",        unlocked: false },
  { id: "tyt_50",             title: "TYT Yarısı",           description: "TYT konularının %50'sini bitirdin",       icon: "target",       unlocked: false },
  { id: "tyt_100",            title: "TYT Fatihi",           description: "Tüm TYT konularını bitirdin!",            icon: "crown",        unlocked: false },
  { id: "ayt_50",             title: "AYT Yarısı",           description: "AYT konularının %50'sini bitirdin",       icon: "target",       unlocked: false },
  { id: "ayt_100",            title: "AYT Fatihi",           description: "Tüm AYT konularını bitirdin!",            icon: "crown",        unlocked: false },
  // Wrong questions
  { id: "first_question",     title: "Hata Avcısı",          description: "İlk yanlış soruyu ekledin",               icon: "help-circle",  unlocked: false },
  { id: "questions_10",       title: "Soru Takipçisi",       description: "10 yanlış soru ekledin",                  icon: "help-circle",  unlocked: false },
  { id: "questions_25",       title: "Soru Koleksiyoncusu",  description: "25 yanlış soru ekledin",                  icon: "help-circle",  unlocked: false },
  { id: "reviews_25",         title: "Revizyoncu",           description: "25 soruyu anlayarak geçtin",              icon: "zap",          unlocked: false },
  { id: "reviews_100",        title: "Tekrar Ustası",        description: "100 soruyu anlayarak geçtin",             icon: "zap",          unlocked: false },
  { id: "question_master",    title: "Soru Ustası",          description: "200 soruyu anlayarak geçtin",             icon: "crown",        unlocked: false },
  // Mock exams
  { id: "first_exam",         title: "İlk Deneme",           description: "İlk deneme sonucunu kaydettın",           icon: "clipboard",    unlocked: false },
  { id: "exams_10",           title: "Deneme Aşığı",         description: "10 deneme kaydettın",                     icon: "clipboard",    unlocked: false },
  { id: "exams_25",           title: "Deneme Uzmanı",        description: "25 deneme kaydettın",                     icon: "clipboard",    unlocked: false },
  { id: "exams_50",           title: "Sınav Savaşçısı",      description: "50 deneme kaydettın",                     icon: "award",        unlocked: false },
  { id: "exams_100",          title: "Deneme Efsanesi",      description: "100 deneme kaydettın!",                   icon: "crown",        unlocked: false },
  // Streaks
  { id: "streak_3",           title: "3 Günlük Seri",        description: "3 gün üst üste çalıştın",                 icon: "zap",          unlocked: false },
  { id: "streak_7",           title: "Devamlılık",           description: "7 gün üst üste çalıştın",                 icon: "zap",          unlocked: false },
  { id: "streak_15",          title: "15 Günlük Seri",       description: "15 gün üst üste çalıştın",                icon: "zap",          unlocked: false },
  { id: "streak_30",          title: "30 Günlük Seri",       description: "30 gün üst üste çalıştın",                icon: "award",        unlocked: false },
  { id: "streak_60",          title: "2 Aylık Seri",         description: "60 gün üst üste çalıştın",                icon: "award",        unlocked: false },
  { id: "streak_100",         title: "100 Günlük Seri",      description: "100 gün üst üste çalıştın!",              icon: "crown",        unlocked: false },
  // Subject masters (TYT)
  { id: "turkish_champion",   title: "Türkçe Şampiyonu",     description: "Tüm Türkçe konularını bitirdin",          icon: "book",         unlocked: false },
  { id: "math_master",        title: "Matematik Ustası",     description: "Tüm Matematik konularını bitirdin",       icon: "book",         unlocked: false },
  { id: "science_expert",     title: "Fen Bilimleri Uzmanı", description: "Tüm Fen Bilimleri konularını bitirdin",   icon: "book",         unlocked: false },
  { id: "social_scholar",     title: "Sosyal Uzmanı",        description: "Tüm Sosyal Bilimler konularını bitirdin", icon: "book",         unlocked: false },
  // Subject masters (AYT)
  { id: "physics_explorer",   title: "Fizik Kaşifi",         description: "Tüm Fizik konularını bitirdin",           icon: "book",         unlocked: false },
  { id: "chemistry_expert",   title: "Kimya Uzmanı",         description: "Tüm Kimya konularını bitirdin",           icon: "book",         unlocked: false },
  { id: "biology_specialist", title: "Biyoloji Uzmanı",      description: "Tüm Biyoloji konularını bitirdin",        icon: "book",         unlocked: false },
  { id: "literature_master",  title: "Edebiyat Ustası",      description: "Tüm Edebiyat konularını bitirdin",        icon: "book",         unlocked: false },
  { id: "history_scholar",    title: "Tarih Alimi",          description: "Tüm Tarih konularını bitirdin",           icon: "book",         unlocked: false },
  { id: "geography_master",   title: "Coğrafya Ustası",      description: "Tüm Coğrafya konularını bitirdin",        icon: "book",         unlocked: false },
  { id: "philosophy_thinker", title: "Felsefe Düşünürü",     description: "Tüm Felsefe konularını bitirdin",         icon: "book",         unlocked: false },
  { id: "religion_expert",    title: "Din Kültürü Uzmanı",   description: "Tüm Din Kültürü konularını bitirdin",     icon: "book",         unlocked: false },
  // Progress & habits
  { id: "halfway",            title: "Yarıyolda",            description: "Genel ilerlemenin %50'sine ulaştın",      icon: "target",       unlocked: false },
  { id: "almost_ready",       title: "Neredeyse Hazır",      description: "Genel ilerlemenin %80'ine ulaştın",       icon: "award",        unlocked: false },
  { id: "goal_chaser",        title: "Hedef Takipçisi",      description: "5 çalışma oturumu planladın",             icon: "calendar",     unlocked: false },
  { id: "discipline_master",  title: "Disiplin Ustası",      description: "30 oturumu tamamladın",                   icon: "award",        unlocked: false },
  { id: "plan_master",        title: "Plan Ustası",          description: "50 çalışma oturumu planladın",            icon: "calendar",     unlocked: false },
  { id: "konutakip_champion", title: "KonuTakip Şampiyonu",  description: "30 başarı kazandın. Efsanesin!",          icon: "crown",        unlocked: false },
];

interface AppContextValue {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  topicCompletion: Record<string, boolean>;
  toggleTopic: (topicId: string) => void;
  sessions: DailySession[];
  addSession: (s: Omit<DailySession, "id">) => void;
  updateSession: (id: string, updates: Partial<Pick<DailySession, "date" | "time" | "topic" | "notes" | "targetQuestions">>) => void;
  /** Marks the session complete and, unless already counted, adds its targetQuestions
   *  into dailySolvedQuestions. Returns the number of questions just auto-added (0 if
   *  the session was already counted, so callers can decide whether to show feedback). */
  completeSession: (id: string) => number;
  deleteSession: (id: string) => void;
  questions: Question[];
  addQuestion: (q: Omit<Question, "id" | "addedDate" | "understood" | "nextReviewDate">) => void;
  updateQuestion: (id: string, updates: Partial<Pick<Question, "notes" | "attachments">>) => void;
  updateQuestionReminder: (id: string, interval: 3 | 5 | 7) => void;
  updateQuestionNextReviewDate: (id: string, nextDate: string) => void;
  deleteQuestion: (id: string) => void;
  markQuestionUnderstood: (id: string) => void;
  mockExamResults: MockExamResult[];
  addMockExamResult: (r: Omit<MockExamResult, "id">) => void;
  deleteMockExamResult: (id: string) => void;
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
  topicSolvedQuestions: Record<string, number>;
  setTopicSolvedQuestion: (topicId: string, count: number) => void;
  totalSolvedQuestions: number;
  // ── Automatic Daily Study Plan question counter ─────────────────────────────
  // Fully independent from topicSolvedQuestions above: only ever written to by
  // completeSession/updateSession/deleteSession, never by manual topic entry.
  dailySolvedQuestions: number;
  totalQuestionsSolved: number; // topic + daily plan combined
  /** True if there is a completed & counted session today for this subjectId —
   *  used to surface the informational double-count warning on manual topic entry. */
  hasCompletedSessionTodayForSubject: (subjectId: string) => boolean;
  topicReminders: Record<string, TopicReminderRecord>;
  setTopicReminder: (topicId: string, topicName: string, subjectName: string, interval: 3 | 5 | 7) => Promise<void>;
  removeTopicReminder: (topicId: string) => Promise<void>;
  dailyReminder: DailyReminderSetting | null;
  setDailyReminder: (hour: number, minute: number) => Promise<void>;
  removeDailyReminder: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "konutakip_v3";

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getNextReviewDate(from: Date, intervalDays: number = 7): string {
  const d = new Date(from);
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().split("T")[0];
}

function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  const current = new Date(today);
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

function mergeAchievements(saved: Achievement[], template: Achievement[]): Achievement[] {
  const savedMap: Record<string, Achievement> = {};
  for (const a of saved) savedMap[a.id] = a;
  return template.map((t) => savedMap[t.id] ? { ...t, ...savedMap[t.id] } : t);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [topicCompletion, setTopicCompletion] = useState<Record<string, boolean>>({});
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mockExamResults, setMockExamResults] = useState<MockExamResult[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS_TEMPLATE);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [topicSolvedQuestions, setTopicSolvedQuestionsState] = useState<Record<string, number>>({});
  // Independent running total of questions auto-counted from completed Daily
  // Study Plan sessions. Never read or written by the Topic Question Tracking
  // system (topicSolvedQuestions) above.
  const [dailySolvedQuestions, setDailySolvedQuestions] = useState<number>(0);
  const [topicReminders, setTopicRemindersState] = useState<Record<string, TopicReminderRecord>>({});
  const [dailyReminder, setDailyReminderState] = useState<DailyReminderSetting | null>(null);
  // Guard against double-counting if completeSession is called twice for the
  // same id before the first setSessions updater has had a chance to run and
  // re-render (e.g. rapid double-tap). A Set of in-flight session ids is stored
  // in a ref so it is shared across renders without causing re-renders itself.
  const completingSessionIds = useRef(new Set<string>());

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);

      if (!raw) {
        // Migrate from v2 if present
        const oldRaw = await AsyncStorage.getItem("konutakip_v2");
        if (oldRaw) {
          const old = JSON.parse(oldRaw);
          if (old.profile) setProfileState(old.profile);
          if (old.topicCompletion) setTopicCompletion(old.topicCompletion);
          if (old.sessions) setSessions(
            (old.sessions as DailySession[]).map(s => ({ ...s, repeatType: s.repeatType ?? "one_time" }))
          );
          if (old.questions) setQuestions((old.questions as Question[]).map(q => ({
            ...q, attachments: q.attachments ?? [], reminderInterval: q.reminderInterval ?? 7,
          })));
          if (old.achievements) setAchievements(mergeAchievements(old.achievements, ACHIEVEMENTS_TEMPLATE));
          if (old.studyDays) setStudyDays(old.studyDays);
        }
      } else {
        const data = JSON.parse(raw);
        if (data.profile) setProfileState(data.profile);
        if (data.topicCompletion) setTopicCompletion(data.topicCompletion);
        if (data.sessions) setSessions(
          (data.sessions as DailySession[]).map(s => ({ ...s, repeatType: s.repeatType ?? "one_time" }))
        );
        if (data.questions) setQuestions((data.questions as Question[]).map(q => ({
          ...q, attachments: q.attachments ?? [], reminderInterval: q.reminderInterval ?? 7,
        })));
        if (data.mockExamResults) setMockExamResults((data.mockExamResults as MockExamResult[]).map(r => ({
          ...r, name: r.name ?? "",
        })));
        if (data.achievements) setAchievements(mergeAchievements(data.achievements, ACHIEVEMENTS_TEMPLATE));
        if (data.studyDays) setStudyDays(data.studyDays);
        if (data.topicSolvedQuestions) setTopicSolvedQuestionsState(data.topicSolvedQuestions);
        if (typeof data.dailySolvedQuestions === "number") setDailySolvedQuestions(data.dailySolvedQuestions);
        if (data.topicReminders) setTopicRemindersState(data.topicReminders);
        if (data.dailyReminder) setDailyReminderState(data.dailyReminder);

        // ── App-start sync: validate & restore notifications ────────────────
        // Run asynchronously so it never blocks the UI from appearing.
        const loadedSessions: DailySession[] = (data.sessions ?? []).map((s: DailySession) => ({
          ...s, repeatType: s.repeatType ?? "one_time",
        }));
        const loadedQuestions: Question[] = (data.questions ?? []).map((q: Question) => ({
          ...q, attachments: q.attachments ?? [], reminderInterval: q.reminderInterval ?? 7,
        }));
        const loadedTopicReminders: Record<string, TopicReminderRecord> = data.topicReminders ?? {};
        const loadedDailyReminder: DailyReminderSetting | null = data.dailyReminder ?? null;

        syncNotifications({
          topicReminders: loadedTopicReminders,
          questions: loadedQuestions,
          sessions: loadedSessions,
          dailyReminder: loadedDailyReminder,
        }).catch(() => {});
      }
    } catch { /* ignore */ } finally {
      setIsLoaded(true);
    }
  }

  async function saveData(updates: Partial<{
    profile: UserProfile | null;
    topicCompletion: Record<string, boolean>;
    sessions: DailySession[];
    questions: Question[];
    mockExamResults: MockExamResult[];
    achievements: Achievement[];
    studyDays: string[];
    topicSolvedQuestions: Record<string, number>;
    dailySolvedQuestions: number;
    topicReminders: Record<string, TopicReminderRecord>;
    dailyReminder: DailyReminderSetting | null;
  }>) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch { /* ignore */ }
  }

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    saveData({ profile: p });
  }, []);

  const tytProgress = useMemo(() => {
    const all = TYT_SUBJECTS.flatMap(s => s.topics);
    if (!all.length) return 0;
    return Math.round((all.filter(t => topicCompletion[t.id]).length / all.length) * 100);
  }, [topicCompletion]);

  const aytProgress = useMemo(() => {
    if (!profile) return 0;
    const all = (AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? []).flatMap(s => s.topics);
    if (!all.length) return 0;
    return Math.round((all.filter(t => topicCompletion[t.id]).length / all.length) * 100);
  }, [topicCompletion, profile]);

  const totalTopicsCompleted = useMemo(
    () => Object.values(topicCompletion).filter(Boolean).length,
    [topicCompletion]
  );

  const studyStreak = useMemo(() => computeStreak(studyDays), [studyDays]);

  const totalSolvedQuestions = useMemo(
    () => Object.values(topicSolvedQuestions).reduce((sum, n) => sum + (n || 0), 0),
    [topicSolvedQuestions]
  );

  const totalQuestionsSolved = useMemo(
    () => totalSolvedQuestions + dailySolvedQuestions,
    [totalSolvedQuestions, dailySolvedQuestions]
  );

  const hasCompletedSessionTodayForSubject = useCallback((subjectId: string): boolean => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.some(s =>
      s.subjectId === subjectId && s.completed && s.countedInStatistics && s.date === today
    );
  }, [sessions]);

  function checkAchievements(
    comp: Record<string, boolean>,
    sess: DailySession[],
    qs: Question[],
    exams: MockExamResult[],
    prevA: Achievement[],
    field?: StudyField,
    streak?: number
  ): { updated: Achievement[]; triggered: Achievement | null } {
    const total = Object.values(comp).filter(Boolean).length;
    const tytTopics = TYT_SUBJECTS.flatMap(s => s.topics);
    const tytDone = tytTopics.filter(t => comp[t.id]).length;
    const tytPct = tytTopics.length ? (tytDone / tytTopics.length) * 100 : 0;

    let aytTopics: typeof tytTopics = [];
    let aytDone = 0;
    let aytPct = 0;
    if (field) {
      aytTopics = (AYT_SUBJECTS_BY_FIELD[field] ?? []).flatMap(s => s.topics);
      aytDone = aytTopics.filter(t => comp[t.id]).length;
      aytPct = aytTopics.length ? (aytDone / aytTopics.length) * 100 : 0;
    }

    const allTopics = [...tytTopics, ...aytTopics];
    const allDone = allTopics.filter(t => comp[t.id]).length;
    const overallPct = allTopics.length ? (allDone / allTopics.length) * 100 : 0;

    const understoodQs = qs.filter(q => q.understood).length;
    const completedSess = sess.filter(s => s.completed).length;

    function tytSubDone(idx: number): boolean {
      const sub = TYT_SUBJECTS[idx];
      return sub ? sub.topics.every(t => comp[t.id]) : false;
    }

    function aytSubDone(keyword: string): boolean {
      if (!field) return false;
      const subs = AYT_SUBJECTS_BY_FIELD[field] ?? [];
      const sub = subs.find(s =>
        s.name.toLowerCase().includes(keyword.toLowerCase()) ||
        s.id.toLowerCase().includes(keyword.toLowerCase())
      );
      return sub ? sub.topics.every(t => comp[t.id]) : false;
    }

    const conditions: Record<string, boolean> = {
      first_topic:        total >= 1,
      topics_10:          total >= 10,
      topics_25:          total >= 25,
      topics_50:          total >= 50,
      topics_100:         total >= 100,
      all_topics:         allTopics.length > 0 && allDone === allTopics.length,
      tyt_50:             tytPct >= 50,
      tyt_100:            tytPct >= 100,
      ayt_50:             aytPct >= 50,
      ayt_100:            aytPct >= 100,
      first_question:     qs.length >= 1,
      questions_10:       qs.length >= 10,
      questions_25:       qs.length >= 25,
      reviews_25:         understoodQs >= 25,
      reviews_100:        understoodQs >= 100,
      question_master:    understoodQs >= 200,
      first_exam:         exams.length >= 1,
      exams_10:           exams.length >= 10,
      exams_25:           exams.length >= 25,
      exams_50:           exams.length >= 50,
      exams_100:          exams.length >= 100,
      streak_3:           (streak ?? 0) >= 3,
      streak_7:           (streak ?? 0) >= 7,
      streak_15:          (streak ?? 0) >= 15,
      streak_30:          (streak ?? 0) >= 30,
      streak_60:          (streak ?? 0) >= 60,
      streak_100:         (streak ?? 0) >= 100,
      turkish_champion:   tytSubDone(0),
      math_master:        tytSubDone(1),
      science_expert:     tytSubDone(2),
      social_scholar:     tytSubDone(3),
      physics_explorer:   aytSubDone("fizik"),
      chemistry_expert:   aytSubDone("kimya"),
      biology_specialist: aytSubDone("biyoloji"),
      literature_master:  aytSubDone("edebiyat"),
      history_scholar:    aytSubDone("tarih"),
      geography_master:   aytSubDone("coğrafya"),
      philosophy_thinker: aytSubDone("felsefe"),
      religion_expert:    aytSubDone("din"),
      halfway:            overallPct >= 50,
      almost_ready:       overallPct >= 80,
      goal_chaser:        sess.length >= 5,
      discipline_master:  completedSess >= 30,
      plan_master:        sess.length >= 50,
      konutakip_champion: prevA.filter(a => a.unlocked).length >= 30,
    };

    let triggered: Achievement | null = null;
    const updated = prevA.map(a => {
      if (!a.unlocked && conditions[a.id]) {
        const unlocked: Achievement = { ...a, unlocked: true, unlockedDate: new Date().toISOString() };
        if (!triggered) triggered = unlocked;
        return unlocked;
      }
      return a;
    });
    return { updated, triggered };
  }

  const markStudyDay = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setStudyDays(prev => {
      if (prev.includes(today)) return prev;
      const next = [...prev, today];
      const streak = computeStreak(next);
      saveData({ studyDays: next });
      setAchievements(prevA => {
        setSessions(sessSnap => {
          setQuestions(qSnap => {
            setMockExamResults(examSnap => {
              setProfileState(pSnap => {
                const { updated, triggered } = checkAchievements(
                  topicCompletion, sessSnap, qSnap, examSnap, prevA, pSnap?.studyField, streak
                );
                if (triggered) {
                  setNewAchievement(triggered);
                  saveData({ achievements: updated });
                  setAchievements(updated);
                }
                return pSnap;
              });
              return examSnap;
            });
            return qSnap;
          });
          return sessSnap;
        });
        return prevA;
      });
      return next;
    });
  }, [topicCompletion]);

  const setTopicSolvedQuestion = useCallback((topicId: string, count: number) => {
    setTopicSolvedQuestionsState(prev => {
      const next = { ...prev, [topicId]: count };
      saveData({ topicSolvedQuestions: next });
      return next;
    });
  }, []);

  // ── Topic reminders ──────────────────────────────────────────────────────────

  const setTopicReminderCtx = useCallback(async (
    topicId: string, topicName: string, subjectName: string, interval: 3 | 5 | 7
  ) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    const nextDateStr = nextDate.toISOString().split("T")[0];

    const success = await scheduleTopicReminder(topicId, topicName, subjectName, interval);
    if (!success) {
      throw new Error("Bildirim izni reddedildi veya hatırlatma ayarlanamadı.");
    }

    setTopicRemindersState(prev => {
      const next = {
        ...prev,
        [topicId]: { interval, nextDate: nextDateStr, topicName, subjectName },
      };
      saveData({ topicReminders: next });
      return next;
    });
  }, []);

  const removeTopicReminderCtx = useCallback(async (topicId: string) => {
    await cancelTopicReminder(topicId);
    setTopicRemindersState(prev => {
      const next = { ...prev };
      delete next[topicId];
      saveData({ topicReminders: next });
      return next;
    });
  }, []);

  // ── toggleTopic ──────────────────────────────────────────────────────────────

  const toggleTopic = useCallback((topicId: string) => {
    setTopicCompletion(prev => {
      const wasCompleted = !!prev[topicId];
      const next = { ...prev, [topicId]: !prev[topicId] };
      saveData({ topicCompletion: next });
      // Auto-cancel reminder when topic is marked complete
      if (!wasCompleted) {
        cancelTopicReminder(topicId).catch(() => {});
        setTopicRemindersState(prevR => {
          if (!prevR[topicId]) return prevR;
          const nextR = { ...prevR };
          delete nextR[topicId];
          saveData({ topicReminders: nextR });
          return nextR;
        });
      }
      setSessions(sessSnap => {
        setQuestions(qSnap => {
          setMockExamResults(examSnap => {
            setAchievements(prevA => {
              setProfileState(pSnap => {
                const streak = computeStreak(studyDays);
                const { updated, triggered } = checkAchievements(
                  next, sessSnap, qSnap, examSnap, prevA, pSnap?.studyField, streak
                );
                if (triggered) { setNewAchievement(triggered); saveData({ achievements: updated }); setAchievements(updated); }
                return pSnap;
              });
              return prevA;
            });
            return examSnap;
          });
          return qSnap;
        });
        return sessSnap;
      });
      return next;
    });
    markStudyDay();
  }, [studyDays, markStudyDay]);

  // ── Session management ────────────────────────────────────────────────────────

  const addSession = useCallback((s: Omit<DailySession, "id">) => {
    const session: DailySession = { ...s, id: generateId(), countedInStatistics: false };

    // Schedule notification(s) based on repeat type
    if (session.repeatType === "every_day") {
      scheduleEveryDaySessionReminder(
        session.id, session.time, session.subjectName, session.topic
      ).catch(() => {});
    } else if (session.repeatType === "every_week") {
      for (const wd of session.weekdays ?? []) {
        scheduleWeeklySessionReminder(
          session.id, wd, session.time, session.subjectName, session.topic
        ).catch(() => {});
      }
    } else {
      scheduleSessionReminder(
        session.id, session.date, session.time, session.subjectName, session.topic
      ).catch(() => {});
    }

    setSessions(prev => {
      const next = [...prev, session];
      saveData({ sessions: next });
      setAchievements(prevA => {
        setQuestions(qSnap => {
          setMockExamResults(examSnap => {
            setProfileState(pSnap => {
              const streak = computeStreak(studyDays);
              const { updated, triggered } = checkAchievements(
                topicCompletion, next, qSnap, examSnap, prevA, pSnap?.studyField, streak
              );
              if (triggered) { setNewAchievement(triggered); saveData({ achievements: updated }); setAchievements(updated); }
              return pSnap;
            });
            return examSnap;
          });
          return qSnap;
        });
        return prevA;
      });
      return next;
    });
  }, [topicCompletion, studyDays]);

  const updateSession = useCallback((
    id: string,
    updates: Partial<Pick<DailySession,
      "date" | "time" | "topic" | "notes" | "targetQuestions" | "repeatType" | "weekdays">>
  ) => {
    // If this session's targetQuestions changed and it was already counted into
    // dailySolvedQuestions, adjust the running total by the delta (old amount
    // removed, new amount added) so the auto-counter stays in sync with the edit.
    if (updates.targetQuestions !== undefined) {
      const existing = sessions.find(s => s.id === id);
      if (existing && existing.countedInStatistics && existing.targetQuestions !== updates.targetQuestions) {
        const delta = updates.targetQuestions - existing.targetQuestions;
        setDailySolvedQuestions(prevTotal => {
          const next = Math.max(0, prevTotal + delta);
          saveData({ dailySolvedQuestions: next });
          return next;
        });
      }
    }
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        // Reschedule whenever a notification-relevant field changes
        const notifChanged =
          updates.date !== undefined ||
          updates.time !== undefined ||
          updates.topic !== undefined ||
          updates.repeatType !== undefined ||
          updates.weekdays !== undefined;
        if (notifChanged) {
          // Cancel all variants first, then schedule new ones in sequence
          cancelAllSessionReminders(id)
            .then(() => {
              if (updated.repeatType === "every_day") {
                scheduleEveryDaySessionReminder(
                  updated.id, updated.time, updated.subjectName, updated.topic
                ).catch(() => {});
              } else if (updated.repeatType === "every_week") {
                for (const wd of updated.weekdays ?? []) {
                  scheduleWeeklySessionReminder(
                    updated.id, wd, updated.time, updated.subjectName, updated.topic
                  ).catch(() => {});
                }
              } else if (!updated.completed) {
                scheduleSessionReminder(
                  updated.id, updated.date, updated.time, updated.subjectName, updated.topic
                ).catch(() => {});
              }
            })
            .catch(() => {});
        }
        return updated;
      });
      saveData({ sessions: next });
      return next;
    });
  }, [sessions]);

  const completeSession = useCallback((id: string): number => {
    // Only one-time sessions can be marked complete.
    // Guard: if already in-flight (e.g. rapid double-tap before re-render), skip.
    if (completingSessionIds.current.has(id)) return 0;
    // Compute addedAmount synchronously from current sessions state BEFORE
    // calling setSessions. The setState updater runs asynchronously, so any
    // mutation inside it (e.g. addedAmount = s.targetQuestions) would not be
    // visible to code that runs after the setSessions call in the same tick.
    const target = sessions.find(s => s.id === id);
    const addedAmount =
      target && !(target.completed && target.countedInStatistics)
        ? target.targetQuestions
        : 0;
    if (addedAmount > 0) completingSessionIds.current.add(id);
    cancelAllSessionReminders(id).catch(() => {});
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== id) return s;
        if (s.completed && s.countedInStatistics) return s; // already counted — guard against double-add
        return { ...s, completed: true, countedInStatistics: true };
      });
      saveData({ sessions: next });
      completingSessionIds.current.delete(id);
      return next;
    });
    if (addedAmount > 0) {
      setDailySolvedQuestions(prevTotal => {
        const next = prevTotal + addedAmount;
        saveData({ dailySolvedQuestions: next });
        return next;
      });
    }
    markStudyDay();
    return addedAmount;
  }, [markStudyDay, sessions]);

  const deleteSession = useCallback((id: string) => {
    // Cancel all notification variants (one-time, daily, weekly) for this session
    cancelAllSessionReminders(id).catch(() => {});
    const target = sessions.find(s => s.id === id);
    if (target && target.completed && target.countedInStatistics) {
      setDailySolvedQuestions(prevTotal => {
        const next = Math.max(0, prevTotal - target.targetQuestions);
        saveData({ dailySolvedQuestions: next });
        return next;
      });
    }
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveData({ sessions: next });
      return next;
    });
  }, [sessions]);

  // ── Question management ───────────────────────────────────────────────────────

  const addQuestion = useCallback((q: Omit<Question, "id" | "addedDate" | "understood" | "nextReviewDate">) => {
    const interval = q.reminderInterval ?? 7;
    const nextReviewDate = getNextReviewDate(new Date(), interval);
    const question: Question = {
      ...q,
      id: generateId(),
      addedDate: new Date().toISOString().split("T")[0],
      understood: false,
      nextReviewDate,
      reminderInterval: interval,
    };
    scheduleQuestionReminder(question.id, nextReviewDate, q.subjectName, interval).catch(() => {});
    setQuestions(prev => {
      const next = [...prev, question];
      saveData({ questions: next });
      setAchievements(prevA => {
        setMockExamResults(examSnap => {
          setProfileState(pSnap => {
            const streak = computeStreak(studyDays);
            const { updated, triggered } = checkAchievements(
              topicCompletion, sessions, next, examSnap, prevA, pSnap?.studyField, streak
            );
            if (triggered) { setNewAchievement(triggered); saveData({ achievements: updated }); setAchievements(updated); }
            return pSnap;
          });
          return examSnap;
        });
        return prevA;
      });
      return next;
    });
  }, [topicCompletion, sessions, studyDays]);

  const updateQuestion = useCallback((id: string, updates: Partial<Pick<Question, "notes" | "attachments">>) => {
    setQuestions(prev => {
      const next = prev.map(q => q.id === id ? { ...q, ...updates } : q);
      saveData({ questions: next });
      return next;
    });
  }, []);

  /**
   * Change the reminder interval for an existing question.
   * Cancels the old scheduled notification, computes a new nextReviewDate from
   * today + interval, schedules the new notification, and persists both changes.
   * No-op if the question is already marked as understood.
   */
  const updateQuestionReminder = useCallback((id: string, interval: 3 | 5 | 7) => {
    setQuestions(prev => {
      const question = prev.find(q => q.id === id);
      if (!question || question.understood) return prev;

      const nextReviewDate = getNextReviewDate(new Date(), interval);
      // safeSchedule inside scheduleQuestionReminder cancels the old notification first
      scheduleQuestionReminder(id, nextReviewDate, question.subjectName, interval).catch(() => {});

      const next = prev.map(q =>
        q.id === id ? { ...q, reminderInterval: interval, nextReviewDate } : q
      );
      saveData({ questions: next });
      return next;
    });
  }, []);

  /**
   * Update the stored nextReviewDate for a question after a reminder fires.
   * Called by the foreground notification received listener in _layout.tsx so
   * syncNotifications stays consistent with what is actually scheduled in the OS.
   * No-op if the question is already marked as understood.
   */
  const updateQuestionNextReviewDate = useCallback((id: string, nextDate: string) => {
    setQuestions(prev => {
      const question = prev.find(q => q.id === id);
      if (!question || question.understood) return prev;
      const next = prev.map(q => q.id === id ? { ...q, nextReviewDate: nextDate } : q);
      saveData({ questions: next });
      return next;
    });
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    cancelQuestionReminder(id).catch(() => {});
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id);
      saveData({ questions: next });
      return next;
    });
  }, []);

  const markQuestionUnderstood = useCallback((id: string) => {
    cancelQuestionReminder(id).catch(() => {});
    setQuestions(prev => {
      const next = prev.map(q => q.id === id ? { ...q, understood: true } : q);
      saveData({ questions: next });
      setAchievements(prevA => {
        setMockExamResults(examSnap => {
          setProfileState(pSnap => {
            const streak = computeStreak(studyDays);
            const { updated, triggered } = checkAchievements(
              topicCompletion, sessions, next, examSnap, prevA, pSnap?.studyField, streak
            );
            if (triggered) { setNewAchievement(triggered); saveData({ achievements: updated }); setAchievements(updated); }
            return pSnap;
          });
          return examSnap;
        });
        return prevA;
      });
      return next;
    });
  }, [topicCompletion, sessions, studyDays]);

  // ── Mock exam results ─────────────────────────────────────────────────────────

  const addMockExamResult = useCallback((r: Omit<MockExamResult, "id">) => {
    const result: MockExamResult = { ...r, id: generateId() };
    setMockExamResults(prev => {
      const next = [...prev, result];
      saveData({ mockExamResults: next });
      setAchievements(prevA => {
        setProfileState(pSnap => {
          const streak = computeStreak(studyDays);
          const { updated, triggered } = checkAchievements(
            topicCompletion, sessions, questions, next, prevA, pSnap?.studyField, streak
          );
          if (triggered) { setNewAchievement(triggered); saveData({ achievements: updated }); setAchievements(updated); }
          return pSnap;
        });
        return prevA;
      });
      return next;
    });
  }, [topicCompletion, sessions, questions, studyDays]);

  const deleteMockExamResult = useCallback((id: string) => {
    setMockExamResults(prev => {
      const next = prev.filter(r => r.id !== id);
      saveData({ mockExamResults: next });
      return next;
    });
  }, []);

  // ── Daily reminder ────────────────────────────────────────────────────────────

  const setDailyReminderCtx = useCallback(async (hour: number, minute: number) => {
    const setting: DailyReminderSetting = { hour, minute, enabled: true };
    const success = await scheduleDailyStudyReminder(hour, minute);
    if (!success) {
      throw new Error("Bildirim izni reddedildi veya hatırlatma ayarlanamadı.");
    }
    setDailyReminderState(setting);
    saveData({ dailyReminder: setting });
  }, []);

  const removeDailyReminderCtx = useCallback(async () => {
    await cancelDailyStudyReminder();
    const setting: DailyReminderSetting | null = null;
    setDailyReminderState(setting);
    saveData({ dailyReminder: setting });
  }, []);

  const clearNewAchievement = useCallback(() => setNewAchievement(null), []);

  // ─────────────────────────────────────────────────────────────────────────────

  const value = useMemo<AppContextValue>(() => ({
    profile, setProfile,
    topicCompletion, toggleTopic,
    sessions, addSession, updateSession, completeSession, deleteSession,
    questions, addQuestion, updateQuestion, updateQuestionReminder, updateQuestionNextReviewDate, deleteQuestion, markQuestionUnderstood,
    mockExamResults, addMockExamResult, deleteMockExamResult,
    achievements, newAchievement, clearNewAchievement,
    tytProgress, aytProgress, totalTopicsCompleted,
    studyStreak, studyDays, markStudyDay, isLoaded,
    topicSolvedQuestions, setTopicSolvedQuestion, totalSolvedQuestions,
    dailySolvedQuestions, totalQuestionsSolved, hasCompletedSessionTodayForSubject,
    topicReminders,
    setTopicReminder: setTopicReminderCtx,
    removeTopicReminder: removeTopicReminderCtx,
    dailyReminder,
    setDailyReminder: setDailyReminderCtx,
    removeDailyReminder: removeDailyReminderCtx,
  }), [
    profile, setProfile,
    topicCompletion, toggleTopic,
    sessions, addSession, updateSession, completeSession, deleteSession,
    questions, addQuestion, updateQuestion, updateQuestionReminder, updateQuestionNextReviewDate, deleteQuestion, markQuestionUnderstood,
    mockExamResults, addMockExamResult, deleteMockExamResult,
    achievements, newAchievement, clearNewAchievement,
    tytProgress, aytProgress, totalTopicsCompleted,
    studyStreak, studyDays, markStudyDay, isLoaded,
    topicSolvedQuestions, setTopicSolvedQuestion, totalSolvedQuestions,
    dailySolvedQuestions, totalQuestionsSolved, hasCompletedSessionTodayForSubject,
    topicReminders, setTopicReminderCtx, removeTopicReminderCtx,
    dailyReminder, setDailyReminderCtx, removeDailyReminderCtx,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
