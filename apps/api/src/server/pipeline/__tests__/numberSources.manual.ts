import assert from "node:assert/strict";
import { numberSources, runDeterministicSanity } from "../deterministicSanity";

const f = numberSources("Útero medindo 6,7 x 3,0 x 5,0 com volume. Saco gestacional 17,8 x 16,9 x 14,7. DBP: 6,54 cm. FC 142.");
assert.ok(f.covers(5), "número ditado sem unidade");
assert.ok(f.covers(65.4), "cm → mm");
assert.ok(f.covers(0.654), "mm → cm");
assert.ok(f.covers(16.5), "média do saco gestacional");
assert.ok(f.covers(16), "média arredondada para inteiro");
assert.ok(f.covers(52.6), "volume do elipsoide 0,523 × a × b × c");
assert.ok(!f.covers(8.3), "número que não está em lugar nenhum");
assert.ok(!f.covers(30.5), "não inventa cobertura");

const base = { categoria_detectada: "PELVE_FEMININA", achados: {}, comandos_do_medico: [], lateralidade: null, datas: [] } as any;
const avisos = (laudo: string, ditado: string) =>
  runDeterministicSanity({ findings: base, finalText: laudo, rawInput: ditado }).issues.filter((i) => i.type === "medida_divergente" && i.severity === "warning");
assert.equal(avisos("Útero medindo 6,7 x 3,0 x 5,0 cm.", "útero medindo 6,7 x 3,0 x 5,0").length, 0);
assert.equal(avisos("DBP de 65,4 mm.", "DBP: 6,54 cm").length, 0);
assert.equal(avisos("Ovário direito medindo 3,1 x 2,2 x 2,8 cm.", "ovário direito 3,1 x 2,2").length, 1); // 2,8 inventado continua avisando
console.log("numberSources: ok");
