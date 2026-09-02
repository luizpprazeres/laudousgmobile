/**
 * TIREOIDE — do estado da TELA para o contrato do RENDERER canônico.
 *
 * Este arquivo é a peça central da troca de motor da web (§3.2 de
 * `docs/plano-web-workspace-2026-08-20.md`): ele NÃO escreve texto clínico.
 * Traduz o que o médico clicou e digitou para `TireoideFindings` e entrega ao
 * `POST /api/catalog/TIREOIDE/render`, que é quem monta o laudo.
 *
 * ## O que fica de cada lado
 *
 * - **VOLUME: a web calcula.** É a regra §1 do plano — no app o médico dita e
 *   um volume calculado de três eixos mal ouvidos vira fato errado; aqui ele
 *   DIGITA, o dado é confiável, e o elipsoide é fórmula pura. O canônico recebe
 *   `volume_ml` pronto, exatamente como a regra dele manda ("NUNCA calcule").
 * - **CLASSIFICAÇÃO: nunca aqui.** Nota de Domingos e TI-RADS saem do renderer,
 *   da combinação dos eixos. Duas autoridades sobre o mesmo laudo, não.
 *
 * ## As traduções que NÃO são óbvias
 *
 * A tela de hoje tem eixos mais pobres que o canônico em alguns pontos e valores
 * que ele não tem em outros. Onde o mapa é ambíguo, este módulo **não escolhe em
 * silêncio**: devolve a ambiguidade em `pendencias` para a tela mostrar e para o
 * gate registrar. Escolher calado seria trocar a ecogenicidade de um nódulo por
 * outra e mudar a nota que o renderer calcula.
 */

import type { LoboId, LoboState, NoduloTireoide, TireoideState } from "../deterministic/organs/tireoide";

/** O fator do elipsoide usado hoje pela web. Mantido para o laudo não mudar de número. */
const VOLUME_FACTOR = 0.52;

/** Um nódulo no contrato canônico — a forma inteira, que o renderer exige. */
export type NoduloCanonico = {
  ecogenicidade: string | null;
  margem: string | null;
  halo: string | null;
  forma: string | null;
  calcificacoes: string | null;
  vascularizacao: string | null;
  medidas_cm: number[] | null;
  diametro_transverso_cm: number | null;
  localizacao: string | null;
  descricao_raw: string | null;
  nota_domingos_ditada: string | null;
  ti_rads_ditado: string | null;
  acr_tirads?: {
    composicao: "cistico" | "espongiforme" | "misto" | "solido" | null;
    ecogenicidade: "anecoico" | "hiper_ou_isoecoico" | "hipoecoico" | "muito_hipoecoico" | null;
    forma: "mais_larga_que_alta" | "mais_alta_que_larga" | null;
    margem: "lisa" | "mal_definida" | "lobulada_ou_irregular" | "extensao_extratireoidiana" | null;
    focos_ecogenicos: Array<"nenhum_ou_cauda_cometa" | "macrocalcificacoes" | "calcificacoes_perifericas" | "focos_puntiformes">;
  } | null;
};

export type LoboCanonico = {
  medidas_cm: number[] | null;
  volume_ml: number | null;
  /** Ausente quando a tela não é a dona do campo — ver `adaptarLobo`. */
  ecotextura_alterada?: string | null;
  nodulos: NoduloCanonico[];
};

export type TireoideDados = {
  com_doppler: boolean;
  volume_glandular: "normal" | "aumentado" | "reduzido" | null;
  lobo_direito: LoboCanonico;
  lobo_esquerdo: LoboCanonico;
  istmo: LoboCanonico;
  pico_arteria_direita: "inferior" | "superior" | null;
  pico_sistolico_direito_cms: number | null;
  pico_arteria_esquerda: "inferior" | "superior" | null;
  pico_sistolico_esquerdo_cms: number | null;
  linfonodos_descritos: boolean;
  linfonodos_alterados: boolean;
  linfonodos_descricao?: string | null;
  achados_adicionais: string | null;
};

/** Uma tradução que o mapa não resolve sozinho — some do laudo se for ignorada. */
export type Pendencia = {
  /** Onde, para a tela apontar. */
  onde: string;
  /** O valor que a tela tem e o canônico não conhece. */
  valor: string;
  motivo: string;
  /**
   * Esta pendência IMPEDE o laudo, não apenas o enfeita.
   *
   * A distinção existe porque as duas coisas moram na mesma lista e têm
   * consequências opostas: "margem lobulada não tem par" degrada o detalhe;
   * "a escala de classificação é outra" inverteria o diagnóstico.
   */
  bloqueia?: boolean;
};

export type Adaptacao = {
  dados: TireoideDados;
  /** Os ids de `AlteracaoSpec` que o estado da tela implica. */
  alteracoes: string[];
  pendencias: Pendencia[];
};

/**
 * Ecogenicidade do nódulo: tela → canônico.
 *
 * As cinco primeiras são a MESMA coisa com nome diferente. `heterogenea` não
 * tem par: o canônico descreve conteúdo (`solida_areas_anecoicas`,
 * `anecoica_septos`), não "heterogênea" solta — e cada um desses pontua
 * diferente na tabela de Domingos. Traduzir no chute mudaria a NOTA FINAL.
 */
const ECO_PARA_CANONICO: Record<string, string> = {
  anecoica: "anecoica_homogenea",
  anecoica_finos_ecos: "anecoica_finos_ecos",
  hipoecoica: "hipoecoica",
  isoecoica: "isoecoica",
  hiperecoica: "hiperecoica",
};

/**
 * Margem: tela → canônico.
 *
 * `circunscritas` e `lobuladas` não têm par exato. O canônico tem três degraus
 * pontuados (regular 0 / irregular 1 / espiculada 2); "circunscrita" é
 * clinicamente regular e "lobulada" fica entre os dois. Mapear lobulada para
 * irregular ACRESCENTA um ponto que o médico não escolheu — por isso vai para
 * `pendencias` em vez de virar palpite.
 */
const MARGEM_PARA_CANONICO: Record<string, string> = {
  regulares: "regular",
  irregulares: "irregular",
};

function medida(v: string): number | null {
  const n = Number.parseFloat(v.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** As três medidas do lobo, ou `null` quando faltar alguma. */
function medidasDoLobo(l: LoboState): number[] | null {
  const a = medida(l.a);
  const b = medida(l.b);
  const c = medida(l.c);
  return a !== null && b !== null && c !== null ? [a, b, c] : null;
}

/**
 * O volume do lobo — CALCULADO aqui, de propósito (regra §1).
 *
 * Arredondado a uma casa antes de sair: é o número que vai para o laudo e para
 * a soma do volume total. Mandar 6.9264 faria o renderer somar um total que não
 * bate com as parcelas que ele mesmo imprime.
 */
export function volumeCalculado(l: LoboState): number | null {
  const m = medidasDoLobo(l);
  if (m === null) return null;
  return Math.round(m[0]! * m[1]! * m[2]! * VOLUME_FACTOR * 10) / 10;
}

/** A dimensão do nódulo digitada como texto livre ("1,2 x 0,9 x 0,8"). */
function medidasDoNodulo(dim: string): number[] | null {
  const nums = dim
    .split(/[x×]/i)
    .map((p) => Number.parseFloat(p.trim().replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? nums : null;
}

/**
 * O nódulo atravessa DIRETO — os eixos da tela já são os do canônico (D2).
 *
 * Este era o único bloqueio da migração, e o comentário que ficava aqui
 * explicava por quê: a tela pedia um GRAU de 1 a 6 e o canônico soma pontos dos
 * eixos, escalas diferentes com o mesmo nome de "NOTA FINAL", que se invertem
 * na ponta maligna. Traduzir era impossível com segurança, e mandar só os dois
 * eixos que a tela tinha era pior — os quatro ausentes pontuam zero e a nota
 * saía subestimada, o mesmo erro pelo mesmo lado.
 *
 * Resolvido tirando a tradução do caminho: a tela passou a oferecer os seis
 * eixos (`lib/catalog/eixosDoNodulo.ts`), com as chaves do renderer. Nada é
 * convertido aqui, e por isso nada pode ser convertido errado.
 *
 * `nota_domingos_ditada` e `ti_rads_ditado` continuam nulos e devem continuar:
 * eles existem para o médico DITAR uma nota por cima do cálculo, e a web não
 * tem ditado. Preenchê-los faria a tela vencer o renderer — as duas
 * autoridades sobre o mesmo laudo que a regra §1 do plano proíbe.
 */
function adaptarNodulo(n: NoduloTireoide, _pendencias: Pendencia[]): NoduloCanonico {
  const medidas = [n.c1, n.c2, n.c3]
    .map((v) => Number.parseFloat(v.trim().replace(",", ".")))
    .filter((x) => Number.isFinite(x) && x > 0);

  return {
    ecogenicidade: n.ecogenicidade,
    margem: n.margem,
    halo: n.halo,
    forma: n.forma,
    calcificacoes: n.calcificacoes,
    vascularizacao: n.vascularizacao,
    medidas_cm: medidas.length > 0 ? medidas : null,
    /**
     * Nulo de propósito: sem médico nomeando qual eixo é o transverso, o
     * renderer usa o MAIOR — que é a regra dele, e a que interessa para o
     * seguimento.
     */
    diametro_transverso_cm: null,
    localizacao: n.localizacao.trim() || null,
    descricao_raw: null,
    nota_domingos_ditada: null,
    ti_rads_ditado: null,
    acr_tirads:
      n.acrComposicao || n.acrEcogenicidade || n.acrForma || n.acrMargem || (n.acrFocos?.length ?? 0) > 0
        ? {
            composicao: n.acrComposicao ?? null,
            ecogenicidade: n.acrEcogenicidade ?? null,
            forma: n.acrForma ?? null,
            margem: n.acrMargem ?? null,
            focos_ecogenicos: n.acrFocos ?? [],
          }
        : null,
  };
}

function adaptarLobo(
  loboId: LoboId,
  l: LoboState,
  nodulos: NoduloTireoide[],
  pendencias: Pendencia[],
): LoboCanonico {
  /**
   * `dados` é ESPARSO de propósito — e o guard do servidor obriga a isso.
   *
   * `ecotextura_alterada` fica de fora: quem a define é a ALTERAÇÃO clicada
   * (tireoidite), não a tela de medidas. Mandá-la como `null` apagaria o achado
   * do cenário no merge, e o laudo sairia afirmando "sem evidência de alteração
   * ecotextural" logo abaixo da tireoidite que o médico marcou. O servidor hoje
   * RECUSA isso com o caminho nomeado — este comentário existe para que
   * ninguém "conserte" a recusa acrescentando o campo de volta.
   */
  return {
    medidas_cm: medidasDoLobo(l),
    volume_ml: volumeCalculado(l),
    ...(l.ecotextura === "heterogenea"
      ? { ecotextura_alterada: "com ecotextura heterogênea" }
      : {}),
    nodulos: nodulos.filter((n) => n.lobo === loboId).map((n) => adaptarNodulo(n, pendencias)),
  };
}

function pico(v: string): number | null {
  const n = Number.parseFloat(v.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * O estado da tela vira `dados` + os ids das alterações clicadas.
 *
 * A separação importa e é o que o `/render` espera: as ALTERAÇÕES são os
 * cenários curados (tireoidite, bócio, linfonodos); os `dados` são o que o
 * médico mediu e descreveu. Nódulos entram por `dados` — em qualquer número e
 * em qualquer lobo —, e não como cenário, porque cenário fixo não representa
 * "dois nódulos no lobo direito".
 */
export function adaptarTireoide(state: TireoideState): Adaptacao {
  const pendencias: Pendencia[] = [];
  const alteracoes: string[] = [];

  /**
   * AS QUATRO TIREOIDITES ATRAVESSAM — desbloqueado em 21/08.
   *
   * Elas estiveram bloqueadas por um bom motivo: o canônico só tinha um estado
   * difuso genérico, e mapear as quatro para ele em silêncio faria o médico
   * escolher Riedel, receber "tireoidopatia" e acreditar ter registrado o que
   * não registrou. Uma escolha que não muda o laudo é affordance falsa.
   *
   * O Luiz pediu o recurso, então o canônico ganhou `tireoidite_tipo`
   * estruturado — Zod, JSON Schema e prompt na mesma leva — e agora cada uma
   * tem conclusão própria. O mapa é 1:1; a tela e o renderer usam os mesmos
   * quatro valores.
   *
   * ⚠️ Estas quatro conclusões NÃO têm âncora no corpus: em 251 laudos reais
   * ele nunca nomeia etiologia. Existem porque ele as pediu, e a redação está
   * em `categories/TIREOIDE.ts` marcada como pendente de aprovação dele.
   */
  const TIREOIDITE_PARA_CENARIO: Record<string, string> = {
    hashimoto: "tireoidite_hashimoto",
    linfocitica: "tireoidite_linfocitica",
    granulomatosa: "tireoidite_granulomatosa",
    riedel: "tireoidite_riedel",
  };

  if (state.tireoidite && state.tireoidite !== "nenhuma") {
    const cenario = TIREOIDITE_PARA_CENARIO[state.tireoidite];
    if (cenario) {
      alteracoes.push(cenario);
    } else {
      /**
       * Valor que a tela tem e o canônico não conhece. Continua BLOQUEANDO: sem
       * cenário, o laudo sairia NORMAL, negando o diagnóstico selecionado.
       */
      pendencias.push({
        onde: "tireoidite",
        valor: state.tireoidite,
        motivo: "este tipo não existe no catálogo canônico — sem cenário o laudo sairia normal, negando o diagnóstico",
        bloqueia: true,
      });
    }
  }

  if (state.avaliarLinfonodos && state.linfonodos === "suspeitos") {
    alteracoes.push("linfonodos_alterados");
  }

  const dados: TireoideDados = {
    com_doppler: state.doppler,
    volume_glandular: state.volumeGlandular,
    lobo_direito: adaptarLobo("lobo_direito", state.lobo_direito, state.nodulos, pendencias),
    lobo_esquerdo: adaptarLobo("lobo_esquerdo", state.lobo_esquerdo, state.nodulos, pendencias),
    istmo: adaptarLobo("istmo", state.istmo, state.nodulos, pendencias),
    pico_arteria_direita: "inferior",
    pico_sistolico_direito_cms: state.doppler ? pico(state.picoDireito) : null,
    pico_arteria_esquerda: "inferior",
    pico_sistolico_esquerdo_cms: state.doppler ? pico(state.picoEsquerdo) : null,
    /**
     * A tela tem um toggle "avaliar linfonodos"; o contrato canônico separa
     * DESCRITOS de ALTERADOS. Não avaliar = não descrever, e o renderer omite a
     * linha — que é o que o toggle desligado significa.
     */
    linfonodos_descritos: state.avaliarLinfonodos,
    linfonodos_alterados: state.avaliarLinfonodos && state.linfonodos === "suspeitos",
    /**
     * Idem: quando o médico marca "suspeitos", quem descreve é o cenário
     * `linfonodos_alterados`. Mandar `null` daqui apagaria a descrição dele.
     */
    achados_adicionais: null,
  };

  return { dados, alteracoes, pendencias };
}
