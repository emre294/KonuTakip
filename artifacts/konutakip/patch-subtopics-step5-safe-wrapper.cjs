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
 * 1. TOPICROW'U BOZMADAN ALT KAZANIM SARMALAYICISI EKLE
 * ========================================================= */

if (!code.includes("interface TopicWithSubtopicsProps")) {
  const marker =
    "// ─── Subject card ─────────────────────────────────────────────────────────────";

  const markerIndex = code.indexOf(marker);

  ensure(
    markerIndex !== -1,
    "Subject card işaretçisi bulunamadı",
  );

  const component = `interface TopicWithSubtopicsProps {
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

function TopicWithSubtopics({
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
}: TopicWithSubtopicsProps) {
  const [expanded, setExpanded] = useState(false);

  const hasSubtopics =
    Array.isArray(subtopics) &&
    subtopics.length > 0;

  const completedCount =
    subtopics?.filter(
      (subtopic) =>
        !!subtopicCompletion[subtopic.id],
    ).length ?? 0;

  const percentage =
    hasSubtopics
      ? Math.round(
          (completedCount /
            subtopics!.length) *
            100,
        )
      : completed
        ? 100
        : 0;

  return (
    <View>
      <TopicRow
        topicId={topicId}
        topicName={topicName}
        completed={completed}
        solvedCount={solvedCount}
        hasReminder={hasReminder}
        onToggle={onToggle}
        onSetSolved={onSetSolved}
        onBellPress={onBellPress}
        colors={colors}
      />

      {hasSubtopics && (
        <>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              setExpanded(
                (previous) => !previous,
              );

              Haptics.impactAsync(
                Haptics
                  .ImpactFeedbackStyle
                  .Light,
              );
            }}
            style={[
              styles.subtopicToggle,
              {
                backgroundColor:
                  colors.secondary + "66",
                borderBottomColor:
                  colors.border,
              },
            ]}
          >
            <View style={styles.subtopicToggleLeft}>
              <Ionicons
                name="list-outline"
                size={14}
                color={
                  completedCount > 0
                    ? colors.primary
                    : colors.mutedForeground
                }
              />

              <Text
                style={[
                  styles.subtopicToggleText,
                  {
                    color:
                      completedCount > 0
                        ? colors.primary
                        : colors.mutedForeground,
                  },
                ]}
              >
                {completedCount}/
                {subtopics!.length} alt kazanım
              </Text>
            </View>

            <View style={styles.subtopicToggleRight}>
              <View
                style={[
                  styles.subtopicMiniTrack,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.subtopicMiniFill,
                    {
                      width: \`\${percentage}%\`,
                      backgroundColor:
                        completed
                          ? colors.success
                          : colors.primary,
                    },
                  ]}
                />
              </View>

              <Ionicons
                name={
                  expanded
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={15}
                color={colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>

          {expanded && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={[
                styles.subtopicList,
                {
                  backgroundColor:
                    colors.secondary + "33",
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
                        onToggleSubtopic(
                          topicId,
                          subtopic.id,
                        );

                        Haptics.impactAsync(
                          Haptics
                            .ImpactFeedbackStyle
                            .Light,
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
        </>
      )}
    </View>
  );
}

`;

  code =
    code.slice(0, markerIndex) +
    component +
    code.slice(markerIndex);
}

/* =========================================================
 * 2. SUBJECTCARD PROPLARINI GENİŞLET
 * ========================================================= */

replaceOnce(
`interface SubjectCardProps {
  subject: Subject;
  topicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;
  topicReminders: Record<string, { interval: 3 | 5 | 7; nextDate: string }>;
  onToggle: (id: string) => void;
  onSetSolved: (topicId: string, count: number) => void;
  onBellPress: (topicId: string, topicName: string, subjectName: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}`,
`interface SubjectCardProps {
  subject: Subject;
  topicCompletion: Record<string, boolean>;
  subtopicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;
  topicReminders: Record<string, { interval: 3 | 5 | 7; nextDate: string }>;
  onToggle: (id: string) => void;
  onToggleSubtopic: (
    topicId: string,
    subtopicId: string,
  ) => void;
  onSetSolved: (topicId: string, count: number) => void;
  onBellPress: (topicId: string, topicName: string, subjectName: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}`,
  "SubjectCardProps",
);

replaceOnce(
`function SubjectCard({
  subject, topicCompletion, topicSolvedQuestions, topicReminders,
  onToggle, onSetSolved, onBellPress, colors,
}: SubjectCardProps) {`,
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
}: SubjectCardProps) {`,
  "SubjectCard parametreleri",
);

/* =========================================================
 * 3. SUBJECTCARD KONU LİSTESİNİ WRAPPER'A BAĞLA
 * ========================================================= */

replaceOnce(
`          {subject.topics.map((t) => (
            <TopicRow
              key={t.id}
              topicId={t.id}
              topicName={t.name}
              completed={!!topicCompletion[t.id]}
              solvedCount={topicSolvedQuestions[t.id] ?? 0}
              hasReminder={!!topicReminders[t.id]}
              onToggle={() => onToggle(t.id)}
              onSetSolved={(count) => handleSetSolved(t.id, count)}
              onBellPress={() => onBellPress(t.id, t.name, subject.name)}
              colors={colors}
            />
          ))}`,
`          {subject.topics.map((t) => (
            <TopicWithSubtopics
              key={t.id}
              topicId={t.id}
              topicName={t.name}
              subtopics={t.subtopics}
              completed={!!topicCompletion[t.id]}
              solvedCount={topicSolvedQuestions[t.id] ?? 0}
              hasReminder={!!topicReminders[t.id]}
              subtopicCompletion={subtopicCompletion}
              onToggle={() => onToggle(t.id)}
              onToggleSubtopic={onToggleSubtopic}
              onSetSolved={(count) =>
                handleSetSolved(t.id, count)
              }
              onBellPress={() =>
                onBellPress(
                  t.id,
                  t.name,
                  subject.name,
                )
              }
              colors={colors}
            />
          ))}`,
  "SubjectCard konu listesi",
);

/* =========================================================
 * 4. EXAMSECTION PROPLARINI GENİŞLET
 * ========================================================= */

replaceOnce(
`interface ExamSectionProps {
  title: string;
  subjects: Subject[];
  topicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;
  topicReminders: Record<string, { interval: 3 | 5 | 7; nextDate: string }>;
  onToggle: (id: string) => void;
  onSetSolved: (topicId: string, count: number) => void;
  onBellPress: (topicId: string, topicName: string, subjectName: string) => void;
  accentColor: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}`,
`interface ExamSectionProps {
  title: string;
  subjects: Subject[];
  topicCompletion: Record<string, boolean>;
  subtopicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;
  topicReminders: Record<string, { interval: 3 | 5 | 7; nextDate: string }>;
  onToggle: (id: string) => void;
  onToggleSubtopic: (
    topicId: string,
    subtopicId: string,
  ) => void;
  onSetSolved: (topicId: string, count: number) => void;
  onBellPress: (topicId: string, topicName: string, subjectName: string) => void;
  accentColor: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}`,
  "ExamSectionProps",
);

replaceOnce(
`function ExamSection({
  title, subjects, topicCompletion, topicSolvedQuestions, topicReminders,
  onToggle, onSetSolved, onBellPress, accentColor, colors,
}: ExamSectionProps) {`,
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
}: ExamSectionProps) {`,
  "ExamSection parametreleri",
);

/* =========================================================
 * 5. EXAMSECTION -> SUBJECTCARD BAĞLANTISI
 * ========================================================= */

replaceOnce(
`              topicCompletion={topicCompletion}
              topicSolvedQuestions={topicSolvedQuestions}
              topicReminders={topicReminders}
              onToggle={onToggle}
              onSetSolved={onSetSolved}`,
`              topicCompletion={topicCompletion}
              subtopicCompletion={subtopicCompletion}
              topicSolvedQuestions={topicSolvedQuestions}
              topicReminders={topicReminders}
              onToggle={onToggle}
              onToggleSubtopic={onToggleSubtopic}
              onSetSolved={onSetSolved}`,
  "ExamSection SubjectCard bağlantısı",
);

/* =========================================================
 * 6. SCREEN useApp BAĞLANTISI
 * ========================================================= */

replaceOnce(
`  const {
    profile, topicCompletion, toggleTopic,
    topicSolvedQuestions, setTopicSolvedQuestion,
    topicReminders, setTopicReminder, removeTopicReminder,
  } = useApp();`,
`  const {
    profile,
    topicCompletion,
    toggleTopic,
    subtopicCompletion,
    toggleSubtopic,
    topicSolvedQuestions,
    setTopicSolvedQuestion,
    topicReminders,
    setTopicReminder,
    removeTopicReminder,
  } = useApp();`,
  "SubjectsScreen useApp",
);

/* =========================================================
 * 7. TYT VE AYT EXAMSECTION ÇAĞRILARI
 * ========================================================= */

const examCallPattern =
  /topicCompletion=\{topicCompletion\}\r?\n(\s*)topicSolvedQuestions=\{topicSolvedQuestions\}\r?\n(\s*)topicReminders=\{topicReminders\}\r?\n(\s*)onToggle=\{toggleTopic\}\r?\n(\s*)onSetSolved=\{setTopicSolvedQuestion\}/g;

const matches = [...code.matchAll(examCallPattern)];

ensure(
  matches.length === 2,
  `TYT/AYT ExamSection çağrısı 2 olmalı, bulunan ${matches.length}`,
);

code = code.replace(
  examCallPattern,
`topicCompletion={topicCompletion}
$1subtopicCompletion={subtopicCompletion}
$1topicSolvedQuestions={topicSolvedQuestions}
$2topicReminders={topicReminders}
$3onToggle={toggleTopic}
$4onToggleSubtopic={toggleSubtopic}
$4onSetSolved={setTopicSolvedQuestion}`,
);

/* =========================================================
 * 8. STİLLERİ DOĞRU STYLE BLOĞUNA EKLE
 * ========================================================= */

if (!code.includes("subtopicToggle:")) {
  const styleMarker =
    "  soruLabel: { fontSize: 11, fontFamily: \"Inter_400Regular\", flexShrink: 0 },\n});\n\nconst rStyles";

  ensure(
    code.includes(styleMarker),
    "Ana styles kapanışı bulunamadı",
  );

  const replacement = `  soruLabel: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },

  subtopicToggle: {
    minHeight: 38,
    paddingLeft: 46,
    paddingRight: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  subtopicToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  subtopicToggleText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  subtopicToggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtopicMiniTrack: {
    width: 62,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  subtopicMiniFill: {
    height: "100%",
    borderRadius: 2,
  },
  subtopicList: {
    paddingLeft: 46,
    paddingRight: 14,
    paddingBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtopicRow: {
    minHeight: 42,
    paddingHorizontal: 4,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  },
});

const rStyles`;

  code = code.replace(
    styleMarker,
    replacement,
  );
}

/* =========================================================
 * 9. SON KONTROLLER
 * ========================================================= */

ensure(
  code.includes(
    "function TopicWithSubtopics(",
  ),
  "Alt kazanım wrapper eklenmedi",
);

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
    "subtopicToggle:",
  ),
  "Alt kazanım stilleri eklenmedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
