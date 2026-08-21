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
  return +(m[0] * m[1] * m[2] * FATOR_ELIPSOIDE).toFixed(1);
}

function numero(bruto: string): number | null {
  const n = Number.parseFloat(bruto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
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
  }[];
};

function adaptarOvario(
  s: EstadoDaSecao,
  lado: "direito" | "esquerdo",
  pendencias: Pendencia[],
): Ovario {
  const visualizado = s.visualizado !== "nao";
  const m = medidas(texto(s, "medidas"));
  const tipo = texto(s, "achado");
  const temAchado = tipo !== "" && tipo !== "nenhum";

  /**
   * Os quatro tipos da tela existem todos no canônico — conferido chave por
   * chave em 21/08. Se um dia a tela ganhar um quinto sem par, ele BLOQUEIA:
   * sem tipo o achado sai do laudo, e o ovário passa a ser descrito como
   * normal. Perder um cisto em silêncio é o pior modo de falhar aqui.
   */
  const TIPOS = ["cisto_simples", "cisto_complexo", "endometrioma", "funcional", "sop", "outro"];
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
            descricao: null,
          },
        ]
      : [],
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

  const via = typeof opcoes.via === "string" ? opcoes.via : "ta_tv";
  const menopausa = Array.isArray(opcoes.menopausa) && opcoes.menopausa.includes("sim");

  const uteroMedidas = medidas(texto(u, "medidas"));

  /**
   * O MIOMA individualizado. A tela guarda os subcampos achatados, com o
   * prefixo `mioma.sim.` — é a convenção do sistema genérico, não um detalhe
   * deste arquivo.
   */
  const temMioma = marcado(u, "mioma");
  const miomas = temMioma
    ? [
        {
          classificacao: texto(u, "mioma.sim.classificacao") || null,
          medidas_cm: medidas(texto(u, "mioma.sim.medidas")),
          parede: texto(u, "mioma.sim.parede") || null,
          relacao: null,
          figo: texto(u, "mioma.sim.figo") || null,
        },
      ]
    : [];

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

    ovario_direito: adaptarOvario(od, "direito", pendencias),
    ovario_esquerdo: adaptarOvario(oe, "esquerdo", pendencias),

    diu: marcado(e, "diu") ? "bem_posicionado" : null,
    diu_descricao: null,
    istmocele: false,
    istmocele_descricao: null,
    istmocele_tipo: null,
    cistos_naboth: false,
    calcificacao_arqueadas: false,

    /**
     * LÍQUIDO LIVRE é `false` fixo, e é de propósito: a tela não pergunta.
     * Mandar `true` sem o médico ter dito é alucinar um achado — foi um defeito
     * real de produção, corrigido em 30/06 e que não se repete aqui.
     */
    liquido_livre: false,
    liquido_livre_descricao: null,
    produtos_retidos: false,
    produtos_retidos_quantidade: null,
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
