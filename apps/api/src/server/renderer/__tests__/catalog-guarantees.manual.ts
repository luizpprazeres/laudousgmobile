/**
 * Garantias de segurança da personalização — contra os MÓDULOS REAIS
 * (`renderer/catalog/*`), não contra uma cópia de teste.
 *
 * A equivalência byte-a-byte com o renderer atual é verificada à parte, em
 * catalog-equivalence.manual.ts (960 combinações). Aqui verificamos o que
 * acontece quando o usuário PERSONALIZA — que é onde mora o risco clínico.
 *
 * As garantias abaixo respondem à revisão adversarial do Codex 1
 * (docs/projeto-modelos/04-revisao-codex.md).
 *
 * Rodar: pnpm exec tsx apps/api/src/server/renderer/__tests__/catalog-guarantees.manual.ts
 */
import type { ObstetricaFindings } from "../categories/OBSTETRICA";
import { applyCustomization, validateOperations } from "../catalog/engine";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { buildObstetricaDoc, renderObstetricaCatalogo } from "../catalog/OBSTETRICA.render";
import { segmentKey, type Customization, type Operation, type ReportDoc } from "../catalog/types";

let pass = 0, fail = 0;
function check(nome: string, cond: boolean, detalhe?: string) {
  if (cond) { pass++; console.log(`  ✓ ${nome}`); }
  else { fail++; console.log(`  ✗ ${nome}`); if (detalhe) console.log(detalhe); }
}

const CAT = OBSTETRICA_CLASSICO;
const erros = (ops: Operation[]) => validateOperations(CAT, ops);

function custom(ops: Operation[]) {
  return applyCustomization(CAT, { baseCatalogId: CAT.id, baseVersao: CAT.versao, operations: ops } satisfies Customization);
}

const FETO = {
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null, polo_cefalico: null,
  bcf_bpm: 142, dbp_mm: 85, cc_mm: 310, ca_mm: 295, cf_mm: 62, ccn_mm: null,
  peso_g: 2450, peso_variacao_g: null, percentil: null,
};
function f(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false, fetos: [{ ...FETO }],
    ig_semanas: 32, ig_dias: 4, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null, saco_gestacional_mm: null,
    saco_gestacional_medidas_mm: null, placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null, liquido_tipo: null, liquido_ila_cm: null,
    liquido_mbv_por_feto_cm: null, liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], ...over,
  };
}
const INICIAL = f({
  gestacao_inicial: true, ig_semanas: 8, ig_dias: 2, saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
  fetos: [{ ...FETO, bcf_bpm: 158, ccn_mm: 16.4, dbp_mm: null, cc_mm: null, ca_mm: null, cf_mm: null, peso_g: null }],
});
const GEMELAR = f({
  numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
  fetos: [{ ...FETO, rotulo: "A", peso_g: 2100 }, { ...FETO, rotulo: "B", dbp_mm: 83, peso_g: 2380 }],
});

const rend = (findings: ObstetricaFindings, ops: Operation[] = []) => {
  const c = custom(ops);
  return renderObstetricaCatalogo({ findings, catalog: c.catalog, customSlots: c.customSlots, extraConclusao: c.extraConclusao });
};

// ---------------------------------------------------------------------------

console.log("\n[G1] Os cinco exemplos do briefing\n");

// 5. as três medidas do saco gestacional além do diâmetro médio
const OPS_SG: Operation[] = [{
  op: "replace_phrase", slot: "saco_gestacional",
  value: "Saco gestacional de forma normal, medindo {sg_medidas} mm, com diâmetro médio de {dsm} mm.",
}];
check("5. três medidas do saco gestacional (dado já extraído, hoje descartado)",
  erros(OPS_SG).length === 0 &&
  rend(INICIAL, OPS_SG).includes("medindo 20,3 x 10,4 x 15,4 mm, com diâmetro médio de 15,4 mm"));

// 2. substituir uma frase pela redação preferida
const OPS_FRASE: Operation[] = [{ op: "replace_phrase", slot: "movimentos_fetais", value: "Movimentação fetal presente e ativa." }];
check("2. substituir uma frase pela redação preferida",
  erros(OPS_FRASE).length === 0 &&
  rend(f(), OPS_FRASE).includes("Movimentação fetal presente e ativa.") &&
  !rend(f(), OPS_FRASE).includes("Os movimentos fetais são ativos."));

// 3. remover uma expressão dentro de uma frase (sem perder a informação)
const OPS_EXPR: Operation[] = [{ op: "replace_phrase", slot: "liquido_amniotico", variant: "normal", value: "Líquido amniótico de quantidade normal." }];
check("3. remover uma expressão ('pela análise subjetiva') preservando a informação",
  erros(OPS_EXPR).length === 0 &&
  rend(f(), OPS_EXPR).includes("Líquido amniótico de quantidade normal.\n") &&
  !rend(f(), OPS_EXPR).includes("pela análise subjetiva"));

// 1. acrescentar um item fixo à conclusão
const OPS_CONCL: Operation[] = [{ op: "append_conclusion_item", value: "Recomenda-se controle ecográfico em 4 semanas." }];
check("1. acrescentar um item fixo à conclusão",
  erros(OPS_CONCL).length === 0 &&
  rend(f(), OPS_CONCL).trimEnd().endsWith("3) Recomenda-se controle ecográfico em 4 semanas."));

// 4. remover um bloco opcional inteiro
const OPS_REMOVE: Operation[] = [{ op: "remove_slot", slot: "anatomia_visceras" }];
check("4. remover um bloco opcional inteiro",
  erros(OPS_REMOVE).length === 0 && !rend(f(), OPS_REMOVE).includes("O estômago e a bexiga"));

console.log("\n[G2] Invariantes de presença e de conteúdo\n");

check("remover slot obrigatório é rejeitado", erros([{ op: "remove_slot", slot: "dbp" }]).length === 1);
check("remover slot opcional é permitido", erros([{ op: "remove_slot", slot: "movimentos_fetais" }]).length === 0);
check("esvaziar a frase de um slot obrigatório é rejeitado",
  erros([{ op: "replace_phrase", slot: "dbp", value: "   " }]).length === 1);
check("reescrever DBP perdendo a medida {dbp} é rejeitado",
  erros([{ op: "replace_phrase", slot: "dbp", value: "Diâmetro biparietal normal." }]).length === 1);
check("reescrever DBP conservando {dbp} é permitido",
  erros([{ op: "replace_phrase", slot: "dbp", value: "DBP: {dbp} mm." }]).length === 0);
check("slot inexistente é rejeitado (detecta conflito de versão do base)",
  erros([{ op: "replace_phrase", slot: "slot_que_sumiu", value: "x" }]).length === 1);
check("placeholder desconhecido é rejeitado",
  erros([{ op: "replace_phrase", slot: "movimentos_fetais", value: "Movimentos {inexistente}." }]).length === 1);
check("injetar cabeçalho de seção é rejeitado",
  erros([{ op: "replace_phrase", slot: "movimentos_fetais", value: "CONCLUSÃO: texto" }]).length === 1);
check("item de conclusão com cabeçalho é rejeitado",
  erros([{ op: "append_conclusion_item", value: "IMPRESSÃO: algo" }]).length === 1);
check("nenhum placeholder vaza para o laudo final",
  !/\{\w+\}/.test(rend(f())) && !/\{\w+\}/.test(rend(INICIAL)) && !/\{\w+\}/.test(rend(GEMELAR)));

console.log("\n[G3] Estado clínico alterado não é personalizável (crítica C3)\n");

const OPS_PLACENTA: Operation[] = [{ op: "replace_phrase", slot: "placenta", variant: "normal", value: "\nPlacenta sem alterações." }];
check("personalizar a placenta NORMAL é permitido e aparece",
  erros(OPS_PLACENTA).length === 0 && rend(f(), OPS_PLACENTA).includes("Placenta sem alterações."));

const PREVIA = f({ placenta_localizacao: "prévia centro-total" });
const outPrevia = rend(PREVIA, OPS_PLACENTA);
check("com placenta PRÉVIA a personalização de normalidade não mascara o achado",
  !outPrevia.includes("Placenta sem alterações.") && outPrevia.includes("prévia centro-total"),
  `    linha: ${outPrevia.split("\n").find((l) => l.startsWith("Placenta"))}`);

check("tentar reescrever a variante de estado alterado é rejeitado na validação",
  erros([{ op: "replace_phrase", slot: "placenta", variant: "descrita", value: "\nPlacenta normal." }]).length === 1);
check("tentar reescrever o líquido alterado (oligoâmnio) é rejeitado",
  erros([{ op: "replace_phrase", slot: "liquido_amniotico", variant: "alterado", value: "Líquido normal." }]).length === 1);

const OLIGO = f({ liquido_tipo: "alterado", liquido_classe: "oligoâmnio" });
check("personalizar o líquido NORMAL não afeta o laudo com oligoâmnio",
  rend(OLIGO, OPS_EXPR).includes("oligoâmnio"));

console.log("\n[G4] Guards por slot, não por regex (crítica C1)\n");

const FRASE_PIG = "O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.).";
/** Versão estrutural do pesoFetalGuard: endereça o documento, não o texto. */
function guardPesoFetal(doc: ReportDoc): ReportDoc {
  if (doc.segments.some((s) => s.kind === "conclusao" && s.slotId === "concl_peso_fetal")) return doc;
  return { ...doc, segments: [...doc.segments, { slotId: "concl_peso_fetal", variantId: "computed", kind: "conclusao", text: FRASE_PIG, origin: "computed" }] };
}
const d1 = buildObstetricaDoc({ findings: f() });
const comPig = guardPesoFetal(d1.doc);
check("guard insere o item de peso fetal", comPig.segments.some((s) => s.text === FRASE_PIG));
check("guard é idempotente",
  guardPesoFetal(comPig).segments.filter((s) => s.text === FRASE_PIG).length === 1);
const dCustom = buildObstetricaDoc({ findings: f(), ...(() => { const c = custom(OPS_FRASE); return { catalog: c.catalog, customSlots: c.customSlots }; })() });
check("personalizar uma frase não cega o guard",
  guardPesoFetal(dCustom.doc).segments.some((s) => s.text === FRASE_PIG));
check("o guard não depende do cabeçalho da seção (funcionaria em IMPRESSÃO:)",
  !guardPesoFetal.toString().includes("CONCLUS"));

console.log("\n[G5] Chave composta no gemelar (crítica C2)\n");

const dg = buildObstetricaDoc({ findings: GEMELAR }).doc;
const chaves = dg.segments.filter((s) => s.slotId === "dbp").map(segmentKey);
check("um segmento de DBP por feto, endereçável", chaves.length === 2 && chaves[0] === "dbp#A" && chaves[1] === "dbp#B",
  `    ${JSON.stringify(chaves)}`);
check("as instâncias carregam valores distintos",
  dg.segments.find((s) => segmentKey(s) === "dbp#B")?.text.includes("83") === true);
check("feto único não ganha instância",
  buildObstetricaDoc({ findings: f() }).doc.segments.filter((s) => s.slotId === "dbp").map(segmentKey)[0] === "dbp");
check("os blocos são agrupados POR FETO, não por slot",
  (() => {
    const corpo = dg.segments.filter((s) => s.kind === "corpo").map(segmentKey);
    return corpo.indexOf("cf#A") < corpo.indexOf("feto_header#B");
  })());

console.log("\n[G6] Rastreabilidade de origem para o Lab\n");

const c6 = custom(OPS_FRASE);
const d6 = buildObstetricaDoc({ findings: PREVIA, catalog: c6.catalog, customSlots: c6.customSlots }).doc;
check("segmento personalizado é 'custom'", d6.segments.find((s) => s.slotId === "movimentos_fetais")?.origin === "custom");
check("segmento não tocado é 'base'", d6.segments.find((s) => s.slotId === "dbp")?.origin === "base");
check("achado patológico é 'computed'", d6.segments.find((s) => s.slotId === "placenta")?.origin === "computed");
check("item de IG calculado é 'computed'", d6.segments.find((s) => s.slotId === "concl_ig")?.origin === "computed");
check("o documento carrega o id e a versão do catálogo-base",
  d6.catalogId === "OBSTETRICA/CLASSICO_COMPLETO" && d6.catalogVersao === 1);

console.log(`\n${pass} passaram, ${fail} falharam\n`);
if (fail > 0) process.exit(1);
