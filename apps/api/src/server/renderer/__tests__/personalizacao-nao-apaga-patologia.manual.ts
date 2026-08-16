/**
 * C3 — personalização NUNCA pode apagar um achado patológico.
 *
 * BURACO (revisão Codex 16/08): `personalizavel: false` só impedia
 * `replace_phrase`. Um `remove_slot` em `cranio_achado`, `placenta_achado` e
 * `cordao_umbilical` passava com ZERO erros de validação, e o laudo perdia
 * Dandy-Walker, acretismo, prévia e artéria umbilical única — conservando
 * "As estruturas cranianas e da coluna vertebral são normais."
 *
 * É pior que o defeito que a C3 existe para impedir: não é normalidade
 * mascarando patologia, é patologia APAGADA com a normalidade no lugar.
 *
 *   pnpm exec tsx src/server/renderer/__tests__/personalizacao-nao-apaga-patologia.manual.ts
 */
import { applyCustomization, validateOperations } from "../catalog/engine";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { buildObstetricaDoc } from "../catalog/OBSTETRICA.render";
import { serialize } from "../catalog/engine";
import { EMPTY_FETO, type ObstetricaFindings } from "../categories/OBSTETRICA";
import type { Operation } from "../catalog/types";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, det = "") =>
  cond ? ok++ : falhas.push(`${nome}${det ? `\n      ${det}` : ""}`);

const patologico: ObstetricaFindings = {
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
  fetos: [{ ...EMPTY_FETO, dbp_mm: 80, cc_mm: 290, ca_mm: 270, cf_mm: 60, bcf_bpm: 142,
    apresentacao: "cefálica", cranio_achado: "dandy_walker", cordao_vasos: "dois" }],
  ig_semanas: 32, ig_dias: 0, dum: null, data_exame: null,
  primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
  referencia_fonte: null, corrigir_ig: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: "anterior", placenta_ecotextura: "homogênea",
  placenta_grau: null, placenta_relacao_orificio: "previa", placenta_distancia_orificio_mm: null,
  placenta_achado: "acretismo", placenta_achado_medidas: null,
  liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
  liquido_classe: null, achados_adicionais: null,
  itens_conclusao_livres: [], observacoes_corpo_livres: [],
} as ObstetricaFindings;

console.log("\nC3 — personalização não apaga patologia\n");

// ---------------------------------------------------- o ataque do Codex
console.log("O ataque reproduzido pelo Codex");
{
  const ataque: Operation[] = [
    { op: "remove_slot", slot: "cranio_achado" },
    { op: "remove_slot", slot: "placenta_achado" },
    { op: "remove_slot", slot: "cordao_umbilical" },
    { op: "remove_slot", slot: "placenta" },
  ];
  const erros = validateOperations(OBSTETRICA_CLASSICO, ataque);
  t("as 4 remoções são REJEITADAS", erros.length === 4,
    `validação devolveu ${erros.length} erro(s): ${JSON.stringify(erros)}`);
  for (const slot of ["cranio_achado", "placenta_achado", "cordao_umbilical", "placenta"]) {
    t(`  ${slot} rejeitado`, erros.some((e) => e.includes(slot)));
  }
  t("o motivo é legível para o médico",
    erros.every((e) => /achados alterados|obrigatório/.test(e)),
    JSON.stringify(erros));
}

// ------------------------------------------- o laudo continua íntegro
console.log("\nO laudo com os achados continua íntegro");
{
  const base = serialize(buildObstetricaDoc({ findings: patologico }).doc, OBSTETRICA_CLASSICO);
  for (const [nome, re] of [
    ["Dandy-Walker", /Dandy-Walker/],
    ["acretismo", /acretismo placentário/i],
    ["prévia", /Placenta prévia/],
    ["artéria umbilical única", /Artéria umbilical única/],
  ] as [string, RegExp][]) {
    t(`laudo-base contém ${nome}`, re.test(base));
  }
}

// ------------------------------------ remoção legítima continua valendo
console.log("\nRemoção de slot NORMAL continua permitida");
{
  for (const slot of ["ovarios", "vesicula_vitelina", "movimentos_fetais"]) {
    const erros = validateOperations(OBSTETRICA_CLASSICO, [{ op: "remove_slot", slot }]);
    const protegido = OBSTETRICA_CLASSICO.slots.find((s) => s.id === slot)?.removivel === false;
    t(`${slot}: ${protegido ? "protegido (esperado)" : "removível"}`,
      protegido ? erros.length > 0 : erros.length === 0,
      JSON.stringify(erros));
  }
}

// -------------------------- replace_phrase em patologia segue bloqueado
console.log("\nreplace_phrase em achado alterado segue bloqueado");
{
  const erros = validateOperations(OBSTETRICA_CLASSICO, [
    { op: "replace_phrase", slot: "cranio_achado", variant: "dandy_walker", value: "Tudo normal." },
  ]);
  t("reescrever a malformação é rejeitado", erros.length > 0, JSON.stringify(erros));
}

// ------------------------------------------- e o aplicador respeita
console.log("\nO aplicador não deixa passar o que a validação rejeita");
{
  // A remoção tira o slot da ORDEM, não do array de slots — então a prova é o
  // texto: a frase some do laudo.
  const inicial: ObstetricaFindings = {
    ...patologico, gestacao_inicial: true, ig_semanas: 9,
    saco_gestacional_mm: 20,
    fetos: [{ ...EMPTY_FETO, ccn_mm: 25, bcf_bpm: 160 }],
  } as ObstetricaFindings;
  const antes = serialize(buildObstetricaDoc({ findings: inicial }).doc, OBSTETRICA_CLASSICO);
  t("laudo-base tem a frase dos ovários", /Ovários de aspecto normal/.test(antes));

  const { catalog } = applyCustomization(OBSTETRICA_CLASSICO, {
    baseCatalogId: OBSTETRICA_CLASSICO.id,
    baseVersao: OBSTETRICA_CLASSICO.versao,
    operations: [{ op: "remove_slot", slot: "ovarios" }],
  });
  const depois = serialize(buildObstetricaDoc({ findings: inicial, catalog }).doc, catalog);
  t("remoção legítima de slot NORMAL aplica", !/Ovários de aspecto normal/.test(depois),
    depois.split("\n").find((l) => /Ovários/.test(l)) ?? "");
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(70)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total}`);
else { console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`); for (const f of falhas) console.log(`  • ${f}`); }
console.log(`${"═".repeat(70)}\n`);
if (falhas.length > 0) process.exit(1);
