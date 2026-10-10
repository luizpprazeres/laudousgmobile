/**
 * W15 — golden da técnica (COMENTÁRIOS) nos renderers da família obstétrica, por via.
 * Rodar (de apps/api): pnpm exec tsx src/server/renderer/__tests__/w15-tecnica-golden.manual.ts
 */
import { COMPLEMENTO_CERVICOMETRIA, COMPLEMENTO_DOPPLER_FETAL, comentariosPadrao, fraseTecnica } from "@laudousg/schemes";
import { buildObstetricaDoc } from "../catalog/OBSTETRICA.render";
import { serialize } from "../catalog/engine";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { EMPTY_FETO, renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";

let ok = 0, fail = 0;
function t(nome: string, cond: boolean, extra = "") {
  if (cond) { console.log(`  ✓ ${nome}`); ok++; }
  else { console.log(`  ✗ ${nome}${extra ? `\n      ${extra}` : ""}`); fail++; }
}

function base(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
    fetos: [{ ...EMPTY_FETO, bcf_bpm: 140, apresentacao: "cefalica" }],
    ig_semanas: 24, ig_dias: 2, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null,
    placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], observacoes_corpo_livres: [],
    ...over,
  } as ObstetricaFindings;
}
const catalogo = (f: ObstetricaFindings) => serialize(buildObstetricaDoc({ findings: f }).doc, OBSTETRICA_CLASSICO);
const sec = (txt: string) => /COMENTÁRIOS:\n([\s\S]*?)\n\n/.exec(txt)?.[1] ?? "";

console.log("\nTabela única (frases dos finais + decisões do Luiz)\n");
t("obstétrica TA (padrão)", fraseTecnica("OBSTETRICA") === "Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante.");
t("obstétrica TV: 'com a finalidade de realizar a técnica transvaginal'", fraseTecnica("OBSTETRICA", "tv") === "Exame realizado com transdutor de 6.5 MHz, com a finalidade de realizar a técnica transvaginal.");
t("obstétrica TA+TV = texto da pelve", fraseTecnica("OBSTETRICA", "ta_tv") === fraseTecnica("PELVE_FEMININA", "ta_tv"));
t("pelve sem via = TA+TV", fraseTecnica("PELVE_FEMININA") === fraseTecnica("PELVE_FEMININA", "ta_tv"));
t("cervicometria complementar = frase do Luiz", COMPLEMENTO_CERVICOMETRIA === "Foi realizada avaliação complementar do colo uterino pela via transvaginal.");
t("documentação 'que possuem' e sem fotos em todas", ["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO", "PELVE_FEMININA", "CERVICOMETRIA", "ABDOMEN_TOTAL", "ABDOMEN_SUPERIOR", "VIAS_URINARIAS", "PROSTATA_SUPRAPUBICA", "TIREOIDE", "MAMARIA", "ESCROTAL", "CERVICAL", "PAREDE_ABDOMINAL", "MUSCULOESQUELETICO_V2"]
  .every((c) => /que possuem várias metodologias\./.test(comentariosPadrao(c)!) && !/fotos|possui /.test(comentariosPadrao(c)!)));
t("MSK: 12 MHz + avaliação dinâmica", /alta frequência 12 MHz\..*Avaliação dinâmica quando aplicável\./.test(comentariosPadrao("MUSCULOESQUELETICO_V2")!));
t("parede: linear + Valsalva", fraseTecnica("PAREDE_ABDOMINAL") === "Exame realizado com transdutor linear de alta frequência, com avaliação dinâmica da parede abdominal e manobra de Valsalva.");
t("próstata: a frase longa (rodada 2)", /pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal\. Foram realizados múltiplos cortes/.test(fraseTecnica("PROSTATA_SUPRAPUBICA")!));
t("escrotal: ortostase e Valsalva depois da documentação", /metodologias\. Exame realizado com o paciente em ortostase e com manobra de Valsalva\.$/.test(comentariosPadrao("ESCROTAL")!));

console.log("\nObstétrica — catálogo e renderer, via extraída\n");
{
  const ta = catalogo(base());
  t("catálogo sem via = TA", sec(ta) === comentariosPadrao("OBSTETRICA"), sec(ta));
  const tv = catalogo(base({ via_exame: "transvaginal" }));
  t("catálogo via transvaginal = frase TV", sec(tv) === comentariosPadrao("OBSTETRICA", { via: "tv" }), sec(tv));
  t("catálogo TV: título não muda", /^ULTRASSONOGRAFIA OBSTÉTRICA\n/.test(tv));
  const ab = catalogo(base({ via_exame: "abdominal" }));
  t("catálogo via abdominal = TA", sec(ab) === comentariosPadrao("OBSTETRICA"));
  const r = renderObstetrica(base({ via_exame: "transvaginal" }));
  t("renderer (não catálogo) via transvaginal = TV", /COMENTÁRIOS:\nExame realizado com transdutor de 6\.5 MHz, com a finalidade de realizar a técnica transvaginal\. A documentação/.test(r), r.slice(0, 300));
  const per = catalogo(base({ via_exame: "transvaginal" }));
  t("TV com documentação da casa", per.includes(`com a finalidade de realizar a técnica transvaginal. ${"A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias."}`));
}

console.log("\nGestação inicial (embrião não visualizado)\n");
{
  const inicial = (via: ObstetricaFindings["via_exame"]) => catalogo(base({
    gestacao_inicial: true, embriao_visualizado: false, ig_semanas: null, ig_dias: null,
    fetos: [{ ...EMPTY_FETO }], saco_gestacional_mm: 12, via_exame: via,
  } as Partial<ObstetricaFindings>));
  const sem = inicial(null);
  t("sem via ditada = TA (antes: sem COMENTÁRIOS)", sec(sem) === comentariosPadrao("OBSTETRICA"), sem.slice(0, 300));
  const tv = inicial("transvaginal");
  t("transvaginal = frase TV da casa (antes: 'Exame realizado pela via transvaginal.')", sec(tv) === comentariosPadrao("OBSTETRICA", { via: "tv" }) && !/pela via transvaginal\./.test(tv), tv.slice(0, 300));
}

console.log("\nComplementos no parágrafo\n");
t("Doppler e cervicometria antes da documentação", comentariosPadrao("DOPPLER_OBSTETRICO", { complementos: [COMPLEMENTO_DOPPLER_FETAL, COMPLEMENTO_CERVICOMETRIA] })!
  .includes(`abdome da gestante. ${COMPLEMENTO_DOPPLER_FETAL} ${COMPLEMENTO_CERVICOMETRIA} A documentação`));

console.log(`\n${ok} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
