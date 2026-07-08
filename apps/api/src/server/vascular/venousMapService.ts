import {
  VenosoMMIIFindingsSchema,
  buildMapaVenoso,
  type MapaVenoso,
} from "@laudousg/schemes/vascular";

/**
 * Side-channel do esquema visual venoso: extrai os achados estruturados do ditado
 * e monta o `MapaVenoso` (para o DESENHO), SEM tocar no texto do laudo (que segue
 * no writer). Decisão Luiz 08/07 + parecer Dex: o backend ENTREGA o MapaVenoso; os
 * clientes (iOS/RN) só renderizam (recolor). Fica atrás da flag `VENOUS_SCHEME_MAP`.
 *
 * REGRA DE OURO: nunca lança para o chamador. Falha na extração/parse do desenho
 * NÃO pode derrubar a geração do laudo — retorna `null` e loga.
 *
 * O extractor é INJETADO (a rota passa um wrapper de `runRendererExtraction`) para
 * manter esta função desacoplada e testável sem chamar o LLM.
 */
export type RawFindingsExtractor = (
  categoryCode: string,
  rawInput: string,
  signal?: AbortSignal,
) => Promise<{ findings: unknown }>;

export async function extractVenousMap(
  rawInput: string,
  extract: RawFindingsExtractor,
  signal?: AbortSignal,
): Promise<MapaVenoso | null> {
  try {
    const res = await extract("DOPPLER_VENOSO_MMII", rawInput, signal);
    const findings = VenosoMMIIFindingsSchema.parse(res.findings);
    return buildMapaVenoso(findings);
  } catch (err) {
    console.error(
      "[venous-scheme] side-channel falhou (laudo segue normalmente):",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
