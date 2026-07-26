export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIResponse = {
  content?: unknown;
  answer?: unknown;
  error?: unknown;
  message?: unknown;
};

const API_BASE_URL = "https://konutakip-backend.onrender.com";

function getResponseText(data: AIResponse): string | null {
  if (typeof data.content === "string" && data.content.trim()) {
    return data.content.trim();
  }

  if (typeof data.answer === "string" && data.answer.trim()) {
    return data.answer.trim();
  }

  return null;
}

function getErrorMessage(data: AIResponse): string | null {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  return null;
}

export async function sendAIMessage(
  message: string,
  history: AIMessage[] = []
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
    }),
  });

  let data: AIResponse = {};

  try {
    data = (await response.json()) as AIResponse;
  } catch {
    throw new Error("Yapay zekâ sunucusundan geçersiz yanıt alındı.");
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data) ??
        `Yapay zekâ isteği başarısız oldu. HTTP ${response.status}`
    );
  }

  const answer = getResponseText(data);

  if (!answer) {
    throw new Error(
      "Yapay zekâ yanıtı boş geldi. Lütfen tekrar dene."
    );
  }

  return answer;
}
