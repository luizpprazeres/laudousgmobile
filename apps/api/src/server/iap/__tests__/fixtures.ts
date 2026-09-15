/** Payloads de transação/renewal no formato decodificado da Apple. */

import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";

export const BUNDLE_ID = "com.laudousg.LaudoUSG";
export const APP_APPLE_ID = 6770609540;
export const USER_A = "11111111-1111-4111-8111-111111111111";
export const USER_B = "22222222-2222-4222-8222-222222222222";

export const DAY = 24 * 3600 * 1000;
export const HOUR = 3600 * 1000;

export function tx(
  now: number,
  over: Partial<JWSTransactionDecodedPayload> = {},
): JWSTransactionDecodedPayload {
  return {
    originalTransactionId: "2000000900000001",
    transactionId: "2000000900000001",
    webOrderLineItemId: "2000000090000001",
    bundleId: BUNDLE_ID,
    productId: "com.laudousg.LaudoUSG.pro.monthly",
    subscriptionGroupIdentifier: "22108912",
    purchaseDate: now - HOUR,
    originalPurchaseDate: now - HOUR,
    expiresDate: now + 30 * DAY,
    quantity: 1,
    type: "Auto-Renewable Subscription",
    appAccountToken: USER_A,
    inAppOwnershipType: "PURCHASED",
    signedDate: now,
    environment: "Sandbox",
    transactionReason: "PURCHASE",
    storefront: "BRA",
    storefrontId: "143503",
    price: 159900,
    currency: "BRL",
    ...over,
  };
}

export function renewal(
  now: number,
  over: Partial<JWSRenewalInfoDecodedPayload> = {},
): JWSRenewalInfoDecodedPayload {
  return {
    originalTransactionId: "2000000900000001",
    autoRenewProductId: "com.laudousg.LaudoUSG.pro.monthly",
    productId: "com.laudousg.LaudoUSG.pro.monthly",
    autoRenewStatus: 1,
    signedDate: now,
    environment: "Sandbox",
    recentSubscriptionStartDate: now - HOUR,
    renewalDate: now + 30 * DAY,
    ...over,
  };
}
