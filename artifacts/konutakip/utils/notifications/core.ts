/**
 * Low-level notification primitives:
 * - Notification handler (must be set before any notification fires)
 * - Android channel setup
 * - Atomic cancel-then-schedule helper
 * - Scheduled notification query
 *
 * Permission logic lives in permissions.ts.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Channel } from "./constants";
import { notifLog } from "./logger";
import { ensurePermission } from "./permissions";

// ─── Foreground notification handler ─────────────────────────────────────────
// Must be set at module-load time, before any notification can be received.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android channel setup ────────────────────────────────────────────────────

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(Channel.DEFAULT, {
    name: "Genel Bildirimler",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: "#2563EB",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync(Channel.TOPIC, {
    name: "Konu Tekrar Hatırlatmaları",
    description: "Tamamlanan konu tekrar zamanı bildirimleri",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: "#EA580C",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync(Channel.QUESTION, {
    name: "Yanlış Soru Tekrar Hatırlatmaları",
    description: "Yanlış soru tekrar zamanı bildirimleri",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: "#DC2626",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync(Channel.DAILY, {
    name: "Günlük Çalışma Hatırlatması",
    description: "Her gün tekrar eden çalışma hatırlatması",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: "#16A34A",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync(Channel.SESSION, {
    name: "Ders Planı Hatırlatmaları",
    description: "Planlanan çalışma oturumu bildirimleri",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#7C3AED",
    sound: "default",
  });
}

// ─── Atomic cancel + schedule primitives ─────────────────────────────────────

/**
 * Cancel a scheduled notification by identifier.
 * Never throws — silently ignores unknown identifiers.
 */
export async function safeCancel(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    notifLog.cancelled(identifier);
  } catch {
    // Notification did not exist — that is fine.
  }
}

/**
 * Atomic cancel-then-schedule.
 *
 * Steps:
 * 1. Check / request permission (cached after first call).
 * 2. Cancel any existing notification with the same identifier.
 * 3. Schedule the new notification.
 *
 * Returns true on success, false if permission is denied or scheduling fails.
 * Never throws.
 */
export async function safeSchedule(
  identifier: string,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput
): Promise<boolean> {
  const granted = await ensurePermission();
  if (!granted) {
    // permissionState was already logged by ensurePermission with the raw OS status.
    // Log the skip here so there is a direct association between the notifId and the denial.
    notifLog.permissionState("denied", `safeSchedule:${identifier}`);
    notifLog.skipped(identifier, "permission not granted");
    return false;
  }

  // Always cancel first — guarantees no duplicate can exist
  await safeCancel(identifier);

  try {
    await Notifications.scheduleNotificationAsync({ identifier, content, trigger });
    // Compute a human-readable fire time for the log (trigger may be null for immediate)
    let fireAt: Date | string = "RECURRING";
    if (trigger !== null && typeof trigger === "object" && "date" in trigger) {
      const d = (trigger as { date: unknown }).date;
      fireAt = d instanceof Date ? d : typeof d === "number" ? new Date(d) : "RECURRING";
    }
    notifLog.scheduled(identifier, fireAt instanceof Date ? fireAt : String(fireAt));
    return true;
  } catch (err) {
    notifLog.error(`safeSchedule(${identifier})`, err);
    return false;
  }
}

// ─── OS notification inspection ───────────────────────────────────────────────

/**
 * Returns ALL currently pending scheduled notifications with full content and
 * trigger information. Use this instead of getScheduledIds when the watchdog
 * needs to verify trigger dates, not just notification presence.
 * Never throws — returns [] on error.
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (err) {
    notifLog.error("getAllScheduledNotifications", err);
    return [];
  }
}

/** Returns a Set of all currently scheduled notification identifiers. */
export async function getScheduledIds(): Promise<Set<string>> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return new Set(all.map((n) => n.identifier));
  } catch (err) {
    notifLog.error("getScheduledIds", err);
    return new Set();
  }
}

/** Cancel every scheduled notification. Use with care. */
export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    notifLog.cancelled("ALL");
  } catch (err) {
    notifLog.error("cancelAll", err);
  }
}
