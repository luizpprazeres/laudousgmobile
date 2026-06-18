/**
 * Teste do guard de sanitização de artefatos de ditado.
 * POSITIVOS (limpa garble real do boletim) + NEGATIVOS (não mutila laudo legítimo).
 * Rodar: tsx src/server/pipeline/__tests__/dictationSanitizer.manual.ts
 */
import { sanitizeDictationArtifacts as S } from "../dictationSanitizer";

let pass = 0, fail = 0;
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };
const eq = (got: string, want: string, t: string) => ck(got === want, t, got !== want ? `got: ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}` : undefined);

// ── POSITIVOS — garble real ──
eq(S("Placenta com ecotextura heterogênea, vírgula, maior bolsão de 4 cm."),
   "Placenta com ecotextura heterogênea, maior bolsão de 4 cm.",
   "'vírgula' falada → ','");
eq(S("Você vai escrever imagem hipoecoica no segmento IV."),
   "Imagem hipoecoica no segmento IV.",
   "remove 'Você vai escrever' (mantém conteúdo)");
eq(S("Item dos ovários: Ovários ecograficamente normais."),
   "Ovários ecograficamente normais.",
   "remove rótulo 'Item dos ovários:'");
eq(S("Gestação em torno de 26 semanas. tchau tchau"),
   "Gestação em torno de 26 semanas.",
   "remove despedida 'tchau tchau'");
ck(!S("CONCLUSÃO:\nAcrescente item: nódulo na mama direita.").includes("Acrescente item"),
   "remove 'Acrescente item:'");
ck(!S("Após o título, acrescente a comparação com o exame anterior.").includes("Após o título"),
   "remove 'Após o título, acrescente'");

// Capitaliza? — o conteúdo após remoção pode começar minúsculo; aceitamos (não é
// papel do sanitizer recapitalizar; o importante é remover o comando).

// ── NEGATIVOS — texto de laudo LEGÍTIMO não pode ser tocado ──
const legit = [
  "Útero em anteversão, medindo 6,8 x 3,6 x 3,9 cm.",
  "Diâmetro biparietal (DBP) de ____ mm.", // placeholder PRESERVADO
  "Gestação em torno de 22 semanas e 1 dias.",
  "No final da gestação, espera-se maturação placentária.", // "no final" SEM comando
  "Imagem anecoica na topografia do colo uterino.",
  "Ovário direito medindo 2,1 x 1,8 x 1,7 cm, apresentando imagens anecoicas.",
  "1) Bexiga ecograficamente normal.\n2) Útero de volume normal (50,9 cm³).",
  "Líquido amniótico de quantidade normal (ILA de 12,3 cm).",
];
for (const l of legit) eq(S(l), l, `NEGATIVO intacto: ${l.slice(0, 45)}…`);

// placeholder explicitamente preservado
ck(S("Peso aproximado de ____ gramas.").includes("____"), "placeholder ____ PRESERVADO");

// idempotência
{
  const once = S("Você vai escrever nódulo, vírgula, sólido. tchau");
  ck(S(once) === once, "idempotente");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
