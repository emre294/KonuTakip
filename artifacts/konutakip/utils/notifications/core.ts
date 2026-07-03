import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Channel } from "./constants";

// ─── Notification handler (must run before any notification fires) ─────────────

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

// ─── Permission management ────────────────────────────────────────────────────

let _permissionGranted: boolean | null = null;

/**
 * Check (and optionally request) notification permission.
 * Caches the result so we don't hit the OS on every scheduling call.
 * Pass `forceRequest = true` to re-request after denial (e.g. from settings UI).
 */
export async function ensurePermission(forceRequest = false): Promise<boolean> {
  if (_permissionGranted === true && !forceRequest) return true;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") {
      _permissionGranted = true;
      return true;
    }
    if (existing === "denied" && !forceRequest) {
      _permissionGranted = false;
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });

    _permissionGranted = status === "granted";
    return _permissionGranted;
  } catch {
    return false;
  }
}

/** Invalidate the permission cache (call after app foregrounding or settings change). */
export function invalidatePermissionCache(): void {
  _permissionGranted = null;
}

// ─── Core schedule / cancel primitives ───────────────────────────────────────

/**
 * Cancel a scheduled notification by identifier.
 * Never throws — silently ignores unknown identifiers.
 */
export async function safeCancel(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Notification may not exist — that's fine.
  }
}

/**
 * Cancel-then-schedule pattern.
 * Always cancels the old notification first to guarantee no duplicates.
 * Returns true on success, false if permission is denied or scheduling fails.
 */
export async function safeSchedule(
  identifier: string,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput
): Promise<boolean> {
  const granted = await ensurePermission();
  if (!granted) return false;

  // Always cancel first to prevent duplicates
  await safeCancel(identifier);

  try {
    await Notifications.scheduleNotificationAsync({ identifier, content, trigger });
    return true;
  } catch {
    return false;
  }
}

// ─── Scheduled notification query ────────────────────────────────────────────

/** Returns a Set of all currently scheduled notification identifiers. */
export async function getScheduledIds(): Promise<Set<string>> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return new Set(all.map((n) => n.identifier));
  } catch {
    return new Set();
  }
}

/** Cancel all scheduled notifications. Use with caution. */
export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore
  }
}
