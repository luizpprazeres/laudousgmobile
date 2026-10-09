/**
 * Percentis Barcelona completados no renderer (completarPercentisBarcelona).
 *
 * Caso real 1304da57: IPs ditados (AU 0,71 · ACM 1,32 · uterinas 0,95/0,94) e a
 * linha "→ Percentis" do app calculada com o IR. O extrator que não copia essa
 * linha deixava os percentis nulos e a conclusão perdia a frase de normalidade.
 *
 * Rodar: pnpm exec tsx src/server/renderer/__tests__/doppler-percentis-barcelona.manual.ts
 */
import { calcularDopplerParcial } from "@laudousg/shared";
import {
  completarPercentisBarcelona,
  renderDopplerModule,
  type DopplerObstetricoModule,
} from "../categories/dopplerObstetricoModule";

let ok = 0;
let falhas = 0;
const ck = (cond: boolean, nome: string) => {
  cond ? ok++ : falhas++;
  console.log(`${cond ? "✓" : "✗"} ${nome}`);
};

const vazio: DopplerObstetricoModule = {
  ir_uterina_dir: null, ip_uterina_dir: null, ir_uterina_esq: null, ip_uterina_esq: null,
  ip_medio_uterinas: null, perc_medio_uterinas: null,
  ir_umbilical: null, ip_umbilical: null, perc_umbilical: null, fluxo_diastolico_umbilical: null,
  ir_acm: null, ip_acm: null, perc_acm: null,
  ir_ducto_venoso: null, ip_ducto_venoso: null, perc_ducto_venoso: null, ducto_venoso_qualitativo: null,
  rcp: null, perc_rcp: null, perfil_hemodinamico: null,
  umbilical_alterado: null, acm_alterado: null, incisura: null, ectasia: null,
  pre_centralizacao: null, centralizacao: null, uterinas_acima_p95: null,
} as DopplerObstetricoModule;

const caso1304: DopplerObstetricoModule = {
  ...vazio,
  ir_uterina_dir: 0.61, ip_uterina_dir: 0.95, ir_uterina_esq: 0.59, ip_uterina_esq: 0.94,
  ir_umbilical: 0.5, ip_umbilical: 0.71, ir_acm: 0.73, ip_acm: 1.32,
};
const ig = { semanas: 36, dias: 4 };
const esperado = calcularDopplerParcial({
  weeks: 36, days: 4, ipUmbilical: 0.71, ipMCA: 1.32, ipUterinaDireita: 0.95, ipUterinaEsquerda: 0.94,
});

// 1. Completa os percentis com o mesmo motor dos apps.
const c = completarPercentisBarcelona(caso1304, ig);
ck(c.perc_umbilical === esperado.arteriaUmbilical?.percentile, `umbilical: P${c.perc_umbilical} = motor compartilhado`);
ck(c.perc_acm === esperado.arteriaCerebralMedia?.percentile, `ACM: P${c.perc_acm} = motor compartilhado`);
ck(c.perc_medio_uterinas === esperado.arteriasUterinas?.percentile && c.ip_medio_uterinas === esperado.arteriasUterinas?.ipMedio,
  `uterinas: IP médio ${c.ip_medio_uterinas} P${c.perc_medio_uterinas}`);

// 2. A conclusão volta a afirmar a normalidade (o defeito do 1304da57).
const r = renderDopplerModule(caso1304, { indices: "ip", ig });
ck(r.conclusao.some((i) => /pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média/.test(i)),
  "conclusão: “Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.”");
ck(r.achados.some((l) => /Calculadora v2021/.test(l)), "achados: linha de referência Barcelona presente");

// 3. Sem IG nada muda (comportamento anterior: sem percentil, sem afirmar normalidade).
const semIg = renderDopplerModule(caso1304, { indices: "ip" });
ck(!semIg.conclusao.some((i) => /pulsatilidade normal/.test(i)), "sem IG: não afirma normalidade");
ck(completarPercentisBarcelona(caso1304, { semanas: null, dias: null }) === caso1304, "IG nula: módulo intocado");

// 4. Percentil ditado nunca é sobrescrito.
const ditado = completarPercentisBarcelona({ ...caso1304, perc_umbilical: 42, perc_acm: 3 }, ig);
ck(ditado.perc_umbilical === 42 && ditado.perc_acm === 3, "percentis ditados preservados (42 e 3)");

// 5. Fora da faixa do motor (umbilical/ACM só a partir de 20 s): só uterinas.
const precoce = completarPercentisBarcelona(caso1304, { semanas: 14, dias: 0 });
ck(precoce.perc_umbilical === null && precoce.perc_acm === null && precoce.perc_medio_uterinas !== null,
  "14 semanas: umbilical/ACM sem percentil, uterinas com percentil");

// 6. Patológico continua patológico: IP umbilical alto vira percentil > 95 e não sai "normal".
const alto = renderDopplerModule({ ...caso1304, ip_umbilical: 1.6 }, { indices: "ip", ig });
ck(!alto.conclusao.some((i) => /pulsatilidade normal nas artérias uterinas, umbilical/.test(i)),
  "IP umbilical 1,6: a frase de normalidade completa não aparece");

console.log(`\n${ok} passaram, ${falhas} falharam`);
if (falhas) process.exit(1);
