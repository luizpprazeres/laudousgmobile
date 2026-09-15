/**
 * VERIFICAÇÃO DE JWS DA APP STORE — com a biblioteca oficial da Apple.
 *
 * Antes, `jws.ts` fazia `JSON.parse(base64url(payload))` e chamava isso de
 * "decode". Não verificava assinatura, cadeia, bundle nem ambiente: qualquer
 * um com um JWT forjado ganhava plano pago. Este módulo substitui aquilo por
 * `SignedDataVerifier` (@apple/app-store-server-library), ancorada nas raízes
 * oficiais de `appleRootCerts.ts`.
 *
 * O que a biblioteca garante por JWS:
 *   - cadeia x5c de exatamente 3 certificados, folha com OID
 *     1.2.840.113635.100.6.11.1 e intermediária com 1.2.840.113635.100.6.2.1,
 *     ambas encadeadas a uma raiz confiável;
 *   - assinatura ES256 válida com a chave da folha;
 *   - validade dos certificados (na data de assinatura, ou hoje se online);
 *   - OCSP (revogação) quando `enableOnlineChecks` está ligado;
 *   - `bundleId`, `appAppleId` (produção) e `environment` iguais aos esperados.
 *
 * AMBIENTES: só `Production` e `Sandbox`. `Xcode`/`LocalTesting` fazem a
 * biblioteca PULAR a verificação de assinatura por desenho — nunca podem ser
 * aceitos por um servidor. Sandbox precisa ficar aceito em produção: é o que o
 * revisor da Apple e o TestFlight usam. O ambiente gravado na assinatura
 * permite auditar e separar depois.
 */

import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { env } from "@/server/env";
import { appleRootCertificateBuffers } from "./appleRootCerts";

export type AllowedEnvironment = Environment.PRODUCTION | Environment.SANDBOX;

export type AppleVerifierConfig = {
  rootCertificates: Buffer[];
  bundleId: string;
  /** Obrigatório para Production (a biblioteca recusa sem ele). */
  appAppleId?: number;
  environments: AllowedEnvironment[];
  enableOnlineChecks: boolean;
};

export type AppleVerificationCode =
  | "invalid_jws"
  | "invalid_app_identifier"
  | "invalid_environment"
  | "verification_unavailable";

/**
 * Erro tipado para as rotas decidirem o HTTP: `retryable` = a Apple não pôde
 * ser consultada (OCSP fora do ar, rede) — o cliente deve tentar de novo e NÃO
 * deve dar `finish()` na transação. Os demais são definitivos.
 */
export class AppleVerificationError extends Error {
  readonly code: AppleVerificationCode;
  readonly retryable: boolean;
  readonly status: VerificationStatus | null;

  constructor(code: AppleVerificationCode, status: VerificationStatus | null, cause?: unknown) {
    super(`apple_jws_${code}`);
    this.name = "AppleVerificationError";
    this.code = code;
    this.status = status;
    this.retryable = code === "verification_unavailable";
    if (cause instanceof Error) this.cause = cause;
  }
}

export type VerifiedTransaction = {
  payload: JWSTransactionDecodedPayload;
  environment: AllowedEnvironment;
};

export type VerifiedNotification = {
  payload: ResponseBodyV2DecodedPayload;
  environment: AllowedEnvironment;
};

export class AppleSignedDataVerifier {
  private readonly verifiers: Map<AllowedEnvironment, SignedDataVerifier>;
  readonly environments: AllowedEnvironment[];

  constructor(config: AppleVerifierConfig) {
    if (config.environments.length === 0) {
      throw new Error("AppleSignedDataVerifier: nenhum ambiente permitido");
    }
    for (const e of config.environments) {
      if (e !== Environment.PRODUCTION && e !== Environment.SANDBOX) {
        throw new Error(`AppleSignedDataVerifier: ambiente não permitido: ${String(e)}`);
      }
    }
    this.environments = [...config.environments];
    this.verifiers = new Map();
    for (const e of this.environments) {
      this.verifiers.set(
        e,
        new SignedDataVerifier(
          config.rootCertificates,
          config.enableOnlineChecks,
          e,
          config.bundleId,
          e === Environment.PRODUCTION ? config.appAppleId : undefined,
        ),
      );
    }
  }

  /**
   * Escolhe o verificador pelo `environment` DECLARADO no payload (ainda não
   * verificado). É seguro: a biblioteca reconfere esse mesmo campo DEPOIS de
   * validar a assinatura, e só existem verificadores para ambientes
   * permitidos. Evita verificar a cadeia (e consultar OCSP) duas vezes.
   */
  private pick(claimed: unknown): { env: AllowedEnvironment; verifier: SignedDataVerifier } {
    if (claimed === NOT_A_JWS) {
      throw new AppleVerificationError("invalid_jws", VerificationStatus.FAILURE);
    }
    const env = claimed === Environment.PRODUCTION || claimed === Environment.SANDBOX
      ? (claimed as AllowedEnvironment)
      : null;
    const verifier = env ? this.verifiers.get(env) : undefined;
    if (!env || !verifier) {
      throw new AppleVerificationError("invalid_environment", VerificationStatus.INVALID_ENVIRONMENT);
    }
    return { env, verifier };
  }

  async verifyTransaction(signedTransaction: string): Promise<VerifiedTransaction> {
    const claimed = peekClaim(signedTransaction, (p) => p.environment);
    const { env, verifier } = this.pick(claimed);
    const payload = await run(() => verifier.verifyAndDecodeTransaction(signedTransaction));
    return { payload, environment: env };
  }

  async verifyRenewalInfo(
    signedRenewalInfo: string,
    environment: AllowedEnvironment,
  ): Promise<JWSRenewalInfoDecodedPayload> {
    const verifier = this.verifiers.get(environment);
    if (!verifier) {
      throw new AppleVerificationError("invalid_environment", VerificationStatus.INVALID_ENVIRONMENT);
    }
    return run(() => verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo));
  }

  async verifyNotification(signedPayload: string): Promise<VerifiedNotification> {
    const claimed = peekClaim(signedPayload, (p) => {
      const data = p.data as { environment?: unknown } | undefined;
      const summary = p.summary as { environment?: unknown } | undefined;
      return data?.environment ?? summary?.environment;
    });
    const { env, verifier } = this.pick(claimed);
    const payload = await run(() => verifier.verifyAndDecodeNotification(signedPayload));
    return { payload, environment: env };
  }
}

const NOT_A_JWS = Symbol("not_a_jws");

/**
 * Lê um campo do payload SEM verificar. Só serve para escolher o verificador.
 * Devolve `NOT_A_JWS` quando a string nem tem a forma de um JWS.
 */
function peekClaim(jws: string, pick: (payload: Record<string, unknown>) => unknown): unknown {
  const parts = jws.split(".");
  if (parts.length !== 3 || !parts[1]) return NOT_A_JWS;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as unknown;
    if (!payload || typeof payload !== "object") return NOT_A_JWS;
    return pick(payload as Record<string, unknown>);
  } catch {
    return NOT_A_JWS;
  }
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toAppleError(error);
  }
}

export function toAppleError(error: unknown): AppleVerificationError {
  if (error instanceof AppleVerificationError) return error;
  if (error instanceof VerificationException) {
    switch (error.status) {
      case VerificationStatus.RETRYABLE_VERIFICATION_FAILURE:
        return new AppleVerificationError("verification_unavailable", error.status, error);
      case VerificationStatus.INVALID_APP_IDENTIFIER:
        return new AppleVerificationError("invalid_app_identifier", error.status, error);
      case VerificationStatus.INVALID_ENVIRONMENT:
        return new AppleVerificationError("invalid_environment", error.status, error);
      default:
        return new AppleVerificationError("invalid_jws", error.status, error);
    }
  }
  return new AppleVerificationError("invalid_jws", null, error);
}

export function parseEnvironments(raw: string): AllowedEnvironment[] {
  const out: AllowedEnvironment[] = [];
  for (const item of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const norm = item.toLowerCase();
    if (norm === "production" && !out.includes(Environment.PRODUCTION)) out.push(Environment.PRODUCTION);
    else if (norm === "sandbox" && !out.includes(Environment.SANDBOX)) out.push(Environment.SANDBOX);
    else if (norm !== "production" && norm !== "sandbox") {
      throw new Error(`APPLE_IAP_ENVIRONMENTS: valor não permitido "${item}" (só Production,Sandbox)`);
    }
  }
  return out;
}

let _shared: AppleSignedDataVerifier | null = null;

/** Verificador de produção, montado a partir da env. Memoizado (cache OCSP). */
export function getAppleVerifier(): AppleSignedDataVerifier {
  if (_shared) return _shared;
  const e = env();
  const appAppleId = Number(e.APPLE_APP_APPLE_ID);
  if (!Number.isInteger(appAppleId) || appAppleId <= 0) {
    throw new Error("APPLE_APP_APPLE_ID inválido — precisa ser o Apple ID numérico do app");
  }
  _shared = new AppleSignedDataVerifier({
    rootCertificates: appleRootCertificateBuffers(),
    bundleId: e.APPLE_BUNDLE_ID,
    appAppleId,
    environments: parseEnvironments(e.APPLE_IAP_ENVIRONMENTS),
    enableOnlineChecks: e.APPLE_IAP_ONLINE_CHECKS !== "false",
  });
  return _shared;
}
