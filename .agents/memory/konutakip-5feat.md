---
name: KonuTakip Notification System Rebuild
description: Full production notification system rebuilt from scratch — module layout, key invariants, bugs fixed, and things to watch.
---

## Module layout (utils/notifications/)

- `constants.ts` — `NotificationId` builders, `Channel` enum, `NotificationType` enum
- `logger.ts` — dev-only `notifLog` (no-ops in production)
- `permissions.ts` — `ensurePermission()` with in-memory cache; `invalidatePermissionCache()` for foreground resume
- `core.ts` — `setNotificationHandler` (module-level), `safeSchedule`, `safeCancel`, `getAllScheduledNotifications`, `getScheduledIds`
- `scheduler.ts` — one function per notification type: `scheduleTopicReminder`, `rescheduleTopicReminder`, `cancelTopicReminder`, `scheduleQuestionReminder`, `cancelQuestionReminder`, `scheduleDailyStudyReminder`, `cancelDailyStudyReminder`, `scheduleSessionReminder`, `cancelSessionReminder`
- `sync.ts` — `syncNotifications(input)` for app-start + foreground recovery; cancels orphans, reschedules missing/wrong-date
- `routing.ts` — `handleNotificationTap(data, router)` maps notification type → route
- `index.ts` — `initNotifications()`, re-exports all public functions

## Notification ID scheme

```
topic_reminder::{topicId}
question_reminder::{questionId}
daily_reminder::study
session_reminder::{sessionId}
```

`safeSchedule` always cancel-then-schedule (no duplicates).  
`syncNotifications` reschedules if ID is absent OR if `scheduledForDate` payload field doesn't match `question.nextReviewDate`.

## AppContext wiring

- `updateSession` — edits session, cancels old notification, schedules new one
- `updateQuestionReminder(id, interval)` — changes reminder interval for existing question: recomputes `nextReviewDate` from today, cancels old via `safeSchedule` inside `scheduleQuestionReminder`, persists both `reminderInterval` and `nextReviewDate`
- `dailyReminder` state + `setDailyReminder` / `removeDailyReminder` — new field in v3 storage
- `syncNotifications` called after `loadData` once v3 data exists

## Storage

`STORAGE_KEY = "konutakip_v3"` — new field: `dailyReminder: { hour, minute, enabled } | null`

## _layout.tsx wiring

- `initNotifications()` in effect at mount
- `handleNotificationTap` for foreground response listener
- `handleColdStartNotification` (guarded by `_lastHandledResponseId` to prevent double-nav)
- `invalidatePermissionCache()` on AppState → active
- AppState watchdog: `runWatchdogSyncRef.current()` on background→foreground (30s cooldown)
- **Periodic watchdog**: `setInterval(10 min)` calls `runWatchdogSyncRef.current()` while `AppState.currentState === "active"` — covers the case where `addNotificationReceivedListener` silently skips on Android

## Wrong Question Reminder — Confirmed Root Causes (fixed 2026-07-05)

### Root Cause 1 (PRIMARY): No periodic foreground watchdog
`addNotificationReceivedListener` is NOT reliable on all Android devices/versions
for local scheduled notifications — documented Expo/Android behavior. Without a
periodic watchdog, the chain could stop whenever: (a) the notification fires while
the app is foregrounded AND the listener is skipped by Android, AND (b) the user
never backgrounds/foregrounds the app.

**Fix:** `setInterval(10 minutes)` in `_layout.tsx`→`useEffect` calls `runWatchdogSyncRef.current()`
while `AppState.currentState === "active"`. Interval is cleared in effect cleanup.

### Root Cause 2 (SECONDARY): Watchdog only checked notification presence, not correctness
If a notification existed in the OS queue but was scheduled for the wrong date
(device clock change, DST, prior bug), `hasOsNotification = true` → watchdog did
nothing → chain appeared broken.

**Fix:** `scheduleQuestionReminder` now embeds `scheduledForDate` (the actual YYYY-MM-DD
it will fire, accounting for date bumping) in the notification payload. `sync.ts`
reads this field and if `scheduledForDate !== question.nextReviewDate`, repairs
the notification ("wrong_date" reason). Backward compatible: notifications without
the field are trusted.

## Reminder reliability architecture (in order of reliability)

1. **Periodic watchdog** (every 10 min, runs always while app is active) — MOST RELIABLE
2. **AppState watchdog** (on background→foreground, 30s cooldown) — catches background delivery
3. **Cold-start watchdog** via `loadData → syncNotifications` — catches reboots/kills
4. **Foreground delivery listener** (`addNotificationReceivedListener`) — LEAST RELIABLE on Android

## Durable invariants / gotchas

**`scheduleQuestionReminder` = cancel + schedule** — calling it for an edit is sufficient; no explicit cancel needed before.

**`scheduledForDate` payload field** — `scheduler.ts` computes `scheduledForDate` AFTER the date-bump check so it always matches the actual OS trigger date, not the user's stored `nextReviewDate`. If the dates are mismatched, `sync.ts` detects `wrong_date` and reschedules. Old notifications (pre-fix) without this field are trusted, not flagged.

**`syncNotifications` topic rescue** — only works if `reminder.topicName && reminder.subjectName` are stored. Legacy data missing these fields silently skips re-schedule; user must re-set the reminder. Always store `topicName`/`subjectName` in `TopicReminderRecord`.

**`shouldShowBanner` + `shouldShowList`** — required alongside `shouldShowAlert` in `setNotificationHandler` for Expo SDK 53+. Missing them causes TS errors on some targets.

**Question edit modal** — interval picker now shown in both new and edit modes. `handleSave` checks `reminderInterval !== editingQuestion.reminderInterval` before calling `updateQuestionReminder` (avoids no-op reschedule).

**Recurring study sessions** — `DailySession` has `repeatType: "one_time" | "every_day" | "every_week"` and optional `weekdays?: number[]` (JS: 0=Sun). Expo WEEKLY trigger uses 1=Sun…7=Sat so Expo weekday = JS weekday + 1. Notification IDs: `session_reminder::<id>` (one-time), `session_reminder::<id>::daily`, `session_reminder::<id>::wd<0-6>`. `cancelAllSessionReminders` cancels all 9 possible IDs unconditionally. Old sessions default to `repeatType: "one_time"` in both v2 migration and v3 load.

**Persistent question reminder cycle** — question reminders are NOT truly recurring (Expo has no custom-interval repeating trigger). The cycle is maintained at the app level:
1. `scheduleQuestionReminder` stores `reminderInterval` + `scheduledForDate` in the notification payload.
2. `addNotificationReceivedListener` in `_layout.tsx` fires when the notification arrives while the app is foreground → immediately schedules next occurrence + calls `updateQuestionNextReviewDate` to persist the new date.
3. For background/closed delivery: `syncNotifications` detects `nextReviewDate` in the past + missing OS notification → repairs by scheduling `today + reminderInterval`.
4. For wrong-date notifications (exists but `scheduledForDate ≠ nextReviewDate`): `syncNotifications` detects mismatch → cancels + reschedules correctly.

**`saveData` typing** — Partial type must include any new persisted field or TS rejects the call in strict mode.

**iOS permissions** — `allowAnnouncements` is not a valid field in `requestPermissionsAsync`; omit it.

**Pre-existing TS issues (not ours)** — `calendar.fill` SFSymbol and the `useColors.ts` Record cast existed before this work.

**Automatic Daily Question Tracking (`dailySolvedQuestions`)** — kept as a single running `number` in AppContext (not a per-topic/per-date Record like `topicSolvedQuestions`), since the spec only needed one cumulative total, not a breakdown. Each `DailySession` carries its own `countedInStatistics?: boolean` guard flag so `completeSession`/`updateSession`/`deleteSession` can each independently add/adjust/subtract that session's `targetQuestions` without ever touching `topicSolvedQuestions`. `completeSession` now returns the amount just added (0 if already counted) so callers can conditionally show "X soru eklendi" feedback.
