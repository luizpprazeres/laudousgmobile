export { OPTIONS } from "@/server/cors";
import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { catalogEnabledFor } from "@/server/renderer/catalog/engine";
import { categoriasDaBiblioteca } from "@/server/renderer/catalog/registry";
import { env } from "@/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/me/report-customizations
 *
 * As categorias que a Biblioteca mostra. Existe porque o app tinha a lista
 * cravada no código — literalmente `var categoria = "OBSTETRICA"` —, e por isso
 * o médico só via o modelo obstétrico por mais que o backend passasse a servir
 * as outras doze. Lista no servidor, uma fonte só.
 *
 * `personalizacao_ativa` diz se aquela categoria já aplica a redação do médico
 * nos laudos. A tela precisa da distinção: sem ela, o médico publica, o laudo
 * sai igual, e ele conclui que o app está quebrado.
 */
export async function GET(req: Request): Promise<Response> {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const e = env();
  const categorias = categoriasDaBiblioteca().map((c) => ({
    categoria: c.categoria,
    rotulo: c.rotulo,
    /**
     * `derivado` = o modelo vem do renderer, e não de um catálogo escrito à
     * mão. Para o médico a diferença aparece no que ele PODE fazer: no
     * derivado há o modelo normal; no escrito há também as variantes de
     * achado. A tela usa isto para não prometer o que a categoria não tem.
     */
    derivado: c.derivado,
    personalizacao_ativa: catalogEnabledFor(e.MODEL_CUSTOMIZATION_CATEGORIES, c.categoria),
  }));

  return Response.json({
    categorias,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
  });
}
