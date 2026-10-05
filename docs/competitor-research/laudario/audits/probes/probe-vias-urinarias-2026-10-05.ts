// Probe sintético — VIAS_URINARIAS (Web migrada: formulário → adaptador → renderer canônico).
import { viasUrinarias } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarViasUrinarias } from "../../../../../apps/web/src/lib/catalog/viasUrinariasParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";

type E = Record<string, any>;
const base = (): E => Object.fromEntries(viasUrinarias.sections.filter((s) => s.module).map((s) => [s.id, s.module!.initialState()]));
const com = (e: E, s: string, p: E): E => ({ ...e, [s]: { ...e[s], ...p } });
function run(nome: string, e: E) {
  const a = adaptarViasUrinarias(e);
  const r: any = renderizarSelecao("VIAS_URINARIAS", "CLASSICO_COMPLETO", [], a.dados as never);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias), "| alterações:", JSON.stringify(a.alteracoes));
  console.log(r.ok ? r.texto.split("COMENTÁRIOS:")[1]?.split("\n").slice(2).join("\n") ?? r.texto : JSON.stringify(r));
}

// U1 — estado inicial intocado
run("U1 estado inicial", base());
// U2 — hidronefrose moderada + cálculo 8 mm no polo inferior, só à ESQUERDA, com medidas
const u2 = com(base(), "rim_esquerdo", { dilatacao: "moderada", litiase: ["calculo"], "litiase.calculo.dimensao": "8 mm", "litiase.calculo.polo": "inf", medidas: "10,5 x 5,0 x 4,8", espessura: "1,5" });
run("U2 hidronefrose moderada + cálculo 8 mm à esquerda", u2);
// U3 — rim direito não visualizado / nefrectomia: não há opção; única saída é texto livre
run("U3 rim direito 'nefrectomia' via alteração difusa", com(base(), "rim_direito", { alteracao_difusa: "rim direito não caracterizado (nefrectomia prévia)" }));
// U3b — rim direito ausente marcado como 'reduzido' (tentativa de contorno)
run("U3b rim direito com dimensões reduzidas (sem medida)", com(base(), "rim_direito", { dimensoes: "reduzido" }));
// U4 — volume pré-miccional 320 mL + resíduo 140 mL
run("U4 volume 320 mL + resíduo 140 mL", com(base(), "bexiga", { volume_pre: "320", residuo_estado: "valor", "residuo_estado.valor.ml": "140" }));
// U4b — resíduo marcado sem valor
run("U4b resíduo sem valor", com(base(), "bexiga", { residuo_estado: "valor" }));
// U4c — bexiga vazia: rins seguem avaliados?
run("U4c bexiga vazia", com(base(), "bexiga", { replecao: "vazia" }));
// U5 — remoção: desmarca o cálculo e a hidronefrose, subcampos permanecem
run("U5 remoção (litiase=[] e dilatacao=ausente, subcampos ficam)", com(u2, "rim_esquerdo", { litiase: [], dilatacao: "ausente" }));
// U6 — contradição: dilatação ureteral 'à direita' com hidronefrose só à esquerda; ureter sem lado
run("U6 ureter direito dilatado + hidronefrose esquerda", com(u2, "ureteres", { dilatacao: "sim", "dilatacao.sim.desc": "ureter direito dilatado, 9 mm" }));
run("U6b dilatação ureteral sem lado", com(base(), "ureteres", { dilatacao: "sim" }));
// U7 — cálculo à esquerda sem medida
run("U7 cálculo à esquerda sem medida", com(base(), "rim_esquerdo", { litiase: ["calculo"] }));
