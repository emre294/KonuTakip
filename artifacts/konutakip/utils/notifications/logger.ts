/**
 * Development-only notification logger.
 *
 * All calls are gated on the React Native / Expo __DEV__ global, which is set
 * to `true` by the Metro bundler in development mode and `false` in production
 * release builds. This means zero logging overhead in production — the entire
 * body of each method is dead code that the bundler eliminates.
 */

// __DEV__ is injected by Metro. Declare it so TypeScript is happy when this
// file is type-checked in isolation (e.g. tsc without Metro running).
declare const __DEV__: boolean;

const PREFIX = "[Notifications]";

export const notifLog = {

  // ── Generic schedule/cancel ────────────────────────────────────────────────

  scheduled(identifier: string, fireAt: string | Date): void {
    if (!__DEV__) return;
    const when = fireAt instanceof Date ? fireAt.toISOString() : fireAt;
    console.log(`${PREFIX} ✅ scheduled  notifId:${identifier}  fireAt:${when}`);
  },

  cancelled(identifier: string): void {
    if (!__DEV__) return;
    console.log(`${PREFIX} 🗑  cancelled  notifId:${identifier}`);
  },

  restored(identifier: string, fireAt: string | Date): void {
    if (!__DEV__) return;
    const when = fireAt instanceof Date ? fireAt.toISOString() : fireAt;
    console.log(`${PREFIX} 🔄 restored   notifId:${identifier}  fireAt:${when}`);
  },

  tapped(identifier: string, route: string | null): void {
    if (!__DEV__) return;
    console.log(`${PREFIX} 👆 tapped     notifId:${identifier}  → ${route ?? "(unknown)"}`);
  },

  skipped(identifier: string, reason: string): void {
    if (!__DEV__) return;
    console.log(`${PREFIX} ⏭  skipped    notifId:${identifier}  (${reason})`);
  },

  error(context: string, err: unknown): void {
    if (!__DEV__) return;
    console.warn(`${PREFIX} ❌ error in ${context}:`, err);
  },

  // ── Permission state ───────────────────────────────────────────────────────

  /**
   * Emitted every time the OS permission status is read or changes.
   * `state`   — "granted" | "denied" | "undetermined" — raw OS value.
   * `context` — which code path triggered the check (e.g. "ensurePermission",
   *             "safeSchedule", "foreground").
   */
  permissionState(state: string, context: string): void {
    if (!__DEV__) return;
    const icon =
      state === "granted" ? "🔑" : state === "denied" ? "🚫" : "❓";
    console.log(
      `${PREFIX} ${icon} permission  state:${state}  context:${context}`
    );
  },

  /** @deprecated Use permissionState("granted", context) */
  permissionGranted(): void {
    if (!__DEV__) return;
    console.log(`${PREFIX} 🔑 permission granted`);
  },

  /** @deprecated Use permissionState("denied", context) */
  permissionDenied(): void {
    if (!__DEV__) return;
    console.log(`${PREFIX} 🚫 permission denied`);
  },

  // ── Sync ──────────────────────────────────────────────────────────────────

  syncStart(counts: { topics: number; questions: number; sessions: number }): void {
    if (!__DEV__) return;
    console.log(
      `${PREFIX} 🔃 sync start — topics:${counts.topics} questions:${counts.questions} sessions:${counts.sessions}`
    );
  },

  syncComplete(rebuilt: number, cancelled: number): void {
    if (!__DEV__) return;
    console.log(`${PREFIX} ✔  sync done  — rebuilt:${rebuilt} cancelled:${cancelled}`);
  },

  // ── Wrong Question scheduling ──────────────────────────────────────────────

  /**
   * Emitted immediately before calling the OS scheduler for a question reminder.
   * Logs all the information needed to reconstruct what was attempted:
   *   questionId      — which question
   *   notifId         — the OS notification identifier
   *   nextReviewDate  — the date stored in AsyncStorage (the "expected" date)
   *   scheduledForDate — the actual date the trigger will fire (may differ from
   *                      nextReviewDate when the stored date is in the past and
   *                      the scheduler bumps it forward by reminderInterval days)
   */
  questionScheduleAttempt(
    questionId: string,
    notifId: string,
    nextReviewDate: string,
    scheduledForDate: string
  ): void {
    if (!__DEV__) return;
    const dateMismatch = nextReviewDate !== scheduledForDate ? "  ⚠️ date bumped" : "";
    console.log(
      `${PREFIX} 📅 schedule↗  questionId:${questionId}  notifId:${notifId}  ` +
      `nextReviewDate:${nextReviewDate}  scheduledForDate:${scheduledForDate}${dateMismatch}`
    );
  },

  /**
   * Emitted after the OS scheduleNotificationAsync() call succeeds.
   * Confirms which notification ID is now in the OS queue and when it fires.
   */
  questionScheduleSuccess(
    questionId: string,
    notifId: string,
    nextReviewDate: string,
    scheduledForDate: string
  ): void {
    if (!__DEV__) return;
    console.log(
      `${PREFIX} ✅ scheduled  questionId:${questionId}  notifId:${notifId}  ` +
      `nextReviewDate:${nextReviewDate}  scheduledForDate:${scheduledForDate}`
    );
  },

  /**
   * Emitted when scheduling a question reminder fails.
   * `reason` — human-readable cause:
   *   "permission denied"  — OS permission not granted
   *   "os error: <msg>"    — scheduleNotificationAsync threw
   */
  questionScheduleFail(
    questionId: string,
    notifId: string,
    nextReviewDate: string,
    reason: string
  ): void {
    if (!__DEV__) return;
    console.warn(
      `${PREFIX} ❌ sched fail questionId:${questionId}  notifId:${notifId}  ` +
      `nextReviewDate:${nextReviewDate}  reason:${reason}`
    );
  },

  // ── Wrong Question watchdog ─────────────────────────────────────────────────

  /**
   * Emitted when the watchdog sync starts.
   * trigger: "launch" = cold start, "foreground" = app returned from background
   */
  watchdogRun(trigger: "launch" | "foreground", activeQuestions: number): void {
    if (!__DEV__) return;
    console.log(
      `${PREFIX} 🐕 watchdog   trigger:${trigger}  activeQuestions:${activeQuestions}`
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
    if (!__DEV__) return;
    const status = hasOsNotification ? "✅ OS:present" : "❌ OS:missing";
    console.log(
      `${PREFIX} 📋 state      questionId:${questionId}  interval:${interval}d  nextReviewDate:${nextDate}  ${status}`
    );
  },

  /**
   * Emitted when a question reminder fires while the app is in the foreground.
   * The next occurrence is scheduled immediately by the foreground listener.
   */
  questionDelivered(questionId: string, interval: number, nextDate: string): void {
    if (!__DEV__) return;
    console.log(
      `${PREFIX} 📬 delivered  questionId:${questionId}  interval:${interval}d  nextReviewDate:${nextDate}`
    );
  },

  /**
   * Emitted when the watchdog detects a missing/stale notification and repairs it.
   *   reason "past_date"  — notification already fired while app was not in foreground
   *   reason "missing_os" — future notification lost (device reboot, OS purge)
   *   reason "wrong_date" — notification present but payload scheduledForDate ≠ nextReviewDate
   */
  questionRepaired(
    questionId: string,
    interval: number,
    oldDate: string,
    newDate: string,
    reason: "past_date" | "missing_os" | "wrong_date"
  ): void {
    if (!__DEV__) return;
    console.log(
      `${PREFIX} 🔧 repaired   questionId:${questionId}  interval:${interval}d  ` +
      `nextReviewDate:${oldDate} → ${newDate}  repairReason:${reason}`
    );
  },

  /**
   * Emitted when the foreground listener reschedules a question after delivery
   * and the new date is persisted to AsyncStorage.
   */
  questionRescheduled(questionId: string, oldDate: string, newDate: string): void {
    if (!__DEV__) return;
    console.log(
      `${PREFIX} 🗓  rescheduled questionId:${questionId}  ${oldDate} → ${newDate}`
    );
  },
};
