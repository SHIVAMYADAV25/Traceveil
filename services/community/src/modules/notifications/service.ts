import type { AppContext } from "../../types.js";
import { insertNotification } from "./repo.js";

/**
 * Save a notification and push it live if the person is connected.
 * A failure here must never break the action that caused it, so errors are swallowed.
 */
export async function notify(
  ctx: AppContext,
  accountId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const notification = await insertNotification(ctx.db, accountId, kind, payload);
    ctx.realtime.sendToAccount(accountId, { type: "notification.created", data: { notification } });
  } catch (err) {
    console.error("notification failed:", err instanceof Error ? err.message : err);
  }
}
