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
  cancelDailyStudyReminder,
  rescheduleTopicReminder,
  scheduleDailyStudyReminder,
  scheduleQuestionReminder,
  scheduleSessionReminder,
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
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  subjectName: string;
  topic: string;
  completed: boolean;
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

// ─── Main sync ────────────────────────────────────────────────────────────────

export async function syncNotifications(input: NotificationSyncInput): Promise<void> {
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
    for (const question of input.questions) {
      if (question.understood) continue;
      if (question.nextReviewDate <= today) continue; // Already fired — skip

      const id = NotificationId.question(question.id);
      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        const ok = await scheduleQuestionReminder(
          question.id,
          question.nextReviewDate,
          question.subjectName
        );
        if (ok) rebuilt++;
      }
    }

    // ── 3. Session reminders ────────────────────────────────────────────────
    for (const session of input.sessions) {
      if (session.completed) continue;
      if (session.date < today) continue; // Past session — skip

      const id = NotificationId.session(session.id);
      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        const ok = await scheduleSessionReminder(
          session.id,
          session.date,
          session.time,
          session.subjectName,
          session.topic
        );
        if (ok) rebuilt++;
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
}
