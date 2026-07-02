/**
 * Golden do gap #4 — TIREOIDE COM DOPPLER: pico sistólico não ditado (null).
 * OFF (default) = "____ cm/s" (comportamento atual). ON (flag TIREOIDE_PICO_OMIT) =
 * omite a linha. Clássico e objetivo. Sem LLM.
 * Rodar: tsx src/server/renderer/__tests__/tireoide-pico-null.manual.ts
 */
import { renderTireoide, type TireoideFindings } from "../categories/TIREOIDE";
import { F } from "./tireoide-objetivo-fixtures";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// Doppler ligado, ambos os picos NULL (não ditados).
const semPico = F({ com_doppler: true }) as TireoideFindings;
// Doppler ligado, só o direito ditado.
const soDireito = F({
  com_doppler: true,
  pico_arteria_direita: "polo superior",
  pico_sistolico_direito_cms: 22,
}) as TireoideFindings;

for (const objetivo of [false, true]) {
  const tag = objetivo ? "objetivo" : "clássico";

  // OFF: mantém "____ cm/s" (comportamento atual — byte-compat).
  {
    const l = renderTireoide(semPico, null, { objetivo, omitPicoNull: false });
    check(`${tag} OFF: emite "____ cm/s" (2 linhas)`, (l.match(/____ cm\/s/g) ?? []).length === 2, l);
  }

  // ON: omite as duas linhas de pico null.
  {
    const l = renderTireoide(semPico, null, { objetivo, omitPicoNull: true });
    check(`${tag} ON: sem "____ cm/s"`, !/____ cm\/s/.test(l), l);
    check(`${tag} ON: sem nenhuma linha de pico sistólico`, !/Pico sistólico/.test(l), l);
  }

  // ON com um lado ditado: mantém o ditado, omite só o null.
  {
    const l = renderTireoide(soDireito, null, { objetivo, omitPicoNull: true });
    check(`${tag} ON: preserva o pico ditado (direito 22)`, /Pico sistólico da artéria tireoidiana polo superior direita de 22(,0)? cm\/s\./.test(l), l);
    check(`${tag} ON: omite o pico esquerdo null`, !/esquerda de ____/.test(l) && !/esquerda de.*cm\/s/.test(l), l);
    check(`${tag} ON: só 1 linha de pico`, (l.match(/Pico sistólico/g) ?? []).length === 1, l);
  }
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
