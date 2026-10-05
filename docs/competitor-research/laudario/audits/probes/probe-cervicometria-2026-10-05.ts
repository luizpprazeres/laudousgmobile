// Probe sintético (05/10/2026, base 01155d0). Rodar a partir de apps/api com dependências: npx tsx <este arquivo>. Só lê/executa; nenhum dado real.
import { adaptarCervicometria } from "../../../../../apps/web/src/lib/catalog/cervicometriaParaCatalogo";
import { cervicometria, obstetrica } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarObstetrica } from "../../../../../apps/web/src/lib/catalog/obstetricaParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
const ini = (cat: any): E => { const e: E = {}; for (const s of cat.sections) if (s.module) e[s.id] = s.module.initialState(); return e; };
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
function corte(t: string) { return t.split("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:")[1] ?? t; }
function run(nome: string, e: E) {
  const a: any = adaptarCervicometria(e);
  const r: any = renderizarSelecao("CERVICOMETRIA", "CLASSICO_COMPLETO", [], a.dados);
  console.log("\n######", nome, "| dados:", JSON.stringify(a.dados), "| pendências:", JSON.stringify(a.pendencias));
  console.log(r.ok ? corte(r.texto) : JSON.stringify(r).slice(0, 600));
}
const c = (p: E) => com(ini(cervicometria), "cervicometria", p);
run("C1 estado inicial, sem medida", ini(cervicometria));
run("C2a colo 18 mm em 22 semanas, digitado '1,8' (cm)", c({ colo_cm: "1,8", ig_semanas: "22" }));
run("C2b colo digitado '18 mm'", c({ colo_cm: "18 mm", ig_semanas: "22" }));
run("C2c colo digitado '18' sem unidade no campo em cm", c({ colo_cm: "18", ig_semanas: "22" }));
run("C2d colo de 5 mm digitado '5' (sem unidade)", c({ colo_cm: "5", ig_semanas: "22" }));
run("C3 afunilamento: único controle é OI 'Aberto' + colo 1,8", c({ colo_cm: "1,8", orificio: "aberto", ig_semanas: "22", observacoes: "Afunilamento do orifício interno com sludge no líquido amniótico." }));
run("C4 colo 1,8 sem IG", c({ colo_cm: "1,8" }));
run("C4b colo 1,8 com IG 34 (mesma classe?)", c({ colo_cm: "1,8", ig_semanas: "34" }));
run("C5 placenta a 1,5 cm do OI em 33 semanas", c({ colo_cm: "3,2", placenta_cm: "1,5", ig_semanas: "33" }));
run("C5b placenta '15' (mm, sem unidade) em 33 semanas", c({ colo_cm: "3,2", placenta_cm: "15", ig_semanas: "33" }));
run("C5c placenta distante + medida ao mesmo tempo", c({ colo_cm: "3,2", placenta_cm: "4", placenta_distante: "sim", ig_semanas: "33" }));
// remoção
let r = c({ colo_cm: "1,8", orificio: "aberto", cerclagem: "sim", ig_semanas: "22" });
r = com(r, "cervicometria", { colo_cm: "3,4", orificio: "fechado", cerclagem: "nao" });
run("C6 remoção: OI aberto + cerclagem desfeitos, colo 3,4", r);
// duplicidade com a obstétrica: placenta em mm (obstétrico) e em cm (addon)
let o = ini(obstetrica);
o = com(o, "ig", { bio_sem: "33", bio_dias: "0" });
o = com(o, "feto", { situacao: "longitudinal", "situacao.longitudinal.apresentacao": "cefálica", bcf: "140" });
o = com(o, "placenta", { estado: "detalhar", "estado.detalhar.localizacao": "posterior", relacao_orificio: "insercao_baixa", "relacao_orificio.insercao_baixa.distancia_mm": "15" });
o = com(o, "cervicometria", { realizada: "sim", "realizada.sim.colo_cm": "3,2", "realizada.sim.placenta_cm": "1,5" });
const ao: any = adaptarObstetrica(o);
const ro: any = renderizarSelecao("OBSTETRICA", "CLASSICO_COMPLETO", [], ao.dados);
console.log("\n###### C7 OBSTETRICA 33s: inserção baixa 15 mm + addon cervicometria placenta 1,5 cm | pendências:", JSON.stringify(ao.pendencias));
const t: string = ro.ok ? ro.texto : JSON.stringify(ro);
console.log(t.split("\n").filter((l) => /placenta|Placenta|colo|COLO|CERVICO|prévia|CONCLUSÃO|^\d\)/.test(l)).join("\n"));
