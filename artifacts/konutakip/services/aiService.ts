export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIResponse = {
  answer?: string;
  error?: string;
};

const API_BASE_URL = "https://konutakip-backend.onrender.com";

export async function sendAIMessage(
  message: string,
  history: AIMessage[] = []
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      history
    })
  });

  const data = (await response.json()) as AIResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "Yapay zekâ isteği başarısız oldu.");
  }

  if (!data.answer) {
    throw new Error("Yapay zekâ boş cevap döndürdü.");
  }

  return data.answer;
}