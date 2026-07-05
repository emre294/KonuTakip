---
name: KonuTakip Performance Optimizations
description: Shadow-ref pattern for saveData and memoization rules applied across screens.
---

## saveData shadow-ref pattern

`AppContext.tsx` uses `persistedDataRef` (a `useRef<Record<string, unknown>>({})`) to mirror the last-written AsyncStorage value. `saveData` merges updates into the ref and calls `AsyncStorage.setItem` once — no `getItem` on every save.

**Why:** Every user action previously triggered a disk read + parse + write cycle. The ref turns it into a merge + write, cutting latency in half for common actions (topic toggle, session complete, question mark).

**How to apply:** Seed `persistedDataRef.current = data` immediately after `JSON.parse(raw)` in `loadData`'s `else` branch (the "v3 data found" path). The v2 migration path starts with `{}` — first user action writes partial data, which is identical to the old behavior since v3 was empty.

## Screen memoization rules

- `allSubjects` (profile-derived) — `useMemo([profile])` in every screen that builds it.
- Derived session lists (`recurringSessions`, `oneTimeSessions`, `grouped`, `sortedDates`) — `useMemo([sessions])` or chained deps.
- `completedSessions` / `completedSessionCount` — `useMemo([sessions])` instead of inline `.filter` in JSX.
- `totalPending` (questions filter) — `useMemo([questions])`.
- `questionsBySubject` — single-pass `Map<subjectId, Question[]>` built in `useMemo([questions])`; passed directly to `SubjectSection` instead of re-filtering per section.
- `aytSubjects`, `fieldLabel` — `useMemo([profile])` in `subjects.tsx`.

## React.memo components

- `TaskItem` (index.tsx) — wrapped in `React.memo`.
- `QuestionCard` (questions.tsx) — wrapped in `React.memo`.

**Why:** These components are rendered in lists and receive stable prop references (ids, primitives), so memo avoids re-rendering every card when unrelated state changes.

**Note:** `SubjectCard` / `TopicRow` were NOT memoized because their callbacks are inline lambdas — memo without `useCallback` on every callback would be zero benefit.
