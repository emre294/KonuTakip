const fs = require("fs");

const servicePath = "./backend/src/services/nvidiaService.ts";
const routePath = "./backend/src/routes/ai.ts";

let service = fs.readFileSync(servicePath, "utf8");
let route = fs.readFileSync(routePath, "utf8");

function replaceRequired(source, oldText, newText, label) {
  if (!source.includes(oldText)) {
    throw new Error(label + " bulunamadı");
  }

  return source.replace(oldText, newText);
}

/* ───────────────── nvidiaService.ts ───────────────── */

service = replaceRequired(
  service,
`type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};`,
`type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type NvidiaRequestOptions = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};`,
  "NvidiaRequestOptions"
);

service = replaceRequired(
  service,
`const MAX_PDF_TEXT_LENGTH = 50_000;`,
`const MAX_PDF_TEXT_LENGTH = 50_000;

function normalizeModelAnswer(value: string): string {
  return value
    .replace(/^\\uFEFF/, "")
    .replace(/\\r\\n/g, "\\n")
    .replace(/[ \\t]+$/gm, "")
    .replace(/^\\n+/, "")
    .replace(/\\n+$/, "")
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();
}`,
  "normalizeModelAnswer"
);

service = replaceRequired(
  service,
`export async function askNvidia(
  message: string,
  history: ChatMessage[] = [],
  attachments: NvidiaAttachment[] = [],
): Promise<string> {`,
`export async function askNvidia(
  message: string,
  history: ChatMessage[] = [],
  attachments: NvidiaAttachment[] = [],
  options: NvidiaRequestOptions = {},
): Promise<string> {`,
  "askNvidia imzası"
);

service = replaceRequired(
  service,
`        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1536,`,
`        temperature: options.temperature ?? 0.55,
        top_p: options.topP ?? 0.9,
        max_tokens: options.maxTokens ?? 1800,`,
  "model ayarları"
);

service = replaceRequired(
  service,
`    const answer =
      response.data.choices?.[0]?.message?.content?.trim();

    if (!answer) {`,
`    const rawAnswer =
      response.data.choices?.[0]?.message?.content;

    const answer =
      typeof rawAnswer === "string"
        ? normalizeModelAnswer(rawAnswer)
        : "";

    if (!answer) {`,
  "cevap normalizasyonu"
);

/* ───────────────── routes/ai.ts ───────────────── */

route = replaceRequired(
  route,
`import {
  askNvidia,
  type NvidiaAttachment,
} from "../services/nvidiaService.js";`,
`import {
  askNvidia,
  type NvidiaAttachment,
  type NvidiaRequestOptions,
} from "../services/nvidiaService.js";`,
  "route import"
);

route = replaceRequired(
  route,
`function isAIFeature(value: string): value is AIFeature {
  return AI_FEATURES.includes(value as AIFeature);
}`,
`function isAIFeature(value: string): value is AIFeature {
  return AI_FEATURES.includes(value as AIFeature);
}

const QUESTION_GENERATION_PATTERNS = [
  /soru\\s*(hazırla|hazırla|oluştur|üret|yaz)/i,
  /test\\s*(hazırla|oluştur|üret)/i,
  /mini\\s*(sınav|deneme)/i,
  /\\b\\d+\\s*(adet|tane)?\\s*soru\\b/i,
  /çoktan\\s*seçmeli/i,
  /5\\s*şık/i,
  /beş\\s*şık/i,
  /pratik\\s*soru/i,
];

function isQuestionGenerationRequest(
  feature: AIFeature,
  requestData: Record<string, unknown>,
): boolean {
  if (
    feature === "generate-questions" ||
    feature === "practice-question" ||
    feature === "mini-exam"
  ) {
    return true;
  }

  const serialized = JSON.stringify(requestData);

  return QUESTION_GENERATION_PATTERNS.some((pattern) =>
    pattern.test(serialized),
  );
}

function getNvidiaOptions(
  feature: AIFeature,
  requestData: Record<string, unknown>,
): NvidiaRequestOptions {
  if (isQuestionGenerationRequest(feature, requestData)) {
    return {
      temperature: 0.22,
      topP: 0.78,
      maxTokens: 2600,
    };
  }

  if (
    feature === "evaluate-question" ||
    feature === "explain-question"
  ) {
    return {
      temperature: 0.18,
      topP: 0.75,
      maxTokens: 2200,
    };
  }

  if (feature === "teach-topic") {
    return {
      temperature: 0.38,
      topP: 0.84,
      maxTokens: 2400,
    };
  }

  return {
    temperature: 0.5,
    topP: 0.9,
    maxTokens: 2200,
  };
}`,
  "route kalite yardımcıları"
);

route = replaceRequired(
  route,
`    const answer = await askNvidia(prompt, [], attachments);`,
`    const options = getNvidiaOptions(feature, parsed.data);

    const answer = await askNvidia(
      prompt,
      [],
      attachments,
      options,
    );`,
  "feature askNvidia çağrısı"
);

fs.writeFileSync(servicePath, service, "utf8");
fs.writeFileSync(routePath, route, "utf8");

console.log("PATCH_OK");
