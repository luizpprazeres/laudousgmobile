export { OPTIONS } from "@/server/cors";
import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { categoriasDaBiblioteca } from "@/server/renderer/catalog/registry";
import { personalizacaoAtiva } from "@/server/customization/ativa";

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
    /**
     * Uma regra só — a mesma que o gerador usa. Aqui ela olhava só a flag de
     * categoria: um médico fora da allowlist lia "Em uso nos seus laudos",
     * publicava, e nada acontecia (achado do Codex, 19/08).
     */
    personalizacao_ativa: personalizacaoAtiva({
      userId: user.id,
      categoria: c.categoria,
      estilo: "CLASSICO_COMPLETO",
    }).ativa,
  }));

  return Response.json({
    categorias,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
  });
}
