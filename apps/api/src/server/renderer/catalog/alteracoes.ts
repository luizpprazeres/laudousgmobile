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
 * O merge é FUNDO (`mesclarFundo`): `dados.lobo_direito.medidas_cm` vence a
 * medida do cenário e o que o cenário afirma no mesmo objeto permanece. Arrays
 * são substituídos por inteiro, de propósito — mesclar listas por índice
 * produziria um nódulo meio de um e meio de outro.
 *
 * Ainda assim a seleção é RECUSADA, e por três motivos distintos:
 *
 * 1. duas alterações que escrevem a mesma chave de topo (`conflitosEntre`) —
 *    conservador: o merge fundo já saberia combiná-las em folhas diferentes,
 *    mas afrouxar isso é decisão à parte;
 * 2. o que o médico digitou apaga um achado que o cenário afirma
 *    (`achadosApagados`) — perder achado é pior que 409;
 * 3. a seleção é impossível por natureza: preset usado como alteração, ou
 *    alteração pedida num estilo em que ela não existe (`selecaoInvalida`).
 */

import { laudoPadraoDe } from "./modeloNormalRegistry";
import { variarSeed, mascararPorComparacao, ehObjeto, mesclarFundo } from "./modeloNormal";

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
  /**
   * O QUE ESTE CENÁRIO É — e o contrato muda conforme a resposta.
   *
   * - `alteracao` (default): o médico CLICA e o id vai em `alteracoes[]`. O
   *   cenário é auto-suficiente: ele não afirma nada que o médico não tenha
   *   escolhido ao clicar.
   * - `preset`: um MODELO DE PREENCHIMENTO. Descreve os eixos típicos de um
   *   achado que a tela vai colocar num formulário, e a lista final vem por
   *   `dados`. Um preset **não pode ser enviado em `alteracoes[]`**.
   *
   * A distinção nasceu de um defeito concreto (Codex, 20/08): os três presets
   * de nódulo da tireoide vivem em `lobo_direito`, e os nomes deles não dizem
   * "direito". Clicá-los como alteração punha um nódulo no lobo direito sem o
   * médico ter escolhido o lobo. Sem `kind`, a única coisa que impedia isso era
   * a tela se comportar bem — e regra que depende de boa vontade do cliente não
   * é regra.
   */
  kind: "alteracao" | "preset";
  /** O patch estruturado sobre os achados normais. Nunca texto. */
  seed: Record<string, unknown>;
  /**
   * O ANDAIME deste cenário — os caminhos do seed que existem só para o
   * renderer ter o que calcular, e que o médico substitui pelo que mediu.
   *
   * Serve a duas coisas ao mesmo tempo, e é por isso que é uma declaração só:
   *
   * 1. **O que a tela pergunta.** Faltava um contrato: o `/render` aceita
   *    `dados` livres validados pelo Zod, mas a tela não tinha como saber O QUE
   *    pedir ao médico, nem com que rótulo ou unidade.
   * 2. ~~O que `dados` pode sobrescrever.~~ **Não mais.** A declaração já teve
   *    essa segunda função, e ela era um buraco à espera do próximo spec:
   *    bastava alguém pôr no seed um caminho já listado aqui para reabrir, em
   *    silêncio, a autorização de apagar achado. Hoje **tudo** o que o cenário
   *    afirma é protegido por `achadosApagados`, sem exceção. Quando um spec
   *    precisar mesmo de caminho sobrescrevível, entra campo próprio.
   *
   * O que tornou a segunda função dispensável foi a regra "um cenário não
   * carrega dado de exame": sem andaime no seed, não há o que autorizar.
   */
  lacunas?: readonly Lacuna[];
};

/**
 * Um campo que a TELA preenche — o que perguntar ao médico, e onde a resposta
 * entra no seed.
 */
export type Lacuna = {
  /** Caminho no seed, em notação de ponto: `lobo_direito.medidas_cm`. */
  caminho: string;
  /** O que o médico lê ao lado do campo. */
  rotulo: string;
  /**
   * A forma do valor, para a tela escolher o controle e validar antes de enviar.
   *
   * - `medidas` — as três dimensões em cm (`[a, b, c]`)
   * - `numero` — um valor só (volume, pico sistólico)
   * - `texto` — localização, descrição livre
   * - `lista` — um array de objetos (nódulos), com forma própria da categoria
   */
  tipo: "medidas" | "numero" | "texto" | "lista";
  unidade?: string;
  /**
   * Sem este campo o laudo sai com `____` no lugar do dado. Não impede
   * renderizar — o modelo com lacuna é um estado legítimo —, mas a tela deve
   * avisar antes de o médico assinar.
   */
  esperado?: boolean;
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
  /**
   * O que a TELA precisa perguntar ao médico para este cenário virar laudo.
   *
   * Sem isto a declaração servia só ao guard interno do servidor, e a tela
   * continuava sem contrato — que era exatamente a lacuna que o §3.2 do plano
   * apontava. Uma declaração que não chega a quem deveria usá-la é documentação
   * disfarçada de mecanismo.
   */
  lacunas: readonly Lacuna[];
  kind: "alteracao" | "preset";
  /**
   * Só em `preset`: o ITEM que a tela usa para preencher o formulário.
   *
   * **Desembrulhado do lugar onde o cenário o pôs.** O seed de
   * `nodulo_solido_suspeito` é `{ lobo_direito: { nodulos: [ {...} ] } }`, e
   * publicar isso obrigaria a tela a saber que o preset "mora" no lobo direito
   * — a mesma confusão que fez o preset poder ser clicado como alteração e pôr
   * um nódulo à direita sem o médico escolher o lobo. O preset descreve **um
   * achado**; onde ele fica é do médico. (Codex, 20/08.)
   *
   * Pode ser publicado porque a regra "um cenário não carrega dado de exame" já
   * o esvaziou de medida, lado e topografia: sobram só os eixos clínicos.
   */
  template?: Record<string, unknown>;
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
    lacunas: spec.lacunas ?? [],
    kind: spec.kind,
    ...(spec.kind === "preset" ? { template: itemDoPreset(spec.seed) } : {}),
  };
}

/**
 * O ITEM de um preset, tirado de dentro do caminho em que o cenário o guardou.
 *
 * Desce enquanto houver um único objeto aninhado e devolve o primeiro elemento
 * do primeiro array que encontrar — que é a forma de todo preset: um achado
 * dentro de uma lista, dentro de um órgão. Se a forma não for essa, devolve o
 * seed como está, em vez de adivinhar.
 */
function itemDoPreset(seed: Record<string, unknown>): Record<string, unknown> {
  let atual: unknown = seed;
  for (let i = 0; i < 4; i++) {
    if (Array.isArray(atual)) {
      const primeiro = atual[0];
      return ehObjeto(primeiro) ? primeiro : seed;
    }
    if (!ehObjeto(atual)) return seed;
    const chaves = Object.keys(atual);
    if (chaves.length !== 1) return seed;
    atual = atual[chaves[0]!];
  }
  return seed;
}

export type Conflito = { a: string; b: string; motivo: string };

/**
 * As alterações escolhidas convivem?
 *
 * Duas que escrevem a mesma chave de TOPO são recusadas. A regra é
 * **conservadora de propósito**: desde que o merge virou fundo (20/08), duas
 * alterações que tocassem folhas diferentes do mesmo objeto poderiam conviver
 * — mas afrouxar isto é decisão à parte, e a versão apertada nunca produz um
 * laudo sem o achado que o médico clicou.
 *
 * Note que a conferência aqui é do SEED declarado, antes de renderizar; o que
 * garante o resultado é `achadosApagados`, que confere depois do merge.
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

/**
 * Os caminhos-FOLHA de um objeto, em notação de ponto.
 *
 * Arrays não são percorridos: `nodulos` é uma folha inteira, porque substituir
 * o terceiro nódulo de uma lista não é a mesma operação que trocar um campo.
 */
function folhasDe(o: Record<string, unknown>, prefixo = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(o)) {
    const caminho = prefixo === "" ? k : `${prefixo}.${k}`;
    if (ehObjeto(v)) {
      for (const [kk, vv] of folhasDe(v, caminho)) out.set(kk, vv);
    } else {
      out.set(caminho, v);
    }
  }
  return out;
}

function lerCaminho(o: Record<string, unknown>, caminho: string): unknown {
  let atual: unknown = o;
  for (const parte of caminho.split(".")) {
    if (!ehObjeto(atual)) return undefined;
    atual = atual[parte];
  }
  return atual;
}

/** Igualdade estrutural — os seeds são dado puro, sem ciclo nem função. */
function iguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * O que os `dados` apagaram das alterações escolhidas — e não deviam.
 *
 * Um caminho declarado como `lacuna` é andaime: sobrescrever é o objetivo dele.
 * Qualquer OUTRO caminho do cenário que não sobreviva ao merge é achado clínico
 * perdido, e vira conflito em vez de virar laudo.
 */
function achadosApagados(
  specs: AlteracaoSpec[],
  seedFinal: Record<string, unknown>,
): Conflito[] {
  const out: Conflito[] = [];
  for (const spec of specs) {
    for (const [caminho, valor] of folhasDe(spec.seed)) {
      /**
       * Sem exceção. `lacunas` já foi as duas coisas — o que a tela pergunta E o
       * que `dados` pode sobrescrever — e a dupla função era um buraco à espera
       * do próximo spec: bastava alguém pôr no seed um caminho já listado em
       * `lacunas` para reabrir, em silêncio, a autorização de apagar achado.
       * (Codex, 20/08.) Hoje nenhum spec precisa da autorização, e enquanto
       * precisar de verdade ela vem em campo próprio, não reaproveitado.
       */
      if (iguais(lerCaminho(seedFinal, caminho), valor)) continue;
      out.push({
        a: spec.id,
        b: "dados",
        motivo: `o que foi digitado apaga "${caminho}", que é o achado de "${spec.nome}"`,
      });
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
/**
 * O que uma seleção tem de errado ANTES de virar laudo.
 *
 * Estas duas recusas moravam só na rota HTTP, e "só na rota" é meia proteção:
 * qualquer consumidor interno novo — outra rota, um script, a Biblioteca —
 * reabriria o caminho sem tocar no arquivo que documenta a regra. (Codex,
 * 20/08.)
 */
function selecaoInvalida(estilo: string, specs: AlteracaoSpec[]): Conflito[] {
  const out: Conflito[] = [];

  for (const s of specs) {
    if (s.kind === "preset") {
      out.push({
        a: s.id,
        b: "seleção",
        motivo: `"${s.nome}" é modelo de preenchimento, não alteração clicável — use o \`template\` e mande o resultado em \`dados\``,
      });
    }
    /**
     * ESTILO INCOMPATÍVEL — e este falhava do pior jeito possível.
     *
     * `protese` vale só no clássico (o objetivo monta a técnica de outro
     * jeito e ignora o campo). Selecioná-la no objetivo devolvia **200 e um
     * laudo normal**: o achado desaparecia sem erro, sem aviso e sem rastro.
     * O médico via um laudo plausível, sem a prótese que ele marcou.
     */
    if (s.estilos && !s.estilos.includes(estilo)) {
      out.push({
        a: s.id,
        b: estilo,
        motivo: `"${s.nome}" não existe no estilo ${estilo} — selecioná-la aqui não mudaria o laudo`,
      });
    }
  }

  return out;
}

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
  /** Repassado ao renderer — hoje só a máscara do abdome. Ver `ContextoDeRender`. */
  ctx?: { templateBody?: string | null },
): SelecaoRenderizada {
  const invalidas = selecaoInvalida(estilo, specs);
  if (invalidas.length > 0) return { ok: false, conflitos: invalidas };

  const conflitos = conflitosEntre(specs);
  if (conflitos.length > 0) return { ok: false, conflitos };

  /**
   * Os cenários primeiro, o que o médico digitou por último — e mesclando
   * FUNDO, não raso. O merge raso trocava o objeto inteiro do lobo e levava
   * junto a tireoidite que morava nele; o laudo saía afirmando "sem evidência
   * de alteração ecotextural" logo abaixo do achado que o médico tinha clicado.
   */
  const doCenario = specs.reduce<Record<string, unknown>>((acc, s) => mesclarFundo(acc, s.seed), {});
  const seed = mesclarFundo(doCenario, dados ?? {});

  /**
   * E ainda assim o merge fundo não basta: um `dados` que mande
   * `ecotextura_alterada: null` explicitamente apaga o achado com toda a razão
   * sintática do mundo. Por isso a conferência é feita no RESULTADO — o que o
   * cenário afirma tem de continuar de pé, salvo onde ele mesmo declarou
   * andaime.
   */
  const apagados = achadosApagados(specs, seed);
  if (apagados.length > 0) return { ok: false, conflitos: apagados };
  const vazio = specs.length === 0 && (dados === undefined || Object.keys(dados).length === 0);
  const texto = vazio
    ? laudoPadraoDe(categoria, estilo, undefined, ctx)
    : /**
       * COM DADO DO MÉDICO não se mascara: o `____` existe para esconder o
       * número que EU inventei no cenário. O que ele mediu é o laudo.
       */
      dados && Object.keys(dados).length > 0
      ? laudoPadraoDe(categoria, estilo, seed, ctx)
      : laudoDaAlteracao(categoria, estilo, seed);
  if (!texto) return { ok: false, erro: "esta combinação não pôde ser renderizada" };
  return { ok: true, texto };
}
