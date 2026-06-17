/**
 * GOLDEN determinístico do guard de espaçamento de seções (MSK).
 * Rodar: tsx src/server/pipeline/__tests__/sectionSpacingGuard.manual.ts
 */
import { normalizeSectionSpacing } from "../sectionSpacingGuard";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// 1) Caso que "pulava linha" (linha em branco entre cada achado) → quebra simples.
{
  const input = [
    "ULTRASSONOGRAFIA DO OMBRO DIREITO",
    "",
    "COMENTÁRIOS:",
    "",
    "Exame realizado com transdutor linear.",
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    "",
    "Tendão supraespinhal com espessamento.",
    "",
    "Tendões infraespinhal e subescapular preservados.",
    "",
    "Não há sinais de derrame articular.",
    "",
    "CONCLUSÃO:",
    "",
    "1) Tendinopatia do supraespinhal direito.",
    "",
    "2) Bursite subacromial-subdeltoidea direita.",
  ].join("\n");
  const out = normalizeSectionSpacing(input);
  const expected = [
    "ULTRASSONOGRAFIA DO OMBRO DIREITO",
    "",
    "COMENTÁRIOS:",
    "Exame realizado com transdutor linear.",
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    "Tendão supraespinhal com espessamento.",
    "Tendões infraespinhal e subescapular preservados.",
    "Não há sinais de derrame articular.",
    "",
    "CONCLUSÃO:",
    "1) Tendinopatia do supraespinhal direito.",
    "2) Bursite subacromial-subdeltoidea direita.",
  ].join("\n");
  check("pula-linha → quebra simples + linha em branco só antes de cabeçalhos", out === expected, `GOT:\n${out}`);
}

// 2) Caso "colado" (tudo numa linha não muda — guard não separa frases, só espaça seções).
//    Aqui o foco é: achados já em linhas adjacentes permanecem adjacentes.
{
  const input = "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nA.\nB.\nC.\n\nCONCLUSÃO:\nX.";
  const out = normalizeSectionSpacing(input);
  check("achados adjacentes permanecem adjacentes", out === "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nA.\nB.\nC.\n\nCONCLUSÃO:\nX.", `GOT:\n${out}`);
}

// 3) Multi-laudo: linha em branco antes de CADA título.
{
  const input = "ULTRASSONOGRAFIA DO PÉ DIREITO\nCOMENTÁRIOS:\nTec.\nCONCLUSÃO:\nPé direito normal.\nULTRASSONOGRAFIA DO PÉ ESQUERDO\nCOMENTÁRIOS:\nTec.\nCONCLUSÃO:\nPé esquerdo normal.";
  const out = normalizeSectionSpacing(input);
  const segundoTitulo = out.indexOf("ULTRASSONOGRAFIA DO PÉ ESQUERDO");
  check("multi-laudo: linha em branco antes do 2º título", out.slice(segundoTitulo - 2, segundoTitulo) === "\n\n" || out.includes("\n\nULTRASSONOGRAFIA DO PÉ ESQUERDO"), `GOT:\n${out}`);
  check("multi-laudo: 1º título sem linha em branco antes", out.startsWith("ULTRASSONOGRAFIA DO PÉ DIREITO\n"), `GOT:\n${out}`);
}

// 4) Estilo objetivo (TÉCNICA/ACHADOS/IMPRESSÃO) também é reconhecido.
{
  const input = "TÉCNICA:\nExame.\n\nACHADOS:\nA.\n\nB.\n\nIMPRESSÃO:\nNormal.";
  const out = normalizeSectionSpacing(input);
  check("objetivo: A e B adjacentes (sem linha em branco)", /ACHADOS:\nA\.\nB\./.test(out), `GOT:\n${out}`);
  check("objetivo: linha em branco antes de IMPRESSÃO", /B\.\n\nIMPRESSÃO:/.test(out), `GOT:\n${out}`);
}

// 5) Idempotência: aplicar 2x = aplicar 1x.
{
  const input = "ULTRASSONOGRAFIA DO JOELHO DIREITO\n\nCOMENTÁRIOS:\nTec.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nA.\nB.\n\nCONCLUSÃO:\nNormal.";
  const once = normalizeSectionSpacing(input);
  const twice = normalizeSectionSpacing(once);
  check("idempotente", once === twice, `1x:\n${once}\n2x:\n${twice}`);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
