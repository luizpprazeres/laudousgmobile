/** Rota do exame × ditado: qual modelo o laudo usa.
 * Rodar em apps/api: pnpm exec tsx src/server/pipeline/__tests__/categoria-efetiva.manual.ts
 * Determinístico; sem banco, rede ou LLM.
 *
 * Guarda a regressão de 15/09/2026: com "Doppler obstétrico (combinado)" escolhido no app,
 * um ditado morfológico saía com o modelo OBSTETRICA e perdia a estrutura morfológica.
 */
import assert from "node:assert/strict";
import { resolveEffectiveCategory } from "../effectiveCategory";

const conhecidas = new Set(["OBSTETRICA", "MORFOLOGICO", "DOPPLER_OBSTETRICO", "ABDOMEN_TOTAL"]);
const morfoDoppler =
  "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE COM DOPPLER COLORIDO. Cerebelo 21 mm, cisterna magna 3 mm, úmero 31 mm.";
const obstDoppler = "Ultrassonografia obstétrica com Doppler colorido. DBP 72 mm, IP umbilical 0,93.";

const casos = [
  { nome: "ditado morfológico + exame Doppler combinado → morfológico", detectada: "DOPPLER_OBSTETRICO", ditado: morfoDoppler, hint: "DOPPLER_OBSTETRICO", modo: "combined", esperado: "MORFOLOGICO" },
  { nome: "ditado obstétrico + exame Doppler combinado → obstétrico", detectada: "OBSTETRICA", ditado: obstDoppler, hint: "DOPPLER_OBSTETRICO", modo: "combined", esperado: "OBSTETRICA" },
  { nome: "Doppler ISOLADO nunca vira morfológico", detectada: "DOPPLER_OBSTETRICO", ditado: morfoDoppler, hint: "DOPPLER_OBSTETRICO", modo: "isolated", esperado: "DOPPLER_OBSTETRICO" },
  { nome: "escolha explícita de obstétrico vence o ditado", detectada: "MORFOLOGICO", ditado: morfoDoppler, hint: "OBSTETRICA", modo: undefined, esperado: "OBSTETRICA" },
  { nome: "escolha explícita de morfológico é preservada", detectada: "OBSTETRICA", ditado: obstDoppler, hint: "MORFOLOGICO", modo: undefined, esperado: "MORFOLOGICO" },
  { nome: "sem escolha: ditado morfológico roteia morfológico", detectada: "DOPPLER_OBSTETRICO", ditado: morfoDoppler, hint: undefined, modo: undefined, esperado: "MORFOLOGICO" },
  { nome: "sem escolha: ditado obstétrico roteia obstétrico", detectada: "OBSTETRICA", ditado: obstDoppler, hint: undefined, modo: undefined, esperado: "OBSTETRICA" },
  { nome: "categoria fora da família obstétrica não é reclassificada", detectada: "ABDOMEN_TOTAL", ditado: "Ultrassonografia de abdome total.", hint: undefined, modo: undefined, esperado: "ABDOMEN_TOTAL" },
] as const;

let ok = 0;
for (const caso of casos) {
  const got = resolveEffectiveCategory(
    caso.detectada, caso.ditado, "teste", conhecidas, caso.hint,
    caso.modo as "combined" | "isolated" | undefined,
  );
  assert.equal(got, caso.esperado, `${caso.nome}: esperado ${caso.esperado}, veio ${got}`);
  console.log(`✓ ${caso.nome}`);
  ok++;
}
console.log(`\n${ok}/${casos.length} rotas corretas`);
