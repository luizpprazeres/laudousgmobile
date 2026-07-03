/**
 * Golden PURO do DOPPLER_VENOSO_MMII writer (prompt + fact-audit, sem LLM).
 * Rodar: tsx src/server/pipeline/__tests__/doppler-venoso-writer.manual.ts
 */
import { buildDopplerVenosoMmiiWriterSystemMessage } from "../../renderer/categories/DOPPLER_VENOSO_MMII";
import { DOPPLER_VENOSO_MMII_FEWSHOTS } from "../../renderer/categories/dopplerVenosoMmiiFewshots";
import { auditDopplerVenosoFacts, dopplerVenosoRevisarNote } from "../dopplerVenosoMmiiWriterAudit";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const p = buildDopplerVenosoMmiiWriterSystemMessage();
check("distingue TVP-only vs completo", /TVP-ONLY/.test(p) && /COMPLETO/.test(p));
check("título TVP-only com INVESTIGAÇÃO DE TVP", /INVESTIGAÇÃO DE TROMBOSE VENOSA PROFUNDA/.test(p));
check("SEGURANÇA: nunca afirmar superficial em TVP-only", /NUNCA afirme competência\/normalidade de safenas/.test(p));
check("regra nunca ____", /NUNCA escreva "____"/.test(p));
check("TVP presente → descreve segmento + conclusão", /Trombose venosa profunda em \{segmento\}/.test(p));

// Few-shots
check("few-shots: 5 pares", DOPPLER_VENOSO_MMII_FEWSHOTS.length === 5);
check("few-shots: nenhum ____", DOPPLER_VENOSO_MMII_FEWSHOTS.every((f) => !f.laudo.includes("____")));
check("few-shot TVP-only NÃO afirma safena competente", DOPPLER_VENOSO_MMII_FEWSHOTS.some((f) =>
  /INVESTIGAÇÃO DE TROMBOSE/.test(f.laudo) && !/safena.{0,30}competente/i.test(f.laudo) && /protocolo TVP/i.test(f.raw)));
check("few-shot TVP POSITIVA (trombose achada)", DOPPLER_VENOSO_MMII_FEWSHOTS.some((f) =>
  /Trombose venosa profunda da veia popl[íi]tea/.test(f.laudo)));
check("few-shot completo com refluxo superficial", DOPPLER_VENOSO_MMII_FEWSHOTS.some((f) =>
  /insufici[êe]ncia venosa superficial/.test(f.laudo)));

// ── Fact-audit ──
// SEGURANÇA: TVP-only + laudo afirma safena competente → detecta.
{
  const raw = "Doppler venoso MI direito, investigar TVP, suspeita trombose. Sistema profundo pérvio, sem trombose.";
  const laudo = "...INVESTIGAÇÃO DE TROMBOSE...\nSistema venoso profundo pérvio.\nVeia safena magna competente, sem refluxo.\nCONCLUSÃO:\nSistema profundo pérvio.";
  const a = auditDopplerVenosoFacts(raw, laudo);
  check("audit: superficial afirmado em TVP-only detectado", a.superficialEmTvpOnly && !a.ok, JSON.stringify(a));
  check("nota [REVISAR] cita superficial", /superficial/.test(dopplerVenosoRevisarNote(a) ?? ""));
}
// TVP-only correto (só profundo) → ok.
{
  const raw = "Doppler venoso MI esquerdo, protocolo TVP. Veias femoral e poplítea pérvias, sem trombos.";
  const laudo = "...INVESTIGAÇÃO...\nSistema venoso profundo:\nVeias femoral e poplítea pérvias e compressíveis, sem trombos.\nCONCLUSÃO:\nSistema venoso profundo do membro inferior esquerdo pérvio e compressível, sem evidência ecográfica de trombose venosa.";
  const a = auditDopplerVenosoFacts(raw, laudo);
  check("audit: TVP-only restrito ao profundo → ok", a.ok, JSON.stringify(a));
}
// COMPLETO (mapeamento varizes) afirmando safena → NÃO é violação (foi avaliado).
{
  const raw = "Doppler venoso MI direito, mapeamento de varizes. Safena magna competente.";
  const laudo = "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR DIREITO\n...\nSistema venoso superficial:\nVeia safena magna competente, sem refluxo.\nCONCLUSÃO:\n1) Sistema venoso profundo do membro inferior direito pérvio. 2) Safena magna competente.";
  const a = auditDopplerVenosoFacts(raw, laudo);
  check("audit: completo pode afirmar safena → ok", a.ok, JSON.stringify(a));
}
// Placeholder + lado ausente.
{
  const a = auditDopplerVenosoFacts("MI direito, TVP", "Sistema profundo do membro inferior esquerdo ____.");
  check("audit: placeholder detectado", a.placeholder);
  check("audit: lado direito ausente (laudo diz esquerdo) detectado", a.ladoAusente, JSON.stringify(a));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
