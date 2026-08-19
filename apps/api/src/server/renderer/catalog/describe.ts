/**
 * Projeção serializável do catálogo — o que a Biblioteca (web/app) e o Lab
 * precisam saber para montar a tela de personalização.
 *
 * O catálogo em si contém funções (predicados, montadores) e não é JSON.
 * Aqui expomos só o que é apresentável e editável, além do motivo pelo qual
 * um slot NÃO é editável — o usuário precisa entender a recusa, não só sofrê-la.
 */
import { variantePadrao } from "./engine";
import { achadosDoCatalogo } from "./projetarModelo";
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
  /**
   * Como esta variante SAI no laudo, renderizada a partir de `variante.exemplo`.
   *
   * É o que permite a lista sintética do Lab — ver todas as alterações de uma
   * categoria de uma vez, cada uma com o texto do corpo e o item de conclusão,
   * sem precisar montar o achado à mão para descobrir.
   */
  corpoExemplo?: string;
  conclusaoExemplo?: string;
};

/**
 * Renderiza um achado de exemplo e devolve os trechos por (slot, variante).
 * Injetado de fora porque `describeCatalog` é genérico e não sabe renderizar.
 */
export type RenderizadorDeExemplo<F> = (
  exemplo: Record<string, unknown>,
) => { slotId: string; variantId: string; kind: "corpo" | "conclusao"; text: string }[];

export type SlotDescription = {
  id: string;
  obrigatorio: boolean;
  /**
   * Pode ser removido do modelo?
   *
   * Separado de `obrigatorio` porque os slots de achado são CONDICIONAIS: não
   * aparecem no laudo sem o achado, mas também não podem sumir do modelo. Sem
   * este campo a Biblioteca oferecia "remover" em `cranio_achado`,
   * `placenta_achado` e `cordao_umbilical`, e o servidor recusava depois — o
   * médico levava um erro no lugar de nem ver o botão. Ver Slot.removivel.
   */
  removivel: boolean;
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
  /** Nome de cada placeholder para o médico — ver Catalog.rotulosVariaveis. */
  rotulos_variaveis?: Record<string, string>;
  cabecalhos: { tecnica?: string; corpo: string; conclusao: string };
  preambulo?: string;
  slots: SlotDescription[];
  /** Ordem dos slots em cada situação, para a interface agrupar. */
  ordens: { nome: string; slots: string[] }[];
  /**
   * O modelo COMO LINHAS, por cenário — corpo e conclusão, com a seção de cada
   * uma. É o que a tela deve usar; `slots`/`ordens` ficam para cliente antigo.
   * Ver `LinhaDoModelo`.
   */
  modelos?: ModeloProjetado[];
  /** Os achados condicionais, fora do modelo de rotina. Ver `AchadoProjetado`. */
  achados?: AchadoProjetado[];
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
  renderizarExemplo?: RenderizadorDeExemplo<F>,
  /**
   * Como montar as LINHAS de cada cenário. Injetado porque `describeCatalog` é
   * genérico e não sabe construir documento — quem sabe é o motor da categoria.
   * Ausente, a projeção sai só com `slots`/`ordens`, como antes.
   */
  projetarModelos?: (contextos: { nome: string; ctx: SlotContext<F> }[]) => ModeloProjetado[],
): CatalogDescription {
  /** Renderiza `variante.exemplo` e pega só os trechos daquela variante. */
  function exemploDe(slotId: string, v: { id: string; exemplo?: Record<string, unknown> }) {
    if (!v.exemplo || !renderizarExemplo) return {};
    let segs: ReturnType<RenderizadorDeExemplo<F>>;
    try {
      segs = renderizarExemplo(v.exemplo);
    } catch {
      // Exemplo que não renderiza é defeito de catálogo, não de produção:
      // não pode derrubar a tela de personalização inteira.
      return {};
    }
    const meus = segs.filter((s) => s.slotId === slotId && s.variantId === v.id);
    const corpo = meus.filter((s) => s.kind === "corpo").map((s) => s.text.trim()).join(" ");
    const concl = meus.filter((s) => s.kind === "conclusao").map((s) => s.text.trim()).join(" ");
    return {
      ...(corpo ? { corpoExemplo: corpo } : {}),
      ...(concl ? { conclusaoExemplo: concl } : {}),
    };
  }

  return {
    id: catalog.id,
    categoria: catalog.categoria,
    estilo: catalog.estilo,
    versao: catalog.versao,
    variaveis: [...catalog.variaveis],
    ...(catalog.rotulosVariaveis ? { rotulos_variaveis: { ...catalog.rotulosVariaveis } } : {}),
    cabecalhos: catalog.cabecalhos,
    preambulo: catalog.preambulo,
    ordens: contextos.map((c) => ({ nome: c.nome, slots: achatar(catalog.ordem(c.ctx)) })),
    ...(projetarModelos ? { modelos: projetarModelos(contextos) } : {}),
    achados: achadosDoCatalogo(catalog, (slotId, v) => {
      const motivo = motivoNaoEditavel(v);
      return {
        id: v.id,
        ...(v.frase !== undefined ? { frase: v.frase } : {}),
        padrao: false,
        editavel: motivo === undefined,
        ...(motivo ? { motivo } : {}),
        ...exemploDe(slotId, v),
      };
    }),
    slots: catalog.slots.map((s) => ({
      id: s.id,
      obrigatorio: Boolean(s.obrigatorio),
      // As duas travas do servidor (engine.validateOperations), não uma só.
      removivel: !s.obrigatorio && s.removivel !== false,
      placeholdersObrigatorios: s.placeholdersObrigatorios ?? [],
      condicional: Boolean(s.incluirSe),
      variantes: (() => {
        // A mesma variante que `replace_phrase` sem `variant` vai atingir.
        const padrao = variantePadrao(s);
        return s.variantes.map((v) => {
        const motivo = motivoNaoEditavel(v);
        return {
          id: v.id,
          ...(v.frase !== undefined ? { frase: v.frase } : {}),
          padrao: v === padrao,
          editavel: motivo === undefined,
          ...(motivo ? { motivo } : {}),
          ...exemploDe(s.id, v),
        };
        });
      })(),
    })),
  };
}

// ---------------------------------------------------------------------------
// O MODELO COMO LINHAS — a forma que a tela realmente precisa
// ---------------------------------------------------------------------------

/**
 * Uma linha do modelo, na ordem e na seção em que sai no laudo.
 *
 * POR QUE ISTO EXISTE. A projeção entregava `slots` + `ordens`, e a tela
 * montava as linhas sozinha: pegava a "variante padrão" de cada slot da ordem
 * do corpo. Três defeitos vinham daí, e o Luiz encontrou todos no device:
 *
 *   · a CONCLUSÃO não aparecia — a ordem do corpo não a contém, então o modelo
 *     terminava no último aspecto e emendava na conclusão sem o cabeçalho;
 *   · COMENTÁRIOS/TÉCNICA idem;
 *   · slot CONDICIONAL de achado vazava para o modelo normal. Slots como
 *     `placenta_achado` não têm variante padrão; a tela caía na primeira da
 *     lista e mostrava "Imagem hipoecoica e heterogênea, medindo…" — um
 *     descolamento placentário — como se fosse parte do laudo de rotina.
 *
 * Montando as linhas a partir dos SEGMENTOS do documento renderizado, as três
 * somem de uma vez: o documento tem a ordem certa, tem a conclusão, e não
 * contém os condicionais que não se aplicam.
 */
export type LinhaDoModelo = {
  secao: "tecnica" | "corpo" | "conclusao";
  slot: string;
  variante: string;
  /** A frase COM os marcadores de dado (`{dbp}` ou `____`). */
  frase: string;
  editavel: boolean;
  motivo?: string;
  obrigatorio: boolean;
  removivel: boolean;
  placeholdersObrigatorios: string[];
};

export type ModeloProjetado = {
  /** "Gestação padrão", "Gemelar", "Segundo trimestre"… */
  nome: string;
  linhas: LinhaDoModelo[];
};

/**
 * Os slots de ACHADO — condicionais, que só entram no laudo quando ditados.
 *
 * Vão numa lista à parte de propósito: no modelo eles não estão (o exame de
 * rotina não os produz), mas o médico precisa vê-los e poder reescrevê-los.
 * Misturá-los com o modelo é o defeito que fez o descolamento placentário
 * aparecer como linha de rotina.
 */
export type AchadoProjetado = {
  slot: string;
  removivel: boolean;
  variantes: VariantDescription[];
};
