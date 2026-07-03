import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  Channel,
  DEFAULT_DAILY_HOUR,
  DEFAULT_DAILY_MINUTE,
  NotificationId,
  NotificationType,
  type ReminderInterval,
} from "./constants";
import { safeCancel, safeSchedule } from "./core";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function androidChannel(channelId: string): Record<string, string> {
  return Platform.OS === "android" ? { channelId } : {};
}

/**
 * Build a future Date at 09:00 that is `days` days from now.
 * If the computed time is already in the past (e.g. called very late in the day
 * and days=0), bumps to the next valid slot.
 */
function futureDate(days: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  if (d <= new Date()) {
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
  }
  return d;
}

// ─── Topic reminders ──────────────────────────────────────────────────────────

const TOPIC_BODIES = [
  (name: string) => `📚 "${name}" konusunu tekrar etme zamanı. Bilgilerini taze tut!`,
  (name: string) => `📖 "${name}" konusuna bir göz at. Tekrar etmek başarının anahtarı!`,
  (name: string) => `🎯 İlerlemenizi kaybetme! Bugün "${name}" konusunu tekrar et.`,
];

/**
 * Schedule a one-time topic reminder `intervalDays` days from now at 09:00.
 * Cancels any existing reminder for the same topic first.
 * Returns true on success.
 */
export async function scheduleTopicReminder(
  topicId: string,
  topicName: string,
  subjectName: string,
  intervalDays: ReminderInterval
): Promise<boolean> {
  const identifier = NotificationId.topic(topicId);
  const triggerDate = futureDate(intervalDays);
  const body = TOPIC_BODIES[Math.floor(Math.random() * TOPIC_BODIES.length)](topicName);

  return safeSchedule(
    identifier,
    {
      title: `${subjectName} Hatırlatması 📚`,
      body,
      sound: "default",
      data: { type: NotificationType.TOPIC_REMINDER, topicId, subjectName },
      ...androidChannel(Channel.TOPIC),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    }
  );
}

/**
 * Reschedule a topic reminder using a pre-computed target date string (YYYY-MM-DD).
 * Used by the app-start sync to restore a reminder that was lost.
 * Returns true on success.
 */
export async function rescheduleTopicReminder(
  topicId: string,
  topicName: string,
  subjectName: string,
  nextDateStr: string
): Promise<boolean> {
  const triggerDate = new Date(`${nextDateStr}T09:00:00`);
  if (triggerDate <= new Date()) return false; // Already passed — do not restore

  const identifier = NotificationId.topic(topicId);
  const body = TOPIC_BODIES[0](topicName);

  return safeSchedule(
    identifier,
    {
      title: `${subjectName} Hatırlatması 📚`,
      body,
      sound: "default",
      data: { type: NotificationType.TOPIC_REMINDER, topicId, subjectName },
      ...androidChannel(Channel.TOPIC),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    }
  );
}

export async function cancelTopicReminder(topicId: string): Promise<void> {
  await safeCancel(NotificationId.topic(topicId));
}

// ─── Question reminders ───────────────────────────────────────────────────────

/**
 * Schedule a one-time question reminder at 09:00 on `nextReviewDateStr`.
 * If the date is today or in the past, schedules for the next calendar day.
 * Cancels any existing reminder for the same question first.
 */
export async function scheduleQuestionReminder(
  questionId: string,
  nextReviewDateStr: string,
  subjectName: string
): Promise<boolean> {
  const identifier = NotificationId.question(questionId);

  const triggerDate = new Date(`${nextReviewDateStr}T09:00:00`);
  if (triggerDate <= new Date()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
    triggerDate.setHours(9, 0, 0, 0);
  }

  return safeSchedule(
    identifier,
    {
      title: "Tekrar Zamanı! 📚",
      body: `${subjectName} dersinden bir soruyu tekrar etme zamanı geldi.`,
      sound: "default",
      data: { type: NotificationType.QUESTION_REMINDER, questionId, subjectName },
      ...androidChannel(Channel.QUESTION),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    }
  );
}

export async function cancelQuestionReminder(questionId: string): Promise<void> {
  await safeCancel(NotificationId.question(questionId));
}

// ─── Daily study reminder ─────────────────────────────────────────────────────

/**
 * Schedule (or replace) the daily repeating study reminder.
 * Uses a DAILY trigger so it fires every day at the given hour:minute.
 * There is exactly one daily reminder — identified by a fixed key.
 */
export async function scheduleDailyStudyReminder(
  hour: number = DEFAULT_DAILY_HOUR,
  minute: number = DEFAULT_DAILY_MINUTE
): Promise<boolean> {
  return safeSchedule(
    NotificationId.daily(),
    {
      title: "Çalışma Vakti! 🎯",
      body: "Bugünkü hedeflerini tamamlamak için harika bir zaman.",
      sound: "default",
      data: { type: NotificationType.DAILY_REMINDER },
      ...androidChannel(Channel.DAILY),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    }
  );
}

export async function cancelDailyStudyReminder(): Promise<void> {
  await safeCancel(NotificationId.daily());
}

// ─── Session (lesson) reminders ───────────────────────────────────────────────

/**
 * Schedule a one-time session reminder at the session's start time.
 * Cancels any existing reminder for the same session first.
 * Sessions in the past are silently skipped (returns false).
 */
export async function scheduleSessionReminder(
  sessionId: string,
  date: string,
  time: string,
  subjectName: string,
  topic: string
): Promise<boolean> {
  const identifier = NotificationId.session(sessionId);

  const [hour, minute] = time.split(":").map(Number);
  const triggerDate = new Date(`${date}T${time}:00`);

  if (isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
    return false; // Past or invalid — skip
  }

  return safeSchedule(
    identifier,
    {
      title: `Çalışma Zamanı: ${subjectName} 📖`,
      body: `"${topic}" konusunu çalışma vakti geldi.`,
      sound: "default",
      data: { type: NotificationType.SESSION_REMINDER, sessionId, subjectName, topic },
      ...androidChannel(Channel.SESSION),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    }
  );
}

export async function cancelSessionReminder(sessionId: string): Promise<void> {
  await safeCancel(NotificationId.session(sessionId));
}
