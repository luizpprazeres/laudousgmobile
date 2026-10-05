import { adaptarObstetrica } from "../../../../../apps/web/src/lib/catalog/obstetricaParaCatalogo";
import { obstetrica } from "../../../../../apps/web/src/lib/deterministic";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { renderObstetrica } from "../../../../../apps/api/src/server/renderer/categories/OBSTETRICA";
type E = Record<string, any>;
const ini = (): E => { const e: E = {}; for (const s of (obstetrica as any).sections) if (s.module) e[s.id] = s.module.initialState(); return e; };
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
const medido = () => { let e = ini();
  e = com(e, "ig", { bio_sem: "32", bio_dias: "2" });
  e = com(e, "feto", { situacao: "longitudinal", "situacao.longitudinal.apresentacao": "cefálica", vitalidade: "normal", bcf: "142", movimentos: "normais", cordao_vasos: "nao_avaliado" });
  return com(e, "biometria", { dbp: "82", cc: "295", ca: "270", cf: "60", peso: "1650" }); };
function run(nome: string, e: E) {
  const a: any = adaptarObstetrica(e);
  const r: any = renderizarSelecao("OBSTETRICA", "CLASSICO_COMPLETO", [], a.dados);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias));
  console.log(r.ok ? r.texto : JSON.stringify(r).slice(0, 600));
  return a;
}
run("O1 estado inicial, nada preenchido", ini());
run("O2a p6 Intergrowth, sem Doppler, ILA 4", com(com(medido(), "crescimento_fetal", { avaliar: "sim", "avaliar.sim.percentil": "6", "avaliar.sim.fonte": "Intergrowth-21st" }), "liquido", { tipo: "ila", "tipo.ila.cm": "4" }));
run("O2b peso 1650 sem classificar crescimento", medido());
const a: any = adaptarObstetrica(medido());
const d = structuredClone(a.dados);
d.numero_fetos = 2; d.corionicidade = "dicoriônica e diamniótica";
d.fetos = [{ ...d.fetos[0], posicao_relativa: "à direita" }, { ...d.fetos[0], posicao_relativa: "à esquerda" }];
d.liquido_tipo = "mbv"; d.liquido_classe = null; d.liquido_mbv_por_feto_cm = [1.2, 9.5]; d.liquido_ila_cm = null; d.liquido_mbv_cm = null;
console.log("\n###### O3 gemelar MBV 1,2 e 9,5 cm (renderObstetrica direto)");
try { console.log(renderObstetrica(d)); } catch (err) { console.log("ERRO", String(err).slice(0, 400)); }
