/**
 * GOLDEN de render local da PELVE_FEMININA (DET-5, estilo CLÁSSICO).
 * Determinístico (sem LLM): renderPelveFeminina(findings) → asserções de
 * presença/proibição/formato. Trava as 4 variantes (via), a estrutura, os órgãos
 * normais, os achados e a numeração contínua. Falha = regressão.
 *
 * Rodar (tsx direto, caminho absoluto):
 *   tsx /Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/__tests__/pelve-golden.manual.ts
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

// Ovário normal padrão.
const ovNormal = (medidas: number[]): PelveFemininaFindings["ovario_direito"] => ({
  visualizado: true,
  medidas_cm: medidas,
  volume_ml: null,
  alterado: false,
  atrofico: false,
  achados: [],
});

// Base de findings normal (todos os booleans/listas seguros).
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

// ── Estrutura clássica obrigatória ──
{
  const l = renderPelveFeminina(F({}));
  check("estrutura: COMENTÁRIOS:", /COMENTÁRIOS:/.test(l));
  check("estrutura: OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", /OS SEGUINTES ASPECTOS FORAM OBSERVADOS:/.test(l));
  check("estrutura: CONCLUSÃO:", /CONCLUSÃO:/.test(l));
  check("estrutura: 'obtida segundo protocolo'", /obtida segundo protocolo/.test(l));
}

// ── Variante 1: TA + TV (default) ──
{
  const l = renderPelveFeminina(F({ via: "ta_tv" }));
  check("TA+TV: título", /^ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL/.test(l), l.split("\n")[0]);
  check("TA+TV: técnica TA+TV", /Após a micção, foi introduzido transdutor de 6.5 MHz/.test(l));
  check("TA+TV: bexiga no corpo", /Bexiga de forma, contorno e ecotextura normais\./.test(l));
  check("TA+TV: bexiga na conclusão", /Bexiga ecograficamente normal\./.test(l));
}
// Default por via=null deve cair em TA+TV.
{
  const l = renderPelveFeminina(F({ via: null }));
  check("via null → TA+TV", /^ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL/.test(l));
}

// ── Variante 2: somente TV ──
{
  const l = renderPelveFeminina(F({ via: "tv" }));
  check("TV: título", /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\b/.test(l), l.split("\n")[0] ?? "");
  check("TV: transdutor 6.5 MHz transvaginal", /transdutor de 6.5 MHz, pela técnica transvaginal/.test(l));
  check("TV: SEM bexiga no corpo", !/Bexiga de forma/.test(l), l);
  check("TV: SEM bexiga na conclusão", !/Bexiga ecograficamente normal/.test(l));
}

// ── Variante 3: somente TA (endométrio limitado) ──
{
  const l = renderPelveFeminina(F({ via: "ta", endometrio_espessura_cm: null, endometrio_frase: null }));
  check("TA: título", /^ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL\b/.test(l) && !/TRANSVAGINAL/.test(l.split("\n")[0] ?? ""), l.split("\n")[0] ?? "");
  check("TA: bexiga repleta", /bexiga repleta/.test(l));
  check("TA: endométrio limitado no corpo", /A técnica transabdominal não permite avaliar detalhadamente a espessura do endométrio\./.test(l));
  check("TA: endométrio limitado na conclusão", /Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal\./.test(l));
}

// ── Variante 4: pós-abortamento ──
{
  const semProd = renderPelveFeminina(F({ via: "pos_abortamento", produtos_retidos: false }));
  check("pós-aborto: título", /AVALIAÇÃO PÓS-ABORTAMENTO/.test(semProd.split("\n")[0] ?? ""), semProd.split("\n")[0] ?? "");
  check("pós-aborto: ausência de saco gestacional no corpo", /Ausência de saco gestacional\./.test(semProd));
  check("pós-aborto: SEM produtos retidos (conclusão)", /Ausência de produtos retidos da concepção\./.test(semProd));

  const comProd = renderPelveFeminina(F({ via: "pos_abortamento", produtos_retidos: true, produtos_retidos_quantidade: "moderada" }));
  check("pós-aborto: imagens hiperecoicas amorfas no corpo", /Imagens hiperecoicas amorfas na cavidade endometrial\./.test(comProd));
  check("pós-aborto: COM produtos retidos (conclusão)", /Moderada quantidade de produtos retidos da concepção\./.test(comProd));
}

// ── Útero/ovários/endométrio normais ──
{
  const l = renderPelveFeminina(F({}));
  check("útero: posição + medidas", /Útero em anteversoflexão, medindo 7,2 x 4 x 5 cm\./.test(l), l);
  // Volume uterino = 7.2*4*5*0.523 = 75.312 → 75,3
  check("útero: volume calculado (elipsóide)", /Útero de volume normal \(75,3 cm³\)\./.test(l), l);
  check("endométrio: corpo", /Endométrio medindo 0,6 cm de espessura\./.test(l));
  check("endométrio: conclusão padrão", /O endométrio tem espessura normal para a fase do ciclo menstrual\./.test(l));
  check("miométrio normal", /Miométrio com ecogenicidade e ecotextura normais\./.test(l));
  check("ovários: imagens anecoicas no corpo", /Ovário direito medindo 3 x 2 x 2,2 cm, apresentando imagens anecoicas\./.test(l), l);
  // OD = 3*2*2.2*0.523 = 6.9036 → 6,9 ; OE = 3.1*2.1*2*0.523 = 6.80946 → 6,8
  check("ovários: item único na conclusão c/ volumes", /Ovários ecograficamente normais \(o direito com 6,9 cm³ e o esquerdo 6,8 cm³\), ambos contendo folículos\./.test(l), l);
}

// ── Volume DITADO vence (não recalcula) ──
{
  const l = renderPelveFeminina(F({ utero_volume_ml: 88.0 }));
  check("útero: volume ditado mantido (88)", /\(88 cm³\)/.test(l), l);
}

// ── Mioma único + FIGO + rodapé FIGO ──
{
  const l = renderPelveFeminina(F({
    miomas: [{ classificacao: "intramural", medidas_cm: [2.0, 1.8, 1.5], parede: "parede anterior", relacao: null, figo: "4" }],
  }));
  check("mioma: corpo descreve imagem hipoecoica", /Miométrio apresentando imagem hipoecoica e heterogênea, com margens regulares, medindo 2 x 1,8 x 1,5 cm, situada na parede anterior\./.test(l), l);
  check("mioma: conclusão 'diagnóstico mais provável nódulo miomatoso intramural'", /que tem como diagnóstico mais provável nódulo miomatoso intramural \(categoria FIGO 4\)\./.test(l), l);
  check("mioma: rodapé FIGO presente uma vez", (l.match(/FIGO: Federação Internacional de Ginecologia e Obstetrícia\./g) || []).length === 1, l);
}

// ── Cisto ovariano (alteração unilateral → itens separados) ──
{
  const l = renderPelveFeminina(F({
    ovario_direito: {
      visualizado: true,
      medidas_cm: [4.0, 3.5, 3.0],
      volume_ml: null,
      alterado: true,
      atrofico: false,
      achados: [{ lado: "direito", tipo: "cisto_simples", medidas_cm: [3.0, 2.8, 2.5], descricao: null }],
    },
  }));
  check("cisto: corpo descreve imagem no ovário direito", /Ovário direito medindo 4 x 3,5 x 3 cm, apresentando imagem anecoica de paredes finas e regulares, medindo 3 x 2,8 x 2,5 cm\./.test(l), l);
  check("cisto: conclusão OD coleção líquida (O-RADS 2) c/ classe+volume", /Ovário direito de volume aumentado \(22 cm³\), apresentando coleção líquida \(O-RADS 2\)\./.test(l), l);
  check("cisto: conclusão separa OD alterado e OE normal", /Ovário direito de volume[\s\S]*Ovário esquerdo ecograficamente normal/.test(l), l);
  check("cisto: NÃO usa 'apresentando alteração' genérico", !/apresentando alteração/.test(l), l);
  check("cisto: SEM item único 'Ovários ecograficamente normais'", !/Ovários ecograficamente normais \(o direito/.test(l), l);
}

// ── Numeração contínua (várias linhas → numeradas) ──
{
  const l = renderPelveFeminina(F({}));
  const concl = l.split("CONCLUSÃO:")[1] ?? "";
  // TA+TV normal: 3 itens (bexiga, útero, endométrio, ovários) → numerados 1) 2) 3) 4)
  check("numeração: começa em 1)", /\n1\) Bexiga ecograficamente normal\./.test(l), concl);
  check("numeração: contínua sem saltos", /4\) Ovários ecograficamente normais/.test(concl), concl);
  // Não pode haver "5)" sem "4)" etc. (checagem simples de sequência)
  const nums = [...concl.matchAll(/^(\d+)\)/gm)].map((m) => Number(m[1]));
  const contigua = nums.every((n, i) => n === i + 1);
  check("numeração: sequência 1..N contígua", contigua, nums.join(","));
}

// ── Ovário não visualizado ──
{
  const l = renderPelveFeminina(F({
    ovario_esquerdo: { visualizado: false, medidas_cm: null, volume_ml: null, alterado: false, atrofico: false, achados: [] },
  }));
  check("ovário não visualizado: corpo", /Ovário esquerdo não visualizado\./.test(l));
  check("ovário não visualizado: conclusão", /Ovário esquerdo não visualizado pela técnica empregada\./.test(l));
}

// ── DIU + líquido livre ──
{
  const l = renderPelveFeminina(F({ diu: "bem_posicionado", liquido_livre: true }));
  check("DIU: conclusão 'DIU bem posicionado'", /DIU bem posicionado\./.test(l));
  check("líquido livre: conclusão", /Líquido livre na cavidade pélvica\./.test(l));
}

// ── Tabela de referência (só quando pedida) ──
{
  const semTab = renderPelveFeminina(F({}));
  check("referência: omitida por padrão", !/Valores de referência/.test(semTab));
  // 40 anos → faixa 18–50: útero 110, ovários 11,0, endométrio 0,3–1,5.
  const comTab = renderPelveFeminina(F({ referencia_idade_anos: 40, referencia_grande_multipara: true }));
  check("referência: linha única canônica por idade", /Valores de referência \(Domingos\) — paciente de 40 anos: útero até 110 cm³; ovários até 11,0 cm³; endométrio 0,3–1,5 cm\./.test(comTab), comTab);
  // 55 anos grande multípara → faixa 50–60: útero 130.
  const com55 = renderPelveFeminina(F({ referencia_idade_anos: 55, referencia_grande_multipara: true }));
  check("referência: grande multípara 50–60 → útero 130", /paciente de 55 anos: útero até 130 cm³/.test(com55), com55);
  // 8 anos → pediátrica.
  const ped = renderPelveFeminina(F({ referencia_idade_anos: 8, referencia_grande_multipara: false }));
  check("referência: pediátrica (8 anos)", /paciente de 8 anos: útero até 5,0 cm³; ovários até 1,5 cm³/.test(ped), ped);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
