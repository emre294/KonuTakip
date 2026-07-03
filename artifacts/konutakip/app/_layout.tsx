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
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AchievementToast } from "@/components/AchievementToast";
import { setupNotifications } from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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

function AppContent() {
  const { newAchievement, clearNewAchievement } = useApp();

  useEffect(() => {
    setupNotifications().catch(() => {});

    // Handle tap on a notification — navigate to the relevant screen
    function handleResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === "topic_reminder") {
        router.push("/(tabs)/subjects");
      } else if (data?.type === "question_reminder") {
        router.push("/(tabs)");
      }
    }

    // Listener for when the app is open / in foreground
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Cold-start: app opened by tapping a notification while closed
    Notifications.getLastNotificationResponseAsync()
      .then((response) => { if (response) handleResponse(response); })
      .catch(() => {});

    return () => sub.remove();
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
