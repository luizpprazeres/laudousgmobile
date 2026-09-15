import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dopplerRequestFields } from "../generate/dopplerMode";
import { GenerateRequestSchema } from "../../shared/schemas/generate";
import { formatBiometric, imagingRequestFields, selectImagingData, type BiometricData } from "./imageAnalysis";

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

const data: BiometricData = { dbp: "80 mm", cc: "290 mm", ca: "280 mm", cf: "60 mm", weight: "1900 g", gestAgeLMP: "32 semanas", ipUmbilical: "0.95", ipMCA: "1.8", humerus: "55 mm", tibia: "52 mm", fibula: "50 mm", radius: "45 mm", ulna: "47 mm", ila: "12 cm" };

test("geracao combinada por padrao, sem alterar categoria ou ditado", () => {
  const request = GenerateRequestSchema.parse({ raw_input: "Biometria e Doppler informados", category_hint: "DOPPLER_OBSTETRICO", writing_style_id: "11111111-1111-4111-8111-111111111111", ...dopplerRequestFields("DOPPLER_OBSTETRICO") });
  assert.equal(request.doppler_mode, "combined");
  assert.equal(request.category_hint, "DOPPLER_OBSTETRICO");
  assert.equal(request.raw_input, "Biometria e Doppler informados");
});
test("geracao isolada explicita e modo ausente nas outras categorias", () => {
  assert.deepEqual(dopplerRequestFields("DOPPLER_OBSTETRICO", "isolated"), { doppler_mode: "isolated" });
  for (const category of ["OBSTETRICA", "MORFOLOGICO", "TIREOIDE"]) assert.deepEqual(dopplerRequestFields(category, "isolated"), {});
  assert.equal(GenerateRequestSchema.shape.doppler_mode.safeParse("invalid").success, false);
});
test("imagem combinada solicita biometria e modulo Doppler", () => {
  assert.deepEqual(imagingRequestFields("DOPPLER_OBSTETRICO"), { category: "OBSTETRICA", gemelar: false, modules: ["DOPPLER_OBSTETRICO"] });
  const text = formatBiometric([data], "DOPPLER_OBSTETRICO");
  for (const value of ["DBP: 80 mm", "CF: 60 mm", "Peso fetal estimado: 1900 g", "IP artéria umbilical: 0.95"]) assert.ok(text.includes(value));
  assert.deepEqual(selectImagingData(data, "DOPPLER_OBSTETRICO"), data);
});
test("isolado preserva apenas Doppler no texto e no companion", () => {
  const options = { dopplerMode: "isolated" as const };
  assert.deepEqual(imagingRequestFields("DOPPLER_OBSTETRICO", options), { category: "DOPPLER_OBSTETRICO", gemelar: false, modules: [] });
  assert.deepEqual(selectImagingData(data, "DOPPLER_OBSTETRICO", options), { ipUmbilical: "0.95", ipMCA: "1.8" });
  assert.equal(formatBiometric([data], "DOPPLER_OBSTETRICO", options), "Doppler obstétrico:\nIP artéria umbilical: 0.95\nIP artéria cerebral média: 1.8");
  assert.equal(formatBiometric([{ dbp: "80 mm", ila: "12 cm" }], "DOPPLER_OBSTETRICO", options), "");
});
test("obstetrica simples ignora opcao Doppler residual", () => {
  assert.deepEqual(imagingRequestFields("OBSTETRICA", { includeDoppler: true }), { category: "OBSTETRICA", gemelar: false, modules: [] });
  const text = formatBiometric([data], "OBSTETRICA", { includeDoppler: true });
  assert.ok(text.includes("DBP: 80 mm"));
  assert.ok(!text.includes("Doppler"));
});
test("morfo opcional preserva todos os ossos com e sem Doppler", () => {
  for (const includeDoppler of [false, true]) {
    const options = { includeDoppler };
    assert.deepEqual(imagingRequestFields("MORFOLOGICO", options).modules, includeDoppler ? ["DOPPLER_OBSTETRICO"] : []);
    const text = formatBiometric([data], "MORFOLOGICO", options);
    for (const label of ["CF:", "Úmero:", "Tíbia:", "Fíbula:", "Rádio:", "Ulna:"]) assert.ok(text.includes(label));
    assert.equal(text.includes("Doppler obstétrico:"), includeDoppler);
  }
});
test("merge de imagens preserva biometria e primeiro valor dos vasos", () => {
  const text = formatBiometric([{ dbp: "80 mm" }, { ipUmbilical: "0.95" }, { ipUmbilical: "1.1", cf: "60 mm" }], "DOPPLER_OBSTETRICO");
  assert.ok(text.includes("DBP: 80 mm") && text.includes("CF: 60 mm") && text.includes("0.95") && !text.includes("1.1"));
});
test("categorias nao obstetricas e entrada vazia preservadas", () => {
  assert.equal(formatBiometric([], "DOPPLER_OBSTETRICO"), "");
  assert.ok(formatBiometric([{ thyroidRightLobe: { a: "1", b: "2", c: "3" } }], "TIREOIDE").includes("1 x 2 x 3 cm"));
});
test("tela liga toggle, geracao, retomada e extracao ao mesmo modo", () => {
  const screen = readFileSync(resolve(__dirname, "../../../app/generate.tsx"), "utf8");
  assert.equal(screen.split("...dopplerRequestFields(cat.id, dopplerMode)").length - 1, 2);
  assert.ok(screen.includes('accessibilityLabel="Somente Doppler"'));
  assert.ok(screen.includes("dopplerMode={dopplerMode}"));
  const sheet = readFileSync(resolve(__dirname, "ImageAnalysisSheet.tsx"), "utf8");
  assert.ok(sheet.includes('const canAddDoppler = categoryId === "MORFOLOGICO";'));
});
console.log(`${passed}/${passed} focused tests passed`);
