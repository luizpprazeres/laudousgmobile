/**
 * Quando um laudo pode — e quando NÃO pode — virar `discarded`.
 *
 * Rodar de apps/api:
 *   pnpm exec tsx src/server/pipeline/__tests__/descarteGuard.manual.ts
 *
 * O guard de descarte (generate/route.ts) resolve um problema real: um laudo
 * cujo pipeline falha ficava `draft` para sempre, indistinguível de rascunho
 * legítimo. Mas ele tem duas maneiras de causar dano maior que o que conserta,
 * e as duas foram achadas na revisão do Codex DEPOIS do deploy:
 *
 *  1. classificar cancelamento pelo NOME do erro deixa passar os casos em que
 *     o abort sobe como DOMException / TypeError do undici / stream fechado —
 *     e aí um laudo que o médico só pausou vira descartado, matando a retomada;
 *  2. o que falha DEPOIS do `done` (esquema venoso, sanity de IA) é acessório;
 *     rebaixar por causa disso descarta um texto que o médico já tem na tela.
 *
 * O teste IMPORTA a mesma função que o pipeline usa (`descarteDecision.ts`).
 * A primeira versão espelhava a regra aqui dentro, e o @devops notou o furo:
 * uma cópia trava o conceito no papel mas não detecta divergência do código
 * real. Agora, se alguém mudar a decisão, este arquivo acusa.
 */

import { decidirDescarte } from "../descarteDecision";

let ok = 0;
const falhas: string[] = [];
function check(nome: string, cond: boolean, extra?: unknown) {
  if (cond) ok++;
  else falhas.push(nome + (extra === undefined ? "" : ` — ${JSON.stringify(extra)}`));
}

const decidir = (args: { erro: Error; signalAbortado: boolean; laudoEntregue: boolean }) =>
  decidirDescarte(args);

const generico = new Error("boom");
const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
// Como o cancelamento realmente chega em runtime, quando não é AbortError:
const domException = Object.assign(new Error("This operation was aborted"), {
  name: "AbortError2",
});
const undiciTerminated = Object.assign(new Error("terminated"), { name: "TypeError" });

console.log("\n[cancelamento NÃO é descarte]\n");

check(
  "AbortError clássico → aborted, sem descartar",
  (() => {
    const r = decidir({ erro: abortError, signalAbortado: true, laudoEntregue: false });
    return r.outcome === "aborted" && !r.marcaDescartado;
  })(),
);

check(
  "abort que sobe como DOMException → o SIGNAL salva",
  (() => {
    const r = decidir({ erro: domException, signalAbortado: true, laudoEntregue: false });
    return r.outcome === "aborted" && !r.marcaDescartado;
  })(),
);

check(
  "abort que sobe como TypeError('terminated') do undici → o SIGNAL salva",
  (() => {
    const r = decidir({ erro: undiciTerminated, signalAbortado: true, laudoEntregue: false });
    return r.outcome === "aborted" && !r.marcaDescartado;
  })(),
);

check(
  "e SEM o signal, esses dois cairiam em descarte — que é o bug que isto corrige",
  (() => {
    const semSignal = (e: Error) => decidir({ erro: e, signalAbortado: false, laudoEntregue: false });
    return semSignal(domException).marcaDescartado && semSignal(undiciTerminated).marcaDescartado;
  })(),
);

console.log("[falha REAL descarta — é para isso que o guard existe]\n");

check(
  "erro antes de entregar → descarta",
  (() => {
    const r = decidir({ erro: generico, signalAbortado: false, laudoEntregue: false });
    return r.outcome === "error" && r.marcaDescartado;
  })(),
);

console.log("[laudo já entregue NUNCA é rebaixado]\n");

check(
  "erro no esquema venoso, depois do done → NÃO descarta",
  (() => {
    const r = decidir({ erro: generico, signalAbortado: false, laudoEntregue: true });
    return r.outcome === "error" && !r.marcaDescartado;
  })(),
);

check(
  "erro no sanity de IA, depois do done → NÃO descarta",
  (() => {
    const r = decidir({
      erro: new Error("runSanityCheck failed"),
      signalAbortado: false,
      laudoEntregue: true,
    });
    return !r.marcaDescartado;
  })(),
);

check(
  "cancelar DEPOIS de entregue também não descarta",
  (() => {
    const r = decidir({ erro: abortError, signalAbortado: true, laudoEntregue: true });
    return r.outcome === "aborted" && !r.marcaDescartado;
  })(),
);

console.log(`\n${ok} passaram, ${falhas.length} falharam`);
for (const f of falhas) console.log("  ✗", f);
console.log();
process.exit(falhas.length === 0 ? 0 : 1);
