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

export function getSubjectsProgressUnits(
  subjects: Subject[],
  topicCompletion: Record<string, boolean>,
  subtopicCompletion: Record<string, boolean>,
): ProgressUnits {
  let completed = 0;
  let total = 0;

  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const units = getTopicProgressUnits(
        topic,
        topicCompletion,
        subtopicCompletion,
      );

      completed += units.completed;
      total += units.total;
    }
  }

  return {
    completed,
    total,
    percentage:
      total > 0
        ? Math.round(
            (completed / total) * 100,
          )
        : 0,
  };
}
