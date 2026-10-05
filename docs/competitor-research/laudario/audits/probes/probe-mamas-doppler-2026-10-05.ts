import { mamaria } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarMamaria } from "../../../../../apps/web/src/lib/catalog/mamariaParaCatalogo";
import { sugestoesBiradsMamaria } from "../../../../../apps/web/src/lib/calculators/mamariaBiradsSugestao";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { biradsRevisarNotes } from "../../../../../apps/api/src/server/renderer/categories/MAMARIA";
type E = Record<string, any>;
const base = (escopo: string, doppler: "sim" | "nao"): E => {
  const st: E = { __opts: { escopo_exame: escopo, doppler_mamario: doppler } };
  for (const s of mamaria.resolveSections!({ escopo_exame: escopo } as never)) if (s.module) st[s.id] = s.module.initialState();
  return st;
};
// Achado com id, como o MamariaFormPanel grava (achados.<id>.<campo>).
const comAchado = (e: E, id: string, campos: E): E => {
  const m = { ...e.mamas, achados_ids: [...(e.mamas.achados_ids ?? []), id] };
  for (const [k, v] of Object.entries(campos)) m[`achados.${id}.${k}`] = v;
  return { ...e, mamas: m };
};
function run(nome: string, e: E, estilo = "CLASSICO_COMPLETO") {
  const a = adaptarMamaria(e);
  const d = a.dados as E;
  const r: any = renderizarSelecao("MAMARIA", estilo as never, [], d as never);
  const sug = sugestoesBiradsMamaria(e.mamas ?? {}).map((s) => `${s.lado}/${s.tipo}: ${s.status} ${s.categoria ?? ""} (definida ${s.definida ?? "-"})`);
  console.log("\n######", nome, `[${estilo}]`, "| pendências:", JSON.stringify(a.pendencias), "| doppler_realizado:", d.doppler_realizado,
    "| vasc no contrato:", JSON.stringify((d.achados as E[]).map((x) => x.vascularizacao ?? null)), "| sugestão:", JSON.stringify(sug), "| guard:", JSON.stringify(biradsRevisarNotes(d as never)));
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
const NOD = { tipo: "nodulo", lado: "direita", eco: "hipoecoico", forma: "oval", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma", medidas: "1,4 x 1,0 x 0,8", horario: "10 horas", local: "quadrante superolateral" };

// D0 — Doppler ligado, nada mais
run("D0 Doppler 'Sim', mamas e axilas, sem achados", base("mamas_axilas", "sim"));
// D1 — nódulo com vascularização interna à direita, BI-RADS 3 confirmado pelo médico
const d1 = comAchado(base("mamas_axilas", "sim"), "n1", { ...NOD, vascularizacao: "interna", birads: "3" });
run("D1 nódulo oval circunscrito paralelo, vasc. INTERNA, BI-RADS 3 confirmado", d1);
run("D1 objetivo", d1, "OBJETIVO");
// D1b — mesmo nódulo sem BI-RADS confirmado
run("D1b mesmo nódulo com vasc. interna, sem BI-RADS confirmado", comAchado(base("mamas_axilas", "sim"), "n1", { ...NOD, vascularizacao: "interna" }));
// D2 — Doppler 'Não' mas vascularização gravada (toggle desligado depois)
run("D2 Doppler 'Não' com vascularização interna ainda no estado", comAchado(base("mamas_axilas", "nao"), "n1", { ...NOD, vascularizacao: "interna", birads: "3" }));
// D3 — Doppler 'Sim', nódulo sem vascularização preenchida
run("D3 Doppler 'Sim', nódulo SEM vascularização preenchida", comAchado(base("mamas_axilas", "sim"), "n1", { ...NOD, birads: "3" }));
// D4 — contradição: cisto simples com vascularização interna
run("D4 contradição: cisto simples com vasc. interna, BI-RADS 2", comAchado(base("mamas_axilas", "sim"), "c1", { tipo: "cisto_simples", lado: "direita", medidas: "0,8 x 0,5 x 0,6", horario: "10 horas", vascularizacao: "interna", birads: "2" }));
// D5 — Doppler 'Sim' + linfonodo axilar atípico (há campo de Doppler para o linfonodo?)
run("D5 Doppler 'Sim' + linfonodo axilar atípico à esquerda", { ...base("mamas_axilas", "sim"), axilas: { axilas: "alteradas", "axilas.alteradas.lado": "esquerda", "axilas.alteradas.hilo": "ausente", "axilas.alteradas.medidas": "1,8 x 1,2", "axilas.alteradas.desc": "com fluxo periférico ao Doppler" } });
// D6 — remoção: D1 e depois Doppler volta a 'Não'
run("D6 remoção: D1 com Doppler desligado", { ...d1, __opts: { ...d1.__opts, doppler_mamario: "nao" } });
// D7 — Somente mamas com Doppler: título
run("D7 Somente mamas com Doppler, sem achados", base("mamas", "sim"));
