import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Achievement } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const ICON_MAP: Record<string, string> = {
  star: "star",
  zap: "flash",
  book: "book",
  award: "ribbon",
  target: "target",
  crown: "trophy",
  calendar: "calendar",
  "help-circle": "help-circle",
};

interface Props {
  achievement: Achievement;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });

    const dismiss = () => {
      translateY.value = withTiming(-120, { duration: 300 }, () => {
        runOnJS(onDismiss)();
      });
      opacity.value = withTiming(0, { duration: 300 });
    };

    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const iconName = (ICON_MAP[achievement.icon] ?? "star") + "";

  return (
    <Animated.View style={[styles.container, animStyle, { top: insets.top + 16 }]}>
      <View style={[styles.toast, { backgroundColor: colors.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.warning + "20" }]}>
          <Ionicons name={iconName as never} size={22} color={colors.warning} />
        </View>
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: colors.mutedForeground }]}>Yeni Başarı Kazanıldı!</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{achievement.title}</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>{achievement.description}</Text>
        </View>
        <Ionicons name="trophy" size={18} color={colors.warning} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#F59E0B30",
  },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  textContent: { flex: 1, gap: 1 },
  title: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  name: { fontSize: 15, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
