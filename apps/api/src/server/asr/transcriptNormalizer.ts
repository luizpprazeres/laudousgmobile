import { normalizeMeasures } from "../pipeline/measureNormalizer";
import { normalizeSpokenDates } from "./dateNormalizer";
import { normalizeLanguageNumbers } from "./languageNumberNormalizer";
import { correctMedicalTerms } from "./medicalTermCorrector";

export function normalizeAsrTranscript(text: string): string {
  // Correção lexical PRIMEIRO: consertar "trads 3" → "TI-RADS 3" antes de as
  // etapas numéricas mexerem no texto evita que elas trabalhem em cima do erro.
  return normalizeLanguageNumbers(
    normalizeSpokenDates(normalizeMeasures(correctMedicalTerms(text))),
  );
}
