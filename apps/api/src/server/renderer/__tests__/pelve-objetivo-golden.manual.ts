/**
 * GOLDEN do render PELVE_FEMININA estilo OBJETIVO. Determinístico (sem LLM):
 * renderPelveFeminina(f, { objetivo: true }) → asserções de estrutura
 * (TÉCNICA/ACHADOS/IMPRESSÃO), TÉCNICA por via (ta/tv/ta_tv/pos_abortamento),
 * reuso dos cálculos (volume uterino/ovariano elipsóide), achados
 * (mioma/FIGO, cisto/O-RADS, endometrioma), 1 casa decimal, concordância.
 * Falha = regressão.
 *
 * Rodar (tsx direto, caminho absoluto):
 *   tsx /Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/__tests__/pelve-objetivo-golden.manual.ts
 */
import {
  renderPelveFeminina,
  type PelveFemininaFindings,
} from "../categories/PELVE_FEMININA";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

const ovNormal = (medidas: number[]): PelveFemininaFindings["ovario_direito"] => ({
  visualizado: true,
  medidas_cm: medidas,
  volume_ml: null,
  alterado: false,
  atrofico: false,
  achados: [],
});

function F(over: Partial<PelveFemininaFindings>): PelveFemininaFindings {
  const base: PelveFemininaFindings = {
    via: "ta_tv",
    utero_posicao: "anteversoflexão",
    utero_medidas_cm: [7.2, 4.0, 5.0],
    utero_volume_ml: null,
    utero_volume_classe: null,
    miometrio_descricao: null,
    miomas: [],
    utero_miomatoso: false,
    endometrio_espessura_cm: 0.6,
    endometrio_eco: null,
    endometrio_frase: "padrao",
    endometrio_motivo: null,
    endometrio_achado: null,
    endometrio_conclusao: null,
    ovario_direito: ovNormal([3.0, 2.0, 2.2]),
    ovario_esquerdo: ovNormal([3.1, 2.1, 2.0]),
    diu: null,
    diu_descricao: null,
    istmocele: false,
    istmocele_descricao: null,
    istmocele_tipo: null,
    cistos_naboth: false,
    calcificacao_arqueadas: false,
    adenomiose: false,
    adenomiose_conclusao: null,
    liquido_livre: false,
    liquido_livre_descricao: null,
    produtos_retidos: false,
    produtos_retidos_quantidade: null,
    observacoes_corpo: null,
    achados_adicionais: null,
    referencia_idade_anos: null, referencia_grande_multipara: false,
  };
  return { ...base, ...over };
}

const render = (f: PelveFemininaFindings) => renderPelveFeminina(f, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos) + normal TA+TV ──
{
  const l = render(F({}));
  check("estrutura: cabeçalho TÉCNICA:", /\nTÉCNICA:\n/.test(l), l);
  check("estrutura: cabeçalho ACHADOS:", /\nACHADOS:\n/.test(l), l);
  check("estrutura: cabeçalho IMPRESSÃO:", /\nIMPRESSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("normal TA+TV: título", /^ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL/.test(l), l.split("\n")[0]);
  check("normal TA+TV: TÉCNICA TA+TV", /transabdominal \(com a bexiga repleta\) e transvaginal/.test(l), l);
  check("normal TA+TV: bexiga nos achados", /Bexiga de paredes regulares e finas/.test(l), l);
  // Volume uterino = 7.2*4*5*0.523 = 75.312 → 75,3
  check("normal: útero volume calculado (elipsóide)", /Útero em anteversoflexão, medindo 7,2 x 4 x 5 cm \(volume de 75,3 cm³\)\./.test(l), l);
  check("normal: endométrio nos achados", /Endométrio medindo 0,6 cm de espessura\./.test(l), l);
  check("normal: miométrio normal", /Miométrio com ecogenicidade e ecotextura normais\./.test(l), l);
  // OD = 3*2*2.2*0.523 = 6.9036 → 6,9 ; OE = 3.1*2.1*2*0.523 = 6.80946 → 6,8
  check("normal: ovário direito com volume", /Ovário direito medindo 3 x 2 x 2,2 cm \(volume de 6,9 cm³\), com folículos de permeio\./.test(l), l);
  check("normal: ausência de líquido livre", /Ausência de líquido livre na cavidade pélvica\./.test(l), l);
  check("normal: impressão útero volume normal", /Útero de volume normal \(75,3 cm³\)\./.test(l), l);
  check("normal: impressão ovários item único", /Ovários ecograficamente normais \(o direito com 6,9 cm³ e o esquerdo 6,8 cm³\), ambos contendo folículos\./.test(l), l);
}

// ── Normal somente TV (sem bexiga) ──
{
  const l = render(F({ via: "tv" }));
  check("normal TV: título", /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\b/.test(l), l.split("\n")[0] ?? "");
  check("normal TV: TÉCNICA transvaginal", /transdutor endocavitário multifrequencial, pela técnica transvaginal\./.test(l), l);
  check("normal TV: SEM bexiga nos achados", !/Bexiga de paredes regulares/.test(l), l);
  check("normal TV: SEM bexiga na impressão", !/Bexiga ecograficamente normal/.test(l), l);
}

// ── TÉCNICA varia por via: TA puro e pós-abortamento ──
{
  const ta = render(F({ via: "ta", endometrio_espessura_cm: null, endometrio_frase: null }));
  check("TA: título", /^ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL\b/.test(ta) && !/TRANSVAGINAL/.test(ta.split("\n")[0] ?? ""), ta.split("\n")[0] ?? "");
  check("TA: TÉCNICA transabdominal bexiga repleta", /transdutor convexo multifrequencial, pela técnica transabdominal com a bexiga repleta\./.test(ta), ta);
  check("TA: endométrio limitado nos achados", /A técnica transabdominal não permite avaliar detalhadamente a espessura do endométrio\./.test(ta), ta);

  const pa = render(F({ via: "pos_abortamento", produtos_retidos: true, produtos_retidos_quantidade: "moderada" }));
  check("pós-aborto: título", /AVALIAÇÃO PÓS-ABORTAMENTO/.test(pa.split("\n")[0] ?? ""), pa.split("\n")[0] ?? "");
  check("pós-aborto: TÉCNICA avaliação pós-abortamento", /para avaliação pós-abortamento\./.test(pa), pa);
  check("pós-aborto: imagens hiperecoicas amorfas nos achados", /Imagens hiperecoicas amorfas na cavidade endometrial\./.test(pa), pa);
  check("pós-aborto: produtos retidos na impressão", /Moderada quantidade de produtos retidos da concepção\./.test(pa), pa);
}

// ── Volume DITADO vence (não recalcula) ──
{
  const l = render(F({ utero_volume_ml: 88.0 }));
  check("útero: volume ditado mantido (88)", /\(88 cm³\)/.test(l), l);
}

// ── Mioma único + FIGO + rodapé FIGO ──
{
  const l = render(F({
    miomas: [{ classificacao: "intramural", medidas_cm: [2.0, 1.8, 1.5], parede: "parede anterior", relacao: null, figo: "4" }],
  }));
  check("mioma: achados descreve imagem hipoecoica", /Miométrio apresentando imagem hipoecoica e heterogênea, com margens regulares, medindo 2 x 1,8 x 1,5 cm, situada na parede anterior\./.test(l), l);
  check("mioma: impressão 'nódulo miomatoso intramural (FIGO 4)'", /que tem como diagnóstico mais provável nódulo miomatoso intramural \(categoria FIGO 4\)\./.test(l), l);
  check("mioma: rodapé FIGO presente uma vez", (l.match(/FIGO: Federação Internacional de Ginecologia e Obstetrícia\./g) || []).length === 1, l);
}

// ── Cisto/coleção ovariana (alteração unilateral → O-RADS 2, classe+volume) ──
{
  const l = render(F({
    ovario_direito: {
      visualizado: true,
      medidas_cm: [4.0, 3.5, 3.0],
      volume_ml: null,
      alterado: true,
      atrofico: false,
      achados: [{ lado: "direito", tipo: "cisto_simples", medidas_cm: [3.0, 2.8, 2.5], descricao: null, orads_ditado: "2" }],
    },
  }));
  check("coleção: achados descreve imagem no OD", /Ovário direito medindo 4 x 3,5 x 3 cm \(volume de 22 cm³\), apresentando imagem anecoica de paredes finas e regulares, medindo 3 x 2,8 x 2,5 cm\./.test(l), l);
  // OD volume = 4*3.5*3*0.523 = 21.966 → 22 ; classe >12 = aumentado
  check("coleção: impressão O-RADS 2 c/ classe+volume", /Ovário direito de volume aumentado \(22 cm³\), apresentando coleção líquida \(O-RADS 2\)\./.test(l), l);
  check("coleção: impressão separa OD alterado e OE normal", /Ovário direito de volume[\s\S]*Ovário esquerdo ecograficamente normal/.test(l), l);
  check("coleção: SEM item único 'Ovários ecograficamente normais'", !/Ovários ecograficamente normais \(o direito/.test(l), l);
}

// ── Endometrioma ("imagem de baixa ecogenicidade", O-RADS 2) ──
{
  const l = render(F({
    ovario_esquerdo: {
      visualizado: true,
      medidas_cm: [4.5, 4.0, 3.5],
      volume_ml: null,
      alterado: true,
      atrofico: false,
      achados: [{ lado: "esquerdo", tipo: "endometrioma", medidas_cm: [3.5, 3.0, 2.8], descricao: null, orads_ditado: "2" }],
    },
  }));
  check("endometrioma: achados 'imagem de baixa ecogenicidade'", /imagem de baixa ecogenicidade com aspecto em vidro fosco/.test(l), l);
  check("endometrioma: impressão endometrioma O-RADS 2 c/ classe+volume", /Ovário esquerdo de volume [^()]+\([\d,]+ cm³\), apresentando imagem de baixa ecogenicidade que tem como diagnóstico mais provável endometrioma \(O-RADS 2\)\./.test(l), l);
}

// ── Ovário não visualizado ──
{
  const l = render(F({
    ovario_esquerdo: { visualizado: false, medidas_cm: null, volume_ml: null, alterado: false, atrofico: false, achados: [] },
  }));
  check("ovário não visualizado: achados", /Ovário esquerdo não caracterizado pela técnica empregada\./.test(l), l);
  check("ovário não visualizado: impressão", /Ovário esquerdo não visualizado pela técnica empregada\./.test(l), l);
}

// ── Numeração contínua da impressão (com ".") ──
{
  const l = render(F({}));
  const impr = l.split("IMPRESSÃO:")[1] ?? "";
  const nums = [...impr.matchAll(/^(\d+)\./gm)].map((m) => Number(m[1]));
  const contigua = nums.every((n, i) => n === i + 1);
  check("numeração impressão: sequência 1..N contígua", contigua, nums.join(","));
  check("numeração impressão: NÃO usa ')' do clássico", !/^\d+\)/m.test(impr), impr);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
