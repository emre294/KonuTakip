---
name: KonuTakip Architecture
description: Key decisions for the KonuTakip Expo YKS study tracker app
---

All state is AsyncStorage-only (no backend API calls). Key files:
- `contexts/AppContext.tsx` — single source of truth; AsyncStorage key is `konutakip_v2`
- `data/subjects.ts` — all TYT + AYT subjects/topics; exam dates hardcoded to 2027-06-14/15
- `constants/colors.ts` — full light+dark token set

Stack screens (modals) are at app root: `statistics`, `achievements`, `ai-coach`.
5 tab screens: `index`, `subjects`, `plan`, `questions`, `settings`.
Onboarding guard: `app/_layout.tsx` uses `useSegments` + `useApp().profile` to redirect.
AI Coach is entirely local — analyzes progress data, no external API.
Spaced repetition: simple 7-day review date on Question objects, no external library.

**Why AsyncStorage-only:** first_build rules; keeps app offline-capable with zero backend cost.
**Why 2027 exam dates:** 2026 TYT/AYT already passed as of build date (July 2026).
