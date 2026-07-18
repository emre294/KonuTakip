/**
 * AIFeatureRegistry — per-feature enable/disable configuration for the AI layer.
 *
 * This is intentionally separate from the Premium FeatureRegistry.
 * Premium controls *entitlement* (does the user have access?).
 * AIFeatureRegistry controls *availability* (is the feature built and safe to call?).
 *
 * A feature must be:
 *   • enabled here          (feature is built and safe)
 *   • premium-gated by UI   (user has a subscription)
 * …before it will work end-to-end.
 *
 * To activate a feature once it's built:
 *   Set `enabled: true` in the entry below.
 *   That's the only change needed in this file.
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
   * Useful for routing expensive features to a cheaper provider.
   */
  providerOverride: import("./types").AIProviderKind | null;
  /**
   * Maximum number of concurrent in-flight requests for this feature.
   * Prevents runaway calls during fast taps. 1 = one at a time.
   */
  maxConcurrent: number;
  /**
   * Whether to cache responses for identical requests.
   * Future: wire this into AIManager's request deduplication.
   */
  cacheable: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const AI_FEATURE_CONFIGS: AIFeatureConfig[] = [
  {
    key: "question_generator",
    name: "AI Soru Üretici",
    enabled: false, // set to true when OpenAI / Gemini integration lands
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
    enabled: false,
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
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** O(1) lookup map */
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
