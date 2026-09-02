/**
 * PELVE FEMININA — do estado da TELA para o contrato do RENDERER canônico.
 *
 * A segunda categoria da troca de motor (§3.2), depois da TIREOIDE. Escolhida
 * pelo uso real: 336 laudos em 90 dias, a maior entre as que já têm catálogo
 * canônico (medido em 21/08, não estimado).
 *
 * Como o da tireoide, este módulo **não escreve texto clínico**. Traduz o que o
 * médico clicou e digitou para `PelveFemininaFindings` e entrega ao
 * `/render`, que monta o laudo.
 *
 * ## A diferença de forma em relação à tireoide
 *
 * A tireoide tinha um estado próprio, tipado. A pelve usa o sistema genérico de
 * `ExamCategory`: o estado é um `Record<string, unknown>` por seção, com as
 * chaves dos campos do módulo. Isso significa que **nada aqui é garantido pelo
 * compilador** — um campo renomeado na tela não quebra o build, só passa a
 * chegar `undefined` no laudo. Por isso cada leitura passa por um acessador que
 * declara o que espera, e o gate diferencial existe para pegar o resto.
 *
 * ## O que fica de cada lado (regra §1 do plano)
 *
 * - **VOLUME: a web calcula.** O médico DIGITA os eixos, o dado é confiável, e
 *   o elipsoide é fórmula pura. O canônico recebe pronto — é a regra dele.
 * - **CLASSIFICAÇÃO: nunca aqui.** O que for escore ou categoria sai do
 *   renderer. Duas autoridades sobre o mesmo laudo, não.
 */

/** O que a tela guarda de uma seção. Nada aqui é tipado pelo compilador. */
type EstadoDaSecao = Record<string, unknown>;
export type EstadoDaPelve = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = {
  onde: string;
  valor: string;
  motivo: string;
  /** Renderizar assim mesmo produziria um laudo que NEGA o que o médico marcou. */
  bloqueia?: boolean;
};

const FATOR_ELIPSOIDE = 0.523;

function secao(estado: EstadoDaPelve, id: string): EstadoDaSecao {
  const s = estado?.[id];
  return s && typeof s === "object" ? (s as EstadoDaSecao) : {};
}

function texto(s: EstadoDaSecao, chave: string): string {
  const v = s[chave];
  return typeof v === "string" ? v.trim() : "";
}

/** Um `checklist` da tela é um array de valores marcados. */
function marcado(s: EstadoDaSecao, chave: string, valor = "sim"): boolean {
  const v = s[chave];
  return Array.isArray(v) && v.includes(valor);
}

/**
 * "7,0 x 4,0 x 5,0" → [7, 4, 5]. Vírgula decimal, `x` ou `×`.
 *
 * Devolve `null` no vazio em vez de `[]`: array vazio afirmaria "medi e não deu
 * nada", e o renderer distingue os dois.
 */
function medidas(bruto: string): number[] | null {
  const nums = bruto
    .split(/[x×]/i)
    .map((p) => Number.parseFloat(p.trim().replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? nums : null;
}

function volumeDe(m: number[] | null): number | null {
  if (!m || m.length < 3) return null;
  const [a, b, c] = m;
  if (a === undefined || b === undefined || c === undefined) return null;
  return +(a * b * c * FATOR_ELIPSOIDE).toFixed(1);
}

function numero(bruto: string): number | null {
  const n = Number.parseFloat(bruto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function numeros(bruto: string): number[] | null {
  const valores = (bruto.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((v) => Number.parseFloat(v.replace(",", ".")))
    .filter((v) => Number.isFinite(v) && v > 0);
  return valores.length ? valores : null;
}

type Ovario = {
  visualizado: boolean;
  medidas_cm: number[] | null;
  volume_ml: number | null;
  alterado: boolean;
  atrofico: boolean;
  achados: {
    lado: "direito" | "esquerdo";
    tipo: string | null;
    medidas_cm: number[] | null;
    descricao: string | null;
    vascularizacao?: string | null;
    orads_ditado?: string | null;
  }[];
  foliculos_mm?: number[] | null;
};

function adaptarOvario(
  s: EstadoDaSecao,
  lado: "direito" | "esquerdo",
  pendencias: Pendencia[],
  dopplerRealizado: boolean,
): Ovario {
  const visualizado = s.visualizado !== "nao";
  const m = medidas(texto(s, "medidas"));
  const tipo = texto(s, "achado");
  const temAchado = tipo !== "" && tipo !== "nenhum";

  /**
   * Todos os tipos da tela precisam existir no canônico. Se a tela ganhar
   * uma opção sem par, ela BLOQUEIA:
   * sem tipo o achado sai do laudo, e o ovário passa a ser descrito como
   * normal. Perder um cisto em silêncio é o pior modo de falhar aqui.
   */
  const TIPOS = ["cisto_simples", "cisto_complexo", "endometrioma", "funcional", "sop", "teratoma", "hidrossalpinge", "cisto_paraovariano", "lesao_solida", "outro"];
  if (temAchado && !TIPOS.includes(tipo)) {
    pendencias.push({
      onde: `ovário ${lado}`,
      valor: tipo,
      motivo:
        "este tipo de achado não existe no catálogo canônico — sem ele o ovário sairia descrito como normal, apagando o achado",
      bloqueia: true,
    });
  }

  return {
    visualizado,
    medidas_cm: m,
    volume_ml: volumeDe(m),
    alterado: temAchado,
    atrofico: marcado(s, "atrofico"),
    achados: temAchado
      ? [
          {
            lado,
            tipo,
            medidas_cm: medidas(texto(s, `achado.${tipo}.medidas`)),
            descricao: texto(s, `achado.${tipo}.descricao`) || null,
            vascularizacao: dopplerRealizado ? texto(s, `achado.${tipo}.vascularizacao`) || null : null,
            orads_ditado: texto(s, `achado.${tipo}.orads`) || null,
          },
        ]
      : [],
    foliculos_mm: numeros(texto(s, "foliculos_mm")),
  };
}

export type Adaptacao = {
  dados: Record<string, unknown>;
  /** Ids de `AlteracaoSpec` que o estado da tela implica. */
  alteracoes: string[];
  pendencias: Pendencia[];
};

export function adaptarPelve(
  estado: EstadoDaPelve,
  opcoes: Record<string, string | string[]>,
): Adaptacao {
  const pendencias: Pendencia[] = [];
  const alteracoes: string[] = [];

  const u = secao(estado, "utero");
  const e = secao(estado, "endometrio");
  const od = secao(estado, "ovario_direito");
  const oe = secao(estado, "ovario_esquerdo");

  const modo = typeof opcoes.modo_pelve === "string" ? opcoes.modo_pelve : "rotina";
  const viaInformada = typeof opcoes.via === "string" ? opcoes.via : "ta_tv";
  const via = modo === "pos_abortamento" ? "pos_abortamento" : modo === "monitorizacao_folicular" ? "tv" : viaInformada;
  const dopplerRealizado = modo === "doppler";
  const menopausa = Array.isArray(opcoes.menopausa) && opcoes.menopausa.includes("sim");

  const uteroMedidas = medidas(texto(u, "medidas"));

  /**
   * O MIOMA individualizado. A tela guarda os subcampos achatados, com o
   * prefixo `mioma.sim.` — é a convenção do sistema genérico, não um detalhe
   * deste arquivo.
   */
  const miomas = ["mioma", "mioma2", "mioma3"]
    .filter((chave) => marcado(u, chave))
    .map((chave) => ({
      classificacao: texto(u, `${chave}.sim.classificacao`) || null,
      medidas_cm: medidas(texto(u, `${chave}.sim.medidas`)),
      parede: texto(u, `${chave}.sim.parede`) || null,
      relacao: null,
      figo: texto(u, `${chave}.sim.figo`) || null,
    }));

  /**
   * ADENOMIOSE — a tela marca, o canônico precisa da FRASE.
   *
   * `adenomiose: true` sozinho não escreve nada no corpo: o renderer usa
   * `miometrio_descricao` para descrever, e `adenomiose_conclusao` para
   * concluir. Marcar sem frase produziria um laudo que "tem adenomiose" e não
   * a menciona em lugar nenhum — o achado clicado desaparecendo em silêncio.
   *
   * A redação vem do catálogo (`alteracoes/PELVE_FEMININA.ts`), não daqui: este
   * módulo não escreve texto clínico. Por isso é uma ALTERAÇÃO, não um campo.
   */
  const temAdenomiose = marcado(u, "adenomiose");
  if (temAdenomiose) alteracoes.push("adenomiose");

  const espessura = numero(texto(e, "espessura"));
  const achadoEndometrio = texto(e, "achado");
  const tipoEndometrio = texto(e, "achado_tipo");
  const diu = texto(e, "diu");

  /**
   * O achado endometrial é TEXTO LIVRE na tela ("pólipo endometrial de 0,8 cm").
   * O canônico aceita verbatim em `endometrio_achado`, e é o certo aqui: a
   * alternativa seria a tela adivinhar de que patologia se trata para escolher
   * um cenário, e errar em silêncio.
   *
   * Isto é dívida conhecida e está anotada no sprint: sete cenários da web
   * escrevem redação clínica em campo verbatim, e a correção é campo
   * estruturado, uma categoria por vez.
   */
  const dados: Record<string, unknown> = {
    via,
    modo,
    doppler_realizado: dopplerRealizado,

    utero_posicao: texto(u, "posicao") || null,
    utero_medidas_cm: uteroMedidas,
    utero_volume_ml: volumeDe(uteroMedidas),
    utero_volume_classe: texto(u, "volume_classe") || null,
    miomas,
    utero_miomatoso: marcado(u, "miomatoso"),

    endometrio_espessura_cm: espessura,
    endometrio_eco: texto(e, "eco") === "heterogeneo" ? "heterogêneo" : "homogêneo",
    /**
     * MENOPAUSA vence a frase escolhida no módulo.
     *
     * É um controle de CATEGORIA na tela — vale para o laudo inteiro, ovários
     * inclusive — e o módulo do endométrio tem a própria lista. Sem esta
     * precedência o médico marcaria menopausa no topo e a conclusão sairia com
     * a correlação de menacme.
     */
    endometrio_frase: menopausa ? "menopausa" : texto(e, "frase") || null,
    endometrio_motivo: null,
    endometrio_achado: achadoEndometrio || null,
    endometrio_conclusao: null,
    endometrio_tipo: tipoEndometrio && tipoEndometrio !== "nenhum" ? tipoEndometrio : null,
    endometrio_medidas_cm: medidas(texto(e, "achado_medidas")),
    endometrio_vascularizacao: dopplerRealizado ? texto(e, "vascularizacao") || null : null,

    ovario_direito: adaptarOvario(od, "direito", pendencias, dopplerRealizado),
    ovario_esquerdo: adaptarOvario(oe, "esquerdo", pendencias, dopplerRealizado),

    diu: diu === "bem_posicionado" || diu === "deslocado" ? diu : marcado(e, "diu") ? "bem_posicionado" : null,
    diu_descricao: texto(e, "diu_descricao") || null,
    istmocele: marcado(u, "istmocele"),
    istmocele_descricao: texto(u, "istmocele.sim.descricao") || null,
    istmocele_tipo: texto(u, "istmocele.sim.tipo") || null,
    cistos_naboth: marcado(u, "cistos_naboth"),
    calcificacao_arqueadas: false,

    /** Só marca líquido livre quando selecionado explicitamente no formulário. */
    liquido_livre: marcado(e, "liquido_livre"),
    liquido_livre_descricao: texto(e, "liquido_livre.sim.descricao") || null,
    produtos_retidos: modo === "pos_abortamento" && texto(e, "produtos_retidos") === "sim",
    produtos_retidos_quantidade: texto(e, "produtos_retidos_quantidade") || null,
    observacoes_corpo: null,
    achados_adicionais: null,
    referencia_idade_anos: null,
    referencia_grande_multipara: false,
  };

  /**
   * ⚠️ O QUE O CENÁRIO É DONO, O ADAPTADOR NÃO MANDA.
   *
   * `dados` é mesclado POR CIMA do cenário. A alteração `adenomiose` preenche
   * `adenomiose: true` e `miometrio_descricao` com a frase da casa; mandar
   * `miometrio_descricao: null` daqui apagaria justamente o texto que descreve
   * o achado. O guard `achadosApagados` pega e devolve 409 — ou seja, o médico
   * marcaria adenomiose e receberia um erro, sem entender por quê.
   *
   * A regra geral: campo que alguma `AlteracaoSpec` selecionada assere fica
   * FORA de `dados`. O que está aqui é o que vem do formulário.
   */
  if (temAdenomiose) {
    delete dados.miometrio_descricao;
    delete dados.adenomiose;
    delete dados.adenomiose_conclusao;
  } else {
    dados.adenomiose = false;
  }

  return { dados, alteracoes, pendencias };
}
