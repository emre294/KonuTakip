import { NotificationId, NotificationType } from "./constants";
import { getScheduledIds, safeCancel } from "./core";
import {
  cancelQuestionReminder,
  cancelSessionReminder,
  cancelTopicReminder,
  rescheduleTopicReminder,
  scheduleDailyStudyReminder,
  scheduleQuestionReminder,
  scheduleSessionReminder,
} from "./scheduler";

// ─── Types mirrored from AppContext to avoid circular imports ─────────────────

interface StoredTopicReminder {
  interval: 3 | 5 | 7;
  nextDate: string; // YYYY-MM-DD
  topicName?: string;
  subjectName?: string;
}

interface StoredQuestion {
  id: string;
  subjectName: string;
  nextReviewDate: string; // YYYY-MM-DD
  understood: boolean;
  reminderInterval: 3 | 5 | 7;
}

interface StoredSession {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  subjectName: string;
  topic: string;
  completed: boolean;
}

interface StoredDailyReminder {
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface NotificationSyncInput {
  topicReminders: Record<string, StoredTopicReminder>;
  questions: StoredQuestion[];
  sessions: StoredSession[];
  dailyReminder: StoredDailyReminder | null;
}

// ─── Main sync function ───────────────────────────────────────────────────────

/**
 * Called once after AppContext finishes loading persisted data.
 *
 * What it does:
 * 1. Fetches the live set of scheduled notification IDs from the OS.
 * 2. For each stored entity that SHOULD have a notification:
 *    - If the notification is present → leave it alone (no duplicate scheduling).
 *    - If it is missing → reschedule it (e.g. after device restart).
 * 3. For any OS-scheduled notification that has NO matching stored entity → cancel it (orphan).
 *
 * This is intentionally idempotent — running it multiple times is safe.
 */
export async function syncNotifications(input: NotificationSyncInput): Promise<void> {
  try {
    const scheduledIds = await getScheduledIds();
    const today = new Date().toISOString().split("T")[0];

    // Track which IDs are legitimately expected so we can find orphans.
    const expectedIds = new Set<string>();

    // ── 1. Topic reminders ──────────────────────────────────────────────────
    for (const [topicId, reminder] of Object.entries(input.topicReminders)) {
      const id = NotificationId.topic(topicId);
      const isFuture = reminder.nextDate > today;

      if (!isFuture) continue; // Already fired or expired — ignore

      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        // Missing after device restart or app kill — restore it
        if (reminder.topicName && reminder.subjectName) {
          await rescheduleTopicReminder(
            topicId,
            reminder.topicName,
            reminder.subjectName,
            reminder.nextDate
          );
        }
      }
    }

    // ── 2. Question reminders ───────────────────────────────────────────────
    for (const question of input.questions) {
      if (question.understood) continue; // Understood — no reminder needed

      const id = NotificationId.question(question.id);
      const isFuture = question.nextReviewDate > today;

      if (!isFuture) continue; // Already past — notification has fired

      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        await scheduleQuestionReminder(
          question.id,
          question.nextReviewDate,
          question.subjectName
        );
      }
    }

    // ── 3. Session reminders ────────────────────────────────────────────────
    for (const session of input.sessions) {
      if (session.completed) continue;

      const id = NotificationId.session(session.id);
      const isFuture = session.date >= today;

      if (!isFuture) continue; // Past session — skip

      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        await scheduleSessionReminder(
          session.id,
          session.date,
          session.time,
          session.subjectName,
          session.topic
        );
      }
    }

    // ── 4. Daily reminder ────────────────────────────────────────────────────
    if (input.dailyReminder?.enabled) {
      const id = NotificationId.daily();
      expectedIds.add(id);

      if (!scheduledIds.has(id)) {
        await scheduleDailyStudyReminder(
          input.dailyReminder.hour,
          input.dailyReminder.minute
        );
      }
    }

    // ── 5. Orphan cleanup ────────────────────────────────────────────────────
    // Cancel any OS-scheduled notification that is not in our expected set
    // and that belongs to our namespace (identified by the "::" separator pattern).
    for (const scheduledId of scheduledIds) {
      const parsed = NotificationId.parse(scheduledId);
      if (parsed === null) continue; // Not ours — leave it alone
      if (!expectedIds.has(scheduledId)) {
        await safeCancel(scheduledId);
      }
    }
  } catch {
    // Sync failure must never crash the app
  }
}
