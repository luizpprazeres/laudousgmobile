/**
 * Golden PURO do guard de formato do MSK writer_guarded (sem LLM).
 * Rodar: tsx src/server/pipeline/__tests__/msk-writer-format.manual.ts
 */
import { normalizeMskWriterFormat } from "../mskWriterFormat";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// 1) Corrige o typo do modelo "OS SEGUINTOS ASPECTOS" → canônico.
{
  const out = normalizeMskWriterFormat("OS SEGUINTOS ASPECTOS FORAM OBSERVADOS:\nTendão x.");
  check("SEGUINTOS → SEGUINTES", /^OS SEGUINTES ASPECTOS FORAM OBSERVADOS:$/m.test(out) && !/SEGUINTOS/.test(out), out);
}
// 2) Remove bullets "- " do início das linhas.
{
  const out = normalizeMskWriterFormat("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n- Tendão supraespinhal preservado.\n- Bursa sem distensão.");
  check("remove bullets '- '", !/^-\s/m.test(out) && /Tendão supraespinhal preservado\./.test(out), out);
}
// 3) Cabeçalhos COMENTÁRIOS/CONCLUSÃO sem acento → canônicos.
{
  const out = normalizeMskWriterFormat("COMENTARIOS:\nx\n\nCONCLUSAO:\ny");
  check("COMENTARIOS → COMENTÁRIOS", /^COMENTÁRIOS:$/m.test(out), out);
  check("CONCLUSAO → CONCLUSÃO", /^CONCLUSÃO:$/m.test(out), out);
}
// 4) NÃO toca no conteúdo clínico (medidas, termos).
{
  const raw = "Fossa poplítea com cisto de Baker medindo 2,4 cm no maior eixo.";
  check("conteúdo clínico intocado", normalizeMskWriterFormat(raw) === raw, normalizeMskWriterFormat(raw));
}
// 5) Preserva linha em branco entre achados/laudos (estilo da casa).
{
  const out = normalizeMskWriterFormat("Tendão a preservado.\n\nTendão b preservado.\n\n\nULTRASSONOGRAFIA DO PÉ");
  check("preserva linha em branco entre achados", /preservado\.\n\nTendão b/.test(out), JSON.stringify(out));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
