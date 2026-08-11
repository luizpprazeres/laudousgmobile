import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import { z } from "zod";
import { applyCustomization, diffDocs, validateOperations } from "@/server/renderer/catalog/engine";
import { describeCatalog } from "@/server/renderer/catalog/describe";
import {
  flagsDeProducao,
  paresComCatalogo,
  resolveCatalogo,
} from "@/server/renderer/catalog/registry";
import { OperationSchema } from "@/server/customization/schemas";
import type { Customization } from "@/server/renderer/catalog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/model-catalog/[category] — leitura e PRÉVIA do catálogo de modelo.
 *
 * Projeto docs/projeto-modelos/. Somente leitura e simulação: NADA é
 * persistido. A persistência das personalizações vem no item 4/6 do corte
 * vertical, com tabelas próprias.
 *
 *   GET  → descrição do catálogo (slots, variantes, o que é editável e por quê)
 *          + cenários de exemplo + o laudo-padrão de cada cenário
 *   POST → valida um conjunto de operações e devolve a prévia por cenário,
 *          com o laudo-base e o personalizado lado a lado
 */

export async function GET(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { category } = await ctx.params;
  const estilo = new URL(req.url).searchParams.get("estilo") ?? "CLASSICO_COMPLETO";
  const entry = resolveCatalogo(category, estilo);
  if (!entry) {
    return Response.json(
      { error: "categoria sem catálogo neste estilo", suportados: paresComCatalogo() },
      { status: 404 },
    );
  }

  const flags = flagsDeProducao();
  const descricao = describeCatalog(entry.catalog, [
    { nome: "Gestação padrão", ctx: { findings: entry.samples[0]!.findings, fetoIndex: 0, gemelar: false, flags } },
    { nome: "Gestação inicial", ctx: { findings: entry.samples[1]!.findings, fetoIndex: 0, gemelar: false, flags } },
    { nome: "Gemelar", ctx: { findings: entry.samples[2]!.findings, fetoIndex: 0, gemelar: true, flags } },
  ]);

  return Response.json({
    catalogo: descricao,
    flags,
    cenarios: entry.samples.map((s) => {
      // "O que ESTE ACHADO muda no modelo padrão" — diff do cenário contra a
      // sua referência, sem nenhuma personalização envolvida. É como o médico
      // entende as alterações condicionais por patologia sem precisar ditar.
      const ref = s.comparaCom ? entry.samples.find((x) => x.id === s.comparaCom) : undefined;
      const efeito = ref
        ? diffDocs(
            entry.buildDoc({ findings: ref.findings, flags }),
            entry.buildDoc({ findings: s.findings, flags }),
          )
        : [];
      return {
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        patologico: Boolean(s.patologico),
        compara_com: s.comparaCom ?? null,
        compara_com_nome: ref?.nome ?? null,
        efeito_do_achado: efeito,
        laudo_padrao: entry.render({ findings: s.findings, flags }),
      };
    }),
  });
}

const PreviewBodySchema = z.object({
  operations: z.array(OperationSchema).max(100),
  /** Limita a prévia a cenários específicos; vazio = todos. */
  cenarios: z.array(z.string()).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { category } = await ctx.params;
  const estilo = new URL(req.url).searchParams.get("estilo") ?? "CLASSICO_COMPLETO";
  const entry = resolveCatalogo(category, estilo);
  if (!entry) return Response.json({ error: "categoria sem catálogo" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "json inválido" }, { status: 400 });
  }
  const parsed = PreviewBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "body inválido", detalhes: parsed.error.issues }, { status: 400 });
  }

  const { operations } = parsed.data;
  const erros = validateOperations(entry.catalog, operations);
  if (erros.length > 0) {
    // 200 com erros de validação: a interface precisa mostrá-los enquanto o
    // médico digita, não tratar como falha de requisição.
    return Response.json({ valido: false, erros, previas: [] });
  }

  const custom = applyCustomization(entry.catalog, {
    baseCatalogId: entry.catalog.id,
    baseVersao: entry.catalog.versao,
    operations,
  } satisfies Customization);

  const flags = flagsDeProducao();
  const ids = parsed.data.cenarios;
  const alvos = ids?.length ? entry.samples.filter((s) => ids.includes(s.id)) : entry.samples;

  const previas = alvos.map((s) => {
    const argsCustom = {
      findings: s.findings,
      flags,
      catalog: custom.catalog,
      customSlots: custom.customSlots,
      extraConclusao: custom.extraConclusao,
    };
    const base = entry.render({ findings: s.findings, flags });
    const personalizado = entry.render(argsCustom);
    // O diff é por SLOT, não textual — é o que permite mostrar a alteração no
    // ponto certo (frase antiga riscada, nova embaixo) em vez de dois laudos.
    const mudancas = diffDocs(
      entry.buildDoc({ findings: s.findings, flags }),
      entry.buildDoc(argsCustom),
    );
    return {
      cenario: s.id,
      nome: s.nome,
      patologico: Boolean(s.patologico),
      mudou: base !== personalizado,
      mudancas,
      laudo_padrao: base,
      laudo_personalizado: personalizado,
    };
  });

  return Response.json({
    valido: true,
    erros: [],
    base_catalog_id: entry.catalog.id,
    base_versao: entry.catalog.versao,
    previas,
  });
}
