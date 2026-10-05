// Prova sintética 05/10/2026 — DOPPLER_ARTERIAS_TEMPORAIS (MVP Web estruturado → renderer compartilhado). Rodar a partir de apps/api: npx tsx <este arquivo> [OBJETIVO]
import { dopplerArteriasTemporais } from "../../../../../apps/web/src/lib/deterministic/organs/dopplerArteriasTemporais";
import { initialExamState } from "../../../../../apps/web/src/lib/deterministic/compose";
import { adaptarDopplerArteriasTemporais } from "../../../../../apps/web/src/lib/catalog/dopplerArteriasTemporaisParaCatalogo";
import { renderDopplerArteriasTemporaisWeb } from "../../../../../apps/api/src/server/renderer/categories/dopplerArterialFistulaWeb";
type E = Record<string, any>;
const estilo = process.argv[2] === "OBJETIVO" ? "OBJETIVO" : "CLASSICO_COMPLETO";
const base = (model?: string, laterality?: string): E => {
  const s: E = initialExamState(dopplerArteriasTemporais as any);
  if (model || laterality) s.__opts = { ...s.__opts, ...(model ? { model } : {}), ...(laterality ? { laterality } : {}) };
  return s;
};
const com = (e: E, sec: string, p: E) => ({ ...e, [sec]: { ...e[sec], ...p } });
const last: Record<string, string> = {};
function run(nome: string, e: E) {
  const a = adaptarDopplerArteriasTemporais(e as any);
  const r: any = renderDopplerArteriasTemporaisWeb(a.dados, estilo);
  console.log("\n######", nome, "|", estilo, "| opts:", JSON.stringify(e.__opts));
  console.log("pendências:", JSON.stringify(a.pendencias.map((p: any) => `${p.onde}: ${p.valor}${p.bloqueia ? " [bloqueia]" : ""}`)));
  console.log(r.ok ? r.text : "RENDER RECUSADO: " + JSON.stringify(r.issues?.map((i: any) => i.path + " " + i.message)));
  last[nome] = r.ok ? r.text : "";
}
const halo = (e: E) => com(e, "right_frontal", { halo: "present" });
run("T1 estado inicial (modelo padrão do formulário)", base());
run("T1b modelo 'normal' escolhido, nada mais", base("normal"));
run("T2 normal + halo presente no ramo frontal D, sem espessura/compressão/confirmação", halo(base("normal")));
run("T2b T2 + hipótese 'Incluir' sem confirmação", com(halo(base("normal")), "context", { hypothesis: "include" }));
run("T2c T2 + hipótese incluída e confirmada (sem 2º marcador)", com(halo(base("normal")), "context", { hypothesis: "include", hypothesis_confirmed: "yes" }));
run("T2d halo + espessura 0,9 mm + compressão positiva + hipótese confirmada", com(com(halo(base("normal")), "right_frontal", { wall_mm: "0,9", compression: "positive" }), "context", { hypothesis: "include", hypothesis_confirmed: "yes" }));
const semEsq = (e: E) => ["common_trunk", "frontal", "parietal"].reduce((acc, b) => com(acc, `left_${b}`, { assessment: "not_assessed" }), e);
run("T3a bilateral normal, lado E inteiro 'Não avaliado'", semEsq(base("normal")));
run("T3b lateralidade 'Direita' (lado E fora do exame)", base("normal", "right"));
run("T3c bilateral normal, E só frontal avaliado (tronco e parietal não avaliados)", com(com(base("normal"), "left_common_trunk", { assessment: "not_assessed" }), "left_parietal", { assessment: "not_assessed" }));
run("T3d lateralidade 'Direita' depois de preencher halo no frontal E (seção oculta)", com(base("normal", "right"), "left_frontal", { halo: "present" }));
run("T3e ramo parietal E limitado sem descrição", com(base("normal"), "left_parietal", { assessment: "limited" }));
// Remoção: aplica halo e volta para 'Conforme modelo'
run("T4 remoção: halo volta para 'Conforme modelo'", com(halo(base("normal")), "right_frontal", { halo: "model" }));
console.log("\nT4 idêntico ao T1b?", last["T4 remoção: halo volta para 'Conforme modelo'"] === last["T1b modelo 'normal' escolhido, nada mais"]);
run("T5a espessura 6 mm (provável cm/mm) no frontal D", com(base("normal"), "right_frontal", { wall_mm: "6" }));
run("T5b fluxo não detectado + VPS 40 no parietal E", com(base("normal"), "left_parietal", { flow: "not_detected", psv_cms: "40" }));
run("T5c halo 'Indeterminado' no tronco D", com(base("normal"), "right_common_trunk", { halo: "indeterminate" }));
run("T5d corticoide sim 14 dias, sem achados", com(base("normal"), "context", { corticosteroid: "yes", corticosteroid_days: "14" }));
run("T6 halo + espessura 0,2 mm (sem compressão) + hipótese confirmada", com(com(halo(base("normal")), "right_frontal", { wall_mm: "0,2" }), "context", { hypothesis: "include", hypothesis_confirmed: "yes" }));
run("T6b ramo limitado com halo + espessura + hipótese confirmada", com(com(base("normal"), "left_parietal", { assessment: "limited", limitation: "trajeto tortuoso", halo: "present", wall_mm: "0,7" }), "context", { hypothesis: "include", hypothesis_confirmed: "yes" }));
run("T7 modelo normal, parietal E marcado 'Avaliação limitada' só com a descrição", com(base("normal"), "left_parietal", { assessment: "limited", limitation: "cabelo espesso e trajeto tortuoso" }));
