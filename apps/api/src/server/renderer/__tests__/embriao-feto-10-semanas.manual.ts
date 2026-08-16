/**
 * REGRESSÃO — "Embrião" × "Feto" depende de 10 SEMANAS, não de 13s6d.
 *
 * Bug relatado pelo Dr. Luiz (2026-08-16): ele ditava "Feto com 11 semanas e
 * 2 dias" e o laudo saía "Embrião único". Um flag (`gestacao_inicial`, ≤13s6d)
 * decidia duas coisas: o MODELO do laudo e a PALAVRA.
 *
 * Janela do defeito: 10s0d–13s6d — gestação inicial COM feto.
 *
 *   pnpm exec tsx src/server/renderer/__tests__/embriao-feto-10-semanas.manual.ts
 */
import { readFileSync } from "node:fs";
import { buildObstetricaDoc } from "../catalog/OBSTETRICA.render";
import { serialize } from "../catalog/engine";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { ehEmbriao, EMPTY_FETO, fetoApresentacaoFrase, type ObstetricaFindings } from "../categories/OBSTETRICA";

let ok = 0;
let fail = 0;
function t(nome: string, cond: boolean, extra = "") {
  if (cond) { console.log(`  ✓ ${nome}`); ok++; }
  else { console.log(`  ✗ ${nome}${extra ? `\n      ${extra}` : ""}`); fail++; }
}

function base(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: true,
    fetos: [{ ...EMPTY_FETO, ccn_mm: 45, bcf_bpm: 160, apresentacao: null }],
    ig_semanas: 11, ig_dias: 2, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: 40, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null,
    placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], observacoes_corpo_livres: [],
    ...over,
  } as ObstetricaFindings;
}
const render = (f: ObstetricaFindings) =>
  serialize(buildObstetricaDoc({ findings: f }).doc, OBSTETRICA_CLASSICO);

console.log("\nEmbrião × Feto — corte em 10 semanas\n");

console.log("ehEmbriao()");
t("8 semanas → embrião", ehEmbriao(base({ ig_semanas: 8 })) === true);
t("9s6d → embrião", ehEmbriao(base({ ig_semanas: 9, ig_dias: 6 })) === true);
t("10s0d → FETO (limite)", ehEmbriao(base({ ig_semanas: 10, ig_dias: 0 })) === false);
t("11s2d → FETO (o caso do Luiz)", ehEmbriao(base({ ig_semanas: 11, ig_dias: 2 })) === false);
t("13s6d → FETO", ehEmbriao(base({ ig_semanas: 13, ig_dias: 6 })) === false);
t("32 semanas → feto", ehEmbriao(base({ ig_semanas: 32, gestacao_inicial: false })) === false);
t(
  "sem IG → cai no comportamento antigo (gestacao_inicial)",
  ehEmbriao(base({ ig_semanas: null })) === true &&
    ehEmbriao(base({ ig_semanas: null, gestacao_inicial: false })) === false,
);

console.log("\nO BUG relatado — 11s2d, gestação inicial");
{
  const txt = render(base({ ig_semanas: 11, ig_dias: 2 }));
  t("NÃO escreve 'Embrião único'", !txt.includes("Embrião único"), txt.split("\n").find((l) => /único/.test(l)) ?? "");
  t("escreve 'Feto único'", txt.includes("Feto único"));
  t("mantém a forma do modelo inicial ('em situação')", txt.includes("Feto único, em situação"));
  t("mantém o modelo inicial (saco gestacional)", txt.includes("Saco gestacional"));
}

console.log("\nGestação bem inicial — 8 semanas");
{
  const txt = render(base({ ig_semanas: 8, ig_dias: 0 }));
  t("escreve 'Embrião único'", txt.includes("Embrião único"));
  t("em situação", txt.includes("Embrião único, em situação"));
}

console.log("\nGestação avançada — 32 semanas");
{
  const txt = render(base({ ig_semanas: 32, gestacao_inicial: false, saco_gestacional_mm: null,
    fetos: [{ ...EMPTY_FETO, dbp_mm: 82, cc_mm: 295, ca_mm: 280, cf_mm: 61, bcf_bpm: 142 }] }));
  t("escreve 'Feto único, em apresentação'", txt.includes("Feto único, em apresentação"));
  t("nada de embrião", !txt.includes("Embrião"));
}

console.log("\nfetoApresentacaoFrase — assinatura retrocompatível");
{
  const ft = { ...EMPTY_FETO, apresentacao: null };
  t("2 args = comportamento antigo", fetoApresentacaoFrase(ft, true).startsWith("Embrião único"));
  t("3º arg separa a palavra", fetoApresentacaoFrase(ft, true, false).startsWith("Feto único, em situação"));
}



// ---------------------------------------------------------------------------
// O corte também precisa estar nas OUTRAS fontes de texto — o renderer cobre
// 117/124 gerações, mas as demais caem no writer. Sem estas asserções, um
// futuro edit no prompt reintroduz o bug sem ninguém perceber.
// ---------------------------------------------------------------------------
console.log("\nOutras fontes de texto (writer e Writer V2)");
{
  const contrato = readFileSync(
    new URL("../../prompts/contracts/OBSTETRICA.ts", import.meta.url), "utf8");
  t("contrato do writer explica os DOIS cortes", /10 SEMANAS/.test(contrato) && /13 SEMANAS E 6 DIAS/.test(contrato));
  t("contrato manda usar 'Feto' entre 10s0d e 13s6d", /entre 10s0d e 13s6d[\s\S]{0,120}Feto/.test(contrato));

  const global = readFileSync(
    new URL("../../prompts/global.ts", import.meta.url), "utf8");
  t("prompt global separa a palavra do modelo", /EMBRIÃO × FETO é OUTRO corte/.test(global));

  const spec = JSON.parse(readFileSync(
    new URL("../../pipeline/writerV2/specs/OBSTETRICA.json", import.meta.url), "utf8")) as
    { dictionary: { gatilho: string; corpo: string }[] };
  const abaixo = spec.dictionary.find((e) => /ABAIXO de 10 semanas/.test(e.gatilho));
  const acima = spec.dictionary.find((e) => /10 semanas ou mais/.test(e.gatilho));
  t("Writer V2: gatilho <10 semanas → Embrião", /^Embrião único/.test(abaixo?.corpo ?? ""));
  t("Writer V2: gatilho ≥10 semanas → Feto", /^Feto único/.test(acima?.corpo ?? ""));
  t("Writer V2: não sobrou gatilho amarrado a 'embrião único'",
    !spec.dictionary.some((e) => e.gatilho === "gestação inicial com embrião único"));
}

console.log(`\n${ok} ok, ${fail} falhas\n`);
if (fail > 0) process.exit(1);
