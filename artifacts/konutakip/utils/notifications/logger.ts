/**
 * Development-only notification logger.
 * All calls compile to no-ops in production (process.env.NODE_ENV check).
 */

const PREFIX = "[Notifications]";
const IS_DEV = process.env.NODE_ENV !== "production";

export const notifLog = {
  scheduled(identifier: string, fireAt: string | Date): void {
    if (!IS_DEV) return;
    const when = fireAt instanceof Date ? fireAt.toISOString() : fireAt;
    console.log(`${PREFIX} ✅ scheduled  ${identifier}  @ ${when}`);
  },

  cancelled(identifier: string): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 🗑  cancelled  ${identifier}`);
  },

  restored(identifier: string, fireAt: string | Date): void {
    if (!IS_DEV) return;
    const when = fireAt instanceof Date ? fireAt.toISOString() : fireAt;
    console.log(`${PREFIX} 🔄 restored   ${identifier}  @ ${when}`);
  },

  tapped(identifier: string, route: string | null): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 👆 tapped     ${identifier}  → ${route ?? "(unknown)"}`);
  },

  skipped(identifier: string, reason: string): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} ⏭  skipped    ${identifier}  (${reason})`);
  },

  permissionGranted(): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 🔑 permission granted`);
  },

  permissionDenied(): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} 🚫 permission denied`);
  },

  syncStart(counts: { topics: number; questions: number; sessions: number }): void {
    if (!IS_DEV) return;
    console.log(
      `${PREFIX} 🔃 sync start — topics:${counts.topics} questions:${counts.questions} sessions:${counts.sessions}`
    );
  },

  syncComplete(rebuilt: number, cancelled: number): void {
    if (!IS_DEV) return;
    console.log(`${PREFIX} ✔  sync done  — rebuilt:${rebuilt} cancelled:${cancelled}`);
  },

  error(context: string, err: unknown): void {
    if (!IS_DEV) return;
    console.warn(`${PREFIX} ❌ error in ${context}:`, err);
  },
};
