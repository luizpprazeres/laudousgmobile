import { mamaria, partesMoles, mamaMasculina } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarMamaria } from "../../../../../apps/web/src/lib/catalog/mamariaParaCatalogo";
import { adaptarPartesMoles } from "../../../../../apps/web/src/lib/catalog/partesMolesParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
// Estado como a tela monta: seções resolvidas pelo escopo + __opts.
const base = (escopo: string, extraOpts: E = {}): E => {
  const st: E = { __opts: { escopo_exame: escopo, ...extraOpts } };
  for (const s of mamaria.resolveSections!({ escopo_exame: escopo } as never)) if (s.module) st[s.id] = s.module.initialState();
  return st;
};
const ax = (e: E, p: E): E => ({ ...e, axilas: { ...e.axilas, ...p } });
function run(nome: string, e: E, estilo = "CLASSICO_COMPLETO") {
  const a = adaptarMamaria(e);
  const r: any = renderizarSelecao("MAMARIA", estilo as never, [], a.dados as never);
  const d = a.dados as E;
  console.log("\n######", nome, `[${estilo}]`, "| pendências:", JSON.stringify(a.pendencias), "| escopo:", d.escopo_exame, "| axilas_alteradas:", d.axilas_alteradas, "| axilas_descricao:", JSON.stringify(d.axilas_descricao));
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
const axMod = mamaria.sections.find((s) => s.id === "axilas")!.module!;
console.log("controles axilas:", JSON.stringify(axMod.schema.fields.map((f: E) => [f.key, f.hint, f.options?.map((o: E) => o.value), (f.options ?? []).flatMap((o: E) => (o.subFields ?? []).map((s: E) => s.key))])));
console.log("initialState axilas:", JSON.stringify(axMod.initialState()));
console.log("controles de categoria:", JSON.stringify(mamaria.controls!.map((c: E) => [c.key, c.options.map((o: E) => o.value + (o.isDefault ? "*" : ""))])));

// A1 — escopo "Somente axilas", nada tocado
run("A1 somente axilas, estado inicial", base("axilas"));
// A1b — escopo padrão (mamas e axilas) usado para um exame só de axilas
run("A1b escopo padrão mamas_axilas, nada tocado (médico queria só axilas)", base("mamas_axilas"));
// A2 — linfonodo atípico à esquerda
const atip = ax(base("axilas"), { axilas: "alteradas", "axilas.alteradas.lado": "esquerda", "axilas.alteradas.forma": "redonda", "axilas.alteradas.hilo": "ausente", "axilas.alteradas.cortical_cm": "0,5", "axilas.alteradas.medidas": "1,8 x 1,2" });
run("A2 linfonodo atípico à esquerda (redondo, sem hilo, cortical 0,5 cm, 1,8 x 1,2 cm)", atip);
run("A2 objetivo", atip, "OBJETIVO");
run("A2b 'Alteradas' clicado, nada mais", ax(base("axilas"), { axilas: "alteradas" }));
// A3 — axila direita não avaliada (pós-esvaziamento)
run("A3a 'Não avaliadas' no escopo somente axilas", ax(base("axilas"), { axilas: "nao" }));
run("A3b esquerda normal + direita não avaliada via texto livre (único recurso)", ax(base("axilas"), { axilas: "alteradas", "axilas.alteradas.desc": "Axila direita não avaliada (esvaziamento axilar prévio). Axila esquerda sem linfonodos atípicos" }));
// A4 — remoção
run("A4 remoção: A2 e depois volta a 'Normais' (subcampos ficam no estado)", ax(atip, { axilas: "normais" }));
// A5 — contradição: hilo preservado, oval, cortical fina, mas 'Alteradas'
run("A5 contradição: 'Alteradas' com oval, hilo preservado, cortical 0,2 cm", ax(base("axilas"), { axilas: "alteradas", "axilas.alteradas.lado": "direita", "axilas.alteradas.forma": "oval", "axilas.alteradas.hilo": "preservado", "axilas.alteradas.cortical_cm": "0,2", "axilas.alteradas.medidas": "1,0 x 0,5" }));
// A6 — vizinho PARTES_MOLES: linfonodo axilar
const pm: E = { partes_moles: { ...partesMoles.sections[0].module!.initialState(), lesao: "linfonodo", "lesao.linfonodo.medidas": "1,8 x 1,2 x 1,0", "lesao.linfonodo.eco": "hipoecoica", "lesao.linfonodo.local": "na axila esquerda" } };
const apm = adaptarPartesMoles(pm as never);
const rpm: any = renderizarSelecao("PARTES_MOLES", "CLASSICO_COMPLETO", [], apm.dados as never);
console.log("\n###### A6 PARTES_MOLES linfonodo 'na axila esquerda' | pendências:", JSON.stringify(apm.pendencias));
console.log(rpm.ok ? rpm.texto : JSON.stringify(rpm));
// A7 — comparação: módulo axilar da MAMA_MASCULINA (local)
const mmAx = mamaMasculina.sections.find((s) => s.id === "axilas")!.module!;
console.log("\n###### A7 MAMA_MASCULINA axilas 'alterada' só clicada:", JSON.stringify(mmAx.compose({ axilas: "alteradas" } as never)));
console.log("###### A7b MAMA_MASCULINA axila esquerda completa:", JSON.stringify(mmAx.compose({ axilas: "alteradas", "axilas.alteradas.lado": "esquerda", "axilas.alteradas.medidas": "1,8 x 1,2", "axilas.alteradas.hilo": "ausente", "axilas.alteradas.cortical_cm": "0,5" } as never)));
