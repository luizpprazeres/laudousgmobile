import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgPolicy,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { ragBlockKindEnum, ragBlockStatusEnum } from "./enums";
import { authenticatedRole, profiles } from "./profiles";
import { writingStyles } from "./writingStyles";
import { categories } from "./categories";

/**
 * knowledge_blocks — biblioteca RAG validada pelo criador.
 *
 * Filtros principais (definem os índices abaixo):
 *   WHERE category_code = ? AND writing_style_id = ?
 *     AND status = 'validated'
 *   ORDER BY priority DESC, embedding <=> ? LIMIT N
 *
 * Embedding: text-embedding-3-small (1536 dims, cosine distance).
 * Índice HNSW recomendado pelo codex (mantém qualidade conforme dados crescem).
 */
export const knowledgeBlocks = pgTable(
  "knowledge_blocks",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    categoryCode: text("category_code")
      .notNull()
      .references(() => categories.code, { onDelete: "restrict" }),
    writingStyleId: uuid("writing_style_id")
      .notNull()
      .references(() => writingStyles.id, { onDelete: "restrict" }),
    kind: ragBlockKindEnum("kind").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    status: ragBlockStatusEnum("status").notNull().default("draft"),
    priority: integer("priority").notNull().default(50),
    version: integer("version").notNull().default(1),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Filtro composto crítico do retriever
    index("kb_filter_idx").on(
      t.categoryCode,
      t.writingStyleId,
      t.status,
      t.kind,
    ),
    // Ordenação por priority dentro do filtro
    index("kb_priority_idx").on(t.priority.desc()),
    // HNSW para busca semântica (m=16, ef_construction=64 — defaults razoáveis)
    index("kb_embedding_hnsw_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
    // Leitura para qualquer authenticated, MAS só blocks 'validated'
    pgPolicy("kb_select_validated_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`status = 'validated'`,
    }),
    // Mutações apenas via service_role (admin no backend valida)
  ],
).enableRLS();
