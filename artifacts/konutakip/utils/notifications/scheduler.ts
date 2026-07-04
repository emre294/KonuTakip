/**
 * High-level per-type schedule / cancel functions.
 *
 * Every public function follows the same contract:
 * - Calls safeSchedule (which cancels first, then schedules).
 * - Never throws — scheduling failure returns false.
 * - Logs every outcome in development.
 */

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
import { notifLog } from "./logger";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function androidChannel(channelId: string): Record<string, string> {
  return Platform.OS === "android" ? { channelId } : {};
}

/**
 * Build a Date `days` days from now at the specified hour:minute.
 * If the computed time is already in the past (edge case near midnight),
 * bumps forward one more day.
 */
function futureDateFromNow(days: number, hour = 9, minute = 0): Date {
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

const TOPIC_BODIES: ((name: string) => string)[] = [
  (name) => `📚 "${name}" konusunu tekrar etme zamanı. Bilgilerini taze tut!`,
  (name) => `📖 "${name}" konusuna bir göz at. Tekrar etmek başarının anahtarı!`,
  (name) => `🎯 İlerlemenizi kaybetme! Bugün "${name}" konusunu tekrar et.`,
];

/**
 * Schedule a one-time topic reminder `intervalDays` days from now at 09:00.
 * Always replaces any existing reminder for the same topic.
 */
export async function scheduleTopicReminder(
  topicId: string,
  topicName: string,
  subjectName: string,
  intervalDays: ReminderInterval
): Promise<boolean> {
  const identifier = NotificationId.topic(topicId);
  const triggerDate = futureDateFromNow(intervalDays);
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
 * Restore a topic reminder using a previously stored target date string (YYYY-MM-DD).
 * Used exclusively by the app-start sync to rebuild notifications after a reboot.
 * Returns false (and does nothing) if the date has already passed.
 */
export async function rescheduleTopicReminder(
  topicId: string,
  topicName: string,
  subjectName: string,
  nextDateStr: string
): Promise<boolean> {
  const triggerDate = new Date(`${nextDateStr}T09:00:00`);

  if (triggerDate <= new Date()) {
    notifLog.skipped(NotificationId.topic(topicId), "date already passed");
    return false;
  }

  const identifier = NotificationId.topic(topicId);
  const body = TOPIC_BODIES[0](topicName);

  const ok = await safeSchedule(
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

  if (ok) notifLog.restored(identifier, triggerDate);
  return ok;
}

export async function cancelTopicReminder(topicId: string): Promise<void> {
  await safeCancel(NotificationId.topic(topicId));
}

// ─── Question reminders ───────────────────────────────────────────────────────

/**
 * Schedule the next question reminder at 09:00 on `nextReviewDateStr`.
 * If the date is today or in the past, bumps to tomorrow at 09:00.
 * Always replaces any existing reminder for the same question (cancel-first).
 *
 * `reminderInterval` is stored in the notification payload so the foreground
 * delivery listener can immediately schedule the following occurrence without
 * needing to read AsyncStorage.
 */
export async function scheduleQuestionReminder(
  questionId: string,
  nextReviewDateStr: string,
  subjectName: string,
  reminderInterval: ReminderInterval = 7
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
      data: {
        type: NotificationType.QUESTION_REMINDER,
        questionId,
        subjectName,
        reminderInterval,
      },
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
 * Uses a DAILY trigger — fires at `hour:minute` every day indefinitely.
 * There is always exactly one daily reminder, identified by a fixed key.
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

// ─── Session (study plan) reminders ──────────────────────────────────────────

/**
 * Schedule a one-time session reminder at the session's exact start time.
 * Sessions in the past are silently skipped (returns false).
 * Always replaces any existing reminder for the same session ID.
 */
export async function scheduleSessionReminder(
  sessionId: string,
  date: string,
  time: string,
  subjectName: string,
  topic: string
): Promise<boolean> {
  const identifier = NotificationId.session(sessionId);
  const triggerDate = new Date(`${date}T${time}:00`);

  if (isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
    notifLog.skipped(identifier, "session is in the past");
    return false;
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

// ─── Recurring session reminders ──────────────────────────────────────────────

/**
 * Schedule a DAILY repeating session reminder at the given time.
 * Fires every day at `hour:minute` until explicitly cancelled.
 * Identifier: `session_reminder::<id>::daily`
 */
export async function scheduleEveryDaySessionReminder(
  sessionId: string,
  time: string,
  subjectName: string,
  topic: string
): Promise<boolean> {
  const [hour, minute] = time.split(":").map(Number);
  if (isNaN(hour) || isNaN(minute)) {
    notifLog.skipped(NotificationId.sessionDaily(sessionId), "invalid time format");
    return false;
  }
  return safeSchedule(
    NotificationId.sessionDaily(sessionId),
    {
      title: `Çalışma Zamanı: ${subjectName} 📖`,
      body: `"${topic}" konusunu çalışma vakti geldi.`,
      sound: "default",
      data: { type: NotificationType.SESSION_REMINDER, sessionId, subjectName, topic },
      ...androidChannel(Channel.SESSION),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    }
  );
}

/**
 * Schedule a WEEKLY repeating session reminder.
 * Fires every week on `weekday` (JS convention: 0=Sun … 6=Sat) at the given time.
 * Identifier: `session_reminder::<id>::wd<weekday>`
 */
export async function scheduleWeeklySessionReminder(
  sessionId: string,
  weekday: number,
  time: string,
  subjectName: string,
  topic: string
): Promise<boolean> {
  const [hour, minute] = time.split(":").map(Number);
  if (isNaN(hour) || isNaN(minute)) {
    notifLog.skipped(NotificationId.sessionWeekday(sessionId, weekday), "invalid time format");
    return false;
  }
  // Expo WEEKLY weekday convention: 1=Sun, 2=Mon, …, 7=Sat
  const expoWeekday = weekday + 1;
  return safeSchedule(
    NotificationId.sessionWeekday(sessionId, weekday),
    {
      title: `Çalışma Zamanı: ${subjectName} 📖`,
      body: `"${topic}" konusunu çalışma vakti geldi.`,
      sound: "default",
      data: { type: NotificationType.SESSION_REMINDER, sessionId, subjectName, topic },
      ...androidChannel(Channel.SESSION),
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: expoWeekday,
      hour,
      minute,
    }
  );
}

/**
 * Cancel every notification associated with a session regardless of its repeat type.
 * Cancels the one-time ID, the daily ID, and all 7 weekday IDs.
 * safeCancel is a no-op for IDs that are not scheduled — safe to call unconditionally.
 */
export async function cancelAllSessionReminders(sessionId: string): Promise<void> {
  await Promise.all(
    NotificationId.sessionAll(sessionId).map((id) => safeCancel(id))
  );
}
