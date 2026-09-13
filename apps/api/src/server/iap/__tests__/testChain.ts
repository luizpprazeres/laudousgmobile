/**
 * CADEIA DE CERTIFICADOS DE TESTE — para provar que a verificação REJEITA o
 * que não é da Apple, e aceita só o que encadeia numa raiz confiável.
 *
 * A biblioteca da Apple exige, além da assinatura: cadeia x5c de 3
 * certificados, folha com a extensão OID 1.2.840.113635.100.6.11.1,
 * intermediária CA com 1.2.840.113635.100.6.2.1, e raiz igual a uma das
 * confiáveis. Geramos tudo isso com o `openssl` do sistema (P-256), em um
 * diretório temporário, e injetamos a raiz de teste no verificador. Nos testes
 * negativos, a MESMA cadeia é apresentada a um verificador com as raízes
 * OFICIAIS — e tem de ser recusada.
 */

import { execFileSync } from "node:child_process";
import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type TestChain = {
  dir: string;
  rootDer: Buffer;
  /** base64 DER, na ordem do x5c: folha, intermediária, raiz. */
  x5c: [string, string, string];
  leafKey: KeyObject;
};

const EXT_CNF = `
[inter]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
1.2.840.113635.100.6.2.1 = DER:0500

[leaf]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
1.2.840.113635.100.6.11.1 = DER:0500

[leaf_sem_oid]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
`;

const ROOT_CNF = `
[req]
distinguished_name = dn
prompt = no
[dn]
CN = LaudoUSG Test Root
O = LaudoUSG Test
[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
`;

function openssl(args: string[], cwd: string): string {
  return execFileSync("openssl", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString();
}

function pemToDer(pem: string): Buffer {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  return Buffer.from(b64, "base64");
}

export function createTestChain(label = "a", opts: { leafSemOid?: boolean } = {}): TestChain {
  const dir = mkdtempSync(join(tmpdir(), `laudousg-iap-chain-${label}-`));
  writeFileSync(join(dir, "ext.cnf"), EXT_CNF);
  writeFileSync(join(dir, "root.cnf"), ROOT_CNF.replace("LaudoUSG Test Root", `LaudoUSG Test Root ${label}`));

  openssl(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "root.key"], dir);
  openssl(
    ["req", "-new", "-x509", "-key", "root.key", "-sha256", "-days", "30",
      "-config", "root.cnf", "-extensions", "v3_ca", "-out", "root.pem"],
    dir,
  );

  openssl(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "inter.key"], dir);
  openssl(
    ["req", "-new", "-key", "inter.key", "-subj", `/CN=LaudoUSG Test Intermediate ${label}/O=LaudoUSG Test`,
      "-out", "inter.csr"],
    dir,
  );
  openssl(
    ["x509", "-req", "-in", "inter.csr", "-CA", "root.pem", "-CAkey", "root.key", "-CAcreateserial",
      "-days", "30", "-sha256", "-extfile", "ext.cnf", "-extensions", "inter", "-out", "inter.pem"],
    dir,
  );

  openssl(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "leaf.key"], dir);
  openssl(
    ["req", "-new", "-key", "leaf.key", "-subj", `/CN=LaudoUSG Test Signer ${label}/O=LaudoUSG Test`,
      "-out", "leaf.csr"],
    dir,
  );
  openssl(
    ["x509", "-req", "-in", "leaf.csr", "-CA", "inter.pem", "-CAkey", "inter.key", "-CAcreateserial",
      "-days", "30", "-sha256", "-extfile", "ext.cnf",
      "-extensions", opts.leafSemOid ? "leaf_sem_oid" : "leaf", "-out", "leaf.pem"],
    dir,
  );

  const rootPem = readFileSync(join(dir, "root.pem"), "utf8");
  const interPem = readFileSync(join(dir, "inter.pem"), "utf8");
  const leafPem = readFileSync(join(dir, "leaf.pem"), "utf8");
  const leafKey = createPrivateKey(readFileSync(join(dir, "leaf.key"), "utf8"));

  return {
    dir,
    rootDer: pemToDer(rootPem),
    x5c: [
      pemToDer(leafPem).toString("base64"),
      pemToDer(interPem).toString("base64"),
      pemToDer(rootPem).toString("base64"),
    ],
    leafKey,
  };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export type SignOptions = {
  /** Sobrescreve o header (ex.: x5c truncado, alg none). */
  header?: Record<string, unknown>;
  /** Chave alternativa (ex.: de outra cadeia) para assinar. */
  key?: KeyObject;
};

/** JWS ES256 no formato que a App Store usa (header com x5c). */
export function signJws(chain: TestChain, payload: Record<string, unknown>, opts: SignOptions = {}): string {
  const header = opts.header ?? { alg: "ES256", typ: "JWT", x5c: chain.x5c };
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${head}.${body}`;
  if (header.alg === "none") return `${signingInput}.`;
  const sig = sign("sha256", Buffer.from(signingInput), {
    key: opts.key ?? chain.leafKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64url(sig)}`;
}

/** Troca um caractere do payload mantendo a assinatura original. */
export function tamperPayload(jws: string): string {
  const [h, p, s] = jws.split(".");
  const decoded = JSON.parse(Buffer.from(p!, "base64url").toString("utf8")) as Record<string, unknown>;
  decoded.productId = "com.laudousg.LaudoUSG.pro.yearly";
  decoded.expiresDate = Date.now() + 365 * 24 * 3600 * 1000;
  return `${h}.${b64url(JSON.stringify(decoded))}.${s}`;
}
