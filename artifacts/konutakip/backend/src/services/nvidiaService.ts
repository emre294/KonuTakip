import { SYSTEM_PROMPT } from "../prompts.js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ??
  "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL ??
  "openai/gpt-oss-120b";

export async function askNvidia(
  message: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY tanımlı değil.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
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
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error("NVIDIA HTTP:", response.status);
      console.error("NVIDIA cevabı:", errorBody);

      throw new Error(
        `NVIDIA API isteği başarısız oldu. HTTP ${response.status}: ${errorBody}`,
      );
    }

    if (!response.body) {
      throw new Error("NVIDIA boş yanıt gövdesi döndürdü.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let finalAnswer = "";
    let reasoningAnswer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line.startsWith("data:")) {
          continue;
        }

        const dataText = line.slice(5).trim();

        if (!dataText || dataText === "[DONE]") {
          continue;
        }

        try {
          const chunk = JSON.parse(dataText);
          const delta = chunk?.choices?.[0]?.delta;

          if (typeof delta?.content === "string") {
            finalAnswer += delta.content;
          }

          if (typeof delta?.reasoning_content === "string") {
            reasoningAnswer += delta.reasoning_content;
          }
        } catch {
          console.warn("Okunamayan NVIDIA stream parçası:", dataText);
        }
      }
    }

    const answer = finalAnswer.trim();

    if (!answer) {
      console.error("NVIDIA reasoning:", reasoningAnswer);
      throw new Error(
        "NVIDIA yanıt üretti ancak son cevap metni boş geldi.",
      );
    }

    return answer;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "NVIDIA API isteği 120 saniyede zaman aşımına uğradı.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

