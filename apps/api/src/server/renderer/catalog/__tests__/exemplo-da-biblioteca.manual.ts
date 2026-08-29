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
import { contextoDeRender } from "../contextoDeRender";
import { laudoPadraoDe, cenariosDe, categoriasComModeloNormal } from "@/server/renderer/catalog/modeloNormalRegistry";
import { sementeDeExemplo } from "@/server/renderer/catalog/exemplos";
/** `tsx` compila para CJS: sem await de topo. */
async function rodar() {
  let faltam = 0;
  let comLacuna = 0;
  for (const { categoria } of categoriasComModeloNormal()) {
    /**
   * O ABDOMEN_TOTAL migrou SÓ NO CLÁSSICO (23/08). O objetivo tem
   * `assembleAbdomenObjetivo`, que é código puro e migra sem máscara, mas ainda
   * não foi feito — o renderer devolve `null` de propósito. Declarado aqui para
   * a ausência ser uma DECISÃO registrada, não um verde por acidente nem um
   * vermelho que se aprende a ignorar.
   */
  const NAO_MIGRADO = new Set(["ABDOMEN_TOTAL|OBJETIVO"]);

  for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"])
    for (const c of cenariosDe(categoria)) {
      if (NAO_MIGRADO.has(`${categoria}|${estilo}`)) continue;
      /** O abdome precisa da máscara do banco; as outras ignoram o contexto. */
      const ctx = await contextoDeRender(categoria, estilo);
      const t = laudoPadraoDe(categoria, estilo, { ...c.seed, ...sementeDeExemplo(categoria, c.nome) }, ctx);
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
}

void rodar();
