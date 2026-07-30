/**
 * AI Teacher screen â€” ChatGPT-style conversational AI tutor.
 *
 * Architecture:
 *  â€¢ PremiumGate wraps the entire feature â€” free users see the locked state.
 *  â€¢ Messages are stored in local component state (session only).
 *  â€¢ All AI calls go through AIManager.teachTopic() â€” no direct provider imports.
 *  â€¢ Swapping the provider in AIManager is the only change needed for real AI.
 *
 * Layout:
 *   Header â†’ ScrollView (empty state | messages) â†’ Input bar
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Markdown from "react-native-markdown-display";
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
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { AIError, AIManager } from "@/utils/ai";
import type { AITeacherResponse } from "@/utils/ai";
import { PremiumFeature } from "@/utils/premium";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  isError?: boolean;
  /** Original user text â€” used for retry on error messages */
  retryText?: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SUGGESTIONS = [
  "Parabol nedir?",
  "Limit konu anlat",
  "TYT Matematik",
  "AYT Fizik",
  "Biyoloji tekrar",
  "Türev nasıl alınır?",
];

const AI_COLOR = "#7C3AED";
const AI_TEACHER_HISTORY_KEY = "konutakip_ai_teacher_history_v1";
const AI_TEACHER_MAX_MESSAGES = 80;

type StoredTeacherMessage = Omit<ChatMessage, "timestamp"> & {
  timestamp: string;
};

function parseTeacherMessages(value: string | null): ChatMessage[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as StoredTeacherMessage[];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (message) =>
          message &&
          typeof message.id === "string" &&
          (message.role === "user" || message.role === "ai") &&
          typeof message.content === "string"
      )
      .slice(-AI_TEACHER_MAX_MESSAGES)
      .map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      }));
  } catch {
    return [];
  }
}

function serializeTeacherMessages(messages: ChatMessage[]): string {
  return JSON.stringify(
    messages.slice(-AI_TEACHER_MAX_MESSAGES).map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }))
  );
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * The real AI response lands in `res.summary` as a raw Markdown string.
 * We display it directly â€” the Markdown renderer handles all formatting.
 */
function normalizeAIText(value: string): string {
  let result = value
    .replace(/\r\n/g, "\n")
    .replace(/\\\[/g, "\n")
    .replace(/\\\]/g, "\n")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1");

  result = result
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "âˆš($1)")
    .replace(/\\lim_\{([^{}]+)\}/g, "limit ($1)")
    .replace(/\\lim/g, "limit")
    .replace(/\\text\s*\{([^{}]+)\}/g, "$1")
    .replace(/\\boxed\s*\{([^{}]+)\}/g, "$1")
    .replace(/\\overline\s*\{([^{}]+)\}/g, "$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot|\\times/g, "Ã—")
    .replace(/\\div/g, "Ã·")
    .replace(/\\neq/g, "â‰ ")
    .replace(/\\leq?/g, "â‰¤")
    .replace(/\\geq?/g, "â‰¥")
    .replace(/\\to/g, "â†’")
    .replace(/\\Delta/g, "Î”")
    .replace(/\\pi/g, "Ï€")
    .replace(/\\pm/g, "Â±")
    .replace(/\\infty/g, "âˆž")
    .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, "")
    .replace(/\\qquad|\\quad/g, " ")
    .replace(/\\\\/g, "\n")
    .replace(/&=/g, "=")
    .replace(/&/g, " ");

  const superscripts: Record<string, string> = {
    "0": "â°",
    "1": "Â¹",
    "2": "Â²",
    "3": "Â³",
    "4": "â´",
    "5": "âµ",
    "6": "â¶",
    "7": "â·",
    "8": "â¸",
    "9": "â¹",
    "-": "â»",
  };

  result = result.replace(
    /\^\{?(-?\d+)\}?/g,
    (_match, exponent: string) =>
      exponent
        .split("")
        .map((character) => superscripts[character] ?? character)
        .join("")
  );

  return result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanMarkdownSpacing(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\s*\n+/, "")
    .replace(/\n+\s*$/, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^(#{1,3}\s+.+)\n{2,}/gm, "$1\n")
    .replace(/\n{2,}(-\s+)/g, "\n$1")
    .replace(/(-\s+.+)\n{2,}(-\s+)/g, "$1\n$2")
    .trim();
}

function formatAIResponse(res: AITeacherResponse): string {
  const normalized = cleanMarkdownSpacing(
    normalizeAIText(res.summary ?? "")
  );

  if (!normalized) {
    return "Yanıt oluşturuldu ancak açıklama metni boş geldi. Lütfen tekrar dene.";
  }

  return normalized;
}

// â”€â”€â”€ Typing indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    <Animated.View
      entering={FadeInLeft.duration(300)}
      style={styles.aiBubbleRow}
    >
      <View style={styles.aiAvatarWrap}>
        <View style={styles.aiAvatar}>
          <Feather name="zap" size={15} color="#FFFFFF" />
        </View>
      </View>

      <View
        style={[
          styles.loadingBubble,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <ActivityIndicator size="small" color={AI_COLOR} />

        <Text
          style={[
            styles.loadingText,
            { color: colors.mutedForeground },
          ]}
        >
          AI düşünüyor...
        </Text>
      </View>
    </Animated.View>
  );
}

// â”€â”€â”€ Message bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

function buildMarkdownStyles(
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>
) {
  return {
    body: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 23,
    },
    heading1: {
      color: colors.foreground,
      fontSize: 20,
      lineHeight: 27,
      fontFamily: "Inter_700Bold",
      marginTop: 8,
      marginBottom: 4,
    },
    heading2: {
      color: colors.foreground,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: "Inter_700Bold",
      marginTop: 8,
      marginBottom: 3,
    },
    heading3: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: "Inter_600SemiBold",
      marginTop: 6,
      marginBottom: 2,
    },
    strong: {
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    em: {
      fontFamily: "Inter_400Regular",
      fontStyle: "italic" as const,
      color: colors.foreground,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 4,
    },
    bullet_list: {
      marginTop: 3,
      marginBottom: 8,
    },
    ordered_list: {
      marginTop: 3,
      marginBottom: 8,
    },
    list_item: {
      marginBottom: 4,
    },
    bullet_list_icon: {
      color: AI_COLOR,
      marginTop: 5,
    },
    bullet_list_content: {
      flex: 1,
    },
    ordered_list_icon: {
      color: AI_COLOR,
      fontFamily: "Inter_600SemiBold",
    },
    blockquote: {
      backgroundColor: AI_COLOR + "12",
      borderLeftColor: AI_COLOR,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 6,
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: colors.muted,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      borderRadius: 4,
      paddingHorizontal: 4,
      fontSize: 14,
    },
    fence: {
      backgroundColor: colors.muted,
      color: colors.foreground,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      lineHeight: 21,
    },
    hr: {
      backgroundColor: colors.border,
      marginVertical: 8,
    },
  };
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
  const mdStyles = buildMarkdownStyles(colors);

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
          <Feather name="zap" size={15} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.aiBubbleGroup}>
        <View
          style={[styles.aiBubble, { backgroundColor: colors.card }]}
          accessibilityRole="text"
          accessibilityLabel={`AI Öğretmen yanıtı`}
        >
          <Markdown style={mdStyles}>
            {message.content}
          </Markdown>
        </View>
        <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
}

// â”€â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Main content (inside PremiumGate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AITeacherContent() {
  const colors = useColors();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const { prompt } = useLocalSearchParams<{ prompt?: string | string[] }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

const [selectedAttachments, setSelectedAttachments] = useState<
  {
    kind: "image" | "pdf";
    uri: string;
    mimeType: string;
    fileName: string;
    base64: string;
  }[]
>([]);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(AI_TEACHER_HISTORY_KEY)
      .then((stored) => {
        if (!active) return;
        setMessages(parseTeacherMessages(stored));
      })
      .catch(() => {
        if (!active) return;
        setMessages([]);
      })
      .finally(() => {
        if (active) setIsHistoryLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHistoryLoaded) return;

    AsyncStorage.setItem(
      AI_TEACHER_HISTORY_KEY,
      serializeTeacherMessages(messages)
    ).catch(() => {});
  }, [isHistoryLoaded, messages]);



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
      const attachmentsToSend = [...selectedAttachments];

      if ((!trimmed && attachmentsToSend.length === 0) || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content:
          trimmed ||
          attachmentsToSend.map((item) => `ðŸ“Ž ${item.fileName}`).join("\n"),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setSelectedAttachments([]);
      setIsLoading(true);
        try {
          const recentConversation = messages
            .filter((message) => !message.isError)
            .slice(-10)
            .map((message) => {
              const speaker =
                message.role === "user" ? "Ã–ÄŸrenci" : "AI Ã–ÄŸretmen";

              return `${speaker}: ${message.content}`;
            })
            .join("\n\n");

          const studentName = profile?.name?.trim() || "Ã–ÄŸrenci";

          const contextualQuestion = [
            `Ã–ÄŸrencinin adÄ±: ${studentName}`,
            recentConversation
              ? `Ã–nceki konuÅŸma:\n${recentConversation}`
              : "",
            `Yeni istek: ${
              trimmed ||
              "YÃ¼klenen soru veya dosyayÄ± analiz et, adÄ±m adÄ±m Ã§Ã¶z ve aÃ§Ä±kla."
            }`,
            "Ã–ÄŸrencinin adÄ±nÄ± her cevapta tekrar etme. YalnÄ±zca doÄŸal ve gerekli olduÄŸunda kullan.",
          ]
            .filter(Boolean)
            .join("\n\n");

          const res = await AIManager.teachTopic({
          feature: "ai_teacher",
          requestedAt: new Date().toISOString(),
          topicId: `chat_${Date.now()}`,
          topicName: trimmed,
          subjectName: "Genel",
          examType: "TYT",
          userQuestion: contextualQuestion,
          attachments: attachmentsToSend,
        });

        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "ai",
          content: formatAIResponse(res),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Announce to screen readers
        AccessibilityInfo.announceForAccessibility("AI yanÄ±tÄ± hazÄ±r");
      } catch (err) {
        const userMessage =
          err instanceof AIError
            ? err.toUserMessage()
            : "YanÄ±t alÄ±namadÄ±.";

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
    [isLoading, messages, profile?.name, selectedAttachments]
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
        "Kamera Ä°zni Gerekli",
        "Soru fotoÄŸrafÄ± Ã§ekebilmek iÃ§in kamera izni vermelisin."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
      base64: true,
    });

    if (!result.canceled) {
      const image = result.assets[0];

      if (!image.base64) {
        Alert.alert("Hata", "FotoÄŸraf okunamadÄ±.");
        return;
      }

      setSelectedAttachments([
        {
          kind: "image",
          uri: image.uri,
          mimeType: image.mimeType ?? "image/jpeg",
          fileName: image.fileName ?? `kamera-${Date.now()}.jpg`,
          base64: image.base64,
        },
      ]);

      setInputText("Bu soru fotoÄŸrafÄ±nÄ± adÄ±m adÄ±m Ã§Ã¶z ve aÃ§Ä±kla.");
    }
  }, []);

  const openGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Galeri Ä°zni Gerekli",
        "Galeriden soru seÃ§ebilmek iÃ§in fotoÄŸraf izni vermelisin."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
      base64: true,
      mediaTypes: ["images"],
    });

    if (!result.canceled) {
      const image = result.assets[0];

      if (!image.base64) {
        Alert.alert("Hata", "GÃ¶rsel okunamadÄ±.");
        return;
      }

      setSelectedAttachments([
        {
          kind: "image",
          uri: image.uri,
          mimeType: image.mimeType ?? "image/jpeg",
          fileName: image.fileName ?? `galeri-${Date.now()}.jpg`,
          base64: image.base64,
        },
      ]);

      setInputText("Bu soru gÃ¶rselini adÄ±m adÄ±m Ã§Ã¶z ve aÃ§Ä±kla.");
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

      if (document.size && document.size > 8 * 1024 * 1024) {
        Alert.alert("Dosya Ã‡ok BÃ¼yÃ¼k", "En fazla 8 MB dosya yÃ¼kleyebilirsin.");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(document.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setSelectedAttachments([
        {
          kind: document.mimeType === "application/pdf" ? "pdf" : "image",
          uri: document.uri,
          mimeType: document.mimeType ?? "application/octet-stream",
          fileName: document.name,
          base64,
        },
      ]);

      setInputText("Bu dosyadaki soruyu adÄ±m adÄ±m Ã§Ã¶z ve aÃ§Ä±kla.");
    }
  }, []);

  const handleAttachment = useCallback(() => {
    Alert.alert("Soru YÃ¼kle", "YÃ¼kleme yÃ¶ntemini seÃ§.", [
      {
        text: "Kamerayla Ã‡ek",
        onPress: () => void openCamera(),
      },
      {
        text: "Galeriden SeÃ§",
        onPress: () => void openGallery(),
      },
      {
        text: "PDF veya Dosya SeÃ§",
        onPress: () => void openDocument(),
      },
      {
        text: "Ä°ptal",
        style: "cancel",
      },
    ]);
  }, [openCamera, openDocument, openGallery]);

  const canSend =
    (inputText.trim().length > 0 || selectedAttachments.length > 0) &&
    !isLoading;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* â”€â”€ Header â”€â”€ */}
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
              ✨ Premium AI Öğretmen
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

      {/* â”€â”€ Chat area + input â”€â”€ */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="translate-with-padding"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
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

        {/* â”€â”€ Input bar â”€â”€ */}
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
          {selectedAttachments.length > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(220)}
              style={[
                styles.attachmentPreview,
                {
                  backgroundColor: colors.card,
                  borderColor: "rgba(124,58,237,0.30)",
                },
              ]}
            >
              <View style={styles.attachmentIcon}>
                <Feather
                  name={
                    selectedAttachments[0].kind === "pdf"
                      ? "file-text"
                      : "image"
                  }
                  size={18}
                  color={AI_COLOR}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.attachmentName,
                    { color: colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {selectedAttachments[0].fileName}
                </Text>

                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {selectedAttachments[0].kind === "pdf"
                    ? "PDF analize hazır"
                    : "Görsel analize hazır"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedAttachments([])}
                disabled={isLoading}
                accessibilityLabel="Eki kaldır"
                style={[
                  styles.removeAttachmentBtn,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Feather
                  name="x"
                  size={17}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </Animated.View>
          ) : null}

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
              textAlignVertical="top"
              maxLength={2000}
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

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AITeacherScreen() {
  return (
    <PremiumGate featureId={PremiumFeature.AI_TEACHER}>
      <AITeacherContent />
    </PremiumGate>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    marginBottom: 8,
  },
  userBubbleGroup: {
    maxWidth: "88%",
    gap: 2,
    alignItems: "flex-end",
  },
  userBubble: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 18,
    borderTopRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
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
    marginBottom: 10,
    gap: 8,
    alignItems: "flex-end",
  },
  aiAvatarWrap: {
    flexShrink: 0,
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.55)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  aiBubbleGroup: {
    maxWidth: "88%",
    gap: 2,
    alignItems: "flex-start",
    flex: 1,
  },
  aiBubble: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 18,
    borderTopLeftRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.28)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  aiBubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },

  // Error bubble
  errorBubbleGroup: {
    maxWidth: "88%",
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
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#7C3AED",
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },

  // Typing indicator
  typingRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 2,
  },
  typingLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  loadingBubble: {
    minHeight: 44,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
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
    minHeight: 54,
    maxHeight: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 8,
    paddingRight: 7,
    paddingVertical: 6,
    gap: 7,
    borderColor: "rgba(124,58,237,0.28)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  attachmentPreview: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 9,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderColor: "rgba(124,58,237,0.30)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 9,
    elevation: 2,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  attachmentBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: 9,
    paddingBottom: 8,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },

  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(124,58,237,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeAttachmentBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
