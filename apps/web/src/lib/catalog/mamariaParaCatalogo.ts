/**
 * MAMÁRIA — do estado da TELA para o contrato do RENDERER canônico.
 *
 * A terceira categoria da troca de motor (§3.2), e a última das que já têm
 * catálogo canônico pronto.
 *
 * ## Esta chegou quase pronta
 *
 * Diferente da tireoide, a tela da mama JÁ classifica pelos eixos do BI-RADS —
 * ecogenicidade, forma, margem, orientação, sombra acústica, calcificações — que
 * são exatamente os que o renderer usa para calcular. Não há aqui a inversão de
 * escala que bloqueou o nódulo tireoidiano por um dia: BI-RADS é BI-RADS dos
 * dois lados, a mesma escala do ACR.
 *
 * O que sobrou foram **duas chaves com nome diferente para a mesma coisa**, e
 * elas estão nos mapas abaixo. Não são detalhe: chave desconhecida faz o Zod
 * recusar o laudo inteiro.
 *
 * ## O BI-RADS forçado ATRAVESSA — e aqui isso é seguro
 *
 * A tela tem um campo "BI-RADS (forçar)" e o canônico tem `birads_ditado`, que
 * vence o cálculo. Na tireoide um campo parecido era veneno, porque as duas
 * "notas" eram escalas diferentes com o mesmo nome. Aqui não: o médico escreve
 * "4A" e "4A" é o que o canônico entende. Repassar preserva a decisão dele, que
 * é justamente para isso que o campo existe.
 */

type EstadoDaSecao = Record<string, unknown>;
export type EstadoDaMama = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = {
  onde: string;
  valor: string;
  motivo: string;
  bloqueia?: boolean;
};

function secao(estado: EstadoDaMama, id: string): EstadoDaSecao {
  const s = estado?.[id];
  return s && typeof s === "object" ? (s as EstadoDaSecao) : {};
}

function texto(s: EstadoDaSecao, chave: string): string {
  const v = s[chave];
  return typeof v === "string" ? v.trim() : "";
}

function marcado(s: EstadoDaSecao, chave: string, valor: string): boolean {
  const v = s[chave];
  return Array.isArray(v) && v.includes(valor);
}

function medidas(bruto: string): number[] | null {
  const nums = bruto
    .split(/[x×]/i)
    .map((p) => Number.parseFloat(p.trim().replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? nums : null;
}

/**
 * A tela diz `nodulo`; o canônico, `nodulo_solido`. Mesma coisa, nome diferente
 * — e chave desconhecida faz o Zod recusar o laudo INTEIRO, não só o achado.
 */
const TIPO_PARA_CANONICO: Record<string, string> = {
  cisto_simples: "cisto_simples",
  multiplos_cistos: "multiplos_cistos",
  nodulo: "nodulo_solido",
  calcificacoes: "calcificacoes",
};

/** `grosseiras` na tela é `grosseiras_benignas` no canônico. Mesmo caso. */
const CALC_PARA_CANONICO: Record<string, string> = {
  grosseiras: "grosseiras_benignas",
  microcalcificacoes: "microcalcificacoes",
  em_nodulo: "em_nodulo",
  intraductais: "intraductais",
  fora_nodulo: "fora_nodulo",
};

/**
 * A ecotextura de fundo. O canônico recebe TEXTO, não enum — a frase inteira
 * que vai para o corpo do laudo. Traduzir aqui não é escrever redação clínica
 * nova: é escolher entre as três que a tela já oferecia, com as palavras do
 * canônico.
 */
const FUNDO: Record<string, string> = {
  heterogeneo: "heterogênea",
  denso: "fibroglandular densa",
  adiposo: "predominantemente adiposa",
};

type Achado = Record<string, unknown>;

/**
 * Um achado de uma mama. A tela achata os subcampos como
 * `md_tipo.nodulo.eco` — convenção do sistema genérico, não deste arquivo.
 */
function acharNaMama(
  s: EstadoDaSecao,
  prefixo: "md" | "me",
  lado: "direita" | "esquerda",
  pendencias: Pendencia[],
): Achado | null {
  const tipoTela = texto(s, `${prefixo}_tipo`);
  if (!tipoTela || tipoTela === "nenhum") return null;

  const tipo = TIPO_PARA_CANONICO[tipoTela];
  if (!tipo) {
    /**
     * BLOQUEIA. Sem tipo o achado não entra na lista, e a mama passa a ser
     * descrita como normal — o nódulo que o médico marcou desaparece do laudo
     * sem erro nenhum. É o pior modo de falhar desta categoria.
     */
    pendencias.push({
      onde: `mama ${lado}`,
      valor: tipoTela,
      motivo:
        "este tipo de achado não existe no catálogo canônico — sem ele a mama sairia descrita como normal, apagando o achado",
      bloqueia: true,
    });
    return null;
  }

  const sub = (k: string) => texto(s, `${prefixo}_tipo.${tipoTela}.${k}`);
  const calcSub = sub("calc_sub");

  return {
    tipo,
    lado,
    ecogenicidade: sub("eco") || null,
    forma: sub("forma") || null,
    orientacao: sub("orientacao") || null,
    margem: sub("margem") || null,
    posterior: sub("posterior") || null,
    /**
     * Duas origens de calcificação, e elas não se confundem: no NÓDULO é o
     * checklist "microcalc. de permeio"; no achado de CALCIFICAÇÕES é o tipo
     * escolhido. Um achado só nunca tem as duas.
     */
    calcificacoes: calcSub
      ? (CALC_PARA_CANONICO[calcSub] ?? null)
      : marcado(s, `${prefixo}_tipo.${tipoTela}.calc`, "microcalc")
        ? "microcalcificacoes"
        : null,
    elasticidade: null,
    descritores: null,
    medidas_cm: medidas(sub("medidas")),
    medida_invalida: null,
    localizacao: sub("local") || null,
    horario: null,
    dist_pele_cm: null,
    dist_mamilo_cm: null,
    descricao_nao_nodular: null,
    /**
     * O BI-RADS forçado pelo médico VENCE o cálculo — é para isso que o campo
     * existe, e a escala é a mesma dos dois lados (ACR).
     */
    birads_ditado: sub("birads") || null,
  };
}

/**
 * Estado novo da tela: cada achado tem id próprio e pode coexistir com outros
 * na mesma mama. O formato achatado mantém compatibilidade com o motor genérico
 * e com os rascunhos antigos, sem serializar objetos dentro de inputs.
 */
function acharPorId(
  s: EstadoDaSecao,
  id: string,
  pendencias: Pendencia[],
): Achado | null {
  const base = `achados.${id}`;
  const tipoTela = texto(s, `${base}.tipo`);
  const lado = texto(s, `${base}.lado`);
  if (!tipoTela || (lado !== "direita" && lado !== "esquerda")) {
    pendencias.push({
      onde: `achado ${id}`,
      valor: tipoTela || lado || "incompleto",
      motivo: "todo achado mamário precisa de tipo e lado antes de entrar no laudo",
      bloqueia: true,
    });
    return null;
  }

  const tipo = TIPO_PARA_CANONICO[tipoTela];
  if (!tipo) {
    pendencias.push({
      onde: `mama ${lado}`,
      valor: tipoTela,
      motivo: "este tipo de achado não existe no catálogo canônico",
      bloqueia: true,
    });
    return null;
  }

  const sub = (k: string) => texto(s, `${base}.${k}`);
  const calcSub = sub("calc_sub");
  return {
    tipo,
    lado,
    ecogenicidade: sub("eco") || null,
    forma: sub("forma") || null,
    orientacao: sub("orientacao") || null,
    margem: sub("margem") || null,
    posterior: sub("posterior") || null,
    calcificacoes: calcSub
      ? (CALC_PARA_CANONICO[calcSub] ?? null)
      : marcado(s, `${base}.calc`, "microcalc")
        ? "microcalcificacoes"
        : null,
    elasticidade: null,
    descritores: null,
    medidas_cm: medidas(sub("medidas")),
    medida_invalida: null,
    localizacao: sub("local") || null,
    horario: sub("horario") || null,
    dist_pele_cm: medidas(sub("dist_pele"))?.[0] ?? null,
    dist_mamilo_cm: medidas(sub("dist_mamilo"))?.[0] ?? null,
    descricao_nao_nodular: null,
    birads_ditado: sub("birads") || null,
  };
}

export type Adaptacao = {
  dados: Record<string, unknown>;
  alteracoes: string[];
  pendencias: Pendencia[];
};

export function adaptarMamaria(estado: EstadoDaMama): Adaptacao {
  const pendencias: Pendencia[] = [];
  const m = secao(estado, "mamas");
  const ax = secao(estado, "axilas");

  const ids = Array.isArray(m.achados_ids)
    ? m.achados_ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const achados = (ids.length > 0
    ? ids.map((id) => acharPorId(m, id, pendencias))
    : [
        acharNaMama(m, "md", "direita", pendencias),
        acharNaMama(m, "me", "esquerda", pendencias),
      ]
  ).filter((a): a is Achado => a !== null);

  const axilas = texto(ax, "axilas") || "nao";

  const dados: Record<string, unknown> = {
    /**
     * O título só menciona as axilas quando elas foram avaliadas. Sem isto o
     * laudo se anunciaria como exame das regiões axilares num exame em que
     * ninguém as olhou.
     */
    titulo_com_axilas: axilas !== "nao",
    mama_masculina: false,
    com_protese: false,
    texto_fundo: FUNDO[texto(m, "fundo")] ?? FUNDO.heterogeneo,
    achados,
    axilas_alteradas: axilas === "alteradas",
    axilas_descricao: axilas === "alteradas" ? texto(ax, "axilas.alteradas.desc") || null : null,
    achados_adicionais: null,
    birads_final: null,
    exames_anteriores: [],
  };

  return { dados, alteracoes: [], pendencias };
}
