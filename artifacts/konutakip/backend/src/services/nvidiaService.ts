import axios, { AxiosError } from "axios";
import { createRequire } from "node:module";
import https from "node:https";
const require = createRequire(import.meta.url);

const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
  dataBuffer: Buffer,
) => Promise<{ text: string }>;
import { SYSTEM_PROMPT } from "../prompts.js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type NvidiaRequestOptions = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  allowReasoningValidationFallback?: boolean;
};

export type NvidiaAttachment = {
  kind: "image" | "pdf";
  mimeType: string;
  fileName: string;
  base64?: string;
};

type NvidiaTextContent = {
  type: "text";
  text: string;
};

type NvidiaImageContent = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

type NvidiaResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
  };
};

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ??
  "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_TEXT_MODEL =
  process.env.NVIDIA_MODEL ??
  "openai/gpt-oss-120b";

const NVIDIA_VISION_MODEL =
  process.env.NVIDIA_VISION_MODEL ??
  "nvidia/llama-3.1-nemotron-nano-vl-8b-v1";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_PDF_TEXT_LENGTH = 50_000;

function extractValidationVerdict(
  reasoning: string,
): string | null {
  const normalized = reasoning
    .replace(/\r\n/g, "\n")
    .trim();

  const invalidMatches = [
    ...normalized.matchAll(/INVALID\s*:[^\n]*/gi),
  ];

  if (invalidMatches.length > 0) {
    return invalidMatches[invalidMatches.length - 1][0].trim();
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index].toUpperCase();

    if (line === "VALID") {
      return "VALID";
    }

    if (line.startsWith("INVALID")) {
      return lines[index];
    }
  }

  return null;
}

function normalizeModelAnswer(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const nvidiaHttpsAgent = new https.Agent({
  family: 4,
  keepAlive: false,
});

async function extractPdfText(
  attachment: NvidiaAttachment,
): Promise<string> {
  if (!attachment.base64) {
    throw new Error(`${attachment.fileName} dosyasının içeriği okunamadı.`);
  }

  const buffer = Buffer.from(attachment.base64, "base64");

  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error("PDF dosyası en fazla 8 MB olabilir.");
  }

  const parsed = await pdfParse(buffer);
  const text = parsed.text.trim();

  if (!text) {
    throw new Error(
      "PDF içinden metin okunamadı. Taranmış PDF ise ilgili sayfanın ekran görüntüsünü yükle.",
    );
  }

  return text.slice(0, MAX_PDF_TEXT_LENGTH);
}

async function buildUserContent(
  message: string,
  attachments: NvidiaAttachment[],
): Promise<string | Array<NvidiaTextContent | NvidiaImageContent>> {
  if (attachments.length === 0) {
    return message;
  }

  const pdfTexts: string[] = [];

  for (const attachment of attachments) {
    if (attachment.kind === "pdf") {
      const pdfText = await extractPdfText(attachment);

      pdfTexts.push(
        `PDF DOSYASI: ${attachment.fileName}\n\n${pdfText}`,
      );
    }
  }

  const combinedText = [
    message,
    ...pdfTexts,
  ]
    .filter(Boolean)
    .join("\n\n");

  const images = attachments.filter(
    (attachment) => attachment.kind === "image",
  );

  if (images.length === 0) {
    return combinedText;
  }

  const content: Array<NvidiaTextContent | NvidiaImageContent> = [
    {
      type: "text",
      text: combinedText,
    },
  ];

  for (const attachment of images) {
    if (!attachment.base64) {
      throw new Error(`${attachment.fileName} görseli okunamadı.`);
    }

    content.push({
      type: "image_url",
      image_url: {
        url: `data:${attachment.mimeType};base64,${attachment.base64}`,
      },
    });
  }

  return content;
}

export async function askNvidia(
  message: string,
  history: ChatMessage[] = [],
  attachments: NvidiaAttachment[] = [],
  options: NvidiaRequestOptions = {},
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY tanımlı değil.");
  }

  const hasImage = attachments.some(
    (attachment) => attachment.kind === "image",
  );

  const model = hasImage
    ? NVIDIA_VISION_MODEL
    : NVIDIA_TEXT_MODEL;

  try {
    const response = await axios.post<NvidiaResponse>(
      NVIDIA_API_URL,
      {
        model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...history.slice(-8),
          {
            role: "user",
            content: await buildUserContent(message, attachments),
          },
        ],
        temperature: options.temperature ?? 0.55,
        top_p: options.topP ?? 0.9,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: REQUEST_TIMEOUT_MS,
        proxy: false,
        httpsAgent: nvidiaHttpsAgent,
        maxBodyLength: 25 * 1024 * 1024,
      },
    );

    const choice = response.data.choices?.[0];
    const rawAnswer = choice?.message?.content;

    const answer =
      typeof rawAnswer === "string"
        ? normalizeModelAnswer(rawAnswer)
        : "";

    if (
      answer &&
      choice?.finish_reason !== "length"
    ) {
      return answer;
    }

    if (
      choice?.finish_reason === "length" &&
      (options.maxTokens ?? 0) < 8192
    ) {
      return askNvidia(
        message,
        history,
        attachments,
        {
          ...options,
          temperature: Math.min(
            options.temperature ?? 0.25,
            0.25,
          ),
          topP: Math.min(
            options.topP ?? 0.75,
            0.75,
          ),
          maxTokens: 8192,
        },
      );
    }

    if (
      answer &&
      choice?.finish_reason === "length"
    ) {
      throw new Error(
        "NVIDIA cevabı token sınırında yarım kaldı ve tamamlanamadı.",
      );
    }

    const reasoning =
      typeof choice?.message?.reasoning_content === "string"
        ? choice.message.reasoning_content.trim()
        : "";

    if (
      options.allowReasoningValidationFallback &&
      reasoning
    ) {
      const verdict = extractValidationVerdict(reasoning);

      if (verdict) {
        return verdict;
      }
    }

    if ((options.maxTokens ?? 0) < 4096) {
      return askNvidia(
        message,
        history,
        attachments,
        {
          ...options,
          temperature: Math.min(options.temperature ?? 0.3, 0.3),
          topP: Math.min(options.topP ?? 0.8, 0.8),
          maxTokens: 4096,
        },
      );
    }

    throw new Error(
      reasoning
        ? "NVIDIA düşünme çıktısı üretti ancak nihai cevap metni boş kaldı."
        : "NVIDIA yanıt üretti ancak cevap metni boş geldi.",
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<NvidiaResponse>;

      if (axiosError.code === "ECONNABORTED") {
        throw new Error(
          `NVIDIA API isteği ${REQUEST_TIMEOUT_MS / 1000} saniyede zaman aşımına uğradı.`,
        );
      }

      const status = axiosError.response?.status;
      const apiMessage =
        axiosError.response?.data?.error?.message ??
        axiosError.message;

      throw new Error(
        status
          ? `NVIDIA API isteği başarısız oldu. HTTP ${status}: ${apiMessage}`
          : `NVIDIA API bağlantı hatası: ${apiMessage}`,
      );
    }

    throw error;
  }
}
