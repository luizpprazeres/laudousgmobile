/**
 * Guard de TÉCNICA / VIA — casos reais que o Luiz relatou em 14/08.
 *
 *   pnpm exec tsx src/server/pipeline/__tests__/tecnica-via-guard.manual.ts
 */
import {
  applyTecnicaViaGuard,
  detectReportedVia,
  detectStatedVia,
  detectViaMismatch,
} from "../tecnicaViaGuard";

let ok = 0;
let fail = 0;
function eq(nome: string, achou: unknown, esperado: unknown) {
  if (JSON.stringify(achou) === JSON.stringify(esperado)) {
    console.log(`  ✓ ${nome}`);
    ok++;
  } else {
    console.log(`  ✗ ${nome}\n      esperado: ${JSON.stringify(esperado)}\n      obtido:   ${JSON.stringify(achou)}`);
    fail++;
  }
}

const OBST = [
  "ULTRASSONOGRAFIA OBSTÉTRICA",
  "",
  "COMENTÁRIOS:",
  "Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante.",
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "",
  "Feto único, em apresentação cefálica.",
].join("\n");

const PELVE_TA_TV = [
  "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL",
  "",
  "COMENTÁRIOS:",
  "Exame realizado por via transabdominal e transvaginal.",
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "",
  "Útero de contornos regulares.",
].join("\n");

console.log("\nGuard de técnica/via\n");

console.log("Detecção no ditado");
eq("transvaginal", detectStatedVia("avaliação por via transvaginal do colo"), "transvaginal");
eq("endovaginal conta como TV", detectStatedVia("sonda endovaginal"), "transvaginal");
eq("transabdominal", detectStatedVia("exame transabdominal da pelve"), "transabdominal");
eq("suprapúbica conta como TA", detectStatedVia("via suprapúbica"), "transabdominal");
eq("as duas", detectStatedVia("transabdominal e complementado por via transvaginal"), "ambas");
eq("sem menção → null", detectStatedVia("útero de contornos regulares, ovários normais"), null);
eq("NEGAÇÃO não conta", detectStatedVia("sem complementação transvaginal"), null);
eq("negação 'não foi realizada'", detectStatedVia("não foi realizada via vaginal"), null);

console.log("\nDetecção no laudo (só o bloco de técnica)");
eq("obstétrico afirma TA", detectReportedVia(OBST), "transabdominal");
eq("pelve afirma ambas", detectReportedVia(PELVE_TA_TV), "ambas");
eq(
  "menção nos ACHADOS não conta como técnica",
  detectReportedVia(OBST + "\nColo avaliado por via transvaginal medindo 32 mm."),
  "transabdominal",
);

console.log("\nContradição — os casos que doem");
{
  // Gestação inicial por via transvaginal: o laudo diz "abdome da gestante".
  const m = detectViaMismatch("gestação inicial avaliada por via transvaginal", OBST);
  eq("TV ditada × obstétrico afirmando TA", m?.ditada, "transvaginal");
  eq("  afirmada", m?.afirmada, "transabdominal");
}
{
  // Pelve só transabdominal, mas o laudo afirma TA + TV.
  const m = detectViaMismatch("exame realizado apenas por via transabdominal", PELVE_TA_TV);
  eq("TA ditada × pelve afirmando ambas", m?.afirmada, "ambas");
  eq(
    "  nota alerta que afirma técnica não realizada",
    m?.nota.includes("mas o ditado indica via transabdominal"),
    true,
  );
}
eq("sem via ditada → no-op", detectViaMismatch("feto único cefálico", OBST), null);
eq("via batendo → no-op", detectViaMismatch("via transabdominal", OBST), null);

console.log("\nAplicação");
{
  const antes = OBST;
  const depois = applyTecnicaViaGuard("avaliada por via transvaginal", antes);
  eq("anexa [REVISAR]", depois.includes("[REVISAR:"), true);
  eq("preserva o texto original", depois.includes("abrangendo todo o abdome da gestante"), true);
  eq("nota fica antes dos ACHADOS", depois.indexOf("[REVISAR:") < depois.indexOf("OS SEGUINTES ASPECTOS"), true);
  eq("idempotente", applyTecnicaViaGuard("via transvaginal", depois), depois);
}
eq("no-op não altera nada", applyTecnicaViaGuard("feto cefálico", OBST), OBST);

console.log(`\n${ok} ok, ${fail} falhas\n`);
if (fail > 0) process.exit(1);
