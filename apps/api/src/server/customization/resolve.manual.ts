/**
 * Item 7 de ponta a ponta: a personalização publicada chegando ao LAUDO.
 *
 * Rodar de apps/api, nos DOIS estados de flag — o script sabe em qual está e
 * cobra o comportamento correspondente:
 *
 *   # como está a produção hoje: tudo desligado
 *   pnpm exec tsx --env-file=.env.local src/server/customization/resolve.manual.ts
 *
 *   # com as duas travas ligadas
 *   MODEL_CATALOG_CATEGORIES=OBSTETRICA MODEL_CUSTOMIZATION_CATEGORIES=OBSTETRICA \
 *     pnpm exec tsx --env-file=.env.local src/server/customization/resolve.manual.ts
 *
 * SEGURANÇA: escreve só dentro de uma transação que termina em ROLLBACK, como
 * em store.manual.ts. O banco é produção e não há staging.
 */

import { getDbClient, schema } from "@laudousg/db";
import { sql } from "drizzle-orm";
import { env } from "@/server/env";
import { catalogEnabledFor } from "@/server/renderer/catalog/engine";
import { resolveCatalogo } from "@/server/renderer/catalog/registry";
import { OBSTETRICA_SAMPLES } from "@/server/renderer/catalog/OBSTETRICA.samples";
import { renderObstetricaCatalogo } from "@/server/renderer/catalog/OBSTETRICA.render";
import {
  renderObstetrica,
  type ObstetricaFindings,
} from "@/server/renderer/categories/OBSTETRICA";
import { resolverPersonalizacao } from "./resolve";
import { publicar, salvarRascunho, type Chave, type Executor } from "./store";
import type { Operation } from "@/server/renderer/catalog/types";

let ok = 0;
const falhas: string[] = [];
const check = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++;
  else falhas.push(nome + (extra === undefined ? "" : ` — ${JSON.stringify(extra)}`));
};

const ROLLBACK = Symbol("rollback proposital");

const FLAGS = { igCorrection: false, flexivel: false, grannum: false, objetivo: false };

/** O laudo que o pipeline produz hoje, sem catálogo nem personalização. */
function laudoDeProducaoHoje(f: ObstetricaFindings): string {
  return renderObstetrica(f, null, FLAGS);
}

async function main() {
  const e = env();
  const ligado =
    catalogEnabledFor(e.MODEL_CATALOG_CATEGORIES, "OBSTETRICA") &&
    catalogEnabledFor(e.MODEL_CUSTOMIZATION_CATEGORIES, "OBSTETRICA");

  const entrada = resolveCatalogo("OBSTETRICA", "CLASSICO_COMPLETO")!;
  const amostra = OBSTETRICA_SAMPLES[0]!.findings as ObstetricaFindings;
  const db = getDbClient();

  try {
    await db.transaction(async (tx) => {
      const x = tx as Executor;
      const [perfil] = await tx.select({ id: schema.profiles.id }).from(schema.profiles).limit(1);
      if (!perfil) throw new Error("nenhum profile no banco");

      const chave: Chave = {
        userId: perfil.id,
        categoryCode: "OBSTETRICA",
        styleCode: "CLASSICO_COMPLETO",
      };

      // --- 1. Sem nada publicado ------------------------------------------
      const semNada = await resolverPersonalizacao(chave, x);
      check("sem personalização publicada, não aplica", semNada.aplicar === false, semNada);

      // --- 2. Publica uma personalização ----------------------------------
      const FRASE = "Reavaliação ultrassonográfica em 4 semanas.";
      const ops: Operation[] = [{ op: "append_conclusion_item", value: FRASE }];
      await salvarRascunho(chave, entrada, ops, null, x);
      await publicar(chave, entrada, x);

      const r = await resolverPersonalizacao(chave, x);

      if (!ligado) {
        // Estado de PRODUÇÃO HOJE: mesmo com personalização publicada, as
        // flags desligadas mandam. Este é o teste que garante que o deploy
        // deste código não muda nenhum laudo.
        check("com flags OFF, não aplica mesmo publicada", r.aplicar === false, r);
        if (!r.aplicar) {
          check("o motivo é a flag, não outra coisa", r.motivo.includes("desligada"), r.motivo);
        }
        const laudo = renderObstetricaCatalogo({ findings: amostra, flags: FLAGS });
        check("laudo idêntico ao de produção", laudo === laudoDeProducaoHoje(amostra));
        check("e não contém a frase personalizada", !laudo.includes(FRASE));
        throw ROLLBACK;
      }

      // --- 3. Com as flags ligadas, a personalização entra ----------------
      check("com flags ON, aplica", r.aplicar === true, r);
      if (!r.aplicar) throw ROLLBACK;

      check("versão correta", r.versao === 1, r.versao);
      check("conta as operações", r.operacoes === 1, r.operacoes);
      check("ancorada no catálogo certo", r.catalogId === "OBSTETRICA/CLASSICO_COMPLETO");

      const base = renderObstetricaCatalogo({ findings: amostra, flags: FLAGS });
      const custom = renderObstetricaCatalogo({
        findings: amostra,
        flags: FLAGS,
        catalog: r.catalog,
        customSlots: r.customSlots,
        extraConclusao: r.extraConclusao,
      });

      check("o laudo mudou", base !== custom);
      check("a frase personalizada entrou", custom.includes(FRASE));
      check("o base NÃO tem a frase (não vazou para os outros)", !base.includes(FRASE));
      check("o base segue igual ao de produção", base === laudoDeProducaoHoje(amostra));

      // A diferença é exatamente a linha nova — nada mais foi mexido.
      const linhasBase = base.split("\n");
      const linhasCustom = custom.split("\n");
      const novas = linhasCustom.filter((l) => !linhasBase.includes(l));
      const sumidas = linhasBase.filter((l) => !linhasCustom.includes(l));
      check("exatamente uma linha nova", novas.length === 1, novas);
      check("nenhuma linha desapareceu", sumidas.length === 0, sumidas);
      check("a linha nova é a frase", novas[0]?.includes(FRASE) === true, novas[0]);

      // O corpo do laudo é intocado: a operação era só de conclusão.
      const corpoDe = (t: string) => t.split(/CONCLUS[ÃA]O/)[0];
      check("o corpo do laudo não mudou", corpoDe(base) === corpoDe(custom));

      // --- 4. Vale para TODOS os cenários, inclusive o gemelar ------------
      let mudaramTodos = true;
      for (const s of OBSTETRICA_SAMPLES) {
        const f = s.findings as ObstetricaFindings;
        const b = renderObstetricaCatalogo({ findings: f, flags: FLAGS });
        const c = renderObstetricaCatalogo({
          findings: f,
          flags: FLAGS,
          catalog: r.catalog,
          customSlots: r.customSlots,
          extraConclusao: r.extraConclusao,
        });
        if (!c.includes(FRASE) || b === c) mudaramTodos = false;
        if (b !== laudoDeProducaoHoje(f)) {
          falhas.push(`cenário ${s.id}: base divergiu de produção`);
        }
      }
      check(`a personalização vale nos ${OBSTETRICA_SAMPLES.length} cenários`, mudaramTodos);

      // --- 4b. replace_phrase: trocar uma frase que JÁ EXISTE ---------------
      // É o caso mais delicado: `append` só acrescenta, mas `replace` reescreve
      // texto que o médico já lê hoje.
      // Escolhe um slot cuja frase REALMENTE aparece no laudo deste cenário —
      // senão o teste passaria sem exercitar nada. (Foi o que aconteceu na
      // primeira versão: caiu em `saco_gestacional`, que só existe na gestação
      // inicial, e o check passou por vacuidade.)
      const laudoBase = renderObstetricaCatalogo({ findings: amostra, flags: FLAGS });
      const trechoFixo = (frase: string) => (frase.split("{")[0] ?? "").trim();
      const alvo = entrada.catalog.slots.find((sl) =>
        sl.variantes.some(
          (v) =>
            v.frase &&
            v.personalizavel !== false &&
            !v.montar &&
            trechoFixo(v.frase).length >= 12 &&
            laudoBase.includes(trechoFixo(v.frase)),
        ),
      );
      if (alvo) {
        const variante = alvo.variantes.find(
          (v) =>
            v.frase &&
            v.personalizavel !== false &&
            !v.montar &&
            trechoFixo(v.frase).length >= 12 &&
            laudoBase.includes(trechoFixo(v.frase)),
        )!;
        const original = variante.frase!;
        // Conserva os placeholders obrigatórios: trocar a redação, não o dado.
        const nova = `${original.replace(/\.$/, "")} (redação do médico).`;
        await salvarRascunho(chave, entrada, [
          { op: "replace_phrase", slot: alvo.id, variant: variante.id, value: nova },
        ], null, x);
        await publicar(chave, entrada, x);

        const r2 = await resolverPersonalizacao(chave, x);
        check("replace_phrase aplica", r2.aplicar === true, r2);
        if (r2.aplicar) {
          const c2 = renderObstetricaCatalogo({
            findings: amostra, flags: FLAGS,
            catalog: r2.catalog, customSlots: r2.customSlots, extraConclusao: r2.extraConclusao,
          });
          const b2 = renderObstetricaCatalogo({ findings: amostra, flags: FLAGS });
          // Se a frase-alvo aparece neste cenário, a troca tem de ser visível.
          const aparece = b2.includes(trechoFixo(original));
          console.log(`  [diag] replace_phrase no slot "${alvo.id}" — frase usada neste cenário: ${aparece}; laudo mudou: ${b2 !== c2}`);
          // Exige mudança de verdade: sem isso o check passaria por vacuidade
          // se a frase escolhida não aparecesse em nenhum cenário.
          check("replace_phrase muda o laudo", b2 !== c2 && c2.includes("(redação do médico)"), {
            slot: alvo.id,
            aparece,
          });
          check("a versão subiu para 2", r2.versao === 2, r2.versao);
          check("a frase acrescentada na v1 sumiu (é overlay, não acúmulo)", !c2.includes(FRASE));
        }
      }

      // --- 4c. Personalização que DEIXOU DE VALER --------------------------
      // Simula o que acontece quando um deploy muda o catálogo-base: grava
      // direto uma operação que aponta para um slot inexistente, contornando a
      // validação do store — exatamente o estado em que o banco ficaria.
      await tx.execute(sql`
        update public.report_model_customizations
           set operations = ${JSON.stringify([{ op: "remove_slot", slot: "slot_que_nao_existe_mais" }])}::jsonb
         where status = 'published'
      `);
      const rQuebrada = await resolverPersonalizacao(chave, x);
      check("personalização que não vale mais NÃO é aplicada", rQuebrada.aplicar === false, rQuebrada);
      if (!rQuebrada.aplicar) {
        check(
          "e o motivo diz o que houve",
          rQuebrada.motivo.includes("não vale mais"),
          rQuebrada.motivo,
        );
      }
      const laudoAposQuebra = renderObstetricaCatalogo({ findings: amostra, flags: FLAGS });
      check("o laudo volta ao modelo-base", laudoAposQuebra === laudoDeProducaoHoje(amostra));

      // --- 5. Outro médico não é afetado -----------------------------------
      const [outro] = await tx
        .select({ id: schema.profiles.id })
        .from(schema.profiles)
        .where(sql`id <> ${perfil.id}`)
        .limit(1);
      if (outro) {
        const rOutro = await resolverPersonalizacao({ ...chave, userId: outro.id }, x);
        check("a personalização de um médico não vaza para outro", rOutro.aplicar === false, rOutro);
      }

      // --- 6. Categoria sem catálogo ---------------------------------------
      const semCatalogo = await resolverPersonalizacao({ ...chave, categoryCode: "TIREOIDE" }, x);
      check("categoria sem catálogo não aplica", semCatalogo.aplicar === false);

      // --- 7. Estilo objetivo (ainda sem catálogo) --------------------------
      const objetivo = await resolverPersonalizacao({ ...chave, styleCode: "OBJETIVO" }, x);
      check("estilo sem catálogo não aplica", objetivo.aplicar === false);

      throw ROLLBACK;
    });
  } catch (err) {
    if (err !== ROLLBACK) throw err;
  }

  const [depois] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.reportModelCustomizations);
  check("ROLLBACK não deixou nada", Number(depois?.n) === 0, depois?.n);

  console.log(`\nItem 7 — personalização chegando ao laudo`);
  console.log(`flags: ${ligado ? "LIGADAS" : "DESLIGADAS (como a produção hoje)"}\n`);
  for (const f of falhas) console.log("  ✗", f);
  console.log(`\n${ok} passaram, ${falhas.length} falharam\n`);
  process.exit(falhas.length === 0 ? 0 : 1);
}

void main();
