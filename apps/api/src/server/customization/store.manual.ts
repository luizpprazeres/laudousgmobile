/**
 * Ciclo de vida da personalização, exercitado contra o banco REAL.
 *
 * Rodar da raiz:
 *   pnpm exec tsx --env-file=apps/api/.env.local \
 *     apps/api/src/server/customization/store.manual.ts
 *
 * SEGURANÇA: o projeto `laudousgmobile` é produção e não há staging. Por isso
 * tudo roda dentro de UMA transação que termina em ROLLBACK — inclusive as
 * transações internas do store, que viram savepoints. Nenhuma linha sobrevive
 * ao teste, e a última asserção confere isso.
 *
 * Não cria usuário: usa um `profiles.id` que já existe apenas como alvo da FK.
 * Nada é gravado para esse usuário de verdade — o rollback apaga tudo.
 */

import { getDbClient, schema } from "@laudousg/db";
import { and, eq, sql } from "drizzle-orm";
import {
  CustomizationError,
  descartarRascunho,
  despublicar,
  lerEstado,
  lerPublicada,
  publicar,
  restaurar,
  salvarRascunho,
  type Chave,
  type Executor,
} from "./store";
import { resolveCatalogo } from "@/server/renderer/catalog/registry";
import type { Operation } from "@/server/renderer/catalog/types";

let ok = 0;
const falhas: string[] = [];

function check(nome: string, cond: boolean, extra?: unknown) {
  if (cond) {
    ok++;
  } else {
    falhas.push(nome + (extra === undefined ? "" : ` — ${JSON.stringify(extra)}`));
  }
}

async function esperaErro(nome: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    falhas.push(`${nome} — não lançou erro`);
  } catch (e) {
    if (e instanceof CustomizationError) check(nome, e.code === code, { esperado: code, veio: e.code });
    else throw e;
  }
}

/** Um rollback proposital para não deixar rastro — não é falha de teste. */
const ROLLBACK = Symbol("rollback proposital");

async function main() {
  const entrada = resolveCatalogo("OBSTETRICA", "CLASSICO_COMPLETO");
  if (!entrada) throw new Error("catálogo OBSTETRICA/CLASSICO_COMPLETO não encontrado");

  const db = getDbClient();
  let contagemFinal = -1;

  /**
   * O ANTES, não o zero.
   *
   * Este teste afirmava que as tabelas ficavam VAZIAS no fim — o que valia
   * enquanto ninguém tinha publicado nada. Desde o piloto de 20/08 há
   * personalização de verdade em produção, e "vazio" passou a acusar falha
   * onde não há. O que a transação promete é não deixar rastro: o certo é
   * comparar com o estado anterior.
   */
  const [c0] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.reportModelCustomizations);
  const [e0] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.reportScopes);
  const antesCustom = Number(c0?.n ?? 0);
  const antesEscopos = Number(e0?.n ?? 0);

  try {
    await db.transaction(async (tx) => {
      const x = tx as Executor;

      const [perfil] = await tx.select({ id: schema.profiles.id }).from(schema.profiles).limit(1);
      if (!perfil) throw new Error("nenhum profile no banco — impossível satisfazer a FK");

      const chave: Chave = {
        userId: perfil.id,
        categoryCode: "OBSTETRICA",
        styleCode: "CLASSICO_COMPLETO",
      };

      // Um usuário sem nada personalizado gera pelo modelo-base.
      check("estado inicial vazio", (await lerEstado(chave, entrada, x)).historico.length === 0);
      check("sem publicada no início", (await lerPublicada(chave, x)) === null);

      // --- rascunho -------------------------------------------------------
      const opsA: Operation[] = [
        { op: "append_conclusion_item", value: "Controle ecográfico em 4 semanas." },
      ];
      const r1 = await salvarRascunho(chave, entrada, opsA, "primeira tentativa", x);
      check("rascunho nasce na versão 1", r1.versao === 1, r1.versao);
      check("rascunho nasce como draft", r1.status === "draft");
      check("rascunho ancora no base atual", r1.baseVersao === entrada.catalog.versao);
      check("rascunho não está desatualizado", r1.baseDesatualizado === false);

      // Salvar de novo SOBRESCREVE: rascunho não é versão.
      const opsB: Operation[] = [
        { op: "append_conclusion_item", value: "Controle ecográfico em 3 semanas." },
      ];
      const r2 = await salvarRascunho(chave, entrada, opsB, "mudei de ideia", x);
      check("segundo save não cria versão nova", r2.versao === 1, r2.versao);
      check("segundo save troca o conteúdo", JSON.stringify(r2.operations) === JSON.stringify(opsB));
      check("um só rascunho", (await lerEstado(chave, entrada, x)).historico.length === 1);

      // Rascunho ainda não afeta a geração.
      check("rascunho não vaza para a geração", (await lerPublicada(chave, x)) === null);

      // --- operação inválida não é gravada --------------------------------
      await esperaErro("slot obrigatório não pode ser removido", "invalid_operations", () =>
        salvarRascunho(chave, entrada, [{ op: "remove_slot", slot: "titulo" }], null, x),
      );
      const aposInvalida = await lerEstado(chave, entrada, x);
      check(
        "rascunho intacto após tentativa inválida",
        JSON.stringify(aposInvalida.rascunho?.operations) === JSON.stringify(opsB),
      );

      // --- publicar -------------------------------------------------------
      const p1 = await publicar(chave, entrada, x);
      check("publicado mantém a versão do rascunho", p1.publicado.versao === 1);
      check("publicado tem status published", p1.publicado.status === "published");
      check("publicado tem data", p1.publicado.publishedAt !== null);
      check("nada foi arquivado na 1ª publicação", p1.arquivou === null);

      const pub1 = await lerPublicada(chave, x);
      check("agora a geração enxerga", pub1 !== null);
      check("a geração recebe as operações certas", JSON.stringify(pub1?.operations) === JSON.stringify(opsB));

      const e1 = await lerEstado(chave, entrada, x);
      check("não sobrou rascunho após publicar", e1.rascunho === null);
      check("histórico tem 1 versão", e1.historico.length === 1);

      await esperaErro("publicar sem rascunho é recusado", "nothing_to_publish", () =>
        publicar(chave, entrada, x),
      );

      // --- segunda publicação arquiva a primeira --------------------------
      const opsC: Operation[] = [
        { op: "append_conclusion_item", value: "Retorno com o obstetra assistente." },
      ];
      const r3 = await salvarRascunho(chave, entrada, opsC, null, x);
      check("novo rascunho é versão 2", r3.versao === 2, r3.versao);

      const p2 = await publicar(chave, entrada, x);
      check("2ª publicação é a versão 2", p2.publicado.versao === 2);
      check("2ª publicação arquivou a 1", p2.arquivou === 1, p2.arquivou);

      const e2 = await lerEstado(chave, entrada, x);
      check("histórico agora tem 2", e2.historico.length === 2);
      check("só uma publicada", e2.historico.filter((v) => v.status === "published").length === 1);
      check("a v1 virou arquivada", e2.historico.find((v) => v.versao === 1)?.status === "archived");
      check(
        "a geração passou a ver a nova",
        JSON.stringify((await lerPublicada(chave, x))?.operations) === JSON.stringify(opsC),
      );

      // --- restaurar ------------------------------------------------------
      const rest = await restaurar(chave, entrada, 1, x);
      check("restaurar cria RASCUNHO, não publica", rest.rascunho.status === "draft");
      check("restaurar traz o conteúdo antigo", JSON.stringify(rest.rascunho.operations) === JSON.stringify(opsB));
      check("restaurar não tem avisos aqui", rest.avisos.length === 0, rest.avisos);
      check("restaurar numera adiante", rest.rascunho.versao === 3, rest.rascunho.versao);
      check(
        "restaurar NÃO muda o que a geração usa",
        JSON.stringify((await lerPublicada(chave, x))?.operations) === JSON.stringify(opsC),
      );
      await esperaErro("restaurar versão inexistente", "not_found", () =>
        restaurar(chave, entrada, 99, x),
      );

      // --- descartar rascunho ---------------------------------------------
      check("descartar rascunho funciona", (await descartarRascunho(chave, x)) === true);
      const e3 = await lerEstado(chave, entrada, x);
      check("sem rascunho após descartar", e3.rascunho === null);
      check("publicado intocado pelo descarte", e3.publicado?.versao === 2);
      check("descartar de novo é no-op", (await descartarRascunho(chave, x)) === false);

      // --- despublicar ------------------------------------------------------
      check("despublicar devolve a versão desligada", (await despublicar(chave, x)) === 2);
      check("a geração voltou ao modelo-base", (await lerPublicada(chave, x)) === null);
      const e4 = await lerEstado(chave, entrada, x);
      // 2 linhas: v1 (arquivada) e v2 (recém-arquivada). A v3 do `restaurar`
      // foi descartada acima — rascunho descartado some mesmo, porque nunca
      // chegou a valer; o número dele volta a estar livre.
      check("nada foi apagado ao despublicar", e4.historico.length === 2, e4.historico.length);
      check("nenhuma publicada agora", e4.historico.every((v) => v.status !== "published"));
      check("despublicar de novo é no-op", (await despublicar(chave, x)) === null);

      // Restaurar continua possível depois de desligar tudo.
      const rest2 = await restaurar(chave, entrada, 2, x);
      check("restaurar após despublicar", JSON.stringify(rest2.rascunho.operations) === JSON.stringify(opsC));
      check("republicar volta a valer", (await publicar(chave, entrada, x)).publicado.status === "published");
      check("geração enxerga de novo", (await lerPublicada(chave, x)) !== null);

      const [c] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.reportModelCustomizations)
        .where(
          and(
            eq(schema.reportModelCustomizations.categoryCode, "OBSTETRICA"),
            eq(schema.reportModelCustomizations.styleCode, "CLASSICO_COMPLETO"),
          ),
        );
      // v1, v2 e a v3 recriada pelo último `restaurar` — o descarte liberou o número.
      check("linhas criadas dentro da transação", Number(c?.n) === 3, c?.n);

      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }

  // Depois do rollback, o banco tem de estar COMO ANTES — nem uma linha a mais.
  const [depois] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.reportModelCustomizations);
  const [escopos] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.reportScopes);
  contagemFinal = Number(depois?.n ?? -1);
  check("ROLLBACK não deixou personalização para trás", contagemFinal === antesCustom,
    `antes ${antesCustom}, depois ${contagemFinal}`);
  check("ROLLBACK não deixou escopo para trás", Number(escopos?.n) === antesEscopos,
    `antes ${antesEscopos}, depois ${escopos?.n}`);

  console.log(`\nCiclo de vida da personalização — banco real, tudo revertido\n`);
  for (const f of falhas) console.log("  ✗", f);
  console.log(`\n${ok} passaram, ${falhas.length} falharam`);
  console.log(`linhas deixadas no banco: ${contagemFinal}\n`);
  process.exit(falhas.length === 0 ? 0 : 1);
}

void main();
