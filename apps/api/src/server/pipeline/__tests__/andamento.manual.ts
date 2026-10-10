/**
 * W16B — andamento em etapas reais com o tempo, e chips de achado só com valor.
 * Rodar (de apps/api): pnpm exec tsx src/server/pipeline/__tests__/andamento.manual.ts
 */
import { GenerateSSEEventSchema, type GenerateSSEEvent } from "@laudousg/shared";
import { ANDAMENTO_PASSOS, criarAndamento, linhaDeTempos } from "../andamento";
import { marcosComValor } from "../../renderer/extraction";

let pass = 0;
let fail = 0;
function check(nome: string, cond: boolean, detalhe = "") {
  if (cond) { pass++; console.log(`  ✓ ${nome}`); }
  else { fail++; console.log(`  ✗ ${nome}${detalhe ? `\n      ${detalhe}` : ""}`); }
}

function cenario(ativo = true) {
  let agora = 1_000_000;
  const eventos: GenerateSSEEvent[] = [];
  let tique: (() => void) | null = null;
  let relogiosAbertos = 0;
  const a = criarAndamento({
    emit: (ev) => eventos.push(ev),
    t0: agora,
    ativo,
    agora: () => agora,
    relogio: {
      set: (fn) => { tique = fn; relogiosAbertos++; return 1; },
      clear: () => { tique = null; relogiosAbertos--; },
    },
  });
  return {
    a,
    eventos,
    labels: () => eventos.filter((e) => e.type === "stage").map((e) => (e as { label: string }).label),
    avanca: (ms: number) => { agora += ms; },
    tica: (ms: number) => { agora += ms; tique?.(); },
    relogioAberto: () => tique !== null,
    relogiosAbertos: () => relogiosAbertos,
  };
}

console.log("\nEtapas e relógio\n");
{
  const c = cenario();
  c.avanca(120);
  c.a.recebido();
  check("1º evento: 'Ditado recebido' (etapa 1 de 4)", c.labels()[0] === "Ditado recebido" && (c.eventos[0] as any).step === 1 && (c.eventos[0] as any).steps === ANDAMENTO_PASSOS && (c.eventos[0] as any).elapsed_ms === 120);
  c.avanca(300);
  c.a.progresso({ stage: "interpretando", label: "Interpretando o ditado…" });
  check("extração: 'Lendo o ditado…' (etapa 2)", c.labels()[1] === "Lendo o ditado…" && (c.eventos[1] as any).step === 2);
  check("relógio armado na extração", c.relogioAberto());
  c.tica(3000);
  check("antes de 4 s o relógio não troca o rótulo", c.labels().length === 2, c.labels().join(" | "));
  c.tica(3000);
  check("depois: 'Lendo o ditado… 6 s'", c.labels().at(-1) === "Lendo o ditado… 6 s", c.labels().join(" | "));
  c.a.progresso({ stage: "achado", label: "biometria fetal" });
  check("achado passa como chip (stage achado), sem mexer no rótulo", c.eventos.at(-1)?.type === "stage" && (c.eventos.at(-1) as any).stage === "achado" && (c.eventos.at(-1) as any).label === "biometria fetal");
  c.tica(3000);
  check("relógio segue: '… 9 s'", c.labels().at(-1) === "Lendo o ditado… 9 s");
  c.avanca(800);
  c.a.progresso({ stage: "montando", label: "Montando o laudo…" });
  check("montando (etapa 3) e relógio parado", c.labels().at(-1) === "Montando o laudo…" && (c.eventos.at(-1) as any).step === 3 && !c.relogioAberto());
  c.a.progresso({ stage: "interpretando", label: "Interpretando o ditado…" });
  check("depois de montando, 'interpretando' atrasado não volta a etapa", c.labels().at(-1) === "Montando o laudo…");
  c.avanca(50);
  c.a.texto();
  c.avanca(200);
  const t = c.a.fim();
  check("tempos: recebido 0,12 s · lendo 0,42 s · montando 10,2 s · texto 10,3 s · done 10,5 s",
    t.recebido_ms === 120 && t.lendo_ms === 420 && t.montando_ms === 10_220 && t.texto_ms === 10_270 && t.total_ms === 10_470, JSON.stringify(t));
  check("linha de log", linhaDeTempos(t) === "recebido 0.1s · lendo 0.4s · montando 10.2s · texto 10.3s · done 10.5s", linhaDeTempos(t));
  check("todos os eventos passam no schema compartilhado", c.eventos.every((e) => GenerateSSEEventSchema.safeParse(e).success));
  check("nenhum relógio vazando", c.relogiosAbertos() === 0);
}

console.log("\nWriter dedicado e rótulos do renderer\n");
{
  const c = cenario();
  c.a.recebido();
  c.avanca(5000);
  c.a.progresso({ stage: "interpretando", label: "Conferindo vasos e medidas…" });
  check("rótulo do renderer mantido, já com o tempo", c.labels().at(-1) === "Conferindo vasos e medidas… 5 s", c.labels().join(" | "));
  c.tica(3000);
  check("relógio com o rótulo do renderer", c.labels().at(-1) === "Conferindo vasos e medidas… 8 s");
  c.a.texto();
  check("primeiro texto para o relógio", !c.relogioAberto());
  c.tica(3000);
  check("sem rótulo depois do texto", c.labels().at(-1) === "Conferindo vasos e medidas… 8 s");
  c.a.parar();
}

console.log("\nDesligado = como antes\n");
{
  const c = cenario(false);
  c.a.recebido();
  c.a.progresso({ stage: "interpretando", label: "Interpretando o ditado…" });
  c.a.texto();
  check("nenhum evento e nenhum relógio", c.eventos.length === 0 && c.relogiosAbertos() === 0);
}

console.log("\nDone com timings no schema\n");
{
  const done = { type: "done", ts: new Date().toISOString(), report_id: "11111111-1111-4111-8111-111111111111", final_text: "x",
    timings: { recebido_ms: 5, lendo_ms: 300, montando_ms: 9000, texto_ms: 9100, total_ms: 9400 } };
  const p = GenerateSSEEventSchema.safeParse(done);
  check("done com timings válido", p.success);
  check("done sem timings continua válido", GenerateSSEEventSchema.safeParse({ ...done, timings: undefined }).success);
}

console.log("\nChips só com valor ditado\n");
{
  const parcial = '{"numero_fetos":1,"fetos":[{"bcf_bpm":142,"dbp_mm":null,"peso_g":null}],"ig_semanas":24,"primeira_us_data":null,' +
    '"placenta_localizacao":"anterior","liquido_ila_cm":null,"liquido_mbv_por_feto_cm":[],"achados_adicionais":"",' +
    '"doppler":{"ip_umbilical":0.98,"ip_acm":nu';
  const m = marcosComValor(parcial);
  check("com valor: batimentos, idade gestacional, placenta, artéria umbilical", ["batimentos", "idade gestacional", "placenta", "artéria umbilical"].every((x) => m.includes(x)), m.join(", "));
  check("null, [] e \"\" não viram chip (peso fetal, biometria, 1ª US, líquido, observações)", !["peso fetal", "biometria fetal", "1ª ultrassonografia", "líquido amniótico", "observações"].some((x) => m.includes(x)), m.join(", "));
  check("valor ainda chegando ('nu…') não vira chip", !m.includes("artéria cerebral média"));
  check("já vistos não repetem", marcosComValor(parcial, new Set(["batimentos"])).includes("batimentos") === false);
  check("lista com item vira chip (miomas)", marcosComValor('"miomas": [ {"figo"').includes("miomas"));
  check("rótulo repetido sai uma vez (líquido por ILA e MBV)", marcosComValor('"liquido_ila_cm":12.1,"mbv_cm":5').filter((x) => x === "líquido amniótico").length === 1);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
