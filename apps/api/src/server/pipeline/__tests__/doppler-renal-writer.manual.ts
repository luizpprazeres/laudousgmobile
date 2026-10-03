/**
 * Golden PURO do DOPPLER_RENAL writer (prompt + fact-audit, sem LLM).
 * Rodar: tsx src/server/pipeline/__tests__/doppler-renal-writer.manual.ts
 */
import { buildDopplerRenalWriterSystemMessage } from "../../renderer/categories/DOPPLER_RENAL";
import { DOPPLER_RENAL_FEWSHOTS } from "../../renderer/categories/dopplerRenalFewshots";
import {
  assertDopplerRenalAuditPassed,
  auditDopplerRenalFacts,
  DopplerRenalAuditError,
  dopplerRenalRevisarNote,
  isDopplerRenalAuditError,
} from "../dopplerRenalWriterAudit";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// ── Prompt ──
const p = buildDopplerRenalWriterSystemMessage();
check("título das artérias renais", /ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS/.test(p));
check("COMENTÁRIOS transdutor convexo + ângulo ≤60", /transdutor convexo \(3-5 MHz\)/.test(p) && /Ângulo Doppler ≤ 60°/.test(p));
check("regra NUNCA ____", /NUNCA escreva "____"/.test(p) && /Segmento não medido/.test(p));
check("critério estenose VPS>250 ou RAR>3,2", /VPS > 250 cm\/s.*RAR > 3,2|RAR > 3,2/.test(p) && /JVB 2005/.test(p));
check("proíbe % de estenose", /NUNCA classifique PERCENTUAL/.test(p));
check("default sugestivo sem critério forte", /linguagem SUGESTIVA/.test(p) && /não asseverar grau/.test(p));
check("conclusão normal canônica", /fluxo preservado bilateralmente, sem evidência ecográfica de estenose/.test(p));
check("aorta não é presumida", /Se a aorta não foi mencionada, não escreva nenhuma frase sobre ela/.test(p));
check("normalidade bilateral e IR dependem do ditado", /não afirme fluxo preservado bilateralmente/.test(p) && /não afirme IR normal/.test(p));
check("tardus-parvus isolado permanece sugestivo", /tardus-parvus" é achado sugestivo/.test(p));
check("comandos são instruções", /Comandos ditados são INSTRUÇÕES/.test(p));

// ── Few-shots ──
check("few-shots: 4 pares", DOPPLER_RENAL_FEWSHOTS.length === 4);
check("few-shots: nenhum tem ____", DOPPLER_RENAL_FEWSHOTS.every((f) => !f.laudo.includes("____")));
check("few-shots: todo laudo tem cabeçalhos", DOPPLER_RENAL_FEWSHOTS.every((f) =>
  /^ULTRASSONOGRAFIA COM DOPPLER/.test(f.laudo) && f.laudo.includes("COMENTÁRIOS:") && f.laudo.includes("CONCLUSÃO:")));
check("few-shots: todos passam no auditor renal", DOPPLER_RENAL_FEWSHOTS.every((f) =>
  auditDopplerRenalFacts(f.raw, f.laudo).ok));
check("few-shot estenose: afirma só com VPS 320 + RAR 3,8", DOPPLER_RENAL_FEWSHOTS.some((f) =>
  /320/.test(f.raw) && /estenose hemodinamicamente significativa/.test(f.laudo)));
check("few-shot sugestivo: não afirma estenose significativa (VPS 210/RAR 2,8)", DOPPLER_RENAL_FEWSHOTS.some((f) =>
  /210/.test(f.raw) && /sugestivos de estenose/.test(f.laudo) && !/hemodinamicamente significativa/.test(f.laudo)));

// ── Fact-audit ──
// Normal → ok.
{
  const raw = "Aorta VPS 90. Renal direita VPS 120, esquerda 110. RAR 1,3 e 1,2. IR 0,62 bilateral. Sem estenose.";
  const laudo = "Aorta abdominal com VPS de 90 cm/s. Artéria renal direita: VPS de 120 cm/s. Artéria renal esquerda: VPS de 110 cm/s. RAR de 1,3 à direita e 1,2 à esquerda. IR intrarrenal de 0,62 bilateralmente.\n\nCONCLUSÃO:\nArtérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit normal: ok", a.ok, JSON.stringify(a));
}

// Troca direita/esquerda com os mesmos números presentes → falha por contexto.
{
  const raw = "VPS direita 120, esquerda 110. RAR direita 1,3, esquerda 1,2.";
  const laudo = "VPS de 110 cm/s à direita e 120 cm/s à esquerda. RAR de 1,2 à direita e 1,3 à esquerda.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: troca de lateralidade detectada", !a.ok && a.mismatchedMeasures.includes("VPS direita 120") && a.mismatchedMeasures.includes("RAR esquerda 1,2"), JSON.stringify(a));
}

// Mesmo número associado ao parâmetro errado não satisfaz a auditoria.
{
  const raw = "RAR direita 1,3. IR direita 0,62.";
  const laudo = "IR intrarrenal de 1,3 à direita. RAR de 0,62 à direita.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: troca RAR/IR detectada", !a.ok && a.mismatchedMeasures.includes("RAR direita 1,3") && a.mismatchedMeasures.includes("IR direita 0,62"), JSON.stringify(a));
}

// Normalidades não ditadas não podem completar o exame.
{
  const raw = "Artéria renal direita VPS 120.";
  const laudo = "Aorta abdominal de calibre preservado. Artéria renal direita com VPS de 120 cm/s.\nCONCLUSÃO:\nArtérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa. Índices de resistência intrarrenais dentro dos limites da normalidade.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: aorta/fluxo bilateral/IR não ditados detectados", !a.ok && a.unsupportedAssertions.length === 3, JSON.stringify(a));
  let blocked = false;
  try { assertDopplerRenalAuditPassed(a); } catch (error) { blocked = error instanceof DopplerRenalAuditError; }
  check("writer guard: falha crítica lança erro e bloqueia entrega", blocked);
  check("route guard: erro renal é reconhecido sem fallback genérico", isDopplerRenalAuditError({ code: "DOPPLER_RENAL_AUDIT_FAILED" }));
}

// Padrão indireto ou suspeita isolada não autorizam upgrade para estenose significativa.
for (const raw of ["Tardus-parvus intrarrenal à direita.", "Suspeita de estenose da artéria renal direita."]) {
  const laudo = "CONCLUSÃO:\nEstenose hemodinamicamente significativa da artéria renal direita.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check(`audit: ${raw.split(".")[0]} não confirma significância`, a.estenoseSemCriterio && !a.ok, JSON.stringify(a));
}

// IR fora da faixa adotada não pode receber conclusão bilateral normal.
{
  const raw = "IR intrarrenal de 0,85 à direita e 0,62 à esquerda.";
  const laudo = "IR intrarrenal de 0,85 à direita e 0,62 à esquerda.\nCONCLUSÃO:\nÍndices de resistência intrarrenais dentro dos limites da normalidade bilateralmente.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: IR elevado não pode ser concluído como normal", a.unsupportedAssertions.includes("IR fora da faixa adotada tratado como normal") && !a.ok, JSON.stringify(a));
}
// Placeholder → detecta.
{
  const a = auditDopplerRenalFacts("renal VPS 120", "Artéria renal direita: VPS de 120 cm/s no ostio, ____ cm/s no terço médio.");
  check("audit: placeholder ____ detectado", a.placeholder && !a.ok);
}
// % de estenose → detecta.
{
  const a = auditDopplerRenalFacts("renal direita VPS 300, estenose", "Estenose de 70% na artéria renal direita.");
  check("audit: % de estenose detectado", a.percentEstenose && !a.ok, JSON.stringify(a));
}
// Estenose afirmada SEM critério forte → detecta.
{
  const raw = "renal esquerda VPS 210, RAR 2,8"; // 210<250, 2,8<3,2, sem "estenose"
  const laudo = "Artéria renal esquerda com sinais de estenose hemodinamicamente significativa (VPS de 210 cm/s).";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: estenose sem critério forte detectada", a.estenoseSemCriterio && !a.ok, JSON.stringify(a));
  check("nota [REVISAR] cita estenose sem critério", /sem crit[ée]rio forte/i.test(dopplerRenalRevisarNote(a) ?? ""));
}
// Estenose COM critério forte (VPS>250) → não flag de critério.
{
  const raw = "renal direita VPS 320, RAR 3,8, estenose significativa";
  const laudo = "Artéria renal direita: VPS de 320 cm/s. RAR de 3,8 à direita.\nCONCLUSÃO:\nArtéria renal direita com sinais ecográficos de estenose hemodinamicamente significativa (VPS de 320 cm/s e RAR de 3,8).";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: estenose com critério (VPS 320/RAR 3,8) → ok", a.ok, JSON.stringify(a));
}
// Medida ditada ausente → detecta.
{
  const raw = "renal direita VPS 120, RAR 1,3";
  const laudo = "Artéria renal direita: VPS de 120 cm/s."; // dropou RAR 1,3
  const a = auditDopplerRenalFacts(raw, laudo);
  check("audit: RAR 1,3 dropada detectada", !a.ok && a.missingMeasures.includes("1,3"), JSON.stringify(a));
}

// ── Apertos do review dex1 ──
// (#1) Afirmação "pelada" de estenose (sem lead "com sinais") SEM critério → detecta.
{
  const raw = "renal direita VPS 180, RAR 2,0"; // sem critério forte
  const laudo = "CONCLUSÃO:\nEstenose hemodinamicamente significativa da artéria renal direita.";
  const a = auditDopplerRenalFacts(raw, laudo);
  check("dex1 #1: afirmação pelada de estenose sem critério detectada", a.estenoseSemCriterio && !a.ok, JSON.stringify(a));
}
// (#1) Forma NEGADA normal não é afirmação.
{
  const a = auditDopplerRenalFacts("renal 120 e 110, sem estenose", "sem evidência ecográfica de estenose hemodinamicamente significativa.");
  check("dex1 #1: 'sem evidência de estenose...' não é afirmação", !a.estenoseSemCriterio && a.ok, JSON.stringify(a));
}
// (#2) Formato compacto "VPS à direita 120 e à esquerda 110" — ambos extraídos.
{
  const raw = "Doppler renal. VPS à direita 120 e à esquerda 110. Sem estenose.";
  const laudoOk = "Artéria renal direita: VPS de 120 cm/s. Artéria renal esquerda: VPS de 110 cm/s.\nCONCLUSÃO:\nArtérias renais com fluxo preservado.";
  const laudoDrop = "Artéria renal direita: VPS de 120 cm/s.\nCONCLUSÃO:\nnormal."; // dropou 110
  check("dex1 #2: VPS compacto ambos presentes → ok", auditDopplerRenalFacts(raw, laudoOk).ok, JSON.stringify(auditDopplerRenalFacts(raw, laudoOk)));
  check("dex1 #2: VPS compacto — drop de 110 detectado", auditDopplerRenalFacts(raw, laudoDrop).missingMeasures.includes("110"));
}
// (#2) "RAR direita 1,3, esquerda 1,2" — 2º valor sem rótulo detectado se dropado.
{
  const raw = "RAR direita 1,3, esquerda 1,2.";
  const laudoDrop = "Relação aorto-renal (RAR) de 1,3 à direita.\nCONCLUSÃO:\nnormal."; // dropou 1,2
  const a = auditDopplerRenalFacts(raw, laudoDrop);
  check("dex1 #2: RAR 2º valor (1,2) sem rótulo — drop detectado", a.missingMeasures.includes("1,2"), JSON.stringify(a));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
