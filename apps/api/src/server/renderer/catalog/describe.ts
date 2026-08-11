/**
 * Projeção serializável do catálogo — o que a Biblioteca (web/app) e o Lab
 * precisam saber para montar a tela de personalização.
 *
 * O catálogo em si contém funções (predicados, montadores) e não é JSON.
 * Aqui expomos só o que é apresentável e editável, além do motivo pelo qual
 * um slot NÃO é editável — o usuário precisa entender a recusa, não só sofrê-la.
 */
import type { Catalog, SlotContext } from "./types";

export type VariantDescription = {
  id: string;
  /** Ausente quando a variante é montada pelo motor. */
  frase?: string;
  /** É a variante padrão (a que vale quando nenhum predicado casa). */
  padrao: boolean;
  editavel: boolean;
  /** Por que não é editável — texto para a interface. */
  motivo?: string;
};

export type SlotDescription = {
  id: string;
  obrigatorio: boolean;
  placeholdersObrigatorios: string[];
  /** Aparece no laudo? (slots condicionais podem não aparecer no cenário atual) */
  condicional: boolean;
  variantes: VariantDescription[];
};

export type CatalogDescription = {
  id: string;
  categoria: string;
  estilo: string;
  versao: number;
  variaveis: string[];
  cabecalhos: { tecnica?: string; corpo: string; conclusao: string };
  preambulo?: string;
  slots: SlotDescription[];
  /** Ordem dos slots em cada situação, para a interface agrupar. */
  ordens: { nome: string; slots: string[] }[];
};

function motivoNaoEditavel<F>(v: { montar?: unknown; personalizavel?: boolean }): string | undefined {
  if (v.personalizavel === false) {
    return "Descreve um achado alterado. O texto é escrito pelo sistema a partir do que foi ditado, para que uma personalização de normalidade nunca oculte uma patologia.";
  }
  if (v.montar) {
    return "É montado pelo sistema a partir dos dados do exame (listas, cálculos ou concordância), e não a partir de uma frase fixa.";
  }
  return undefined;
}

function achatar(ordem: (string | { repetirPorFeto: string[] })[]): string[] {
  return ordem.flatMap((i) => (typeof i === "string" ? [i] : i.repetirPorFeto));
}

export function describeCatalog<F>(
  catalog: Catalog<F>,
  contextos: { nome: string; ctx: SlotContext<F> }[],
): CatalogDescription {
  return {
    id: catalog.id,
    categoria: catalog.categoria,
    estilo: catalog.estilo,
    versao: catalog.versao,
    variaveis: [...catalog.variaveis],
    cabecalhos: catalog.cabecalhos,
    preambulo: catalog.preambulo,
    ordens: contextos.map((c) => ({ nome: c.nome, slots: achatar(catalog.ordem(c.ctx)) })),
    slots: catalog.slots.map((s) => ({
      id: s.id,
      obrigatorio: Boolean(s.obrigatorio),
      placeholdersObrigatorios: s.placeholdersObrigatorios ?? [],
      condicional: Boolean(s.incluirSe),
      variantes: s.variantes.map((v) => {
        const motivo = motivoNaoEditavel(v);
        return {
          id: v.id,
          ...(v.frase !== undefined ? { frase: v.frase } : {}),
          padrao: !v.quando,
          editavel: motivo === undefined,
          ...(motivo ? { motivo } : {}),
        };
      }),
    })),
  };
}
