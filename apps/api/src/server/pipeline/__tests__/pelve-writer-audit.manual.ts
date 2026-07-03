/**
 * Golden PURO do fact-audit do PELVE writer_guarded (sem LLM).
 * Rodar: tsx src/server/pipeline/__tests__/pelve-writer-audit.manual.ts
 */
import { auditPelveFacts, pelveRevisarNote } from "../pelveWriterAudit";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// 1) Laudo bom → ok.
{
  const raw = "útero medindo 6,3 x 3,8 x 5,4, volume 69,8. ovário direito 2,0 x 1,9 x 2,1";
  const laudo = "Útero em anteversão, medindo 6,3 x 3,8 x 5,4 cm. ... Útero de volume normal (69,8 cm³). Ovário direito medindo 2,0 x 1,9 x 2,1 cm, apresentando imagens anecoicas.";
  const a = auditPelveFacts(raw, laudo);
  check("laudo bom: audit ok", a.ok, JSON.stringify(a));
  check("laudo bom: sem nota", pelveRevisarNote(a) === null);
}

// 2) DROP de medida → detecta.
{
  const raw = "útero medindo 6,3 x 3,8 x 5,4 com volume de 69,8";
  const laudo = "Útero em anteversão, medindo 6,3 x 3,8 x 5,4 cm."; // dropou o volume 69,8
  const a = auditPelveFacts(raw, laudo);
  check("drop de volume detectado", !a.ok && a.missingMeasures.includes("69,8"), JSON.stringify(a));
  check("nota [REVISAR] com a medida", /REVISAR:.*69,8/.test(pelveRevisarNote(a) ?? ""));
}

// 3) Menopausa ditada sem "praticamente sem folículos" → detecta.
{
  const raw = "pelve transvaginal, paciente em menopausa, ovário direito 0,6 x 1,2 x 1,2";
  const laudo = "Ovário direito medindo 0,6 x 1,2 x 1,2 cm, apresentando imagens anecoicas. ... Ovários ecograficamente normais, ambos contendo folículos."; // errou: não marcou menopausa
  const a = auditPelveFacts(raw, laudo);
  check("menopausa sem marca detectada", !a.ok && a.menopausaSemMarca, JSON.stringify(a));
}

// 4) Menopausa ditada COM marca → ok.
{
  const raw = "paciente em menopausa, ovário direito 0,6 x 1,2 x 1,2 volume 0,4";
  const laudo = "Ovário direito medindo 0,6 x 1,2 x 1,2 cm, apresentando poucas imagens anecoicas. ... Ovários ecograficamente normais (o direito com 0,4 cm³), ambos praticamente sem folículos.";
  const a = auditPelveFacts(raw, laudo);
  check("menopausa com marca: ok", a.ok, JSON.stringify(a));
}

// 5) Pré-menopausa e negação NÃO disparam o check de menopausa.
{
  const a = auditPelveFacts("paciente na pré-menopausa, ovário 2,0 x 1,9 x 2,1", "Ovário direito medindo 2,0 x 1,9 x 2,1 cm, apresentando imagens anecoicas.");
  check("pré-menopausa não exige 'sem folículos'", !a.menopausaSemMarca, JSON.stringify(a));
}

// 6) Líquido livre INVENTADO (anti-líquido-livre) → detecta.
{
  const raw = "ovário esquerdo com pequena coleção líquida provavelmente funcional O-RADS 2, medindo 3,1";
  const laudo = "Ovário esquerdo ... coleção líquida provavelmente funcional (O-RADS 2). ... Presença de líquido livre na cavidade pélvica."; // alucinou líquido livre
  const a = auditPelveFacts(raw, laudo);
  check("líquido livre inventado detectado", !a.ok && a.liquidoLivreInventado, JSON.stringify(a));
}

// 7) Líquido livre DITADO → não é invenção.
{
  const raw = "moderada quantidade de líquido livre no fundo de saco";
  const laudo = "Presença de líquido livre na cavidade pélvica (moderada quantidade no fundo de saco).";
  const a = auditPelveFacts(raw, laudo);
  check("líquido livre ditado: ok", a.ok, JSON.stringify(a));
}

// 8) Placeholder ____ → detecta.
{
  const a = auditPelveFacts("útero em anteversão", "Útero em anteversão, medindo ____ x ____ x ____ cm.");
  check("placeholder ____ detectado", !a.ok && a.placeholder, JSON.stringify(a));
}

// 9) Volume SEM "de" (review dex1: "volume 54,0") — drop detectado.
{
  const raw = "útero em anteversão medindo 7,0 x 3,5 x 4,2 com volume 54,0";
  const laudo = "Útero em anteversão, medindo 7,0 x 3,5 x 4,2 cm."; // dropou o volume 54,0
  const a = auditPelveFacts(raw, laudo);
  check("volume sem 'de' (54,0) drop detectado", !a.ok && a.missingMeasures.includes("54,0"), JSON.stringify(a));
}
{
  const raw = "útero volume 54,0";
  const laudo = "Útero de volume normal (54,0 cm³).";
  const a = auditPelveFacts(raw, laudo);
  check("volume sem 'de' presente no laudo → ok", a.ok, JSON.stringify(a));
}

// 10) "ausência de líquido livre" (negação) NÃO é invenção (review dex1).
{
  const raw = "pelve transvaginal, útero normal";
  const laudo = "Útero em anteversão. ... Ausência de líquido livre na cavidade pélvica.";
  const a = auditPelveFacts(raw, laudo);
  check("'ausência de líquido livre' não é invenção", !a.liquidoLivreInventado, JSON.stringify(a));
}
{
  const raw = "pelve transvaginal";
  const laudo = "Não há líquido livre na pelve.";
  const a = auditPelveFacts(raw, laudo);
  check("'não há líquido livre' não é invenção", !a.liquidoLivreInventado, JSON.stringify(a));
}
{
  // POSITIVA e não-ditada → ainda detecta.
  const raw = "pelve transvaginal, útero normal";
  const laudo = "Presença de líquido livre na cavidade pélvica.";
  const a = auditPelveFacts(raw, laudo);
  check("líquido livre POSITIVO não-ditado ainda detecta", a.liquidoLivreInventado, JSON.stringify(a));
}

// 11) Tolerância mm→cm (achado do smoke ampliado): "12 milímetros" → "1,2 cm" no
// laudo NÃO é drop (o writer converteu certo).
{
  const raw = "saco gestacional medindo 12 milímetros de diâmetro médio";
  const laudo = "Presença de saco gestacional intrauterino, tópico, medindo 1,2 cm de diâmetro médio.";
  const a = auditPelveFacts(raw, laudo);
  check("mm→cm: '12 mm' → '1,2 cm' não é drop", a.ok && !a.missingMeasures.includes("12"), JSON.stringify(a));
}
{
  // mm ditado e AUSENTE de fato (nem literal nem forma cm) → ainda detecta.
  const raw = "nódulo medindo 8 milímetros";
  const laudo = "Útero em anteversão."; // não tem 8 nem 0,8
  const a = auditPelveFacts(raw, laudo);
  check("mm realmente ausente ainda detecta", !a.ok && a.missingMeasures.includes("8"), JSON.stringify(a));
}
{
  // cm ditado normal (não-mm) segue detectando drop literal.
  const raw = "útero medindo 6,3 x 3,8 x 5,4 cm";
  const laudo = "Útero medindo 6,3 x 3,8 cm."; // dropou 5,4
  const a = auditPelveFacts(raw, laudo);
  check("cm ditado: drop de 5,4 ainda detecta", !a.ok && a.missingMeasures.includes("5,4"), JSON.stringify(a));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
