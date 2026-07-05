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
  notifLog,
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
  const { newAchievement, clearNewAchievement, updateQuestionNextReviewDate, runWatchdogSync } = useApp();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Stable refs so the effect closures always call the latest function instances
  // without needing to re-register listeners when the references change.
  const updateQNRDRef = useRef(updateQuestionNextReviewDate);
  updateQNRDRef.current = updateQuestionNextReviewDate;

  // Stable ref for the watchdog so the AppState listener (which is created once
  // in the effect) always calls the latest runWatchdogSync without re-registering.
  const runWatchdogSyncRef = useRef(runWatchdogSync);
  runWatchdogSyncRef.current = runWatchdogSync;

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
    //    and updates the stored nextReviewDate so the watchdog sync stays
    //    consistent on the next foreground transition.
    //
    //    For background / closed delivery the foreground listener does NOT fire
    //    (Expo only calls it while the app is active). Those reminders are
    //    repaired by the watchdog: on cold start via loadData → syncNotifications,
    //    and on warm foreground return via the AppState listener below.
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

        // Log the foreground delivery so it's visible in the dev console.
        notifLog.questionDelivered(questionId, interval, nextDate);

        // Schedule next occurrence immediately (safeSchedule cancels any
        // existing first, so no duplicate can arise).
        scheduleQuestionReminder(questionId, nextDate, subjectName, interval).catch(() => {});

        // Persist the updated nextReviewDate so the watchdog can verify it
        // on the next foreground transition or cold start.
        updateQNRDRef.current(questionId, nextDate);
      }
    );

    // 4. Handle cold-start (app launched by tapping a notification)
    handleColdStartNotification();

    // 5. Watchdog + permission cache refresh on every foreground transition.
    //
    //    This is the critical fix for the "chain stops on ignore/dismiss" bug.
    //
    //    When a question notification fires while the app is in the background:
    //      a) The OS removes the one-time scheduled notification.
    //      b) addNotificationReceivedListener does NOT fire (app not active).
    //      c) The user brings the app to foreground — this handler runs.
    //      d) runWatchdogSync detects the missing OS notification, sees that
    //         nextReviewDate is in the past, reschedules for today+interval,
    //         and persists the new date — fully restoring the chain.
    //
    //    Without this watchdog call, the chain would silently die every time a
    //    notification was delivered while the app was backgrounded.
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        invalidatePermissionCache();
        // Run the watchdog — respects its own 30-second cooldown, so rapid
        // foreground transitions don't cause redundant OS notification queries.
        runWatchdogSyncRef.current().catch(() => {});
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
