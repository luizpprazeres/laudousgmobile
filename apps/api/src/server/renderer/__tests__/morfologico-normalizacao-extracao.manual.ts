/** Bancada final de 10/10: extração do morfológico por ditado.
 * (a) ossos longos do bloco "Medidas morfológicas:" não somem quando a extração os deixa null;
 * (b) ducto venoso do 1º trimestre não aciona o módulo Doppler nem apaga a conclusão das uterinas.
 * Rodar em apps/api: pnpm exec tsx src/server/renderer/__tests__/morfologico-normalizacao-extracao.manual.ts
 * Fixtures sintéticas; sem banco, rede ou LLM.
 */
import assert from "node:assert/strict";
import {
  MORFOLOGICO_JSON_SCHEMA,
  MorfologicoFindingsSchema,
  conclusaoUterinasDitada,
  normalizarExtracaoMorfologico,
  parseMedidasMorfologicas,
  renderMorfologico,
  type MorfologicoFindings,
} from "../categories/MORFOLOGICO";

/** Extração "tudo null" (o que o extrator devolve para o que não foi ditado). */
function vazio(over: Record<string, unknown>): MorfologicoFindings {
  const base: Record<string, unknown> = {};
  const shape = MorfologicoFindingsSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
  for (const k of MORFOLOGICO_JSON_SCHEMA.required) if (shape[k]?.safeParse(null).success) base[k] = null;
  return MorfologicoFindingsSchema.parse({ ...base, ...over });
}
const dopplerVazio = (over: Record<string, unknown> = {}) => {
  const d: Record<string, unknown> = {};
  for (const k of Object.keys(MorfologicoFindingsSchema.shape.doppler.unwrap().unwrap().shape)) d[k] = null;
  return { ...d, ...over };
};
let n = 0;
const ok = (nome: string) => { console.log(`✓ ${nome}`); n++; };

// ── (a) ossos longos ────────────────────────────────────────────────────────
const ditado2t = `Feto único, cefálico. IG pela biometria: 23s0d
Medidas morfológicas: Tíbia: 36,2 mm Fíbula: 33,8 mm Úmero: 35,4 mm Rádio: 29,9 mm Ulna: 33,3 mm Cerebelo: 24,6 mm Cisterna magna: 4,9 mm
Doppler: ...`;
assert.deepEqual(parseMedidasMorfologicas(ditado2t), {
  tibia_mm: 36.2, fibula_mm: 33.8, umero_mm: 35.4, radio_mm: 29.9, ulna_mm: 33.3, cerebelo_mm: 24.6, cisterna_magna_mm: 4.9,
});
assert.deepEqual(parseMedidasMorfologicas("Tíbia: 36,2 mm"), {}, "sem o cabeçalho do bloco, nada");
assert.deepEqual(parseMedidasMorfologicas("Medidas morfológicas: Úmero: 3,5 cm"), { umero_mm: 35 }, "cm explícito → mm");
ok("bloco 'Medidas morfológicas:' lido");

const omitiu = vazio({ trimestre: "2t", femur_mm: 39.7 });
const texto2t = renderMorfologico(normalizarExtracaoMorfologico(omitiu, ditado2t), null, {});
for (const v of ["36,2", "33,8", "35,4", "29,9", "33,3"]) assert.ok(texto2t.includes(v), `osso ${v} sumiu`);
assert.ok(!/(?:tíbia|fíbula|úmero|rádio|ulna)[^\n]*____/i.test(texto2t), "osso longo com ____");
assert.ok(/____/.test(renderMorfologico(omitiu, null, {})), "sem a normalização o defeito reproduz");
ok("ossos longos omitidos pela extração voltam do bloco");

const extraido = vazio({ trimestre: "2t", tibia_mm: 40, umero_dir_mm: 35.4, umero_esq_mm: 34 });
const norm = normalizarExtracaoMorfologico(extraido, ditado2t);
assert.equal(norm.tibia_mm, 40, "valor extraído (correção falada) nunca é sobrescrito");
assert.equal(norm.umero_mm, null, "lado ditado: o genérico não é completado");
assert.equal(norm.fibula_mm, 33.8);
ok("valor extraído e lados ditados preservados");

// ── (b) ducto venoso do 1º trimestre ────────────────────────────────────────
const ditado1t = `Ducto venoso com aspecto de onda trifásica. Translucência nucal de 1,9 mm.
Conclusão: 1. Gestação tópica. 4. Dopplervelocimetria normal das artérias uterinas.`;
const base1t = { trimestre: "1t", ccn_mm: 84.6, tn_mm: 1.9, ducto_venoso: "normal" };
const comDv = vazio({ ...base1t, doppler: dopplerVazio({ ducto_venoso_qualitativo: "onda trifásica" }) });
assert.ok(/COM DOPPLER|DOPPLERVELOCIMETRIA:|insuficientes/.test(renderMorfologico(comDv, null, {})), "sem a normalização o defeito reproduz");
for (const [nome, f] of [
  ["módulo só com DV qualitativo", comDv],
  ["módulo vazio", vazio({ ...base1t, doppler: dopplerVazio() })],
  ["sem módulo e sem itens livres", vazio(base1t)],
] as const) {
  for (const objetivo of [false, true]) {
    const t = renderMorfologico(normalizarExtracaoMorfologico(f, ditado1t), null, { objetivo });
    const rotulo = `${nome} (${objetivo ? "Objetivo" : "Clássico"})`;
    assert.equal(t.split("\n")[0], "ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE", `${rotulo}: título`);
    assert.ok(!/DOPPLERVELOCIMETRIA:|insuficientes|Doppler colorido para/i.test(t), `${rotulo}: módulo Doppler acionado`);
    assert.ok(/Ducto venoso com (?:aspecto de )?onda trifásica/.test(t), `${rotulo}: DV do protocolo sumiu`);
    assert.equal(t.match(/Dopplervelocimetria normal das artérias uterinas/g)?.length, 1, `${rotulo}: conclusão das uterinas`);
  }
}
ok("DV do 1º trimestre não aciona o módulo e a conclusão das uterinas fica (3 formas da extração × 2 estilos)");

const reverso = normalizarExtracaoMorfologico(
  vazio({ trimestre: "1t", ducto_venoso: null, doppler: dopplerVazio({ ducto_venoso_qualitativo: "onda A reversa" }) }), "");
assert.equal(reverso.ducto_venoso, "alterado", "DV reverso só no módulo não se perde");
assert.equal(reverso.doppler, null);
ok("DV reverso só no módulo vira ducto_venoso alterado");

// Fora do alvo: nada muda.
const comIndices = vazio({ ...base1t, doppler: dopplerVazio({ ip_uterina_dir: 1.2, ip_uterina_esq: 1.4 }) });
assert.deepEqual(normalizarExtracaoMorfologico(comIndices, ditado1t), comIndices, "1º tri com IP ditado: módulo fica");
const vazio2t = vazio({ trimestre: "2t", doppler: dopplerVazio() });
assert.deepEqual(normalizarExtracaoMorfologico(vazio2t, ""), vazio2t, "2º tri: módulo vazio (Doppler pedido) fica");
const livre = vazio({ ...base1t, itens_conclusao_livres: ["Doppler das artérias uterinas normal."] });
assert.deepEqual(normalizarExtracaoMorfologico(livre, ditado1t), livre, "conclusão já extraída não duplica");
assert.equal(conclusaoUterinasDitada("Artéria uterina direita: IP 1,2. Artéria uterina esquerda: IP 1,4."), null, "linha com índice não é conclusão");
assert.equal(conclusaoUterinasDitada("Sem queixas."), null);
ok("fora do alvo nada muda");

console.log(`${n} blocos verificados`);
