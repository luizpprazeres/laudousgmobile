const FAIL_CLOSED_CLINICAL_RENDERERS = new Set([
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
]);

export function clinicalRendererFallbackBlocked(categoryCode: string): boolean {
  return FAIL_CLOSED_CLINICAL_RENDERERS.has(categoryCode);
}
