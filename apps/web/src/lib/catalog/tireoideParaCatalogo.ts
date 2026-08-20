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

function adaptarNodulo(n: NoduloTireoide, pendencias: Pendencia[]): NoduloCanonico {
  /**
   * BLOQUEIO: enquanto a tela classificar por grau, o nódulo não migra.
   *
   * Esta pendência é a mais importante do módulo. Ela não é um aviso de
   * acabamento — é o que impede o laudo de sair com a classificação invertida.
   * Ver o comentário longo em `nota_domingos_ditada`.
   */
  if (n.notaDomingos || n.tirads) {
    pendencias.push({
      onde: `nódulo ${n.id}`,
      valor: `NOTA ${n.notaDomingos || "—"} / TI-RADS ${n.tirads || "—"}`,
      motivo:
        "a tela classifica por GRAU (1–6) e o canônico por SOMA DE PONTOS dos eixos — repassar o grau inverteria o significado na ponta maligna. O nódulo só migra quando a tela oferecer os seis eixos canônicos",
      bloqueia: true,
    });
  }

  const eco = ECO_PARA_CANONICO[n.ecogenicidade] ?? null;
  if (n.ecogenicidade && eco === null) {
    pendencias.push({
      onde: `nódulo ${n.id}`,
      valor: `ecogenicidade "${n.ecogenicidade}"`,
      motivo:
        "o canônico descreve o conteúdo do nódulo, e cada opção pontua diferente na tabela de Domingos — escolher uma no lugar mudaria a NOTA FINAL",
    });
  }

  const margem = MARGEM_PARA_CANONICO[n.margens] ?? null;
  if (n.margens && margem === null) {
    pendencias.push({
      onde: `nódulo ${n.id}`,
      valor: `margem "${n.margens}"`,
      motivo:
        "o canônico pontua regular (0) / irregular (1) / espiculada (2); esta opção fica entre dois degraus e traduzi-la acrescentaria ponto que o médico não escolheu",
    });
  }

  return {
    ecogenicidade: eco,
    margem,
    halo: null,
    forma: null,
    calcificacoes: null,
    vascularizacao: null,
    medidas_cm: medidasDoNodulo(n.dimensao),
    diametro_transverso_cm: null,
    localizacao: null,
    descricao_raw: null,
    /**
     * ⚠️ A NOTA E O TI-RADS DA TELA NÃO ATRAVESSAM. Descoberto em 20/08 pela
     * prova diferencial, e é o motivo de o nódulo ainda não migrar.
     *
     * Parecia haver uma ponte segura: o renderer aceita
     * `nota_domingos_ditada`/`ti_rads_ditado`, o ditado do médico vence o
     * cálculo, e o laudo de hoje sairia preservado. **É falso, e falha para o
     * lado perigoso** — as duas "NOTA FINAL" são escalas DIFERENTES com o mesmo
     * nome:
     *
     * | valor | a tela (grau 1–6) | o canônico (soma de pontos) |
     * |---|---|---|
     * | 4 | intermediárias | TI-RADS 2 → provavelmente benignas |
     * | 5 | **provavelmente malignas** | TI-RADS 2 → **provavelmente benignas** |
     * | 6 | **malignas** | TI-RADS 3 → intermediárias |
     *
     * A tela é um GRAU que o médico escolhe (`NOTAS_DOMINGOS = 1..6`); o
     * canônico é a SOMA dos pontos dos eixos, que chega a 16. Repassar o grau
     * como se fosse pontuação inverte o significado clínico exatamente na ponta
     * maligna — o nódulo que o médico marcou como provavelmente maligno sairia
     * impresso "características provavelmente benignas".
     *
     * Enquanto a tela não oferecer os seis eixos canônicos (ecogenicidade,
     * margem, halo, forma, calcificações, vascularização) para o renderer
     * calcular, o nódulo não tem travessia segura. Mandar os dois eixos que ela
     * tem também não serve: os quatro ausentes pontuam zero e a nota sai
     * SUBESTIMADA, que é o mesmo erro pelo mesmo lado.
     */
    nota_domingos_ditada: null,
    ti_rads_ditado: null,
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

  if (state.tireoidite && state.tireoidite !== "nenhuma") {
    /**
     * AS QUATRO TIREOIDITES DA TELA NÃO EXISTEM NO LAUDO DELE.
     *
     * Adjudicado contra o corpus em 20/08: em 251 laudos reais, 62 conclusões
     * de alteração difusa, o médico escreve "Sinais ecográficos de
     * tireoidopatia" e **nunca** nomeia etiologia. As quatro opções da tela
     * (Hashimoto, linfocítica, granulomatosa/De Quervain, Riedel) foram
     * inventadas — o próprio arquivo do compositor local as chama de "ponto de
     * partida p/ curadoria do Luiz".
     *
     * Então o canônico tem UM estado difuso, e é o certo. Mas mapear as quatro
     * para ele em silêncio é o defeito do outro lado: o médico escolhe Riedel,
     * recebe tireoidopatia genérica e acredita ter registrado o que não
     * registrou. Uma escolha que não muda o laudo é affordance falsa.
     *
     * Por isso continua BLOQUEANDO até a tela oferecer o estado único
     * ("Tireoidopatia / alteração difusa"). Quando ela oferecer, este ramo vira
     * um `push("alteracao_difusa")` e some a distinção.
     */
    if (state.tireoidite === "hashimoto") {
      alteracoes.push("alteracao_difusa");
    } else {
      /**
       * As outras três tireoidites não existem no catálogo canônico — ele tem
       * `tireoidite_cronica` e mais nada.
       *
       * BLOQUEIA, e a distinção importa. Deixar passar como simples aviso não
       * produz um laudo incompleto: produz um laudo NORMAL. O renderer não
       * recebe alteração difusa nenhuma e conclui "sem evidência de alteração
       * ecotextural ou de imagem nodular" — a negação exata do diagnóstico que o
       * médico selecionou. (Falso verde apontado pelo Codex, 20/08: a prova
       * diferencial dava "✓ renderiza" para o cenário de Riedel.)
       */
      pendencias.push({
        onde: "tireoidite",
        valor: state.tireoidite,
        motivo:
          "o canônico tem um único estado difuso, ancorado no corpus do médico, que não nomeia etiologia — a tela precisa oferecer \"Tireoidopatia / alteração difusa\" no lugar das quatro opções inventadas",
        bloqueia: true,
      });
    }
  }

  if (state.avaliarLinfonodos && state.linfonodos === "suspeitos") {
    alteracoes.push("linfonodos_alterados");
  }

  const dados: TireoideDados = {
    com_doppler: state.doppler,
    volume_glandular: null,
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
