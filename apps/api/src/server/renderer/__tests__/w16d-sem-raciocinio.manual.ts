/**
 * W16D — correções determinísticas dos erros do modo sem raciocínio (bancada 11/10).
 * Cada bloco cita o caso real da bancada (dados sintéticos, sem paciente).
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/renderer/__tests__/w16d-sem-raciocinio.manual.ts
 */
import assert from "node:assert/strict";
import { normalizeAsrClinical } from "../../pipeline/asrClinical";
import { conferirPercentisDoApp, DopplerObstetricoModuleSchema } from "../categories/dopplerObstetricoModule";
import { MorfologicoFindingsSchema, normalizarExtracaoMorfologico, normalizarPosicaoFetal, renderMorfologico, type MorfologicoFindings } from "../categories/MORFOLOGICO";
import { legado } from "./morfologico-lateralidade-fixtures";
import { conferirLiquidoMedido, restaurarSiglasDitadas, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { preencherDatacaoPedidoDitada } from "../ig";

let ok = 0;
let falhas = 0;
function check(nome: string, fn: () => void) {
  try {
    fn();
    ok++;
    console.log(`✓ ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`✗ ${nome}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}

check("posição fetal: lado na forma da casa", () => {
  assert.equal(normalizarPosicaoFetal({ dorso: "esquerdo" }, "").dorso, "à esquerda");
  assert.equal(normalizarPosicaoFetal({ dorso: "a direita" }, "").dorso, "à direita");
  assert.equal(normalizarPosicaoFetal({ dorso: "anterior" }, "").dorso, "anterior");
  assert.equal(normalizarPosicaoFetal({ polo_cefalico: "esquerda" }, "").polo_cefalico, "à esquerda");
});
check("posição fetal: 'dorso' sem lado busca o lado no ditado (713cb21a: 'com dorso, À esquerda')", () => {
  assert.equal(normalizarPosicaoFetal({ dorso: "dorso" }, "feto em apresentação cefálica, com dorso, À esquerda, frequência").dorso, "à esquerda");
  assert.equal(normalizarPosicaoFetal({ dorso: "dorso" }, "com dorso à esquerda ... dorso à direita").dorso, null, "dois lados: ambíguo");
  assert.equal(normalizarPosicaoFetal({ dorso: "dorso" }, "com dorso, à esquerda", false).dorso, null, "gemelar: não adivinha");
});
check("posição fetal: 'situação situação transversa' e polo embaralhado (540c7e60, 28b46196)", () => {
  assert.equal(normalizarPosicaoFetal({ apresentacao: "situação transversa" }, "").apresentacao, "transversa");
  const r = normalizarPosicaoFetal({ apresentacao: null, polo_cefalico: "transversa, com polo cefálico à direita" }, "");
  assert.deepEqual([r.apresentacao, r.polo_cefalico], ["transversa", "à direita"]);
  assert.equal(normalizarPosicaoFetal({ apresentacao: "cefálica" }, "").apresentacao, "cefálica");
});
check("líquido 'normal' com MBV medido vira MBV (b80a63e5); com as duas medidas fica", () => {
  const f = { liquido_tipo: "normal", liquido_mbv_por_feto_cm: [3.6], liquido_ila_cm: null } as unknown as ObstetricaFindings;
  assert.equal(conferirLiquidoMedido(f).liquido_tipo, "mbv");
  const ila = { liquido_tipo: "normal", liquido_mbv_por_feto_cm: null, liquido_ila_cm: 14 } as unknown as ObstetricaFindings;
  assert.equal(conferirLiquidoMedido(ila).liquido_tipo, "ila");
  const ambos = { liquido_tipo: "normal", liquido_mbv_por_feto_cm: [6.7], liquido_ila_cm: 16.9 } as unknown as ObstetricaFindings;
  assert.equal(conferirLiquidoMedido(ambos), ambos);
});
check("datação ditada preenche o vazio (b95b8f3a); nunca troca a extraída; ambígua não preenche", () => {
  assert.equal(preencherDatacaoPedidoDitada({ datacao_pedido: null }, "Gestação em torno de 24 semanas e 2 dias corrigido pela ultrassonografia precoce").datacao_pedido, "corrigir");
  assert.equal(preencherDatacaoPedidoDitada({ datacao_pedido: null }, "pela biometria atual, devendo ser corrigida pela ultrassonografia precoce").datacao_pedido, "relacionar");
  assert.equal(preencherDatacaoPedidoDitada({ datacao_pedido: null }, "manter a biometria").datacao_pedido, "manter_biometria");
  assert.equal(preencherDatacaoPedidoDitada({ datacao_pedido: "relacionar" as const }, "corrigido pela ultrassonografia precoce").datacao_pedido, "relacionar");
  assert.equal(preencherDatacaoPedidoDitada({ datacao_pedido: null }, "corrija pela primeira US e mantenha a biometria").datacao_pedido, null);
  assert.equal(preencherDatacaoPedidoDitada({ datacao_pedido: null }, "Feto único, cefálico.").datacao_pedido, null);
});
check("percentil copiado da linha do app com IP diferente sai (1304da57); com IP igual fica", () => {
  const vazio = DopplerObstetricoModuleSchema.parse(Object.fromEntries(Object.keys(DopplerObstetricoModuleSchema.shape).map((k) => [k, null])));
  const linha = "→ Percentis (34s2d, Fetal Medicine Barcelona v2021): AU IP 0,50 (P7) · ACM IP 1,86 (P29) · Uterinas média IP 0,81 (P52)";
  const d = { ...vazio, ip_umbilical: 0.71, perc_umbilical: 7, ip_acm: 1.86, perc_acm: 29, ip_uterina_dir: 0.91, ip_uterina_esq: 0.71, perc_medio_uterinas: 52 };
  const r = conferirPercentisDoApp(d, linha);
  assert.equal(r.perc_umbilical, null, "IP 0,71 ≠ 0,50 da linha");
  assert.equal(r.perc_acm, 29, "IP igual: fica");
  assert.equal(r.perc_medio_uterinas, 52, "IP médio (0,91+0,71)/2 = 0,81: fica");
  assert.equal(conferirPercentisDoApp(d, "sem linha"), d);
});
check("ASR: 'com dor à direita' logo depois da apresentação é 'dorso' (71a86d78)", () => {
  assert.equal(
    normalizeAsrClinical("feto em apresentação pélvica, com dor à direita, frequência cardíaca de 142", "OBSTETRICA"),
    "feto em apresentação pélvica, com dorso à direita, frequência cardíaca de 142",
  );
  assert.equal(normalizeAsrClinical("paciente refere dor à direita", "OBSTETRICA"), "paciente refere dor à direita", "queixa fica");
});
check("morfológico 1º tri: CCN ÷10 volta ao ditado (cc2cf63a); uterinas no módulo voltam ao canal próprio (b315f01e)", () => {
  const base = { trimestre: "1t", ccn_mm: 5.42, doppler: null, uterina_ip_direita: null, uterina_ip_esquerda: null, itens_conclusao_livres: [] } as unknown as MorfologicoFindings;
  assert.equal(normalizarExtracaoMorfologico(base, "morfológico do primeiro trimestre, com CCN de 54,2, TN").ccn_mm, 54.2);
  assert.equal(normalizarExtracaoMorfologico(base, "CCN de 5,42 cm").ccn_mm, 5.42, "cm explícito não é este caso");
  const vazio = DopplerObstetricoModuleSchema.parse(Object.fromEntries(Object.keys(DopplerObstetricoModuleSchema.shape).map((k) => [k, null])));
  const comModulo = { ...base, ccn_mm: 54.2, uterina_ip_direita: 2.24, uterina_ip_esquerda: 2.12, doppler: { ...vazio, ip_uterina_dir: 2.24, ip_uterina_esq: 2.12, ip_medio_uterinas: 2.18 } } as unknown as MorfologicoFindings;
  const r = normalizarExtracaoMorfologico(comModulo, "");
  assert.equal(r.doppler, null, "módulo que repete as uterinas dos campos próprios sai");
  assert.deepEqual([r.uterina_ip_direita, r.uterina_ip_esquerda], [2.24, 2.12]);
  const soNoModulo = { ...base, ccn_mm: 54.2, doppler: { ...vazio, ip_uterina_dir: 2.24, ip_uterina_esq: 2.12 } } as unknown as MorfologicoFindings;
  assert.ok(normalizarExtracaoMorfologico(soNoModulo, "").doppler, "IP só no módulo: fica (morfologico-normalizacao-extracao)");
  const comDv = { ...comModulo, doppler: { ...vazio, ip_uterina_dir: 2.24, ip_ducto_venoso: 0.9 } } as unknown as MorfologicoFindings;
  assert.ok(normalizarExtracaoMorfologico(comDv, "").doppler, "com DV no módulo: fica");
});

check("morfológico 1º tri: 'Morfologia fetal normal…' obrigatória sem os marcadores ditados; sai com marcador alterado", () => {
  const semMarcadores = MorfologicoFindingsSchema.parse({ ...legado("1t"), osso_nasal: null, regurgitacao_tricuspide: null, ducto_venoso: null });
  for (const objetivo of [false, true]) {
    assert.match(renderMorfologico(semMarcadores, null, { objetivo }), /Morfologia fetal normal para esta fase da gestação\./);
  }
  const ossoAusente = MorfologicoFindingsSchema.parse({ ...legado("1t"), osso_nasal: "ausente" });
  assert.doesNotMatch(renderMorfologico(ossoAusente, null), /Morfologia fetal normal/);
  const dvAlterado = MorfologicoFindingsSchema.parse({ ...legado("1t"), ducto_venoso: "alterado" });
  assert.doesNotMatch(renderMorfologico(dvAlterado, null), /Morfologia fetal normal/);
});
check("morfológico 2º tri: siglas dos ossos longos (0b43fad5: 'Comprimento do fêmur direito (CF) de 43,2 mm')", () => {
  const f = MorfologicoFindingsSchema.parse({ ...legado("2t"), femur_dir_mm: 43.2, femur_esq_mm: 43.2, tibia_dir_mm: 38, umero_dir_mm: 40, radio_dir_mm: 35, ulna_dir_mm: 36, fibula_dir_mm: 37 });
  const t = renderMorfologico(f, null);
  for (const linha of ["Comprimento do fêmur direito (CF) de 43,2 mm.", "Comprimento da tíbia direita (T) de 38 mm.", "Comprimento da fíbula direita (F) de 37 mm.",
    "Comprimento do úmero direito (U) de 40 mm.", "Comprimento do rádio direito (R) de 35 mm.", "Comprimento da ulna direita (U) de 36 mm."]) {
    assert.ok(t.includes(linha), linha);
  }
  assert.ok(renderMorfologico(f, null, { objetivo: true }).includes("Comprimento do fêmur direito (CF): 43,2 mm."));
});

check("morfológico: cerebelo, cisterna magna e binocular no modelo atual do médico, com sigla; fêmur único com (CF)", () => {
  const f = MorfologicoFindingsSchema.parse({ ...legado("2t"), cerebelo_mm: 20.1, cisterna_magna_mm: 2.2, binocular_mm: 33.3 });
  const t = renderMorfologico(f, null);
  for (const linha of ["Medida do cerebelo (MC) de 20,1 mm.", "Medida da cisterna magna (CM) de 2,2 mm.", "Medida da distância binocular (DB) de 33,3 mm."]) assert.ok(t.includes(linha), linha);
  assert.ok(renderMorfologico(f, null, { objetivo: true }).includes("Cerebelo (MC): 20,1 mm."));
  const precoce = MorfologicoFindingsSchema.parse({ ...legado("1t"), femur_mm: 7.2 });
  const tp = renderMorfologico(precoce, null);
  if (/Comprimento do fêmur/.test(tp)) assert.ok(/Comprimento do fêmur \(CF\) de 7,2 mm/.test(tp), tp);
});
check("morfológico 1º tri: achado só materno não suprime a frase obrigatória (c675f495); achado fetal suprime", () => {
  const materno = MorfologicoFindingsSchema.parse({ ...legado("1t"), achados_adicionais: "Artéria uterina direita com índice de pulsatilidade alterado (IP 2,38)." });
  assert.match(renderMorfologico(materno, null), /Morfologia fetal normal para esta fase da gestação\./);
  const mioma = MorfologicoFindingsSchema.parse({ ...legado("1t"), achados_adicionais: "Nódulo miomatoso na parede anterior, em contato com a face materna placentária." });
  assert.match(renderMorfologico(mioma, null), /Morfologia fetal normal/);
  const fetal = MorfologicoFindingsSchema.parse({ ...legado("1t"), achados_adicionais: "Foco ecogênico no ventrículo esquerdo fetal." });
  assert.doesNotMatch(renderMorfologico(fetal, null), /Morfologia fetal normal/);
});

check("obstétrica: sigla ditada volta ao texto livre só com o mesmo rótulo e número (61a22347)", () => {
  const ditado = "Medida do cerebelo (MC) de 20,1 mm.\nMedida da cisterna magna (CM) de 2,2 mm.";
  assert.equal(restaurarSiglasDitadas("Medida do cerebelo de 20,1 mm.", ditado), "Medida do cerebelo (MC) de 20,1 mm.");
  assert.equal(restaurarSiglasDitadas("Medida da cisterna magna de 2.2 mm.", ditado), "Medida da cisterna magna (CM) de 2.2 mm.");
  assert.equal(restaurarSiglasDitadas("Medida do cerebelo de 21,5 mm.", ditado), "Medida do cerebelo de 21,5 mm.", "número diferente: não mexe");
  assert.equal(restaurarSiglasDitadas("Medida do cerebelo (MC) de 20,1 mm.", ditado), "Medida do cerebelo (MC) de 20,1 mm.", "já com sigla: igual");
});

check("morfológico: item livre 'uterinas normais' não repete a conclusão do Doppler estruturado (a3ea0fea)", () => {
  const vazioD = DopplerObstetricoModuleSchema.parse(Object.fromEntries(Object.keys(DopplerObstetricoModuleSchema.shape).map((k) => [k, null])));
  const f = MorfologicoFindingsSchema.parse({ ...legado("2t"), itens_conclusao_livres: ["Dopplervelocimetria normal das artérias uterinas"],
    doppler: { ...vazioD, ip_uterina_dir: 0.8, ip_uterina_esq: 0.9, ip_umbilical: 1.0, ip_acm: 1.8 } });
  assert.doesNotMatch(renderMorfologico(f, null), /Dopplervelocimetria normal das artérias uterinas/);
  const semModulo = MorfologicoFindingsSchema.parse({ ...legado("1t"), itens_conclusao_livres: ["Dopplervelocimetria normal das artérias uterinas"], doppler: null });
  assert.match(renderMorfologico(semModulo, null), /Dopplervelocimetria normal das artérias uterinas/, "1º tri sem módulo: único canal, fica");
});

console.log(`\nw16d-sem-raciocinio: ${ok}/${ok + falhas}`);
process.exit(falhas ? 1 : 0);
