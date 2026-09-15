import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { GenerateSSEEventSchema } from "@laudousg/shared";
import { obstetricaPlainConflictWarning, obstetricaPlainOutputWarning } from "../../prompts/obstetricaPlainPolicy";
import { decidirDescarte } from "../descarteDecision";

const source = readFileSync(new URL("../../../app/api/generate/route.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true);
const nodes: ts.Node[] = [];
function visit(n: ts.Node) { nodes.push(n); ts.forEachChild(n, visit); }
visit(ast);
function decl(name: string) {
  const node = nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === name)!;
  return `const ${node.getText(ast)};`;
}
const inputGuard = nodes.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === "plainConflict")!;
const outputGuard = nodes.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === "plainOutputWarning")!;
const writerLoop = nodes.find(n => ts.isWhileStatement(n) && n.getText(ast).includes("writerGen.next()"))!;
const fallbackLoop = nodes.find(n => ts.isForStatement(n) && n.getText(ast).includes("fallbackGen.next()"))!;
const release = nodes.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === 'reqInput.category_hint === "OBSTETRICA"' && n.getText(ast).includes('type: "token"'))!;
const errorEmit = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(ast) === "emit" && n.getText(ast).includes('code: "PIPELINE_FAILURE"'))!;
assert.ok(inputGuard.pos < source.indexOf("const draftCategory"));
assert.ok(outputGuard.pos < source.indexOf('outcome = "success";', outputGuard.pos));
assert.ok(release.pos > outputGuard.pos);
function evaluate(body: string, scope: Record<string, unknown>) {
  const compiled = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), `return (async()=>{${compiled}})()`)(...Object.values(scope));
}

const rejected = ["Acrescente Doppler", "Exame com Doppler", "Dopplervelocimetria obstétrica", "IP umbilical 0,91", "IR da artéria uterina direita 0,58", "Artéria umbilical com fluxo diastólico reverso", "RCP 1,2", "Exame anterior com Doppler normal. Hoje IP umbilical 1,7"];
const accepted = ["Cordão umbilical com 3 vasos", "Pode ir para casa", "Vai ir avaliar cordão umbilical com 3 vasos", "Batimentos cardíacos por modo Doppler, BCF 145 bpm", "BCF 145 bpm pelo modo M e modo Doppler", "Sem Doppler", "Não realizar Doppler", "Doppler não realizado", "Exame anterior com Doppler e IP umbilical 0,9", "Histórico de Dopplervelocimetria alterada", "Placenta posterior homogênea", "Inserção do cordão umbilical na placenta", "IP não informado", "Colo uterino medindo 3,2 cm"];
const aristotleConflicts = [
  "Exame anterior normal, agora artéria umbilical com diástole reversa",
  "Doppler das artérias uterinas normal",
  "Doppler das artérias uterinas alterado",
  "Doppler umbilical com resistência aumentada",
];
rejected.push(...aristotleConflicts);
accepted.push("IP do equipamento 192.168.1.10", "Posição da artéria umbilical normal", "Sem Doppler das artérias uterinas", "Exame anterior com Doppler umbilical normal", "Doppler das artérias uterinas não realizado");

async function main() {
  for (const text of accepted) assert.equal(obstetricaPlainConflictWarning("OBSTETRICA", text), undefined, text);
  let simulations = 0;
  for (const text of rejected) {
    assert.ok(obstetricaPlainConflictWarning("OBSTETRICA", text), text);
    assert.equal(obstetricaPlainConflictWarning("MORFOLOGICO", text), undefined);
    assert.equal(obstetricaPlainConflictWarning("DOPPLER_OBSTETRICO", text), undefined);
  }
  for (const text of aristotleConflicts) assert.ok(obstetricaPlainOutputWarning("OBSTETRICA", text), `output: ${text}`);
  const consolidatedChoice = await evaluate(`${decl("plainConflict")} return plainConflict;`, {
    reqInput: { category_hint: "OBSTETRICA", raw_input: "Acrescente Doppler", consolidated_transcript: "Cordão umbilical com 3 vasos. BCF por modo Doppler." },
    obstetricaPlainConflictWarning,
  });
  assert.equal(consolidatedChoice, undefined, "corrected consolidated transcript wins over old request");
  const consolidatedConflict = await evaluate(`${decl("plainConflict")} return plainConflict;`, {
    reqInput: { category_hint: "OBSTETRICA", raw_input: "Cordão umbilical com 3 vasos", consolidated_transcript: "Doppler umbilical com resistência aumentada" },
    obstetricaPlainConflictWarning,
  });
  assert.ok(consolidatedConflict, "current consolidated conflict must be rejected");
  for (const loop of [writerLoop, fallbackLoop]) {
    for (const [raw, output, blocked] of [
      ["IP umbilical 0,91", "não deve gerar", true],
      ["Cordão umbilical com 3 vasos", "ULTRASSONOGRAFIA OBSTÉTRICA\nDoppler umbilical com diástole ausente.", true],
      ["BCF por modo Doppler", "ULTRASSONOGRAFIA OBSTÉTRICA\nBatimentos cardíacos presentes, modo M e modo Doppler.", false],
    ] as const) {
      const events: any[] = [];
      let generated = false;
      let calls = 0;
      const generator = async function* () { calls++; yield output.slice(0, 35); yield output.slice(35); return { fullText: output }; };
      await evaluate(`let finalText=""; let writerResult; let errorMessage; try {
        ${decl("plainConflict")} ${inputGuard.getText(ast)}
        ${loop.getText(ast)}
        ${decl("plainOutputWarning")} ${outputGuard.getText(ast)}
        finalize(); ${release.getText(ast)} emit({type:"done",ts:nowIso(),report_id:"11111111-1111-4111-8111-111111111111",final_text:finalText});
      } catch(err) { errorMessage=err.message; ${errorEmit.getText(ast)} recordDiscard(err); }`, {
        reqInput: { category_hint: "OBSTETRICA", raw_input: raw },
        obstetricaPlainConflictWarning, obstetricaPlainOutputWarning,
        writerGen: generator(), fallbackGen: generator(), emit: (e: any) => events.push(e),
        nowIso: () => "2026-09-14T12:00:00.000Z", finalize: () => { generated = true; },
        recordDiscard: (erro: Error) => assert.equal(decidirDescarte({ erro, signalAbortado: false, laudoEntregue: generated }).marcaDescartado, true),
      });
      for (const event of events) GenerateSSEEventSchema.parse(event);
      assert.equal(generated, !blocked);
      if (blocked) {
        assert.deepEqual(events.map(e => e.type), ["error"]);
        assert.equal(events[0].code, "PIPELINE_FAILURE");
        assert.match(events[0].message, /Obstétrica com Doppler/);
      } else assert.deepEqual(events.map(e => e.type), ["token", "done"]);
      assert.equal(calls, raw.startsWith("IP") ? 0 : 1);
      simulations++;
    }
  }
  console.log(`${accepted.length} accepted contexts, ${rejected.length} rejected conflicts, ${simulations} actual route-loop simulations passed; no token/done/generated on rejection`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
