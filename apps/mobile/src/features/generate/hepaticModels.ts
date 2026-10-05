import {
  HEPATIC_CONTRACT_VERSION,
  hepaticQualityByMethod,
  type HepaticAssessment,
  type HepaticInterpretationConfirmation,
  type HepaticModuleKey,
} from "@laudousg/shared";
import { HEPATIC_ANDROID_MODELS_ENABLED } from "../../ui/tokens";
import type { HepaticMethod, HepaticQualityConfiguration } from "./hepaticWorkspace";

/**
 * Paridade Android dos modelos hepáticos estruturados (`hepatic-assessment/v1`),
 * mesmos códigos de categoria da Web e de `/api/v1/hepatic-reports`.
 */
export const HEPATIC_ANDROID_MODELS = [
  { id: "AVALIACAO_MULTIPARAMETRICA_HEPATICA", name: "Avaliação multiparamétrica hepática", purpose: "multiparametric" },
  { id: "ELASTOGRAFIA_HEPATICA", name: "Elastografia hepática", purpose: "elastography" },
] as const;

export type HepaticAndroidModelCode = (typeof HEPATIC_ANDROID_MODELS)[number]["id"];

/**
 * Gate de catálogo ativo, definido em ui/tokens.ts. O servidor mantém validação
 * de método, qualidade técnica e confirmação antes da geração.
 */
export { HEPATIC_ANDROID_MODELS_ENABLED };

export function isHepaticAndroidModelCode(value: string): value is HepaticAndroidModelCode {
  return HEPATIC_ANDROID_MODELS.some((entry) => entry.id === value);
}

/** Só reconhece a categoria com o gate ligado: desligado, nada roteia para o fluxo hepático. */
export function isEnabledHepaticAndroidModel(value: string, enabled = HEPATIC_ANDROID_MODELS_ENABLED): value is HepaticAndroidModelCode {
  return enabled && isHepaticAndroidModelCode(value);
}

export function hepaticAndroidModelName(value: HepaticAndroidModelCode): string {
  return HEPATIC_ANDROID_MODELS.find((entry) => entry.id === value)?.name ?? value;
}

type RandomBytes = (bytes: Uint8Array) => Uint8Array;

function defaultRandomBytes(bytes: Uint8Array): Uint8Array {
  const webCrypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (webCrypto?.getRandomValues) return webCrypto.getRandomValues(bytes);
  // Hermes sem polyfill de Web Crypto. O examId é chave de idempotência do
  // rascunho (a API recusa colisão de outro dono/conteúdo), não um segredo.
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return bytes;
}

/** UUID v4 aceito por `z.string().uuid()`; vira o id do laudo no servidor. */
export function createHepaticExamId(randomBytes: RandomBytes = defaultRandomBytes): string {
  const bytes = randomBytes(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Rascunho vazio: nenhum método, unidade, normalidade ou aquisição presumidos. */
export function createInitialHepaticAssessment(
  category: HepaticAndroidModelCode,
  examId: string = createHepaticExamId(),
): HepaticAssessment {
  const purpose = HEPATIC_ANDROID_MODELS.find((entry) => entry.id === category)?.purpose;
  if (!purpose) throw new Error("Categoria hepática desconhecida.");
  return {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId,
    revision: 0,
    purpose,
    modules: {
      fat: { status: "not_performed", measurements: [], derived: [] },
      stiffness: { status: "not_performed", measurements: [], derived: [] },
    },
  };
}

type Reference = HepaticInterpretationConfirmation["reference"];
export type HepaticModuleConfiguration = {
  measurementReference: Reference;
  interpretationReference: Reference;
  protocolReference: Reference;
  qualityByMethod: Partial<Record<HepaticMethod, HepaticQualityConfiguration>>;
};
export type HepaticAndroidConfiguration = Record<HepaticModuleKey, HepaticModuleConfiguration>;

/**
 * Proveniência de entrada e revisão. Perfis técnicos compartilhados com Web
 * e servidor; nenhuma classificação diagnóstica automática.
 */
const manualEntry: Reference = { id: "android-manual-entry", version: "v1", citation: "Valor informado manualmente pelo médico" };
const physicianReview: Reference = { id: "physician-review", version: "v1", citation: "Interpretação confirmada pelo médico responsável" };
const documentedProtocol: Reference = { id: "documented-protocol", version: "v1", citation: "Protocolo de aquisição documentado pelo médico" };

export const HEPATIC_ANDROID_CONFIGURATION: HepaticAndroidConfiguration = {
  fat: { measurementReference: manualEntry, interpretationReference: physicianReview, protocolReference: documentedProtocol, qualityByMethod: hepaticQualityByMethod("fat") },
  stiffness: { measurementReference: manualEntry, interpretationReference: physicianReview, protocolReference: documentedProtocol, qualityByMethod: hepaticQualityByMethod("stiffness") },
};

export const HEPATIC_INTEGRATED_INTERPRETATION_REFERENCE = physicianReview;

export function hasApprovedHepaticQualityConfiguration(configuration: HepaticAndroidConfiguration): boolean {
  return Object.values(configuration).some((module) => Object.keys(module.qualityByMethod).length > 0);
}
