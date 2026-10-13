import assert from "node:assert/strict";
import { repairNumbers, suspiciousMeasures } from "../numberRepairs";
import { normalizeAsrTranscript } from "../transcriptNormalizer";

const on = (s: string) => normalizeAsrTranscript(s, { repairNumbers: true });
const off = (s: string) => normalizeAsrTranscript(s);

// ── Medida partida pela pausa (endpointing fecha o trecho e põe ponto) ──
assert.equal(on("Rim direito medindo 10.2. Por 4.5. Por 4.1 centímetros, sem dilatação."), "Rim direito medindo 10,2 x 4,5 x 4,1 cm, sem dilatação.");
assert.equal(on("Útero medindo 7,2 x 4,2. Por 5,1 cm."), "Útero medindo 7,2 x 4,2 x 5,1 cm.");
assert.equal(on("Lobo direito medindo 4.8. Por 1.6, por 1,5 cm."), "Lobo direito medindo 4,8 x 1,6 x 1,5 cm.");
// sem o flag nada muda (o ponto continua partindo a medida)
assert.equal(off("Rim direito medindo 10.2. Por 4.5. Por 4.1 centímetros."), "Rim direito medindo 10.2. Por 4.5. Por 4,1 cm.");

// ── Porcentagem: antes do normalizeMeasures virar "50 x 100" ──
assert.equal(off("mais de 50 por 100 intramural"), "mais de 50 x 100 intramural"); // o defeito de hoje
assert.equal(on("mais de 50 por 100 intramural"), "mais de 50% intramural");
assert.equal(on("mais de 50 x 100 intramural"), "mais de 50% intramural");
assert.equal(on("estenose entre 50 e 69 por 100."), "estenose entre 50 e 69%.");
assert.equal(on("estenose de 70 por cento."), "estenose de 70%.");
assert.equal(on("cisto medindo 50 x 100 mm"), "cisto medindo 50 x 100 mm"); // medida de verdade fica

// ── "por" engolido (decimais de UMA casa) ──
assert.equal(on("medindo 10,2 4,5 x 4,1 cm"), "medindo 10,2 x 4,5 x 4,1 cm");
assert.equal(on("medindo 0.4 0.3 por 0.3 centímetros"), "medindo 0,4 x 0,3 x 0,3 cm");
// fusão (duas casas) é ambígua: não toca
assert.equal(repairNumbers("medindo 10,24 0,5 x 4,1 cm"), "medindo 10,24 0,5 x 4,1 cm");
assert.deepEqual(suspiciousMeasures("útero medindo 7.34 0,1 x 5,2").map((x) => x.text), ["7.34 0,1"]);
assert.deepEqual(suspiciousMeasures("saco gestacional 37,6 x 24,7 x 20 e 0,5 cm").map((x) => x.text), ["20 e 0,5"]);
assert.deepEqual(suspiciousMeasures("medindo 7,2 x 4,2 x 5,1 cm"), []);

// ── Unidade, velocidade, meio, decimal ──
assert.equal(on("volume de 6,8 cm. Cúbicos, sem imagens"), "volume de 6,8 cm cúbicos, sem imagens");
assert.equal(on("pico sistólico de 120 cm por segundo e diastólica de 38 centímetros por 2º."), "pico sistólico de 120 cm/s e diastólica de 38 cm/s.");
assert.equal(on("o maior com 1 cm e meio."), "o maior com 1,5 cm.");
assert.equal(on("IP 0.86, IR 0.7 e percentil 37.9."), "IP 0,86, IR 0,7 e percentil 37,9.");

// ── Não pode estragar ──
assert.equal(on("Peso fetal estimado de 1.230 g."), "Peso fetal estimado de 1.230 g.");
assert.equal(on("DUM 12/03/2026, exame realizado por via transvaginal."), "DUM 12/03/2026, exame realizado por via transvaginal.");
assert.equal(on("Medindo 4 cm. Por outro lado, sem alterações."), "Medindo 4 cm. Por outro lado, sem alterações.");
assert.equal(on("refluxo acima de 1 segundo, sem trombos."), "refluxo acima de 1 segundo, sem trombos.");
assert.equal(on("Sem sinais de colecistite. 2 linfonodos. Segundo exame."), "Sem sinais de colecistite. 2 linfonodos. Segundo exame.");
// idempotente
for (const s of ["Rim medindo 10.2. Por 4.5. Por 4.1 cm.", "mais de 50 por 100 intramural", "IP 0.86", "1 cm e meio"]) assert.equal(on(on(s)), on(s));

console.log("numberRepairs: ok");
assert.equal(on("Ovário direito, 7,0 x 7,0 por, 6.3 com volume"), "Ovário direito, 7,0 x 7,0 x 6,3 com volume");
assert.equal(on("Os maiores com mais de 50 100 intramural, entre parênteses"), "Os maiores com mais de 50% intramural, entre parênteses");
assert.equal(on("cisto de 50 100 milímetros"), "cisto de 50 100 milímetros".replace("milímetros", "mm")); // unidade: não é porcentagem
assert.equal(on("interna normal 70 100 0,60"), "interna normal 70 100 0,60"); // sequência numérica do Doppler fica
console.log("numberRepairs: extra ok");
