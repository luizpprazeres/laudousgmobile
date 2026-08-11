export { OPTIONS } from "@/server/cors";
import { resolverContexto, respostaDeErro } from "@/server/customization/http";
import { despublicar, publicar } from "@/server/customization/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/me/report-customizations/[category]/publish?estilo=classico
 *
 *   POST   → publica o rascunho: o publicado atual é arquivado e o rascunho
 *            toma o lugar. É o momento em que os laudos deste médico passam a
 *            sair diferentes.
 *   DELETE → desliga a personalização (o publicado vira arquivado). A geração
 *            volta ao modelo-base imediatamente. Nada é apagado: a versão
 *            continua no histórico e pode ser restaurada.
 *
 * Publicar é rota separada de propósito. Salvar rascunho é rotina; publicar
 * muda o que sai no laudo do paciente — merece uma chamada explícita, um
 * registro próprio e um botão que diga o que faz.
 */

export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  try {
    const { publicado, arquivou } = await publicar(r.chave, r.entrada);
    return Response.json({ publicado, arquivou_versao: arquivou });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  try {
    const versao = await despublicar(r.chave);
    return Response.json({
      desligou: versao !== null,
      versao_arquivada: versao,
      detalhe:
        versao === null
          ? "não havia personalização publicada"
          : "a geração voltou ao modelo padrão; a versão continua no histórico",
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
