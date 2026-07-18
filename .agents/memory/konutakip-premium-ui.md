---
name: KonuTakip Premium UI Patterns
description: Recurring responsive layout fixes for Premium and hero card components.
---

# KonuTakip Premium UI Patterns

## Hero row overflow fix (applied to all hero cards)

Any card with `flexDirection: "row"` containing a text block and an icon must use:

```tsx
// Text container:
heroTextWrap: { flex: 1, flexShrink: 1 }

// Icon container:
heroIcon: { flexShrink: 0 }

// The row itself:
heroRow: { flexDirection: "row", gap: 12, alignItems: "center" }
```

**Why:** Without `flex: 1` on the text block, long Turkish strings push the icon off-screen on small phones.

**Screens fixed so far:** `premium.tsx`, `ai-coach.tsx`

## Plan card / price layout

When a row has a text-heavy left side and a price/badge on the right:

```tsx
planTextWrap: { flex: 1, flexShrink: 1 }
priceWrap:    { flexShrink: 0 }
planHeader:   { flexDirection: "row", alignItems: "flex-start", gap: 12 }
```

Use `alignItems: "flex-start"` (not `"center"`) so multi-line billing text doesn't push the price down.

## Button minimum sizes

```tsx
upgradeBtn:  { minHeight: 54, paddingHorizontal: 12, paddingVertical: 16 }
restoreBtn:  { minHeight: 50, paddingHorizontal: 12 }
```

Prevents buttons from collapsing on small screens.

## PremiumGate locked view

- `paddingHorizontal: 24` (was 32 — too tight on small phones)
- `featureName`: add `numberOfLines={3}` + `adjustsFontSizeToFit` + `minimumFontScale={0.8}`
- Icon circle: `80×80` (was 88 — slightly more room on compact screens)
- Info card: `alignSelf: "stretch"` so it spans full width

## Settings premium card

Inner text view must have `flex: 1, flexShrink: 1` to prevent the subtitle from overflowing into the badge area.
