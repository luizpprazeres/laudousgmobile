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

import { env } from "@/server/env";
import { catalogEnabledFor } from "@/server/renderer/catalog/engine";
import { ehEstiloVivo } from "@/server/renderer/catalog/registry";
import { modeloNormalDe, laudoPadraoDe } from "@/server/renderer/catalog/modeloNormalRegistry";
import { linhasDoLaudo } from "@/server/renderer/catalog/modeloNormal";
import type { FrasePersonalizada } from "@/server/pipeline/frasesPersonalizadas";
import type { Operation } from "@/server/renderer/catalog/types";
import { lerPublicada, type Executor } from "./store";

export type FrasesResolvidas =
  | { aplicar: false; motivo: string }
  | { aplicar: true; versao: number; frases: FrasePersonalizada[] };

const NAO = (motivo: string): FrasesResolvidas => ({ aplicar: false, motivo });

/**
 * As frases-base de hoje, por id. É este mapa que decide o que ainda vale:
 * um id que não está aqui é uma personalização escrita contra um modelo que o
 * sistema não escreve mais.
 */
export function frasesBaseDe(categoria: string, estilo: string): Map<string, string> {
  const laudo = laudoPadraoDe(categoria, estilo);
  if (!laudo) return new Map();
  return new Map(linhasDoLaudo(laudo).map((l) => [l.id, l.texto]));
}

/** Converte as operações gravadas em trocas de frase, descartando o que não vale. */
export function frasesDeOperacoes(
  operations: Operation[],
  base: Map<string, string>,
): FrasePersonalizada[] {
  const out: FrasePersonalizada[] = [];
  for (const o of operations) {
    if (o.op === "replace_phrase") {
      const b = base.get(o.slot);
      if (b !== undefined) out.push({ id: o.slot, base: b, nova: o.value });
    } else if (o.op === "remove_slot") {
      const b = base.get(o.slot);
      if (b !== undefined) out.push({ id: o.slot, base: b, nova: null });
    }
    // `append_conclusion_item` e `insert_phrase_after` ainda não valem no
    // modelo derivado: acrescentar linha exige saber ONDE, e a âncora aqui é
    // uma frase que pode não estar no laudo. Fica para quando houver caso.
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
    const e = env();
    if (!catalogEnabledFor(e.MODEL_CUSTOMIZATION_CATEGORIES, args.categoryCode)) {
      return NAO("personalização desligada para esta categoria");
    }
    if (!modeloNormalDe(args.categoryCode)) {
      return NAO(`sem modelo para ${args.categoryCode}`);
    }

    if (!ehEstiloVivo(args.styleCode)) return NAO(`estilo desconhecido: ${args.styleCode}`);

    const publicada = await lerPublicada(
      { userId: args.userId, categoryCode: args.categoryCode, styleCode: args.styleCode },
      _db,
    );
    if (!publicada) return NAO("médico não tem personalização publicada");

    const base = frasesBaseDe(args.categoryCode, args.styleCode);
    if (base.size === 0) return NAO("o modelo desta categoria não pôde ser derivado");

    const frases = frasesDeOperacoes(publicada.operations, base);
    if (frases.length === 0) {
      return NAO(
        `as ${publicada.operations.length} personalização(ões) publicadas não valem mais no modelo atual — ` +
          "as frases mudaram; republique na Biblioteca",
      );
    }
    return { aplicar: true, versao: publicada.versao, frases };
  } catch (err) {
    console.warn("resolverFrasesPersonalizadas falhou; gerando sem personalização:", err);
    return NAO("falha ao resolver a personalização");
  }
}
