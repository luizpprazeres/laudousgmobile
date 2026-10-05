/**
 * Probe — "Pélvico Abdominal" (via transabdominal isolada) (lote 3, 05/10/2026).
 * Caminho Web real: PELVE_FEMININA com o controle Via = Transabdominal (`via: "ta"`)
 * → adaptarPelve → renderizarSelecao("PELVE_FEMININA"). PELVICO_TRANSVAGINAL não
 * tem controle de via (fixa `tv`), então não é porta para TA.
 * Dados sintéticos. Só leitura/execução; nada é gravado.
 */
import { adaptarPelve } from "../../../../../apps/web/src/lib/catalog/pelveParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { alteracoesDe } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes/index";
import { initialExamState } from "../../../../../apps/web/src/lib/deterministic/compose";
import { pelveFeminina } from "../../../../../apps/web/src/lib/deterministic/organs/pelveFeminina";
import { pelvicoTransvaginal } from "../../../../../apps/web/src/lib/deterministic/organs/pelvicoTransvaginal";
import { renderPelveFeminina } from "../../../../../apps/api/src/server/renderer/categories/PELVE_FEMININA";

type E = Record<string, any>;
const com = (e: E, s: string, p: E): E => ({ ...e, [s]: { ...e[s], ...p } });
const opts = (e: E, p: E): E => ({ ...e, __opts: { ...(e.__opts ?? {}), ...p } });
const inicialTA = (): E => opts(initialExamState(pelveFeminina) as E, { via: "ta" });
function medidoTA(): E {
  let s = inicialTA();
  s = com(s, "utero", { medidas: "7,4 x 4,0 x 4,5" });
  s = com(s, "ovario_direito", { medidas: "3,0 x 2,0 x 1,8" });
  s = com(s, "ovario_esquerdo", { medidas: "2,9 x 1,9 x 1,7" });
  return s;
}

function run(nome: string, e: E) {
  const a = adaptarPelve(e, (e.__opts ?? {}) as Record<string, string | string[]>);
  console.log(`\n###### ${nome}`);
  console.log("seções visíveis:", (pelveFeminina.resolveSections!((e.__opts ?? {}) as any) ?? []).map((s) => s.id).join(","));
  console.log("pendências:", JSON.stringify(a.pendencias.map((p) => `${p.bloqueia ? "BLOQ" : "aviso"} ${p.onde}: ${p.motivo}`)));
  console.log("dados: via=%s endometrio_eco=%s endometrio_frase=%s bexiga.replecao=%s", (a.dados as any).via, (a.dados as any).endometrio_eco, (a.dados as any).endometrio_frase, (a.dados as any).bexiga?.replecao);
  const specs = alteracoesDe("PELVE_FEMININA").filter((s: any) => a.alteracoes.includes(s.id));
  const r: any = renderizarSelecao("PELVE_FEMININA", "CLASSICO_COMPLETO", specs as any, a.dados as never);
  console.log(r.ok ? r.texto : JSON.stringify(r));
}

console.log("PELVICO_TRANSVAGINAL tem controle 'via'?", (pelvicoTransvaginal.controls ?? []).some((c) => c.key === "via"));
console.log("opções de frase do endométrio na Web:", JSON.stringify(pelveFeminina.sections.find((s) => s.id === "endometrio")!.module.schema.fields.find((f) => f.key === "frase")!.options!.map((o) => o.value)));

// A1 — estado inicial com Via = TA
run("A1 estado inicial, via TA", inicialTA());

// A2 — TA com medidas de útero e ovários, endométrio NÃO medido (o caso típico da via abdominal)
run("A2 TA, endométrio não medido", medidoTA());

// A2b — a mesma situação pelo renderer com `endometrio_eco: null` e frase nula (como o ditado chega)
{
  const a = adaptarPelve(medidoTA(), { via: "ta" });
  const f = { ...(a.dados as any), endometrio_eco: null, endometrio_frase: null };
  console.log("\n###### A2b renderer direto, eco=null e frase=null (forma do ditado)");
  const specs = alteracoesDe("PELVE_FEMININA").filter((s: any) => a.alteracoes.includes(s.id));
  const r: any = renderizarSelecao("PELVE_FEMININA", "CLASSICO_COMPLETO", specs as any, f as never);
  console.log(r.ok ? r.texto : JSON.stringify(r));
}

// A3 — ovários não visualizados pela via TA (os dois)
run("A3 TA, ovários não visualizados", com(com(medidoTA(), "ovario_direito", { visualizado: "nao", medidas: "" }), "ovario_esquerdo", { visualizado: "nao", medidas: "" }));

// A4 — bexiga com repleção insuficiente (técnica afirma 'bexiga repleta')
run("A4 TA, bexiga com repleção insuficiente", com(medidoTA(), "bexiga", { replecao: "insuficiente" }));

// A5 — alteração lateralizada: cisto simples no ovário esquerdo; depois removida
const a5 = com(medidoTA(), "ovario_esquerdo", { achado: "cisto_simples", "achado.cisto_simples.medidas": "3,2 x 2,8 x 2,6" });
run("A5a TA, cisto simples OE", a5);
run("A5b TA, cisto removido (achado = nenhum)", com(a5, "ovario_esquerdo", { achado: "nenhum" }));

// A6 — menopausa + TA + endométrio não medido: frase da técnica no corpo x conclusão de normalidade
run("A6 TA + menopausa, endométrio não medido", opts(medidoTA(), { menopausa: ["sim"] }));
