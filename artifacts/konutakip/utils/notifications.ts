import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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
      name: "Soru Tekrar Hatırlatmaları",
      description: "Yanlış soru tekrar zamanı bildirimleri",
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
      allowAnnouncements: true,
    },
  });

  return status === "granted";
}

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
  } catch {
    // Notifications may not be available in Expo Go web preview
  }
}

export async function cancelQuestionReminder(questionId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`question-${questionId}`);
  } catch {
    // Ignore if notification doesn't exist
  }
}

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
  } catch {
    // Ignore in environments that don't support notifications
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
