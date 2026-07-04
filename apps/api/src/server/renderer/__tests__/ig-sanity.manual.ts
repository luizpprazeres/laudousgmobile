/**
 * Golden — sanity de IG (boletim 04/07, caso 10813392): divergência implausível
 * entre biometria e referência precoce = erro de ditado → não corrige + [REVISAR].
 * Rodar: tsx src/server/renderer/__tests__/ig-sanity.manual.ts
 */
import { computeIg, buildIgInput, type IgRawFields } from "../ig";

let pass = 0, fail = 0;
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };

const raw = (over: Partial<IgRawFields> = {}): IgRawFields => ({
  biometriaSemanas: 24, biometriaDias: 6,
  dataExame: null, dum: null,
  primeiraUsData: "06/05/2026", primeiraUsIgSemanas: 16, primeiraUsIgDias: 4,
  igRefHojeSemanas: 4, igRefHojeDias: 6, // "hoje com 4 semanas" (erro de ditado)
  referenciaFonte: "usg_precoce", corrigirComando: null,
  ...over,
});
const run = (over: Partial<IgRawFields>, sanityCheck: boolean) =>
  computeIg(buildIgInput(raw(over), { leadAncora: "Gestação em torno de ", leadBase: "Gestação em torno de ", sanityCheck }));

// ── CASO REAL 10813392: biometria 24s6d, "hoje com 4s6d" (divergência ~20 semanas) ──
{
  const semSanity = run({}, false);
  ck(/devendo ser corrigida/.test(semSanity.conclusaoClassico) && /4 semanas/.test(semSanity.conclusaoClassico),
    "SEM sanity: reproduz o bug (corrige p/ 4 semanas)", semSanity.conclusaoClassico);

  const comSanity = run({}, true);
  ck(comSanity.caso === "divergente_implausivel", "COM sanity: caso divergente_implausivel");
  ck(/Gestação em torno de 24 semanas e 6 dias\.?$/.test(comSanity.conclusaoClassico.trim()),
    "COM sanity: conclusão = biometria pura (24s6d), sem correção absurda", comSanity.conclusaoClassico);
  ck(!/devendo ser corrigida/.test(comSanity.conclusaoClassico), "COM sanity: NÃO emite 'devendo ser corrigida'");
  ck(/REVISAR: divergência implausível/.test(comSanity.fraseReferencia ?? ""), "COM sanity: [REVISAR] na frase de referência", comSanity.fraseReferencia ?? "");
}

// ── NÃO regride divergência PLAUSÍVEL (correção Domingos real, 14 dias) ──
{
  // biometria 24s6d, referência hoje 25s4d → divergência 5 dias (correção legítima).
  const plausivel = run({ igRefHojeSemanas: 22, igRefHojeDias: 6 }, true);
  ck(plausivel.caso === "divergente" && /devendo ser corrigida/.test(plausivel.conclusaoClassico),
    "sanity ON + divergência plausível (14d) → correção Domingos normal", plausivel.conclusaoClassico);
}

// ── limiar: 28 dias (4 semanas) exatos = ainda plausível; 29 = implausível ──
{
  // biometria 20s0d (140d); ref hoje 24s0d (168d) → divergência 28d = limiar (plausível).
  const limite = run({ biometriaSemanas: 20, biometriaDias: 0, igRefHojeSemanas: 24, igRefHojeDias: 0, primeiraUsIgSemanas: 20, primeiraUsIgDias: 0 }, true);
  ck(limite.caso !== "divergente_implausivel", "divergência = 28d (limiar) → ainda tratado como correção (não implausível)");
  // divergência 29d (20s0d vs 24s1d) → implausível.
  const acima = run({ biometriaSemanas: 20, biometriaDias: 0, igRefHojeSemanas: 24, igRefHojeDias: 1, primeiraUsIgSemanas: 20, primeiraUsIgDias: 0 }, true);
  ck(acima.caso === "divergente_implausivel", "divergência = 29d (>limiar) → implausível");
}

// ── flag OFF byte-estável: sanity=false → comportamento idêntico ao legado ──
{
  ck(run({}, false).conclusaoClassico === run({}, false).conclusaoClassico, "determinístico");
  ck(run({ igRefHojeSemanas: 22, igRefHojeDias: 6 }, false).caso === "divergente", "flag OFF: divergência normal segue 'divergente'");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
