// Probe sintético (05/10/2026, base 06c88cd; executado na main 407362d, sem diferença nos arquivos envolvidos). Rodar a partir de apps/api: npx tsx <este arquivo>. Só lê/executa; nenhum dado real.
// Caminho Web real do Morfológico 1º trimestre: estado da tela → adaptarMorfologico(estado, { trimestre: "1t" })
// → renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], dados). Calculadora FMF: calculateTrisomyWeb (bloco à parte).
import { adaptarMorfologico } from "../../../../../apps/web/src/lib/catalog/morfologicoParaCatalogo";
import { morfologico } from "../../../../../apps/web/src/lib/deterministic";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { calculateTrisomyWeb } from "../../../../../apps/web/src/lib/calculators/trisomyFmf";
type E = Record<string, any>;
const OPC = { trimestre: "1t" };
const ini = (): E => {
  const e: E = {};
  for (const s of (morfologico as any).resolveSections(OPC)) if (s.module) e[s.id] = s.module.initialState();
  return e;
};
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
const medido = () => {
  let e = ini();
  e = com(e, "ig", { bio_sem: "12", bio_dias: "4" });
  return com(e, "primeiro_trimestre", { bcf: "156", ccn: "62", tn: "1,6", placenta_loc: "posterior" });
};
function run(nome: string, e: E) {
  const a: any = adaptarMorfologico(e, OPC);
  const r: any = renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], a.dados);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias));
  console.log(r.ok ? r.texto.split("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:")[1] : JSON.stringify(r).slice(0, 600));
  return a;
}
console.log("Seções 1t:", (morfologico as any).resolveSections(OPC).map((s: any) => s.id).join(", "));
console.log("Estado inicial primeiro_trimestre:", JSON.stringify(ini().primeiro_trimestre));
run("T1 estado inicial 1t, nada preenchido", ini());
run("T2a TN aumentada 3,8 mm com CCN 62 mm (resto padrão)", com(medido(), "primeiro_trimestre", { tn: "3,8" }));
run("T2b TN 3,8 + osso nasal ausente + tricúspide presente", com(medido(), "primeiro_trimestre", { tn: "3,8", osso_nasal: "ausente", tricuspide: "presente" }));
run("T3 osso nasal NÃO AVALIADO + ducto NÃO AVALIADO", com(medido(), "primeiro_trimestre", { osso_nasal: "na", ducto_venoso: "na" }));
run("T4 ducto venoso com onda A reversa", com(medido(), "primeiro_trimestre", { ducto_venoso: "alterado" }));
run("T5 anatomia precoce limitada (biotipo) — só via achados livres", com(medido(), "achados", { texto: "Avaliação da anatomia fetal precoce limitada pelo biotipo materno; coração e membros não adequadamente avaliados." }));
run("T6 artérias uterinas com IP 2,6 / 2,9 (alto para 12 semanas)", com(medido(), "doppler", { realizado: "sim", "realizado.sim.ip_ut_dir": "2,6", "realizado.sim.ip_ut_esq": "2,9" }));
run("T7 CCN 92 mm (fora da faixa 45–84) e IG vazia", com(com(ini(), "primeiro_trimestre", { bcf: "150", ccn: "92", tn: "2,0" }), "ig", {}));
let rem = com(medido(), "primeiro_trimestre", { ducto_venoso: "alterado", osso_nasal: "ausente" });
rem = com(rem, "primeiro_trimestre", { ducto_venoso: "normal", osso_nasal: "presente" });
run("T8 remoção: ducto e osso voltam ao padrão", rem);

console.log("\n###### F1 calculadora FMF (Web) — TN 3,8 mm, CCN 62 mm, osso nasal ausente, 36 anos, sintético");
try {
  const c: any = calculateTrisomyWeb({
    maternalAge: "36", dataNascimento: "", dataExame: "", crl: "62", nt: "3,8", fhr: "156", ethnicity: "white", weight: "68", smoking: false,
    previousT21: false, previousT18: false, previousT13: false, freeBetaHcgMoM: "", pappaMoM: "", isMoMCorrected: false,
    dvPI: "", tricuspid: "", nasalBone: "absent",
  } as any);
  console.log(c.block);
} catch (err) { console.log("erro:", (err as Error).message); }
console.log("\n###### F2 calculadora FMF (Web) — TN 1,6 mm, CCN 62 mm, marcadores normais, 28 anos, sintético");
try {
  const c: any = calculateTrisomyWeb({
    maternalAge: "28", dataNascimento: "", dataExame: "", crl: "62", nt: "1,6", fhr: "156", ethnicity: "white", weight: "62", smoking: false,
    previousT21: false, previousT18: false, previousT13: false, freeBetaHcgMoM: "", pappaMoM: "", isMoMCorrected: false,
    dvPI: "", tricuspid: "normal", nasalBone: "present",
  } as any);
  console.log(c.block);
} catch (err) { console.log("erro:", (err as Error).message); }
