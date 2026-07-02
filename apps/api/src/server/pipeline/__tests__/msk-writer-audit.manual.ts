/**
 * Golden PURO do fact-audit do MSK writer_guarded (sem LLM).
 * Rodar: tsx src/server/pipeline/__tests__/msk-writer-audit.manual.ts
 */
import { auditMskFacts, auditRevisarNote } from "../mskWriterAudit";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// 1) Laudo bom (medidas e lados presentes, sem estrutura fora do roteiro) → ok.
{
  const raw = "joelho direito com cisto de Baker de 2.4 cm, pé esquerdo com fasciite";
  const laudo = "ULTRASSONOGRAFIA DO JOELHO DIREITO ... cisto de Baker medindo 2,4 cm ... ULTRASSONOGRAFIA DO PÉ ESQUERDO ... Fáscia plantar espessada.";
  const a = auditMskFacts(raw, laudo);
  check("laudo bom: audit ok", a.ok, JSON.stringify(a));
  check("laudo bom: sem nota", auditRevisarNote(a) === null);
}

// 2) DROP de medida → detecta.
{
  const raw = "cisto de Baker medindo 2.4 centímetros";
  const laudo = "Fossa poplítea com cisto de Baker."; // sem a medida
  const a = auditMskFacts(raw, laudo);
  check("drop de medida detectado", !a.ok && a.missingMeasures.includes("2.4"), JSON.stringify(a));
  check("nota [REVISAR] com a medida", /REVISAR:.*2\.4/.test(auditRevisarNote(a) ?? ""));
}

// 3) DROP de lado → detecta.
{
  const raw = "ombro direito com tendinopatia, ombro esquerdo normal";
  const laudo = "ULTRASSONOGRAFIA DO OMBRO DIREITO ... tendinopatia."; // esqueceu o esquerdo
  const a = auditMskFacts(raw, laudo);
  check("drop de lado esquerdo detectado", !a.ok && a.missingSides.includes("esquerdo"), JSON.stringify(a));
}

// 4) OVER-COVERAGE (menisco fora do roteiro) → detecta.
{
  const raw = "joelho direito com tendinopatia da pata de ganso";
  const laudo = "Tendões da pata de ganso espessados. Meniscos sem alterações. Cartilagem preservada.";
  const a = auditMskFacts(raw, laudo);
  check("over-coverage (menisco/cartilagem) detectado", !a.ok && a.extraStructures.includes("menisco") && a.extraStructures.includes("cartilagem"), JSON.stringify(a));
}

// 5) mm² preservado (nervo mediano) → ok.
{
  const raw = "nervo mediano esquerdo medindo 4 milímetros quadrados";
  const laudo = "Área de secção transversa do nervo mediano esquerdo medindo 4,0 mm².";
  const a = auditMskFacts(raw, laudo);
  check("mm² preservado: audit ok", a.ok, JSON.stringify(a));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
