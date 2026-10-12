import { normalizeMeasures } from "../pipeline/measureNormalizer";
import { normalizeSpokenDates } from "./dateNormalizer";
import { normalizeLanguageNumbers } from "./languageNumberNormalizer";
import { correctMedicalTerms } from "./medicalTermCorrector";
import { repairNumbers } from "./numberRepairs";

export type AsrNormalizeOptions = {
  /** Reparos de número/medida do estudo de 12/10 (ASR_REPARO_NUMEROS). Antes do normalizador de medidas. */
  repairNumbers?: boolean;
};

export function normalizeAsrTranscript(text: string, opts: AsrNormalizeOptions = {}): string {
  // Correção lexical PRIMEIRO: consertar "trads 3" → "TI-RADS 3" antes de as
  // etapas numéricas mexerem no texto evita que elas trabalhem em cima do erro.
  const lexical = correctMedicalTerms(text);
  // Reparos antes das medidas: "50 por 100" tem de virar "50%" antes de o
  // normalizeMeasures transformar "por" em "x".
  const repaired = opts.repairNumbers ? repairNumbers(lexical) : lexical;
  return normalizeLanguageNumbers(normalizeSpokenDates(normalizeMeasures(repaired)));
}
