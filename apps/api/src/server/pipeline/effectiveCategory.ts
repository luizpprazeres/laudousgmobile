/**
 * Categoria EFETIVA da geração — extraído da rota em 15/09/2026 para poder ser
 * testado sem HTTP (a rota do Next só pode exportar os handlers).
 */
import { requestedExamCategory, type DopplerMode } from "./requestedExam";
import { resolveMorfologicoCategory } from "./morfologicoRouteSelection";
import { normalizeCategoryCode } from "./categoryNormalization";

/**
 * Resolve a categoria EFETIVA em 2 passos determinísticos:
 *  1. Guard morfológico (morfológico+Doppler → MORFOLOGICO).
 *  2. Normalização contra a lista de categorias válidas (clampa códigos
 *     não-canônicos inventados pelo structurer → código real; evita crash de FK).
 * Loga override e normalização pra auditoria em prod. Devolve só a categoria.
 */
export function resolveEffectiveCategory(
  detectedCategory: string,
  rawText: string,
  reportId: string,
  knownCodes: Set<string>,
  categoryHint?: string,
  dopplerMode?: DopplerMode,
): string {
  const requested = requestedExamCategory(categoryHint, dopplerMode);
  if (requested && knownCodes.has(requested)) {
    /**
     * EXCEÇÃO (15/09/2026): "Doppler obstétrico" combinado diz COMO tratar o Doppler,
     * não QUAL exame foi feito. Quando o ditado nomeia um exame morfológico, o modelo
     * morfológico vence — ele já inclui a seção Doppler, e sem isso o laudo perdia a
     * estrutura morfológica (cerebelo, cisterna magna, ossos longos, marcadores).
     * A escolha explícita de OBSTETRICA ou MORFOLOGICO continua soberana; só o remapa
     * DOPPLER_OBSTETRICO+combined → OBSTETRICA cede.
     */
    if (requested === "OBSTETRICA" && categoryHint === "DOPPLER_OBSTETRICO" && knownCodes.has("MORFOLOGICO")) {
      const morfoPedido = resolveMorfologicoCategory(detectedCategory, rawText);
      if (morfoPedido.category === "MORFOLOGICO") {
        console.warn(
          `[generate ${reportId}] category_override: exame Doppler combinado, ditado morfológico -> MORFOLOGICO (reason=${morfoPedido.reason ?? "explicit_exam"})`,
        );
        return "MORFOLOGICO";
      }
    }
    return requested;
  }
  const morf = resolveMorfologicoCategory(detectedCategory, rawText);
  if (morf.overridden) {
    console.warn(
      `[generate ${reportId}] category_override: ${detectedCategory} -> ${morf.category} (reason=${morf.reason})`,
    );
  }
  const norm = normalizeCategoryCode(
    morf.category,
    knownCodes,
    rawText,
    categoryHint,
  );
  if (norm.normalized) {
    console.warn(
      `[generate ${reportId}] category_normalized: ${morf.category} -> ${norm.category}`,
    );
  }
  return norm.category;
}
