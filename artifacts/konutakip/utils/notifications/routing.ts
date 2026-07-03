/**
 * Notification routing — maps notification taps to navigation routes.
 * Handles foreground, background, and cold-start scenarios.
 */

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { NotificationRoute, NotificationType } from "./constants";
import { notifLog } from "./logger";

// ─── Route resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the navigation route for a tapped notification.
 * Returns null if the notification carries an unknown type.
 */
export function resolveNotificationRoute(
  response: Notifications.NotificationResponse
): string | null {
  const data = response.notification.request.content.data as Record<string, unknown>;
  const type = data?.type as string | undefined;

  if (!type) return null;

  switch (type) {
    case NotificationType.TOPIC_REMINDER:
      return NotificationRoute[NotificationType.TOPIC_REMINDER];
    case NotificationType.QUESTION_REMINDER:
      return NotificationRoute[NotificationType.QUESTION_REMINDER];
    case NotificationType.DAILY_REMINDER:
      return NotificationRoute[NotificationType.DAILY_REMINDER];
    case NotificationType.SESSION_REMINDER:
      return NotificationRoute[NotificationType.SESSION_REMINDER];
    default:
      return null;
  }
}

// ─── Tap handler ──────────────────────────────────────────────────────────────

/**
 * Navigate to the screen associated with a tapped notification.
 * Safe to call in foreground, background, and cold-start scenarios.
 * Logs the event in development.
 */
export function handleNotificationTap(
  response: Notifications.NotificationResponse
): void {
  const id = response.notification.request.identifier;
  const route = resolveNotificationRoute(response);

  notifLog.tapped(id, route);

  if (!route) return;

  try {
    router.push(route as Parameters<typeof router.push>[0]);
  } catch (err) {
    // Router may not be ready immediately on cold start — silently ignore.
    notifLog.error("handleNotificationTap.push", err);
  }
}

// ─── Cold-start handler ───────────────────────────────────────────────────────

/**
 * Handle a notification that launched the app from a fully closed state.
 *
 * Must be called once after the router is mounted (not before, or push will throw).
 * Guards against double-processing on re-renders using the last-handled response ID.
 */
let _lastHandledResponseId: string | null = null;

export async function handleColdStartNotification(): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;

    const responseId = response.notification.request.identifier;

    // Prevent processing the same cold-start notification twice
    if (responseId === _lastHandledResponseId) {
      notifLog.skipped(responseId, "cold-start already handled");
      return;
    }

    _lastHandledResponseId = responseId;
    handleNotificationTap(response);
  } catch (err) {
    notifLog.error("handleColdStartNotification", err);
  }
}
