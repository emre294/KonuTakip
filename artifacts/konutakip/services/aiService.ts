export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIResponse = {
  answer?: string;
  error?: string;
};

const API_BASE_URL = "http://192.168.1.24:3001";

export async function sendAIMessage(
  message: string,
  history: AIMessage[] = []
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 190_000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        history: []
      }),
      signal: controller.signal
    });

    const data = (await response.json()) as AIResponse;

    if (!response.ok) {
      throw new Error(
        data.error ?? `Yapay zekâ isteği başarısız oldu. HTTP ${response.status}`
      );
    }

    if (!data.answer) {
      throw new Error("Yapay zekâ boş cevap döndürdü.");
    }

    return data.answer;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yapay zekâ yanıtı zaman aşımına uğradı.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Sunucuya bağlanılamadı. Telefon ve bilgisayarın aynı Wi-Fi ağında olduğunu kontrol et."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


