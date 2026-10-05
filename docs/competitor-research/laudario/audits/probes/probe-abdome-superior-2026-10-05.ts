import { abdomeSuperior, type ExamCategory } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarAbdomeSuperior } from "../../../../../apps/web/src/lib/catalog/abdomeSuperiorParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
const inicial = (c: ExamCategory): E => Object.fromEntries(c.sections.filter((s) => s.module).map((s) => [s.id, s.module!.initialState()]));
const com = (e: E, s: string, p: E): E => ({ ...e, [s]: { ...e[s], ...p } });
function run(nome: string, e: E) {
  const a = adaptarAbdomeSuperior(e as never);
  const r: any = renderizarSelecao("ABDOMEN_SUPERIOR", "CLASSICO_COMPLETO", [], a.dados as never);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias));
  console.log("status:", JSON.stringify(Object.fromEntries(Object.entries(a.dados.orgaos as E).map(([k, v]: any) => [k, v?.status]))));
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
const b = () => inicial(abdomeSuperior);
console.log("seções da tela:", abdomeSuperior.sections.map((s) => s.id).join(","));
run("A1 estado inicial", b());
let e = com(b(), "figado", { ecotextura: "esteatose_moderada" });
e = com(e, "vesicula", { conteudo: ["colelitiase"], "conteudo.colelitiase.quantidade": "multiplos", "conteudo.colelitiase.dimensao": "9" });
run("A2 esteatose moderada + colelitíase múltipla 9 mm", e);
run("A2b colelitíase sem medida (mobilidade padrão)", com(b(), "vesicula", { conteudo: ["colelitiase"] }));
run("A3a vesícula ausente (colecistectomia)", com(b(), "vesicula", { estado: "ausente" }));
run("A3b vesícula contraída (jejum inadequado)", com(b(), "vesicula", { estado: "contraida" }));
run("A4 pâncreas visualização prejudicada", com(b(), "pancreas", { visualizacao: "prejudicada" }));
const rem = com(com(e, "figado", { ecotextura: "homogenea" }), "vesicula", { conteudo: ["anecoico"] });
run("A5 remoção (A2 desfeito, sub-campos da colelitíase ainda preenchidos)", rem);
