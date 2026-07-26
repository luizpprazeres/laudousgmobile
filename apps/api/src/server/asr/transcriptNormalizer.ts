import { normalizeMeasures } from "../pipeline/measureNormalizer";
import { normalizeSpokenDates } from "./dateNormalizer";

export function normalizeAsrTranscript(text: string): string {
  return normalizeSpokenDates(normalizeMeasures(text));
}
