/**
 * AS ALTERAÇÕES DE UMA CATEGORIA — o que se clica para sair do normal.
 *
 * O modelo normal já é derivado do renderer (`modeloNormalRegistry`). Isto é a
 * outra metade: as patologias, também derivadas do renderer, também sem
 * ninguém reescrever texto clínico.
 *
 * ## Por que não dá para derivar sozinho
 *
 * Foi a primeira ideia: percorrer o schema Zod trocando campos por valores
 * "patológicos". Não funciona, e o motivo é do domínio, não da implementação —
 * **o schema não carrega significado clínico** (crítica do Codex, 19/08). Um
 * nódulo de tireoide é um objeto dentro de um array, com medidas, localização e
 * seis eixos; o escore sai da COMBINAÇÃO deles. Nenhum algoritmo genérico olha
 * os tipos e conclui que aquilo é um cisto simples, um TR3 ou um TR5.
 *
 * ## O que é escrito à mão, e o que não é
 *
 * Escrito à mão: o CENÁRIO — um nome clínico e o patch estruturado que o ativa.
 * Derivado: **a frase, a conclusão e a classificação**, que continuam saindo do
 * renderer de produção. Ninguém digita redação clínica aqui; se digitasse,
 * seria a quarta cópia do mesmo texto, e a que divergiria primeiro.
 *
 * ## A combinação
 *
 * Duas alterações que tocam a mesma chave não se combinam: o merge é raso, a
 * segunda apagaria a primeira, e o médico veria um laudo sem o achado que
 * clicou. Nesse caso a seleção é RECUSADA, não remendada.
 */

import { laudoPadraoDe } from "./modeloNormalRegistry";
import { variarSeed, mascararPorComparacao } from "./modeloNormal";

export type AlteracaoSpec = {
  /** Id clínico e estável — é o que a tela devolve ao servidor. */
  id: string;
  /** O que o médico lê na lista. */
  nome: string;
  /** Uma linha dizendo quando se usa. Opcional. */
  descricao?: string;
  /**
   * Alterações do mesmo grupo são mutuamente exclusivas por natureza clínica
   * (um lobo não é ao mesmo tempo normal e aumentado). A colisão de chaves é
   * detectada sozinha; o grupo cobre o que colide sem compartilhar chave.
   */
  grupo?: string;
  /**
   * Os estilos em que este cenário vale. Ausente = todos.
   *
   * Existe porque os dois renderers de uma categoria podem não cobrir os mesmos
   * campos: `com_protese` troca o bloco de COMENTÁRIOS no clássico e é IGNORADO
   * no objetivo (MAMARIA.ts:854, que monta a técnica só a partir de
   * `titulo_com_axilas`). Sem declarar, o cenário apareceria na lista do
   * objetivo e não faria nada ao ser clicado.
   */
  estilos?: readonly string[];
  /** O patch estruturado sobre os achados normais. Nunca texto. */
  seed: Record<string, unknown>;
};

export type PreviaDaAlteracao = {
  id: string;
  nome: string;
  descricao?: string;
  grupo?: string;
  /** Linhas que a alteração ACRESCENTA ao laudo. */
  entram: string[];
  /** Linhas que ela TIRA — a frase de normalidade que deixa de valer. */
  saem: string[];
};

/** Só as linhas com conteúdo — cabeçalho e espaço em branco não são achado. */
const CABECALHO = /^(ULTRASSONOGRAFIA|COMENT[ÁA]RIOS:|T[ÉE]CNICA:|ACHADOS:|OS SEGUINTES|CONCLUS[ÃA]O:|IMPRESS[ÃA]O:)/i;

function linhasUteis(laudo: string): string[] {
  return laudo
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !CABECALHO.test(l));
}

/**
 * O laudo da alteração, com os NÚMEROS já virados lacuna.
 *
 * Mesma técnica do modelo normal: renderiza duas vezes, variando o seed, e
 * troca por `____` o que mudou entre os dois. Sem isso o modelo cravaria as
 * medidas que EU escolhi para o cenário — "1,2 x 0,9 x 0,8 cm" apresentado ao
 * médico como se fosse o padrão da casa.
 *
 * Fail-closed: sem os dois renders, sem prévia.
 */
function laudoDaAlteracao(categoria: string, estilo: string, seed: Record<string, unknown>): string | null {
  const a = laudoPadraoDe(categoria, estilo, seed);
  if (!a) return null;
  const b = laudoPadraoDe(categoria, estilo, variarSeed(seed));
  if (!b) return null;
  const la = a.split("\n");
  const lb = b.split("\n");
  if (la.length !== lb.length) return null;
  return la.map((linha, i) => mascararPorComparacao(linha, lb[i] ?? linha)).join("\n");
}

/**
 * O que esta alteração muda no laudo — para a Biblioteca mostrar antes do
 * clique.
 *
 * `null` quando o cenário não renderiza. É sinal de spec errada (um patch que o
 * schema recusa), e some da lista em vez de aparecer vazia.
 */
export function previaDaAlteracao(
  categoria: string,
  estilo: string,
  spec: AlteracaoSpec,
): PreviaDaAlteracao | null {
  if (spec.estilos && !spec.estilos.includes(estilo)) return null;
  const normal = laudoPadraoDe(categoria, estilo);
  const alterado = laudoDaAlteracao(categoria, estilo, spec.seed);
  if (!normal || !alterado) return null;

  const antes = linhasUteis(normal);
  const depois = linhasUteis(alterado);
  const entram = depois.filter((l) => !antes.includes(l));
  const saem = antes.filter((l) => !depois.includes(l));

  // Um cenário que não muda NADA é spec quebrada — o patch não chegou ao
  // renderer. Melhor sumir da lista que oferecer um clique inócuo.
  if (entram.length === 0 && saem.length === 0) return null;

  return {
    id: spec.id,
    nome: spec.nome,
    ...(spec.descricao ? { descricao: spec.descricao } : {}),
    ...(spec.grupo ? { grupo: spec.grupo } : {}),
    entram,
    saem,
  };
}

export type Conflito = { a: string; b: string; motivo: string };

/**
 * As alterações escolhidas convivem?
 *
 * Duas que escrevem a mesma chave de topo não convivem: o merge é raso e a
 * segunda apagaria a primeira em silêncio. Quando isso acontecer, a seleção é
 * recusada — o médico escolhe uma, ou alguém escreve um cenário combinado.
 */
export function conflitosEntre(specs: AlteracaoSpec[]): Conflito[] {
  const out: Conflito[] = [];
  for (let i = 0; i < specs.length; i++) {
    for (let j = i + 1; j < specs.length; j++) {
      const a = specs[i]!;
      const b = specs[j]!;
      if (a.grupo && a.grupo === b.grupo) {
        out.push({ a: a.id, b: b.id, motivo: `são do mesmo grupo "${a.grupo}" e se excluem` });
        continue;
      }
      const chaves = Object.keys(a.seed).filter((k) => k in b.seed);
      if (chaves.length > 0) {
        out.push({ a: a.id, b: b.id, motivo: `os dois alteram ${chaves.join(", ")}` });
      }
    }
  }
  return out;
}

export type SelecaoRenderizada =
  | { ok: true; texto: string }
  | { ok: false; conflitos: Conflito[] }
  | { ok: false; erro: string };

/**
 * O LAUDO das alterações escolhidas — montado pelo RENDERER, não pela tela.
 *
 * É o ponto central do desenho (Codex, 19/08): a web não concatena frases
 * patológicas por conta própria. Ela manda os ids; o renderer recompõe corpo e
 * conclusão, com a concordância, a ordem e a classificação que só ele sabe
 * fazer.
 */
export function renderizarSelecao(
  categoria: string,
  estilo: string,
  specs: AlteracaoSpec[],
  /**
   * O que o MÉDICO digitou — medidas, lateralidade, localização.
   *
   * Entra por último e vence os valores do cenário: os números de um
   * `AlteracaoSpec` existem para o renderer ter o que calcular, não para
   * aparecerem no laudo de alguém. Quando o médico mede 1,8 cm, é 1,8 que tem
   * de ser escrito — e é a partir dele que a classificação é computada.
   *
   * O schema Zod da categoria valida tudo isto (`laudoPadraoDe` faz `safeParse`),
   * então um cliente não consegue injetar campo que a categoria não tem.
   */
  dados?: Record<string, unknown>,
): SelecaoRenderizada {
  const conflitos = conflitosEntre(specs);
  if (conflitos.length > 0) return { ok: false, conflitos };

  const seed = Object.assign({}, ...specs.map((s) => s.seed), dados ?? {}) as Record<string, unknown>;
  const vazio = specs.length === 0 && (dados === undefined || Object.keys(dados).length === 0);
  const texto = vazio
    ? laudoPadraoDe(categoria, estilo)
    : /**
       * COM DADO DO MÉDICO não se mascara: o `____` existe para esconder o
       * número que EU inventei no cenário. O que ele mediu é o laudo.
       */
      dados && Object.keys(dados).length > 0
      ? laudoPadraoDe(categoria, estilo, seed)
      : laudoDaAlteracao(categoria, estilo, seed);
  if (!texto) return { ok: false, erro: "esta combinação não pôde ser renderizada" };
  return { ok: true, texto };
}
