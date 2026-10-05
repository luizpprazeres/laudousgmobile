// Prova sintética 05/10/2026 — DOPPLER_CAROTIDAS (Web migrada → renderer do catálogo). Rodar a partir de apps/api: npx tsx <este arquivo> [OBJETIVO]
import { dopplerCarotidas } from "../../../../../apps/web/src/lib/deterministic/organs/dopplerCarotidas";
import { adaptarDopplerCarotidas } from "../../../../../apps/web/src/lib/catalog/dopplerCarotidasParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
// Estado inicial real do formulário Web (initialState de cada seção).
const base = (): E => Object.fromEntries(dopplerCarotidas.sections.map((s: any) => [s.id, s.module.initialState()]));
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
const estilo = process.argv[2] === "OBJETIVO" ? "OBJETIVO" : "CLASSICO_COMPLETO";
function run(nome: string, e: E) {
  const a = adaptarDopplerCarotidas(e);
  const r: any = renderizarSelecao("DOPPLER_CAROTIDAS", estilo, [], a.dados as never);
  console.log("\n######", nome, "|", estilo, "| pendências:", JSON.stringify(a.pendencias));
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
const placaACID = (e: E) => com(e, "direita", {
  interna_vps: "280", interna_vdf: "95", placas_ids: ["p1"],
  "placas.p1.localizacao": "bulbo e origem da carótida interna direita",
  "placas.p1.composicao": "lipidica", "placas.p1.superficie": "irregular",
  "placas.p1.espessura": "3,2", "placas.p1.estenose": "70",
});
run("C1 estado inicial (nada preenchido)", base());
run("C2 placa ACI D com estenose 70% informada, classificação mantida 'normal'", placaACID(base()));
run("C2b mesma placa, classificação 'Não classificar' (vazia)", com(placaACID(base()), "conclusao", { classificacao: "" }));
run("C3 vertebral E retrógrada, classificação mantida 'normal'", com(base(), "esquerda", { vertebral_direcao: "retrogrado", vertebral_vps: "35" }));
run("C3b vertebral E retrógrada, classificação vazia", com(com(base(), "esquerda", { vertebral_direcao: "retrogrado" }), "conclusao", { classificacao: "" }));
run("C3c vertebral E 'Não informado' (direção vazia)", com(base(), "esquerda", { vertebral_direcao: "" }));
run("C4 classificação 50-69% sem lado", com(placaACID(base()), "conclusao", { classificacao: "estenose_50_69", lado: "" }));
run("C4b oclusão sem lado", com(base(), "conclusao", { classificacao: "oclusao", lado: "" }));
// Remoção: aplica placa + classificação, depois desfaz como o painel faz (remove id e chaves placas.<id>.*), mantém classificação
const aplicado = com(placaACID(base()), "conclusao", { classificacao: "estenose_70_99", lado: "direita" });
const semPlaca = (() => { const d = { ...aplicado.direita, placas_ids: [] as string[] }; for (const k of Object.keys(d)) if (k.startsWith("placas.p1.")) delete d[k]; return { ...aplicado, direita: d }; })();
run("C5a remoção da placa (classificação 70-99% D esquecida)", semPlaca);
run("C5b remoção completa (placa + classificação volta a 'normal'; VPS/VDF mantidos)", com(semPlaca, "conclusao", { classificacao: "normal", lado: "" }));
run("C6 contradição: EMI 8 (provável 0,8) e VDF>VPS na ACC E", com(com(base(), "direita", { emi: "8" }), "esquerda", { comum_vps: "60", comum_vdf: "80" }));
run("C7 achados_adicionais com oclusão vertebral, classificação 'normal'", com(base(), "conclusao", { achados_adicionais: "Artéria vertebral direita sem fluxo detectável ao Doppler." }));
