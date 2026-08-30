/**
 * Gate dos quatro modelos objetivos pendentes + cervicometria complementar.
 * Rodar: tsx src/server/renderer/__tests__/modelos-pendentes-cervicometria.manual.ts
 */
import { achadoNormalDe } from "../catalog/modeloNormal";
import {
  AbdomenTotalFindingsSchema,
  ABDOMEN_ORGAN_KEYS,
} from "../findingsSchemas/ABDOMEN_TOTAL";
import { renderAbdomenTotalObjetivo } from "../phrases/ABDOMEN_TOTAL";
import {
  renderProstataSuprapubica,
  type ProstataSuprapubicaFindings,
} from "../categories/PROSTATA_SUPRAPUBICA";
import {
  renderCervicometria,
  type CervicometriaFindings,
} from "../categories/CERVICOMETRIA";
import { renderMusculoesqueletico } from "../categories/MUSCULOESQUELETICO";
import {
  ObstetricaFindingsSchema,
  renderObstetrica,
} from "../categories/OBSTETRICA";
import {
  DopplerObstetricoFindingsSchema,
  renderDopplerObstetrico,
} from "../categories/DOPPLER_OBSTETRICO";
import {
  MorfologicoFindingsSchema,
  renderMorfologico,
} from "../categories/MORFOLOGICO";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n${detail}` : ""}`);
  }
}

function objetivoValido(nome: string, laudo: string) {
  check(`${nome}: TÉCNICA`, /\nTÉCNICA:\n/.test(laudo), laudo);
  check(`${nome}: ACHADOS`, /\nACHADOS:\n/.test(laudo), laudo);
  check(`${nome}: IMPRESSÃO`, /\nIMPRESSÃO:\n/.test(laudo), laudo);
  check(
    `${nome}: sem cabeçalhos clássicos`,
    !/\nCOMENTÁRIOS:|\nOS SEGUINTES ASPECTOS|\nCONCLUSÃO:/.test(laudo),
    laudo,
  );
}

const orgaos = Object.fromEntries(
  ABDOMEN_ORGAN_KEYS.map((organ) => [organ, { status: "normal", achados: [] }]),
);
const abdome = AbdomenTotalFindingsSchema.parse({
  orgaos,
  achados_extra_abdominais: [],
  observacoes_do_medico: "",
});
objetivoValido("abdome", renderAbdomenTotalObjetivo(abdome));

const prostata: ProstataSuprapubicaFindings = {
  prostata_d1_cm: 4.2,
  prostata_d2_cm: 3.4,
  prostata_d3_cm: 3.1,
  hiperplasia: false,
  calcificacoes: false,
  ipp_cm: null,
  bexiga_achado: null,
  volume_pre_miccional_ml: null,
  residuo_pos_miccional_ml: null,
  residuo_desprezivel: true,
  achados_adicionais: null,
};
const prostataObj = renderProstataSuprapubica(prostata, null, { objetivo: true });
objetivoValido("próstata", prostataObj);
check("próstata: mantém cálculo no objetivo", /peso aproximado de 24,3 gramas/.test(prostataObj), prostataObj);

const cervico: CervicometriaFindings = {
  colo_oi_oe_cm: 1.8,
  orificio_interno_fechado: true,
  placenta_distancia_cm: null,
  placenta_distante: false,
  ig_semanas: 30,
  cerclagem: false,
  observacoes: null,
};
const cervicoObj = renderCervicometria(cervico, null, { objetivo: true });
objetivoValido("cervicometria", cervicoObj);
check("cervicometria: limiar clínico preservado", /alto risco para trabalho de parto prematuro/.test(cervicoObj), cervicoObj);

const mskObj = renderMusculoesqueletico(
  { laudos: [{ segmento: "ombro", lado: "direito", alteracoes: [] }] },
  null,
  { objetivo: true },
);
objetivoValido("musculoesquelético", mskObj);

const FETO = {
  rotulo: null,
  posicao_relativa: null,
  apresentacao: "cefálica",
  dorso: null,
  polo_cefalico: null,
  bcf_bpm: 145,
  dbp_mm: 70,
  cc_mm: 250,
  ca_mm: 230,
  cf_mm: 50,
  ccn_mm: null,
  peso_g: 1200,
  peso_variacao_g: null,
  percentil: null,
};
const CERVICO_ADDON = {
  colo_oi_oe_cm: 2.2,
  orificio_interno_fechado: true,
  placenta_distancia_cm: 4.0,
  placenta_distante: false,
  cerclagem: true,
  observacoes: null,
};

const obstetrica = ObstetricaFindingsSchema.parse({
  ...(achadoNormalDe(ObstetricaFindingsSchema) as Record<string, unknown>),
  numero_fetos: 1,
  gestacao_inicial: false,
  fetos: [FETO],
  ig_semanas: 33,
  itens_conclusao_livres: [],
  observacoes_corpo_livres: [],
  cervicometria: CERVICO_ADDON,
});
for (const objetivo of [false, true]) {
  const l = renderObstetrica(obstetrica, null, { objetivo, flexivel: true });
  check(`obstétrica ${objetivo ? "objetiva" : "clássica"}: técnica transvaginal`, /via transvaginal/.test(l), l);
  check(`obstétrica ${objetivo ? "objetiva" : "clássica"}: bloco no corpo`, /CERVICOMETRIA:\nDistância do orifício interno/.test(l), l);
  check(`obstétrica ${objetivo ? "objetiva" : "clássica"}: cerclagem na conclusão`, /Pontos de cerclagem uterina em topografia habitual/.test(l), l);
  check(`obstétrica ${objetivo ? "objetiva" : "clássica"}: cervicometria fecha conclusão`, /Não há sinais de placenta prévia\.$/.test(l), l);
}

const doppler = DopplerObstetricoFindingsSchema.parse({
  ...(achadoNormalDe(DopplerObstetricoFindingsSchema) as Record<string, unknown>),
  ig_semanas: 30,
  itens_conclusao_livres: [],
  observacoes_adicionais: null,
  cervicometria: CERVICO_ADDON,
});
const dopplerClassico = renderDopplerObstetrico(doppler);
check("Doppler obstétrico: técnica transvaginal", /via transvaginal/.test(dopplerClassico), dopplerClassico);
check("Doppler obstétrico: cervicometria no fim da conclusão", /Pontos de cerclagem uterina em topografia habitual\.$/.test(dopplerClassico), dopplerClassico);

const morfologico = MorfologicoFindingsSchema.parse({
  ...(achadoNormalDe(MorfologicoFindingsSchema) as Record<string, unknown>),
  trimestre: "2t",
  ig_semanas: 22,
  itens_conclusao_livres: [],
  cervicometria: CERVICO_ADDON,
});
for (const objetivo of [false, true]) {
  const l = renderMorfologico(morfologico, null, { objetivo });
  check(`morfológico ${objetivo ? "objetivo" : "clássico"}: técnica transvaginal`, /via transvaginal/.test(l), l);
  check(`morfológico ${objetivo ? "objetivo" : "clássico"}: OI sem duplicação`, (l.match(/Orifício interno do colo uterino fechado/g) ?? []).length === 1, l);
  check(`morfológico ${objetivo ? "objetivo" : "clássico"}: cervicometria fecha conclusão`, /Pontos de cerclagem uterina em topografia habitual\.$/.test(l), l);
}

const semMedida = renderCervicometria({ ...cervico, colo_oi_oe_cm: null }, null, { objetivo: true });
check("hard stop: sem medida nunca conclui normal", /\[REVISAR\]/.test(semMedida) && !/ecograficamente normal/.test(semMedida), semMedida);

console.log(`\n${pass} passaram; ${fail} falharam.`);
if (fail > 0) process.exit(1);
