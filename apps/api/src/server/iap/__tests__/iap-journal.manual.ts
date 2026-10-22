import assert from "node:assert/strict";
import { processNotification } from "../notifications";
import { createNotificationJournal } from "../notificationJournal";
import type {
  NotificationFact,
  NotificationJournal,
} from "../notificationJournal";
import { MemorySubscriptionRepo } from "./memoryRepo";
import { USER_A, tx, renewal } from "./fixtures";
import type { ResponseBodyV2DecodedPayload } from "@apple/app-store-server-library";
async function main() {
  const now = new Date();
  const transaction = tx(now.getTime(), {
    offerType: 1,
    price: 49900,
    currency: "BRL",
  });
  const facts = new Map<string, NotificationFact>();
  const results: string[] = [];
  const journal: NotificationJournal = {
    record: async (fact) => {
      if (!facts.has(fact.notification_uuid))
        facts.set(fact.notification_uuid, fact);
    },
    result: async (_, result) => {
      results.push(result);
    },
  };
  const repo = new MemorySubscriptionRepo();
  repo.profiles.add(USER_A);
  const payload: ResponseBodyV2DecodedPayload = {
    notificationUUID: "journal-1",
    notificationType: "DID_RENEW",
    signedDate: now.getTime(),
    data: {
      signedTransactionInfo: "verified-tx",
      signedRenewalInfo: "verified-renewal",
    },
  };
  const args = {
    payload,
    environment: "Sandbox",
    repo,
    journal,
    now,
    verifyTransaction: async () => transaction,
    verifyRenewalInfo: async () =>
      renewal(now.getTime(), { autoRenewStatus: 0 }),
  };
  let writes = 0;
  repo.beforeInsert = async () => {
    assert.equal(facts.size, 1, "journal must precede entitlement mutation");
    writes++;
    if (writes === 1) throw Error("transient database failure");
  };
  await assert.rejects(() => processNotification(args), /transient/);
  assert.equal(facts.size, 1);
  assert.equal(repo.rows.length, 0);
  await processNotification(args);
  await processNotification(args);
  assert.equal(facts.size, 1, "UUID unique across retry");
  assert.equal(repo.rows.length, 1);
  assert.equal(repo.rows[0]!.revision, 0, "identical replay no mutation");
  assert.equal(repo.rows[0]!.autoRenewStatus, 0);
  assert.equal(repo.rows[0]!.offerType, 1);
  assert.equal(facts.get("journal-1")?.price_milli, 49900);
  assert.equal(
    JSON.stringify([...facts.values()]).includes("verified-tx"),
    false,
    "no signed JWS stored",
  );
  await processNotification({
    ...args,
    payload: {
      ...payload,
      notificationUUID: "journal-2",
      data: { signedTransactionInfo: "verified-tx" },
    },
    verifyTransaction: async () => ({ ...transaction, offerType: undefined }),
  });
  assert.equal(
    repo.rows[0]!.autoRenewStatus,
    0,
    "restore without renewal preserves last verified status",
  );
  assert.equal(
    repo.rows[0]!.offerType,
    null,
    "verified transaction without offer clears stale offer metadata",
  );
  await assert.rejects(
    () =>
      processNotification({
        ...args,
        verifyTransaction: async () => {
          throw Error("bad signature");
        },
        payload: { ...payload, notificationUUID: "bad" },
      }),
    /bad signature/,
  );
  assert.equal(facts.has("bad"), false);
  await assert.rejects(
    () =>
      processNotification({
        ...args,
        verifyRenewalInfo: async () => {
          throw Error("bad renewal signature");
        },
        payload: { ...payload, notificationUUID: "bad-renewal" },
      }),
    /bad renewal/,
  );
  assert.equal(facts.has("bad-renewal"), false);
  const logMessages: unknown[][] = [];
  const warn = console.warn;
  console.warn = (...parts) => {
    logMessages.push(parts);
  };
  try {
    for (const operation of ["record", "result"] as const) {
      const available = new MemorySubscriptionRepo();
      available.profiles.add(USER_A);
      const failedJournal = {
        ...journal,
        [operation]: async () => {
          throw Error("PRIVATE DB ERROR");
        },
      };
      const applied = await processNotification({
        ...args,
        repo: available,
        journal: failedJournal,
      });
      assert.equal(applied.kind, "processed");
      assert.equal(
        available.rows.length,
        1,
        `${operation} failure must not block applyTransaction`,
      );
      for (const [uuid, type, expected] of [
        ["test-failed", "TEST", "test"],
        ["ignored-failed", "DID_RENEW", "ignored"],
      ]) {
        const result = await processNotification({
          ...args,
          repo: available,
          journal: failedJournal,
          payload: { notificationUUID: uuid, notificationType: type },
        });
        assert.equal(
          result.kind,
          expected,
          `${expected} still returns OK despite ${operation} failure`,
        );
      }
    }
    // Exercise actual persistence adapter for both PostgREST errors and rejected inserts.
    for (const rejected of [false, true]) {
      const adapter = createNotificationJournal((() => ({
        from: () => ({
          upsert: () => ({
            abortSignal: async () => {
              if (rejected) throw Error("PRIVATE INSERT");
              return { error: { message: "PRIVATE INSERT" } };
            },
          }),
          insert: () => ({
            abortSignal: async () => {
              if (rejected) throw Error("PRIVATE INSERT");
              return { error: { message: "PRIVATE INSERT" } };
            },
          }),
        }),
      })) as unknown as Parameters<typeof createNotificationJournal>[0]);
      const available = new MemorySubscriptionRepo();
      available.profiles.add(USER_A);
      assert.equal(
        (
          await processNotification({
            ...args,
            repo: available,
            journal: adapter,
          })
        ).kind,
        "processed",
      );
      assert.equal(available.rows.length, 1);
      assert.equal(
        (
          await processNotification({
            ...args,
            journal: adapter,
            payload: { notificationUUID: "test-db", notificationType: "TEST" },
          })
        ).kind,
        "test",
      );
      assert.equal(
        (
          await processNotification({
            ...args,
            journal: adapter,
            payload: {
              notificationUUID: "ignored-db",
              notificationType: "DID_RENEW",
            },
          })
        ).kind,
        "ignored",
      );
    }
    assert.ok(
      logMessages.some((parts) => parts[0] === "[iap-journal] record_failed"),
    );
    assert.ok(
      logMessages.some((parts) => parts[0] === "[iap-journal] result_failed"),
    );
    assert.equal(JSON.stringify(logMessages).includes("PRIVATE"), false);
  } finally {
    console.warn = warn;
  }
  await processNotification({
    ...args,
    payload: { notificationUUID: "test", notificationType: "TEST" },
  });
  assert.equal(facts.get("test")?.original_tx_id, null);
  const unknown = new MemorySubscriptionRepo();
  const outcome = await processNotification({
    ...args,
    repo: unknown,
    payload: { ...payload, notificationUUID: "no-owner" },
  });
  assert.equal(outcome.kind, "unassigned");
  assert.equal(facts.get("no-owner")?.user_id, null);
  assert.equal(
    facts.get("no-owner")?.original_tx_id,
    transaction.originalTransactionId,
  );
  console.log(
    "IAP journal: ordering, duplicate/retry, failure isolation, verified-only projection, metadata and unassigned/TEST passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
