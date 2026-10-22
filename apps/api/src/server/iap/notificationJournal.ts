import { getServiceClient } from "../supabaseService";
export type NotificationFact = {
  notification_uuid: string;
  signed_date: string | null;
  notification_type: string;
  subtype: string | null;
  environment: string;
  user_id: string | null;
  original_tx_id: string | null;
  product_id: string | null;
  offer_type: number | null;
  offer_discount_type: string | null;
  price_milli: number | null;
  currency: string | null;
  auto_renew_status: number | null;
  expires_at: string | null;
};
export interface NotificationJournal {
  record(fact: NotificationFact): Promise<void>;
  result(uuid: string, result: string): Promise<void>;
}
/** Logging must never change webhook/entitlement outcomes or leak payloads. */
export async function bestEffortJournal(
  operation: "record" | "result",
  write: () => Promise<void>,
): Promise<void> {
  try {
    await write();
  } catch {
    console.warn(`[iap-journal] ${operation}_failed`);
  }
}
/** Facts remain insert-only; replays still apply the idempotent domain operation. */
export function createNotificationJournal(
  client = getServiceClient,
): NotificationJournal {
  return {
    record: (fact) =>
      bestEffortJournal("record", async () => {
        const { error } = await client()
          .from("iap_notifications")
          .upsert(fact, {
            onConflict: "notification_uuid",
            ignoreDuplicates: true,
          })
          .abortSignal(AbortSignal.timeout(3000));
        if (error) throw new Error("iap_journal_unavailable");
      }),
    result: (notification_uuid, result) =>
      bestEffortJournal("result", async () => {
        const { error } = await client()
          .from("iap_notification_attempts")
          .insert({ notification_uuid, result })
          .abortSignal(AbortSignal.timeout(3000));
        if (error) throw new Error("iap_journal_result_unavailable");
      }),
  };
}
export const notificationJournal = createNotificationJournal();
