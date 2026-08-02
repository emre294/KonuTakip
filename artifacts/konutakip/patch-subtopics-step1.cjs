const fs = require("fs");

const path = "./data/subjects.ts";
let code = fs.readFileSync(path, "utf8");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const oldTypes = `export interface Topic {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}`;

ensure(
  code.includes(oldTypes),
  "Topic ve Subject tipleri bulunamadi",
);

const newTypes = `export interface Subtopic {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subtopics?: Subtopic[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}`;

code = code.replace(
  oldTypes,
  newTypes,
);

const oldHelper = `function makeTopics(subjectId: string, names: string[]): Topic[] {
  return names.map((name, i) => ({ id: \`\${subjectId}-\${i}\`, name }));
}`;

ensure(
  code.includes(oldHelper),
  "makeTopics fonksiyonu bulunamadi",
);

const newHelper = `function makeSubtopics(
  topicId: string,
  names: string[],
): Subtopic[] {
  return names.map((name, index) => ({
    id: \`\${topicId}-sub-\${index}\`,
    name,
  }));
}

function makeTopics(
  subjectId: string,
  names: string[],
): Topic[] {
  return names.map((name, index) => ({
    id: \`\${subjectId}-\${index}\`,
    name,
  }));
}

function makeTopic(
  id: string,
  name: string,
  subtopicNames: string[] = [],
): Topic {
  return {
    id,
    name,
    subtopics:
      subtopicNames.length > 0
        ? makeSubtopics(id, subtopicNames)
        : undefined,
  };
}`;

code = code.replace(
  oldHelper,
  newHelper,
);

ensure(
  code.includes("export interface Subtopic"),
  "Subtopic tipi eklenemedi",
);

ensure(
  code.includes("subtopics?: Subtopic[]"),
  "Topic alt konu alani eklenemedi",
);

ensure(
  code.includes("function makeSubtopics("),
  "makeSubtopics fonksiyonu eklenemedi",
);

ensure(
  code.includes("function makeTopic("),
  "makeTopic fonksiyonu eklenemedi",
);

fs.writeFileSync(path, code, "utf8");

console.log("PATCH_OK");
