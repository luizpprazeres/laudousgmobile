import { z } from "zod";
export { OPTIONS } from "@/server/cors";
import { applyCustomization, diffDocs } from "@/server/renderer/catalog/engine";
import { describeCatalog } from "@/server/renderer/catalog/describe";
import { flagsDeProducao, type EntradaCatalogo } from "@/server/renderer/catalog/registry";
import { lerJson, resolverContexto, respostaDeErro } from "@/server/customization/http";
import { NoteSchema, OperationsSchema } from "@/server/customization/schemas";
import { descartarRascunho, lerEstado, salvarRascunho } from "@/server/customization/store";
import type { Customization, Operation } from "@/server/renderer/catalog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/me/report-customizations/[category]?estilo=classico
 *
 * A personalização do modelo de laudo DO PRÓPRIO MÉDICO — projeto
 * docs/projeto-modelos/, item 6. Nada aqui altera o modelo global: as
 * operações são um overlay sobre o catálogo-base, que continua no Git.
 *
 *   GET    → catálogo + rascunho + publicado + histórico, com a prévia do que
 *            o rascunho muda em cada cenário
 *   PUT    → grava o rascunho (valida antes; rascunho inválido não é gravado)
 *   DELETE → descarta o rascunho (não mexe no publicado)
 *
 * Publicar e restaurar têm rotas próprias, porque são as ações que mudam o
 * laudo de verdade e merecem ser explícitas no log e na interface.
 */

/**
 * Prévia: o que estas operações mudam em cada cenário de exemplo.
 *
 * O diff é por SLOT (`diffDocs`), não textual — é o que permite mostrar a
 * alteração no ponto certo, com a frase antiga riscada e a nova embaixo, em
 * vez de dois laudos inteiros lado a lado.
 */
function previaDe(entrada: EntradaCatalogo, operations: Operation[]) {
  const flags = flagsDeProducao();
  const custom = applyCustomization(entrada.catalog, {
    baseCatalogId: entrada.catalog.id,
    baseVersao: entrada.catalog.versao,
    operations,
  } satisfies Customization);

  return entrada.samples.map((s) => {
    const argsCustom = {
      findings: s.findings,
      flags,
      catalog: custom.catalog,
      customSlots: custom.customSlots,
      extraConclusao: custom.extraConclusao,
    };
    const base = entrada.render({ findings: s.findings, flags });
    const personalizado = entrada.render(argsCustom);
    return {
      cenario: s.id,
      nome: s.nome,
      patologico: Boolean(s.patologico),
      mudou: base !== personalizado,
      mudancas: diffDocs(
        entrada.buildDoc({ findings: s.findings, flags }),
        entrada.buildDoc(argsCustom),
      ),
      laudo_padrao: base,
      laudo_personalizado: personalizado,
    };
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  try {
    const estado = await lerEstado(r.chave, r.entrada);
    const flags = flagsDeProducao();

    // A prévia acompanha o rascunho, que é o que o médico está editando. Sem
    // rascunho não há o que prever — a tela mostra só o modelo-base.
    const emEdicao = estado.rascunho?.operations ?? [];

    return Response.json({
      categoria: category,
      estilo: r.chave.styleCode,
      base_catalog_id: r.entrada.catalog.id,
      base_versao: r.entrada.catalog.versao,
      flags,
      catalogo: describeCatalog(r.entrada.catalog, [
        {
          nome: "Gestação padrão",
          ctx: { findings: r.entrada.samples[0]!.findings, fetoIndex: 0, gemelar: false, flags },
        },
      ]),
      rascunho: estado.rascunho,
      publicado: estado.publicado,
      historico: estado.historico,
      previa: emEdicao.length > 0 ? previaDe(r.entrada, emEdicao) : [],
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}

const PutSchema = z.object({
  operations: OperationsSchema,
  note: NoteSchema,
});

export async function PUT(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  const raw = await lerJson(req);
  if (raw !== null && typeof raw === "object" && "erro" in raw) return (raw as { erro: Response }).erro;

  const parsed = PutSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "body inválido", detalhes: parsed.error.issues }, { status: 400 });
  }

  try {
    const rascunho = await salvarRascunho(
      r.chave,
      r.entrada,
      parsed.data.operations,
      parsed.data.note ?? null,
    );
    return Response.json({
      rascunho,
      previa: previaDe(r.entrada, rascunho.operations),
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  try {
    const descartou = await descartarRascunho(r.chave);
    return Response.json({ descartou });
  } catch (e) {
    return respostaDeErro(e);
  }
}
