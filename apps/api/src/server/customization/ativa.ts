/**
 * A ÚNICA regra que decide se a personalização vale — para este médico, nesta
 * categoria, agora.
 *
 * Ela existia em quatro lugares e divergia nos quatro (achado do Codex, 19/08):
 * a listagem marcava "ativa" só pela flag de categoria, ignorando o usuário; a
 * rota individual exigia `MODEL_CATALOG_CATEGORIES` até nas derivadas, que não
 * passam pelo catálogo; e o resolver derivado não exigia. O médico via
 * "Em uso nos seus laudos", publicava, e o gerador ignorava — ou o contrário.
 *
 * Num produto clínico a mentira confortável é a pior espécie: ele confere o
 * laudo esperando a redação dele.
 */

import { env } from "@/server/env";
import { catalogEnabledFor, usuarioLiberado } from "@/server/renderer/catalog/engine";
import { ehDerivado } from "@/server/renderer/catalog/registry";

/**
 * Categorias cujo laudo é ESCRITO pelo LLM, não montado pelo renderer.
 *
 * O caminho do writer devolve o texto e retorna ANTES da camada que aplica a
 * redação do médico (`renderer.ts`). A personalização dessas categorias é
 * gravada, aparece na Biblioteca e não muda laudo nenhum.
 *
 * Duas são incondicionais; as outras dependem de flag, e por isso a checagem é
 * feita em tempo de chamada, não numa lista fixa.
 */
function escritaPeloWriter(categoria: string): boolean {
  const e = env();
  if (categoria === "DOPPLER_VENOSO_MMII" || categoria === "DOPPLER_RENAL") return true;
  if (categoria === "MUSCULOESQUELETICO_V2" && e.MSK_WRITER === "true") return true;
  if (categoria === "PARTES_MOLES" && e.PARTES_MOLES_WRITER === "true") return true;
  if (categoria === "PELVE_FEMININA" && e.PELVE_WRITER === "true") return true;
  return false;
}

export type MotivoInativa =
  | "usuario_nao_liberado"
  | "categoria_desligada"
  | "catalogo_desligado"
  | "escrita_pelo_writer";

export type Ativa =
  | { ativa: true }
  | { ativa: false; motivo: MotivoInativa; explicacao: string };

/**
 * `ativa = usuário liberado && categoria liberada && (derivada || catálogo
 * ligado) && não escrita pelo writer`.
 *
 * Fail-closed em todas as pernas: qualquer uma que não se possa afirmar
 * devolve `false`.
 */
export function personalizacaoAtiva(args: {
  userId: string;
  categoria: string;
  estilo: string;
}): Ativa {
  const e = env();

  if (!usuarioLiberado(e.MODEL_CUSTOMIZATION_USER_IDS, args.userId)) {
    return {
      ativa: false,
      motivo: "usuario_nao_liberado",
      explicacao: "a personalização ainda não foi liberada para este usuário",
    };
  }
  if (!catalogEnabledFor(e.MODEL_CUSTOMIZATION_CATEGORIES, args.categoria)) {
    return {
      ativa: false,
      motivo: "categoria_desligada",
      explicacao: "a personalização ainda não está ligada para esta categoria",
    };
  }
  if (escritaPeloWriter(args.categoria)) {
    return {
      ativa: false,
      motivo: "escrita_pelo_writer",
      explicacao:
        "o laudo desta categoria é escrito pela IA, e não montado a partir do modelo — " +
        "a redação salva aqui não valeria nos laudos",
    };
  }
  /**
   * A derivada NÃO passa pelo catálogo: ela troca linhas do laudo pronto. Exigir
   * `MODEL_CATALOG_CATEGORIES` nela era exigir uma flag que o caminho dela não
   * lê — a tela mostrava desligado enquanto a geração aplicava.
   */
  if (!ehDerivado(args.categoria, args.estilo)) {
    if (!catalogEnabledFor(e.MODEL_CATALOG_CATEGORIES, args.categoria)) {
      return {
        ativa: false,
        motivo: "catalogo_desligado",
        explicacao: "o modelo desta categoria ainda não monta os laudos",
      };
    }
  }
  return { ativa: true };
}
