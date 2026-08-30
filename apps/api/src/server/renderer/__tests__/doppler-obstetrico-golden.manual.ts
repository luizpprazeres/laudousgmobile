/** Golden do Doppler isolado + composição em Obstétrica/Morfológico. */
import { achadoNormalDe } from "../catalog/modeloNormal";
import {
  DopplerObstetricoFindingsSchema,
  renderDopplerObstetrico,
} from "../categories/DOPPLER_OBSTETRICO";
import {
  ObstetricaFindingsSchema,
  renderObstetrica,
} from "../categories/OBSTETRICA";
import {
  MorfologicoFindingsSchema,
  renderMorfologico,
} from "../categories/MORFOLOGICO";
import type { DopplerObstetricoModule } from "../categories/dopplerObstetricoModule";
import { adaptarDopplerObstetrico, dopplerDaTela } from "../../../../../web/src/lib/catalog/dopplerParaCatalogo";

let pass = 0;
let fail = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n${detail}` : ""}`);
  }
}

const DOPPLER_VAZIO: DopplerObstetricoModule = {
  ir_uterina_dir: null, ip_uterina_dir: null,
  ir_uterina_esq: null, ip_uterina_esq: null,
  ip_medio_uterinas: null, perc_medio_uterinas: null,
  ir_umbilical: null, ip_umbilical: null, perc_umbilical: null,
  ir_acm: null, ip_acm: null, perc_acm: null,
  ir_ducto_venoso: null, ip_ducto_venoso: null,
  ducto_venoso_qualitativo: null, rcp: null, perfil_hemodinamico: null,
  umbilical_alterado: null, acm_alterado: null,
  incisura: null, ectasia: null, pre_centralizacao: null,
  centralizacao: null, uterinas_acima_p95: null,
};

const DOPPLER_NORMAL: DopplerObstetricoModule = {
  ...DOPPLER_VAZIO,
  ir_uterina_dir: 0.59, ip_uterina_dir: 0.59,
  ir_uterina_esq: 0.59, ip_uterina_esq: 0.59,
  ir_umbilical: 0.58, ip_umbilical: 1.0,
  ir_acm: 0.81, ip_acm: 1.8,
  ir_ducto_venoso: 0.4, ip_ducto_venoso: 1.89,
  perfil_hemodinamico: 0.8,
  umbilical_alterado: false, acm_alterado: false,
  incisura: false, pre_centralizacao: false, centralizacao: false,
};

const ISOLADO = (doppler: DopplerObstetricoModule) =>
  DopplerObstetricoFindingsSchema.parse({
    ...doppler,
    observacoes_adicionais: null,
    itens_conclusao_livres: [],
    ig_semanas: null,
    cervicometria: null,
  });

{
  const laudo = renderDopplerObstetrico(ISOLADO(DOPPLER_NORMAL));
  check("isolado: título puro", laudo.startsWith("DOPPLERVELOCIMETRIA OBSTÉTRICA"), laudo);
  check("isolado: não carrega biometria", !/DBP|placenta|líquido amniótico|BCF/.test(laudo), laudo);
  check("isolado: IR e IP por vaso", /Artéria umbilical com índice de resistividade de 0,58 e índice de pulsatilidade de 1\./.test(laudo), laudo);
  check("isolado: conclusão IR e IP", /Índices de resistividade e de pulsatilidade normais nas artérias uterinas, umbilical e artéria cerebral média\./.test(laudo), laudo);
  check("isolado: quatro conclusões normais", /4\) Perfil hemodinâmico fetal é normal, menor de 1\.0\.$/.test(laudo), laudo);
}

{
  const laudo = renderDopplerObstetrico(ISOLADO(DOPPLER_NORMAL), null, { objetivo: true });
  check("objetivo: três seções", /TÉCNICA:\n[\s\S]+ACHADOS:\n[\s\S]+IMPRESSÃO:/.test(laudo), laudo);
  check("objetivo: sem estrutura clássica", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(laudo), laudo);
}

{
  const parcial = ISOLADO({ ...DOPPLER_VAZIO, ir_uterina_dir: 0.59 });
  const laudo = renderDopplerObstetrico(parcial);
  check("parcial: preserva IR isolado", /Artéria uterina direita com índice de resistividade de 0,59\./.test(laudo), laudo);
  check("parcial: não inventa IP nem lacuna", !/____|índice de pulsatilidade de/.test(laudo), laudo);
}

{
  const indicesDesencontrados = ISOLADO({
    ...DOPPLER_VAZIO,
    ir_uterina_dir: 0.59,
    ip_umbilical: 1.0,
  });
  const laudo = renderDopplerObstetrico(indicesDesencontrados);
  check(
    "parcial: IR de outro vaso não vira normalidade da umbilical",
    !/resistividade e de pulsatilidade normais na artéria umbilical/i.test(laudo),
    laudo,
  );
}

{
  const laudo = renderDopplerObstetrico(ISOLADO(DOPPLER_VAZIO));
  check("sem dados: hard stop", /Dados Doppler insuficientes para conclusão hemodinâmica\./.test(laudo), laudo);
  check("sem dados: não afirma normalidade", !/normais nas artérias|perfil hemodinâmico fetal é normal/i.test(laudo), laudo);
}

{
  const alterado = ISOLADO({
    ...DOPPLER_NORMAL,
    ip_umbilical: 2.1,
    umbilical_alterado: null,
    incisura: true,
    centralizacao: true,
    pre_centralizacao: false,
    perfil_hemodinamico: 1.2,
  });
  const laudo = renderDopplerObstetrico(alterado, null, { umbilicalSafety: true });
  check("alterado: umbilical alta não vira normal", /Índice de pulsatilidade elevado na artéria umbilical\./.test(laudo), laudo);
  check("alterado: incisura", /Presença de incisura protodiastólica/.test(laudo), laudo);
  check("alterado: centralização", /brain sparing/.test(laudo), laudo);
  check("alterado: perfil", /Perfil hemodinâmico fetal alterado, maior de 1\.0\./.test(laudo), laudo);
}

const FETO = {
  rotulo: null, posicao_relativa: null, apresentacao: "cefálica", dorso: null,
  polo_cefalico: null, bcf_bpm: 145, dbp_mm: 70, cc_mm: 250, ca_mm: 230,
  cf_mm: 50, ccn_mm: null, peso_g: 1200, peso_variacao_g: null, percentil: null,
};
const CERVICO = {
  colo_oi_oe_cm: 3.4, orificio_interno_fechado: true,
  placenta_distancia_cm: null, placenta_distante: true,
  cerclagem: false, observacoes: null,
};

const obstBase = ObstetricaFindingsSchema.parse({
  ...(achadoNormalDe(ObstetricaFindingsSchema) as Record<string, unknown>),
  numero_fetos: 1,
  gestacao_inicial: false,
  fetos: [FETO],
  ig_semanas: 30,
  itens_conclusao_livres: [],
  observacoes_corpo_livres: [],
  cervicometria: null,
  doppler: null,
});
{
  const ausente = renderObstetrica(obstBase);
  const nulo = renderObstetrica({ ...obstBase, doppler: null });
  check("obstétrica sem Doppler: byte-idêntica", ausente === nulo);
  const composto = renderObstetrica({ ...obstBase, cervicometria: CERVICO, doppler: DOPPLER_NORMAL });
  check("obstétrica composta: título", /^ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO/.test(composto), composto);
  check("obstétrica composta: cervix antes de Doppler", composto.indexOf("CERVICOMETRIA:") < composto.indexOf("DOPPLERVELOCIMETRIA:"), composto);
  check("obstétrica composta: Doppler fecha conclusão", /Perfil hemodinâmico fetal é normal, menor de 1\.0\.$/.test(composto), composto);
}

const morfoBase = MorfologicoFindingsSchema.parse({
  ...(achadoNormalDe(MorfologicoFindingsSchema) as Record<string, unknown>),
  trimestre: "2t",
  ig_semanas: 22,
  itens_conclusao_livres: [],
  cervicometria: null,
  doppler: null,
});
{
  const composto = renderMorfologico({ ...morfoBase, cervicometria: CERVICO, doppler: DOPPLER_NORMAL });
  check("morfológico composto: título", /^ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE COM DOPPLER COLORIDO/.test(composto), composto);
  check("morfológico composto: cervix e Doppler coexistem", /CERVICOMETRIA:[\s\S]+DOPPLERVELOCIMETRIA:/.test(composto), composto);
  check("morfológico composto: conclusão Doppler ao final", /Perfil hemodinâmico fetal é normal, menor de 1\.0\.$/.test(composto), composto);
}

{
  const secao = {
    realizado: "sim",
    "realizado.sim.ir_umb": "0,58",
    "realizado.sim.ip_umb": "1,02",
    "realizado.sim.ir_acm": "0,81",
    "realizado.sim.ip_acm": "1,48",
    "realizado.sim.incisura": "ausente",
    "realizado.sim.centralizacao": "ausente",
    "realizado.sim.umbilical": "normal",
    "realizado.sim.acm": "normal",
  };
  const adaptado = dopplerDaTela({ doppler: secao });
  check("web add-on: ativa sem trocar categoria", adaptado?.ir_umbilical === 0.58 && adaptado?.ip_acm === 1.48, JSON.stringify(adaptado));
  check("web add-on: desligado vira null", dopplerDaTela({ doppler: { ...secao, realizado: "nao" } }) === null);

  const isolado = adaptarDopplerObstetrico({
    doppler: { ir_umb: "0,58", ip_umb: "1,02", ir_acm: "0,81", ip_acm: "1,48" },
  });
  const parsed = DopplerObstetricoFindingsSchema.parse(isolado.dados);
  check("web isolado: usa o mesmo schema canônico", parsed.ir_umbilical === 0.58 && parsed.ip_acm === 1.48);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
