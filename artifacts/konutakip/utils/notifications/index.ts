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

// ─── Top-level initializer ────────────────────────────────────────────────────

import { setupAndroidChannels } from "./core";
import { ensurePermission } from "./permissions";

/**
 * Initialize the notification system.
 * Call once at app mount, before any scheduling:
 *   1. Sets up Android notification channels.
 *   2. Requests permission from the user (cached after first call).
 *
 * Returns true if permission is currently granted.
 */
export async function initNotifications(): Promise<boolean> {
  await setupAndroidChannels();
  return ensurePermission();
}
