/**
 * OBSTÉTRICA — do estado da TELA para o contrato do RENDERER canônico.
 *
 * A quarta categoria da troca de motor (§3.2), e a de maior volume entre as que
 * têm renderer canônico: 697 laudos em 90 dias.
 *
 * ## A diferença de escala em relação às três primeiras
 *
 * O contrato canônico obstétrico é MUITO mais rico que a tela: ele conhece
 * gemelaridade, corionicidade, gestação inicial (saco/CCN), cordão, percentil,
 * achados de crânio, ovário, hematoma perigestacional. A tela cobre a gestação
 * ÚNICA de 2º/3º trimestre.
 *
 * Isso não é perda na travessia — é o alcance que a tela sempre teve. O que
 * este módulo garante é que tudo que ela SABE dizer chegue inteiro, e que o
 * resto vá explicitamente nulo em vez de meio-preenchido.
 *
 * ## ⚠️ O FETO PRECISA IR INTEIRO
 *
 * `fetos` é ARRAY, e o merge do catálogo substitui array por inteiro — não
 * mescla campo a campo. Mandar só a biometria apagaria os demais campos que o
 * schema exige, e o Zod recusaria o laudo EM SILÊNCIO. A lição custou uma
 * tarde em `catalog/exemplos.ts` e está aqui para não se repetir.
 *
 * ## O que fica de cada lado (regra §1)
 *
 * - **IG e peso: a tela NÃO calcula.** Diferente do volume da tireoide, que é
 *   elipsoide puro, a idade gestacional tem a regra do Dr. Domingos (biometria
 *   atual como âncora, correção só acima de 5 dias) e o peso tem fórmula
 *   escolhida. Os dois saem do renderer, que é quem tem essas regras.
 * - **A tela informa o que foi MEDIDO.** DBP, CC, CA, CF, BCF, ILA/MBV.
 */

import { dopplerDaTela } from "./dopplerParaCatalogo";
import { fetalGrowthDaTela } from "./fetalGrowthParaCatalogo";

type EstadoDaSecao = Record<string, unknown>;
export type EstadoObstetrico = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean };

function secao(estado: EstadoObstetrico, id: string): EstadoDaSecao {
  const s = estado?.[id];
  return s && typeof s === "object" ? (s as EstadoDaSecao) : {};
}

function texto(s: EstadoDaSecao, chave: string): string {
  const v = s[chave];
  return typeof v === "string" ? v.trim() : "";
}

function numero(s: EstadoDaSecao, chave: string): number | null {
  const n = Number.parseFloat(texto(s, chave).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function cervicometriaDaTela(estado: EstadoObstetrico): Record<string, unknown> | null {
  const c = secao(estado, "cervicometria");
  if (texto(c, "realizada") !== "sim") return null;
  return {
    colo_oi_oe_cm: numero(c, "realizada.sim.colo_cm"),
    orificio_interno_fechado: texto(c, "realizada.sim.orificio") !== "aberto",
    placenta_distancia_cm: numero(c, "realizada.sim.placenta_cm"),
    placenta_distante:
      texto(c, "realizada.sim.placenta_distante") === "sim" &&
      numero(c, "realizada.sim.placenta_cm") === null,
    cerclagem: texto(c, "realizada.sim.cerclagem") === "sim",
    observacoes: texto(c, "realizada.sim.observacoes") || null,
  };
}

/**
 * O feto COMPLETO. Todo campo do `FetoSchema` aparece aqui, mesmo os que a tela
 * não coleta — ver o aviso do cabeçalho sobre array substituído por inteiro.
 */
function fetoDaTela(f: EstadoDaSecao, b: EstadoDaSecao) {
  const dorso = texto(f, "dorso");
  const transversa = texto(f, "situacao") === "transversa";
  return {
    rotulo: null,
    posicao_relativa: null,
    apresentacao: transversa
      ? null
      : texto(f, "situacao.longitudinal.apresentacao") || texto(f, "apresentacao") || "cefálica",
    dorso: dorso || null,
    polo_cefalico: transversa
      ? texto(f, "situacao.transversa.polo_cefalico") || "à direita"
      : null,
    bcf_bpm: numero(f, "bcf"),
    dbp_mm: numero(b, "dbp"),
    cc_mm: numero(b, "cc"),
    ca_mm: numero(b, "ca"),
    cf_mm: numero(b, "cf"),
    ccn_mm: null,
    peso_g: numero(b, "peso"),
    peso_variacao_g: null,
    percentil: null,
    bcf_alteracao: null,
    movimentos_fetais: null,
    cranio_achado: null,
    cranio_medida_mm: null,
    cranio_lateralidade: null,
    cordao_vasos: null,
  };
}

export type Adaptacao = {
  dados: Record<string, unknown>;
  alteracoes: string[];
  pendencias: Pendencia[];
};

export function adaptarObstetrica(estado: EstadoObstetrico): Adaptacao {
  const pendencias: Pendencia[] = [];

  const ig = secao(estado, "ig");
  const f = secao(estado, "feto");
  const b = secao(estado, "biometria");
  const p = secao(estado, "placenta");
  const l = secao(estado, "liquido");
  const a = secao(estado, "achados");
  const crescimento = fetalGrowthDaTela(estado);

  const fonte = texto(ig, "referencia") || "nenhuma";

  /**
   * A REFERÊNCIA PRECOCE — de onde vem a idade gestacional de comparação.
   *
   * A tela oferece US precoce ou DUM, cada uma com os próprios subcampos. O
   * canônico separa a FONTE (`referencia_fonte`) dos DADOS, e é ele quem aplica
   * a regra do Dr. Domingos: a biometria de hoje é a âncora, e a correção só
   * aparece se divergir mais de cinco dias.
   */
  const usg = fonte === "usg";
  const dum = fonte === "dum";
  const sub = (k: string) => texto(ig, `referencia.${fonte}.${k}`);

  /** "Sinalizar correção" é `sim` por padrão na tela; nulo quando não há fonte. */
  const corrigir = usg || dum ? sub("corrigir") !== "nao" : null;

  const placentaDetalhada = texto(p, "estado") === "detalhar";

  /**
   * O LÍQUIDO, com a salvaguarda que já existia na tela preservada.
   *
   * Escolher "MBV" e deixar a medida em branco NÃO vira `liquido_tipo: "mbv"`
   * com valor nulo: vira normal subjetivo, que é o que a tela já fazia. O
   * comentário original dizia por quê, e vale repetir — nunca afirmar
   * normalidade atrelada a um "____ cm", nem oligoâmnio a partir de nada.
   *
   * É SEGUNDA camada, não única: o renderer também exige
   * `liquido_ila_cm !== null` antes de escrever a linha. Descobri isso
   * mutando esta salvaguarda e vendo o gate continuar verde (22/08) — o que
   * não invalida tê-la aqui, mas invalida dizer que o gate a prova.
   */
  const tipoLiquido = texto(l, "tipo") || "subjetivo";
  const mbv = numero(l, "tipo.mbv.cm");
  const ila = numero(l, "tipo.ila.cm");
  const liquidoTipo =
    tipoLiquido === "mbv" && mbv !== null ? "mbv"
    : tipoLiquido === "ila" && ila !== null ? "ila"
    : "normal";

  const dados: Record<string, unknown> = {
    /**
     * A tela é de gestação ÚNICA de 2º/3º trimestre. Gemelar e gestação inicial
     * são alcance do canônico que ela não oferece — declarado, não inferido.
     */
    numero_fetos: 1,
    corionicidade: null,
    gestacao_inicial: false,
    fetos: [{
      ...fetoDaTela(f, b),
      percentil: crescimento ? crescimento.efwPercentile : null,
    }],

    ig_semanas: numero(ig, "bio_sem"),
    ig_dias: numero(ig, "bio_dias"),
    dum: dum ? sub("dum_data") || null : null,
    data_exame: (usg || dum ? sub("exame_data") : "") || null,
    primeira_us_data: usg ? sub("us_data") || null : null,
    primeira_us_ig_semanas: usg ? numero(ig, "referencia.usg.us_ig_sem") : null,
    primeira_us_ig_dias: usg ? numero(ig, "referencia.usg.us_ig_dias") : null,
    ig_referencia_hoje_semanas: null,
    ig_referencia_hoje_dias: null,
    referencia_fonte: usg ? "usg_precoce" : dum ? "dum" : null,
    corrigir_ig: corrigir,
    saco_gestacional_mm: null,
    saco_gestacional_medidas_mm: null,

    placenta_quantidade: null,
    placenta_localizacao: placentaDetalhada ? texto(p, "estado.detalhar.localizacao") || null : null,
    placenta_ecotextura: placentaDetalhada ? texto(p, "estado.detalhar.ecotextura") || null : null,
    /** O médico digita "II" ou "grau II"; o canônico quer só o algarismo. */
    placenta_grau: placentaDetalhada
      ? texto(p, "estado.detalhar.grau").replace(/^grau\s*/i, "") || null
      : null,
    placenta_relacao_orificio: null,
    placenta_distancia_orificio_mm: null,
    placenta_achado_medidas: null,

    liquido_tipo: liquidoTipo,
    liquido_ila_cm: liquidoTipo === "ila" ? ila : null,
    liquido_mbv_por_feto_cm: liquidoTipo === "mbv" && mbv !== null ? [mbv] : null,
    /**
     * A CLASSE — oligoâmnio, polidrâmnio — sai do RENDERER, dos limiares dele.
     * A tela tem os próprios (`classeILA`, `classeMBV`) e eles ficam de fora:
     * duas autoridades sobre o mesmo julgamento clínico, um dia discordam, e
     * quem lê o laudo não tem como saber qual valeu.
     */
    liquido_classe: null,

    achados_adicionais: texto(a, "texto") || null,
    itens_conclusao_livres: [],
    observacoes_corpo_livres: [],
    cervicometria: cervicometriaDaTela(estado),
    doppler: dopplerDaTela(estado),
    crescimento_fetal: crescimento,
  };

  return { dados, alteracoes: [], pendencias };
}
