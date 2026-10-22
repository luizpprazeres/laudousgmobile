import assert from "node:assert/strict";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { test } from "node:test";
import { credenciaisDoEnv, gerarToken } from "../src/lib/asc/cliente";
import { interpretarVendasTsv, relatoriosConfigurados } from "../src/lib/asc/relatorios";
import { iniciais } from "../src/lib/asc/testflight";

test("JWT ES256 do App Store Connect é válido e não carrega a chave", () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const cred = credenciaisDoEnv("ASC", { ASC_KEY_ID: "KID123", ASC_ISSUER_ID: "iss-1", ASC_PRIVATE_KEY: pem.replace(/\n/g, "\\n") });
  assert.ok(cred);
  const tok = gerarToken(cred, 1_700_000_000);
  const [h, c, s] = tok.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h!, "base64url").toString()), { alg: "ES256", kid: "KID123", typ: "JWT" });
  const corpo = JSON.parse(Buffer.from(c!, "base64url").toString());
  assert.equal(corpo.aud, "appstoreconnect-v1");
  assert.equal(corpo.exp - corpo.iat, 1100);
  assert.ok(verify("sha256", Buffer.from(`${h}.${c}`), { key: createPublicKey(privateKey), dsaEncoding: "ieee-p1363" }, Buffer.from(s!, "base64url")));
  assert.ok(!tok.includes("PRIVATE"));
});

test("sem chave configurada → sem credencial (nada é chamado)", () => {
  assert.equal(credenciaisDoEnv("ASC", {}), null);
  assert.equal(credenciaisDoEnv("ASC", { ASC_KEY_ID: "k", ASC_ISSUER_ID: "i", ASC_PRIVATE_KEY: "lixo" }), null);
  assert.equal(relatoriosConfigurados({}), false);
});

test("nomes de testadores viram iniciais", () => {
  assert.equal(iniciais("Luiz", "Prazeres"), "LP");
  assert.equal(iniciais("ana", null), "A");
  assert.equal(iniciais(null, null), "—");
});

test("SALES/SUMMARY: soma primeiras instalações e reinstalações do app", () => {
  const tsv = [
    "Provider\tSKU\tUnits\tProduct Type Identifier\tCountry Code\tApple Identifier",
    "APPLE\tx\t3\t1F\tBR\t6770609540",
    "APPLE\tx\t1\t1\tPT\t6770609540",
    "APPLE\tx\t2\t3F\tBR\t6770609540",
    "APPLE\tx\t9\t7F\tBR\t6770609540",
    "APPLE\ty\t5\t1F\tBR\t111",
  ].join("\n");
  const r = interpretarVendasTsv(tsv, "2026-10-20", "6770609540");
  assert.equal(r.primeiras, 4);
  assert.equal(r.reinstalacoes, 2);
  assert.deepEqual(r.porPais, { BR: 3, PT: 1 });
});
