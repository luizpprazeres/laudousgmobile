/**
 * Golden do normalizador de garble de ASR clínico (boletim 2026-06-30).
 * Rodar: tsx src/server/pipeline/__tests__/asr-clinical.manual.ts
 */
import { normalizeAsrClinical } from "../asrClinical";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass += 1; console.log(`✓ ${name}`); }
  else { fail += 1; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

// TIREOIDE e7ab387b: "estímulo" = istmo (istmo ficava em branco) — SÓ em TIREOIDE.
{
  const out = normalizeAsrClinical("estímulo medindo 1.4 por 0.3 por 1.3 com volume de 0.3", "TIREOIDE");
  check("estímulo → istmo (TIREOIDE)", /^istmo medindo 1\.4/.test(out), out);
}
// CONTROLE (review dex1): "estímulo" fora de TIREOIDE NÃO é tocado (palavra PT legítima).
{
  const raw = "avaliação da resposta ao estímulo doloroso";
  check("estímulo intocado sem categoria", normalizeAsrClinical(raw) === raw, normalizeAsrClinical(raw));
  check("estímulo intocado em PELVE", normalizeAsrClinical(raw, "PELVE_FEMININA") === raw, normalizeAsrClinical(raw, "PELVE_FEMININA"));
}
// PELVE 900c411c: "na ecoeca" / "ecoeca" = anecoica (garble global, qualquer categoria).
{
  check("'na ecoeca' → anecoica", normalizeAsrClinical("imagem na ecoeca com forma triangular", "PELVE_FEMININA") === "imagem anecoica com forma triangular");
  check("'ecoeca' → anecoica", /anecoica/.test(normalizeAsrClinical("imagem ecoeca")));
}
// PELVE 900c411c: "miolétrico" = miométrio (garble global).
{
  check("miolétrico → miométrio", normalizeAsrClinical("com o miolétrico residual de 0.5") === "com o miométrio residual de 0.5");
}
// CONTROLE: texto clínico legítimo NÃO é tocado (byte-idêntico), inclusive em TIREOIDE.
{
  const raw = "Lobo direito medindo 4.3 por 1.9, imagem hipoecoica no miométrio, anecoica com septos.";
  check("texto legítimo intocado", normalizeAsrClinical(raw, "TIREOIDE") === raw, normalizeAsrClinical(raw, "TIREOIDE"));
}
// CONTROLE: não confunde "anecoica" já correta.
{
  check("'anecoica' correta preservada", normalizeAsrClinical("imagem anecoica homogênea") === "imagem anecoica homogênea");
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
