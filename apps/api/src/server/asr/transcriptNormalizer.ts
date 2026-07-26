import { normalizeMeasures } from "../pipeline/measureNormalizer";
import { normalizeSpokenDates } from "./dateNormalizer";
import { normalizeLanguageNumbers } from "./languageNumberNormalizer";

export function normalizeAsrTranscript(text: string): string {
  return normalizeLanguageNumbers(
    normalizeSpokenDates(normalizeMeasures(text)),
  );
}
