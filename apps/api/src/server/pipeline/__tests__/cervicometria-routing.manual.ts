/**
 * Golden do roteamento CERVICOMETRIA (review dex1): override por texto bruto que
 * pega ditados de "medida do colo" que o structurer classificaria como PELVE.
 * Gated por knownCodes (dormente até o row no DB). Sem LLM.
 * Rodar: tsx src/server/pipeline/__tests__/cervicometria-routing.manual.ts
 */
import { resolveCervicometriaCategory } from "../categoryNormalization";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const KNOWN = new Set(["PELVE_FEMININA", "OBSTETRICA", "CERVICOMETRIA"]);
const KNOWN_SEM = new Set(["PELVE_FEMININA", "OBSTETRICA"]); // CERVICOMETRIA ausente

// Structurer classificou como PELVE, mas o ditado é cervicometria → override.
{
  const r = resolveCervicometriaCategory("PELVE_FEMININA", "Ultrassonografia da medida do colo uterino, colo de 3,2 cm.", KNOWN);
  check("'medida do colo uterino' → CERVICOMETRIA (override de PELVE)", r.category === "CERVICOMETRIA" && r.overridden, JSON.stringify(r));
}
{
  const r = resolveCervicometriaCategory("PELVE_FEMININA", "Cervicometria transvaginal.", KNOWN);
  check("'cervicometria' → CERVICOMETRIA", r.category === "CERVICOMETRIA" && r.overridden);
}
{
  const r = resolveCervicometriaCategory("OBSTETRICA", "Medida do comprimento do colo uterino.", KNOWN);
  check("'comprimento do colo' → CERVICOMETRIA", r.category === "CERVICOMETRIA" && r.overridden);
}

// NÃO dispara em pelve geral que apenas cita "colo uterino".
{
  const r = resolveCervicometriaCategory("PELVE_FEMININA", "Pelve transvaginal, útero AVF, colo uterino sem alterações, ovários normais.", KNOWN);
  check("pelve geral com 'colo uterino' solto → NÃO vira cervicometria", r.category === "PELVE_FEMININA" && !r.overridden, JSON.stringify(r));
}

// GATE: sem o row no DB (CERVICOMETRIA fora de knownCodes) → nunca sobrescreve.
{
  const r = resolveCervicometriaCategory("PELVE_FEMININA", "Ultrassonografia da medida do colo uterino.", KNOWN_SEM);
  check("gate: CERVICOMETRIA fora de knownCodes → dormente (sem override)", r.category === "PELVE_FEMININA" && !r.overridden, JSON.stringify(r));
}

// Já é CERVICOMETRIA → mantém, sem marcar overridden.
{
  const r = resolveCervicometriaCategory("CERVICOMETRIA", "Medida do colo.", KNOWN);
  check("já CERVICOMETRIA → mantém, overridden=false", r.category === "CERVICOMETRIA" && !r.overridden);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
