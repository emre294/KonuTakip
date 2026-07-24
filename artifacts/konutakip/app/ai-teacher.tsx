/**
 * AI Teacher screen — ChatGPT-style conversational AI tutor.
 *
 * Architecture:
 *  • PremiumGate wraps the entire feature — free users see the locked state.
 *  • Messages are stored in local component state (session only).
 *  • All AI calls go through AIManager.teachTopic() — no direct provider imports.
 *  • Swapping the provider in AIManager is the only change needed for real AI.
 *
 * Layout:
 *   Header → ScrollView (empty state | messages) → Input bar
 */

import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PREMIUM_COLOR } from "@/components/PremiumBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { PremiumGate } from "@/components/PremiumGate";
import { useColors } from "@/hooks/useColors";
import { AIError, AIManager } from "@/utils/ai";
import type { AITeacherResponse } from "@/utils/ai";
import { PremiumFeature } from "@/utils/premium";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  isError?: boolean;
  /** Original user text — used for retry on error messages */
  retryText?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Parabol nedir?",
  "Limit konu anlat",
  "TYT Matematik",
  "AYT Fizik",
  "Biyoloji tekrar",
  "Türev nasıl alınır?",
];

const AI_COLOR = "#6366F1"; // indigo — distinct from premium amber

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatAIResponse(res: AITeacherResponse): string {
  const parts: string[] = [res.summary];

  if (res.keyPoints.length > 0) {
    parts.push("\n📌 Önemli Noktalar:");
    res.keyPoints.forEach((kp) => parts.push(`• ${kp}`));
  }

  if (res.practiceHint) {
    parts.push(`\nðŸ’¡ ${res.practiceHint}`);
  }

  return parts.join("\n");
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDot({
  delay,
  color,
}: {
  delay: number;
  color: string;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 280 }),
          withTiming(0, { duration: 280 })
        ),
        -1,
        false
      )
    );
    return () => {
      translateY.value = 0;
    };
  }, [delay, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

function TypingIndicator({
  colors,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Animated.View entering={FadeInLeft.duration(300)} style={styles.aiBubbleRow}>
      <View style={styles.aiAvatarWrap}>
        <View style={[styles.aiAvatar, { backgroundColor: AI_COLOR + "22" }]}>
          <Feather name="cpu" size={14} color={AI_COLOR} />
        </View>
      </View>
      <View style={[styles.aiBubble, { backgroundColor: colors.card }]}>
        <View style={styles.typingRow}>
          <TypingDot delay={0} color={colors.mutedForeground} />
          <TypingDot delay={150} color={colors.mutedForeground} />
          <TypingDot delay={300} color={colors.mutedForeground} />
          <Text
            style={[styles.typingLabel, { color: colors.mutedForeground }]}
            accessibilityLabel="AI yanıt hazırlıyor"
          >
            AI düşünüyor...
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function UserBubble({
  message,
  colors,
}: {
  message: ChatMessage;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Animated.View entering={FadeInRight.duration(300)} style={styles.userBubbleRow}>
      <View style={styles.userBubbleGroup}>
        <View
          style={[styles.userBubble, { backgroundColor: colors.primary }]}
          accessibilityLabel={`Sen: ${message.content}`}
          accessibilityRole="text"
        >
          <Text style={[styles.userBubbleText, { color: colors.primaryForeground }]}>
            {message.content}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.mutedForeground, textAlign: "right" }]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
}

function AIBubble({
  message,
  colors,
  onRetry,
}: {
  message: ChatMessage;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onRetry?: (text: string) => void;
}) {
  if (message.isError) {
    return (
      <Animated.View entering={FadeInLeft.duration(300)} style={styles.aiBubbleRow}>
        <View style={styles.aiAvatarWrap}>
          <View style={[styles.aiAvatar, { backgroundColor: "#ef444422" }]}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
          </View>
        </View>
        <View style={styles.errorBubbleGroup}>
          <View
            style={[
              styles.errorBubble,
              { backgroundColor: colors.card, borderColor: "#ef444430" },
            ]}
          >
            <Feather name="alert-triangle" size={14} color="#ef4444" style={styles.errorIcon} />
            <Text style={[styles.errorText, { color: "#ef4444" }]}>{message.content}</Text>
          </View>
          {message.retryText && onRetry ? (
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.border }]}
              onPress={() => onRetry(message.retryText!)}
              accessibilityLabel="Tekrar dene"
              accessibilityRole="button"
            >
              <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
              <Text style={[styles.retryBtnText, { color: colors.mutedForeground }]}>
                Tekrar dene
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInLeft.duration(300)} style={styles.aiBubbleRow}>
      <View style={styles.aiAvatarWrap}>
        <View style={[styles.aiAvatar, { backgroundColor: AI_COLOR + "22" }]}>
          <Feather name="cpu" size={14} color={AI_COLOR} />
        </View>
      </View>
      <View style={styles.aiBubbleGroup}>
        <View
          style={[styles.aiBubble, { backgroundColor: colors.card }]}
          accessibilityLabel={`AI Öğretmen: ${message.content}`}
          accessibilityRole="text"
        >
          <Text style={[styles.aiBubbleText, { color: colors.foreground }]}>
            {message.content}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  colors,
  onSuggestion,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onSuggestion: (text: string) => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyRoot}>
      {/* Illustration */}
      <View style={[styles.emptyIconWrap, { backgroundColor: AI_COLOR + "18" }]}>
        <Feather name="cpu" size={40} color={AI_COLOR} />
      </View>

      {/* Title + subtitle */}
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Merhaba 👋</Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
        Anlamadığın konuları sorabilir, soru çözdürebilir ve konu anlatımı isteyebilirsin.
      </Text>

      {/* Suggestion chips */}
      <View style={styles.chipsWrap}>
        {SUGGESTIONS.map((s, i) => (
          <Animated.View
            key={s}
            entering={FadeInDown.delay(80 + i * 50).duration(350)}
          >
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onSuggestion(s)}
              activeOpacity={0.7}
              accessibilityLabel={`Soru önerisi: ${s}`}
              accessibilityRole="button"
            >
              <Text
                style={[styles.chipText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {s}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Main content (inside PremiumGate) ───────────────────────────────────────

function AITeacherContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prompt } = useLocalSearchParams<{ prompt?: string | string[] }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

const [selectedAttachments, setSelectedAttachments] = useState<
  {
    kind: "image" | "pdf";
    uri: string;
    mimeType: string;
    fileName: string;
  }[]
>([]);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const incomingPrompt = Array.isArray(prompt) ? prompt[0] : prompt;

    if (typeof incomingPrompt === "string" && incomingPrompt.trim()) {
      setInputText(incomingPrompt.trim());

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [prompt]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = Math.max(insets.bottom, 8);

  // Auto-scroll to bottom whenever messages update or loading changes
  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      120
    );
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setIsLoading(true);

      try {
        const res = await AIManager.teachTopic({
          feature: "ai_teacher",
          requestedAt: new Date().toISOString(),
          topicId: `chat_${Date.now()}`,
          topicName: trimmed,
          subjectName: "Genel",
          examType: "TYT",
          userQuestion: trimmed,
        });

        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "ai",
          content: formatAIResponse(res),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Announce to screen readers
        AccessibilityInfo.announceForAccessibility("AI yanıtı hazır");
      } catch (err) {
        const userMessage =
          err instanceof AIError
            ? err.toUserMessage()
            : "Yanıt alınamadı.";

        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: "ai",
          content: userMessage,
          timestamp: new Date(),
          isError: true,
          retryText: trimmed,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      setInputText(text);
      inputRef.current?.focus();
    },
    []
  );

  const handleRetry = useCallback(
    (text: string) => {
      // Remove the error message and resend
      setMessages((prev) => prev.filter((m) => !m.isError));
      sendMessage(text);
    },
    [sendMessage]
  );

  const openCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Kamera İzni Gerekli",
        "Soru fotoğrafı çekebilmek için kamera izni vermelisin."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      setInputText("Bu soru fotoğrafını adım adım çöz ve açıkla.");
      Alert.alert("Fotoğraf Hazır", image.fileName ?? "Kameradan soru eklendi.");
    }
  }, []);

  const openGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Galeri İzni Gerekli",
        "Galeriden soru seçebilmek için fotoğraf izni vermelisin."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      setInputText("Bu soru görselini adım adım çöz ve açıkla.");
      Alert.alert("Görsel Hazır", image.fileName ?? "Galeriden soru eklendi.");
    }
  }, []);

  const openDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled) {
      const document = result.assets[0];
      setInputText("Bu dosyadaki soruyu adım adım çöz ve açıkla.");
      Alert.alert("Dosya Hazır", document.name);
    }
  }, []);

  const handleAttachment = useCallback(() => {
    Alert.alert("Soru Yükle", "Yükleme yöntemini seç.", [
      {
        text: "Kamerayla Çek",
        onPress: () => void openCamera(),
      },
      {
        text: "Galeriden Seç",
        onPress: () => void openGallery(),
      },
      {
        text: "PDF veya Dosya Seç",
        onPress: () => void openDocument(),
      },
      {
        text: "İptal",
        style: "cancel",
      },
    ]);
  }, [openCamera, openDocument, openGallery]);

  const canSend = inputText.trim().length > 0 && !isLoading;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text
              style={[styles.headerTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              AI Öğretmen
            </Text>
            <PremiumBadge size="sm" />
          </View>
          <Text
            style={[styles.headerSub, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            Yapay zekâ destekli kişisel öğretmenin
          </Text>
        </View>

        {/* Status dot */}
        <View style={styles.statusWrap} accessibilityLabel="Çevrimiçi">
          <View style={[styles.statusDot, { backgroundColor: "#22c55e" }]} />
        </View>
      </Animated.View>

      {/* ── Chat area + input ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <EmptyState colors={colors} onSuggestion={handleSuggestion} />
          ) : (
            <>
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserBubble key={msg.id} message={msg} colors={colors} />
                ) : (
                  <AIBubble
                    key={msg.id}
                    message={msg}
                    colors={colors}
                    onRetry={handleRetry}
                  />
                )
              )}
              {isLoading && <TypingIndicator colors={colors} />}
            </>
          )}
        </ScrollView>

        {/* ── Input bar ── */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: botPad + 8,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          ><TouchableOpacity
  style={styles.attachmentBtn}
  onPress={handleAttachment}
  disabled={isLoading}
  accessibilityLabel="Soru yükle"
  accessibilityRole="button"
>
  <Feather
    name="paperclip"
    size={19}
    color={isLoading ? colors.mutedForeground : colors.foreground}
  />
</TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.foreground }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Bir soru sor..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={1}
              maxLength={500}
              returnKeyType="default"
              blurOnSubmit={false}
              accessibilityLabel="Mesaj yaz"
              accessibilityHint="Sorunuzu yazın ve gönderin"
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: canSend ? colors.primary : colors.muted },
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!canSend}
              accessibilityLabel="Gönder"
              accessibilityRole="button"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Feather
                name="send"
                size={16}
                color={canSend ? colors.primaryForeground : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AITeacherScreen() {
  return (
    <PremiumGate featureId={PremiumFeature.AI_TEACHER}>
      <AITeacherContent />
    </PremiumGate>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statusWrap: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  // Messages list
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // User bubble
  userBubbleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 14,
  },
  userBubbleGroup: {
    maxWidth: "80%",
    gap: 4,
    alignItems: "flex-end",
  },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },

  // AI bubble
  aiBubbleRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 14,
    gap: 8,
    alignItems: "flex-end",
  },
  aiAvatarWrap: {
    flexShrink: 0,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBubbleGroup: {
    maxWidth: "80%",
    gap: 4,
    alignItems: "flex-start",
    flex: 1,
  },
  aiBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  aiBubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },

  // Error bubble
  errorBubbleGroup: {
    maxWidth: "80%",
    gap: 6,
    alignItems: "flex-start",
    flex: 1,
  },
  errorBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  errorIcon: { flexShrink: 0, marginTop: 2 },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    flex: 1,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  typingLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },

  // Empty state
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 32,
    gap: 14,
    minHeight: 400,
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 180,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // Input bar
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  attachmentBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    maxHeight: 132, // ~6 lines @ 22px lineHeight
    paddingTop: Platform.OS === "ios" ? 6 : 4,
    paddingBottom: Platform.OS === "ios" ? 6 : 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
