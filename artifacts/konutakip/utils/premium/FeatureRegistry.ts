/**
 * FeatureRegistry — single source of truth for all Premium features.
 *
 * Each entry describes a feature and whether it is currently active (built).
 * This drives:
 *   • The benefits list on the Premium screen
 *   • PremiumGate auto-fill of name + description
 *   • Future: per-feature toggle, A/B testing, server-driven config
 *
 * To add a new Premium feature:
 *   1. Add its ID to PremiumFeature in PremiumManager.ts
 *   2. Add an entry here in FEATURE_REGISTRY
 *   3. Wrap the feature's screen/component with <PremiumGate featureId={...}>
 *
 * That's it — no other files need to change.
 */

import { PremiumFeature, type PremiumFeatureId } from "./PremiumManager";

// ─── Feature descriptor ───────────────────────────────────────────────────────

export interface PremiumFeatureDescriptor {
  /** Matches PremiumFeature enum value */
  id: PremiumFeatureId;
  /** Turkish display name shown in UI */
  name: string;
  /** One-sentence Turkish description */
  description: string;
  /** Feather icon name */
  icon: string;
  /** Feature category for grouping */
  category: "ai" | "analytics" | "planning" | "content";
  /**
   * Whether this feature is currently built and active.
   * false = coming soon; still shown in benefits list but gate blocks access.
   */
  active: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const FEATURE_REGISTRY: PremiumFeatureDescriptor[] = [
  {
    id: PremiumFeature.AI_QUESTION_GENERATOR,
    name: "AI Soru Üretici",
    description: "Çalıştığın konulara özel AI destekli pratik sorular üret.",
    icon: "zap",
    category: "ai",
    active: false,
  },
  {
    id: PremiumFeature.AI_TEACHER,
    name: "AI Öğretmen",
    description: "Anlamadığın konuları AI'ya sor, adım adım açıklama al.",
    icon: "book-open",
    category: "ai",
    active: false,
  },
  {
    id: PremiumFeature.ADVANCED_ANALYTICS,
    name: "Gelişmiş Analitik",
    description: "Derinlemesine çalışma istatistikleri ve kişisel performans grafikleri.",
    icon: "bar-chart-2",
    category: "analytics",
    active: false,
  },
  {
    id: PremiumFeature.AI_STUDY_COACH_PRO,
    name: "AI Çalışma Koçu Pro",
    description: "Sınav tarihine göre kişiselleştirilmiş AI çalışma planı.",
    icon: "cpu",
    category: "ai",
    active: false,
  },
  {
    id: PremiumFeature.AI_MINI_EXAMS,
    name: "AI Mini Sınavlar",
    description: "Zayıf konularına göre AI tarafından hazırlanmış mini denemeler.",
    icon: "clipboard",
    category: "ai",
    active: false,
  },
  {
    id: PremiumFeature.PERSONALIZED_STUDY_PLANS,
    name: "Kişiselleştirilmiş Çalışma Planı",
    description: "Hedeflerine ve takvimne göre AI destekli özel çalışma programı.",
    icon: "calendar",
    category: "planning",
    active: false,
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * O(1) lookup by feature ID.
 * Use this in PremiumGate and any component that needs feature metadata.
 */
export const FEATURE_REGISTRY_MAP = new Map<PremiumFeatureId, PremiumFeatureDescriptor>(
  FEATURE_REGISTRY.map((f) => [f.id, f])
);

/** Returns only features that have been built and are currently active. */
export function getActiveFeatures(): PremiumFeatureDescriptor[] {
  return FEATURE_REGISTRY.filter((f) => f.active);
}

/** Returns features grouped by category. */
export function getFeaturesByCategory(): Record<
  PremiumFeatureDescriptor["category"],
  PremiumFeatureDescriptor[]
> {
  return FEATURE_REGISTRY.reduce(
    (acc, f) => {
      acc[f.category] = [...(acc[f.category] ?? []), f];
      return acc;
    },
    {} as Record<PremiumFeatureDescriptor["category"], PremiumFeatureDescriptor[]>
  );
}
