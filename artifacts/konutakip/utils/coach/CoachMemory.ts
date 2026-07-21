import {
  CoachAINote,
  CoachMemory,
  DailyCoachEntry,
  PostponedTask,
} from "./CoachTypes";
import {
  loadMemory,
  saveDailyEntry,
  saveMemory,
} from "./CoachStorage";

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return getLocalDateString(date);
}

export function createEmptyDailyEntry(
  date = getLocalDateString()
): DailyCoachEntry {
  const now = new Date().toISOString();

  return {
    id: createId("daily"),
    date,
    studiedMinutes: 0,
    solvedQuestions: 0,
    completedTopics: [],
    skippedTopics: [],
    completedPlan: false,
    motivationLevel: 3,
    mood: "",
    aiNote: "",
    subjectStudyMinutes: {},
    completedSessionKeys: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function getTodayEntry(): Promise<DailyCoachEntry> {
  const memory = await loadMemory();
  const today = getLocalDateString();

  return (
    memory.dailyHistory.find((entry) => entry.date === today) ??
    createEmptyDailyEntry(today)
  );
}

export function getLast7Days(
  memory: CoachMemory
): DailyCoachEntry[] {
  const startDate = getDateDaysAgo(6);

  return memory.dailyHistory
    .filter((entry) => entry.date >= startDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getLast30Days(
  memory: CoachMemory
): DailyCoachEntry[] {
  const startDate = getDateDaysAgo(29);

  return memory.dailyHistory
    .filter((entry) => entry.date >= startDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function addCompletedTopic(
  topic: string,
  subjectName?: string
): Promise<boolean> {
  const trimmedTopic = topic.trim();

  if (!trimmedTopic) {
    return false;
  }

  const entry = await getTodayEntry();

  const completedTopics = entry.completedTopics.includes(trimmedTopic)
    ? entry.completedTopics
    : [...entry.completedTopics, trimmedTopic];

  const subjectStudyMinutes = { ...entry.subjectStudyMinutes };

  if (subjectName && !(subjectName in subjectStudyMinutes)) {
    subjectStudyMinutes[subjectName] = 0;
  }

  return saveDailyEntry({
    ...entry,
    completedTopics,
    subjectStudyMinutes,
    updatedAt: new Date().toISOString(),
  });
}

export async function postponeTask(
  subjectName: string,
  topic: string,
  originalDate: string,
  postponedTo?: string,
  reason?: string
): Promise<boolean> {
  const memory = await loadMemory();

  const task: PostponedTask = {
    id: createId("postponed"),
    subjectName: subjectName.trim(),
    topic: topic.trim(),
    originalDate,
    postponedTo,
    reason: reason?.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };

  return saveMemory({
    ...memory,
    postponedTasks: [...memory.postponedTasks, task],
  });
}

export async function addAINote(
  text: string,
  category: CoachAINote["category"] = "general"
): Promise<boolean> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }

  const memory = await loadMemory();

  const note: CoachAINote = {
    id: createId("note"),
    text: trimmedText,
    category,
    createdAt: new Date().toISOString(),
  };

  return saveMemory({
    ...memory,
    aiNotes: [...memory.aiNotes, note].slice(-100),
  });
}

export function calculateCompletionRate(
  entries: DailyCoachEntry[]
): number {
  if (entries.length === 0) {
    return 0;
  }

  const completedCount = entries.filter(
    (entry) => entry.completedPlan
  ).length;

  return Math.round((completedCount / entries.length) * 100);
}

export function calculateStudyAverage(
  entries: DailyCoachEntry[]
): number {
  if (entries.length === 0) {
    return 0;
  }

  const totalMinutes = entries.reduce(
    (sum, entry) => sum + entry.studiedMinutes,
    0
  );

  return Math.round(totalMinutes / entries.length);
}

function calculateSubjectTotals(
  entries: DailyCoachEntry[]
): Record<string, number> {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    Object.entries(entry.subjectStudyMinutes).forEach(
      ([subject, minutes]) => {
        totals[subject] = (totals[subject] ?? 0) + minutes;
      }
    );

    return totals;
  }, {});
}

export function calculateWeakSubjects(
  entries: DailyCoachEntry[],
  knownSubjects: string[] = []
): string[] {
  const totals = calculateSubjectTotals(entries);
  const allSubjects = Array.from(
    new Set([...knownSubjects, ...Object.keys(totals)])
  );

  if (allSubjects.length === 0) {
    return [];
  }

  return allSubjects
    .sort((a, b) => (totals[a] ?? 0) - (totals[b] ?? 0))
    .slice(0, 3);
}

export function calculateStrongSubjects(
  entries: DailyCoachEntry[],
  knownSubjects: string[] = []
): string[] {
  const totals = calculateSubjectTotals(entries);
  const allSubjects = Array.from(
    new Set([...knownSubjects, ...Object.keys(totals)])
  );

  if (allSubjects.length === 0) {
    return [];
  }

  return allSubjects
    .sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0))
    .slice(0, 3);
}

export async function updateTodayEntry(
  updates: Partial<
    Omit<DailyCoachEntry, "id" | "date" | "createdAt">
  >
): Promise<boolean> {
  const entry = await getTodayEntry();

  return saveDailyEntry({
    ...entry,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function completePostponedTask(
  taskId: string
): Promise<boolean> {
  const memory = await loadMemory();

  return saveMemory({
    ...memory,
    postponedTasks: memory.postponedTasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed: true,
          }
        : task
    ),
  });
}
export interface CompletedCoachSessionInput {
  sessionId: string;
  date: string;
  subjectName: string;
  topic: string;
  solvedQuestions: number;
  studiedMinutes?: number;
}

/**
 * Records a completed study-plan session in Coach Memory.
 *
 * The sessionId + date pair is used as an idempotency key so the same
 * recurring session cannot be counted twice on the same calendar day.
 */
export async function recordCompletedSession(
  input: CompletedCoachSessionInput
): Promise<boolean> {
  try {
    const sessionKey = `${input.sessionId}:${input.date}`;
    const memory = await loadMemory();

    const existing =
      memory.dailyHistory.find((entry) => entry.date === input.date) ??
      createEmptyDailyEntry(input.date);

    const completedSessionKeys = existing.completedSessionKeys ?? [];

    if (completedSessionKeys.includes(sessionKey)) {
      return true;
    }

    const topic = input.topic.trim();
    const subjectName = input.subjectName.trim();
    const studiedMinutes = Math.max(0, input.studiedMinutes ?? 0);
    const solvedQuestions = Math.max(0, input.solvedQuestions);

    const completedTopics =
      topic && !existing.completedTopics.includes(topic)
        ? [...existing.completedTopics, topic]
        : existing.completedTopics;

    const subjectStudyMinutes = {
      ...existing.subjectStudyMinutes,
    };

    if (subjectName) {
      subjectStudyMinutes[subjectName] =
        (subjectStudyMinutes[subjectName] ?? 0) + studiedMinutes;
    }

    return saveDailyEntry({
      ...existing,
      studiedMinutes: existing.studiedMinutes + studiedMinutes,
      solvedQuestions: existing.solvedQuestions + solvedQuestions,
      completedTopics,
      subjectStudyMinutes,
      completedSessionKeys: [...completedSessionKeys, sessionKey],
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return false;
  }
}

export interface CompletedCoachTopicInput {
  date: string;
  subjectName: string;
  topic: string;
}

export async function recordCompletedTopic(
  input: CompletedCoachTopicInput
): Promise<boolean> {
  try {
    const memory = await loadMemory();

    const existing =
      memory.dailyHistory.find(e => e.date === input.date) ??
      createEmptyDailyEntry(input.date);

    const topic = input.topic.trim();

    if (!topic) return true;

    if (existing.completedTopics.includes(topic)) {
      return true;
    }

    return saveDailyEntry({
      ...existing,
      completedTopics: [...existing.completedTopics, topic],
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return false;
  }
}

export interface CoachExamResultInput {
  examName: string;
  tytNet?: number;
  aytNet?: number;
  createdAt?: string;
}

export async function recordExamResult(
  input: CoachExamResultInput
): Promise<boolean> {
  try {
    return addAINote(`Deneme kaydedildi • ${input.examName} • TYT ${input.tytNet ?? "-"} • AYT ${input.aytNet ?? "-"}`,"achievement");
  } catch {
    return false;
  }
}


