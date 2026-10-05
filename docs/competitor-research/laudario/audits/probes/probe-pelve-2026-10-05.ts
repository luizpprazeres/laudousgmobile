import { adaptarPelve } from "../../../../../apps/web/src/lib/catalog/pelveParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { alteracoesDe } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes/index";
type E = Record<string, any>;
const base = (): E => ({
  utero: { posicao: "anteversão", medidas: "", volume_classe: "normal", miomatoso: [], mioma: [], mioma2: [], mioma3: [], adenomiose: [], istmocele: [], cistos_naboth: [] },
  endometrio: { espessura: "", eco: "homogeneo", frase: "padrao", achado: "", achado_tipo: "nenhum", achado_medidas: "", vascularizacao: "", diu: "nenhum", diu_descricao: "", liquido_livre: [], produtos_retidos: "nao", produtos_retidos_quantidade: "moderada" },
  ovario_direito: { visualizado: "sim", medidas: "", achado: "nenhum", atrofico: [], foliculos_mm: "" },
  ovario_esquerdo: { visualizado: "sim", medidas: "", achado: "nenhum", atrofico: [], foliculos_mm: "" },
});
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
function run(nome: string, e: E, op: E = {}) {
  const a = adaptarPelve(e, { via: "tv", modo_pelve: "rotina", ...op });
  const specs = a.alteracoes.map((id: string) => alteracoesDe("PELVE_FEMININA").find((s: any) => s.id === id)).filter(Boolean);
  const r: any = renderizarSelecao("PELVE_FEMININA", "CLASSICO_COMPLETO", specs as any, a.dados as never);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias), "| alterações:", a.alteracoes.join(","));
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
run("P1 normal TV sem medidas", base());
run("P2 menopausa + endométrio 1,2 cm", com(base(), "endometrio", { espessura: "1,2" }), { menopausa: ["sim"] });
run("P3 adenomiose + mioma", com(base(), "utero", { medidas: "8,0 x 5,0 x 6,0", adenomiose: ["sim"], mioma: ["sim"], "mioma.sim.medidas": "3,0 x 2,5 x 2,0", "mioma.sim.parede": "parede posterior" }));
run("P4 útero 10x7x7 classe default", com(base(), "utero", { medidas: "10,0 x 7,0 x 7,0" }));
run("P5 ovário direito não visualizado", com(base(), "ovario_direito", { visualizado: "nao" }));
