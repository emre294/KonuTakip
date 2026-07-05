/**
 * Development-only notification logger.
 * All calls compile to no-ops in production (process.env.NODE_ENV check).
 */

const PREFIX = "[Notifications]";
const IS_DEV = process.env.NODE_ENV !== "production";

export const notifLog = {
  scheduled(identifier: string, fireAt: string | Date): void {
    if (!IS_DEV) return;
    const when = fireAt instanceof Date ? fireAt.toISOString() : fireAt;
    console.log(`${PREFIX} ✅ scheduled  ${identifier}  @ ${when}`);
  },

  cancelled(identifier: string): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 🗑  cancelled  ${identifier}`);
  },

  restored(identifier: string, fireAt: string | Date): void {
    if (!IS_DEV) return;
    const when = fireAt instanceof Date ? fireAt.toISOString() : fireAt;
    console.log(`${PREFIX} 🔄 restored   ${identifier}  @ ${when}`);
  },

  tapped(identifier: string, route: string | null): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 👆 tapped     ${identifier}  → ${route ?? "(unknown)"}`);
  },

  skipped(identifier: string, reason: string): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} ⏭  skipped    ${identifier}  (${reason})`);
  },

  permissionGranted(): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 🔑 permission granted`);
  },

  permissionDenied(): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 🚫 permission denied`);
  },

  syncStart(counts: { topics: number; questions: number; sessions: number }): void {
    if (!IS_DEV) return;
    console.log(
      `${PREFIX} 🔃 sync start — topics:${counts.topics} questions:${counts.questions} sessions:${counts.sessions}`
    );
  },

  syncComplete(rebuilt: number, cancelled: number): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} ✔  sync done  — rebuilt:${rebuilt} cancelled:${cancelled}`);
  },

  error(context: string, err: unknown): void {
    if (!IS_DEV) return;
    console.warn(`${PREFIX} ❌ error in ${context}:`, err);
  },

  // ── Wrong Question watchdog logging ─────────────────────────────────────────

  /**
   * Emitted when the watchdog sync starts.
   * trigger: "launch" = cold start, "foreground" = app returned from background
   */
  watchdogRun(trigger: "launch" | "foreground", activeQuestions: number): void {
    if (!IS_DEV) return;
    console.log(
      `${PREFIX} 🐕 watchdog   trigger:${trigger}  activeQuestions:${activeQuestions}`
    );
  },

  /**
   * Emitted when a question reminder fires while the app is in the foreground.
   * The next occurrence is scheduled immediately by the foreground listener.
   */
  questionDelivered(questionId: string, interval: number, nextDate: string): void {
    if (!IS_DEV) return;
    console.log(
      `${PREFIX} 📬 delivered  question:${questionId}  interval:${interval}d  nextDate:${nextDate}`
    );
  },

  /**
   * Emitted when the watchdog detects a missing notification and repairs it.
   * reason: "past_date" = notification fired while app was not in foreground
   *         "missing_os" = future notification lost (e.g. device reboot)
   */
  questionRepaired(
    questionId: string,
    interval: number,
    oldDate: string,
    newDate: string,
    reason: "past_date" | "missing_os"
  ): void {
    if (!IS_DEV) return;
    console.log(
      `${PREFIX} 🔧 repaired   question:${questionId}  interval:${interval}d  ${oldDate} → ${newDate}  (${reason})`
    );
  },

  /**
   * Emitted when the foreground listener reschedules a question after delivery
   * and the new date is persisted to AsyncStorage.
   */
  questionRescheduled(questionId: string, oldDate: string, newDate: string): void {
    if (!IS_DEV) return;
    console.log(
      `${PREFIX} 🗓  rescheduled question:${questionId}  ${oldDate} → ${newDate}`
    );
  },

  /**
   * Snapshot of a single question's reminder state — emitted by the watchdog
   * so you can verify every active question has exactly one future notification.
   */
  questionState(
    questionId: string,
    interval: number,
    nextDate: string,
    hasOsNotification: boolean
  ): void {
    if (!IS_DEV) return;
    const status = hasOsNotification ? "✅ OS:present" : "❌ OS:missing";
    console.log(
      `${PREFIX} 📋 state      question:${questionId}  interval:${interval}d  nextDate:${nextDate}  ${status}`
    );
  },
};
