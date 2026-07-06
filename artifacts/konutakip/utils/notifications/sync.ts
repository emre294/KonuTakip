/**
 * App-start notification synchronization + Wrong Question watchdog.
 *
 * Called on every cold start AND every foreground transition. Guarantees that
 * every active (non-understood) Wrong Question always has EXACTLY ONE future
 * scheduled notification, regardless of:
 *   - notification dismissal or swipe-away
 *   - notification tap or ignore
 *   - app kill / force-stop / device reboot
 *   - Android skipping the foreground delivery callback
 *   - the app staying open in the foreground for an extended period
 *
 * Three repair cases are handled:
 *   MISSING / past_date — notification fired while app was not in foreground.
 *     triggerTime is NOW in the past → schedule for today + reminderInterval.
 *     Return in rescheduledQuestions so caller persists the new date.
 *
 *   MISSING / missing_os — notification was lost without having fired
 *     (device reboot, OS purge, Android battery kill).
 *     triggerTime is still in the FUTURE → restore the original date.
 *
 *   PRESENT / wrong_date — notification IS in the OS queue but its embedded
 *     scheduledForDate doesn't match question.nextReviewDate.  This catches
 *     stale schedules caused by device clock changes, DST, or prior bugs.
 *     When the original nextReviewDate is still in the future, we reschedule
 *     for that date (not today+interval) so the student's expected cadence is
 *     preserved.  When the date is already past, we treat it as past_date and
 *     schedule for today+interval.
 *
 * This function is idempotent — running it multiple times produces the same result.
 */

import * as Notifications from "expo-notifications";
import { NotificationId, NotificationType } from "./constants";
import { getAllScheduledNotifications, safeCancel } from "./core";
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
  /**
   * Questions whose stored nextReviewDate was in the past (notification already
   * fired while the app was closed or in the background). Each entry carries the
   * new scheduled date (today + reminderInterval) so the caller can persist it to
   * AsyncStorage. Without this update the next sync would see the same stale past
   * date and compute the wrong trigger time again.
   *
   * NOTE: wrong_date repairs where the original nextReviewDate is still in the
   * future are NOT included here — those reschedule for the stored date without
   * changing it, so no persistence is needed.
   */
  rescheduledQuestions: Array<{ id: string; newNextDate: string }>;
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export async function syncNotifications(
  input: NotificationSyncInput,
  trigger: "launch" | "foreground" = "launch"
): Promise<SyncResult> {
  const rescheduledQuestions: Array<{ id: string; newNextDate: string }> = [];
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const activeQuestions = input.questions.filter(q => !q.understood);

    notifLog.syncStart({
      topics: Object.keys(input.topicReminders).length,
      questions: input.questions.length,
      sessions: input.sessions.length,
    });
    notifLog.watchdogRun(trigger, activeQuestions.length);

    // ── Fetch full notification objects (not just IDs) ─────────────────────
    // Full objects allow the watchdog to verify the embedded scheduledForDate
    // payload, catching stale/wrong-date notifications in addition to missing ones.
    const allScheduled: Notifications.NotificationRequest[] = await getAllScheduledNotifications();
    const scheduledIds = new Set(allScheduled.map((n) => n.identifier));

    // Build a map from question ID → the date stored in the notification payload.
    // Present only for notifications scheduled after the scheduledForDate field
    // was introduced.  Older notifications (without the field) are not flagged
    // as wrong-date — backward compatible.
    const questionScheduledDates = new Map<string, string>();
    for (const notif of allScheduled) {
      const data = notif.content.data as Record<string, unknown> | undefined;
      if (
        data?.type === NotificationType.QUESTION_REMINDER &&
        typeof data.questionId === "string" &&
        typeof data.scheduledForDate === "string"
      ) {
        questionScheduledDates.set(data.questionId, data.scheduledForDate);
      }
    }

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

    // ── 2. Wrong Question watchdog ───────────────────────────────────────────
    //
    // Guarantee: every active (non-understood) question has exactly ONE future
    // OS notification pointing to the correct date.  Three repair cases:
    //
    //   MISSING / past_date — notification fired while app was not in foreground.
    //     triggerTime is NOW in the past → schedule for today + reminderInterval.
    //     Return in rescheduledQuestions so caller persists the new date.
    //
    //   MISSING / missing_os — notification was lost without having fired
    //     (device reboot, OS purge, Android battery kill).
    //     triggerTime is still in the FUTURE → restore the original date.
    //
    //   PRESENT / wrong_date — notification IS in the OS queue but its embedded
    //     scheduledForDate doesn't match question.nextReviewDate.
    //
    //     Key distinction (BUG FIX): if the nextReviewDate is still in the
    //     future, reschedule for question.nextReviewDate (not today+interval)
    //     so the student's expected review cadence is preserved. Only treat as
    //     past_date if nextReviewDate itself has already passed.
    //     This also prevents the wrong-date / past-date alternation loop where
    //     rescheduledQuestions kept returning today+interval on every sync.
    //
    // IMPORTANT: alreadyFired compares the ACTUAL trigger timestamp (09:00 on
    // nextReviewDate), NOT just the date string.  A notification scheduled for
    // today at 09:00 has already fired if the current time is past 09:00 today.
    for (const question of input.questions) {
      if (question.understood) continue;

      const id = NotificationId.question(question.id);
      expectedIds.add(id);

      const triggerTime = new Date(`${question.nextReviewDate}T09:00:00`);
      const alreadyFired = triggerTime <= now;
      const hasOsNotification = scheduledIds.has(id);

      // Wrong-date detection: only fires if the notification has the new payload
      // field AND the stored date doesn't match.  Absent field = trust the notification.
      const storedPayloadDate = questionScheduledDates.get(question.id);
      const hasWrongDate =
        hasOsNotification &&
        storedPayloadDate !== undefined &&
        storedPayloadDate !== question.nextReviewDate;

      notifLog.questionState(
        question.id,
        question.reminderInterval,
        question.nextReviewDate,
        hasOsNotification
      );

      const needsRepair = !hasOsNotification || hasWrongDate;

      if (needsRepair) {
        // Compute the correct target date for the repair:
        //
        //   already fired (past date):
        //     Reschedule for today + interval so the cadence is preserved.
        //     This is the ONLY case where rescheduledQuestions must be returned
        //     — the stored nextReviewDate is stale and must be persisted.
        //
        //   missing OS (future date, no notification):
        //     Restore the original nextReviewDate.  No date change, no
        //     rescheduledQuestions entry needed.
        //
        //   wrong_date with future nextReviewDate:
        //     The student expects the review on question.nextReviewDate.
        //     Use that date — not today+interval — to preserve the cadence.
        //     No rescheduledQuestions entry needed (the stored date is correct).
        //
        //   wrong_date with past nextReviewDate:
        //     Same as "already fired" — schedule today+interval and persist.
        let targetDate: string;
        let dateChanged: boolean;

        if (alreadyFired) {
          // Notification fired while app was in background / off — reschedule
          const d = new Date();
          d.setDate(d.getDate() + question.reminderInterval);
          targetDate = d.toISOString().split("T")[0];
          dateChanged = true;
        } else {
          // Notification is either missing (future) or has wrong payload date
          // but nextReviewDate is still valid — restore the stored date.
          targetDate = question.nextReviewDate;
          dateChanged = false;
        }

        const ok = await scheduleQuestionReminder(
          question.id,
          targetDate,
          question.subjectName,
          question.reminderInterval
        );

        if (ok) {
          rebuilt++;

          const repairReason =
            hasWrongDate
              ? alreadyFired ? "wrong_date" : "missing_os"
              : alreadyFired
              ? "past_date"
              : "missing_os";

          notifLog.questionRepaired(
            question.id,
            question.reminderInterval,
            question.nextReviewDate,
            targetDate,
            repairReason as "past_date" | "missing_os" | "wrong_date"
          );

          // Only return in rescheduledQuestions when the date actually changed
          // (i.e. the notification already fired and we bumped to today+interval).
          // Missing-OS and future wrong_date repairs use the stored date, so the
          // caller does not need to persist anything for those cases.
          if (dateChanged) {
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
    // matching stored entity.  Identified by the "::" separator convention.
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
