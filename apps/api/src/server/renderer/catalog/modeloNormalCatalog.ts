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
import { createHash } from "node:crypto";
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
/**
 * A VERSÃO do modelo derivado — a impressão digital do conjunto de frases.
 *
 * O catálogo escrito tem uma `versao` que o autor bumpa quando mexe na
 * estrutura. O derivado não tem autor: ele nasce do renderer, e o renderer muda
 * em qualquer deploy. Ficava cravado em 0 — a trava de versão nunca disparava,
 * e a única defesa era o id de cada frase personalizada (achado do Codex,
 * 19/08).
 *
 * O id de uma frase já cobre "a MINHA frase mudou". O que faltava é "o modelo
 * ao redor mudou": uma linha nova entre as suas, uma irmã reescrita, uma troca
 * de ordem. O médico revisou um DOCUMENTO; se o documento mudou, ele revisa de
 * novo.
 *
 * 0 continua reservado para "não foi possível derivar".
 */
export function versaoDerivadaDe(categoria: string, estilo: string): number {
  const laudo = laudoPadraoDe(categoria, estilo);
  if (!laudo) return 0;

  /**
   * TODOS os cenários, na ORDEM, com a seção. A primeira versão hasheava só o
   * cenário padrão e ainda ordenava os ids — e portanto era cega justamente às
   * mudanças que importam (achado do Codex, 19/08):
   *
   *  - trocar duas frases de lugar não mexia na versão, e o médico revisou um
   *    documento numa ordem;
   *  - mudança exclusiva de 2º/3º trimestre não mexia na versão, e a tela
   *    mostra todos os cenários;
   *  - a seção não entrava, então mover uma frase do corpo para a conclusão
   *    passava batido.
   */
  const partes = [`${categoria}/${estilo}`];
  for (const l of linhasDoLaudo(laudo)) partes.push(`padrao|${l.secao}|${l.id}`);
  for (const c of cenariosDe(categoria)) {
    const outro = laudoDoCenario(categoria, estilo, c.seed);
    if (!outro) continue;
    for (const l of linhasDoLaudo(outro)) partes.push(`${c.nome}|${l.secao}|${l.id}`);
  }

  const hex = createHash("sha1").update(partes.join("\n")).digest("hex").slice(0, 8);
  // 31 bits: cabe em `integer` do Postgres e nunca colide com 0.
  return (parseInt(hex, 16) % 0x7ffffffe) + 1;
}

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
    /** Impressão digital do modelo de hoje — ver `versaoDerivadaDe`. */
    versao: versaoDerivadaDe(categoria, estilo),
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
