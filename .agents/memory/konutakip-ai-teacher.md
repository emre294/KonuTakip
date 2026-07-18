---
name: KonuTakip AI Teacher Screen
description: Chat UI implementation for AI Öğretmen — what was built, what must be enabled, and how the mock response is formatted for chat display.
---

## What was built

`app/ai-teacher.tsx` — full ChatGPT-style conversation screen.

## Two registry toggles required

The feature is gated in two places; both must be `true` or `AIManager.teachTopic()` throws:

1. `utils/ai/AIFeatureRegistry.ts` → `ai_teacher.enabled = true`
2. `utils/premium/FeatureRegistry.ts` → `AI_TEACHER.enabled = true, comingSoon = false`

**Why:** `AIManager._getProvider()` checks `isAIFeatureEnabled()` and throws `FEATURE_DISABLED` if false. `FeatureRegistry` controls whether PremiumGate shows the feature as active vs "coming soon" in the premium screen.

## Chat ↔ AITeacherRequest mapping

For free-form chat, pass the user's message as both `topicName` and `userQuestion`. Use fixed `subjectName: "Genel"` and `examType: "TYT"`.

```ts
AIManager.teachTopic({
  feature: "ai_teacher",
  topicId: `chat_${Date.now()}`,
  topicName: userMessage,
  subjectName: "Genel",
  examType: "TYT",
  userQuestion: userMessage,
  requestedAt: new Date().toISOString(),
})
```

## Response → display text

`AITeacherResponse` has `summary`, `keyPoints[]`, `commonMistakes[]`, `practiceHint`. For chat display, render:

```
{summary}

📌 Önemli Noktalar:
• {keyPoints[0]}
• ...

💡 {practiceHint}
```

`steps[]` and `commonMistakes[]` are omitted in chat view (structured data, too verbose for a bubble).

## Mock provider topic detection

`LocalMockAIProvider.teachTopic()` now keyword-matches `userQuestion` against these topics and returns rich Turkish content: parabol, limit, türev, trigonometri, Newton yasaları, hücre/DNA/biyoloji, paragraf/Türkçe, mol/kimya, TYT Matematik, AYT Fizik, Biyoloji tekrar. Falls back to a generic educational response.

## PremiumGate wraps the whole screen

Free users see the locked state automatically. The screen component is:

```tsx
export default function AITeacherScreen() {
  return (
    <PremiumGate featureId={PremiumFeature.AI_TEACHER}>
      <AITeacherContent />
    </PremiumGate>
  );
}
```

## Key design decisions

- Session-only state (`useState`) — no persistence.
- Error bubbles include a "Tekrar dene" button that removes the error and resends.
- Typing indicator: 3 dots with staggered `withDelay+withRepeat` Reanimated animation.
- Input max height 132px (~6 lines at 22px line height).
- AI avatar color: `#6366F1` (indigo) — distinct from premium amber `#F59E0B`.
