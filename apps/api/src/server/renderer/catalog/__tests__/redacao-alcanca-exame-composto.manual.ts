/**
 * A REDAÇÃO DO MÉDICO ALCANÇA O EXAME COMPOSTO — o gate do pedido de 18/09/2026.
 *
 * Ele personaliza o modelo que vê na Biblioteca (morfológico de 2º trimestre,
 * digamos), e o exame que ele faz no dia seguinte tem Doppler e cervicometria
 * junto. Se a redação não valesse ali, a Biblioteca estaria prometendo o que o
 * laudo não entrega — e do lado dele isso é indistinguível de "não funciona".
 *
 * O morfológico não tem catálogo estruturado: a personalização é de FRASE
 * (`aplicarFrasesPersonalizadas`), aplicada sobre o laudo pronto, ancorada pelo
 * `idDaFrase`. Este teste prova que a âncora sobrevive ao complemento, e que o
 * complemento em si não é tocado.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/redacao-alcanca-exame-composto.manual.ts
 */
import assert from "node:assert/strict";
import { contextoDeRender } from "../contextoDeRender";
import { laudoPadraoDe, cenariosDe } from "../modeloNormalRegistry";
import { sementeDeExemplo } from "../exemplos";
import { idDaFrase } from "../modeloNormal";
import { aplicarFrasesPersonalizadas } from "@/server/pipeline/frasesPersonalizadas";

/** Pares (modelo simples que ele personaliza, exame composto que ele faz). */
const PARES: Array<{ categoria: string; simples: string; composto: string }> = [
  { categoria: "MORFOLOGICO", simples: "Segundo trimestre", composto: "2º trimestre com Doppler" },
  {
    categoria: "MORFOLOGICO",
    simples: "Segundo trimestre",
    composto: "2º trimestre com Doppler e cervicometria",
  },
  { categoria: "MORFOLOGICO", simples: "Terceiro trimestre", composto: "3º trimestre com Doppler" },
  /**
   * A obstétrica entra como CONTROLE, não como caso de produção: lá a
   * personalização é a do catálogo escrito, que monta o laudo slot a slot e
   * nem chega a usar este caminho. Vale como prova de que a âncora de frase
   * sobrevive ao complemento também no exame que mais mudou.
   */
  { categoria: "OBSTETRICA", simples: "Gestação padrão", composto: "Com Doppler e cervicometria" },
];

/** Uma frase de NORMALIDADE em prosa — o que o médico de fato reescreve. */
const ANCORA = /^(?:As estruturas cranianas|O estômago|Os movimentos fetais|Nariz e narinas|Coração com quatro)/;

let falhas = 0;
function caso(nome: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${nome}`);
  } catch (err) {
    falhas++;
    console.log(`  ✗ ${nome}\n      ${(err as Error).message.split("\n")[0]}`);
  }
}

async function laudo(categoria: string, cenario: string): Promise<string> {
  const c = cenariosDe(categoria).find((x) => x.nome === cenario);
  assert.ok(c, `cenário ausente na Biblioteca: ${categoria} · ${cenario}`);
  const ctx = await contextoDeRender(categoria, "CLASSICO_COMPLETO");
  const t = laudoPadraoDe(
    categoria,
    "CLASSICO_COMPLETO",
    { ...c.seed, ...sementeDeExemplo(categoria, cenario) },
    ctx,
  );
  assert.ok(t, `não renderizou: ${categoria} · ${cenario}`);
  return t;
}

async function rodar() {
  console.log("\nA redação feita no modelo simples vale no exame composto\n");

  for (const par of PARES) {
    const simples = await laudo(par.categoria, par.simples);
    const composto = await laudo(par.categoria, par.composto);

    const base = simples.split("\n").find((l) => ANCORA.test(l.trim()))?.trim();
    assert.ok(base, `nenhuma frase-âncora no modelo simples de ${par.categoria}`);
    const nova = "REDAÇÃO DO MÉDICO (frase reescrita).";

    caso(`${par.categoria} · ${par.composto}: a âncora está no exame composto`, () => {
      assert.ok(
        composto.split("\n").some((l) => l.trim() === base),
        `a frase "${base.slice(0, 50)}…" não aparece no exame composto`,
      );
    });

    caso(`${par.categoria} · ${par.composto}: a redação é aplicada`, () => {
      const r = aplicarFrasesPersonalizadas(composto, [{ id: idDaFrase(base), base, nova }]);
      assert.equal(r.aplicadas, 1, `a redação não pegou (aplicadas=${r.aplicadas})`);
      assert.ok(r.texto.includes(nova), "a frase do médico não entrou no laudo");
      assert.ok(!r.texto.includes(base), "a frase antiga sobreviveu");
    });

    caso(`${par.categoria} · ${par.composto}: o complemento fica intacto`, () => {
      const r = aplicarFrasesPersonalizadas(composto, [{ id: idDaFrase(base), base, nova }]);
      for (const secao of ["DOPPLERVELOCIMETRIA:", "CERVICOMETRIA:"]) {
        if (!composto.includes(secao)) continue;
        assert.ok(r.texto.includes(secao), `a seção ${secao} sumiu`);
      }
      // As medidas do complemento continuam byte-a-byte as mesmas.
      const medidas = (t: string) => t.match(/índice de pulsatilidade de [\d,]+/gi) ?? [];
      assert.deepEqual(medidas(r.texto), medidas(composto), "uma medida do Doppler mudou");
    });
  }

  console.log(falhas === 0 ? "\n✓ a Biblioteca não promete o que o laudo não entrega\n" : `\n✗ ${falhas} falha(s)\n`);
  process.exit(falhas ? 1 : 0);
}

void rodar();
