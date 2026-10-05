/**
 * Prova sintética — "Tireoide com Doppler" (lote 3, 05/10/2026).
 * Caminho Web real: estado da tela → adaptarTireoide → renderizarSelecao("TIREOIDE", estilo, specs, dados).
 * Rode duas vezes: TIREOIDE_PICO_OMIT=true (produção) e sem a flag.
 */
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
import { alteracoesDe } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes/index";
import { initialTireoideState, type NoduloTireoide, type TireoideState } from "../../../../../apps/web/src/lib/deterministic/organs/tireoide";
import { adaptarTireoide } from "../../../../../apps/web/src/lib/catalog/tireoideParaCatalogo";

function run(nome: string, e: TireoideState, estilo = "CLASSICO_COMPLETO") {
  const a = adaptarTireoide(e);
  const specs = a.alteracoes.map((id) => alteracoesDe("TIREOIDE").find((s) => s.id === id)).filter((s) => s !== undefined);
  const r: any = renderizarSelecao("TIREOIDE", estilo, specs as never, a.dados as never);
  console.log(`\n###### ${nome} [${estilo}] | alteracoes=${JSON.stringify(a.alteracoes)} | pendencias=${JSON.stringify(a.pendencias)}`);
  console.log(`dados: com_doppler=${a.dados.com_doppler} picos=${a.dados.pico_sistolico_direito_cms}/${a.dados.pico_sistolico_esquerdo_cms} linfonodos_descritos=${a.dados.linfonodos_descritos} alterados=${a.dados.linfonodos_alterados}`);
  console.log(r.ok ? r.texto : JSON.stringify(r));
}

const medidas = (s: TireoideState): TireoideState => ({
  ...s,
  volumeGlandular: "normal",
  lobo_direito: { a: "1,5", b: "1,6", c: "4,5", ecotextura: "normal" },
  lobo_esquerdo: { a: "1,4", b: "1,5", c: "4,3", ecotextura: "normal" },
  istmo: { a: "0,3", b: "1,8", c: "1,5", ecotextura: "normal" },
});
const nod = (vasc: string | null): NoduloTireoide => ({
  id: "n1", lobo: "lobo_direito", ecogenicidade: "hipoecoica", margem: "regular", halo: "sem_halo",
  forma: "mais_larga_que_alta", calcificacoes: "sem", vascularizacao: vasc, c1: "1,4", c2: "1,1", c3: "0,9",
  localizacao: "no terço médio", acrComposicao: "solido", acrEcogenicidade: "hipoecoico",
  acrForma: "mais_larga_que_alta", acrMargem: "lisa", acrFocos: ["nenhum_ou_cauda_cometa"],
});

console.log("PICO_OMIT =", process.env.TIREOIDE_PICO_OMIT);
const ini = initialTireoideState();
console.log("estado inicial:", JSON.stringify({ doppler: ini.doppler, avaliarLinfonodos: ini.avaliarLinfonodos, linfonodos: ini.linfonodos, volumeGlandular: ini.volumeGlandular }));

// T1 estado inicial (nada preenchido)
run("T1 estado inicial, sem Doppler", ini);
run("T1 estado inicial, sem Doppler", ini, "OBJETIVO");
// T1b só o botão Doppler ligado
run("T1b só Doppler ligado, nada medido", { ...ini, doppler: true });

// T2 parênquima hipervascular difuso: a tela não tem campo de padrão vascular; o mais próximo = picos altos
const base = medidas(ini);
run("T2a Doppler + picos 78/82 cm/s, ecotextura normal (Graves pretendido)", { ...base, doppler: true, picoDireito: "78", picoEsquerdo: "82" });
run("T2a objetivo", { ...base, doppler: true, picoDireito: "78", picoEsquerdo: "82" }, "OBJETIVO");
run("T2b Doppler + picos 78/82 + ecotextura heterogênea nos lobos", {
  ...base, doppler: true, picoDireito: "78", picoEsquerdo: "82",
  lobo_direito: { ...base.lobo_direito, ecotextura: "heterogenea" }, lobo_esquerdo: { ...base.lobo_esquerdo, ecotextura: "heterogenea" },
});
run("T2c Doppler + só pico direito 78 (esquerdo não medido)", { ...base, doppler: true, picoDireito: "78" });

// T3 nódulo com vascularização central × sem vascularização
run("T3a nódulo LD sem vasc. classificada, Doppler ligado", { ...base, doppler: true, nodulos: [nod(null)] });
run("T3b mesmo nódulo, vasc. exclusivamente central, Doppler ligado", { ...base, doppler: true, nodulos: [nod("exclusiva_central")] });
run("T3b objetivo", { ...base, doppler: true, nodulos: [nod("exclusiva_central")] }, "OBJETIVO");

// T4 Doppler não realizado, mas vasc. do nódulo e picos digitados (sobra de estado)
run("T4 Doppler DESLIGADO com vasc. central no nódulo e picos digitados", { ...base, doppler: false, picoDireito: "78", picoEsquerdo: "82", nodulos: [nod("exclusiva_central")] });

// T5 remoção
run("T5 remoção: Doppler ligado→desligado, nódulo removido, linfonodos 'suspeitos'→'preservados'", { ...base, doppler: false, picoDireito: "78", picoEsquerdo: "82", nodulos: [], linfonodos: "preservados" });
run("T5 linfonodos desligados (avaliarLinfonodos=false)", { ...base, avaliarLinfonodos: false });
