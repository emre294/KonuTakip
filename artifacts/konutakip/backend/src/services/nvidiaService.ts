import axios, { AxiosError } from "axios";
import https from "node:https";
import { SYSTEM_PROMPT } from "../prompts.js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type NvidiaResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ??
  "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL ??
  "openai/gpt-oss-120b";

const REQUEST_TIMEOUT_MS = 60_000;

const nvidiaHttpsAgent = new https.Agent({
  family: 4,
  keepAlive: false,
});

export async function askNvidia(
  message: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY tanımlı değil.");
  }

  try {
    const response = await axios.post<NvidiaResponse>(
      NVIDIA_API_URL,
      {
        model: NVIDIA_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...history.slice(-8),
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 1024,
        reasoning_effort: "low",
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
      },
    );

    const answer =
      response.data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error(
        "NVIDIA yanıt üretti ancak cevap metni boş geldi.",
      );
    }

    return answer;
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

