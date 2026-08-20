import type { AlteracaoSpec } from "../alteracoes";
import { ALTERACOES_MAMARIA } from "./MAMARIA";
import { ALTERACOES_TIREOIDE } from "./TIREOIDE";

/**
 * As alterações por categoria.
 *
 * TIREOIDE é a piloto. As demais entram por CURADORIA de cenários — declarar o
 * patch estruturado —, não por escrita de texto clínico: a frase continua sendo
 * do renderer. Uma categoria ausente daqui simplesmente não oferece alterações
 * ainda; não quebra nada.
 */
const POR_CATEGORIA: Record<string, AlteracaoSpec[]> = {
  TIREOIDE: ALTERACOES_TIREOIDE,
  MAMARIA: ALTERACOES_MAMARIA,
};

export function alteracoesDe(categoria: string): AlteracaoSpec[] {
  return POR_CATEGORIA[categoria] ?? [];
}

export function categoriasComAlteracoes(): string[] {
  return Object.keys(POR_CATEGORIA);
}
