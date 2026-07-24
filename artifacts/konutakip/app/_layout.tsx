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
import { AppState, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AchievementToast } from "@/components/AchievementToast";
import {
  ensurePermission,
  handleColdStartNotification,
  handleNotificationTap,
  initNotificationChannels,
  invalidatePermissionCache,
  notifLog,
  NotificationType,
  scheduleQuestionReminder,
  type ReminderInterval,
} from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();


function OnboardingGuard() {
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

  return null;
}


function AppContent() {
  const { newAchievement, clearNewAchievement, updateQuestionNextReviewDate, runWatchdogSync, isLoaded } = useApp();
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

  //
  // The permission request is intentionally deferred to Effect 2 (after isLoaded)
  // so the OS dialog never appears before the app is fully initialized.
  useEffect(() => {
    initNotificationChannels().catch(() => {});

    // 2. Handle foreground/background notification taps
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationTap);

    //
    //    When a question reminder fires while the app is in the foreground,
    //    Expo removes the one-time scheduled notification. This listener
    //    immediately schedules the next occurrence (interval days from today)
    //    and updates the stored nextReviewDate so the watchdog sync stays
    //    consistent on the next foreground transition or periodic check.
    //
    //    NOTE: On some Android versions/devices, addNotificationReceivedListener
    //    does NOT reliably fire for local scheduled notifications even when the
    //    app is in the foreground (documented Expo/Android behavior).  The
    //    10 minutes while the app is active, so the chain is always repaired
    //    within one watchdog cycle even if this listener silently skips.
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
        // on the next foreground transition or periodic check.
        updateQNRDRef.current(questionId, nextDate);
      }
    );

    // 4. Handle cold-start (app launched by tapping a notification)
    handleColdStartNotification();

    //
    //    When a question notification fires while the app is in the background:
    //      a) The OS removes the one-time scheduled notification.
    //      b) addNotificationReceivedListener does NOT fire (app not active).
    //      d) runWatchdogSync detects the missing OS notification, sees that
    //         nextReviewDate is in the past, reschedules for today+interval,
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        invalidatePermissionCache();
        // foreground transitions don't cause redundant OS notification queries.
        runWatchdogSyncRef.current().catch(() => {});
      }
      appStateRef.current = nextState;
    });

    //    is active.
    //
    //    This is the critical safeguard for the most common failure mode: the
    //    app stays open in the foreground continuously (e.g. left open on a
    //    desk) and addNotificationReceivedListener fails to fire for a delivered
    //    notification (documented Android behavior on many devices/OS versions).
    //    Without this timer the chain could stay broken for the entire session
    //
    //    The 10-minute interval is >> the 30-second runWatchdogSync cooldown,
    //    so every periodic call results in an actual OS notification query.
    //
    //    Repair: if the OS queue is missing the notification (it fired while
    //    the foreground listener was skipped), runWatchdogSync schedules a new
    const periodicWatchdogInterval = setInterval(() => {
      // Only run when the app is truly in the foreground.
      if (AppState.currentState === "active") {
        runWatchdogSyncRef.current().catch(() => {});
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      responseListenerRef.current?.remove();
      receivedListenerRef.current?.remove();
      appStateSub.remove();
      clearInterval(periodicWatchdogInterval);
    };
  }, []);

  //
  // This effect runs exactly once, when isLoaded transitions from false to true.
  // Deferring the permission request until after initialization guarantees:
  //
  //   1. The OS dialog never appears before the app UI is ready.
  //   2. No concurrent permission requests race with syncNotifications (which is
  //      called from loadData and also calls ensurePermission internally via
  //      safeSchedule). By the time this effect runs, loadData is complete and
  //      syncNotifications has already finished its run, so the permission cache
  //      (_permissionGranted) is in a stable known state.
  //   3. If permission is granted here, runWatchdogSync(force=true) immediately
  //      the app or background/foreground it to make notifications work.
  useEffect(() => {
    if (!isLoaded) return;

    (async () => {
      const granted = await ensurePermission();
      if (granted) {
        // Force a full sync regardless of the 30-second cooldown.
        // This is critical for two scenarios:
        //      existing reminders immediately without waiting for next foreground
        //      transition or 10-minute periodic timer.
        //   b) Existing install where loadData's syncNotifications ran while
        //      the forced sync repairs any notifications that failed to schedule.
        await runWatchdogSyncRef.current(true);
      }
    })().catch(() => {});
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <OnboardingGuard />
      <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#01011B" },
          }}
        >
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="statistics" options={{ presentation: "modal" }} />
          <Stack.Screen name="achievements" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="ai-coach"
            options={{
              presentation: "card",
              animation: "none",
              contentStyle: { backgroundColor: "#01011B" },
            }}
          />
          <Stack.Screen
            name="ai-teacher"
            options={{
              presentation: "card",
              animation: "none",
              contentStyle: { backgroundColor: "#01011B" },
            }}
          />

          <Stack.Screen name="faq" options={{ presentation: "modal" }} />
          <Stack.Screen name="mock-exams" options={{ presentation: "modal" }} />
          <Stack.Screen name="exam-analytics" options={{ presentation: "modal" }} />
          <Stack.Screen name="premium" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="premium-success"
            options={{
              presentation: "fullScreenModal",
              gestureEnabled: false,
              animation: "fade",
              contentStyle: { backgroundColor: "#080E1A" },
            }}
          />
        </Stack>
      {newAchievement && (
        <AchievementToast achievement={newAchievement} onDismiss={clearNewAchievement} />
      )}
    </>
  );
}


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
              <PremiumProvider>
                <BillingProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <AppContent />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </BillingProvider>
              </PremiumProvider>
            </AppProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
