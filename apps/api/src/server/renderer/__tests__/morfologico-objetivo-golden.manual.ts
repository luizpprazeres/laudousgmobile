/**
 * GOLDEN do render MORFOLOGICO estilo OBJETIVO (Sprint 2). Determinístico (sem
 * LLM): renderMorfologico(f, null, { objetivo: true }) → asserções de estrutura
 * (TÉCNICA/ACHADOS/IMPRESSÃO), 1 casa decimal, trimestres 1t/2t/3t e IP médio das
 * uterinas (cálculo reusado). Falha = regressão.
 * Rodar: tsx src/server/renderer/__tests__/morfologico-objetivo-golden.manual.ts
 */
import {
  renderMorfologico,
  type MorfologicoFindings,
} from "../categories/MORFOLOGICO";

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

const F = (p: Partial<MorfologicoFindings>): MorfologicoFindings => ({
  trimestre: "2t", apresentacao: null, dorso: null, bcf_bpm: 145,
  ccn_mm: null, tn_mm: null, osso_nasal: null, ducto_venoso: null,
  uterina_ip_direita: null, uterina_ip_esquerda: null,
  dbp_mm: null, cc_mm: null, cerebelo_mm: null, cisterna_magna_mm: null, binocular_mm: null, ca_mm: null,
  femur_mm: null, tibia_mm: null, fibula_mm: null, umero_mm: null, radio_mm: null, ulna_mm: null,
  peso_g: null, peso_variacao_g: null, percentil: null, genitalia: null,
  placenta_localizacao: null, placenta_grau: null, ila_cm: null,
  ig_semanas: null, ig_dias: null, dum: null, achados_adicionais: null,
  ...p,
});
const render = (f: MorfologicoFindings) => renderMorfologico(f, null, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos), 1º trimestre ──
{
  const l = render(F({ trimestre: "1t", ig_semanas: 12, ig_dias: 3, ccn_mm: 61.5, tn_mm: 1.4, osso_nasal: "presente", ducto_venoso: "normal" }));
  check("1t: título 'PRIMEIRO TRIMESTRE'", /ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE/.test(l), l);
  check("1t: cabeçalho 'TÉCNICA:'", /\nTÉCNICA:\n/.test(l), l);
  check("1t: cabeçalho 'ACHADOS:'", /\nACHADOS:\n/.test(l), l);
  check("1t: cabeçalho 'IMPRESSÃO:'", /\nIMPRESSÃO:\n/.test(l), l);
  check("1t: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:|ANÁLISE:|OPINIÃO:/.test(l), l);
  check("1t: CCN 1 casa decimal '61,5 mm'", /Comprimento cabeça-nádegas \(CCN\): 61,5 mm\./.test(l), l);
  check("1t: TN '1,4 mm'", /Translucência nucal \(TN\): 1,4 mm\./.test(l), l);
  check("1t: osso nasal presente", /Osso nasal presente\./.test(l), l);
  check("1t: ducto venoso normal", /Ducto venoso com onda trifásica/.test(l), l);
  check("1t: impressão morfologia normal", /Morfologia fetal normal para esta fase/.test(l), l);
}

// ── IP médio das uterinas (cálculo reusado) ──
{
  const l = render(F({ trimestre: "1t", ig_semanas: 12, ccn_mm: 61.5, uterina_ip_direita: 1.2, uterina_ip_esquerda: 1.4 }));
  // médio = (1.2+1.4)/2 = 1.3
  check("1t: IP médio uterinas 1,3", /IP médio das artérias uterinas: 1,3\./.test(l), l);
  check("1t: impressão Dopplervelocimetria normal", /Dopplervelocimetria normal das artérias uterinas/.test(l), l);
}

// ── 1º trimestre: ducto venoso alterado ──
{
  const l = render(F({ trimestre: "1t", ducto_venoso: "alterado", osso_nasal: "ausente", ccn_mm: 70.2 }));
  check("1t alt.: 'onda A reversa' nos achados", /Ducto venoso com onda A reversa\./.test(l), l);
  check("1t alt.: impressão Doppler alterado", /Doppler do ducto venoso alterado \(onda A reversa\)/.test(l), l);
  check("1t alt.: osso nasal ausente", /Osso nasal ausente\./.test(l), l);
}

// ── 2º trimestre: biometria 1 casa decimal + binocular presente + colo presente ──
{
  const l = render(
    F({
      trimestre: "2t", ig_semanas: 22, ig_dias: 1, apresentacao: "cefálico", dorso: "esquerda",
      dbp_mm: 52.3, cc_mm: 195.4, cerebelo_mm: 23.1, cisterna_magna_mm: 5.4, binocular_mm: 41.2,
      ca_mm: 175.6, femur_mm: 37.4, peso_g: 480, percentil: 45, genitalia: "feminino",
      placenta_localizacao: "posterior", placenta_grau: "1", ila_cm: 14.2,
    }),
  );
  check("2t: título 'SEGUNDO TRIMESTRE'", /ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE/.test(l), l);
  check("2t: apresentação cefálica (concordância)", /Feto único, em apresentação cefálica, com dorso à esquerda/.test(l), l);
  check("2t: DBP '52,3 mm'", /Diâmetro biparietal \(DBP\): 52,3 mm\./.test(l), l);
  check("2t: distância binocular presente (2t)", /Distância binocular: 41,2 mm\./.test(l), l);
  check("2t: ILA 1 casa decimal '14,2 cm'", /Índice de líquido amniótico \(ILA\): 14,2 cm\./.test(l), l);
  check("2t: placenta grau I (romano)", /grau I/.test(l), l);
  check("2t: orifício interno do colo presente (2t)", /Orifício interno do colo uterino fechado\./.test(l), l);
  check("2t: peso inteiro '480 g'", /Peso fetal estimado: 480 g \(percentil 45\)\./.test(l), l);
  check("2t: genitália feminino", /Genitália externa feminina\./.test(l), l);
  check("2t: placenta ecotextura homogênea (2t)", /com ecotextura homogênea\./.test(l), l);
}

// ── 3º trimestre: SEM distância binocular nem colo; placenta heterogênea ──
{
  const l = render(
    F({
      trimestre: "3t", ig_semanas: 32, apresentacao: "pélvico",
      dbp_mm: 84.1, cc_mm: 305.2, binocular_mm: 40.0, ca_mm: 290.4, femur_mm: 62.1,
      peso_g: 1850, placenta_localizacao: "anterior", placenta_grau: "2", ila_cm: 11.5,
    }),
  );
  check("3t: título 'TERCEIRO TRIMESTRE'", /ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE/.test(l), l);
  check("3t: SEM distância binocular", !/Distância binocular/.test(l), l);
  check("3t: SEM orifício do colo", !/Orifício interno do colo/.test(l), l);
  check("3t: placenta heterogênea (3t)", /ecotextura heterogênea, de acordo com a fase/.test(l), l);
  check("3t: apresentação pélvica", /em apresentação pélvica/.test(l), l);
}

// ── Percentil reproduzido ──
{
  const l = render(F({ trimestre: "2t", peso_g: 480, percentil: 45 }));
  check("percentil: reproduzido (percentil 45)", /percentil 45/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
