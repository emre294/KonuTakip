/**
 * FeatureRegistry — single source of truth for every Premium feature.
 *
 * Each entry describes a feature, its access rules, and its metadata.
 * This drives:
 *   • The benefits list on the Premium screen
 *   • PremiumGate auto-fill of title + description
 *   • usePremiumFeatures() hook categorization
 *   • PremiumLockedCard and ComingSoonCard rendering
 *   • Future: per-feature toggle, A/B testing, server-driven config
 *
 * ─── Activating a new feature ─────────────────────────────────────────────────
 * 1. Add its ID to PremiumFeature in PremiumManager.ts (if new)
 * 2. Add/update an entry here:
 *      enabled: true, comingSoon: false
 * 3. Wrap the feature's screen/component with <PremiumGate featureId={...}>
 *
 * No other files need to change.
 */

import { PremiumFeature, type PremiumFeatureId } from "./PremiumManager";

// ─── Types ────────────────────────────────────────────────────────────────────

/** All supported feature categories. */
export type FeatureCategory =
  | "ai"
  | "analytics"
  | "planning"
  | "testing"
  | "study"
  | "future";

/**
 * The minimum subscription tier required to use a feature.
 * null = all premium tiers qualify.
 */
export type MinimumPremiumVersion = "monthly" | "yearly";

export interface PremiumFeatureDescriptor {
  /** Matches PremiumFeature enum value */
  id: PremiumFeatureId;
  /** Turkish display title shown in UI */
  title: string;
  /** One-sentence Turkish description */
  description: string;
  /** Feature grouping category */
  category: FeatureCategory;

  // ── Access control ──────────────────────────────────────────────────────────
  /**
   * Whether this feature is built and callable.
   * false → not yet implemented; treat as comingSoon.
   */
  enabled: boolean;
  /**
   * Whether a Premium subscription is required.
   * Set false for features available on the free tier.
   */
  premiumRequired: boolean;
  /**
   * Whether this feature is announced but not yet available.
   * comingSoon: true overrides enabled: true — access is always blocked.
   */
  comingSoon: boolean;

  // ── Metadata ────────────────────────────────────────────────────────────────
  /** Feather icon name */
  icon: string;
  /** Short badge label (e.g. "YENİ", "BETA", "PRO"). Optional. */
  badge?: string;
  /** App version in which this feature was introduced (e.g. "1.2.0"). */
  versionIntroduced?: string;
  /**
   * Minimum Premium tier required (null = any paid tier qualifies).
   * Use "yearly" for features gated behind annual plans only.
   */
  minimumPremiumVersion?: MinimumPremiumVersion;
  /**
   * Human-readable estimated release quarter (e.g. "Q3 2025").
   * Shown on ComingSoonCard when set.
   */
  estimatedRelease?: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const FEATURE_REGISTRY: PremiumFeatureDescriptor[] = [
  // ── AI ────────────────────────────────────────────────────────────────────
  {
    id: PremiumFeature.AI_QUESTION_GENERATOR,
    title: "AI Soru Üretici",
    description: "Çalıştığın konulara özel AI destekli pratik sorular üret.",
    icon: "zap",
    category: "ai",
    enabled: false,
    premiumRequired: true,
    comingSoon: true,
    versionIntroduced: "1.1.0",
  },
  {
    id: PremiumFeature.AI_TEACHER,
    title: "AI Öğretmen",
    description: "Anlamadığın konuları AI'ya sor, adım adım açıklama al.",
    icon: "book-open",
    category: "ai",
    enabled: true,
    premiumRequired: true,
    comingSoon: false,
    versionIntroduced: "1.1.0",
    badge: "YENİ",
  },
  {
    id: PremiumFeature.AI_STUDY_COACH_PRO,
    title: "AI Çalışma Koçu Pro",
    description: "Sınav tarihine göre kişiselleştirilmiş AI çalışma planı.",
    icon: "cpu",
    category: "study",
    enabled: false,
    premiumRequired: true,
    comingSoon: true,
    versionIntroduced: "1.1.0",
  },

  // ── Testing ───────────────────────────────────────────────────────────────
  {
    id: PremiumFeature.AI_MINI_EXAMS,
    title: "AI Mini Sınavlar",
    description: "Zayıf konularına göre AI tarafından hazırlanmış mini denemeler.",
    icon: "clipboard",
    category: "testing",
    enabled: false,
    premiumRequired: true,
    comingSoon: true,
    versionIntroduced: "1.1.0",
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    id: PremiumFeature.ADVANCED_ANALYTICS,
    title: "Gelişmiş Analitik",
    description: "Derinlemesine çalışma istatistikleri ve kişisel performans grafikleri.",
    icon: "bar-chart-2",
    category: "analytics",
    enabled: false,
    premiumRequired: true,
    comingSoon: true,
    versionIntroduced: "1.2.0",
  },

  // ── Planning ──────────────────────────────────────────────────────────────
  {
    id: PremiumFeature.PERSONALIZED_STUDY_PLANS,
    title: "Kişiselleştirilmiş Çalışma Planı",
    description: "Hedeflerine ve takvimine göre AI destekli özel çalışma programı.",
    icon: "calendar",
    category: "planning",
    enabled: false,
    premiumRequired: true,
    comingSoon: true,
    versionIntroduced: "1.2.0",
  },

  // ── Future ────────────────────────────────────────────────────────────────
  {
    id: PremiumFeature.SMART_REVIEW_SYSTEM,
    title: "Akıllı Tekrar Sistemi",
    description: "Spaced repetition ile unutulan konuları otomatik olarak tekrar planla.",
    icon: "refresh-cw",
    category: "future",
    enabled: false,
    premiumRequired: true,
    comingSoon: true,
    estimatedRelease: "Q3 2025",
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

/**
 * Returns only features that are built, enabled, and not comingSoon.
 * These are features the user can actually use today.
 */
export function getActiveFeatures(): PremiumFeatureDescriptor[] {
  return FEATURE_REGISTRY.filter((f) => f.enabled && !f.comingSoon);
}

/**
 * Returns only features marked as comingSoon.
 */
export function getComingSoonFeatures(): PremiumFeatureDescriptor[] {
  return FEATURE_REGISTRY.filter((f) => f.comingSoon);
}

/**
 * Returns features grouped by category.
 */
export function getFeaturesByCategory(): Partial<Record<FeatureCategory, PremiumFeatureDescriptor[]>> {
  return FEATURE_REGISTRY.reduce(
    (acc, f) => {
      acc[f.category] = [...(acc[f.category] ?? []), f];
      return acc;
    },
    {} as Partial<Record<FeatureCategory, PremiumFeatureDescriptor[]>>
  );
}

// ─── Feature Access Engine ────────────────────────────────────────────────────

/**
 * Returns true when the given user can access a feature right now.
 *
 * Conditions:
 *   1. Feature exists in the registry
 *   2. Feature is enabled (built)
 *   3. Feature is not comingSoon
 *   4. If premiumRequired, the user must have an active Premium subscription
 */
export function canUse(featureId: PremiumFeatureId, isPremium: boolean): boolean {
  const f = FEATURE_REGISTRY_MAP.get(featureId);
  if (!f) return false;
  if (!f.enabled || f.comingSoon) return false;
  if (f.premiumRequired && !isPremium) return false;
  return true;
}

/**
 * Returns true when a feature requires a Premium subscription.
 * Useful for showing PRO badges without gating full access.
 */
export function isPremiumFeature(featureId: PremiumFeatureId): boolean {
  return FEATURE_REGISTRY_MAP.get(featureId)?.premiumRequired ?? false;
}

/**
 * Returns true when a feature is announced but not yet available.
 */
export function isComingSoon(featureId: PremiumFeatureId): boolean {
  return FEATURE_REGISTRY_MAP.get(featureId)?.comingSoon ?? false;
}

/**
 * Returns true when a feature is built and callable (enabled and not comingSoon).
 */
export function isEnabled(featureId: PremiumFeatureId): boolean {
  const f = FEATURE_REGISTRY_MAP.get(featureId);
  return (f?.enabled ?? false) && !(f?.comingSoon ?? false);
}

/**
 * Returns a Turkish-language reason why the user cannot access a feature.
 * Returns null when the user CAN access the feature (canUse() would return true).
 *
 * Use this to populate error messages in locked or coming-soon UI.
 */
export function getLockedReason(featureId: PremiumFeatureId, isPremium: boolean): string | null {
  const f = FEATURE_REGISTRY_MAP.get(featureId);
  if (!f) return "Bu özellik bulunamadı.";
  if (f.comingSoon) {
    return f.estimatedRelease
      ? `${f.title} ${f.estimatedRelease} itibarıyla kullanıma sunulacak.`
      : `${f.title} çok yakında kullanıma sunulacak.`;
  }
  if (!f.enabled) return `${f.title} henüz kullanıma hazır değil.`;
  if (f.premiumRequired && !isPremium) return `${f.title} için Premium üyelik gereklidir.`;
  return null;
}
