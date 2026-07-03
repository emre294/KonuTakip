// ─── Notification type discriminants ─────────────────────────────────────────

export const NotificationType = {
  TOPIC_REMINDER: "topic_reminder",
  QUESTION_REMINDER: "question_reminder",
  DAILY_REMINDER: "daily_reminder",
  SESSION_REMINDER: "session_reminder",
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

// ─── Android channel IDs ──────────────────────────────────────────────────────

export const Channel = {
  DEFAULT: "konutakip_default",
  TOPIC: "konutakip_topic_reminders",
  QUESTION: "konutakip_question_reminders",
  DAILY: "konutakip_daily",
  SESSION: "konutakip_session_reminders",
} as const;

// ─── Notification identifier helpers ─────────────────────────────────────────
// Format: "<type>::<id>"
// Consistent format makes orphan detection simple.

const SEP = "::";

export const NotificationId = {
  topic: (topicId: string) => `${NotificationType.TOPIC_REMINDER}${SEP}${topicId}`,
  question: (questionId: string) => `${NotificationType.QUESTION_REMINDER}${SEP}${questionId}`,
  daily: () => `${NotificationType.DAILY_REMINDER}${SEP}study`,
  session: (sessionId: string) => `${NotificationType.SESSION_REMINDER}${SEP}${sessionId}`,

  /** Parse a raw identifier back to { type, id }. Returns null if unknown format. */
  parse(identifier: string): { type: NotificationTypeValue; id: string } | null {
    const idx = identifier.indexOf(SEP);
    if (idx === -1) return null;
    const type = identifier.slice(0, idx) as NotificationTypeValue;
    const id = identifier.slice(idx + SEP.length);
    const known: string[] = Object.values(NotificationType);
    if (!known.includes(type)) return null;
    return { type, id };
  },
} as const;

// ─── Navigation routes for each notification type ─────────────────────────────

export const NotificationRoute: Record<NotificationTypeValue, string> = {
  [NotificationType.TOPIC_REMINDER]: "/(tabs)/subjects",
  [NotificationType.QUESTION_REMINDER]: "/(tabs)/questions",
  [NotificationType.DAILY_REMINDER]: "/(tabs)",
  [NotificationType.SESSION_REMINDER]: "/(tabs)/plan",
};

// ─── Allowed reminder intervals ───────────────────────────────────────────────

export type ReminderInterval = 3 | 5 | 7;

// ─── Daily reminder default time ──────────────────────────────────────────────

export const DEFAULT_DAILY_HOUR = 20;
export const DEFAULT_DAILY_MINUTE = 0;
