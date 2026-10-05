// Probe sintético — Obstétrico 2º/3º trimestre GEMELAR (lote 3, 05/10/2026).
// Só lê/executa a main. Dados 100% sintéticos.
// Rodar a partir de apps/api da main com caminhos absolutos (ver brief do lote 3); saída de 05/10 resumida em audits/lote3/obstetrico-gemelar-2026-10-05.md.
import { renderObstetrica, ObstetricaFindingsSchema, calcPonderal } from "../../../../../apps/api/src/server/renderer/categories/OBSTETRICA";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { checkFetalVitality } from "../../../../../apps/api/src/server/pipeline/fetalVitalityGuard";
type E = Record<string, any>;
const FETO: E = {
  rotulo: null, posicao_relativa: null, apresentacao: "cefálica", dorso: null, polo_cefalico: null,
  bcf_bpm: 142, dbp_mm: 82, cc_mm: 295, ca_mm: 270, cf_mm: 60, ccn_mm: null,
  peso_g: 1650, peso_variacao_g: null, percentil: null, bcf_alteracao: null, movimentos_fetais: null,
  cranio_achado: null, cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
};
const base = (over: E = {}): E => ({
  numero_fetos: 2, corionicidade: "dicoriônica e diamniótica", gestacao_inicial: false,
  fetos: [{ ...FETO, rotulo: "A", posicao_relativa: "à direita" }, { ...FETO, rotulo: "B", posicao_relativa: "à esquerda", apresentacao: "pélvica", bcf_bpm: 150, peso_g: 1620 }],
  ig_semanas: 32, ig_dias: 2, dum: null, data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null, placenta_quantidade: null, placenta_localizacao: null,
  placenta_ecotextura: null, placenta_grau: null, placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null,
  placenta_achado: null, placenta_achado_medidas: null, liquido_tipo: "mbv", liquido_ila_cm: null,
  liquido_mbv_por_feto_cm: [4.5, 5.1], liquido_classe: null, achados_adicionais: null,
  itens_conclusao_livres: [], observacoes_corpo_livres: [], ...over,
});
function run(nome: string, d: E, opts: { objetivo?: boolean; catalogo?: boolean; guard?: string } = {}) {
  console.log(`\n###### ${nome}`);
  const p = ObstetricaFindingsSchema.safeParse(d);
  console.log("schema:", p.success ? "ok" : JSON.stringify(p.error.issues.map((i) => i.path.join(".") + ": " + i.message)));
  const f: any = p.success ? p.data : d;
  console.log("calcPonderal:", JSON.stringify(calcPonderal(f.fetos)));
  try { console.log(renderObstetrica(f, undefined, { objetivo: opts.objetivo })); } catch (e) { console.log("ERRO renderObstetrica", String(e).slice(0, 300)); }
  if (opts.catalogo) {
    const r: any = renderizarSelecao("OBSTETRICA", "CLASSICO_COMPLETO", [], f);
    console.log("--- catálogo (renderizarSelecao CLASSICO_COMPLETO):");
    console.log(r.ok ? r.texto : JSON.stringify(r).slice(0, 500));
  }
  if (opts.guard) {
    const txt = renderObstetrica(f);
    console.log("--- fetalVitalityGuard:", JSON.stringify(checkFetalVitality(opts.guard, txt) ?? null).slice(0, 400));
  }
}
// G1 DC/DA concordante
run("G1 DC/DA concordante, MBV 4,5/5,1, pesos 1650/1620", base(), { catalogo: true });
// G2 divergência ~25% (B menor) + percentil B 4
run("G2 divergência 25% (A 2400 g, B 1800 g p4)", base({ fetos: [{ ...FETO, rotulo: "A", posicao_relativa: "à direita", peso_g: 2400, percentil: 55 }, { ...FETO, rotulo: "B", posicao_relativa: "à esquerda", peso_g: 1800, percentil: 4, ca_mm: 240 }] }), { catalogo: true });
// G3 MC/DA MBV discordante, placenta_quantidade não informada
run("G3a MC/DA, MBV A 1,5 / B 9,0, placenta_quantidade null", base({ corionicidade: "monocoriônica e diamniótica", liquido_mbv_por_feto_cm: [1.5, 9.0] }), { catalogo: true });
run("G3b mesmo, com liquido_classe 'polidrâmnio' ditada (global)", base({ corionicidade: "monocoriônica e diamniótica", placenta_quantidade: 1, liquido_mbv_por_feto_cm: [1.5, 9.0], liquido_classe: "polidrâmnio" }));
run("G3c MC/DA, ILA global 30 (gemelar com ILA)", base({ corionicidade: "monocoriônica e diamniótica", placenta_quantidade: 1, liquido_tipo: "ila", liquido_ila_cm: 30, liquido_mbv_por_feto_cm: null }));
// G4 um feto com BCF ausente
const g4 = base({ fetos: [{ ...FETO, rotulo: "A", posicao_relativa: "à direita", bcf_bpm: 140 }, { ...FETO, rotulo: "B", posicao_relativa: "à esquerda", bcf_bpm: null, bcf_alteracao: "ausente", peso_g: 900 }] });
run("G4a feto B BCF ausente", g4, { catalogo: true, guard: "gemelar, feto A com BCF 140, feto B sem batimentos cardíacos" });
run("G4b feto B sem BCF informado (nem valor nem alteração)", base({ fetos: [{ ...FETO, rotulo: "A" }, { ...FETO, rotulo: "B", bcf_bpm: null }] }));
// G5 rótulos/posição/apresentação
run("G5a rótulos e posição omitidos, apresentação omitida", base({ fetos: [{ ...FETO, apresentacao: null }, { ...FETO, apresentacao: null }] }));
run("G5b rótulos trocados (B listado primeiro, à direita)", base({ fetos: [{ ...FETO, rotulo: "B", posicao_relativa: "à direita" }, { ...FETO, rotulo: "A", posicao_relativa: "à esquerda" }], liquido_mbv_por_feto_cm: [1.2, 5.0] }));
run("G5c rótulos duplicados (A, A)", base({ fetos: [{ ...FETO, rotulo: "A" }, { ...FETO, rotulo: "A" }] }));
run("G5d numero_fetos 2 com só 1 feto em fetos[] e 2 MBV", base({ fetos: [{ ...FETO, rotulo: "A" }] }));
// G6 triplo
run("G6 trigemelar TC/TA, 3 fetos, MBV 4/5/6", base({ numero_fetos: 3, corionicidade: "tricoriônica e triamniótica", fetos: [{ ...FETO, rotulo: "A" }, { ...FETO, rotulo: "B", peso_g: 1500 }, { ...FETO, rotulo: "C", peso_g: 1200 }], liquido_mbv_por_feto_cm: [4, 5, 6] }), { catalogo: true });
// G1 objetivo
run("G1-obj DC/DA concordante (estilo objetivo)", base(), { objetivo: true });
