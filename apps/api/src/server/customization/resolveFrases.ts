/**
 * A redação do médico que vale para ESTA geração, nas categorias sem catálogo.
 *
 * Irmão de `resolve.ts`, e com o mesmo princípio: **na dúvida, não
 * personalize**. Nada aqui lança — nem banco fora do ar, nem categoria
 * desconhecida, nem operação que deixou de valer. O laudo sempre sai.
 *
 * A DIFERENÇA para o `resolve.ts`: lá a personalização entra antes, montando o
 * laudo pelo catálogo. Aqui ela entra depois, trocando linhas do laudo pronto.
 * Por isso o que se resolve não é um catálogo — é uma lista de
 * `FrasePersonalizada`, cada uma com a frase-base ATUAL do modelo.
 *
 * A frase-base não é guardada no banco de propósito. Ela é recuperada do
 * modelo de hoje pelo id: se o renderer mudou aquela redação, o id sumiu, a
 * personalização não é resolvida e o laudo sai no padrão. Guardar a base
 * congelaria uma frase que o sistema não escreve mais.
 */

import { personalizacaoAtiva } from "./ativa";
import { ehEstiloVivo } from "@/server/renderer/catalog/registry";
import { cenariosDe, laudoDoCenario, modeloNormalDe, laudoPadraoDe } from "@/server/renderer/catalog/modeloNormalRegistry";
import { linhasDoLaudo } from "@/server/renderer/catalog/modeloNormal";
import { versaoDerivadaDe } from "@/server/renderer/catalog/modeloNormalCatalog";
import type { FrasePersonalizada } from "@/server/pipeline/frasesPersonalizadas";
import type { Operation } from "@/server/renderer/catalog/types";
import { lerPublicada, type Executor } from "./store";

/**
 * POR QUE não se aplica — em código, não em prosa.
 *
 * O aviso ao médico dependia de `motivo.includes("mudou")`, e a mensagem do
 * catálogo obstétrico diz "o modelo-base hoje é…": o aviso simplesmente não
 * saía (achado do Codex, 19/08). Casar string é uma trava que se desfaz na
 * primeira vez que alguém melhora o texto.
 */
export type MotivoTecnico =
  | "inativa"
  | "sem_publicacao"
  | "base_desatualizada"
  | "sem_modelo"
  | "erro";

export type FrasesResolvidas =
  | { aplicar: false; motivo: string; codigo: MotivoTecnico }
  | {
      aplicar: true;
      versao: number;
      frases: FrasePersonalizada[];
      /** Qual modelo derivado assinou esta personalização — para a auditoria. */
      catalogId: string;
      /** A impressão digital do modelo no momento da geração. */
      baseVersao: number;
    };

const NAO = (motivo: string, codigo: MotivoTecnico = "inativa"): FrasesResolvidas => ({
  aplicar: false,
  motivo,
  codigo,
});

/**
 * As frases-base de hoje, por id. É este mapa que decide o que ainda vale:
 * um id que não está aqui é uma personalização escrita contra um modelo que o
 * sistema não escreve mais.
 */
export function frasesBaseDe(categoria: string, estilo: string): Map<string, string> {
  const laudo = laudoPadraoDe(categoria, estilo);
  if (!laudo) return new Map();

  const out = new Map(linhasDoLaudo(laudo).map((l) => [l.id, l.texto] as const));

  /**
   * TODOS OS CENÁRIOS, não só o padrão (achado do Codex, 19/08).
   *
   * A Biblioteca desenha um cenário por aba e o catálogo derivado já ancora os
   * slots de todos. Este mapa continuava só com o cenário padrão: no
   * morfológico, 37 das 39 linhas do 2º trimestre e 35 das 37 do 3º ficavam de
   * fora. A tela aceitava a personalização e a GERAÇÃO recusava o conjunto
   * inteiro — porque aqui é tudo ou nada.
   *
   * Um id que aparece em dois cenários tem o mesmo texto: o id É o hash do
   * texto mascarado. Por isso o primeiro a entrar vence sem ambiguidade.
   */
  for (const c of cenariosDe(categoria)) {
    const outro = laudoDoCenario(categoria, estilo, c.seed);
    if (!outro) continue;
    for (const l of linhasDoLaudo(outro)) {
      if (!out.has(l.id)) out.set(l.id, l.texto);
    }
  }
  return out;
}

/**
 * Converte as operações gravadas em trocas de frase — TODAS OU NENHUMA.
 *
 * ⚠️ A versão anterior descartava as que não casavam e aplicava o resto. Com
 * cinco frases publicadas e duas mudando de hash num deploy, o médico recebia
 * um laudo com três personalizações e duas não — sem aviso, e sem que o texto
 * resultante fosse nem o dele nem o padrão (achado do Codex, 19/08).
 *
 * Meia personalização é pior que nenhuma: o médico confere o laudo esperando a
 * redação dele e encontra um híbrido que nunca revisou. `null` aqui faz o laudo
 * sair inteiro no modelo-base, com o motivo na auditoria.
 */
export function frasesDeOperacoes(
  operations: Operation[],
  base: Map<string, string>,
): FrasePersonalizada[] | null {
  const out: FrasePersonalizada[] = [];
  for (const o of operations) {
    if (o.op === "replace_phrase" || o.op === "remove_slot") {
      const b = base.get(o.slot);
      // A âncora sumiu do modelo — a redação foi escrita contra um texto que o
      // sistema não escreve mais.
      if (b === undefined) return null;
      out.push({ id: o.slot, base: b, nova: o.op === "replace_phrase" ? o.value : null });
      continue;
    }
    /**
     * `append_conclusion_item` e `insert_phrase_after` ainda não valem no
     * modelo derivado: acrescentar linha exige saber ONDE, e a âncora aqui é
     * uma frase que pode não estar no laudo. Uma operação que o motor não sabe
     * executar invalida o conjunto — aplicar as outras entregaria uma
     * personalização parcial, que é o que este `null` existe para impedir.
     */
    return null;
  }
  return out;
}

/** Nunca rejeita — o chamador pode dar `await` sem try/catch. */
export async function resolverFrasesPersonalizadas(
  args: { userId: string; categoryCode: string; styleCode: string },
  /** Só nos testes: uma transação com rollback. */
  _db?: Executor,
): Promise<FrasesResolvidas> {
  try {
    /**
     * A MESMA regra da tela. Enquanto cada ponto tinha a sua, a Biblioteca
     * dizia "em uso" e o gerador ignorava — ou o contrário. Ver `ativa.ts`.
     */
    const a = personalizacaoAtiva({
      userId: args.userId,
      categoria: args.categoryCode,
      estilo: args.styleCode,
    });
    if (!a.ativa) return NAO(a.explicacao);
    if (!modeloNormalDe(args.categoryCode)) {
      return NAO(`sem modelo para ${args.categoryCode}`, "sem_modelo");
    }

    if (!ehEstiloVivo(args.styleCode)) return NAO(`estilo desconhecido: ${args.styleCode}`, "sem_modelo");

    const publicada = await lerPublicada(
      { userId: args.userId, categoryCode: args.categoryCode, styleCode: args.styleCode },
      _db,
    );
    if (!publicada) return NAO("médico não tem personalização publicada", "sem_publicacao");

    const base = frasesBaseDe(args.categoryCode, args.styleCode);
    if (base.size === 0) return NAO("o modelo desta categoria não pôde ser derivado", "sem_modelo");

    /**
     * TRAVA DE VERSÃO. O id de cada frase já pega "a frase que ele reescreveu
     * mudou". Isto pega o resto: uma linha nova entre as dele, uma irmã
     * reescrita num deploy. O médico revisou um documento inteiro antes de
     * publicar — se o documento mudou, ele revisa de novo.
     */
    const versaoAtual = versaoDerivadaDe(args.categoryCode, args.styleCode);
    if (publicada.baseVersao !== versaoAtual) {
      return NAO(
        `o modelo-base desta categoria mudou desde a publicação (${publicada.baseVersao} → ${versaoAtual}) — ` +
          "reveja na Biblioteca e publique de novo",
        "base_desatualizada",
      );
    }

    const frases = frasesDeOperacoes(publicada.operations, base);
    if (frases === null || frases.length === 0) {
      return NAO(
        `as ${publicada.operations.length} personalização(ões) publicadas não valem mais no modelo atual — ` +
          "o texto-base mudou; republique na Biblioteca para conferir e publicar de novo",
        "base_desatualizada",
      );
    }
    return {
      aplicar: true,
      versao: publicada.versao,
      frases,
      catalogId: `${args.categoryCode}/${args.styleCode}`,
      baseVersao: versaoAtual,
    };
  } catch (err) {
    console.warn("resolverFrasesPersonalizadas falhou; gerando sem personalização:", err);
    return NAO("falha ao resolver a personalização", "erro");
  }
}
