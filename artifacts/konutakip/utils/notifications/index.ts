/**
 * Public API for the KonuTakip notification system.
 *
 * Always import from "@/utils/notifications" — never import sub-modules directly.
 *
 * Module map:
 *   constants.ts   — types, IDs, channel names, routes
 *   logger.ts      — dev-only structured logging
 *   permissions.ts — permission request & cache
 *   core.ts        — notification handler, channels, cancel/schedule primitives
 *   scheduler.ts   — per-type schedule / cancel functions
 *   sync.ts        — app-start sync & reboot recovery
 *   routing.ts     — notification tap → navigation route mapping
 */

// ── Constants ─────────────────────────────────────────────────────────────────
export {
  NotificationType,
  NotificationId,
  NotificationRoute,
  Channel,
  DEFAULT_DAILY_HOUR,
  DEFAULT_DAILY_MINUTE,
} from "./constants";
export type { NotificationTypeValue, ReminderInterval } from "./constants";

// ── Logger ────────────────────────────────────────────────────────────────────
export { notifLog } from "./logger";

// ── Permissions ───────────────────────────────────────────────────────────────
export {
  ensurePermission,
  invalidatePermissionCache,
  getPermissionStatus,
} from "./permissions";

// ── Core primitives ───────────────────────────────────────────────────────────
export {
  setupAndroidChannels,
  safeCancel,
  safeSchedule,
  getAllScheduledNotifications,
  getScheduledIds,
  cancelAll,
} from "./core";

// ── Scheduler ─────────────────────────────────────────────────────────────────
export {
  scheduleTopicReminder,
  rescheduleTopicReminder,
  cancelTopicReminder,
  scheduleQuestionReminder,
  cancelQuestionReminder,
  scheduleDailyStudyReminder,
  cancelDailyStudyReminder,
  scheduleSessionReminder,
  cancelSessionReminder,
  scheduleEveryDaySessionReminder,
  scheduleWeeklySessionReminder,
  cancelAllSessionReminders,
} from "./scheduler";

// ── Sync ──────────────────────────────────────────────────────────────────────
export { syncNotifications } from "./sync";
export type { NotificationSyncInput } from "./sync";

// ── Routing ───────────────────────────────────────────────────────────────────
export {
  resolveNotificationRoute,
  handleNotificationTap,
  handleColdStartNotification,
} from "./routing";

// ─── Initializers ─────────────────────────────────────────────────────────────

import { setupAndroidChannels } from "./core";
import { ensurePermission } from "./permissions";

/**
 * Initialize Android notification channels only — NO permission request.
 *
 * Call this immediately at app mount so channels exist before any notification
 * fires, without triggering the OS permission dialog prematurely.
 * Safe to call on iOS (no-op for channels).
 */
export async function initNotificationChannels(): Promise<void> {
  await setupAndroidChannels();
}

/**
 * Initialize the notification system fully.
 * Call once at app mount, before any scheduling:
 *   1. Sets up Android notification channels.
 *   2. Requests permission from the user (cached after first call).
 *
 * Returns true if permission is currently granted.
 *
 * NOTE: Prefer calling initNotificationChannels() at mount and then
 * ensurePermission() after the app is fully initialized (isLoaded = true)
 * to avoid showing the permission dialog before the app is ready.
 */
export async function initNotifications(): Promise<boolean> {
  await setupAndroidChannels();
  return ensurePermission();
}
