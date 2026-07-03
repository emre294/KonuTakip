/**
 * Public API for the KonuTakip notification system.
 *
 * Import from "@/utils/notifications" — never import sub-modules directly.
 */

export {
  setupAndroidChannels,
  ensurePermission,
  invalidatePermissionCache,
  getScheduledIds,
  cancelAll,
} from "./core";

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
} from "./scheduler";

export { syncNotifications } from "./sync";
export type { NotificationSyncInput } from "./sync";

export { handleNotificationTap, handleColdStartNotification } from "./tap";

export {
  NotificationType,
  NotificationId,
  NotificationRoute,
  Channel,
  DEFAULT_DAILY_HOUR,
  DEFAULT_DAILY_MINUTE,
} from "./constants";
export type { NotificationTypeValue, ReminderInterval } from "./constants";

// ─── Top-level init ───────────────────────────────────────────────────────────

import { setupAndroidChannels } from "./core";
import { ensurePermission } from "./core";

/**
 * Initialize the notification system.
 * Call once on app mount (before any scheduling).
 * Sets up Android channels and requests permission.
 * Returns true if permission was granted.
 */
export async function initNotifications(): Promise<boolean> {
  await setupAndroidChannels();
  return ensurePermission();
}
