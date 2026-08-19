/**
 * Personalização de modelo — ciclo de vida: rascunho → publicado → arquivado.
 *
 * Projeto docs/projeto-modelos/, item 6. A regra que governa tudo aqui:
 * **o histórico nunca é reescrito**. Publicar não sobrescreve — arquiva a
 * versão anterior e cria a nova. Voltar atrás não apaga — cria um rascunho
 * novo com o conteúdo antigo. Toda versão que já valeu continua legível.
 *
 * Duas invariantes vêm do banco (índices únicos parciais da migration 0022):
 * no máximo um `draft` e um `published` por (escopo, categoria, estilo). Este
 * módulo trabalha para não violá-las e trata a violação como conflito de
 * concorrência, não como erro interno.
 */

import { getDbClient, schema, type DbClient } from "@laudousg/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { validateOperations } from "@/server/renderer/catalog/engine";
import type { EntradaCatalogo, EstiloVivo } from "@/server/renderer/catalog/registry";
import type { Operation } from "@/server/renderer/catalog/types";

export type Versao = {
  id: string;
  versao: number;
  status: "draft" | "published" | "archived";
  operations: Operation[];
  baseCatalogId: string;
  baseVersao: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  /**
   * A versão do catálogo-base mudou desde que esta personalização foi escrita.
   * Não invalida por si só — as operações podem continuar válidas —, mas é o
   * gatilho para revalidar antes de publicar.
   */
  baseDesatualizado: boolean;
};

export type Chave = {
  userId: string;
  categoryCode: string;
  /** Código do enum `writing_style_code` — ver registry.ESTILOS_VIVOS. */
  styleCode: EstiloVivo;
};

/**
 * Quem executa as queries. Em produção é o cliente Drizzle; nos testes é uma
 * transação que dá ROLLBACK no fim — é o que permite exercitar este módulo
 * contra o banco REAL (não há staging) sem deixar uma linha para trás.
 *
 * Transação dentro de transação vira SAVEPOINT no postgres-js, então os
 * `db.transaction()` daqui continuam corretos quando `db` já é um `tx`.
 */
export type Executor = DbClient | Parameters<Parameters<DbClient["transaction"]>[0]>[0];

const conexao = (db?: Executor): Executor => db ?? getDbClient();

/** Erro de domínio: a rota traduz em status HTTP; nada aqui conhece HTTP. */
export class CustomizationError extends Error {
  constructor(
    readonly code: "invalid_operations" | "not_found" | "conflict" | "nothing_to_publish",
    message: string,
    readonly detalhes?: string[],
  ) {
    super(message);
    this.name = "CustomizationError";
  }
}

/** Violação de índice único do Postgres — corrida entre dois requests. */
function ehConflitoDeUnicidade(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23505";
}

/**
 * O escopo é criado sob demanda, na primeira personalização do médico.
 * `onConflictDoNothing` + re-select cobre a corrida entre dois requests
 * simultâneos do mesmo usuário — sem ele, o segundo estouraria na unique.
 */
export async function garantirEscopo(userId: string, _db?: Executor): Promise<string> {
  const db = conexao(_db);
  await db
    .insert(schema.reportScopes)
    .values({ scopeType: "user", userId })
    .onConflictDoNothing();

  const [row] = await db
    .select({ id: schema.reportScopes.id })
    .from(schema.reportScopes)
    .where(and(eq(schema.reportScopes.scopeType, "user"), eq(schema.reportScopes.userId, userId)))
    .limit(1);

  if (!row) throw new CustomizationError("conflict", "não foi possível criar o escopo do usuário");
  return row.id;
}

/** Sem criar escopo — para leituras, que não devem gravar nada. */
async function acharEscopo(userId: string, _db?: Executor): Promise<string | null> {
  const db = conexao(_db);
  const [row] = await db
    .select({ id: schema.reportScopes.id })
    .from(schema.reportScopes)
    .where(and(eq(schema.reportScopes.scopeType, "user"), eq(schema.reportScopes.userId, userId)))
    .limit(1);
  return row?.id ?? null;
}

function paraVersao(
  r: typeof schema.reportModelCustomizations.$inferSelect,
  baseVersaoAtual: number,
): Versao {
  return {
    id: r.id,
    versao: r.versao,
    status: r.status as Versao["status"],
    operations: (r.operations ?? []) as Operation[],
    baseCatalogId: r.baseCatalogId,
    baseVersao: r.baseVersao,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    publishedAt: r.publishedAt?.toISOString() ?? null,
    baseDesatualizado: r.baseVersao !== baseVersaoAtual,
  };
}

const T = schema.reportModelCustomizations;

function filtroDaChave(scopeId: string, chave: Chave) {
  return and(
    eq(T.scopeId, scopeId),
    eq(T.categoryCode, chave.categoryCode),
    eq(T.styleCode, chave.styleCode),
  );
}

/** Rascunho, publicado e histórico completo de uma (categoria, estilo). */
export async function lerEstado(
  chave: Chave,
  entrada: EntradaCatalogo,
  _db?: Executor,
): Promise<{ rascunho: Versao | null; publicado: Versao | null; historico: Versao[] }> {
  const scopeId = await acharEscopo(chave.userId, _db);
  if (!scopeId) return { rascunho: null, publicado: null, historico: [] };

  const db = conexao(_db);
  const linhas = await db
    .select()
    .from(T)
    .where(filtroDaChave(scopeId, chave))
    .orderBy(desc(T.versao));

  const todas = linhas.map((r) => paraVersao(r, entrada.catalog.versao));
  return {
    rascunho: todas.find((v) => v.status === "draft") ?? null,
    publicado: todas.find((v) => v.status === "published") ?? null,
    historico: todas,
  };
}

/**
 * A personalização publicada — é o que a GERAÇÃO consulta.
 *
 * Devolve null em qualquer situação duvidosa (sem escopo, sem publicação, sem
 * operação). O caminho de geração nunca deve quebrar por causa disto: sem
 * personalização, gera-se o modelo-base, que é exatamente o comportamento de
 * hoje.
 */
export async function lerPublicada(
  chave: Chave,
  _db?: Executor,
): Promise<{
  operations: Operation[];
  baseCatalogId: string;
  baseVersao: number;
  versao: number;
} | null> {
  const scopeId = await acharEscopo(chave.userId, _db);
  if (!scopeId) return null;

  const db = conexao(_db);
  const [row] = await db
    .select()
    .from(T)
    .where(and(filtroDaChave(scopeId, chave), eq(T.status, "published")))
    .limit(1);

  if (!row) return null;
  const operations = (row.operations ?? []) as Operation[];
  if (operations.length === 0) return null;

  return {
    operations,
    baseCatalogId: row.baseCatalogId,
    baseVersao: row.baseVersao,
    versao: row.versao,
  };
}

/**
 * Grava o rascunho. Se já existe um, é sobrescrito — rascunho é bloco de
 * rascunho, não versão: só o que foi PUBLICADO entra no histórico.
 *
 * As operações são validadas contra o catálogo-base ATUAL antes de tocar o
 * banco. Rascunho inválido não é gravado: ele viraria uma armadilha para o
 * publish, que aconteceria dias depois, longe do contexto do erro.
 */
export async function salvarRascunho(
  chave: Chave,
  entrada: EntradaCatalogo,
  operations: Operation[],
  note: string | null,
  _db?: Executor,
): Promise<Versao> {
  const erros = validateOperations(entrada.catalog, operations);
  if (erros.length > 0) {
    throw new CustomizationError("invalid_operations", "operações inválidas", erros);
  }

  const scopeId = await garantirEscopo(chave.userId, _db);
  const db = conexao(_db);

  try {
    return await db.transaction(async (tx) => {
      const [existente] = await tx
        .select()
        .from(T)
        .where(and(filtroDaChave(scopeId, chave), eq(T.status, "draft")))
        .limit(1);

      if (existente) {
        /**
         * O UPDATE é CONDICIONADO a a linha ainda ser rascunho.
         *
         * Entre o SELECT acima e este UPDATE, outra requisição pode ter
         * PUBLICADO esse mesmo rascunho. Atualizar só por `id` alteraria uma
         * personalização já publicada — que está valendo nos laudos — sem nova
         * versão e sem revalidação, e sem que ninguém percebesse (achado do
         * Codex, 19/08).
         *
         * Zero linhas afetadas significa que a corrida aconteceu: vira 409, e
         * a tela recarrega em vez de sobrescrever o que já vale.
         */
        const atualizados = await tx
          .update(T)
          .set({
            operations,
            note,
            baseCatalogId: entrada.catalog.id,
            baseVersao: entrada.catalog.versao,
          })
          .where(and(eq(T.id, existente.id), eq(T.status, "draft")))
          .returning();
        if (atualizados.length === 0) {
          throw new CustomizationError(
            "conflict",
            "este rascunho acabou de ser publicado noutra aba ou dispositivo — recarregue para continuar de onde ele está",
          );
        }
        return paraVersao(atualizados[0]!, entrada.catalog.versao);
      }

      // Versão nova = uma acima da maior já existente, publicada ou arquivada.
      const [maior] = await tx
        .select({ v: sql<number>`coalesce(max(${T.versao}), 0)` })
        .from(T)
        .where(filtroDaChave(scopeId, chave));

      const [criado] = await tx
        .insert(T)
        .values({
          scopeId,
          categoryCode: chave.categoryCode,
          styleCode: chave.styleCode,
          baseCatalogId: entrada.catalog.id,
          baseVersao: entrada.catalog.versao,
          versao: Number(maior?.v ?? 0) + 1,
          status: "draft",
          operations,
          note,
          createdBy: chave.userId,
        })
        .returning();
      return paraVersao(criado!, entrada.catalog.versao);
    });
  } catch (e) {
    if (ehConflitoDeUnicidade(e)) {
      throw new CustomizationError("conflict", "outro rascunho foi criado ao mesmo tempo; recarregue");
    }
    throw e;
  }
}

/** Descarta o rascunho. Não toca no publicado nem no histórico. */
export async function descartarRascunho(chave: Chave, _db?: Executor): Promise<boolean> {
  const scopeId = await acharEscopo(chave.userId, _db);
  if (!scopeId) return false;

  const db = conexao(_db);
  const apagados = await db
    .delete(T)
    .where(and(filtroDaChave(scopeId, chave), eq(T.status, "draft")))
    .returning({ id: T.id });
  return apagados.length > 0;
}

/**
 * Publica o rascunho: o publicado atual vira `archived` e o rascunho toma o
 * seu lugar. É o único ponto em que a geração de laudos muda de comportamento
 * para este médico — por isso revalida contra o catálogo-base atual, mesmo que
 * o rascunho já tivesse sido validado quando foi escrito. Entre uma coisa e
 * outra pode ter havido deploy.
 *
 * A ordem dentro da transação importa: arquivar ANTES de promover, senão os
 * dois seriam `published` por um instante e o índice único rejeitaria.
 */
export async function publicar(
  chave: Chave,
  entrada: EntradaCatalogo,
  _db?: Executor,
): Promise<{ publicado: Versao; arquivou: number | null }> {
  const scopeId = await acharEscopo(chave.userId, _db);
  if (!scopeId) throw new CustomizationError("nothing_to_publish", "não há rascunho para publicar");

  const db = conexao(_db);

  try {
    return await db.transaction(async (tx) => {
      const [rascunho] = await tx
        .select()
        .from(T)
        .where(and(filtroDaChave(scopeId, chave), eq(T.status, "draft")))
        .limit(1);

      if (!rascunho) {
        throw new CustomizationError("nothing_to_publish", "não há rascunho para publicar");
      }

      const operations = (rascunho.operations ?? []) as Operation[];
      const erros = validateOperations(entrada.catalog, operations);
      if (erros.length > 0) {
        throw new CustomizationError(
          "invalid_operations",
          `o rascunho não vale mais no modelo-base v${entrada.catalog.versao}`,
          erros,
        );
      }

      const [anterior] = await tx
        .select({ id: T.id, versao: T.versao })
        .from(T)
        .where(and(filtroDaChave(scopeId, chave), eq(T.status, "published")))
        .limit(1);

      if (anterior) {
        await tx.update(T).set({ status: "archived" }).where(eq(T.id, anterior.id));
      }

      /**
       * A promoção também é CONDICIONADA a a linha ainda ser rascunho.
       *
       * Duas publicações simultâneas leriam o mesmo rascunho e ambas o
       * promoveriam — a segunda arquivaria a primeira e publicaria a MESMA
       * linha de novo, deixando o histórico com uma versão fantasma. Zero
       * linhas aqui significa que outra requisição chegou antes.
       */
      const publicados = await tx
        .update(T)
        .set({
          status: "published",
          publishedAt: new Date(),
          // Reancora no base contra o qual acabou de ser validado.
          baseCatalogId: entrada.catalog.id,
          baseVersao: entrada.catalog.versao,
        })
        .where(and(eq(T.id, rascunho.id), eq(T.status, "draft")))
        .returning();
      if (publicados.length === 0) {
        throw new CustomizationError(
          "conflict",
          "esta personalização acabou de ser publicada noutra aba ou dispositivo — recarregue para ver a versão que está valendo",
        );
      }

      return {
        publicado: paraVersao(publicados[0]!, entrada.catalog.versao),
        arquivou: anterior?.versao ?? null,
      };
    });
  } catch (e) {
    if (e instanceof CustomizationError) throw e;
    if (ehConflitoDeUnicidade(e)) {
      throw new CustomizationError("conflict", "outra publicação aconteceu ao mesmo tempo; recarregue");
    }
    throw e;
  }
}

/**
 * Desliga a personalização: o publicado vira `archived` e nada toma o lugar.
 * A geração volta ao modelo-base na hora. É o botão de pânico, e por isso não
 * apaga nada — a versão continua no histórico e pode ser restaurada.
 */
export async function despublicar(chave: Chave, _db?: Executor): Promise<number | null> {
  const scopeId = await acharEscopo(chave.userId, _db);
  if (!scopeId) return null;

  const db = conexao(_db);
  const [arquivado] = await db
    .update(T)
    .set({ status: "archived" })
    .where(and(filtroDaChave(scopeId, chave), eq(T.status, "published")))
    .returning({ versao: T.versao });
  return arquivado?.versao ?? null;
}

/**
 * Restaura uma versão do histórico COMO RASCUNHO — nunca publicando direto.
 *
 * O motivo é que o catálogo-base pode ter mudado desde então: uma operação que
 * valia na v1 pode apontar para um slot que não existe mais na v2. Restaurar
 * como rascunho devolve o conteúdo ao médico e deixa a validação aparecer
 * ANTES de o laudo mudar, em vez de depois.
 *
 * Se as operações antigas não valem mais, `avisos` diz por quê e o rascunho é
 * gravado assim mesmo — para o médico ver o que tinha e consertar, em vez de
 * receber uma recusa seca e perder o conteúdo.
 */
export async function restaurar(
  chave: Chave,
  entrada: EntradaCatalogo,
  versaoAlvo: number,
  _db?: Executor,
): Promise<{ rascunho: Versao; avisos: string[] }> {
  const scopeId = await acharEscopo(chave.userId, _db);
  if (!scopeId) throw new CustomizationError("not_found", "não há histórico para este modelo");

  const db = conexao(_db);
  const [alvo] = await db
    .select()
    .from(T)
    .where(and(filtroDaChave(scopeId, chave), eq(T.versao, versaoAlvo)))
    .limit(1);

  if (!alvo) throw new CustomizationError("not_found", `versão ${versaoAlvo} não existe`);

  const operations = (alvo.operations ?? []) as Operation[];
  const avisos = validateOperations(entrada.catalog, operations);

  const scopeIdGarantido = await garantirEscopo(chave.userId, _db);
  try {
    const rascunho = await db.transaction(async (tx) => {
      const [existente] = await tx
        .select()
        .from(T)
        .where(and(filtroDaChave(scopeIdGarantido, chave), eq(T.status, "draft")))
        .limit(1);

      const note = `restaurado da versão ${versaoAlvo}`;

      if (existente) {
        const [atualizado] = await tx
          .update(T)
          .set({
            operations,
            note,
            baseCatalogId: entrada.catalog.id,
            baseVersao: entrada.catalog.versao,
          })
          .where(eq(T.id, existente.id))
          .returning();
        return atualizado!;
      }

      const [maior] = await tx
        .select({ v: sql<number>`coalesce(max(${T.versao}), 0)` })
        .from(T)
        .where(filtroDaChave(scopeIdGarantido, chave));

      const [criado] = await tx
        .insert(T)
        .values({
          scopeId: scopeIdGarantido,
          categoryCode: chave.categoryCode,
          styleCode: chave.styleCode,
          baseCatalogId: entrada.catalog.id,
          baseVersao: entrada.catalog.versao,
          versao: Number(maior?.v ?? 0) + 1,
          status: "draft",
          operations,
          note,
          createdBy: chave.userId,
        })
        .returning();
      return criado!;
    });

    return { rascunho: paraVersao(rascunho, entrada.catalog.versao), avisos };
  } catch (e) {
    if (ehConflitoDeUnicidade(e)) {
      throw new CustomizationError("conflict", "outro rascunho foi criado ao mesmo tempo; recarregue");
    }
    throw e;
  }
}
