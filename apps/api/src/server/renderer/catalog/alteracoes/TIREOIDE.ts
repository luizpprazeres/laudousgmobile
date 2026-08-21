import type { AlteracaoSpec } from "../alteracoes";

/**
 * As alterações da TIREOIDE — categoria-piloto do desenho (Codex, 19/08).
 *
 * Ela foi escolhida por ser a mais difícil, não a mais fácil: o nódulo é um
 * objeto dentro de um array, com medidas, localização e seis eixos, e o escore
 * de Domingos sai da COMBINAÇÃO deles. Um desenho que só funcionasse em campos
 * booleanos não provaria nada.
 *
 * Aqui só existe o CENÁRIO: nome clínico e o patch. A frase, a conclusão e a
 * classificação continuam saindo de `renderTireoide` — que é quem sabe somar os
 * pontos e escolher a conduta. Se alguém digitasse a redação aqui, teríamos a
 * quarta cópia do texto clínico, e a que divergiria primeiro.
 *
 * ## ⚠️ UM CENÁRIO NÃO CARREGA NÚMERO
 *
 * Esta é a regra que estes specs quebravam, e o defeito foi reproduzido pelo
 * Codex em 20/08: **medidas que EU inventei saíam impressas em laudo real.**
 *
 * O mecanismo: na PRÉVIA, `previaDaAlteracao` renderiza duas vezes com seeds
 * diferentes e troca por `____` tudo o que variar, então os números do cenário
 * ficavam escondidos e pareciam inofensivos. No laudo REAL — quando chegam
 * `dados` do médico — não há segundo render e não há máscara: o que o médico
 * não sobrescreveu sai como está. Bastava clicar "nódulo suspeito" e não digitar
 * o tamanho para o laudo afirmar "1,3 x 1,0 x 1,2 cm, no terço superior" — uma
 * medida fabricada, dentro de um documento clínico assinado.
 *
 * A correção é na origem: **o seed não tem número nenhum.** O que falta o
 * renderer imprime como `____`, que é o comportamento certo para dado ausente.
 * O `laudoPadraoDe` mescla FUNDO, então o cenário precisa declarar só o achado
 * — não mais repetir o lobo inteiro para não apagá-lo.
 *
 * Consequência aceita e correta: sem o tamanho, o escore de Domingos não soma o
 * ponto da dimensão (`dimensaoPts`). A NOTA da prévia é a dos eixos
 * qualitativos e SOBE quando o médico digita a medida. Isso é honesto — o
 * escore depende mesmo do tamanho, e fingir um tamanho para exibir uma nota
 * "completa" é o que produzia o laudo falso.
 */

/** Um nódulo com todos os eixos preenchidos — o renderer exige a forma inteira. */
function nodulo(over: Record<string, unknown>) {
  return {
    ecogenicidade: null,
    margem: null,
    halo: null,
    forma: null,
    calcificacoes: null,
    vascularizacao: null,
    /**
     * Medida e localização ficam NULAS de propósito — são do exame, não do
     * cenário. Ver a regra no topo do arquivo.
     */
    medidas_cm: null,
    diametro_transverso_cm: null,
    localizacao: null,
    descricao_raw: null,
    nota_domingos_ditada: null,
    ti_rads_ditado: null,
    ...over,
  };
}

export const ALTERACOES_TIREOIDE: AlteracaoSpec[] = [
  // ── Nódulos ──────────────────────────────────────────────────────────────
  //
  // Estes são PRESETS de um item: os eixos qualitativos de um achado típico.
  // Eles NÃO são o mecanismo de cardinalidade — dois nódulos no mesmo lobo, ou
  // um nódulo em cada lobo, entram pela lista aberta em `dados.lobo_*.nodulos`,
  // que o renderer percorre inteira. Um cenário fixo por definição não
  // representa "dois".
  //
  // ## Como a TELA usa um preset (e por que ele não tem lacuna)
  //
  // O array de nódulos é protegido INTEIRO pelo guard: quem seleciona o preset
  // e manda `dados.lobo_direito.nodulos` sobrescreve o achado do cenário, e a
  // renderização é recusada. Isso é de propósito — foi o defeito que o Codex
  // reproduziu em 20/08: com o array declarado como andaime, mandar
  // `nodulos: []` apagava o nódulo selecionado e o laudo concluía "sem
  // evidência de imagem nodular". O médico clicava um achado e recebia o laudo
  // que o nega.
  //
  // O preset, então, é MODELO DE PREENCHIMENTO, não seleção: a tela lê o seed
  // pelo `GET /api/catalog/TIREOIDE`, usa os eixos para preencher o formulário
  // do nódulo, e envia a lista completa por `dados` — sem mandar o id da
  // alteração. Assim há um dono só da lista, que é o médico.
  {
    id: "nodulo_cistico_simples",
    kind: "preset",
    nome: "Cisto simples",
    descricao: "Anecoico, homogêneo, de margem regular — o achado benigno mais comum.",
    grupo: "nodulo_lobo_direito",
    seed: {
      lobo_direito: {
        nodulos: [
          nodulo({
            ecogenicidade: "anecoica_homogenea",
            margem: "regular",
            halo: "fino_regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
          }),
        ],
      },
    },
  },
  {
    id: "nodulo_solido_benigno",
    kind: "preset",
    nome: "Nódulo sólido de aspecto benigno",
    descricao: "Isoecoico, margem regular, halo fino — sem critérios de suspeição.",
    grupo: "nodulo_lobo_direito",
    seed: {
      lobo_direito: {
        nodulos: [
          nodulo({
            ecogenicidade: "isoecoica",
            margem: "regular",
            halo: "fino_regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
            vascularizacao: "periferica",
          }),
        ],
      },
    },
  },
  {
    id: "nodulo_solido_suspeito",
    kind: "preset",
    nome: "Nódulo sólido com critérios de suspeição",
    descricao: "Hipoecoico, margem irregular, mais alto que largo, com microcalcificações.",
    grupo: "nodulo_lobo_direito",
    seed: {
      lobo_direito: {
        nodulos: [
          nodulo({
            ecogenicidade: "hipoecoica",
            margem: "irregular",
            halo: "sem_halo",
            forma: "mais_alta_que_larga",
            calcificacoes: "micro",
            vascularizacao: "exclusiva_central",
          }),
        ],
      },
    },
  },
  {
    id: "nodulo_lobo_esquerdo",
    kind: "preset",
    nome: "Nódulo no lobo esquerdo",
    descricao: "Um nódulo sólido isoecoico à esquerda — combina com achados do lobo direito.",
    grupo: "nodulo_lobo_esquerdo",
    seed: {
      lobo_esquerdo: {
        nodulos: [
          nodulo({
            ecogenicidade: "isoecoica",
            margem: "regular",
            halo: "fino_regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
          }),
        ],
      },
    },
  },

  // ── Alterações difusas ───────────────────────────────────────────────────
  {
    id: "alteracao_difusa",
    nome: "Tireoidite crônica (Hashimoto)",
    kind: "alteracao",
    descricao: "Parênquima difusamente heterogêneo — a conclusão sai como \"Sinais ecográficos de tireoidopatia\".",
    grupo: "ecotextura",
    /**
     * Sem lacunas: o cenário afirma a ecotextura dos dois lobos e mais nada. As
     * medidas do lobo não estão no seed, então o médico as digita livremente por
     * `dados` — não há o que autorizar.
     *
     * A descrição vem do CORPUS: "Parênquima tireoidiano com ecotextura
     * difusamente heterogênea" é a linha dele, 62 vezes. Aqui entra só a
     * cláusula, porque o renderer a encaixa na frase do lobo.
     *
     * Nada de "com micronodulações": era invenção do cenário. Quando o médico
     * descrever um padrão específico, ele o digita e o verbatim dele vence.
     */
    seed: {
      lobo_direito: { ecotextura_alterada: "difusamente heterogênea" },
      lobo_esquerdo: { ecotextura_alterada: "difusamente heterogênea" },
    },
  },
  /**
   * As TIREOIDITES NOMEADAS — recurso pedido pelo Luiz em 21/08.
   *
   * Elas convivem com `alteracao_difusa` no mesmo grupo: ou o médico nomeia a
   * doença, ou descreve o padrão sem nomear. Nomear é a exceção — em 251 laudos
   * reais ele nunca o fez —, e por isso o genérico continua primeiro na lista.
   *
   * O seed carrega SÓ o tipo. A descrição do parênquima e a conclusão saem do
   * renderer, como todo o resto: se o cenário escrevesse a frase, seria a
   * quarta cópia do texto clínico. E o verbatim do médico, quando existe, vence
   * a descrição padrão do tipo.
   */
  {
    id: "tireoidite_hashimoto",
    kind: "alteracao",
    nome: "Tireoidite crônica autoimune (Hashimoto)",
    descricao: "Parênquima difusamente heterogêneo e hipoecogênico, com micronodulações.",
    grupo: "ecotextura",
    seed: { tireoidite_tipo: "hashimoto" },
  },
  {
    id: "tireoidite_linfocitica",
    kind: "alteracao",
    nome: "Tireoidite linfocítica",
    descricao: "Heterogeneidade difusa, de grau leve a moderado.",
    grupo: "ecotextura",
    seed: { tireoidite_tipo: "linfocitica" },
  },
  {
    id: "tireoidite_granulomatosa",
    kind: "alteracao",
    nome: "Tireoidite subaguda (De Quervain)",
    descricao: "Áreas hipoecogênicas mal definidas e confluentes.",
    grupo: "ecotextura",
    seed: { tireoidite_tipo: "granulomatosa" },
  },
  {
    id: "tireoidite_riedel",
    kind: "alteracao",
    nome: "Tireoidite de Riedel (fibrosante)",
    descricao: "Glândula difusamente hipoecogênica, de aspecto endurecido.",
    grupo: "ecotextura",
    seed: { tireoidite_tipo: "riedel" },
  },
  {
    id: "volume_aumentado",
    nome: "Bócio (volume aumentado)",
    kind: "alteracao",
    descricao: "Glândula de volume acima do normal.",
    grupo: "volume",
    seed: { volume_glandular: "aumentado" },
  },
  {
    id: "volume_reduzido",
    nome: "Volume reduzido",
    kind: "alteracao",
    descricao: "Glândula hipotrófica.",
    grupo: "volume",
    seed: { volume_glandular: "reduzido" },
  },

  // ── Linfonodos ───────────────────────────────────────────────────────────
  {
    id: "linfonodos_alterados",
    nome: "Linfonodos cervicais alterados",
    kind: "alteracao",
    descricao: "Cadeias com linfonodos de aspecto suspeito.",
    grupo: "linfonodos",
    /**
     * A DESCRIÇÃO não vem cravada — e esta é a segunda correção do dia.
     *
     * O cenário trazia "de aspecto arredondado, com perda do hilo ecogênico",
     * características que o médico não informou: ele clicou "suspeitos" e a
     * casa escreveu o achado por ele. Isso existia para contornar um defeito do
     * renderer, não porque fosse certo — com `alterados: true` e descrição
     * vazia, o CORPO escrevia a frase de normalidade ("morfologia preservada")
     * e a conclusão dizia "alterado", um laudo que se contradiz.
     *
     * O defeito foi corrigido no renderer (frase genérica coerente para
     * alterado sem descrição), então o cenário pode voltar a afirmar só o que o
     * médico afirmou. A descrição fica como lacuna opcional.
     */
    lacunas: [
      { caminho: "linfonodos_descricao", rotulo: "Descrição dos linfonodos", tipo: "texto" },
    ],
    seed: {
      linfonodos_descritos: true,
      linfonodos_alterados: true,
    },
  },
];
