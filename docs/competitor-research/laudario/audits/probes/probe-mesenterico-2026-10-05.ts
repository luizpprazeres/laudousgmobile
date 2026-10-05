// Probe sintético — DOPPLER_MESENTERICO (MVP Web, composição local) + roteamento do ditado.
import { composeReport, initialExamState } from "../../../../../apps/web/src/lib/deterministic";
import { dopplerMesenterico } from "../../../../../apps/web/src/lib/deterministic/organs/dopplerMesenterico";
import { pendenciasLocais } from "../../../../../apps/web/src/lib/deterministic/organs/pendenciasLocais";
import { normalizeCategoryCode } from "../../../../../apps/api/src/server/pipeline/categoryNormalization";
import { CATEGORIES_SEED } from "../../../../../packages/db/src/seeds/data";

type S = Record<string, any>;
function run(nome: string, st: S) {
  const r = composeReport(dopplerMesenterico, st as never);
  console.log("\n######", nome);
  console.log("pendências (compositor):", JSON.stringify(r.pendencias));
  console.log("pendências (exame):", JSON.stringify(pendenciasLocais("DOPPLER_MESENTERICO", st as never)));
  console.log(r.text || "(sem texto — bloqueado)");
}
const inicial = (): S => initialExamState(dopplerMesenterico) as S;
const normal = (): S => { const s = inicial(); s.__opts = { ...s.__opts, model: "normal", jejum: "confirmado" }; return s; };

// M1 — estado inicial intocado (modelo em branco, jejum não informado)
run("M1 estado inicial", inicial());
// M1b — em branco, só o jejum confirmado (nenhum vaso avaliado)
{ const s = inicial(); s.__opts.jejum = "confirmado"; run("M1b em branco + jejum confirmado", s); }
// M1c — modelo normal + jejum confirmado
run("M1c modelo normal", normal());
// M2 — estenose de AMS, VPS 320 cm/s sintética, sem confirmação; aorta 95
const m2 = normal();
Object.assign(m2.ams, { alteration: "stenosis", "alteration.stenosis.lesion_psv_cms": "320" });
m2.aorta.psv_cms = "95";
run("M2 AMS VPS 320 sem confirmação", m2);
// M2b — mesma lesão com fase pós-prandial pedida (há campo pós-prandial?)
{ const s = JSON.parse(JSON.stringify(m2)); s.__opts.fase = "jejum_pos_prandial"; run("M2b fase jejum+pós-prandial", s); }
// M3 — AMI não visualizada por gases (limitada) + jejum não confirmado
const m3 = normal();
m3.__opts.jejum = "nao_confirmado";
Object.assign(m3.ami, { assessment: "limited", limitation: "interposição gasosa" });
run("M3 AMI limitada por gases, jejum não confirmado", m3);
// M3b — AMI limitada SEM motivo + AMS não avaliada com VPS preenchida
{ const s = normal(); s.ami.assessment = "limited"; s.ams.assessment = "not_assessed"; s.ams.psv_cms = "130"; run("M3b limitada sem motivo + dado em vaso não avaliado", s); }
// M4 — remoção: aplica estenose e depois desfaz (alteration=none), sobrando os subcampos
const m4 = JSON.parse(JSON.stringify(m2));
m4.ams.alteration = "none";
run("M4 remoção (alteration=none, subcampos ficam)", m4);
// M5 — contradição: estenose confirmada com VPS da lesão menor que a VPS basal do próprio vaso
{ const s = normal(); Object.assign(s.ams, { psv_cms: "250", alteration: "stenosis", "alteration.stenosis.lesion_psv_cms": "90", "alteration.stenosis.confirmed": "yes" }); run("M5 estenose confirmada com VPS lesão < basal", s); }
// M6 — unidade: VPS em m/s
{ const s = normal(); s.ams.psv_cms = "1,4 m/s"; run("M6 VPS em m/s", s); }

// M3c — AMI "não visualizada": não avaliada com o motivo escrito (há como registrar o motivo?)
{ const s = normal(); s.ami.assessment = "not_assessed"; s.ami.limitation = "interposição gasosa"; run("M3c AMI não avaliada com motivo", s); }
// M6b — VPS sem unidade em escala de m/s (1,4): aceita como cm/s?
{ const s = normal(); s.ams.psv_cms = "1,4"; run("M6b VPS 1,4 sem unidade", s); }

// Roteamento do ditado (API) — códigos conhecidos = seed versionado
const known = new Set(CATEGORIES_SEED.map((c) => c.code));
console.log("\n###### Roteamento API");
console.log("DOPPLER_MESENTERICO no seed?", known.has("DOPPLER_MESENTERICO"));
const raw = "Doppler das artérias mesentéricas: tronco celíaco pérvio, AMS com VPS de 320 cm/s.";
for (const det of ["DOPPLER_MESENTERICO", "DOPPLER_ABDOMINAL_MESENTERICO", "DOPPLER_ARTERIAS_MESENTERICAS", "ABDOMEN_DOPPLER"]) {
  console.log(det, "→", JSON.stringify(normalizeCategoryCode(det, known, raw)), "| hint ABDOMEN_TOTAL →", JSON.stringify(normalizeCategoryCode(det, known, raw, "ABDOMEN_TOTAL")));
}
