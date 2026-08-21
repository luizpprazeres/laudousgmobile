/**
 * O EXEMPLO DA BIBLIOTECA SE LÊ PREENCHIDO — o gate.
 *
 * A coluna de exemplo existe para o médico ver como o modelo dele fica com
 * números. Um exemplo com `____` no meio não ilustra nada: ele mostra o mesmo
 * que a coluna ao lado, e o médico conclui que a tela está quebrada.
 *
 * Este gate renderiza CADA cenário de CADA categoria com a semente de
 * `exemplos.ts` e reprova quando sobra lacuna. Ele pegou quatro erros na
 * primeira execução — nomes de campo que eu havia chutado
 * (`parenquima_cm` × `espessura_parenquima_cm`, `prostata_medidas_cm` ×
 * `prostata_d1_cm`) e o feto mandado pela metade, que fazia o Zod recusar o
 * laudo inteiro EM SILÊNCIO: o exemplo simplesmente sumia, sem erro nenhum.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/exemplo-da-biblioteca.manual.ts
 */
import { laudoPadraoDe, cenariosDe, categoriasComModeloNormal } from "@/server/renderer/catalog/modeloNormalRegistry";
import { sementeDeExemplo } from "@/server/renderer/catalog/exemplos";
let faltam = 0;
let comLacuna = 0;
for (const { categoria } of categoriasComModeloNormal()) {
  for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"])
  for (const c of cenariosDe(categoria)) {
    const t = laudoPadraoDe(categoria, estilo, { ...c.seed, ...sementeDeExemplo(categoria, c.nome) });
    if (!t) { console.log(`  ✗ ${categoria} · ${c.nome} · ${estilo}: NÃO RENDERIZOU`); faltam++; continue; }
    const lac = t.split("\n").filter((l) => /_{2,}/.test(l));
    if (lac.length > 0) comLacuna++;
    const marca = lac.length === 0 ? "✓ preenchido" : `✗ ${lac.length} lacuna(s)`;
    console.log(`  ${marca.padEnd(16)} ${categoria} · ${c.nome} · ${estilo}`);
    if (lac.length) lac.slice(0,3).forEach((l)=>console.log(`        ${l.trim().slice(0,95)}`));
  }
}
console.log(
  faltam + comLacuna === 0
    ? "\n✓ todos os cenários rendem exemplo preenchido"
    : `\n✗ ${faltam} não renderizaram · ${comLacuna} com lacuna`,
);
process.exit(faltam + comLacuna ? 1 : 0);
