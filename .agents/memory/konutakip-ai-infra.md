---
name: KonuTakip AI Infrastructure
description: Architecture of the provider-swappable AI layer under utils/ai/; key decisions and extension points.
---

# KonuTakip AI Infrastructure

## Structure
```
utils/ai/
  types.ts               — All TS types (requests, responses, enums, AIState)
  AIError.ts             — AIError class with toUserMessage() for Turkish UI strings
  AIProvider.ts          — IAIProvider interface every provider must implement
  AIFeatureRegistry.ts   — Per-feature enabled/disabled config (all false by default)
  AIManager.ts           — Singleton; validates feature enabled before delegating to provider
  providers/
    LocalMockAIProvider.ts  — Default provider; realistic delays, no credentials needed
  index.ts               — Single import point: "@/utils/ai"

hooks/
  useAI.ts               — Base hook with race-condition guard (inflightRef symbol pattern)
  useQuestionGenerator.ts
  useAITeacher.ts        — Maintains rolling conversationHistory for multi-turn sessions
  useStudyCoach.ts       — Auto-assembles learnerSnapshot from AppContext
```

## Key decisions

**Why: Feature enable/disable in AIFeatureRegistry (separate from PremiumFeatureRegistry)**
Premium controls entitlement (does the user have access?). AIFeatureRegistry controls availability (is the feature built and safe to call?). Both must be satisfied before a feature works end-to-end.

**How to apply:** When a new AI feature is shipped, set `enabled: true` in `AIFeatureRegistry.ts` — that's the only registry change needed.

**Why: All features start as `enabled: false`**
Prevents accidental calls to disabled features throwing cryptic errors. AIManager throws `AIError.featureDisabled()` which hooks surface as a Turkish UI string.

**Why: LocalMockAIProvider always active**
Zero-credential default allows hooks to be used in development without any API keys. Swap via `AIManager.configure(new OpenAIProvider(...))` in `_layout.tsx` bootstrap.

**Why: inflightRef symbol pattern in useAI**
Prevents race conditions when the user triggers a request while a previous one is still in flight. Only the latest request symbol updates state.

**Adding a new provider (OpenAI / Gemini / Claude):**
1. Create `utils/ai/providers/OpenAIProvider.ts` implementing `IAIProvider`
2. Call `AIManager.configure(new OpenAIProvider(...))` once in app bootstrap
3. Set `enabled: true` for the relevant features in `AIFeatureRegistry.ts`
4. No UI or hook changes needed.
