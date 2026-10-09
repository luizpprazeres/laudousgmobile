import assert from "node:assert/strict";
import { dataGeracaoSaoPaulo } from "../ig";
import { ObstetricaFindingsSchema as S, renderObstetrica as render, EMPTY_FETO } from "../categories/OBSTETRICA";
import { MorfologicoFindingsSchema as M, renderMorfologico } from "../categories/MORFOLOGICO";
import { achadoNormalDe } from "../catalog/modeloNormal";
import { laudoPadraoDe as web } from "../catalog/modeloNormalRegistry";
import { renderObstetricaCatalogo as catalog } from "../catalog/OBSTETRICA.render";
import { CONCLUSAO_GESTACAO_INICIAL } from "../categories/gestacaoInicial";
let n = 0;
function contem(text: string | null, frase: string) { assert.ok(text?.includes(frase), frase); n++; }
const f = S.parse({ ...achadoNormalDe(S) as object, numero_fetos: 1, gestacao_inicial: false, fetos: [EMPTY_FETO], ig_semanas: 32, ig_dias: 3, primeira_us_data: "01/09/2026", primeira_us_ig_semanas: 28, primeira_us_ig_dias: 4, ig_referencia_hoje_semanas: 32, ig_referencia_hoje_dias: 4, referencia_fonte: "usg_precoce" });
const frases = {
  biometria: "Gestação em torno de 32 semanas e 3 dias.",
  us_precoce: "Gestação em torno de 32 semanas e 4 dias, corrigida pela ultrassonografia precoce.",
  biometria_e_us_precoce: "Gestação em torno de 32 semanas e 3 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 32 semanas e 4 dias.",
} as const;
const m = M.parse({ ...achadoNormalDe(M) as object, trimestre: "2t", ig_semanas: 32, ig_dias: 3, primeira_us_data: f.primeira_us_data, primeira_us_ig_semanas: 28, primeira_us_ig_dias: 4, ig_referencia_hoje_semanas: 32, ig_referencia_hoje_dias: 4, referencia_fonte: "usg_precoce" });
for (const modo of Object.keys(frases) as Array<keyof typeof frases>) {
  for (const objetivo of [false, true]) {
    contem(render(f, null, { objetivo, datacaoConclusao: modo }), frases[modo]);
    contem(web("OBSTETRICA", objetivo ? "OBJETIVO" : "CLASSICO_COMPLETO", { ...f, datacao_conclusao: modo }), frases[modo]);
    contem(renderMorfologico(m, null, { objetivo, datacaoConclusao: modo }), frases[modo]);
  }
  contem(catalog({ findings: f, datacaoConclusao: modo }), frases[modo]);
}
// Mesmos achados: voz com primeira US usa referência; catálogo antigo usa biometria.
contem(render(f, null, { igCorrection: true }), frases.us_precoce);
contem(web("OBSTETRICA", "CLASSICO_COMPLETO", f), frases.biometria);
contem(renderMorfologico(m, null, { igCorrection: true }), frases.us_precoce);
contem(web("MORFOLOGICO", "CLASSICO_COMPLETO", m), frases.biometria);
for (const [pedido, modo] of [["corrigir", "us_precoce"], ["relacionar", "biometria_e_us_precoce"], ["manter_biometria", "biometria"]] as const) contem(render({ ...f, datacao_pedido: pedido, corrigir_ig: true }, null, { igCorrection: true }), frases[modo]);
contem(render({ ...f, corrigir_ig: true }, null, { igCorrection: true }), frases.biometria_e_us_precoce);
contem(render({ ...f, ig_semanas: null, ig_dias: null }, null, { igCorrection: true }), frases.us_precoce);
contem(web("OBSTETRICA", "CLASSICO_COMPLETO", { ...f, ig_semanas: null, ig_dias: null }), frases.us_precoce);
const sem = { ...f, primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null, referencia_fonte: null };
contem(render(sem, null, { igCorrection: true }), frases.biometria);
const dum = { ...sem, dum: "01/02/2026", referencia_fonte: "dum" as const, ig_referencia_hoje_semanas: 35, ig_referencia_hoje_dias: 2, corrigir_ig: true };
contem(render(dum, null, { igCorrection: true }), frases.biometria);
contem(web("OBSTETRICA", "CLASSICO_COMPLETO", { ...dum, datacao_conclusao: "us_precoce" }), frases.biometria);
const dumMorfo = { ...m, primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null, dum: dum.dum, referencia_fonte: dum.referencia_fonte, ig_referencia_hoje_semanas: dum.ig_referencia_hoje_semanas, ig_referencia_hoje_dias: dum.ig_referencia_hoje_dias, corrigir_ig: true };
for (const objetivo of [false, true]) {
  contem(render(dum, null, { objetivo, igCorrection: true }), frases.biometria);
  contem(renderMorfologico(dumMorfo, null, { objetivo, igCorrection: true }), frases.biometria);
  for (const modo of Object.keys(frases) as Array<keyof typeof frases>) {
    contem(web("OBSTETRICA", objetivo ? "OBJETIVO" : "CLASSICO_COMPLETO", { ...dum, datacao_conclusao: modo }), frases.biometria);
    contem(web("MORFOLOGICO", objetivo ? "OBJETIVO" : "CLASSICO_COMPLETO", { ...dumMorfo, datacao_conclusao: modo }), frases.biometria);
  }
}
contem(render({ ...f, ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null }, null, { igCorrection: true, dataGeracao: "01/10/2026" }), "32 semanas e 6 dias, corrigida pela ultrassonografia precoce.");
assert.equal(f.data_exame, null); n++;
assert.equal(dataGeracaoSaoPaulo(new Date("2026-10-10T01:00:00Z")), "09/10/2026"); n++;
const inicial = { ...sem, numero_fetos: 0, fetos: [], gestacao_inicial: true, embriao_visualizado: false, vesicula_vitelina_visualizada: true, saco_gestacional_mm: 16.5, utero_posicao: "anteversão", utero_medidas_cm: [6, 4, 5], saco_gestacional_aspecto: "imagem anecoica homogênea", saco_gestacional_localizacao: "na região superior da cavidade endometrial", ovarios_normais: true, via_exame: "transvaginal" as const, ig_semanas: null, ig_dias: null };
for (const vesicula of [true, false]) {
  const a = S.parse({ ...inicial, vesicula_vitelina_visualizada: vesicula });
  for (const text of [render(a), render(a, null, { objetivo: true }), catalog({ findings: a }), web("OBSTETRICA", "CLASSICO_COMPLETO", a)!]) {
    contem(text, vesicula ? "Embrião ainda não visualizado." : "Embrião e vesícula vitelínica ainda não visualizados.");
    for (const frase of CONCLUSAO_GESTACAO_INICIAL) contem(text, frase);
    assert.ok(!/BCF|CCN|Batimentos|Peso|movimentos|anatomia/i.test(text)); n++;
    assert.equal(text.includes("Vesícula vitelina de forma"), vesicula); n++;
  }
  assert.equal(render(a), catalog({ findings: a })); n++;
}
for (const bad of [{ ...inicial, gestacao_inicial: false }, { ...inicial, embriao_visualizado: null }, { ...inicial, fetos: [EMPTY_FETO] }]) { assert.equal(S.safeParse(bad).success, false); n++; }
const gemelar = S.parse({ ...inicial, embriao_visualizado: null, numero_fetos: 1, fetos: [{ ...EMPTY_FETO, ccn_mm: 7, bcf_bpm: 130 }], sacos_gestacionais: [
  { rotulo: "A", embriao_visualizado: false, vesicula_vitelina_visualizada: false, feto_indice: null, diametro_medio_mm: 15, medidas_mm: null, localizacao: null },
  { rotulo: "B", embriao_visualizado: true, vesicula_vitelina_visualizada: true, feto_indice: 0, diametro_medio_mm: 18, medidas_mm: null, localizacao: null },
] });
const g = render(gemelar); contem(g, "Saco gestacional A"); contem(g, "Saco gestacional B"); contem(g, "Embrião visualizado.");
assert.equal((g.match(/BCF/g) ?? []).length, 1); n++;
async function rota() {
  process.env.CATALOG_SERVICE_TOKEN = "w5-credencial-sintetica-de-teste-local";
  const { POST } = await import("../../../app/api/catalog/[category]/render/route");
  for (const [category, dados] of [["OBSTETRICA", f], ["MORFOLOGICO", m]] as const) {
    for (const modo of [undefined, "us_precoce", "biometria_e_us_precoce"] as const) {
      const req = new Request("http://localhost/api/catalog/render", { method: "POST", headers: { authorization: `Bearer ${process.env.CATALOG_SERVICE_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ dados: { ...dados, ...(modo ? { datacao_conclusao: modo } : {}) } }) });
      const res = await POST(req, { params: Promise.resolve({ category }) });
      assert.equal(res.status, 200); n++;
      contem((await res.json()).laudo, frases[modo ?? "biometria"]);
    }
  }
  assert.throws(() => render(sem, null, { datacaoConclusao: "us_precoce" }), /primeira US/); n++;
  assert.equal(web("OBSTETRICA", "CLASSICO_COMPLETO", { ...sem, datacao_conclusao: "invalido" }), null); n++;
  console.log(`W5: ${n} verificações aprovadas.`);
}
rota().catch(error => { console.error(error); process.exitCode = 1; });
