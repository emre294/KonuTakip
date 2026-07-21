import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { sendAIMessage, type AIMessage } from "@/services/aiService";

interface ChatMessage extends AIMessage {
  id: string;
}

function cleanAIText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<\/?.*?>/g, "")
    .replace(/```(?:markdown|text)?\n?/gi, "")
    .replace(/```/g, "")
    .replace(/\\\[|\\\]/g, "")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\boxed\{([^}]+)\}/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 / $2")
    .replace(/\\Longrightarrow/g, "→")
    .replace(/\\Rightarrow/g, "→")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\equiv/g, "≡")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "×")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\pmod\{([^}]+)\}/g, "(mod $1)")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "")
    .replace(/^\s*\|(.+)\|\s*$/gm, (_, row: string) => {
      const cells = row
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

      if (cells.length === 0) return "";

      return cells
        .map((cell, index) =>
          index === 0 ? `**${cell}**` : `• ${cell}`
        )
        .join("\n");
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function AICoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Merhaba! Ben KonuTakip AI çalışma koçunum. Konu anlatımı, soru çözümü veya çalışma planı hakkında bana soru sorabilirsin.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleSendMessage = async () => {
    const cleanMessage = input.trim();

    if (!cleanMessage || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanMessage,
    };

    const history: AIMessage[] = messages
      .filter((message) => message.id !== "welcome")
      .map(({ role, content }) => ({
        role,
        content,
      }));

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setChatError(null);
    setIsLoading(true);
    scrollToBottom();

    try {
      const answer = await sendAIMessage(cleanMessage, history);

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: cleanAIText(answer),
        },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Yapay zekâ yanıtı alınamadı."
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="translate-with-padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.75}
          style={[styles.backButton, { backgroundColor: colors.card }]}
        >
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={21}
              color="#8B5CF6"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              AI Çalışma Koçu
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: colors.mutedForeground },
              ]}
            >
              YKS için kişisel yardımcın
            </Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageContent,
          {
            paddingBottom: 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isUser
                  ? styles.userMessageRow
                  : styles.assistantMessageRow,
              ]}
            >
              {!isUser && (
                <View style={styles.avatar}>
                  <Ionicons name="sparkles" size={16} color="#A78BFA" />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.userBubble
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                ]}
              >
                {isUser ? (
                  <Text
                    selectable
                    style={[
                      styles.messageText,
                      { color: "#FFFFFF" },
                    ]}
                  >
                    {message.content}
                  </Text>
                ) : (
                  <Markdown
                    style={{
                      body: {
                        color: colors.foreground,
                        fontSize: 15,
                        lineHeight: 23,
                        fontFamily: "Inter_400Regular",
                      },
                      paragraph: {
                        marginTop: 0,
                        marginBottom: 12,
                      },
                      heading1: {
                        color: colors.foreground,
                        fontSize: 21,
                        lineHeight: 28,
                        fontFamily: "Inter_700Bold",
                        marginTop: 8,
                        marginBottom: 10,
                      },
                      heading2: {
                        color: colors.foreground,
                        fontSize: 18,
                        lineHeight: 25,
                        fontFamily: "Inter_700Bold",
                        marginTop: 8,
                        marginBottom: 8,
                      },
                      heading3: {
                        color: colors.foreground,
                        fontSize: 16,
                        lineHeight: 23,
                        fontFamily: "Inter_600SemiBold",
                        marginTop: 6,
                        marginBottom: 6,
                      },
                      strong: {
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                      },
                      bullet_list: {
                        marginTop: 3,
                        marginBottom: 12,
                      },
                      ordered_list: {
                        marginTop: 3,
                        marginBottom: 12,
                      },
                      list_item: {
                        marginBottom: 7,
                      },
                      code_inline: {
                        color: colors.foreground,
                        backgroundColor: colors.background,
                        borderRadius: 5,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        fontSize: 14,
                      },
                      fence: {
                        color: colors.foreground,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 12,
                        fontSize: 13,
                      },
                      blockquote: {
                        backgroundColor: "#7C3AED14",
                        borderLeftColor: "#7C3AED",
                        borderLeftWidth: 3,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      },
                    }}
                  >
                    {message.content}
                  </Markdown>
                )}
              </View>
            </View>
          );
        })}

        {isLoading && (
          <View style={[styles.messageRow, styles.assistantMessageRow]}>
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={16} color="#A78BFA" />
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
              <ActivityIndicator size="small" color="#8B5CF6" />

              <Text
                style={[
                  styles.loadingText,
                  { color: colors.mutedForeground },
                ]}
              >
                AI düşünüyor...
              </Text>
            </View>
          </View>
        )}

        {chatError && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color="#EF4444"
            />

            <Text style={styles.errorText}>{chatError}</Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputArea,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="AI koçuna bir soru sor..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            editable={!isLoading}
            returnKeyType="default"
            style={[styles.input, { color: colors.foreground }]}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!input.trim() || isLoading}
            onPress={() => void handleSendMessage()}
            style={[
              styles.sendButton,
              {
                opacity: !input.trim() || isLoading ? 0.4 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={19} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#7C3AED24",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 11,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  headerSpacer: {
    width: 42,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  assistantMessageRow: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#7C3AED24",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
  },
  errorBox: {
    marginTop: 4,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#EF444418",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  errorText: {
    flex: 1,
    color: "#EF4444",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  inputArea: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputContainer: {
    minHeight: 54,
    maxHeight: 140,
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 15,
    paddingRight: 7,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: 9,
    paddingBottom: 8,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
});

