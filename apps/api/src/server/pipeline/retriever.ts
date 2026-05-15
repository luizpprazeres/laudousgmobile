import type {
  CategoryCode,
  RagBlockForPrompt,
  StructuredFindings,
} from "@laudousg/shared";
import { getDbClient } from "@laudousg/db";
import { sql } from "drizzle-orm";
import { openai } from "../ai/openai";
import { env } from "../env";

/**
 * Etapa 3 — Retriever (RAG).
 *
 * Filtros: status='validated' AND category_code AND writing_style_id.
 * Para cada `kind`, retorna top-N por (priority DESC, similaridade DESC).
 *
 * Estratégia: chama a função SQL `match_knowledge_blocks` (em
 * packages/db/src/sql/0002_retriever_rpc.sql), que combina filtros
 * estruturais + cosine distance + ranking por kind. Evita matar recall
 * que aconteceria se filtrássemos sobre o resultado de uma busca vetorial
 * ingênua.
 */

const DEFAULT_QUOTAS: Record<string, number> = {
  modelo: 1,
  regra: 5,
  frase: 8,
  conclusao: 2,
  excecao: 3,
  comentario_tecnico: 3,
  exemplo: 2,
};

export async function runRetriever(args: {
  findings: StructuredFindings;
  categoryCode: CategoryCode;
  writingStyleId: string;
  quotas?: Partial<typeof DEFAULT_QUOTAS>;
  signal?: AbortSignal;
}): Promise<{
  blocks: RagBlockForPrompt[];
  queryText: string;
  warning: { code: "RAG_EMPTY"; message: string } | null;
}> {
  // Texto de query: achados + comandos (compacto pra reduzir custo de embedding)
  const queryText = buildQueryText(args.findings);

  // Embedding
  const embRes = await openai().embeddings.create(
    {
      model: env().OPENAI_EMBEDDING_MODEL,
      input: queryText,
    },
    { signal: args.signal },
  );
  const embedding = embRes.data[0]?.embedding;
  if (!embedding) throw new Error("retriever: embedding vazio");

  const quotasInput = { ...DEFAULT_QUOTAS, ...(args.quotas ?? {}) };
  const quotas: Record<string, number> = Object.fromEntries(
    Object.entries(quotasInput).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
  const kinds = Object.keys(quotas);
  // Para simplicidade no esqueleto, usamos o maior limit_per_kind das quotas
  // e filtramos no TS depois. (Refinamento: chamar RPC uma vez por kind ou
  // estender a função SQL para receber map de quotas.)
  const limitPerKind = Math.max(...Object.values(quotas));

  const db = getDbClient();
  // postgres-js precisa do array como literal para `vector` — passamos como JSON
  const embeddingLiteral = `[${embedding.join(",")}]`;

  // Fix QA codex: ${kinds} (array JS) era expandido pelo Drizzle como
  // row constructor ($4, $5, ...), que Postgres interpreta como record,
  // não como text[]. Resultado: "function match_knowledge_blocks(...) does
  // not exist" porque a assinatura não bate. Solução: construir o array
  // SQL explicitamente com array[...]::text[] cast.
  const kindsArray = sql`array[${sql.join(
    kinds.map((k) => sql`${k}`),
    sql`, `,
  )}]::text[]`;

  const rows = await db.execute(sql`
    select id, kind, title, content, priority
    from public.match_knowledge_blocks(
      p_query_embedding := ${embeddingLiteral}::vector(1536),
      p_category_code   := ${args.categoryCode}::text,
      p_writing_style_id:= ${args.writingStyleId}::uuid,
      p_kinds           := ${kindsArray},
      p_limit_per_kind  := ${limitPerKind}::integer
    )
  `);

  // Aplica quota por kind exato (defesa em profundidade)
  const grouped = new Map<string, RagBlockForPrompt[]>();
  for (const r of rows as unknown as Array<{
    id: string;
    kind: string;
    title: string;
    content: string;
    priority: number;
  }>) {
    const list = grouped.get(r.kind) ?? [];
    if (list.length < (quotas[r.kind] ?? 0)) {
      list.push({
        id: r.id,
        kind: r.kind as RagBlockForPrompt["kind"],
        title: r.title,
        content: r.content,
        priority: r.priority,
      });
    }
    grouped.set(r.kind, list);
  }

  const blocks = Array.from(grouped.values()).flat();

  // Fix codex MÉDIO #6: emitir warning quando RAG vier vazio. Categoria pode
  // não ter biblioteca embeddada ainda, ou similarity ficou abaixo do mínimo.
  // O caller registra no run e pode escolher abortar (categoria sem RAG é
  // perigoso em domínio médico).
  const warning =
    blocks.length === 0
      ? {
          code: "RAG_EMPTY" as const,
          message: `Nenhum bloco RAG validado para categoria=${args.categoryCode} × writing_style_id=${args.writingStyleId}.`,
        }
      : null;

  return { blocks, queryText, warning };
}

function buildQueryText(f: StructuredFindings): string {
  const parts: string[] = [
    `Categoria: ${f.categoria_detectada}`,
    `Tipo de exame: ${f.tipo_exame}`,
    `Achados: ${JSON.stringify(f.achados)}`,
  ];
  if (f.comandos_do_medico.length > 0) {
    parts.push(
      `Comandos: ${f.comandos_do_medico.map((c) => `[${c.tipo}] ${c.texto}`).join(" | ")}`,
    );
  }
  return parts.join("\n");
}
