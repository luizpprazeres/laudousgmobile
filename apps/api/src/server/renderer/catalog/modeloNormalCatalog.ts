/**
 * O modelo normal vestido de `Catalog` — para a Biblioteca não precisar saber.
 *
 * A rota, o store e os três apps já falam a língua do catálogo estruturado:
 * slots, variantes, `describeCatalog`, `validateOperations`. Ensinar todos eles
 * um segundo formato seria pagar duas vezes pela mesma tela.
 *
 * Aqui o modelo derivado é embrulhado num `Catalog` real: uma linha do laudo
 * padrão vira um slot com uma variante. Tudo o que já existe passa a funcionar
 * para as treze categorias sem uma linha de código novo nas rotas.
 *
 * ⚠️ ESTE CATÁLOGO NÃO GERA LAUDO. Ele descreve o modelo normal, e só. Renderizá-lo
 * produziria sempre o laudo sem achados — que é justamente o que ele é. Na
 * geração, a redação do médico entra por `pipeline/frasesPersonalizadas.ts`,
 * como overlay sobre o laudo do renderer de produção. Confundir os dois papéis
 * seria trocar o renderer clínico por uma casca.
 */
import { buildDoc, serialize } from "./engine";
import { cenariosDe, laudoDoCenario, laudoPadraoDe, modeloNormalDe } from "./modeloNormalRegistry";
import { contarDados, linhasDoLaudo, type LinhaModelo } from "./modeloNormal";
import { linhasDeLaudoPadrao } from "./projetarModelo";
import type { Catalog, Slot } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** O achado do modelo normal é vazio: o texto já está nas frases. */
type F = Record<string, never>;

function slotDe(l: LinhaModelo): Slot<F> {
  return {
    id: l.id,
    obrigatorio: false,
    removivel: true,
    /**
     * O dado do exame é a LACUNA, e a redação nova precisa conservá-la — a
     * mesma trava do `{dbp}` no catálogo obstétrico, pela mesma razão: perder
     * a medida é perder o exame. Aqui ela é contada, não nomeada: o renderer
     * imprime `____`, não `{dado}`. Ver `Slot.lacunasObrigatorias`.
     */
    lacunasObrigatorias: contarDados(l.texto),
    variantes: [{ id: "normal", frase: l.texto, padrao: true }],
  };
}

export type EntradaDerivada = {
  catalog: Catalog<F>;
  samples: { id: string; nome: string; descricao: string; findings: F; comparaCom?: string; patologico?: boolean }[];
  projetarModelos: () => { nome: string; linhas: ReturnType<typeof linhasDeLaudoPadrao> }[];
  render: (args: any) => string;
  buildDoc: (args: any) => ReturnType<typeof buildDoc>;
  renderizarExemplo: (exemplo: Record<string, unknown>) => never[];
};

/**
 * Monta a entrada de catálogo de uma categoria derivada.
 * `null` quando a categoria não tem modelo normal (não é uma das treze).
 */
export function catalogoDerivadoDe(categoria: string, estilo: string): EntradaDerivada | null {
  const m = modeloNormalDe(categoria);
  if (!m) return null;
  const laudo = laudoPadraoDe(categoria, estilo);
  if (!laudo) return null;

  const linhas = linhasDoLaudo(laudo);
  const concl = linhas.filter((l) => l.secao === "conclusao");
  const titulo = laudo.split("\n").find((l) => l.trim() !== "")?.trim() ?? m.rotulo;

  const catalog: Catalog<F> = {
    id: `${categoria}/${estilo}`,
    categoria,
    estilo,
    /**
     * Versão 0 marca "derivado do renderer", não escrito à mão. Ela não é
     * comparada na aplicação — a personalização derivada é ancorada no id da
     * frase, que já muda quando a redação muda. Ver `resolveFrases.ts`.
     */
    versao: 0,
    variaveis: [],
    titulo: () => titulo,
    cabecalhos: { corpo: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", conclusao: "CONCLUSÃO:" },
    numerarConclusao: (i, total) => (total === 1 ? "" : `${i + 1}) `),
    ordem: () => linhas.map((l) => l.id),
    ordemConclusao: () => concl.map((l) => l.id),
    slots: linhas.map(slotDe),
  };

  const findings = {} as F;
  const args = (over: Record<string, unknown> = {}) => ({
    catalog,
    findings,
    varsFor: () => ({ dado: "____" }),
    gemelar: false,
    instancias: ["A"],
    flags: { igCorrection: false, flexivel: false, grannum: false, objetivo: estilo === "OBJETIVO" },
    titulo,
    ...over,
  });

  return {
    catalog,
    /** As LINHAS de cada cenário — é o que a tela desenha. */
    projetarModelos: () =>
      cenariosDe(categoria)
        .map((c) => ({ nome: c.nome, laudo: laudoDoCenario(categoria, estilo, c.seed) }))
        .filter((c): c is { nome: string; laudo: string } => c.laudo !== null)
        .map((c) => ({ nome: c.nome, linhas: linhasDeLaudoPadrao(c.laudo) })),
    samples: [{
      id: "padrao",
      nome: "Exame normal",
      descricao: `O modelo padrão de ${m.rotulo.toLowerCase()} — como o laudo sai quando nada foi alterado.`,
      findings,
    }],
    render: (a: any) => serialize(buildDoc(args({ catalog: a?.catalog ?? catalog, customSlots: a?.customSlots })), a?.catalog ?? catalog),
    buildDoc: (a: any) => buildDoc(args({ catalog: a?.catalog ?? catalog, customSlots: a?.customSlots })),
    // Modelo derivado não tem variante de achado, então não há exemplo a montar.
    renderizarExemplo: () => [],
  };
}

/** Quantas linhas o corpo do modelo tem — só para diagnóstico. */
export function tamanhoDoModelo(categoria: string, estilo: string): number {
  const laudo = laudoPadraoDe(categoria, estilo);
  return laudo ? linhasDoLaudo(laudo).length : 0;
}
