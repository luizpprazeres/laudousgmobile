// Probe sintético (05/10/2026, base 01155d0). Rodar a partir de apps/api com dependências: npx tsx <este arquivo>. Só lê/executa; nenhum dado real.
import { adaptarMorfologico } from "../../../../../apps/web/src/lib/catalog/morfologicoParaCatalogo";
import { morfologico } from "../../../../../apps/web/src/lib/deterministic";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { renderMorfologico } from "../../../../../apps/api/src/server/renderer/categories/MORFOLOGICO";
import { detectGolfBall } from "../../../../../apps/api/src/server/renderer/categories/golfBall";
type E = Record<string, any>;
const ini = (): E => { const e: E = {}; for (const s of (morfologico as any).sections) if (s.module) e[s.id] = s.module.initialState(); return e; };
const com = (e: E, s: string, p: E) => ({ ...e, [s]: { ...e[s], ...p } });
const medido = () => { let e = ini();
  e = com(e, "ig", { bio_sem: "22", bio_dias: "1" });
  e = com(e, "feto", { bcf: "146" });
  e = com(e, "biometria", { dbp: "53", cc: "196", cerebelo: "23", cisterna: "5", binocular: "35", ca: "172", femur: "38", tibia: "33", fibula: "32", umero: "36", radio: "31", ulna: "33", peso: "480" });
  return com(e, "extrafetal", { placenta_loc: "anterior", placenta_grau: "0" }); };
function run(nome: string, e: E, opc: E = { trimestre: "2t" }) {
  const a: any = adaptarMorfologico(e, opc);
  const r: any = renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], a.dados);
  console.log("\n######", nome, "| pendências:", JSON.stringify(a.pendencias));
  console.log(r.ok ? r.texto : JSON.stringify(r).slice(0, 600));
  return a;
}
run("M1 estado inicial 2t, nada preenchido", ini());
run("M2 pielectasia esquerda 7 mm (Vísceras alterado)", com(medido(), "anatomia", { visceras: "alterado",
  "visceras.alterado.corpo": "pelve renal esquerda com diâmetro anteroposterior de 7 mm; rim direito sem dilatação",
  "visceras.alterado.diag": "dilatação da pelve renal esquerda (7 mm)" }));
run("M3 pé torto direito (sem sistema de extremidades -> achados livres)", com(medido(), "achados", { texto: "Pé direito em adução e inversão persistentes, sugestivo de pé torto." }));
run("M4 coração limitado pela posição fetal (sem estado; texto livre)", com(medido(), "achados", { texto: "Avaliação do coração fetal limitada pela posição fetal." }));
run("M5a foco ecogênico intracardíaco via achados livres", com(medido(), "achados", { texto: "Foco ecogênico no ventrículo esquerdo." }));
run("M5b foco ecogênico via Coração alterado (corpo+diag)", com(medido(), "anatomia", { coracao: "alterado",
  "coracao.alterado.corpo": "foco ecogênico no ventrículo esquerdo", "coracao.alterado.diag": "foco ecogênico intracardíaco isolado" }));
// remoção: marcar e desmarcar, sobras no estado
let rem = com(medido(), "anatomia", { visceras: "alterado", "visceras.alterado.corpo": "pelve renal esquerda de 7 mm", "visceras.alterado.diag": "pielectasia esquerda" });
rem = com(rem, "anatomia", { visceras: "normal" });
run("M6 remoção: Vísceras volta a Normal com subcampos ainda no estado", rem);
run("M7 contradição: ILA 30 cm com Líquido 'Normal'", com(medido(), "extrafetal", { ila: "30", liquido_avaliacao: "normal" }));
run("M8 sistema alterado sem texto (pendência bloqueante?)", com(medido(), "anatomia", { face: "alterado" }));
// ditado: o que o renderer faz com anatomia_avaliada=false e com golf ball (flag ON)
const base: any = adaptarMorfologico(medido(), { trimestre: "2t" }).dados;
console.log("\n###### M9 API ditado: anatomia_avaliada=false (limitada)");
console.log(renderMorfologico({ ...base, anatomia_avaliada: false } as any).split("CONCLUSÃO:")[1]);
const gb = detectGolfBall("foco ecogênico intracardíaco no ventrículo esquerdo");
console.log("\n###### M10 API ditado: golf ball (GOLF_BALL_SNIPPET=true simulado)", JSON.stringify(gb));
const t = renderMorfologico({ ...base, achados_adicionais: "Foco ecogênico intracardíaco no ventrículo esquerdo." } as any, null, { golfBall: gb });
console.log(t.split("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:")[1]);
