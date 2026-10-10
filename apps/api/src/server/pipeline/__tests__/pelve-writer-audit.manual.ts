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

// ── Revisão W13 (Codex) — invenções que a auditoria antiga aprovava (A02/A03) ──
{
  // Sonda do Codex: ovários só com volume, mioma intramural sem FIGO; saída com eixos, FIGO e revisão por falta.
  const raw = "Ovários normais, o direito com 5,2 cm³ e o esquerdo 4,8 cm³. Mioma intramural.";
  const laudo =
    "Ovário direito medindo 2,1 x 1,4 x 1,8 cm, apresentando imagens anecoicas.\nCONCLUSÃO:\n" +
    "1) Útero de volume normal ([REVISAR: volume uterino não ditado] cm³).\n" +
    "2) Miométrio apresentando imagem sólida, que tem como diagnóstico mais provável nódulo miomatoso intramural (categoria FIGO 4).\n" +
    "3) Ovários ecograficamente normais (o direito com 5,2 cm³ e o esquerdo 4,8 cm³), ambos contendo folículos.";
  const a = auditPelveFacts(raw, laudo);
  check("sonda W13: reprova", !a.ok, JSON.stringify(a));
  // W12: "intramural" é localização unívoca → FIGO 4 pela tabela (vínculo pedido pelo Luiz); não é invenção.
  check("sonda W13: FIGO 4 derivada de 'intramural' é permitida (W12)", !a.figoInventado, JSON.stringify(a));
  check("sonda W13: eixos do ovário não ditados", ["2,1", "1,4", "1,8"].every((n) => a.medidasNaoDitadas.includes(n)), JSON.stringify(a));
  check("sonda W13: [REVISAR] por dado não ditado", a.revisaoPorFalta, JSON.stringify(a));
  check("sonda W13: tipo ditado (intramural) não acusa", a.tipoMiomaInventado.length === 0, JSON.stringify(a));
  check("sonda W13: nota cita as medidas não ditadas", /2,1/.test(pelveRevisarNote(a) ?? ""));
}
{
  // Tipo de mioma inferido pelo modelo.
  const a = auditPelveFacts("mioma de 2 cm na parede anterior", "Miométrio apresentando imagem sólida, que tem como diagnóstico mais provável nódulo miomatoso subseroso.");
  check("tipo de mioma não ditado acusa", a.tipoMiomaInventado.includes("subseroso"), JSON.stringify(a));
}
{
  const a = auditPelveFacts("mioma intramural de 2 cm", "nódulo miomatoso medindo 2 cm.");
  check("tipo de mioma ditado e omitido acusa", a.tipoMiomaOmitido.includes("intramural"), JSON.stringify(a));
}
{
  const a = auditPelveFacts("mioma na parede anterior, categoria figo, 5", "nódulo miomatoso subseroso com mais de 50% intramural (categoria FIGO 5).");
  check("localização da tabela para FIGO ditada não acusa", a.ok, JSON.stringify(a));
  const b = auditPelveFacts("mioma na parede anterior, FIGO 4", "nódulo miomatoso subseroso (categoria FIGO 4).");
  check("tipo incompatível com FIGO ditado acusa", b.tipoMiomaInventado.includes("subseroso"), JSON.stringify(b));
}
{
  // FIGO × tipo incompatíveis (FIGO 2 é submucoso) — conferência pela tabela do FIGO_RULES.
  const a = auditPelveFacts("mioma subseroso FIGO 2", "3) Miométrio apresentando imagem sólida, que tem como diagnóstico mais provável nódulo miomatoso subseroso (categoria FIGO 2).");
  check("FIGO × tipo incompatíveis acusa", a.figoTipoIncompativel.length === 1 && /incompatível com a categoria FIGO/.test(pelveRevisarNote(a) ?? ""), JSON.stringify(a));
  const b = auditPelveFacts("mioma intramural FIGO 4", "nódulo miomatoso intramural (categoria FIGO 4).");
  check("FIGO × tipo compatíveis não acusa", b.ok, JSON.stringify(b));
  const c = auditPelveFacts("mioma subseroso FIGO 2", "nódulo miomatoso subseroso (categoria FIGO 2) [REVISAR — FIGO/tipo].");
  check("incompatibilidade já sinalizada não duplica", c.figoTipoIncompativel.length === 0, JSON.stringify(c));
  const d = auditPelveFacts("mioma FIGO 2-5", "nódulo miomatoso submucoso e subseroso (categoria FIGO 2-5).");
  check("FIGO híbrido 2-5 não acusa", d.figoTipoIncompativel.length === 0, JSON.stringify(d));
}
// ── Revisão W13, rodada 2 (Codex): sondas da auditoria da pelve ──
{
  const a = auditPelveFacts("Mioma intramural FIGO 3 na parede anterior.", "nódulo miomatoso intramural (categoria FIGO 4).");
  check("R2/A03: FIGO trocada (3 → 4) acusa", a.figosInventados.includes("4"), JSON.stringify(a));
  const b = auditPelveFacts("Mioma FIGO 4 na parede anterior.", "nódulo miomatoso intramural (categoria FIGO 4).");
  check("R2/A03: tipo derivado da FIGO pela tabela (W12) não acusa", b.ok, JSON.stringify(b));
  const b2 = auditPelveFacts("Mioma FIGO 4 na parede anterior.", "nódulo miomatoso subseroso (categoria FIGO 4).");
  // Subseroso × FIGO 4 é vizinha (não conflita), mas o tipo não ditado continua acusado.
  check("R2/A03: tipo que não é o da FIGO ditada acusa", b2.tipoMiomaInventado.includes("subseroso") && b2.figoTipoIncompativel.length === 0, JSON.stringify(b2));
  // Decisão do Luiz (10/10): vizinhas dos finais dele não são sinalizadas; incompatível de verdade, sim.
  const c = auditPelveFacts("Mioma intramural FIGO 5.", "nódulo miomatoso intramural (categoria FIGO 5).");
  check("FIGO2: intramural + FIGO 5 (vizinha) não acusa", c.ok, JSON.stringify(c));
  const c2 = auditPelveFacts("Mioma subseroso com menos de 50% intramural, FIGO 5.", "nódulo miomatoso subseroso com menos de 50% intramural (categoria FIGO 5).");
  check("FIGO2: subseroso <50% + FIGO 5 (vizinha) não acusa", c2.ok, JSON.stringify(c2));
  const c3 = auditPelveFacts("Mioma submucoso FIGO 6.", "nódulo miomatoso submucoso (categoria FIGO 6).");
  check("FIGO2: submucoso + FIGO 6 (incompatível) acusa", c3.figoTipoIncompativel.length === 1, JSON.stringify(c3));
  const c4 = auditPelveFacts("Mioma intramural FIGO 7.", "nódulo miomatoso intramural (categoria FIGO 7).");
  check("FIGO2: intramural + FIGO 7 (não vizinha) acusa", c4.figoTipoIncompativel.length === 1, JSON.stringify(c4));
  const d = auditPelveFacts("Mioma FIGO 4 na parede anterior.", "Miométrio apresentando imagem nodular, medindo 4 cm.\nnódulo miomatoso intramural (categoria FIGO 4).");
  check("R2/A02: número da FIGO não vale como medida", d.medidasNaoDitadas.includes("4"), JSON.stringify(d));
  const e = auditPelveFacts("Mioma intramural medindo dois centímetros.", "Imagem sólida medindo 2 cm. Nódulo miomatoso intramural (categoria FIGO 4).");
  check("R2-01: número por extenso normalizado não acusa", e.ok, JSON.stringify(e));
  const e2 = auditPelveFacts("Endométrio de dois vírgula cinco milímetros; volume de vinte e cinco.", "Endométrio medindo 0,25 cm.\nÚtero de volume normal (25 cm³).");
  check("R2-01: 'dois vírgula cinco' e 'vinte e cinco'", e2.missingMeasures.length === 0 && e2.medidasNaoDitadas.length === 0, JSON.stringify(e2));
  const f = auditPelveFacts("Útero normal. Remova a expressão mioma intramural.", "Útero ecograficamente normal.");
  check("R2-02: comando de remoção não cobra tipo", f.ok, JSON.stringify(f));
  const g = auditPelveFacts("Útero normal, sem mioma intramural.", "Útero ecograficamente normal.");
  check("R2-02: negação não cobra tipo", g.ok, JSON.stringify(g));
  const h = auditPelveFacts("Mioma subseroso com mais de 50% intramural, estendendo-se desde a mucosa, categoria figo 2-5.", "nódulo miomatoso subseroso com mais de 50% intramural, estendendo-se desde a mucosa (categoria FIGO 2-5).");
  check("W12: híbrida 2-5 descrita pela parte subserosa não acusa", h.ok, JSON.stringify(h));
  const i = auditPelveFacts("Dois miomas, o primeiro intramural FIGO 4 e o segundo FIGO 6.", "nódulos miomatosos, o primeiro intramural (categoria FIGO 4) e o segundo subseroso com menos de 50% intramural (categoria FIGO 6).");
  check("W12: dois miomas com FIGO por lesão não acusa", i.ok, JSON.stringify(i));
}
{
  // W12 (bancada, 9f5c737b): "categoria FIGO 4 e 5" ditada — as duas valem.
  const a = auditPelveFacts("nódulos miomatosos intramurais e com mais de 50 x 100 intramural, entre parênteses categoria FIGO 4 e 5.",
    "nódulos miomatosos intramurais (categoria FIGO 4) e com mais de 50% intramural (categoria FIGO 5).");
  check("W12: lista de FIGO ditada ('4 e 5') não acusa", !a.figoInventado, JSON.stringify(a));
  const b = auditPelveFacts("mioma FIGO 4", "nódulos miomatosos (categoria FIGO 4 e 6).");
  check("W12: lista no laudo com categoria não ditada acusa", a.figosInventados.length === 0 && b.figosInventados.includes("6"), JSON.stringify(b));
}
{
  // Decimal separado por espaço no ASR ("volume de 8 4") não é medida inventada.
  const a = auditPelveFacts("ovário direito com volume de 8 4", "Ovário direito ecograficamente normal (8,4 cm³), contendo folículos.");
  check("decimal do ASR com espaço não acusa", a.medidasNaoDitadas.length === 0, JSON.stringify(a));
}
{
  // Os pares ditado → laudo assinado dos few-shots passam limpos.
  const { PELVE_FEWSHOTS } = require("../../renderer/categories/pelveFewshots");
  const falhos = (PELVE_FEWSHOTS as { raw: string; laudo: string }[]).filter((f) => !auditPelveFacts(f.raw, f.laudo).ok).length;
  check("few-shots da pelve passam na auditoria", falhos === 0, `${falhos} falharam`);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
