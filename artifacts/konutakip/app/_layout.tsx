import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AchievementToast } from "@/components/AchievementToast";
import {
  handleColdStartNotification,
  handleNotificationTap,
  initNotifications,
  invalidatePermissionCache,
  NotificationType,
  scheduleQuestionReminder,
  type ReminderInterval,
} from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ─── Onboarding guard ─────────────────────────────────────────────────────────

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoaded } = useApp();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;
    const inOnboarding = segments[0] === "onboarding";
    if (!profile && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [profile, isLoaded, segments]);

  return <>{children}</>;
}

// ─── App content (inside providers) ──────────────────────────────────────────

function AppContent() {
  const { newAchievement, clearNewAchievement, updateQuestionNextReviewDate } = useApp();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Stable ref so the effect closure always calls the latest function instance
  // without needing to re-register listeners when the reference changes.
  const updateQNRDRef = useRef(updateQuestionNextReviewDate);
  updateQNRDRef.current = updateQuestionNextReviewDate;

  useEffect(() => {
    // 1. Init channels + request permission (non-blocking)
    initNotifications().catch(() => {});

    // 2. Handle foreground/background notification taps
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationTap);

    // 3. Persistent question reminder cycle — foreground delivery handler
    //
    //    When a question reminder fires while the app is in the foreground,
    //    Expo removes the one-time scheduled notification. This listener
    //    immediately schedules the next occurrence (interval days from today)
    //    and updates the stored nextReviewDate so syncNotifications stays
    //    consistent.
    //
    //    For background / closed delivery the foreground listener does not
    //    fire — those reminders are rebuilt by syncNotifications on the next
    //    cold start (see AppContext loadData + sync.ts).
    receivedListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        if (data?.type !== NotificationType.QUESTION_REMINDER) return;

        const questionId = data.questionId as string | undefined;
        const subjectName = data.subjectName as string | undefined;
        const raw = data.reminderInterval;
        const interval: ReminderInterval =
          raw === 3 || raw === 5 || raw === 7 ? raw : 7;

        if (!questionId || !subjectName) return;

        // Compute the next review date (interval days from today)
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + interval);
        const nextDate = nextDay.toISOString().split("T")[0];

        // Schedule next occurrence (safeSchedule cancels any existing first)
        scheduleQuestionReminder(questionId, nextDate, subjectName, interval).catch(() => {});

        // Persist the updated nextReviewDate so sync can verify on next launch
        updateQNRDRef.current(questionId, nextDate);
      }
    );

    // 4. Handle cold-start (app launched by tapping a notification)
    handleColdStartNotification();

    // 5. Invalidate permission cache when app returns to foreground
    //    (user may have toggled permission in OS settings)
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        invalidatePermissionCache();
      }
      appStateRef.current = nextState;
    });

    return () => {
      responseListenerRef.current?.remove();
      receivedListenerRef.current?.remove();
      appStateSub.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <OnboardingGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="statistics" options={{ presentation: "modal" }} />
          <Stack.Screen name="achievements" options={{ presentation: "modal" }} />
          <Stack.Screen name="ai-coach" options={{ presentation: "modal" }} />
          <Stack.Screen name="faq" options={{ presentation: "modal" }} />
          <Stack.Screen name="mock-exams" options={{ presentation: "modal" }} />
          <Stack.Screen name="exam-analytics" options={{ presentation: "modal" }} />
        </Stack>
      </OnboardingGuard>
      {newAchievement && (
        <AchievementToast achievement={newAchievement} onDismiss={clearNewAchievement} />
      )}
    </View>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AppContent />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AppProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
