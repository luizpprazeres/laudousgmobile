/**
 * GATE — verificação de JWS da App Store.
 *
 * O que precisa continuar verdadeiro:
 *   1. as raízes embutidas são as OFICIAIS (fingerprint SHA-256 publicado);
 *   2. um JWS que encadeia numa raiz confiável, com bundle e ambiente
 *      certos, é aceito e decodificado;
 *   3. TUDO o resto é recusado: cadeia de outra CA, payload adulterado,
 *      `alg: none`, x5c curto, folha sem o OID da Apple, bundle errado,
 *      ambiente não permitido, e — o que importa em produção — a cadeia de
 *      TESTE apresentada ao verificador com as raízes OFICIAIS.
 *
 * Rodar da raiz do monorepo:
 *   pnpm validate:iap
 * ou só este:
 *   tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/iap/__tests__/iap-jws.manual.ts
 */

import { createHash } from "node:crypto";
import { Environment } from "@apple/app-store-server-library";
import { APPLE_ROOT_CERTIFICATES, appleRootCertificateBuffers } from "../appleRootCerts";
import {
  AppleSignedDataVerifier,
  AppleVerificationError,
  parseEnvironments,
} from "../verifier";
import { check, checkThrows, finish, section } from "./harness";
import { APP_APPLE_ID, BUNDLE_ID, USER_A, tx } from "./fixtures";
import { createTestChain, signJws, tamperPayload } from "./testChain";

const isCode = (code: string) => (e: unknown) =>
  e instanceof AppleVerificationError && e.code === code;

async function main() {
  section("Raízes oficiais embutidas");
  for (const cert of APPLE_ROOT_CERTIFICATES) {
    const der = Buffer.from(cert.derBase64, "base64");
    const fp = createHash("sha256").update(der).digest("hex").toUpperCase().match(/.{2}/g)!.join(":");
    check(`${cert.name}: fingerprint bate com o publicado pela Apple`, fp === cert.sha256Fingerprint, fp);
  }
  check("duas raízes carregadas como Buffer DER", appleRootCertificateBuffers().length === 2);

  section("Configuração");
  check("parseEnvironments aceita Production,Sandbox", parseEnvironments("Production,Sandbox").length === 2);
  check("parseEnvironments aceita só Sandbox", parseEnvironments(" sandbox ").length === 1);
  let recusouXcode = false;
  try { parseEnvironments("Production,Xcode"); } catch { recusouXcode = true; }
  check("parseEnvironments RECUSA Xcode (a lib pularia a assinatura)", recusouXcode);
  let recusouCtor = false;
  try {
    new AppleSignedDataVerifier({
      rootCertificates: appleRootCertificateBuffers(), bundleId: BUNDLE_ID, appAppleId: APP_APPLE_ID,
      environments: ["LocalTesting" as unknown as Environment.SANDBOX], enableOnlineChecks: false,
    });
  } catch { recusouCtor = true; }
  check("construtor RECUSA LocalTesting", recusouCtor);

  section("Cadeia de teste (raiz injetada) — caminho feliz");
  const chain = createTestChain("a");
  const attacker = createTestChain("b");
  const now = Date.now();
  const verifier = new AppleSignedDataVerifier({
    rootCertificates: [chain.rootDer],
    bundleId: BUNDLE_ID,
    appAppleId: APP_APPLE_ID,
    environments: [Environment.PRODUCTION, Environment.SANDBOX],
    enableOnlineChecks: false,
  });

  const bom = signJws(chain, tx(now) as Record<string, unknown>);
  const v = await verifier.verifyTransaction(bom);
  check("JWS válido é aceito", v.payload.transactionId === "2000000900000001");
  check("ambiente reportado = Sandbox", v.environment === Environment.SANDBOX);
  check("appAccountToken preservado", v.payload.appAccountToken === USER_A);

  const prod = signJws(chain, tx(now, { environment: "Production" }) as Record<string, unknown>);
  const vp = await verifier.verifyTransaction(prod);
  check("JWS Production é aceito quando Production está permitido", vp.environment === Environment.PRODUCTION);

  section("Recusas — assinatura e cadeia");
  await checkThrows("JWS forjado por OUTRA CA é recusado", () => verifier.verifyTransaction(
    signJws(attacker, tx(now) as Record<string, unknown>)), isCode("invalid_jws"));
  await checkThrows("payload ADULTERADO (assinatura original) é recusado", () => verifier.verifyTransaction(
    tamperPayload(bom)), isCode("invalid_jws"));
  await checkThrows("chave de outra cadeia com x5c da cadeia boa é recusado", () => verifier.verifyTransaction(
    signJws(chain, tx(now) as Record<string, unknown>, { key: attacker.leafKey })), isCode("invalid_jws"));
  await checkThrows("alg=none é recusado", () => verifier.verifyTransaction(
    signJws(chain, tx(now) as Record<string, unknown>, { header: { alg: "none", typ: "JWT", x5c: chain.x5c } })),
    isCode("invalid_jws"));
  await checkThrows("x5c com 2 certificados é recusado", () => verifier.verifyTransaction(
    signJws(chain, tx(now) as Record<string, unknown>, { header: { alg: "ES256", x5c: chain.x5c.slice(0, 2) } })),
    isCode("invalid_jws"));
  await checkThrows("sem x5c é recusado", () => verifier.verifyTransaction(
    signJws(chain, tx(now) as Record<string, unknown>, { header: { alg: "ES256" } })), isCode("invalid_jws"));
  const semOid = createTestChain("c", { leafSemOid: true });
  const verifierSemOid = new AppleSignedDataVerifier({
    rootCertificates: [semOid.rootDer], bundleId: BUNDLE_ID, appAppleId: APP_APPLE_ID,
    environments: [Environment.SANDBOX], enableOnlineChecks: false,
  });
  await checkThrows("folha SEM o OID da Apple é recusada mesmo com raiz confiável", () =>
    verifierSemOid.verifyTransaction(signJws(semOid, tx(now) as Record<string, unknown>)), isCode("invalid_jws"));
  await checkThrows("string que não é JWS é recusada", () => verifier.verifyTransaction("isto.nao.e.um.jws"),
    isCode("invalid_jws"));

  section("Recusas — identidade e ambiente");
  await checkThrows("bundleId errado é recusado", () => verifier.verifyTransaction(
    signJws(chain, tx(now, { bundleId: "com.exemplo.outro" }) as Record<string, unknown>)),
    isCode("invalid_app_identifier"));
  await checkThrows("environment=Xcode é recusado (nunca verificável)", () => verifier.verifyTransaction(
    signJws(chain, tx(now, { environment: "Xcode" }) as Record<string, unknown>)), isCode("invalid_environment"));
  const soSandbox = new AppleSignedDataVerifier({
    rootCertificates: [chain.rootDer], bundleId: BUNDLE_ID, appAppleId: APP_APPLE_ID,
    environments: [Environment.SANDBOX], enableOnlineChecks: false,
  });
  await checkThrows("Production é recusado quando só Sandbox está permitido", () => soSandbox.verifyTransaction(prod),
    isCode("invalid_environment"));
  await checkThrows("payload que DECLARA Sandbox mas o verificador é só Production", () =>
    new AppleSignedDataVerifier({
      rootCertificates: [chain.rootDer], bundleId: BUNDLE_ID, appAppleId: APP_APPLE_ID,
      environments: [Environment.PRODUCTION], enableOnlineChecks: false,
    }).verifyTransaction(bom), isCode("invalid_environment"));

  section("Produção: raízes OFICIAIS não confiam na cadeia de teste");
  const oficial = new AppleSignedDataVerifier({
    rootCertificates: appleRootCertificateBuffers(),
    bundleId: BUNDLE_ID,
    appAppleId: APP_APPLE_ID,
    environments: [Environment.PRODUCTION, Environment.SANDBOX],
    enableOnlineChecks: false,
  });
  await checkThrows("cadeia de teste é recusada pelas raízes Apple", () => oficial.verifyTransaction(bom),
    isCode("invalid_jws"));

  section("Notificação v2 (envelope + transação interna)");
  const inner = signJws(chain, tx(now, { transactionId: "2000000900000002", expiresDate: now + 60 * 24 * 3600 * 1000 }) as Record<string, unknown>);
  const envelope = signJws(chain, {
    notificationType: "DID_RENEW",
    notificationUUID: "6c2a0f3e-0000-4000-8000-000000000001",
    version: "2.0",
    signedDate: now,
    data: {
      appAppleId: APP_APPLE_ID,
      bundleId: BUNDLE_ID,
      bundleVersion: "185",
      environment: "Sandbox",
      signedTransactionInfo: inner,
    },
  });
  const n = await verifier.verifyNotification(envelope);
  check("envelope válido decodificado", n.payload.notificationType === "DID_RENEW" && n.environment === Environment.SANDBOX);
  const innerOk = await verifier.verifyTransaction(n.payload.data!.signedTransactionInfo!);
  check("transação interna verificada separadamente", innerOk.payload.transactionId === "2000000900000002");
  await checkThrows("envelope assinado por outra CA é recusado", () => verifier.verifyNotification(
    signJws(attacker, { notificationType: "EXPIRED", data: { appAppleId: APP_APPLE_ID, bundleId: BUNDLE_ID, environment: "Sandbox", signedTransactionInfo: inner } })),
    isCode("invalid_jws"));
  await checkThrows("envelope com bundle de outro app é recusado", () => verifier.verifyNotification(
    signJws(chain, { notificationType: "EXPIRED", data: { appAppleId: APP_APPLE_ID, bundleId: "com.outro.app", environment: "Sandbox", signedTransactionInfo: inner } })),
    isCode("invalid_app_identifier"));
  await checkThrows("envelope Production com appAppleId errado é recusado", () => verifier.verifyNotification(
    signJws(chain, { notificationType: "EXPIRED", data: { appAppleId: 1, bundleId: BUNDLE_ID, environment: "Production", signedTransactionInfo: inner } })),
    isCode("invalid_app_identifier"));
  const tamperedEnvelope = signJws(chain, {
    notificationType: "DID_RENEW",
    data: { appAppleId: APP_APPLE_ID, bundleId: BUNDLE_ID, environment: "Sandbox", signedTransactionInfo: tamperPayload(inner) },
  });
  const n2 = await verifier.verifyNotification(tamperedEnvelope);
  await checkThrows("transação ADULTERADA dentro de envelope válido é recusada", () =>
    verifier.verifyTransaction(n2.payload.data!.signedTransactionInfo!), isCode("invalid_jws"));

  finish();
}

main().catch((e) => {
  console.error("✗ gate abortou:", e);
  process.exit(1);
});
