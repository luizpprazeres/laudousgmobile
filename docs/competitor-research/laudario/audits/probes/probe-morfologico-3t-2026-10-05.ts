// Probe sintético (05/10/2026, base 06c88cd; executado na main 407362d, sem diferença nos arquivos envolvidos). Rodar a partir de apps/api: npx tsx <este arquivo>. Só lê/executa; nenhum dado real.
// Caminho Web real do Morfológico 3º trimestre: controle "Trimestre = 3º" no MESMO formulário MORFOLOGICO
// → adaptarMorfologico(estado, { trimestre: "3t" }) → renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], dados).
// Doppler: o addon do morfológico usa dopplerDaTela, o mesmo adaptador do DOPPLER_OBSTETRICO (adaptarDopplerObstetrico).
import { adaptarMorfologico } from "../../../../../apps/web/src/lib/catalog/morfologicoParaCatalogo";
import { morfologico } from "../../../../../apps/web/src/lib/deterministic";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
const OPC = { trimestre: "3t" };
const ini = (): E => {
  const e: E = {};
  for (const s of (morfologico as any).resolveSections(OPC)) if (s.module) e[s.id] = s.module.initialState();
  return e;
};
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
const medido = () => {
  let e = ini();
  e = com(e, "ig", { bio_sem: "32", bio_dias: "2" });
  e = com(e, "feto", { bcf: "142" });
  e = com(e, "biometria", { dbp: "82", cc: "296", cerebelo: "40", cisterna: "6", ca: "282", femur: "62", tibia: "54", fibula: "53", umero: "56", radio: "48", ulna: "51", peso: "1900" });
  return com(e, "extrafetal", { placenta_loc: "anterior", placenta_grau: "2", ila: "13" });
};
function run(nome: string, e: E, opc: E = OPC, corte = true) {
  const a: any = adaptarMorfologico(e, opc);
  const r: any = renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], a.dados);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias));
  const t: string = r.ok ? r.texto : JSON.stringify(r).slice(0, 600);
  console.log(corte ? t.split("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:")[0].split("\n")[0] + "\n…" + t.split("A biometria fetal")[0].split("OBSERVADOS:")[1] + "…" + (t.split("Peso aproximado")[1] ?? "") : t);
  return a;
}
console.log("Seções 3t:", (morfologico as any).resolveSections(OPC).map((s: any) => s.id).join(", "));
run("S1 estado inicial 3t, nada preenchido", ini(), OPC, false);
run("S2 normal medido 32s2d (biometria completa)", medido());
run("S3 ventriculomegalia leve unilateral ESQUERDA, átrio 11 mm (SNC alterado)", com(medido(), "anatomia", {
  snc: "alterado",
  "snc.alterado.corpo": "átrio do ventrículo lateral esquerdo medindo 11 mm; ventrículo lateral direito com átrio de 7 mm",
  "snc.alterado.diag": "ventriculomegalia leve à esquerda (átrio de 11 mm)" }));
run("S3b mesma ventriculomegalia só em achados livres", com(medido(), "achados", { texto: "Átrio do ventrículo lateral esquerdo medindo 11 mm." }));
run("S4 avaliação limitada por posição + oligoâmnio (ILA 4 cm)", com(com(medido(), "extrafetal", { ila: "4", liquido_avaliacao: "oligoamnio" }), "achados", {
  texto: "Avaliação da face e do coração fetal limitada pela posição fetal e pelo oligoâmnio." }));
run("S5 Doppler: IP umbilical 1,45, IP ACM 1,10, uterinas 0,9/1,0", com(medido(), "doppler", {
  realizado: "sim", "realizado.sim.ip_umb": "1,45", "realizado.sim.ip_acm": "1,10",
  "realizado.sim.ip_ut_dir": "0,90", "realizado.sim.ip_ut_esq": "1,00" }));
run("S6 contradição: trimestre 3º com IG biométrica 22 semanas", com(medido(), "ig", { bio_sem: "22", bio_dias: "0" }));
let rem = com(medido(), "anatomia", { snc: "alterado", "snc.alterado.corpo": "átrio esquerdo de 11 mm", "snc.alterado.diag": "ventriculomegalia leve" });
rem = com(rem, "anatomia", { snc: "normal" });
run("S7 remoção: SNC volta a normal com subcampos no estado", rem);
