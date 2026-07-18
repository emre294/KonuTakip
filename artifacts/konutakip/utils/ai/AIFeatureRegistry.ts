/**
 * AIFeatureRegistry — per-feature enable/disable configuration for the AI layer.
 *
 * This is intentionally separate from the Premium FeatureRegistry.
 *   Premium FeatureRegistry → entitlement (does the user have access?)
 *   AIFeatureRegistry       → availability (is the feature built and safe to call?)
 *
 * A feature must be:
 *   • enabled here        (feature is built, types are defined, mock exists)
 *   • premium-gated in UI (user holds a subscription)
 * …before it will work end-to-end.
 *
 * To activate a feature once its implementation is ready:
 *   Set `enabled: true` in the entry below. That's the only change needed here.
 */

import { type AIFeatureKey } from "./types";

// ─── Descriptor ───────────────────────────────────────────────────────────────

export interface AIFeatureConfig {
  /** Matches AIFeatureKey */
  key: AIFeatureKey;
  /** Turkish display name (for developer UIs and logs) */
  name: string;
  /** Whether this feature is built and safe to invoke */
  enabled: boolean;
  /**
   * Optional per-feature provider override.
   * When null, AIManager uses the globally active provider.
   * Useful for routing expensive features to a cheaper model.
   */
  providerOverride: import("./types").AIProviderKind | null;
  /**
   * Maximum number of concurrent in-flight requests for this feature.
   * AIManager enforces this limit and throws CONCURRENT_LIMIT when exceeded.
   * 1 = one request at a time (prevents hammering the API on fast taps).
   */
  maxConcurrent: number;
  /**
   * Whether responses for identical requests should be cached.
   * Placeholder — wire into AIManager's request deduplication when needed.
   */
  cacheable: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const AI_FEATURE_CONFIGS: AIFeatureConfig[] = [
  // ── Original features ──────────────────────────────────────────────────────
  {
    key: "question_generator",
    name: "AI Soru Üretici",
    enabled: false, // enable when OpenAI / Gemini integration lands
    providerOverride: null,
    maxConcurrent: 1,
    cacheable: true,
  },
  {
    key: "question_evaluator",
    name: "Soru Değerlendirici",
    enabled: false,
    providerOverride: null,
    maxConcurrent: 3,
    cacheable: false,
  },
  {
    key: "ai_teacher",
    name: "AI Öğretmen",
    enabled: true,
    providerOverride: null,
    maxConcurrent: 1,
    cacheable: true,
  },
  {
    key: "study_coach",
    name: "AI Çalışma Koçu Pro",
    enabled: false,
    providerOverride: null,
    maxConcurrent: 1,
    cacheable: false,
  },
  {
    key: "mini_exams",
    name: "AI Mini Sınavlar",
    enabled: false,
    providerOverride: null,
    maxConcurrent: 1,
    cacheable: true,
  },
  {
    key: "study_plans",
    name: "Kişiselleştirilmiş Çalışma Planı",
    enabled: false,
    providerOverride: null,
    maxConcurrent: 1,
    cacheable: true,
  },

  // ── New features ───────────────────────────────────────────────────────────
  {
    key: "explain_question",
    name: "Soru Açıklama",
    enabled: true, // mock ready; enable real provider when Gemini lands
    providerOverride: null,
    maxConcurrent: 2, // two concurrent explanations are fine
    cacheable: true,  // same question → same explanation
  },
  {
    key: "analyze_mistakes",
    name: "Hata Analizi",
    enabled: true,
    providerOverride: null,
    maxConcurrent: 1,
    cacheable: false, // mistake sets are user-specific and time-sensitive
  },
  {
    key: "practice_question",
    name: "Pratik Soru",
    enabled: true,
    providerOverride: null,
    maxConcurrent: 2,
    cacheable: false, // questions should vary per call
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** O(1) lookup map keyed by AIFeatureKey */
export const AI_FEATURE_REGISTRY = new Map<AIFeatureKey, AIFeatureConfig>(
  AI_FEATURE_CONFIGS.map((c) => [c.key, c])
);

/** Returns the config for a feature, or undefined if the key is unknown */
export function getAIFeatureConfig(key: AIFeatureKey): AIFeatureConfig | undefined {
  return AI_FEATURE_REGISTRY.get(key);
}

/** Returns true only when the feature exists AND is enabled */
export function isAIFeatureEnabled(key: AIFeatureKey): boolean {
  return AI_FEATURE_REGISTRY.get(key)?.enabled ?? false;
}

/** Returns all currently enabled features */
export function getEnabledAIFeatures(): AIFeatureConfig[] {
  return AI_FEATURE_CONFIGS.filter((c) => c.enabled);
}

/** Returns all features regardless of enabled status */
export function getAllAIFeatures(): AIFeatureConfig[] {
  return [...AI_FEATURE_CONFIGS];
}
