/**
 * Golden do passthrough MSK (laudo pré-formatado colado). Montagem pura, sem LLM.
 * Rodar: tsx src/server/renderer/__tests__/msk-passthrough.manual.ts
 */
import {
  isPreformattedMskReport,
  mskPassthrough,
} from "../categories/MUSCULOESQUELETICO";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const LAUDO_PRONTO = `ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e área de rotura parcial.
Bursa subacromial-subdeltoidea com espessamento sinovial na polia a 2.

CONCLUSÃO:
1) Rotura parcial do supraespinhal à direita.
2) Bursite subacromial-subdeltoidea à direita.`;

// 1) DETECTA laudo completo colado.
check("detecta laudo pré-formatado completo", isPreformattedMskReport(LAUDO_PRONTO), "deveria ser true");

// 2) NÃO detecta ditado curto só-diagnóstico (segue no renderer + biblioteca).
check("ditado só-diagnóstico NÃO é passthrough",
  !isPreformattedMskReport("joelho direito com tendinopatia da pata de ganso, pé esquerdo com fasciite plantar"));

// 3) NÃO detecta laudo parcial (sem CONCLUSÃO).
check("laudo sem CONCLUSÃO NÃO é passthrough",
  !isPreformattedMskReport("ULTRASSONOGRAFIA DO PÉ\n\nCOMENTÁRIOS:\nx\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\ny"));

// 4) Aceita variante "ACHADOS:" no lugar de "OS SEGUINTES ASPECTOS...".
check("aceita variante ACHADOS:",
  isPreformattedMskReport("ULTRASSONOGRAFIA DO JOELHO\nCOMENTÁRIOS:\nx\nACHADOS:\ny\nCONCLUSÃO:\nz"));

// 5) PASSTHROUGH preserva o corpo e as quebras internas (não regenera).
{
  const out = mskPassthrough(LAUDO_PRONTO);
  check("passthrough preserva título original", /^ULTRASSONOGRAFIA DO OMBRO DIREITO$/m.test(out), out);
  check("passthrough preserva a rotura ditada (não vira frase canônica)", /área de rotura parcial/.test(out), out);
  check("passthrough preserva a conclusão numerada do médico", /1\) Rotura parcial do supraespinhal à direita\./.test(out), out);
  check("passthrough NÃO injeta a técnica canônica do renderer", !/protocolo internacional de Serviços de Imagem/.test(out), out);
  check("passthrough mantém quebras internas (linha em branco antes de CONCLUSÃO)", /\n\nCONCLUSÃO:/.test(out), out);
}

// 6) Sanitização mínima segura: nomenclatura padronizada (polia a 2 → polia A2).
{
  const out = mskPassthrough(LAUDO_PRONTO);
  check("passthrough padroniza 'polia a 2' → 'polia A2'", /polia A2/.test(out) && !/polia a 2/i.test(out), out);
}

// 7) Apara espaços em branco à direita das linhas, sem tocar no conteúdo.
{
  const out = mskPassthrough("ULTRASSONOGRAFIA DO PÉ   \nCOMENTÁRIOS:  \nx\nACHADOS:\ny\nCONCLUSÃO:\nz  ");
  check("passthrough apara trailing whitespace", !/ \n/.test(out) && !/\s$/.test(out), JSON.stringify(out));
}

// 8) NÃO aplica "artrose"→"alterações degenerativas" no passthrough (escolha do médico — dex1).
{
  const out = mskPassthrough("CONCLUSÃO:\nSinais de artrose do compartimento medial do joelho.");
  check("passthrough preserva 'artrose' do médico", /\bartrose\b/.test(out) && !/alterações degenerativas/.test(out), out);
}

// 9) NÃO reinterpreta comandos: "Recomendar controle..." fica intacto (bypass no route — dex1).
{
  const txt = "CONCLUSÃO:\nRotura parcial do supraespinhal à direita.\nRecomendar controle ultrassonográfico em 6 meses.";
  check("passthrough preserva 'Recomendar controle...' literal", mskPassthrough(txt).includes("Recomendar controle ultrassonográfico em 6 meses."), mskPassthrough(txt));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
