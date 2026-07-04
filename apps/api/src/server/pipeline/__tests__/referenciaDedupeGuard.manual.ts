/**
 * Golden — dedup da frase de referência de IG (boletim 04/07, caso 10813392).
 * A frase "Primeira ultrassonografia realizada…" só pode aparecer UMA vez.
 * Rodar: tsx src/server/pipeline/__tests__/referenciaDedupeGuard.manual.ts
 */
import { dedupReferenciaFrase as D } from "../referenciaDedupeGuard";

let pass = 0, fail = 0;
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

// ── CASO REAL 10813392: frase após o título + cópia nos comentários ──
const REAL = `ULTRASSONOGRAFIA OBSTÉTRICA

Primeira ultrassonografia realizada 06/05/2026 com 16 semanas e 4 dias. Hoje com 24 semanas e 6 dias.

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.
A primeira ultrassonografia realizada 06/05/2026 com 16 semanas e 4 dias, hoje com 24 semanas e 6 dias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação pélvica, com dorso à esquerda.`;
{
  const out = D(REAL);
  ck(count(out, /primeira ultrassonografia realizada/gi) === 1, "caso real: frase 1ª US aparece 1× (era 2×)");
  ck(/^Primeira ultrassonografia realizada/m.test(out), "caso real: mantém a ocorrência canônica (após o título)");
  ck(!/A primeira ultrassonografia realizada/.test(out), "caso real: remove a cópia dos comentários");
  ck(/OS SEGUINTES ASPECTOS/.test(out) && /Feto único/.test(out), "caso real: resto do laudo intacto");
  ck(!/\n{3,}/.test(out), "caso real: sem 3+ quebras seguidas");
}

// ── DUM: frase de última menstruação também deduplica ──
{
  const dum = `Data da última menstruação em 01/01/2026, correspondente a 20 semanas na data do exame.
COMENTÁRIOS:
Exame X.
Data da última menstruação em 01/01/2026, correspondente a 20 semanas na data do exame.`;
  ck(count(D(dum), /data da última menstruação em/gi) === 1, "DUM: frase aparece 1× (era 2×)");
}

// ── idempotência + não-regressão ──
{
  ck(D(D(REAL)) === D(REAL), "idempotente");
  const semRef = `ULTRASSONOGRAFIA OBSTÉTRICA\n\nCOMENTÁRIOS:\nExame X.\n\nCONCLUSÃO:\n1) Gestação em torno de 24 semanas.`;
  ck(D(semRef) === semRef, "sem frase de referência → intocado");
  const umaVez = `Primeira ultrassonografia realizada 06/05/2026 com 16 semanas. Hoje com 24 semanas.\n\nCOMENTÁRIOS:\nExame X.`;
  ck(D(umaVez) === umaVez, "1 ocorrência só → intocado (byte-estável)");
}

// ── variante "compatível com … na data do exame" ──
{
  const v = `Primeira ultrassonografia compatível com 26 semanas e 2 dias na data do exame.
COMENTÁRIOS:
Exame X.
Primeira ultrassonografia compatível com 26 semanas e 2 dias na data do exame.`;
  ck(count(D(v), /primeira ultrassonografia compat/gi) === 1, "variante 'compatível' deduplica");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
