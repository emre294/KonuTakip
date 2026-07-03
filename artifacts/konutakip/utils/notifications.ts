import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_DEFAULT = "konutakip_default";
const CHANNEL_REMINDERS = "konutakip_reminders";
const CHANNEL_DAILY = "konutakip_daily";

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_DEFAULT, {
      name: "Genel Bildirimler",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
      name: "Konu & Soru Tekrar Hatırlatmaları",
      description: "Konu ve yanlış soru tekrar zamanı bildirimleri",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: "#EA580C",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_DAILY, {
      name: "Günlük Çalışma Hatırlatması",
      description: "Günlük çalışma planı bildirimi",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: "#16A34A",
      sound: "default",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === "granted";
}

// ─── Question reminders (existing) ───────────────────────────────────────────

export async function scheduleQuestionReminder(
  questionId: string,
  nextReviewDateStr: string,
  subjectName: string
): Promise<void> {
  await cancelQuestionReminder(questionId);

  const reviewDate = new Date(nextReviewDateStr);
  reviewDate.setHours(9, 0, 0, 0);

  if (reviewDate <= new Date()) {
    reviewDate.setDate(reviewDate.getDate() + 1);
    reviewDate.setHours(9, 0, 0, 0);
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `question-${questionId}`,
      content: {
        title: "Tekrar Zamanı! 📚",
        body: `${subjectName} dersinden bir soruyu tekrar etme zamanı geldi.`,
        sound: "default",
        data: { questionId, type: "question_reminder" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_REMINDERS }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reviewDate,
      },
    });
  } catch (err) {
    console.warn("[notifications] scheduleQuestionReminder failed:", err);
  }
}

export async function cancelQuestionReminder(questionId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`question-${questionId}`);
  } catch {
    // Ignore if notification doesn't exist
  }
}

// ─── Topic reminders (new) ────────────────────────────────────────────────────

const TOPIC_MESSAGES = [
  (topicName: string) => `📚 "${topicName}" konusunu tekrar etme zamanı. Bilgilerini taze tut!`,
  (topicName: string) => `📖 "${topicName}" konusuna bir göz at. Tekrar etmek başarının anahtarı!`,
  (topicName: string) => `🎯 İlerlemenizi kaybetme! Bugün "${topicName}" konusunu tekrar et.`,
];

/**
 * Schedule a recurring topic reminder. Cancels any existing one first to
 * avoid duplicates. Returns true if scheduling succeeded, false otherwise.
 */
export async function scheduleTopicReminder(
  topicId: string,
  topicName: string,
  subjectName: string,
  intervalDays: 3 | 5 | 7
): Promise<boolean> {
  // Always cancel existing first — prevents duplicates
  await cancelTopicReminder(topicId);

  const hasPermission = await setupNotifications();
  if (!hasPermission) {
    console.warn("[notifications] Permission denied — cannot schedule topic reminder");
    return false;
  }

  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() + intervalDays);
  triggerDate.setHours(9, 0, 0, 0);

  const msgFn = TOPIC_MESSAGES[Math.floor(Math.random() * TOPIC_MESSAGES.length)];

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `topic-${topicId}`,
      content: {
        title: `${subjectName} Hatırlatması 📚`,
        body: msgFn(topicName),
        sound: "default",
        data: { topicId, subjectName, type: "topic_reminder" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_REMINDERS }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    console.info(`[notifications] Scheduled topic reminder for "${topicName}" in ${intervalDays} days`);
    return true;
  } catch (err) {
    console.warn("[notifications] scheduleTopicReminder failed:", err);
    return false;
  }
}

export async function cancelTopicReminder(topicId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`topic-${topicId}`);
  } catch {
    // Ignore if notification doesn't exist
  }
}

// ─── Daily study reminder ─────────────────────────────────────────────────────

export async function scheduleDailyStudyReminder(hour: number = 20, minute: number = 0): Promise<void> {
  await cancelDailyStudyReminder();

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: "daily_study_reminder",
      content: {
        title: "Çalışma Vakti! 🎯",
        body: "Bugünkü hedeflerini tamamlamak için harika bir zaman.",
        sound: "default",
        data: { type: "daily_reminder" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_DAILY }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (err) {
    console.warn("[notifications] scheduleDailyStudyReminder failed:", err);
  }
}

export async function cancelDailyStudyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync("daily_study_reminder");
  } catch {
    // Ignore
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore
  }
}

/** Returns all currently scheduled notification identifiers for debugging */
export async function getScheduledNotificationIds(): Promise<string[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map((n) => n.identifier);
  } catch {
    return [];
  }
}
