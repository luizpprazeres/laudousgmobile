/**
 * A personalização que vale para ESTA geração — projeto docs/projeto-modelos/,
 * item 7. É o ponto em que o overlay do médico passa a mudar o laudo de verdade.
 *
 * Princípio único deste módulo: **na dúvida, não personalize**. Toda saída
 * duvidosa é `aplicar: false`, e o laudo sai igual ao de hoje. Uma
 * personalização que não se aplica é um aborrecimento; um laudo que quebra por
 * causa dela é um problema clínico. Por isso nada aqui lança — nem um erro de
 * banco, nem um catálogo ausente, nem uma operação que deixou de valer.
 *
 * Quatro travas, todas precisam passar:
 *   1. a categoria está em MODEL_CUSTOMIZATION_CATEGORIES;
 *   2. a categoria também está em MODEL_CATALOG_CATEGORIES — sem o catálogo
 *      ligado não existe onde aplicar operação;
 *   3. existe catálogo para aquele (categoria, estilo);
 *   4. as operações publicadas AINDA valem no catálogo-base atual.
 */

import { env } from "@/server/env";
import { applyCustomization, catalogEnabledFor, validateOperations } from "@/server/renderer/catalog/engine";
import { ehEstiloVivo, resolveCatalogo } from "@/server/renderer/catalog/registry";
import type { Catalog } from "@/server/renderer/catalog/types";
import { lerPublicada, type Executor } from "./store";

export type PersonalizacaoResolvida =
  | { aplicar: false; motivo: string }
  | {
      aplicar: true;
      versao: number;
      catalogId: string;
      baseVersao: number;
      operacoes: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catalog: Catalog<any>;
      customSlots: Set<string>;
      extraConclusao: string[];
    };

const NAO = (motivo: string): PersonalizacaoResolvida => ({ aplicar: false, motivo });

/**
 * Nunca rejeita — o chamador pode dar `await` sem try/catch, e um banco fora do
 * ar não pode impedir um médico de gerar um laudo.
 */
export async function resolverPersonalizacao(
  args: {
    userId: string;
    categoryCode: string;
    styleCode: string;
  },
  /** Só nos testes: uma transação com rollback, para não gravar em produção. */
  _db?: Executor,
): Promise<PersonalizacaoResolvida> {
  try {
    const e = env();

    if (!catalogEnabledFor(e.MODEL_CUSTOMIZATION_CATEGORIES, args.categoryCode)) {
      return NAO("personalização desligada para esta categoria");
    }
    // Pré-requisito real, não redundância: sem o catálogo ligado o laudo é
    // montado pelo renderer antigo, que não conhece slot nenhum.
    if (!catalogEnabledFor(e.MODEL_CATALOG_CATEGORIES, args.categoryCode)) {
      return NAO("catálogo desligado para esta categoria");
    }
    if (!ehEstiloVivo(args.styleCode)) return NAO(`estilo desconhecido: ${args.styleCode}`);

    const entrada = resolveCatalogo(args.categoryCode, args.styleCode);
    if (!entrada) return NAO(`sem catálogo para ${args.categoryCode}/${args.styleCode}`);

    const publicada = await lerPublicada(
      {
        userId: args.userId,
        categoryCode: args.categoryCode,
        styleCode: args.styleCode,
      },
      _db,
    );
    if (!publicada) return NAO("médico não tem personalização publicada");

    // Revalidar aqui não é paranoia: a personalização foi validada quando o
    // médico publicou, e o catálogo-base pode ter mudado num deploy depois
    // disso. Se uma operação deixou de valer, o laudo sai no modelo-base — em
    // silêncio para o paciente, mas com motivo registrado na auditoria.
    const erros = validateOperations(entrada.catalog, publicada.operations);
    if (erros.length > 0) {
      return NAO(
        `personalização v${publicada.versao} não vale mais no base v${entrada.catalog.versao}: ${erros.join("; ")}`,
      );
    }

    const custom = applyCustomization(entrada.catalog, {
      baseCatalogId: entrada.catalog.id,
      baseVersao: entrada.catalog.versao,
      operations: publicada.operations,
    });

    return {
      aplicar: true,
      versao: publicada.versao,
      catalogId: entrada.catalog.id,
      baseVersao: entrada.catalog.versao,
      operacoes: publicada.operations.length,
      catalog: custom.catalog,
      customSlots: custom.customSlots,
      extraConclusao: custom.extraConclusao,
    };
  } catch (err) {
    // Inclui o banco fora do ar. O laudo sai; o motivo fica no log.
    console.warn("resolverPersonalizacao falhou; gerando sem personalização:", err);
    return NAO("falha ao resolver a personalização");
  }
}
