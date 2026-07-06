/**
 * Notification permission management.
 * Isolated here so it can be imported independently by core.ts and index.ts.
 */

import * as Notifications from "expo-notifications";
import { notifLog } from "./logger";

// Cached result — null means "unknown / not yet checked"
let _permissionGranted: boolean | null = null;

// De-duplication: if a requestPermissionsAsync() call is already in flight,
// subsequent callers piggyback on the same promise instead of triggering a
// second OS dialog (which produces undefined behavior on Android).
let _pendingRequest: Promise<boolean> | null = null;

/**
 * Ensure notification permission is granted.
 * - Caches the result so subsequent calls skip the OS round-trip.
 * - De-duplicates concurrent calls: if one call is already awaiting the OS
 *   permission dialog, any concurrent call joins it instead of firing a second
 *   requestPermissionsAsync() — which can silently return "denied" on Android
 *   while the dialog is still visible.
 * - Pass `forceRequest = true` to prompt again after a previous denial
 *   (e.g. after the user manually re-enabled in OS settings).
 * - Returns true if permission is currently granted.
 */
export async function ensurePermission(forceRequest = false): Promise<boolean> {
  // Fast path — already known to be granted
  if (_permissionGranted === true && !forceRequest) return true;

  // If a request is already in flight and we are not forcing, wait for it.
  // This prevents two concurrent requestPermissionsAsync() calls from racing.
  if (_pendingRequest !== null && !forceRequest) {
    return _pendingRequest;
  }

  const doRequest = async (): Promise<boolean> => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();

      // Log the raw OS status every time we read it — this is the ground truth.
      notifLog.permissionState(existing, "ensurePermission:check");

      if (existing === "granted") {
        _permissionGranted = true;
        return true;
      }

      // If already denied and we are not forcing a re-request, return false without prompting
      if (existing === "denied" && !forceRequest) {
        _permissionGranted = false;
        return false;
      }

      // Request from the user
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });

      // Log the result of the OS dialog
      notifLog.permissionState(status, "ensurePermission:request");

      _permissionGranted = status === "granted";
      return _permissionGranted;
    } catch (err) {
      notifLog.error("ensurePermission", err);
      return false;
    } finally {
      // Clear the pending slot so the next call starts fresh
      _pendingRequest = null;
    }
  };

  _pendingRequest = doRequest();
  return _pendingRequest;
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
