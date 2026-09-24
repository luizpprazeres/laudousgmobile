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

function descricaoAxilar(s: EstadoDaSecao): string | null {
  const livre = texto(s, "axilas.alteradas.desc");
  const lado = texto(s, "axilas.alteradas.lado");
  const forma = texto(s, "axilas.alteradas.forma");
  const hilo = texto(s, "axilas.alteradas.hilo");
  const cortical = texto(s, "axilas.alteradas.cortical_cm");
  const medidasLinfonodo = texto(s, "axilas.alteradas.medidas");
  const partes = [
    forma ? `de forma ${forma}` : "",
    hilo ? `com hilo gorduroso ${hilo}` : "",
    cortical ? `com cortical medindo ${cortical.replace(".", ",")} cm` : "",
    medidasLinfonodo ? `medindo ${medidasLinfonodo} cm` : "",
    lado ? `${lado === "bilateral" ? "bilateralmente" : `na axila ${lado}`}` : "",
  ].filter(Boolean);
  const estruturada = partes.length ? `Linfonodo axilar ${partes.join(", ")}.` : "";
  return [estruturada, livre].filter(Boolean).join(" ") || null;
}

/**
 * A tela diz `nodulo`; o canônico, `nodulo_solido`. Mesma coisa, nome diferente
 * — e chave desconhecida faz o Zod recusar o laudo INTEIRO, não só o achado.
 */
const TIPO_PARA_CANONICO: Record<string, string> = {
  cisto_simples: "cisto_simples",
  multiplos_cistos: "multiplos_cistos",
  microcistos_agrupados: "microcistos_agrupados",
  cisto_complicado: "cisto_complicado",
  nodulo: "nodulo_solido",
  linfonodo_intramamario: "linfonodo_intramamario",
  calcificacoes: "calcificacoes",
  ginecomastia: "ginecomastia",
  proteses: "proteses",
  achado_nao_nodular: "achado_nao_nodular",
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
  heterogeneo: "Mamas com ecotextura de fundo heterogênea.",
  denso: "Mamas com ecotextura de fundo predominantemente fibroglandular.",
  adiposo: "Mamas com ecotextura de fundo predominantemente adiposa.",
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
    vascularizacao: sub("vascularizacao") || null,
    vascularizacao_descricao: sub("vascularizacao_descricao") || null,
    descritores: null,
    medidas_cm: medidas(sub("medidas")),
    medida_invalida: null,
    localizacao: sub("local") || null,
    horario: null,
    dist_pele_cm: null,
    dist_mamilo_cm: null,
    descricao_nao_nodular: sub("descricao_nao_nodular") || null,
    /**
     * O BI-RADS forçado pelo médico VENCE o cálculo — é para isso que o campo
     * existe, e a escala é a mesma dos dois lados (ACR).
     */
    birads_ditado: sub("birads") || null,
    permitir_birads_calculado: false,
  };
}

/**
 * Campos que o MamariaFormPanel mostra para cada tipo. Localização, horário,
 * distâncias e BI-RADS aparecem em todos; o resto depende do tipo. Mudou a
 * visibilidade na tela, muda aqui — senão volta a atravessar campo escondido.
 */
const CAMPOS_COMUNS = new Set(["local", "horario", "dist_pele", "dist_mamilo", "birads"]);
const COM_DOPPLER = ["vascularizacao", "vascularizacao_descricao"];
const CAMPOS_VISIVEIS: Record<string, Set<string>> = {
  // `calc_sub` no nódulo vem da leitura de imagem (companion); a tela o mostra
  // no card do nódulo, com opção de remover.
  nodulo: new Set(["medidas", "eco", "forma", "margem", "orientacao", "posterior", "elasticidade", "calc", "calc_sub", ...COM_DOPPLER]),
  cisto_simples: new Set(["medidas", ...COM_DOPPLER]),
  multiplos_cistos: new Set(["medidas", ...COM_DOPPLER]),
  microcistos_agrupados: new Set(["medidas", "descritores", ...COM_DOPPLER]),
  cisto_complicado: new Set(["medidas", "descritores", ...COM_DOPPLER]),
  linfonodo_intramamario: new Set(["medidas", ...COM_DOPPLER]),
  // `calc` = ["microcalc"] é como o companion grava microcalcificações.
  calcificacoes: new Set(["calc_sub", "calc", ...COM_DOPPLER]),
  achado_nao_nodular: new Set(["medidas", "descricao_nao_nodular", ...COM_DOPPLER]),
  ginecomastia: new Set([]),
  proteses: new Set(["descritores"]),
};

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

  /**
   * SÓ O QUE A TELA MOSTRA PARA ESTE TIPO.
   *
   * Trocar o tipo não apaga as chaves do tipo anterior — e nem deve, porque o
   * médico pode voltar. Mas campo escondido não é achado: um "Nódulo sólido"
   * trocado por "Cisto simples" carregava ecogenicidade hipoecoica, forma e
   * margem para o renderer, e o cisto saía descrito como "Imagem hipoecoica".
   * As mesmas regras de visibilidade do MamariaFormPanel decidem aqui o que
   * atravessa.
   */
  const sub = (k: string) => texto(s, `${base}.${k}`);
  const visivel = (k: string) => (CAMPOS_VISIVEIS[tipoTela]?.has(k) ?? false) || CAMPOS_COMUNS.has(k);
  const doTipo = (k: string) => (visivel(k) ? sub(k) : "");
  const microcalcMarcada = visivel("calc") && marcado(s, `${base}.calc`, "microcalc");
  /**
   * No achado de CALCIFICAÇÕES o padrão é a lista; o companion grava
   * microcalcificações como `calc: ["microcalc"]`, e isso também é padrão
   * escolhido — a tela mostra "Microcalcificações" nesse caso.
   */
  const calcSub = doTipo("calc_sub") || (tipoTela === "calcificacoes" && microcalcMarcada ? "microcalcificacoes" : "");
  if (tipoTela === "calcificacoes" && !calcSub) {
    /**
     * BLOQUEIA. A lista não tem padrão escolhido, e o renderer, sem padrão,
     * escreve a frase das calcificações GROSSEIRAS — o laudo afirmaria um
     * padrão benigno que ninguém marcou.
     */
    pendencias.push({
      onde: `mama ${lado}`,
      valor: "calcificações",
      motivo: "escolha o padrão das calcificações",
      bloqueia: true,
    });
    return null;
  }
  return {
    tipo,
    lado,
    ecogenicidade: doTipo("eco") || null,
    forma: doTipo("forma") || null,
    orientacao: doTipo("orientacao") || null,
    margem: doTipo("margem") || null,
    posterior: doTipo("posterior") || null,
    calcificacoes: calcSub
      ? (CALC_PARA_CANONICO[calcSub] ?? null)
      : microcalcMarcada
        ? "microcalcificacoes"
        : null,
    elasticidade: doTipo("elasticidade") || null,
    vascularizacao: doTipo("vascularizacao") || null,
    vascularizacao_descricao: doTipo("vascularizacao_descricao") || null,
    descritores: doTipo("descritores") || null,
    medidas_cm: medidas(doTipo("medidas")),
    medida_invalida: null,
    localizacao: sub("local") || null,
    horario: sub("horario") || null,
    dist_pele_cm: medidas(sub("dist_pele"))?.[0] ?? null,
    dist_mamilo_cm: medidas(sub("dist_mamilo"))?.[0] ?? null,
    descricao_nao_nodular: doTipo("descricao_nao_nodular") || null,
    birads_ditado: sub("birads") || null,
    permitir_birads_calculado: false,
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
  const opts = secao(estado, "__opts");
  const escopoInformado = texto(opts, "escopo_exame");
  const axilasLegadas = texto(ax, "axilas") || "nao";
  const escopo = escopoInformado === "mamas" || escopoInformado === "axilas" || escopoInformado === "mamas_axilas"
    ? escopoInformado
    : axilasLegadas === "nao"
      ? "mamas"
      : "mamas_axilas";
  const incluiMamas = escopo !== "axilas";
  const incluiAxilas = escopo !== "mamas";
  const perfil = texto(opts, "perfil_mamario") || "padrao";
  const dopplerRealizado = texto(opts, "doppler_mamario") === "sim";

  const ids = Array.isArray(m.achados_ids)
    ? m.achados_ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const achados = (!incluiMamas ? [] : ids.length > 0
    ? ids.map((id) => acharPorId(m, id, pendencias))
    : [
        acharNaMama(m, "md", "direita", pendencias),
        acharNaMama(m, "me", "esquerda", pendencias),
      ]
  ).filter((a): a is Achado => a !== null);

  const axilas = texto(ax, "axilas") || (incluiAxilas ? "normais" : "nao");

  const dados: Record<string, unknown> = {
    /**
     * O título só menciona as axilas quando elas foram avaliadas. Sem isto o
     * laudo se anunciaria como exame das regiões axilares num exame em que
     * ninguém as olhou.
     */
    escopo_exame: escopo,
    titulo_com_axilas: incluiAxilas,
    mama_masculina: perfil === "masculina",
    com_protese: perfil === "proteses",
    doppler_realizado: dopplerRealizado,
    texto_fundo: incluiMamas ? FUNDO[texto(m, "fundo")] ?? FUNDO.heterogeneo : null,
    achados,
    axilas_alteradas: incluiAxilas && axilas === "alteradas",
    axilas_descricao: incluiAxilas && axilas === "alteradas" ? descricaoAxilar(ax) : null,
    achados_adicionais: null,
    birads_final: null,
    exames_anteriores: [],
  };

  return { dados, alteracoes: [], pendencias };
}
