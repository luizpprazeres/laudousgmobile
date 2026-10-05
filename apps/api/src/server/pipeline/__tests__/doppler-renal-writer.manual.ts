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

const p = buildDopplerRenalWriterSystemMessage();
check("frase aórtica no singular", /nível da emergência das artérias renais/.test(p) && !/nível das emergências/.test(p));
check("rins por lado, L × AP × T e espessura", /cada lado separadamente/.test(p) && /longitudinal × anteroposterior × transversal/.test(p) && /espessura do parênquima/.test(p));
check("TA e IA adjuvantes", /Tempo de aceleração \(TA\) e índice de aceleração \(IA\)/.test(p) && /parâmetros adjuvantes/.test(p));
check("limítrofe só no corpo", /Faixa limítrofe[^\n]+apenas no CORPO/.test(p));
check("RAR bloqueada para diagnóstico", /qualquer valor de RAR/.test(p) && /limiar diagnóstico da RAR permanece bloqueado/.test(p));
check("confirmação verbal isolada não basta", /Confirmação verbal isolada/.test(p));
check("assimetria estrita >1,8 pelo maior eixo", /maior eixo de cada lado/.test(p) && /estritamente maior que 1,8/.test(p));
check("R9 descritivo sem inferência", /Não transforme fluxo não detectado em oclusão/.test(p) && /reestenose/.test(p));
check("placeholder limitado a R3", /EXCETO no cenário R3/.test(p) && /Nenhum outro placeholder é permitido/.test(p));
check("seis few-shots", DOPPLER_RENAL_FEWSHOTS.length === 6);
check("few-shots passam no audit", DOPPLER_RENAL_FEWSHOTS.every((f) => auditDopplerRenalFacts(f.raw, f.laudo).ok), JSON.stringify(DOPPLER_RENAL_FEWSHOTS.map((f) => auditDopplerRenalFacts(f.raw, f.laudo))));

{
  const a = auditDopplerRenalFacts("RAR direita 3,4. Confirmo estenose significativa.", "RAR de 3,4 à direita. CONCLUSÃO: Estenose hemodinamicamente significativa da artéria renal direita.");
  check("RAR 3,4 e confirmação verbal não autorizam estenose", a.estenoseSemCriterio && !a.ok, JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("Renal direita VPS 290 no segmento proximal. Não foi possível calcular a RAR direita porque a VPS aórtica não foi obtida.", "Artéria renal direita com sinais de estenose, apresentando velocidade de pico sistólico de 290 cm/s no segmento proximal e relação aorto-renal de ____. CONCLUSÃO: Estenose hemodinamicamente significativa da artéria renal direita.");
  check("placeholder R3 exato permitido", a.ok, JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("Renal direita VPS 120.", "Artéria renal direita VPS 120 cm/s e ____ no segmento médio.");
  check("outro placeholder bloqueado", a.placeholder && !a.ok, JSON.stringify(a));
}
{
  const ok = auditDopplerRenalFacts("TA direita 78 ms. IA direita 2,8 m/s².", "Tempo de aceleração à direita de 78 ms. Índice de aceleração à direita de 2,8 m/s².");
  check("TA e IA preservadas por lado", ok.ok, JSON.stringify(ok));
  const bad = auditDopplerRenalFacts("TA direita 78 ms. IA direita 2,8 m/s².", "TA 78 ms e IA 2,8 m/s² à direita. CONCLUSÃO: Estenose hemodinamicamente significativa da artéria renal direita.");
  check("TA e IA isolados não autorizam estenose", bad.estenoseSemCriterio && !bad.ok, JSON.stringify(bad));
}
{
  const a = auditDopplerRenalFacts("Rim direito 11,0 x 4,0 x 3,5 cm. Rim esquerdo 9,1 x 5,0 x 4,0 cm.", "Rim direito 11,0 x 4,0 x 3,5 cm. Rim esquerdo 9,1 x 5,0 x 4,0 cm. CONCLUSÃO:");
  check("assimetria >1,8 exigida", !a.ok && a.unsupportedAssertions.some((x) => x.includes("ausente")), JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("Rim direito 10,9 x 4,0 x 3,5 cm. Rim esquerdo 9,1 x 4,0 x 3,5 cm.", "CONCLUSÃO: Assimetria renal.");
  check("1,8 exato não conclui assimetria", !a.ok && a.unsupportedAssertions.some((x) => x.includes("estritamente")), JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("Fluxo não detectado no stent renal direito.", "CONCLUSÃO: Oclusão do stent renal direito.");
  check("R9 não infere oclusão", !a.ok && a.unsupportedAssertions.some((x) => x.includes("oclusão")), JSON.stringify(a));
}

// Regressões do audit anterior que continuam obrigatórias.
{
  const raw = "Aorta VPS 90. Renal direita VPS 120, esquerda 110. RAR 1,3 e 1,2. IR 0,62 bilateral. Sem estenose.";
  const laudo = "Aorta abdominal com VPS de 90 cm/s. Artéria renal direita: VPS de 120 cm/s. Artéria renal esquerda: VPS de 110 cm/s. RAR de 1,3 à direita e 1,2 à esquerda. IR intrarrenal de 0,62 bilateralmente. CONCLUSÃO: Artérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa.";
  check("audit normal permanece válido", auditDopplerRenalFacts(raw, laudo).ok, JSON.stringify(auditDopplerRenalFacts(raw, laudo)));
}
{
  const a = auditDopplerRenalFacts(
    "VPS direita 120, esquerda 110. RAR direita 1,3, esquerda 1,2.",
    "VPS de 110 cm/s à direita e 120 cm/s à esquerda. RAR de 1,2 à direita e 1,3 à esquerda.",
  );
  check("troca de lateralidade continua bloqueada", !a.ok && a.mismatchedMeasures.includes("VPS direita 120") && a.mismatchedMeasures.includes("RAR esquerda 1,2"), JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("RAR direita 1,3. IR direita 0,62.", "IR intrarrenal de 1,3 à direita. RAR de 0,62 à direita.");
  check("troca RAR/IR continua bloqueada", !a.ok && a.mismatchedMeasures.includes("RAR direita 1,3") && a.mismatchedMeasures.includes("IR direita 0,62"), JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts(
    "Artéria renal direita VPS 120.",
    "Aorta abdominal de calibre preservado. Artéria renal direita com VPS de 120 cm/s. CONCLUSÃO: Artérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa. Índices de resistência intrarrenais dentro dos limites da normalidade.",
  );
  check("normalidades não ditadas continuam bloqueadas", !a.ok && a.unsupportedAssertions.length === 3, JSON.stringify(a));
  let blocked = false;
  try { assertDopplerRenalAuditPassed(a); } catch (error) { blocked = error instanceof DopplerRenalAuditError; }
  check("writer guard continua fail-closed", blocked);
  check("erro renal continua reconhecível pela rota", isDopplerRenalAuditError({ code: "DOPPLER_RENAL_AUDIT_FAILED" }));
}
for (const raw of ["Tardus-parvus intrarrenal à direita.", "Suspeita de estenose da artéria renal direita."]) {
  const a = auditDopplerRenalFacts(raw, "CONCLUSÃO: Estenose hemodinamicamente significativa da artéria renal direita.");
  check(`${raw.split(".")[0]} isolado não confirma significância`, a.estenoseSemCriterio && !a.ok, JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts(
    "IR intrarrenal de 0,85 à direita e 0,62 à esquerda.",
    "IR intrarrenal de 0,85 à direita e 0,62 à esquerda. CONCLUSÃO: Índices de resistência intrarrenais dentro dos limites da normalidade bilateralmente.",
  );
  check("IR elevado não vira normal", !a.ok && a.unsupportedAssertions.includes("IR fora da faixa adotada tratado como normal"), JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("renal direita VPS 300", "Estenose de 70% na artéria renal direita.");
  check("percentual de estenose continua proibido", a.percentEstenose && !a.ok, JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("renal esquerda VPS 210, RAR 2,8", "Artéria renal esquerda com sinais de estenose hemodinamicamente significativa (VPS de 210 cm/s).");
  check("VPS abaixo do corte não confirma estenose", a.estenoseSemCriterio && !a.ok, JSON.stringify(a));
  check("nota de revisão explica ausência de VPS alta", /SEM VPS renal >250/i.test(dopplerRenalRevisarNote(a) ?? ""));
}
{
  const raw = "renal direita VPS 320, RAR 3,8";
  const laudo = "Artéria renal direita: VPS de 320 cm/s. RAR de 3,8 à direita. CONCLUSÃO: Artéria renal direita com sinais ecográficos de estenose hemodinamicamente significativa (VPS de 320 cm/s).";
  check("VPS acima do corte sustenta R3 sem usar RAR como critério", auditDopplerRenalFacts(raw, laudo).ok, JSON.stringify(auditDopplerRenalFacts(raw, laudo)));
}
{
  const a = auditDopplerRenalFacts("renal direita VPS 120, RAR 1,3", "Artéria renal direita: VPS de 120 cm/s.");
  check("medida ditada ausente continua bloqueada", !a.ok && a.missingMeasures.includes("1,3"), JSON.stringify(a));
}
{
  const a = auditDopplerRenalFacts("renal 120 e 110, sem estenose", "sem evidência ecográfica de estenose hemodinamicamente significativa.");
  check("negação de estenose não é falsa afirmação", !a.estenoseSemCriterio && a.ok, JSON.stringify(a));
}
{
  const raw = "Doppler renal. VPS à direita 120 e à esquerda 110. Sem estenose.";
  const ok = "Artéria renal direita: VPS de 120 cm/s. Artéria renal esquerda: VPS de 110 cm/s. CONCLUSÃO: Artérias renais com fluxo preservado.";
  const drop = "Artéria renal direita: VPS de 120 cm/s. CONCLUSÃO: normal.";
  check("VPS compactas dos dois lados permanecem auditáveis", auditDopplerRenalFacts(raw, ok).ok, JSON.stringify(auditDopplerRenalFacts(raw, ok)));
  check("drop da segunda VPS continua detectado", auditDopplerRenalFacts(raw, drop).missingMeasures.includes("110"));
}
{
  const a = auditDopplerRenalFacts("RAR direita 1,3, esquerda 1,2.", "Relação aorto-renal (RAR) de 1,3 à direita.");
  check("drop da segunda RAR continua detectado", a.missingMeasures.includes("1,2"), JSON.stringify(a));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
