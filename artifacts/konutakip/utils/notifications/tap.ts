import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { NotificationId, NotificationRoute, NotificationType } from "./constants";

// ─── Notification tap handler ─────────────────────────────────────────────────

/**
 * Resolves the navigation route for a tapped notification.
 * Returns null if the notification type is unknown.
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

/**
 * Navigate to the screen associated with a tapped notification.
 * Safe to call in foreground, background, and cold-start scenarios.
 */
export function handleNotificationTap(
  response: Notifications.NotificationResponse
): void {
  const route = resolveNotificationRoute(response);
  if (!route) return;

  // Use replace instead of push so tapping doesn't stack duplicate screens
  // when the app was cold-started by a notification tap.
  try {
    router.push(route as Parameters<typeof router.push>[0]);
  } catch {
    // Router may not be ready on very early cold starts — ignore
  }
}

// ─── Cold-start handler ───────────────────────────────────────────────────────

/**
 * Checks for a notification that launched the app from a fully closed state.
 * Should be called once after the router is mounted.
 * Tracks the last-handled response ID to prevent double-navigation on re-renders.
 */
let _lastHandledResponseId: string | null = null;

export async function handleColdStartNotification(): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;

    const responseId = response.notification.request.identifier;
    if (responseId === _lastHandledResponseId) return; // Already handled

    _lastHandledResponseId = responseId;
    handleNotificationTap(response);
  } catch {
    // Ignore — non-critical
  }
}
