/**
 * Golden PURO do fact-audit do PARTES_MOLES writer_guarded (sem LLM).
 * Rodar: tsx src/server/pipeline/__tests__/partes-moles-writer-audit.manual.ts
 */
import { auditPartesMolesFacts, partesMolesRevisarNote } from "../partesMolesWriterAudit";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// 1) Laudo bom (medidas presentes em outra grafia decimal, sem deriva) → ok.
{
  const raw = "Partes moles do palato duro, imagem de baixa ecogenicidade medindo 1.1 por 0.8 por 0.9 centímetros";
  const laudo = "ULTRASSONOGRAFIA DAS PARTES MOLES DO PALATO DURO ... medindo aproximadamente 1,1 x 0,8 x 0,9 cm, situada na submucosa do palato duro.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("laudo bom: audit ok", a.ok, JSON.stringify(a));
  check("laudo bom: sem nota", partesMolesRevisarNote(a) === null);
}

// 2) DROP de medida → detecta.
{
  const raw = "imagem anecoica medindo 0.2 por 0.2 por 0.3 centímetros, distando 0.9 centímetros da pele";
  const laudo = "Imagem anecoica na região sacral, medindo 0,2 x 0,2 x 0,3 cm."; // perdeu a distância 0,9
  const a = auditPartesMolesFacts(raw, laudo);
  check("drop de medida detectado", !a.ok && a.missingMeasures.includes("0.9"), JSON.stringify(a));
  check("nota [REVISAR] com a medida", /REVISAR:.*0\.9/.test(partesMolesRevisarNote(a) ?? ""));
}

// 3) DROP de lado → detecta.
{
  const raw = "partes moles da coxa direita com nódulo hipoecoico";
  const laudo = "Imagem nodular sólida, hipoecoica, na coxa."; // perdeu o lado
  const a = auditPartesMolesFacts(raw, laudo);
  check("drop de lado direito detectado", !a.ok && a.missingSides.includes("direito"), JSON.stringify(a));
}

// 4) DERIVA MSK (termo no laudo sem estar no ditado) → detecta.
{
  const raw = "partes moles da coxa direita, nódulo hipoecoico de 1,8 cm no subcutâneo";
  const laudo = "Imagem nodular na coxa direita medindo 1,8 cm. Tendões sem alterações. Ausência de derrame articular.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("deriva MSK detectada", !a.ok && a.extraStructures.includes("tendões") && a.extraStructures.includes("derrame articular"), JSON.stringify(a));
}

// 5) Termo MSK DITADO pelo médico → NÃO é deriva (condicional ao ditado).
{
  const raw = "partes moles da região dorsal, coleção adjacente ao tendão do trapézio medindo 2,0 cm";
  const laudo = "Coleção adjacente ao tendão do trapézio, medindo 2,0 cm, na região dorsal.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("termo ditado não é deriva: audit ok", a.ok, JSON.stringify(a));
}

// 6) Placeholder ____ no laudo → detecta.
{
  const raw = "nódulo hipoecoico no subcutâneo da coxa direita";
  const laudo = "Imagem nodular sólida, hipoecoica, medindo ____ x ____ x ____ cm, na coxa direita.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("placeholder ____ detectado", !a.ok && a.placeholder, JSON.stringify(a));
  check("nota [REVISAR] cita o placeholder", /placeholder/.test(partesMolesRevisarNote(a) ?? ""));
}

// 7) Doppler INVENTADO (laudo menciona fluxo sem o médico ter avaliado) → detecta.
{
  const raw = "Partes moles da coxa direita. Imagem nodular hipoecoica, bem delimitada, medindo 1,8 x 1,2 cm no subcutâneo, sugestiva de lipoma.";
  const laudo = "Imagem nodular sólida, hipoecoica, medindo 1,8 x 1,2 cm, localizada no subcutâneo da coxa direita, sem fluxo ao Doppler colorido.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("Doppler inventado detectado", !a.ok && a.dopplerInventado, JSON.stringify(a));
  check("nota [REVISAR] cita o Doppler", /Doppler/.test(partesMolesRevisarNote(a) ?? ""));
}

// 8) Doppler DITADO ("sem vascularização") → mencionar no laudo é ok.
{
  const raw = "imagem anecoica medindo 0,3 cm, sem vascularização";
  const laudo = "Imagem anecoica medindo 0,3 cm, sem vascularização ao estudo Doppler colorido.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("Doppler ditado não é invenção: audit ok", a.ok, JSON.stringify(a));
}

// 9) Deriva cervical (review dex1: órgão inventado ao generalizar "região cervical") → detecta.
{
  const raw = "partes moles da região cervical direita, linfonodos de aspecto habitual";
  const laudo = "Linfonodos cervicais de aspecto habitual. Glândula submandibular direita, parótida direita e tireoide com aspecto ecográfico normal. Estudo comparativo contralateral sem alterações.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("deriva cervical detectada (tireoide/parótida/glândula/contralateral)", !a.ok && a.extraStructures.includes("tireoide") && a.extraStructures.includes("parótida") && a.extraStructures.includes("contralateral"), JSON.stringify(a));
}

// 10) Órgão cervical DITADO (ou laudo colado que o cita) → não é deriva.
{
  const raw = "partes moles da região cervical direita, glândula submandibular e tireoide de aspecto normal, linfonodos habituais";
  const laudo = "Glândula submandibular direita e tireoide com aspecto ecográfico normal. Linfonodos cervicais de aspecto habitual.";
  const a = auditPartesMolesFacts(raw, laudo);
  check("órgão cervical ditado não é deriva: audit ok", a.ok, JSON.stringify(a));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
