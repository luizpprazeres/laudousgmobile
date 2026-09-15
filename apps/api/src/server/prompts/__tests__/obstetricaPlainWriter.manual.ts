import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { buildSystemMessage } from "../buildSystemMessage";
import { OBSTETRICA_PLAIN_WRITER_POLICY, obstetricaPlainConflictWarning, obstetricaPlainOutputWarning, stripDopplerClauses } from "../obstetricaPlainPolicy";
import { WritingStyleCodeSchema } from "@laudousg/shared";

const route = readFileSync(new URL("../../../app/api/generate/route.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("route.ts", route, ts.ScriptTarget.Latest, true);
let calls = 0;
let v2Guard = false;
let warningConnected = false;
let outputWarningConnected = false;
function visit(n: ts.Node) {
  if (ts.isCallExpression(n) && n.expression.getText(ast) === "runWriterStream") {
    const property = (n.arguments[0] as ts.ObjectLiteralExpression).properties.find(p => p.name?.getText(ast) === "includeDoppler") as ts.PropertyAssignment;
    assert.ok(property);
    const resolvePolicy = new Function("reqInput", `return ${property.initializer.getText(ast)}`);
    for (const category_hint of [undefined, "OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO"]) {
      assert.equal(resolvePolicy({ category_hint }), category_hint === "OBSTETRICA" ? false : undefined);
    }
    calls++;
  }
  if (ts.isVariableDeclaration(n) && n.name.getText(ast) === "useWriterV2") {
    const enabled = new Function("reqInput", "writerV2Categories", "draftCategory", "writerV2UserId", "user", `return ${n.initializer!.getText(ast)}`);
    assert.equal(enabled({ category_hint: "OBSTETRICA", writer_variant: "v2" }, ["OBSTETRICA"], "OBSTETRICA", "test", { id: "test" }), false);
    v2Guard = true;
  }
  if (ts.isIfStatement(n) && n.expression.getText(ast) === "plainConflict") {
    const warnings: unknown[] = [];
    const events: unknown[] = [];
    const conflict = obstetricaPlainConflictWarning("OBSTETRICA", "Doppler umbilical alterado");
    assert.throws(() => new Function("plainConflict", n.getText(ast))(conflict), /Escolha Obstétrica com Doppler/);
    assert.deepEqual(warnings, []);
    assert.deepEqual(events, []);
    warningConnected = true;
  }
  if (ts.isIfStatement(n) && n.expression.getText(ast) === "plainOutputWarning") {
    const warnings: unknown[] = [];
    const events: unknown[] = [];
    const warning = obstetricaPlainOutputWarning("OBSTETRICA", "Doppler umbilical com diástole ausente.");
    assert.throws(() => new Function("plainOutputWarning", n.getText(ast))(warning), /Nenhum laudo foi entregue/);
    assert.deepEqual(warnings, []);
    assert.deepEqual(events, []);
    outputWarningConnected = true;
  }
  ts.forEachChild(n, visit);
}
visit(ast);
assert.equal(calls, 2);
assert.ok(v2Guard && warningConnected && outputWarningConnected);
let count = 0;
for (const categoryCode of ["OBSTETRICA", "MORFOLOGICO", "DOPPLER_OBSTETRICO", "PELVE_FEMININA"]) {
  for (const writingStyleCode of WritingStyleCodeSchema.options) {
    const args = { categoryCode, categoryLabel: categoryCode, writingStyleCode, ragBlocks: [] };
    const normal = buildSystemMessage(args);
    const plain = buildSystemMessage({ ...args, includeDoppler: false });
    assert.equal(plain, categoryCode === "OBSTETRICA" ? `${normal}\n\n${OBSTETRICA_PLAIN_WRITER_POLICY}` : normal);
    if (categoryCode === "OBSTETRICA") assert.equal(buildSystemMessage({ ...args, includeDoppler: false, dopplerMode: "combined" }), plain);
    count++;
  }
}
for (const text of ["IP umbilical 0,91", "Acrescente Doppler", "Dopplervelocimetria", "Artéria umbilical com diástole ausente", "IR uterina 0,58", "RCP 1,2"]) {
  assert.ok(obstetricaPlainConflictWarning("OBSTETRICA", text));
  assert.equal(obstetricaPlainConflictWarning("MORFOLOGICO", text), undefined);
  assert.equal(obstetricaPlainConflictWarning(undefined, text), undefined);
}
assert.equal(obstetricaPlainConflictWarning("OBSTETRICA", "DBP 84 mm. Placenta posterior."), undefined);
assert.ok(obstetricaPlainOutputWarning("OBSTETRICA", "Doppler umbilical com diástole ausente."));
assert.ok(obstetricaPlainOutputWarning("OBSTETRICA", "DOPPLERVELOCIMETRIA: IP umbilical 0,92."));
assert.equal(obstetricaPlainOutputWarning("OBSTETRICA", "Colo uterino: ____. Batimentos cardíacos presentes, modo M e modo Doppler."), undefined);
assert.equal(obstetricaPlainOutputWarning("MORFOLOGICO", "Doppler umbilical com diástole ausente."), undefined);
const plainBase = "34 semanas e 2 dias. BCF 145 bpm, modo M e modo Doppler. DBP 84 mm. Peso 2300 g, variação 320 g.";
assert.equal(stripDopplerClauses(plainBase), plainBase, "ditado sem Doppler fica intacto");
assert.equal(stripDopplerClauses(`${plainBase} IP umbilical 0,92, IP cerebral média 1,32.`), plainBase);
assert.equal(stripDopplerClauses(`${plainBase} Doppler umbilical com diástole ausente. Pelve renal esquerda dilatada, medindo 8 mm.`), `${plainBase} Pelve renal esquerda dilatada, medindo 8 mm.`);
assert.equal(stripDopplerClauses(`${plainBase} Sem dilatação das pelves renais. Acrescente Doppler com IP umbilical 0,92.`), `${plainBase} Sem dilatação das pelves renais.`);
assert.equal(stripDopplerClauses("Doppler anterior normal. DBP 84 mm."), "Doppler anterior normal. DBP 84 mm.", "menção a exame anterior não é cláusula vascular atual");
assert.equal(obstetricaPlainConflictWarning("OBSTETRICA", stripDopplerClauses(`${plainBase} RCP 1,2. IR uterina 0,58.`)), undefined, "após o strip não resta conflito");
console.log(`${count} prompt comparisons passed; primary/fallback option, V2 bypass prevention and rejection guards passed`);
