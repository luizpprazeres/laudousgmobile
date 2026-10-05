/**
 * Probe — "Pélvico Transvaginal - Monitorização Folicular" (lote 3, 05/10/2026).
 * Caminho Web real: estado inicial do formulário → adaptador → renderizarSelecao (PELVE_FEMININA).
 * Duas portas de entrada que um médico usaria hoje:
 *   - PELVE_FEMININA, Finalidade = Monitorização folicular (adaptarPelve, sem portão);
 *   - PELVICO_TRANSVAGINAL, Finalidade = Monitorização folicular (adaptarPelveTransvaginal, com portão).
 * Dados sintéticos. Só leitura/execução; nada é gravado.
 */
import { adaptarPelve, adaptarPelveTransvaginal } from "../../../../../apps/web/src/lib/catalog/pelveParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { alteracoesDe } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes/index";
import { initialExamState } from "../../../../../apps/web/src/lib/deterministic/compose";
import { pelveFeminina } from "../../../../../apps/web/src/lib/deterministic/organs/pelveFeminina";
import { pelvicoTransvaginal } from "../../../../../apps/web/src/lib/deterministic/organs/pelvicoTransvaginal";

type E = Record<string, any>;
const com = (e: E, s: string, p: E): E => ({ ...e, [s]: { ...e[s], ...p } });
const opts = (e: E, p: E): E => ({ ...e, __opts: { ...(e.__opts ?? {}), ...p } });

function inicial(cat: "PELVE" | "TV"): E {
  const s = initialExamState(cat === "PELVE" ? pelveFeminina : pelvicoTransvaginal) as E;
  return opts(s, { modo_pelve: "monitorizacao_folicular" });
}
function medido(cat: "PELVE" | "TV"): E {
  let s = inicial(cat);
  s = com(s, "utero", { medidas: "7,6 x 4,1 x 4,6" });
  s = com(s, "endometrio", { espessura: "0,6" });
  s = com(s, "ovario_direito", { medidas: "3,0 x 2,0 x 1,9" });
  s = com(s, "ovario_esquerdo", { medidas: "2,8 x 1,9 x 1,7" });
  return s;
}

function run(nome: string, cat: "PELVE" | "TV", e: E) {
  const o = (e.__opts ?? {}) as Record<string, string | string[]>;
  const a = cat === "PELVE" ? adaptarPelve(e, o) : adaptarPelveTransvaginal(e, o);
  const bloq = a.pendencias.filter((p) => p.bloqueia);
  console.log(`\n###### ${nome} [${cat === "PELVE" ? "PELVE_FEMININA" : "PELVICO_TRANSVAGINAL"}]`);
  console.log("pendências:", JSON.stringify(a.pendencias.map((p) => `${p.bloqueia ? "BLOQ" : "aviso"} ${p.onde}: ${p.motivo}`)));
  console.log("foliculos_mm OD/OE:", JSON.stringify((a.dados as any).ovario_direito.foliculos_mm), JSON.stringify((a.dados as any).ovario_esquerdo.foliculos_mm));
  if (bloq.length && cat === "TV") { console.log("(render bloqueado na UI)"); }
  const specs = alteracoesDe("PELVE_FEMININA").filter((s: any) => a.alteracoes.includes(s.id));
  const r: any = renderizarSelecao("PELVE_FEMININA", "CLASSICO_COMPLETO", specs as any, a.dados as never);
  console.log(r.ok ? r.texto : JSON.stringify(r));
}

// M1 — estado inicial (só a Finalidade trocada)
run("M1 estado inicial, monitorização", "PELVE", inicial("PELVE"));
run("M1b estado inicial, monitorização", "TV", inicial("TV"));

// M2 — ciclo basal: dia do ciclo não tem campo; folículos antrais por ovário
run("M2 ciclo basal (antrais 4–7 mm)", "TV",
  com(com(medido("TV"), "ovario_direito", { foliculos_mm: "4, 5, 6, 7, 5" }), "ovario_esquerdo", { foliculos_mm: "5, 6, 4" }));

// M3 — folículo dominante unilateral digitado com dois diâmetros
run("M3 dominante OD 18 x 16 mm + 10, 9", "TV",
  com(medido("TV"), "ovario_direito", { foliculos_mm: "18 x 16, 10, 9" }));

// M3b — mesma medida digitada em cm
run("M3b dominante OD digitado 1,8 cm", "TV", com(medido("TV"), "ovario_direito", { foliculos_mm: "1,8 cm" }));

// M4 — sinais de ovulação: corpo lúteo marcado como 'funcional' no OD; o folículo de antes ficou no campo; líquido livre
run("M4 corpo lúteo OD + resto do campo + líquido livre", "TV",
  com(com(medido("TV"), "ovario_direito", { achado: "funcional", "achado.funcional.medidas": "2,0 x 1,8 x 1,6", foliculos_mm: "19" }),
    "endometrio", { liquido_livre: ["sim"], "liquido_livre.sim.descricao": "pequena quantidade no fundo de saco" }));

// M5 — incompleto: OD não visualizado mas com folículo no campo; OE sem folículos informados
run("M5 OD não visualizado com folículo 15 no campo", "TV",
  com(medido("TV"), "ovario_direito", { visualizado: "nao", medidas: "", foliculos_mm: "15" }));
run("M5b idem pela pelve (sem portão)", "PELVE",
  com(medido("PELVE"), "ovario_direito", { visualizado: "nao", medidas: "", foliculos_mm: "15" }));

// M6 — remoção: folículos digitados e depois apagados; e Finalidade volta a Rotina com o campo preenchido
const m6 = com(medido("TV"), "ovario_esquerdo", { foliculos_mm: "17, 11" });
run("M6a OE 17, 11", "TV", m6);
run("M6b campo apagado", "TV", com(m6, "ovario_esquerdo", { foliculos_mm: "" }));
run("M6c Finalidade = Rotina com o campo ainda preenchido", "TV", opts(m6, { modo_pelve: "rotina" }));

// M7 — contradição: menopausa marcada + monitorização com folículo dominante
run("M7 menopausa + dominante 18", "TV", opts(com(medido("TV"), "ovario_direito", { foliculos_mm: "18" }), { menopausa: ["sim"] }));
