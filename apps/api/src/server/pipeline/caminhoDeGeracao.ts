/**
 * QUEM ESCREVE O LAUDO desta categoria: o renderer ou o writer.
 *
 * A decisão vivia só no `if` do dispatcher (`renderer.ts`), e a personalização
 * teve de adivinhá-la — errando o estilo: PARTES_MOLES e PELVE só vão para o
 * writer quando o estilo NÃO é objetivo, e a Biblioteca dizia "inativa" também
 * no objetivo, onde o renderer roda e o overlay se aplicaria (achado do Codex,
 * 19/08).
 *
 * Uma função só, importada pelos dois lados. A próxima categoria que ganhar
 * writer reabre o defeito se a regra voltar a ter duas casas.
 */

import { env } from "@/server/env";

export type CaminhoDeGeracao = "renderer" | "writer";

/**
 * O caminho do laudo, sem olhar o ditado.
 *
 * O passthrough do MSK (`MSK_PASSTHROUGH`) depende do texto de entrada e por
 * isso não cabe aqui: ele não é uma propriedade da categoria, é do laudo. Para
 * a personalização isso não muda nada — a categoria já é writer pela flag
 * `MSK_WRITER`, e sem ela o passthrough só devolve o texto que o médico colou,
 * onde não há modelo a personalizar.
 */
export function caminhoDeGeracao(
  categoria: string,
  opts: { objetivo: boolean },
): CaminhoDeGeracao {
  const e = env();

  // Eixo vascular: writer sempre, sem flag e sem variante objetiva.
  if (categoria === "DOPPLER_VENOSO_MMII" || categoria === "DOPPLER_RENAL") return "writer";

  // MSK: categoria aberta, o writer escreve em qualquer estilo.
  if (
    (categoria === "MUSCULOESQUELETICO_V2" || categoria === "MUSCULOESQUELETICO") &&
    e.MSK_WRITER === "true"
  ) {
    return "writer";
  }

  /**
   * PARTES_MOLES e PELVE: o writer escreve o CLÁSSICO da casa. O estilo
   * objetivo continua no renderer — trocar TÉCNICA/ACHADOS/IMPRESSÃO sem aviso
   * seria regressão para quem escolheu objetivo (review dex1).
   */
  if (categoria === "PARTES_MOLES" && e.PARTES_MOLES_WRITER === "true" && !opts.objetivo) {
    return "writer";
  }
  if (categoria === "PELVE_FEMININA" && e.PELVE_WRITER === "true" && !opts.objetivo) {
    return "writer";
  }

  return "renderer";
}
