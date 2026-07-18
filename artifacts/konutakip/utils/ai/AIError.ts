/**
 * AIError — structured error class for all AI layer failures.
 *
 * Every error surfaced from AIManager or providers is an instance of this class
 * so call-sites and hooks can rely on a consistent shape.
 */

import { type AIErrorCode } from "./types";

export class AIError extends Error {
  readonly code: AIErrorCode;
  /**
   * True when the operation is safe to retry (e.g. rate-limit, transient network).
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

  /** Convenience factory for feature-disabled errors */
  static featureDisabled(featureKey: string): AIError {
    return new AIError(
      `AI feature "${featureKey}" is disabled in AIFeatureRegistry.`,
      "FEATURE_DISABLED",
      { retryable: false }
    );
  }

  /** Convenience factory for provider-unavailable errors */
  static providerUnavailable(providerKind: string): AIError {
    return new AIError(
      `AI provider "${providerKind}" is not available.`,
      "PROVIDER_UNAVAILABLE",
      { retryable: false }
    );
  }

  /** Convenience factory for invalid-request errors */
  static invalidRequest(detail: string): AIError {
    return new AIError(`Invalid AI request: ${detail}`, "INVALID_REQUEST", { retryable: false });
  }

  /** Convenience factory for wrapping an unknown caught error */
  static unknown(cause: unknown): AIError {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new AIError(`Unexpected AI error: ${message}`, "UNKNOWN", {
      retryable: false,
      cause,
    });
  }

  /** Human-readable Turkish UI message for each error code */
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
      default:
        return "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.";
    }
  }
}
