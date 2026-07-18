/**
 * AIError — structured error class for all AI layer failures.
 *
 * Every error surfaced from AIManager or providers is an instance of this class
 * so call-sites and hooks can rely on a consistent shape.
 *
 * The `retryable` flag signals whether the operation is safe to retry:
 *   true  → transient failure (rate limit, timeout, network, concurrent limit)
 *   false → permanent failure (validation, auth, disabled feature)
 */

import { type AIErrorCode } from "./types";

export class AIError extends Error {
  readonly code: AIErrorCode;
  /**
   * True when retrying the exact same request has a reasonable chance of
   * succeeding (rate limit, transient network blip, timeout, concurrency).
   * False for validation errors, auth errors, or disabled features.
   */
  readonly retryable: boolean;
  /** Original error that caused this one, when available */
  readonly cause: unknown;

  constructor(
    message: string,
    code: AIErrorCode,
    options?: { retryable?: boolean; cause?: unknown }
  ) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.cause = options?.cause;
  }

  // ── Static factories ────────────────────────────────────────────────────────

  static featureDisabled(featureKey: string): AIError {
    return new AIError(
      `AI feature "${featureKey}" is disabled in AIFeatureRegistry.`,
      "FEATURE_DISABLED",
      { retryable: false }
    );
  }

  static providerUnavailable(providerKind: string): AIError {
    return new AIError(
      `AI provider "${providerKind}" is not available.`,
      "PROVIDER_UNAVAILABLE",
      { retryable: false }
    );
  }

  static invalidRequest(detail: string): AIError {
    return new AIError(
      `Invalid AI request: ${detail}`,
      "INVALID_REQUEST",
      { retryable: false }
    );
  }

  static invalidResponse(detail: string): AIError {
    return new AIError(
      `AI provider returned an unexpected response: ${detail}`,
      "INVALID_RESPONSE",
      { retryable: false }
    );
  }

  static rateLimited(providerKind: string): AIError {
    return new AIError(
      `Rate limit reached on provider "${providerKind}". Retry after a short delay.`,
      "RATE_LIMITED",
      { retryable: true }
    );
  }

  static networkError(detail?: string): AIError {
    return new AIError(
      `Network error${detail ? `: ${detail}` : "."}`,
      "NETWORK_ERROR",
      { retryable: true }
    );
  }

  static authError(providerKind: string): AIError {
    return new AIError(
      `Authentication failed for provider "${providerKind}". Check your API key.`,
      "AUTH_ERROR",
      { retryable: false }
    );
  }

  /**
   * Thrown when a feature's maxConcurrent limit is already reached.
   * Retryable — the caller should wait for the in-flight request to complete.
   */
  static concurrentLimit(featureKey: string, max: number): AIError {
    return new AIError(
      `Feature "${featureKey}" is already at its concurrency limit (${max}). Wait for the current request to finish.`,
      "CONCURRENT_LIMIT",
      { retryable: true }
    );
  }

  /**
   * Thrown when the provider did not respond within the configured timeout.
   * Retryable — a subsequent attempt may succeed once the provider recovers.
   */
  static timeout(timeoutMs: number): AIError {
    return new AIError(
      `AI request timed out after ${timeoutMs}ms.`,
      "TIMEOUT",
      { retryable: true }
    );
  }

  static unknown(cause: unknown): AIError {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new AIError(
      `Unexpected AI error: ${message}`,
      "UNKNOWN",
      { retryable: false, cause }
    );
  }

  // ── User-facing messages (Turkish) ─────────────────────────────────────────

  /** Human-readable Turkish UI message mapped from the error code. */
  toUserMessage(): string {
    switch (this.code) {
      case "FEATURE_DISABLED":
        return "Bu özellik şu an devre dışı.";
      case "PROVIDER_UNAVAILABLE":
        return "AI servisi şu an kullanılamıyor.";
      case "RATE_LIMITED":
        return "Çok fazla istek gönderildi. Lütfen biraz bekle.";
      case "NETWORK_ERROR":
        return "Bağlantı hatası. İnternet bağlantını kontrol et.";
      case "AUTH_ERROR":
        return "AI servisi kimlik doğrulama hatası.";
      case "INVALID_REQUEST":
        return "Geçersiz istek. Lütfen tekrar dene.";
      case "INVALID_RESPONSE":
        return "AI servisi beklenmeyen bir yanıt döndürdü.";
      case "CONCURRENT_LIMIT":
        return "İstek işleniyor. Lütfen tamamlanmasını bekle.";
      case "TIMEOUT":
        return "AI servisinden yanıt alınamadı. Tekrar dene.";
      default:
        return "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.";
    }
  }
}
