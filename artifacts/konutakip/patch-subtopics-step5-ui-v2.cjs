const fs = require("fs");

const path = "./app/(tabs)/subjects.tsx";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function replaceRequired(pattern, replacement, label) {
  ensure(
    pattern.test(code),
    label + " bulunamadı",
  );

  code = code.replace(pattern, replacement);
}

function updateInterface(
  interfaceName,
  updater,
) {
  const pattern = new RegExp(
    `interface\\s+${interfaceName}\\s*\\{[\\s\\S]*?\\n\\}`,
  );

  const match = code.match(pattern);

  ensure(
    match,
    interfaceName + " bulunamadı",
  );

  const updated = updater(match[0]);

  ensure(
    updated !== match[0],
    interfaceName + " değiştirilemedi",
  );

  code = code.replace(
    match[0],
    updated,
  );
}

/* =========================================================
 * 1. TOPIC ROW BİLEŞENİNİ YENİLE
 * ========================================================= */

const topicRowStart = code.indexOf(
  "interface TopicRowProps",
);

const subjectCardMarker = code.indexOf(
  "// ─── Subject card",
  topicRowStart,
);

ensure(
  topicRowStart !== -1,
  "TopicRowProps bulunamadı",
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

  function handleComplete() {
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
          onPress={handleComplete}
          activeOpacity={0.7}
          style={styles.topicCheckButton}
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
                color="#FFFFFF"
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
                const isCompleted =
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
                            isCompleted
                              ? colors.success
                              : colors.border,
                          backgroundColor:
                            isCompleted
                              ? colors.success
                              : colors.card,
                        },
                      ]}
                    >
                      {isCompleted && (
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
                            isCompleted
                              ? colors
                                  .mutedForeground
                              : colors
                                  .foreground,
                          textDecorationLine:
                            isCompleted
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
 * 2. SUBJECT CARD PROPLARI
 * ========================================================= */

updateInterface(
  "SubjectCardProps",
  (block) => {
    let updated = block;

    if (
      !updated.includes(
        "subtopicCompletion:",
      )
    ) {
      updated = updated.replace(
        /(\s+topicCompletion:\s*Record<string,\s*boolean>;\s*\n)/,
        `$1  subtopicCompletion: Record<string, boolean>;\n`,
      );
    }

    if (
      !updated.includes(
        "onToggleSubtopic:",
      )
    ) {
      updated = updated.replace(
        /(\s+onToggle:\s*\(id:\s*string\)\s*=>\s*void;\s*\n)/,
        `$1  onToggleSubtopic: (\n    topicId: string,\n    subtopicId: string,\n  ) => void;\n`,
      );
    }

    return updated;
  },
);

replaceRequired(
  /function SubjectCard\(\{\s*subject,\s*topicCompletion,\s*topicSolvedQuestions,\s*topicReminders,\s*onToggle,\s*onSetSolved,\s*onBellPress,\s*colors,\s*\}:\s*SubjectCardProps\)/,
`function SubjectCard({
  subject,
  topicCompletion,
  subtopicCompletion,
  topicSolvedQuestions,
  topicReminders,
  onToggle,
  onToggleSubtopic,
  onSetSolved,
  onBellPress,
  colors,
}: SubjectCardProps)`,
  "SubjectCard parametreleri",
);

/* =========================================================
 * 3. SUBJECT CARD İÇİNDE TOPIC ROW BAĞLANTISI
 * ========================================================= */

replaceRequired(
  /topicName=\{t\.name\}\s*\n(\s*)completed=\{!!topicCompletion\[t\.id\]\}/,
`topicName={t.name}
$1subtopics={t.subtopics}
$1completed={!!topicCompletion[t.id]}
$1subtopicCompletion={subtopicCompletion}`,
  "TopicRow alt kazanım propları",
);

replaceRequired(
  /onToggle=\{\(\)\s*=>\s*onToggle\(t\.id\)\}\s*\n(\s*)onSetSolved=/,
`onToggle={() => onToggle(t.id)}
$1onToggleSubtopic={onToggleSubtopic}
$1onSetSolved=`,
  "TopicRow toggleSubtopic",
);

/* =========================================================
 * 4. EXAM SECTION PROPLARI
 * ========================================================= */

updateInterface(
  "ExamSectionProps",
  (block) => {
    let updated = block;

    if (
      !updated.includes(
        "subtopicCompletion:",
      )
    ) {
      updated = updated.replace(
        /(\s+topicCompletion:\s*Record<string,\s*boolean>;\s*\n)/,
        `$1  subtopicCompletion: Record<string, boolean>;\n`,
      );
    }

    if (
      !updated.includes(
        "onToggleSubtopic:",
      )
    ) {
      updated = updated.replace(
        /(\s+onToggle:\s*\(id:\s*string\)\s*=>\s*void;\s*\n)/,
        `$1  onToggleSubtopic: (\n    topicId: string,\n    subtopicId: string,\n  ) => void;\n`,
      );
    }

    return updated;
  },
);

replaceRequired(
  /function ExamSection\(\{\s*title,\s*subjects,\s*topicCompletion,\s*topicSolvedQuestions,\s*topicReminders,\s*onToggle,\s*onSetSolved,\s*onBellPress,\s*accentColor,\s*colors,\s*\}:\s*ExamSectionProps\)/,
`function ExamSection({
  title,
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
  colors,
}: ExamSectionProps)`,
  "ExamSection parametreleri",
);

replaceRequired(
  /topicCompletion=\{topicCompletion\}\s*\n(\s*)topicSolvedQuestions=\{topicSolvedQuestions\}/,
`topicCompletion={topicCompletion}
$1subtopicCompletion={subtopicCompletion}
$1topicSolvedQuestions={topicSolvedQuestions}`,
  "SubjectCard subtopicCompletion",
);

replaceRequired(
  /onToggle=\{onToggle\}\s*\n(\s*)onSetSolved=\{onSetSolved\}/,
`onToggle={onToggle}
$1onToggleSubtopic={onToggleSubtopic}
$1onSetSolved={onSetSolved}`,
  "SubjectCard onToggleSubtopic",
);

/* =========================================================
 * 5. SCREEN useApp BAĞLANTISI
 * ========================================================= */

replaceRequired(
  /profile,\s*topicCompletion,\s*toggleTopic,\s*topicSolvedQuestions,\s*setTopicSolvedQuestion,/,
`profile,
    topicCompletion,
    toggleTopic,
    subtopicCompletion,
    toggleSubtopic,
    topicSolvedQuestions,
    setTopicSolvedQuestion,`,
  "SubjectsScreen useApp",
);

/* TYT ve AYT çağrıları */

const examSubtopicPattern =
  /topicCompletion=\{topicCompletion\}\s*\n(\s*)topicSolvedQuestions=\{topicSolvedQuestions\}/g;

const examSubtopicMatches = [
  ...code.matchAll(examSubtopicPattern),
];

ensure(
  examSubtopicMatches.length === 2,
  "ExamSection subtopic çağrısı 2 adet bulunamadı: " +
    examSubtopicMatches.length,
);

code = code.replace(
  examSubtopicPattern,
`topicCompletion={topicCompletion}
$1subtopicCompletion={subtopicCompletion}
$1topicSolvedQuestions={topicSolvedQuestions}`,
);

const examTogglePattern =
  /onToggle=\{toggleTopic\}\s*\n(\s*)onSetSolved=\{setTopicSolvedQuestion\}/g;

const examToggleMatches = [
  ...code.matchAll(examTogglePattern),
];

ensure(
  examToggleMatches.length === 2,
  "ExamSection toggle çağrısı 2 adet bulunamadı: " +
    examToggleMatches.length,
);

code = code.replace(
  examTogglePattern,
`onToggle={toggleTopic}
$1onToggleSubtopic={toggleSubtopic}
$1onSetSolved={setTopicSolvedQuestion}`,
);

/* =========================================================
 * 6. STİLLER
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

const newStyles = `,
  topicCheckButton: {
    alignItems: "center",
    justifyContent: "center",
  },
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
    maxWidth: 90,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
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
  newStyles +
  code.slice(styleEnd);

/* =========================================================
 * 7. SON KONTROLLER
 * ========================================================= */

ensure(
  code.includes(
    "subtopics={t.subtopics}",
  ),
  "Topic subtopics bağlanmadı",
);

ensure(
  code.includes(
    "subtopicCompletion={subtopicCompletion}",
  ),
  "Subtopic completion bağlanmadı",
);

ensure(
  code.includes(
    "onToggleSubtopic={toggleSubtopic}",
  ),
  "Context toggleSubtopic bağlanmadı",
);

ensure(
  code.includes(
    "onToggleSubtopic={onToggleSubtopic}",
  ),
  "Alt bileşen toggleSubtopic bağlanmadı",
);

ensure(
  code.includes(
    "subtopicsContainer:",
  ),
  "Alt kazanım stilleri eklenmedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
