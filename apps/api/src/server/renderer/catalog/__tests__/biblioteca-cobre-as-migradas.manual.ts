/**
 * TODA CATEGORIA MIGRADA APARECE NA BIBLIOTECA — o gate.
 *
 * A web e a Biblioteca renderizam pelo mesmo motor, mas por caminhos
 * diferentes: a web pelo `/render`, a Biblioteca por `projetarModelos`. Nada
 * garantia que os dois andassem juntos — e não andaram: o ABDOMEN_TOTAL passou
 * uma semana migrado no `/render` e respondendo 404 na Biblioteca, porque o
 * segundo caminho não recebia a máscara do banco.
 *
 * O sintoma é traiçoeiro: a categoria funciona ao GERAR e some ao
 * PERSONALIZAR. Ninguém testa as duas coisas na mesma sessão.
 *
 * Rodar de `apps/api` (precisa do banco — a máscara do abdome vem de lá):
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/biblioteca-cobre-as-migradas.manual.ts
 */

import postgres from "postgres";
import { catalogoDerivadoDe } from "../modeloNormalCatalog";
import { contextoDeRender } from "../contextoDeRender";

/**
 * Espelha `apps/web/src/lib/catalog/migradas.ts`. Duplicado de propósito: o
 * `apps/api` não importa do `apps/web` em runtime, e um espelho que diverge
 * faz o gate reprovar — que é o aviso certo.
 */
const MIGRADAS = [
  "TIREOIDE",
  "PELVE_FEMININA",
  "MAMARIA",
  "OBSTETRICA",
  "MORFOLOGICO",
  "DOPPLER_OBSTETRICO",
  "ABDOMEN_TOTAL",
];

async function principal() {
  const sql = postgres(process.env.DATABASE_URL ?? process.env.POSTGRES_URL!, { max: 1, prepare: false });
  void sql;

  console.log("═".repeat(74));
  console.log("A Biblioteca cobre todas as categorias migradas?");
  console.log("═".repeat(74) + "\n");

  let falhas = 0;
  for (const cat of MIGRADAS) {
    const ctx = await contextoDeRender(cat, "CLASSICO_COMPLETO");
    const entrada = catalogoDerivadoDe(cat, "CLASSICO_COMPLETO", ctx);
    const modelos = entrada?.projetarModelos?.() ?? [];
    const linhas = modelos[0]?.linhas?.length ?? 0;

    if (linhas === 0) {
      console.log(`  ✗ ${cat.padEnd(16)} SEM MODELO — migrada no /render e ausente da Biblioteca`);
      falhas++;
      continue;
    }
    console.log(`  ✓ ${cat.padEnd(16)} ${String(linhas).padStart(3)} linhas · ${modelos.length} cenário(s)`);
  }

  /**
   * O contrapeso: uma categoria NÃO migrada não precisa aparecer, mas se
   * aparecer não é erro — a Biblioteca é mais antiga que a migração e cobre
   * treze. O que este gate mede é o inverso: migrada e ausente.
   */
  console.log("\n" + "═".repeat(74));
  console.log(falhas === 0 ? "✓ todas as migradas têm modelo na Biblioteca" : `✗ ${falhas} migrada(s) sem modelo`);
  console.log("═".repeat(74));
  process.exit(falhas ? 1 : 0);
}

void principal();
