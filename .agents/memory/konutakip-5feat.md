---
name: KonuTakip Notification System Rebuild
description: Full production notification system rebuilt from scratch — module layout, key invariants, bugs fixed, and things to watch.
---

## Module layout (utils/notifications/)

- `constants.ts` — `NotificationId` builders, `Channel` enum, `NotificationType` enum
- `logger.ts` — dev-only `notifLog` (no-ops in production)
- `permissions.ts` — `ensurePermission()` with in-memory cache; `invalidatePermissionCache()` for foreground resume
- `core.ts` — `setNotificationHandler` (module-level), `safeSchedule`, `safeCancel`, `getScheduledIds`
- `scheduler.ts` — one function per notification type: `scheduleTopicReminder`, `rescheduleTopicReminder`, `cancelTopicReminder`, `scheduleQuestionReminder`, `cancelQuestionReminder`, `scheduleDailyStudyReminder`, `cancelDailyStudyReminder`, `scheduleSessionReminder`, `cancelSessionReminder`
- `sync.ts` — `syncNotifications(input)` for app-start recovery; cancels orphans, reschedules missing
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
`syncNotifications` only reschedules if ID is absent from the OS scheduled set.

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

## Durable invariants / gotchas

**`scheduleQuestionReminder` = cancel + schedule** — calling it for an edit is sufficient; no explicit cancel needed before.

**`syncNotifications` topic rescue** — only works if `reminder.topicName && reminder.subjectName` are stored. Legacy data missing these fields silently skips re-schedule; user must re-set the reminder. Always store `topicName`/`subjectName` in `TopicReminderRecord`.

**`shouldShowBanner` + `shouldShowList`** — required alongside `shouldShowAlert` in `setNotificationHandler` for Expo SDK 53+. Missing them causes TS errors on some targets.

**Question edit modal** — interval picker now shown in both new and edit modes. `handleSave` checks `reminderInterval !== editingQuestion.reminderInterval` before calling `updateQuestionReminder` (avoids no-op reschedule).

**`saveData` typing** — Partial type must include any new persisted field or TS rejects the call in strict mode.

**iOS permissions** — `allowAnnouncements` is not a valid field in `requestPermissionsAsync`; omit it.

**Pre-existing TS issues (not ours)** — `calendar.fill` SFSymbol and the `useColors.ts` Record cast existed before this work.
