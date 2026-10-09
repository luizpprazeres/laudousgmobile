/** Decisões do Luiz em 09/10/2026; casos sintéticos, sem LLM. */
import assert from "node:assert/strict";
import { A, F as M } from "./mamaria-fixtures";
import { F as T, L, N } from "./tireoide-objetivo-fixtures";
import { renderMamaria, MAMARIA_JSON_SCHEMA, MamariaFindingsSchema } from "../categories/MAMARIA";
import { renderTireoide, eixosDoNodulo, type TireoideNodulo } from "../categories/TIREOIDE";
import { renderViasUrinarias, ViasUrinariasFindingsSchema, VIAS_URINARIAS_JSON_SCHEMA } from "../categories/VIAS_URINARIAS";
import { SharedKidneySchema, renderSharedKidney, RENAL_PRESENCE } from "../categories/sharedUrinary";
import { getCategoryContract } from "../../prompts/contracts";
import { GLOBAL_RULES_BLOCK } from "../../prompts/global";
let total = 0;
function test(name: string, fn: () => void) { fn(); total++; console.log(`✓ ${name}`); }
for (const objetivo of [false, true]) {
    test(`mama normal sem axilas ${objetivo}`, () => { const out = renderMamaria(M({ titulo_com_axilas: false, escopo_exame: "mamas" }), undefined, { objetivo }); assert.match(out, /\(Categoria BI-RADS® 1\)/); assert.doesNotMatch(out, /axila/i); });
    test(`axilas explícitas ${objetivo}`, () => assert.match(renderMamaria(M({ escopo_exame: "mamas_axilas", titulo_com_axilas: true }), undefined, { objetivo }), /axila/i));
    test(`grupo sólido, maior medida ${objetivo}`, () => { const out = renderMamaria(M({ titulo_com_axilas: false, achados: [A({ tipo: "nodulo_solido", permitir_birads_calculado: false, quantidade: "multiplas", referencia_medida: "maior", ecogenicidade: "hipoecoico", margem: "circunscrita", medidas_cm: [1.2, 1, 0.9] })] }), undefined, { objetivo }); assert.match(out, /Imagens hipoecoicas/); assert.match(out, /a maior medindo 1,2 x 1,0 x 0,9 cm/); assert.doesNotMatch(out, /Categoria BI-RADS/); });
}
test("imagem única não recebe medida em conjunto por enum contraditório", () => { const out = renderMamaria(M({ achados: [A({ quantidade: "unica", referencia_medida: "conjunto", medidas_cm: [1, 0.9, 0.8] })] })); assert.doesNotMatch(out, /medindo em conjunto/); });
test("schema de grupo mamário", () => { assert.equal(MamariaFindingsSchema.parse(M({ achados: [A({ quantidade: "multiplas", referencia_medida: "maior" })] })).achados[0]?.referencia_medida, "maior"); assert.ok(MAMARIA_JSON_SCHEMA.properties.achados.items.required.includes("quantidade")); });
function nota(n: Partial<TireoideNodulo>): number { const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "anecoica_homogenea", diametro_transverso_cm: 0.9, ...n })] }) })); const m = out.match(/NOTA FINAL (\d+)/); assert.ok(m, out); return Number(m[1]); }
const ecos: [
    TireoideNodulo["ecogenicidade"],
    number
][] = [["anecoica_homogenea", 0], ["anecoica_finos_ecos", 0], ["anecoica_septos", 1], ["anecoica_componentes_solidos", 1], ["hipoecoica", 3], ["isoecoica", 2], ["hiperecoica", 1], ["isoecoica_areas_anecoicas", 1], ["hipoecoica_areas_anecoicas", 1], ["hiperecoica_areas_anecoicas", 1], ["solida_areas_anecoicas", 1], ["solida_calcificacao_parede", 0]];
for (const [ecogenicidade, pts] of ecos)
    test(`ecogenicidade ${ecogenicidade}`, () => assert.equal(nota({ ecogenicidade }), pts));
for (const [margem, pts] of [["regular", 0], ["irregular", 1], ["espiculada", 2]] as const)
    test(`margem ${margem}`, () => assert.equal(nota({ margem }), pts));
for (const [halo, pts] of [["fino_regular", 0], ["espesso_irregular", 2], ["sem_halo", 1]] as const) {
    test(`halo sólido ${halo}`, () => assert.equal(nota({ ecogenicidade: "isoecoica", halo }), 2 + pts));
    test(`halo anecoico ${halo}`, () => assert.equal(nota({ halo }), 0));
}
for (const [forma, pts] of [["mais_alta_que_larga", 3], ["mais_larga_que_alta", 0]] as const)
    test(`forma ${forma}`, () => assert.equal(nota({ forma }), pts));
for (const [diametro_transverso_cm, pts] of [[0.9, 0], [1, 1], [2.9, 1], [3, 2]] as const)
    test(`transverso ${diametro_transverso_cm}`, () => assert.equal(nota({ diametro_transverso_cm, medidas_cm: [5, 4, 3] }), pts));
for (const [calcificacoes, pts] of [["sem", 0], ["casca_ovo", 0], ["grosseiras", 1], ["micro", 3]] as const)
    test(`calcificação ${calcificacoes}`, () => assert.equal(nota({ calcificacoes }), pts));
for (const [vascularizacao, pts] of [["sem", 0], ["periferica", 1], ["periferica_maior_central", 2], ["central_maior_periferica", 3], ["exclusiva_central", 4]] as const)
    test(`Chammas ${vascularizacao}`, () => assert.equal(nota({ vascularizacao }), pts));
for (const [valor, conduta] of [[0, "controle anual"], [3, "controle anual"], [4, "controle ou citopunção"], [5, "controle ou citopunção"], [6, "citopunção"], [9, "citopunção"], [10, "citopunção"]] as const)
    test(`faixa/conduta ${valor}`, () => { const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "isoecoica", nota_domingos_ditada: String(valor) })] }) }), { show_conduct_recommendation: true }); const cat = valor <= 3 ? 1 : valor <= 5 ? 2 : valor <= 9 ? 3 : 4; assert.match(out, new RegExp(`TI-RADS de Domingos ${cat}\\): ${conduta}\\.`)); });
test("categoria ACR ditada não altera faixa Domingos", () => { const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "isoecoica", nota_domingos_ditada: "2", ti_rads_ditado: "4" })] }) }), { show_conduct_recommendation: true }); assert.match(out, /NOTA FINAL 2 \(características benignas pela escala de Domingos\); ACR TI-RADS 4/); assert.match(out, /TI-RADS de Domingos 1\): controle anual/); });
test("TI-2 inalterado", () => assert.equal(nota({ ecogenicidade: "isoecoica", diametro_transverso_cm: null, medidas_cm: null }), 2));
test("opção nova no catálogo", () => assert.ok(eixosDoNodulo()[0]?.opcoes.some(o => o.valor === "isoecoica_areas_anecoicas")));
const rim = { medidas_cm: null, espessura_parenquima_cm: null, dimensao: null, situacao_baixa: false, rotacao: false, drc: false, alteracao_difusa: null, hidronefrose: null, achados: [] };
const base = { rim_direito: rim, rim_esquerdo: rim, bexiga: { avaliada: true, parede_alterada: null, conteudo_alterado: null, espessura_parede_mm: null, volume_pre_miccional_ml: null, residuo_pos_miccional_ml: null }, dilatacao_ureteral: false, dilatacao_ureteral_descricao: null, achados_adicionais: null };
for (const presenca of RENAL_PRESENCE.filter(p => p !== "presente"))
    for (const lado of ["direito", "esquerdo"] as const)
        for (const objetivo of [false, true])
            test(`rim ${lado} ${presenca} ${objetivo}`, () => { const out = renderViasUrinarias(ViasUrinariasFindingsSchema.parse({ ...base, [`rim_${lado}`]: { ...rim, presenca, medidas_cm: [13, 5, 4], espessura_parenquima_cm: 1.3 } }), { objetivo }); assert.doesNotMatch(out, /Rins ecograficamente normais|13,0|1,3/); assert.match(out, new RegExp(`Rim ${lado} (ausente cirurgicamente|não visualizado)`)); if (presenca === "nao_visualizado")
                assert.doesNotMatch(out, /Agenesia|cirúrgica/); const shared = renderSharedKidney(SharedKidneySchema.parse({ ...rim, presenca }), lado); assert.equal(shared.isNormal, false); assert.equal(shared.body.length, 1); assert.equal(shared.conclusion.length, 1); });
test("presença legada preservada no caminho compartilhado", () => { const f = ViasUrinariasFindingsSchema.parse({ ...base, rim_direito: { ...rim, presenca: "ausente_cirurgico" }, rins_detalhados: { direito: SharedKidneySchema.parse(rim), esquerdo: SharedKidneySchema.parse(rim) } }); for (const objetivo of [false, true]) {
    const out = renderViasUrinarias(f, { objetivo });
    assert.match(out, /Ausência cirúrgica do rim direito/);
    assert.doesNotMatch(out, /Rins ecograficamente normais/);
} });
test("objetos renais antigos continuam normais quando não há ausência informada", () => assert.match(renderViasUrinarias(ViasUrinariasFindingsSchema.parse(base)), /Rins ecograficamente normais/));
test("schema renal inclui presença", () => assert.ok(VIAS_URINARIAS_JSON_SCHEMA.properties.rim_direito.required.includes("presenca")));
test("parede nos dois estilos", () => { for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"] as const) {
    const c = getCategoryContract("PAREDE_ABDOMINAL", estilo)!;
    assert.match(c, /estritamente maior que 2,0 cm/);
    assert.match(c, /igual a 2,0 cm ou menor NÃO/);
    assert.match(c, /Não arredonde/);
} });
test("global hipótese versus diagnóstico ditado", () => { assert.match(GLOBAL_RULES_BLOCK, /que tem como diagnóstico mais provável/); assert.match(GLOBAL_RULES_BLOCK, /Diagnóstico explicitamente afirmado/); });
console.log(`${total} verificações W7 passaram.`);
