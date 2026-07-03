/**
 * Notification permission management.
 * Isolated here so it can be imported independently by core.ts and index.ts.
 */

import * as Notifications from "expo-notifications";
import { notifLog } from "./logger";

// Cached result — null means "unknown / not yet checked"
let _permissionGranted: boolean | null = null;

/**
 * Ensure notification permission is granted.
 * - Caches the result so subsequent calls skip the OS round-trip.
 * - Pass `forceRequest = true` to prompt again after a previous denial
 *   (e.g. after the user manually re-enabled in OS settings).
 * - Returns true if permission is currently granted.
 */
export async function ensurePermission(forceRequest = false): Promise<boolean> {
  // Fast path — already known to be granted
  if (_permissionGranted === true && !forceRequest) return true;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();

    if (existing === "granted") {
      _permissionGranted = true;
      notifLog.permissionGranted();
      return true;
    }

    // If already denied and we are not forcing a re-request, return false without prompting
    if (existing === "denied" && !forceRequest) {
      _permissionGranted = false;
      notifLog.permissionDenied();
      return false;
    }

    // Request from the user
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });

    _permissionGranted = status === "granted";

    if (_permissionGranted) {
      notifLog.permissionGranted();
    } else {
      notifLog.permissionDenied();
    }

    return _permissionGranted;
  } catch (err) {
    notifLog.error("ensurePermission", err);
    return false;
  }
}

/**
 * Invalidate the cached permission result.
 * Call when the app returns to the foreground — the user may have toggled
 * the permission in OS settings while the app was backgrounded.
 */
export function invalidatePermissionCache(): void {
  _permissionGranted = null;
}

/**
 * Read the current permission status without triggering a prompt.
 * Useful for conditional UI (e.g. showing "Enable notifications" banner).
 */
export async function getPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as "granted" | "denied" | "undetermined";
  } catch {
    return "undetermined";
  }
}
