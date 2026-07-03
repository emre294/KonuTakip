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
  const { newAchievement, clearNewAchievement } = useApp();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // 1. Init channels + request permission (non-blocking)
    initNotifications().catch(() => {});

    // 2. Handle foreground/background notification taps
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationTap);

    // 3. Handle cold-start (app launched by tapping a notification)
    handleColdStartNotification();

    // 4. Invalidate permission cache when app returns to foreground
    //    (user may have toggled permission in OS settings)
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        invalidatePermissionCache();
      }
      appStateRef.current = nextState;
    });

    return () => {
      responseListenerRef.current?.remove();
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
