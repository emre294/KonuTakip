---
name: KonuTakip 5-Feature Implementation
description: Notes on the five UX improvements applied to the KonuTakip app — what was done and what to watch out for.
---

## Features implemented

1. **Subject name renames** — `data/subjects.ts`: all 8 TYT subjects use short names ("Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü").

2. **Date/time pickers** — `components/pickers.tsx`: `DatePickerField` + `TimePickerField` using `@react-native-community/datetimepicker 8.4.4`. iOS = Modal+spinner, Android = native dialog, web = TextInput fallback. **Do not pass `locale` prop** — not in the type for this version. Used in `plan.tsx` and `mock-exams.tsx`.

3. **Solved question count** — `AppContext`: `topicSolvedQuestions: Record<string,number>`, `setTopicSolvedQuestion`, `totalSolvedQuestions` (computed). Stored in `konutakip_v3` key via merge. Compact numeric `TextInput` on each `TopicRow` in `subjects.tsx`. Home screen `RemainingTopicsCard` shows "Çözülen Soru" instead of "Toplam".

4. **Topic reminders** — `utils/notifications.ts`: `scheduleTopicReminder(topicId, topicName, subjectName, intervalDays)` / `cancelTopicReminder(topicId)`. Notification IDs namespaced `topic-{id}` (separate from `question-{id}`). Scheduling always cancels existing before scheduling new.  
   - `setTopicReminderCtx` throws if `scheduleTopicReminder` returns `false` — callers should `try/catch`.  
   - `toggleTopic` auto-cancels reminder when marking a topic complete (uses `wasCompleted` flag to avoid cancelling on un-complete).  
   - Bell icon on `TopicRow` opens `ReminderModal` (3/5/7 day options + remove).

5. **Notification deep-link** — `_layout.tsx` `AppContent` sets up `Notifications.addNotificationResponseReceivedListener` + `getLastNotificationResponseAsync` (cold start). `data.type === "topic_reminder"` → navigate to `/(tabs)/subjects`.

## Durable rules / gotchas

**Why saveData typing matters:** `saveData` has a typed Partial object; adding new fields requires updating the type or TS will reject the call silently in strict mode. Always add new persisted fields to both state and `saveData`'s Partial type.

**Why reminder success matters:** `scheduleTopicReminder` returns `boolean`. Only persist the reminder to state/storage if it returns `true`. Otherwise "phantom" reminder entries appear in UI with no actual notification scheduled.

**Pre-existing TS errors (not ours):** `calendar.fill` SFSymbol in `app/(tabs)/_layout.tsx` and the `useColors.ts` Record cast — both existed before this work.

**Notification handler fields:** Expo SDK 53+ requires `shouldShowBanner` and `shouldShowList` alongside `shouldShowAlert` in `setNotificationHandler`. Without them, TS error on web/native targets.

**iOS permissions:** `allowAnnouncements` is not a valid field in `requestPermissionsAsync` on current SDK — removed.
