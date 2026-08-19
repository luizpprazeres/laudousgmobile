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
 * Cinco travas, todas precisam passar:
 *   1. a categoria está em MODEL_CUSTOMIZATION_CATEGORIES;
 *   2. a categoria também está em MODEL_CATALOG_CATEGORIES — sem o catálogo
 *      ligado não existe onde aplicar operação;
 *   3. existe catálogo para aquele (categoria, estilo);
 *   4. a personalização foi publicada contra o MESMO catálogo-base que está
 *      em produção agora (mesmo id e mesma versão);
 *   5. as operações publicadas AINDA valem nesse catálogo-base.
 */

import { applyCustomization, validateOperations } from "@/server/renderer/catalog/engine";
import { personalizacaoAtiva } from "./ativa";
import type { MotivoTecnico } from "./resolveFrases";
import { ehEstiloVivo, resolveCatalogo } from "@/server/renderer/catalog/registry";
import type { Catalog } from "@/server/renderer/catalog/types";
import { lerPublicada, type Executor } from "./store";

export type PersonalizacaoResolvida =
  | { aplicar: false; motivo: string; codigo: MotivoTecnico }
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

const NAO = (motivo: string, codigo: MotivoTecnico = "inativa"): PersonalizacaoResolvida => ({
  aplicar: false,
  motivo,
  codigo,
});

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
    /** A MESMA regra da tela — ver `ativa.ts`. */
    const a = personalizacaoAtiva({
      userId: args.userId,
      categoria: args.categoryCode,
      estilo: args.styleCode,
    });
    // `personalizacaoAtiva` já cobre o catálogo: sem ele ligado o laudo é
    // montado pelo renderer antigo, que não conhece slot nenhum.
    if (!a.ativa) return NAO(a.explicacao);
    if (!ehEstiloVivo(args.styleCode)) return NAO(`estilo desconhecido: ${args.styleCode}`, "sem_modelo");

    const entrada = resolveCatalogo(args.categoryCode, args.styleCode);
    if (!entrada) return NAO(`sem catálogo para ${args.categoryCode}/${args.styleCode}`, "sem_modelo");

    const publicada = await lerPublicada(
      {
        userId: args.userId,
        categoryCode: args.categoryCode,
        styleCode: args.styleCode,
      },
      _db,
    );
    if (!publicada) return NAO("médico não tem personalização publicada", "sem_publicacao");

    // TRAVA DE VERSÃO — a mais importante das quatro, e a que faltava.
    //
    // O que estava acontecendo: as operações eram lidas do banco (gravadas
    // contra o base vN) e aplicadas contra o base ATUAL, porque o
    // `baseVersao` passado a `applyCustomization` era o do catálogo em
    // memória, não o da linha. Uma personalização da v1 valia sobre a v2 em
    // silêncio.
    //
    // `validateOperations` não substitui esta checagem: ela responde "o slot
    // ainda existe?", nunca "o slot ainda quer dizer a mesma coisa?". Um slot
    // que muda de sentido conservando o id passa por ela inteiro.
    //
    // Aqui o princípio do módulo se aplica na íntegra — na dúvida, não
    // personalize. O médico já vê `baseDesatualizado: true` na Biblioteca; o
    // caminho é republicar, que revalida contra o base novo.
    if (
      publicada.baseCatalogId !== entrada.catalog.id ||
      publicada.baseVersao !== entrada.catalog.versao
    ) {
      return NAO(
        `personalização publicada contra ${publicada.baseCatalogId} v${publicada.baseVersao}; ` +
          `o modelo-base hoje é ${entrada.catalog.id} v${entrada.catalog.versao} — republique na Biblioteca`,
        "base_desatualizada",
      );
    }

    // Revalidar aqui não é paranoia: a personalização foi validada quando o
    // médico publicou, e o catálogo-base pode ter mudado num deploy depois
    // disso. Se uma operação deixou de valer, o laudo sai no modelo-base — em
    // silêncio para o paciente, mas com motivo registrado na auditoria.
    const erros = validateOperations(entrada.catalog, publicada.operations);
    if (erros.length > 0) {
      return NAO(
        `personalização v${publicada.versao} não vale mais no base v${entrada.catalog.versao}: ${erros.join("; ")}`,
        "base_desatualizada",
      );
    }

    const custom = applyCustomization(entrada.catalog, {
      // O par vem da LINHA, não do catálogo em memória — é o que faz a trava
      // do motor ser uma trava de verdade, e não uma tautologia.
      baseCatalogId: publicada.baseCatalogId,
      baseVersao: publicada.baseVersao,
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
    return NAO("falha ao resolver a personalização", "erro");
  }
}
