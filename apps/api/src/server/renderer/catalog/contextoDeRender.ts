/**
 * O CONTEXTO DE RENDER — o que o renderer precisa e não está no código.
 *
 * Em módulo próprio porque DUAS superfícies precisam dele, e hoje só uma o usa:
 *
 *   - `/api/catalog/[category]/render` — usa. É o caminho da web, e é por ele
 *     que o abdome ficou migrado.
 *   - a Biblioteca (`/api/me/report-customizations/…`) — AINDA NÃO usa, e por
 *     isso o abdome dá 404 lá. Não é regressão (dava 404 antes também), mas é
 *     incoerência: o médico migrou a categoria e não consegue personalizá-la
 *     como faz nas outras cinco.
 *
 * O caminho da Biblioteca não passa por `laudoPadraoDe`: o modelo vem de
 * `projetarModelos`, em `modeloNormalCatalog.ts`, que monta as linhas com as
 * flags fixas. Levar a máscara até lá é peça própria, anotada no sprint.
 */

import { getDbClient, schema } from "@laudousg/db";
import { and, eq } from "drizzle-orm";

/**
 * O contexto que o renderer precisa e não está no código.
 *
 * Hoje só a máscara do ABDOMEN_TOTAL. Devolve `{}` para as demais — nada de
 * consulta inútil ao banco em doze categorias que a ignoram.
 */
export async function contextoDeRender(
  categoria: string,
  estilo: string,
): Promise<{ templateBody?: string | null }> {
  if (categoria !== "ABDOMEN_TOTAL") return {};

  /**
   * O `code` é enum no schema, e isso é bom: obriga a validar em vez de
   * confiar na string que chegou. Estilo desconhecido devolve máscara nula, e
   * o renderer recusa — em vez de a consulta sair vazia por engano e o erro
   * aparecer três camadas adiante.
   */
  const ESTILOS = ["CLASSICO_COMPLETO", "OBJETIVO", "DIRETO_OBJETIVO", "DETALHADO_PROTOCOLAR"] as const;
  type EstiloCode = (typeof ESTILOS)[number];
  if (!(ESTILOS as readonly string[]).includes(estilo)) return { templateBody: null };

  const db = getDbClient();
  const [linha] = await db
    .select({ tpl: schema.reportTemplateVariants.templateBody })
    .from(schema.reportTemplateVariants)
    .innerJoin(
      schema.writingStyles,
      eq(schema.writingStyles.id, schema.reportTemplateVariants.writingStyleId),
    )
    .where(
      and(
        eq(schema.reportTemplateVariants.categoryCode, categoria),
        eq(schema.writingStyles.code, estilo as EstiloCode),
        /**
         * `padrao` fixo: a variante `doppler` existe, e a tela da web não tem
         * o controle que a escolheria. Escolher `doppler` sem o médico ter
         * pedido acrescentaria um bloco de velocidades que ninguém mediu.
         */
        eq(schema.reportTemplateVariants.variantKey, "padrao"),
        eq(schema.reportTemplateVariants.status, "validated"),
      ),
    )
    .limit(1);
  return { templateBody: linha?.tpl ?? null };
}
