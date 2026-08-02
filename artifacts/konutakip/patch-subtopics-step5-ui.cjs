const fs = require("fs");

const path = "./app/(tabs)/subjects.tsx";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function replaceOnce(oldText, newText, label) {
  const count = code.split(oldText).length - 1;

  ensure(
    count === 1,
    `${label}: beklenen 1 eşleşme, bulunan ${count}`,
  );

  code = code.replace(oldText, newText);
}

/* =========================================================
 * 1. TOPIC ROW BİLEŞENİNİ ALT KAZANIMLI YAPIYLA DEĞİŞTİR
 * ========================================================= */

const topicRowStart = code.indexOf(
  "interface TopicRowProps {",
);

const subjectCardMarker = code.indexOf(
  "// ─── Subject card",
  topicRowStart,
);

ensure(
  topicRowStart !== -1,
  "TopicRowProps başlangıcı bulunamadı",
);

ensure(
  subjectCardMarker !== -1,
  "Subject card işaretçisi bulunamadı",
);

const newTopicRow = `interface TopicRowProps {
  topicId: string;
  topicName: string;
  subtopics?: Array<{
    id: string;
    name: string;
  }>;
  completed: boolean;
  solvedCount: number;
  hasReminder: boolean;
  subtopicCompletion: Record<string, boolean>;
  onToggle: () => void;
  onToggleSubtopic: (
    topicId: string,
    subtopicId: string,
  ) => void;
  onSetSolved: (count: number) => void;
  onBellPress: () => void;
  colors: ReturnType<
    typeof import("@/hooks/useColors").useColors
  >;
}

function TopicRow({
  topicId,
  topicName,
  subtopics,
  completed,
  solvedCount,
  hasReminder,
  subtopicCompletion,
  onToggle,
  onToggleSubtopic,
  onSetSolved,
  onBellPress,
  colors,
}: TopicRowProps) {
  const scale = useSharedValue(1);
  const [subtopicsExpanded, setSubtopicsExpanded] =
    useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const hasSubtopics =
    Array.isArray(subtopics) &&
    subtopics.length > 0;

  const completedSubtopicCount =
    subtopics?.filter(
      (subtopic) =>
        !!subtopicCompletion[subtopic.id],
    ).length ?? 0;

  const subtopicPct =
    hasSubtopics
      ? Math.round(
          (completedSubtopicCount /
            subtopics!.length) *
            100,
        )
      : completed
        ? 100
        : 0;

  function handlePress() {
    scale.value = withTiming(
      0.96,
      { duration: 70 },
      () => {
        scale.value = withTiming(
          1,
          { duration: 120 },
        );
      },
    );

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light,
    );

    onToggle();
  }

  function handleExpand() {
    if (!hasSubtopics) {
      return;
    }

    setSubtopicsExpanded(
      (previous) => !previous,
    );

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light,
    );
  }

  return (
    <Animated.View style={animStyle}>
      <View
        style={[
          styles.topicRow,
          {
            borderBottomColor:
              subtopicsExpanded
                ? "transparent"
                : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          style={styles.topicCheckBtn}
        >
          <View
            style={[
              styles.topicCheck,
              {
                borderColor: completed
                  ? colors.success
                  : colors.border,
                backgroundColor: completed
                  ? colors.success
                  : "transparent",
              },
            ]}
          >
            {completed && (
              <Feather
                name="check"
                size={11}
                color="#fff"
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={
            hasSubtopics ? 0.72 : 1
          }
          disabled={!hasSubtopics}
          onPress={handleExpand}
          style={styles.topicMainContent}
        >
          <View style={styles.topicTitleRow}>
            <Text
              style={[
                styles.topicName,
                {
                  color: completed
                    ? colors.mutedForeground
                    : colors.foreground,
                  textDecorationLine: completed
                    ? "line-through"
                    : "none",
                },
              ]}
              numberOfLines={2}
            >
              {topicName}
            </Text>

            {hasSubtopics && (
              <Ionicons
                name={
                  subtopicsExpanded
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={16}
                color={colors.mutedForeground}
              />
            )}
          </View>

          {hasSubtopics && (
            <View style={styles.subtopicSummary}>
              <Text
                style={[
                  styles.subtopicSummaryText,
                  {
                    color:
                      completedSubtopicCount > 0
                        ? colors.primary
                        : colors.mutedForeground,
                  },
                ]}
              >
                {completedSubtopicCount}/
                {subtopics!.length} kazanım
              </Text>

              <View
                style={[
                  styles.subtopicMiniProgress,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.subtopicMiniProgressFill,
                    {
                      width: \`\${subtopicPct}%\`,
                      backgroundColor:
                        completed
                          ? colors.success
                          : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.topicRight}>
          <TextInput
            style={[
              styles.solvedInput,
              {
                backgroundColor:
                  colors.secondary,
                color: colors.foreground,
                borderColor: colors.border,
              },
              solvedCount >= 10000
                ? { fontSize: 10 }
                : solvedCount >= 1000
                  ? { fontSize: 11 }
                  : null,
              Platform.OS === "android" && {
                textAlignVertical: "center",
                includeFontPadding: false,
                paddingVertical: 0,
              },
            ]}
            value={
              solvedCount > 0
                ? String(solvedCount)
                : ""
            }
            onChangeText={(value) => {
              const count =
                parseInt(
                  value.replace(
                    /[^0-9]/g,
                    "",
                  ),
                ) || 0;

              onSetSolved(count);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={
              colors.mutedForeground
            }
            maxLength={5}
            selectTextOnFocus
          />

          <Text
            style={[
              styles.soruLabel,
              {
                color:
                  colors.mutedForeground,
              },
            ]}
          >
            soru
          </Text>

          <TouchableOpacity
            onPress={onBellPress}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Feather
              name={
                hasReminder
                  ? "bell"
                  : "bell-off"
              }
              size={14}
              color={
                hasReminder
                  ? colors.warning
                  : colors.border
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {hasSubtopics &&
        subtopicsExpanded && (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[
              styles.subtopicsContainer,
              {
                backgroundColor:
                  colors.secondary + "55",
                borderBottomColor:
                  colors.border,
              },
            ]}
          >
            {subtopics!.map(
              (subtopic, index) => {
                const subtopicCompleted =
                  !!subtopicCompletion[
                    subtopic.id
                  ];

                return (
                  <TouchableOpacity
                    key={subtopic.id}
                    activeOpacity={0.72}
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics
                          .ImpactFeedbackStyle
                          .Light,
                      );

                      onToggleSubtopic(
                        topicId,
                        subtopic.id,
                      );
                    }}
                    style={[
                      styles.subtopicRow,
                      index <
                        subtopics!.length -
                          1 && {
                        borderBottomWidth:
                          StyleSheet
                            .hairlineWidth,
                        borderBottomColor:
                          colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.subtopicCheck,
                        {
                          borderColor:
                            subtopicCompleted
                              ? colors.success
                              : colors.border,
                          backgroundColor:
                            subtopicCompleted
                              ? colors.success
                              : colors.card,
                        },
                      ]}
                    >
                      {subtopicCompleted && (
                        <Feather
                          name="check"
                          size={10}
                          color="#FFFFFF"
                        />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.subtopicName,
                        {
                          color:
                            subtopicCompleted
                              ? colors
                                  .mutedForeground
                              : colors
                                  .foreground,
                          textDecorationLine:
                            subtopicCompleted
                              ? "line-through"
                              : "none",
                        },
                      ]}
                    >
                      {subtopic.name}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </Animated.View>
        )}
    </Animated.View>
  );
}

`;

code =
  code.slice(0, topicRowStart) +
  newTopicRow +
  code.slice(subjectCardMarker);

/* =========================================================
 * 2. SUBJECT CARD PROPLARINA ALT KAZANIMLARI EKLE
 * ========================================================= */

replaceOnce(
`  topicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;`,
`  topicCompletion: Record<string, boolean>;
  subtopicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;`,
  "SubjectCardProps subtopicCompletion",
);

replaceOnce(
`  onToggle: (id: string) => void;
  onSetSolved: (topicId: string, count: number) => void;`,
`  onToggle: (id: string) => void;
  onToggleSubtopic: (
    topicId: string,
    subtopicId: string,
  ) => void;
  onSetSolved: (topicId: string, count: number) => void;`,
  "SubjectCardProps onToggleSubtopic",
);

replaceOnce(
`  subject, topicCompletion, topicSolvedQuestions, topicReminders,
  onToggle, onSetSolved, onBellPress, colors,`,
`  subject,
  topicCompletion,
  subtopicCompletion,
  topicSolvedQuestions,
  topicReminders,
  onToggle,
  onToggleSubtopic,
  onSetSolved,
  onBellPress,
  colors,`,
  "SubjectCard destructuring",
);

/* =========================================================
 * 3. TOPIC ROW ÇAĞRISINA ALT KAZANIMLARI BAĞLA
 * ========================================================= */

replaceOnce(
`              topicName={t.name}
              completed={!!topicCompletion[t.id]}
              solvedCount={topicSolvedQuestions[t.id] ?? 0}`,
`              topicName={t.name}
              subtopics={t.subtopics}
              completed={!!topicCompletion[t.id]}
              subtopicCompletion={subtopicCompletion}
              solvedCount={topicSolvedQuestions[t.id] ?? 0}`,
  "TopicRow subtopic props",
);

replaceOnce(
`              onToggle={() => onToggle(t.id)}
              onSetSolved={(count) => handleSetSolved(t.id, count)}`,
`              onToggle={() => onToggle(t.id)}
              onToggleSubtopic={onToggleSubtopic}
              onSetSolved={(count) => handleSetSolved(t.id, count)}`,
  "TopicRow toggleSubtopic",
);

/* =========================================================
 * 4. EXAM SECTION PROPLARINA ALT KAZANIMLARI EKLE
 * ========================================================= */

const examSectionStart =
  code.indexOf("interface ExamSectionProps {");

const screenMarker =
  code.indexOf("// ─── Screen", examSectionStart);

ensure(
  examSectionStart !== -1,
  "ExamSectionProps bulunamadı",
);

ensure(
  screenMarker !== -1,
  "Screen işaretçisi bulunamadı",
);

let examBlock = code.slice(
  examSectionStart,
  screenMarker,
);

examBlock = examBlock.replace(
`  topicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;`,
`  topicCompletion: Record<string, boolean>;
  subtopicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;`,
);

examBlock = examBlock.replace(
`  onToggle: (id: string) => void;
  onSetSolved: (topicId: string, count: number) => void;`,
`  onToggle: (id: string) => void;
  onToggleSubtopic: (
    topicId: string,
    subtopicId: string,
  ) => void;
  onSetSolved: (topicId: string, count: number) => void;`,
);

examBlock = examBlock.replace(
`  title, subjects, topicCompletion, topicSolvedQuestions, topicReminders,
  onToggle, onSetSolved, onBellPress, accentColor, colors,`,
`  title,
  subjects,
  topicCompletion,
  subtopicCompletion,
  topicSolvedQuestions,
  topicReminders,
  onToggle,
  onToggleSubtopic,
  onSetSolved,
  onBellPress,
  accentColor,
  colors,`,
);

examBlock = examBlock.replace(
`              topicCompletion={topicCompletion}
              topicSolvedQuestions={topicSolvedQuestions}`,
`              topicCompletion={topicCompletion}
              subtopicCompletion={subtopicCompletion}
              topicSolvedQuestions={topicSolvedQuestions}`,
);

examBlock = examBlock.replace(
`              onToggle={onToggle}
              onSetSolved={onSetSolved}`,
`              onToggle={onToggle}
              onToggleSubtopic={onToggleSubtopic}
              onSetSolved={onSetSolved}`,
);

ensure(
  examBlock.includes(
    "subtopicCompletion: Record<string, boolean>;",
  ),
  "ExamSection subtopicCompletion eklenemedi",
);

ensure(
  examBlock.includes(
    "onToggleSubtopic:",
  ),
  "ExamSection onToggleSubtopic eklenemedi",
);

code =
  code.slice(0, examSectionStart) +
  examBlock +
  code.slice(screenMarker);

/* =========================================================
 * 5. SCREEN CONTEXT BAĞLANTISI
 * ========================================================= */

replaceOnce(
`    profile, topicCompletion, toggleTopic,
    topicSolvedQuestions, setTopicSolvedQuestion,`,
`    profile,
    topicCompletion,
    toggleTopic,
    subtopicCompletion,
    toggleSubtopic,
    topicSolvedQuestions,
    setTopicSolvedQuestion,`,
  "SubjectsScreen useApp",
);

/* TYT ve AYT ExamSection çağrılarının ikisini de güncelle */

const examCallPattern =
  /topicCompletion=\{topicCompletion\}\n(\s*)topicSolvedQuestions=\{topicSolvedQuestions\}/g;

const examCallMatches =
  [...code.matchAll(examCallPattern)];

ensure(
  examCallMatches.length === 2,
  `ExamSection çağrısı beklenen 2, bulunan ${examCallMatches.length}`,
);

code = code.replace(
  examCallPattern,
`topicCompletion={topicCompletion}
$1subtopicCompletion={subtopicCompletion}
$1topicSolvedQuestions={topicSolvedQuestions}`,
);

const toggleCallPattern =
  /onToggle=\{toggleTopic\}\n(\s*)onSetSolved=\{setTopicSolvedQuestion\}/g;

const toggleCallMatches =
  [...code.matchAll(toggleCallPattern)];

ensure(
  toggleCallMatches.length === 2,
  `ExamSection toggle çağrısı beklenen 2, bulunan ${toggleCallMatches.length}`,
);

code = code.replace(
  toggleCallPattern,
`onToggle={toggleTopic}
$1onToggleSubtopic={toggleSubtopic}
$1onSetSolved={setTopicSolvedQuestion}`,
);

/* =========================================================
 * 6. ALT KAZANIM STİLLERİ
 * ========================================================= */

ensure(
  !code.includes("subtopicsContainer:"),
  "Alt kazanım stilleri zaten mevcut",
);

const styleEnd = code.lastIndexOf("\n});");

ensure(
  styleEnd !== -1,
  "StyleSheet kapanışı bulunamadı",
);

const subtopicStyles = `,
  topicMainContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  topicTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subtopicSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
  },
  subtopicSummaryText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    minWidth: 66,
  },
  subtopicMiniProgress: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    maxWidth: 90,
  },
  subtopicMiniProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  subtopicsContainer: {
    paddingLeft: 46,
    paddingRight: 14,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtopicRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  subtopicCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  subtopicName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  }`;

code =
  code.slice(0, styleEnd) +
  subtopicStyles +
  code.slice(styleEnd);

/* =========================================================
 * 7. SON KONTROLLER
 * ========================================================= */

ensure(
  code.includes(
    "subtopics?: Array<{",
  ),
  "TopicRow subtopics tipi yok",
);

ensure(
  code.includes(
    "subtopicCompletion: Record<string, boolean>;",
  ),
  "Subtopic completion prop yok",
);

ensure(
  code.includes(
    "onToggleSubtopic={onToggleSubtopic}",
  ),
  "TopicRow toggleSubtopic bağlantısı yok",
);

ensure(
  code.includes(
    "subtopicCompletion={subtopicCompletion}",
  ),
  "Alt kazanım durumu bağlanmadı",
);

ensure(
  code.includes(
    "onToggleSubtopic={toggleSubtopic}",
  ),
  "Context toggleSubtopic bağlanmadı",
);

ensure(
  code.includes(
    "subtopicsContainer:",
  ),
  "Alt kazanım stilleri eklenmedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
