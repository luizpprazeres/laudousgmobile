/**
 * Teste manual do guard de volume.
 * Rodar: npx tsx src/server/pipeline/__tests__/volumeGuard.manual.ts
 */
import { applyVolumePolicy, requestedVolumeCalc } from "../volumeGuard";

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
};

// ── Detecção de pedido ──
check("pede: 'calcule o volume'", requestedVolumeCalc("calcule o volume da tireoide"));
check("pede: 'me dá o volume'", requestedVolumeCalc("me dá o volume dos lobos"));
check("pede: 'qual o volume'", requestedVolumeCalc("qual o volume da tireoide?"));
check("NÃO pede: exame normal", !requestedVolumeCalc("tireoide de aspecto normal, sem nódulos"));
check("NÃO pede: cita volume ditado", !requestedVolumeCalc("lobo direito 4x2x1,5, volume 6 ml"));

// ── Padrão: NUNCA calcular (não pediu, não mencionou volume) ──
const inlineComputed = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de 6,2 ml), normal.";
check(
  "padrão: zera volume inline inventado → ____",
  applyVolumePolicy(inlineComputed, "tireoide normal sem nódulos").includes("(volume de ____ ml)"),
  applyVolumePolicy(inlineComputed, "tireoide normal sem nódulos"),
);
const pelveConc = "1) Útero de volume normal (57,9 cm³).";
check(
  "padrão: zera volume da conclusão pélvica → ____",
  applyVolumePolicy(pelveConc, "útero 7,2 por 4,1 por 3,8, ovários normais").includes("(____ cm³)"),
  applyVolumePolicy(pelveConc, "útero 7,2 por 4,1 por 3,8, ovários normais"),
);

// ── On request: calcula determinístico ──
const inlinePlaceholder = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de ____ ml), normal.";
const calcd = applyVolumePolicy(inlinePlaceholder, "tireoide, calcule o volume dos lobos");
check("on-request: 4×2×1,5×0,52 = 6,2 ml", /\(volume de 6,2 ml\)/.test(calcd), calcd);
const comPor = "Lobo esquerdo medindo 5 por 2 por 3 cm (volume de ____ ml).";
const calcdPor = applyVolumePolicy(comPor, "calcular o volume");
check("on-request com 'por': 5×2×3×0,52 = 15,6 ml", /\(volume de 15,6 ml\)/.test(calcdPor), calcdPor);
// recomputa mesmo se o LLM já tinha posto um número
const inlineWrong = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de 99 ml).";
check(
  "on-request recomputa valor errado do LLM",
  /\(volume de 6,2 ml\)/.test(applyVolumePolicy(inlineWrong, "calcule o volume")),
);

// ── On request: total da glândula = soma dos lobos (não o número errado do LLM) ──
const tireoideCompleta = `Lobo direito medindo 4 x 2 x 1,5 cm (volume de ____ ml).
Lobo esquerdo medindo 4,2 x 2,1 x 1,6 cm (volume de ____ ml).
Tireoide de volume normal (26,11 ml), sem nódulos.`;
const tcalc = applyVolumePolicy(tireoideCompleta, "calcule o volume dos lobos");
check("on-request: lobos 6,2 e 7,3", /6,2 ml/.test(tcalc) && /7,3 ml/.test(tcalc), tcalc);
check(
  "on-request: total = soma precisa (13,6), não o 26,11 do LLM",
  /volume normal \(13,6 ml\)/.test(tcalc),
  tcalc,
);

// ── Médico ditou volume (mencionou, não pediu cálculo) → não mexe ──
const dictated = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de 6 ml).";
check(
  "ditou volume: preserva (não zera nem recalcula)",
  applyVolumePolicy(dictated, "lobo direito 4x2x1,5, volume de 6 ml") === dictated,
);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
