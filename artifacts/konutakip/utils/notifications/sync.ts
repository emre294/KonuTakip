/**
 * App-start notification synchronization.
 *
 * Every time the app launches, this module:
 * 1. Reads the live set of OS-scheduled notification identifiers.
 * 2. For each stored entity that should have a future notification:
 *    - Present in OS  → leave it alone (avoid duplicate scheduling).
 *    - Missing from OS → restore it (e.g. after device reboot).
 * 3. For any OS-scheduled notification that belongs to our namespace but has
 *    no matching stored entity → cancel it (orphan cleanup).
 *
 * This function is idempotent — running it multiple times produces the same result.
 */

import { NotificationId } from "./constants";
import { getScheduledIds, safeCancel } from "./core";
import { notifLog } from "./logger";
import {
  rescheduleTopicReminder,
  scheduleDailyStudyReminder,
  scheduleEveryDaySessionReminder,
  scheduleQuestionReminder,
  scheduleSessionReminder,
  scheduleWeeklySessionReminder,
} from "./scheduler";

// ─── Input types (mirrored from AppContext to avoid circular imports) ─────────

export interface SyncTopicReminder {
  interval: 3 | 5 | 7;
  nextDate: string; // YYYY-MM-DD
  topicName?: string;
  subjectName?: string;
}

export interface SyncQuestion {
  id: string;
  subjectName: string;
  nextReviewDate: string; // YYYY-MM-DD
  understood: boolean;
  reminderInterval: 3 | 5 | 7;
}

export interface SyncSession {
  id: string;
  date: string; // YYYY-MM-DD — only meaningful for one_time
  time: string; // HH:mm
  subjectName: string;
  topic: string;
  completed: boolean;
  repeatType: "one_time" | "every_day" | "every_week";
  weekdays?: number[]; // JS convention: 0=Sun … 6=Sat; only for every_week
}

export interface SyncDailyReminder {
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface NotificationSyncInput {
  topicReminders: Record<string, SyncTopicReminder>;
  questions: SyncQuestion[];
  sessions: SyncSession[];
  dailyReminder: SyncDailyReminder | null;
}

// ─── Sync result ─────────────────────────────────────────────────────────────

export interface SyncResult {
  /** Questions whose stored nextReviewDate was in the past (notification already
   *  fired while the app was closed). Each entry carries the new scheduled date
   *  (today + reminderInterval) so the caller can persist it to AsyncStorage.
   *  Without this update the next sync would see the same stale past date and
   *  compute the wrong trigger time again. */
  rescheduledQuestions: Array<{ id: string; newNextDate: string }>;
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export async function syncNotifications(input: NotificationSyncInput): Promise<SyncResult> {
  const rescheduledQuestions: Array<{ id: string; newNextDate: string }> = [];
  try {
    const today = new Date().toISOString().split("T")[0];

    notifLog.syncStart({
      topics: Object.keys(input.topicReminders).length,
      questions: input.questions.length,
      sessions: input.sessions.length,
    });

    const scheduledIds = await getScheduledIds();
    const expectedIds = new Set<string>();
    let rebuilt = 0;
    let cancelled = 0;

    // ── 1. Topic reminders ──────────────────────────────────────────────────
    for (const [topicId, reminder] of Object.entries(input.topicReminders)) {
      if (reminder.nextDate <= today) continue; // Already fired — skip

      const id = NotificationId.topic(topicId);
      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        if (reminder.topicName && reminder.subjectName) {
          const ok = await rescheduleTopicReminder(
            topicId,
            reminder.topicName,
            reminder.subjectName,
            reminder.nextDate
          );
          if (ok) rebuilt++;
        }
      }
    }

    // ── 2. Question reminders ───────────────────────────────────────────────
    // Two cases when a question notification is missing from the OS:
    //   a) nextReviewDate is in the FUTURE → notification lost (device reboot).
    //      Restore the original scheduled date.
    //   b) nextReviewDate is in the PAST   → notification already fired while
    //      the app was closed or the foreground listener wasn't running.
    //      Schedule for today + reminderInterval so the cadence is preserved,
    //      then record in rescheduledQuestions so the caller can persist the
    //      new date — without this step the next sync would see the same stale
    //      date and compute the wrong trigger time again.
    for (const question of input.questions) {
      if (question.understood) continue;

      const id = NotificationId.question(question.id);
      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        const alreadyFired = question.nextReviewDate < today;

        // For already-fired reminders compute the correct next date now so we
        // can both schedule it and return it for storage update.
        const targetDate = alreadyFired
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + question.reminderInterval);
              return d.toISOString().split("T")[0];
            })()
          : question.nextReviewDate;

        const ok = await scheduleQuestionReminder(
          question.id,
          targetDate,
          question.subjectName,
          question.reminderInterval
        );
        if (ok) {
          rebuilt++;
          if (alreadyFired) {
            // Caller must persist this so the next sync uses the correct date.
            rescheduledQuestions.push({ id: question.id, newNextDate: targetDate });
          }
        }
      }
    }

    // ── 3. Session reminders ────────────────────────────────────────────────
    for (const session of input.sessions) {
      if (session.repeatType === "every_day") {
        // DAILY: always active — rebuild if missing (handles device reboot)
        const id = NotificationId.sessionDaily(session.id);
        expectedIds.add(id);
        if (!scheduledIds.has(id)) {
          const ok = await scheduleEveryDaySessionReminder(
            session.id, session.time, session.subjectName, session.topic
          );
          if (ok) rebuilt++;
        }
      } else if (session.repeatType === "every_week") {
        // WEEKLY: one notification per selected weekday
        for (const wd of session.weekdays ?? []) {
          const id = NotificationId.sessionWeekday(session.id, wd);
          expectedIds.add(id);
          if (!scheduledIds.has(id)) {
            const ok = await scheduleWeeklySessionReminder(
              session.id, wd, session.time, session.subjectName, session.topic
            );
            if (ok) rebuilt++;
          }
        }
      } else {
        // ONE TIME: skip if already completed or in the past
        if (session.completed) continue;
        if (session.date < today) continue;
        const id = NotificationId.session(session.id);
        expectedIds.add(id);
        if (!scheduledIds.has(id)) {
          const ok = await scheduleSessionReminder(
            session.id, session.date, session.time, session.subjectName, session.topic
          );
          if (ok) rebuilt++;
        }
      }
    }

    // ── 4. Daily reminder ────────────────────────────────────────────────────
    if (input.dailyReminder?.enabled) {
      const id = NotificationId.daily();
      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        const ok = await scheduleDailyStudyReminder(
          input.dailyReminder.hour,
          input.dailyReminder.minute
        );
        if (ok) rebuilt++;
      }
    }

    // ── 5. Orphan cleanup ────────────────────────────────────────────────────
    // Cancel any OS notification that belongs to our namespace but has no
    // matching stored entity. Identified by the "::" separator convention.
    for (const scheduledId of scheduledIds) {
      const parsed = NotificationId.parse(scheduledId);
      if (parsed === null) continue; // Not our namespace — leave alone

      if (!expectedIds.has(scheduledId)) {
        await safeCancel(scheduledId);
        cancelled++;
      }
    }

    notifLog.syncComplete(rebuilt, cancelled);
  } catch (err) {
    // Sync failure must never crash the app
    notifLog.error("syncNotifications", err);
  }
  return { rescheduledQuestions };
}
