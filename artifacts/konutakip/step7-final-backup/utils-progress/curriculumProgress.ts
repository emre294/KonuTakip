import type {
  Subject,
  Topic,
} from "@/data/subjects";

export interface ProgressUnits {
  completed: number;
  total: number;
  percentage: number;
}

export function getTopicProgressUnits(
  topic: Topic,
  topicCompletion: Record<string, boolean>,
  subtopicCompletion: Record<string, boolean>,
): ProgressUnits {
  const subtopics = topic.subtopics ?? [];

  if (subtopics.length === 0) {
    const completed =
      topicCompletion[topic.id] ? 1 : 0;

    return {
      completed,
      total: 1,
      percentage: completed * 100,
    };
  }

  const completed = subtopics.filter(
    (subtopic) =>
      !!subtopicCompletion[subtopic.id],
  ).length;

  return {
    completed,
    total: subtopics.length,
    percentage: Math.round(
      (completed / subtopics.length) * 100,
    ),
  };
}

export function getSubjectsProgressUnits(
  subjects: Subject[],
  topicCompletion: Record<string, boolean>,
  subtopicCompletion: Record<string, boolean>,
): ProgressUnits {
  const totals = subjects
    .flatMap((subject) => subject.topics)
    .reduce(
      (result, topic) => {
        const topicUnits =
          getTopicProgressUnits(
            topic,
            topicCompletion,
            subtopicCompletion,
          );

        result.completed +=
          topicUnits.completed;

        result.total += topicUnits.total;

        return result;
      },
      {
        completed: 0,
        total: 0,
      },
    );

  return {
    ...totals,
    percentage:
      totals.total > 0
        ? Math.round(
            (totals.completed /
              totals.total) *
              100,
          )
        : 0,
  };
}

export function getSubjectProgressUnits(
  subject: Subject,
  topicCompletion: Record<string, boolean>,
  subtopicCompletion: Record<string, boolean>,
): ProgressUnits {
  return getSubjectsProgressUnits(
    [subject],
    topicCompletion,
    subtopicCompletion,
  );
}
