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
/** Facts are insert-only. Replays still apply the idempotent domain operation:
 * a previous delivery may have saved the fact and failed updating subscriptions. */
export const notificationJournal: NotificationJournal = {
  async record(fact) {
    const { error } = await getServiceClient()
      .from("iap_notifications")
      .upsert(fact, {
        onConflict: "notification_uuid",
        ignoreDuplicates: true,
      });
    if (error) throw new Error("iap_journal_unavailable");
  },
  async result(notification_uuid, result) {
    const { error } = await getServiceClient()
      .from("iap_notification_attempts")
      .insert({ notification_uuid, result });
    if (error) throw new Error("iap_journal_result_unavailable");
  },
};
