import { cervical } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarCervical } from "../../../../../apps/web/src/lib/catalog/cervicalParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
const b = (): E => Object.fromEntries(cervical.sections.filter((s) => s.module).map((s) => [s.id, s.module!.initialState()]));
const com = (e: E, p: E): E => ({ ...e, cervical: { ...e.cervical, ...p } });
function run(nome: string, e: E, estilo = "CLASSICO_COMPLETO") {
  const a = adaptarCervical(e);
  const r: any = renderizarSelecao("CERVICAL", estilo as never, [], a.dados as never);
  console.log("\n######", nome, `[${estilo}]`, "| pendências:", JSON.stringify(a.pendencias), "| com_doppler:", (a.dados as E).com_doppler);
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
console.log("controles:", JSON.stringify(cervical.sections[0].module!.schema.fields.map((f: E) => [f.key, f.options?.map((o: E) => o.value), (f.options ?? []).flatMap((o: E) => (o.subFields ?? []).map((s: E) => s.key))])));
run("C1 estado inicial", b());
const alt = com(b(), { linfonodo: "alterado", "linfonodo.alterado.nivel": "IIA", "linfonodo.alterado.medidas": "22 x 13 x 11 mm", "linfonodo.alterado.forma": "arredondada", "linfonodo.alterado.hilo": "ausente", "linfonodo.alterado.vasc": "periferica", "linfonodo.alterado.suspeito": ["sim"] });
run("C2 linfonodo atípico nível IIA (pretendido: à direita — sem controle de lado)", alt);
run("C2 objetivo", alt, "OBJETIVO");
run("C2b alterado só com nível (medidas vazias, vasc padrão)", com(b(), { linfonodo: "alterado" }));
run("C3 lado esquerdo não avaliado (sem controle: só é possível o estado inicial)", b());
run("C4 remoção (volta a 'nenhum' com sub-campos ainda preenchidos)", { ...alt, cervical: { ...alt.cervical, linfonodo: "nenhum" } });
run("C5 contradição: arredondado, sem hilo, vasc. periférica, suspeição NÃO marcada", com(b(), { linfonodo: "alterado", "linfonodo.alterado.nivel": "IV", "linfonodo.alterado.medidas": "1,8 x 1,4 x 1,2", "linfonodo.alterado.forma": "arredondada", "linfonodo.alterado.hilo": "ausente", "linfonodo.alterado.vasc": "periferica" }));
