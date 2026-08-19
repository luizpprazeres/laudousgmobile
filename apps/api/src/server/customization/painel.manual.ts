/**
 * O PAINEL DO PILOTO — o que está publicado e o que aconteceu nos laudos.
 *
 * Antes de abrir para mais médicos vale uma tela; para o piloto de um usuário,
 * o que basta é esta consulta (Codex, 19/08). Ela responde as quatro perguntas
 * do primeiro dia:
 *
 *   1. quem tem personalização publicada, em que categoria, em que versão;
 *   2. o modelo-base mudou desde então? (é o que desliga a personalização);
 *   3. os últimos laudos daquela categoria saíram COM ou SEM a redação;
 *   4. algum laudo gravou aviso de personalização descartada ou desatualizada.
 *
 * Só lê. Rodar de apps/api:
 *
 *   pnpm exec tsx --env-file=../../.env src/server/customization/painel.manual.ts
 */

import { getDbClient, schema } from "@laudousg/db";
import { desc, sql } from "drizzle-orm";
import { resolveCatalogo, ehDerivado } from "@/server/renderer/catalog/registry";
import { versaoDerivadaDe } from "@/server/renderer/catalog/modeloNormalCatalog";
import { personalizacaoAtiva } from "./ativa";

const T = schema.reportModelCustomizations;

/** A versão-base de HOJE daquela categoria — a que a geração vai comparar. */
function versaoDeHoje(categoria: string, estilo: string): number | null {
  if (ehDerivado(categoria, estilo)) return versaoDerivadaDe(categoria, estilo);
  return resolveCatalogo(categoria, estilo)?.catalog.versao ?? null;
}

/** Qual degrau montou o laudo, lido da systemMessage. */
function degrauDe(msg: string): string {
  if (msg.includes("modelo: catálogo-base")) return "catálogo-base";
  if (msg.includes("modelo: catálogo")) return "catálogo";
  if (msg.includes("modelo: clássico")) return "CLÁSSICO (fallback)";
  return "—";
}

async function main() {
  const db = getDbClient();

  console.log("\n═══ PUBLICAÇÕES ATIVAS ═══\n");
  const publicadas = await db
    .select({
      id: T.id,
      scopeId: T.scopeId,
      categoria: T.categoryCode,
      estilo: T.styleCode,
      versao: T.versao,
      baseCatalogId: T.baseCatalogId,
      baseVersao: T.baseVersao,
      publishedAt: T.publishedAt,
      operacoes: sql<number>`jsonb_array_length(coalesce(${T.operations}, '[]'::jsonb))`,
    })
    .from(T)
    .where(sql`${T.status} = 'published'`)
    .orderBy(desc(T.publishedAt));

  if (publicadas.length === 0) {
    console.log("  (nenhuma — ninguém publicou personalização ainda)");
  }
  for (const p of publicadas) {
    const hoje = versaoDeHoje(p.categoria, p.estilo);
    const desatualizada = hoje !== null && hoje !== p.baseVersao;
    console.log(
      `  ${p.categoria}/${p.estilo}  v${p.versao}  ${p.operacoes} operação(ões)  ` +
        `base ${p.baseVersao}${desatualizada ? ` ⚠️ HOJE É ${hoje} — desativada até republicar` : " ✓ atual"}`,
    );
    console.log(`    escopo ${p.scopeId} · publicada em ${p.publishedAt?.toISOString().slice(0, 16) ?? "?"}`);
  }

  console.log("\n═══ A REGRA DE ATIVAÇÃO, POR ESCOPO PUBLICADO ═══\n");
  const escopos = await db
    .select({ id: schema.reportScopes.id, userId: schema.reportScopes.userId })
    .from(schema.reportScopes);
  const donoDe = new Map(escopos.map((e) => [e.id, e.userId]));
  for (const p of publicadas) {
    const userId = donoDe.get(p.scopeId) ?? "";
    const a = personalizacaoAtiva({ userId, categoria: p.categoria, estilo: p.estilo });
    console.log(
      `  ${p.categoria.padEnd(22)} ${a.ativa ? "✓ ATIVA" : `✗ ${a.motivo}`}` +
        (a.ativa ? "" : `\n    ${a.explicacao}`),
    );
  }

  console.log("\n═══ ÚLTIMOS LAUDOS COM MARCA DE MODELO ═══\n");
  const laudos = await db.execute(sql`
    select r.id, r.created_at, r.category_code,
           g.model_catalog_id, g.model_catalog_versao, g.model_customization_versao,
           g.system_message_full,
           r.generation_metadata->'pipeline_warnings' as avisos
      from public.reports r
      left join public.generation_audit g on g.report_id = r.id
     -- Só o que interessa ao piloto: laudo montado por um modelo marcado, ou
     -- laudo que gravou aviso DA PERSONALIZAÇÃO. pipeline_warnings é um
     -- balaio antigo (RAG_EMPTY de junho enche a tela sem dizer nada aqui).
     where g.model_catalog_id is not null
        or exists (
             select 1
               from jsonb_array_elements(
                      coalesce(r.generation_metadata->'pipeline_warnings', '[]'::jsonb)
                    ) w
              where w->>'code' like 'personalizacao%'
           )
     order by r.created_at desc
     limit 25
  `);
  const linhas = laudos as unknown as Record<string, unknown>[];
  if (linhas.length === 0) console.log("  (nenhum laudo ainda saiu por um modelo marcado)");
  for (const l of linhas) {
    const avisos = l.avisos as { code: string }[] | null;
    console.log(
      `  ${String(l.created_at).slice(0, 16)}  ${String(l.id).slice(0, 8)}  ` +
        `${String(l.category_code).padEnd(20)} ` +
        `modelo=${l.model_catalog_id ?? "—"} v${l.model_catalog_versao ?? "—"} ` +
        /**
         * O DEGRAU, tirado da systemMessage.
         *
         * `model_catalog_id` sozinho NÃO prova que o catálogo montou o laudo: o
         * fallback clássico passa pelo mesmo callback de auditoria (Codex,
         * 19/08). Quem prova é a marca que o renderer escreve.
         */
        `[${degrauDe(String(l.system_message_full ?? ""))}] ` +
        `personalização=${l.model_customization_versao ?? "não aplicada"}` +
        (avisos?.length ? `\n    ⚠️ ${avisos.map((a) => a.code).join(", ")}` : ""),
    );
  }

  console.log("");
  process.exit(0);
}

void main();
