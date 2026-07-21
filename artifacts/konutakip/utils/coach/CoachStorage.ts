import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AICoachProfile,
  CoachMemory,
  DailyCoachEntry,
  EMPTY_COACH_MEMORY,
} from "./CoachTypes";

const PROFILE_KEY = "konutakip_ai_profile";
const MEMORY_KEY = "konutakip_ai_memory";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJSON<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function sanitizeProfile(value: unknown): AICoachProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const studentType =
    value.studentType === "mezun" || value.studentType === "12"
      ? value.studentType
      : null;

  if (!studentType) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    studentType,
    targetTYT:
      typeof value.targetTYT === "number" ? value.targetTYT : 0,
    targetAYT:
      typeof value.targetAYT === "number" ? value.targetAYT : 0,
    dailyStudyMinutes:
      typeof value.dailyStudyMinutes === "number"
        ? value.dailyStudyMinutes
        : 0,
    examDate:
      typeof value.examDate === "string" ? value.examDate : "",
    studyDays: Array.isArray(value.studyDays)
      ? value.studyDays.filter(
          (day): day is number =>
            typeof day === "number" && day >= 0 && day <= 6
        )
      : [],
    weakSubjects: Array.isArray(value.weakSubjects)
      ? value.weakSubjects.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    strongSubjects: Array.isArray(value.strongSubjects)
      ? value.strongSubjects.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

function sanitizeMemory(value: unknown): CoachMemory {
  if (!isRecord(value)) {
    return { ...EMPTY_COACH_MEMORY };
  }

  return {
    profile: sanitizeProfile(value.profile),
    dailyHistory: Array.isArray(value.dailyHistory)
      ? (value.dailyHistory as DailyCoachEntry[])
      : [],
    lastConversationSummary:
      typeof value.lastConversationSummary === "string"
        ? value.lastConversationSummary
        : "",
    lastStudyPlan: Array.isArray(value.lastStudyPlan)
      ? value.lastStudyPlan
      : [],
    postponedTasks: Array.isArray(value.postponedTasks)
      ? value.postponedTasks
      : [],
    aiNotes: Array.isArray(value.aiNotes) ? value.aiNotes : [],
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

export async function saveProfile(
  profile: AICoachProfile
): Promise<boolean> {
  try {
    const updatedProfile: AICoachProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(updatedProfile)
    );

    const memory = await loadMemory();

    await saveMemory({
      ...memory,
      profile: updatedProfile,
    });

    return true;
  } catch {
    return false;
  }
}

export async function loadProfile(): Promise<AICoachProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return sanitizeProfile(parseJSON<unknown>(raw, null));
  } catch {
    return null;
  }
}

export async function saveMemory(
  memory: CoachMemory
): Promise<boolean> {
  try {
    const updatedMemory: CoachMemory = {
      ...memory,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(updatedMemory)
    );

    return true;
  } catch {
    return false;
  }
}

export async function loadMemory(): Promise<CoachMemory> {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);

    if (!raw) {
      const profile = await loadProfile();

      return {
        ...EMPTY_COACH_MEMORY,
        profile,
        updatedAt: new Date().toISOString(),
      };
    }

    const memory = sanitizeMemory(parseJSON<unknown>(raw, null));

    if (!memory.profile) {
      memory.profile = await loadProfile();
    }

    return memory;
  } catch {
    return {
      ...EMPTY_COACH_MEMORY,
      profile: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function saveDailyEntry(
  entry: DailyCoachEntry
): Promise<boolean> {
  try {
    const memory = await loadMemory();

    const existingIndex = memory.dailyHistory.findIndex(
      (item) => item.date === entry.date
    );

    const history = [...memory.dailyHistory];

    if (existingIndex >= 0) {
      history[existingIndex] = entry;
    } else {
      history.push(entry);
    }

    history.sort((a, b) => a.date.localeCompare(b.date));

    return saveMemory({
      ...memory,
      dailyHistory: history,
    });
  } catch {
    return false;
  }
}

export async function clearMemory(): Promise<boolean> {
  try {
    await AsyncStorage.multiRemove([PROFILE_KEY, MEMORY_KEY]);
    return true;
  } catch {
    return false;
  }
}

export const CoachStorageKeys = {
  profile: PROFILE_KEY,
  memory: MEMORY_KEY,
} as const;
