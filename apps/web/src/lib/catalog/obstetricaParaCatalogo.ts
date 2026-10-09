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
import { cervicometriaComplemento } from "./cervicometriaLeitura";
import { lerDatacaoDaTela } from "../ig/computeIG";
import {
  lerLiquidoDaTela,
  lerPlacentaDaTela,
  resolverVitalidadeFetal,
} from "../deterministic/organs/obstetrica";

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

function exigirNumero(
  pendencias: Pendencia[],
  s: EstadoDaSecao,
  chave: string,
  onde: string,
  motivo: string,
): number | null {
  const valor = texto(s, chave);
  const lido = /^\d+(?:[.,]\d+)?$/.test(valor) ? Number(valor.replace(",", ".")) : null;
  if (lido === null || !Number.isFinite(lido) || lido <= 0) {
    pendencias.push({ onde, valor, motivo, bloqueia: true });
    return null;
  }
  return lido;
}

/**
 * O feto COMPLETO. Todo campo do `FetoSchema` aparece aqui, mesmo os que a tela
 * não coleta — ver o aviso do cabeçalho sobre array substituído por inteiro.
 */
function fetoDaTela(f: EstadoDaSecao, b: EstadoDaSecao) {
  const dorso = texto(f, "dorso");
  const transversa = texto(f, "situacao") === "transversa";
  /** Automático classifica pela BCF (≤110/≥180); a escolha explícita do médico vence. */
  const vitalidade = resolverVitalidadeFetal(f);
  const movimentos = texto(f, "movimentos") || "normais";
  const cordao = texto(f, "cordao_vasos") || "nao_avaliado";
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
    // Ao trocar para "atividade ausente", o valor anteriormente digitado pode
    // continuar no estado visual. Ele não pode atravessar junto com o óbito.
    bcf_bpm: vitalidade.modo === "ausente" ? null : numero(f, "bcf"),
    dbp_mm: numero(b, "dbp"),
    cc_mm: numero(b, "cc"),
    ca_mm: numero(b, "ca"),
    cf_mm: numero(b, "cf"),
    ccn_mm: null,
    peso_g: numero(b, "peso"),
    peso_variacao_g: null,
    percentil: null,
    bcf_alteracao: vitalidade.alteracao,
    movimentos_fetais: ["ausentes", "reduzidos"].includes(movimentos) ? movimentos : null,
    cranio_achado: null,
    cranio_medida_mm: null,
    cranio_lateralidade: null,
    cordao_vasos: cordao === "tres" || cordao === "dois" ? cordao : null,
  };
}

export type Adaptacao = {
  dados: Record<string, unknown>;
  alteracoes: string[];
  pendencias: Pendencia[];
};

export function adaptarObstetrica(estado: EstadoObstetrico, options?: { incluirDoppler?: boolean }): Adaptacao {
  // OBSTETRICA nao consome indices legados ou recebidos enquanto ocultos.
  if (!options?.incluirDoppler) estado = { ...estado, doppler: {} };
  const pendencias: Pendencia[] = [];

  const ig = secao(estado, "ig");
  const f = secao(estado, "feto");
  const b = secao(estado, "biometria");
  const p = secao(estado, "placenta");
  const l = secao(estado, "liquido");
  const a = secao(estado, "achados");
  const crescimento = fetalGrowthDaTela(estado, pendencias);

  /**
   * A Web começa com um modelo obstétrico completo, mas campos numéricos vazios
   * não são achados normais. Sem este portão o renderer canônico recebe `null`
   * e preserva as lacunas históricas ("____") do modelo de digitação. Na tela
   * interativa isso é perigoso: o documento parece pronto antes de as medidas
   * essenciais terem sido informadas.
   *
   * O portão vive no adaptador Web para não mudar o modelo oficial usado pelos
   * outros clientes. Ao apagar uma medida, a requisição é interrompida e todos
   * os derivados deixam de ser publicáveis junto com o laudo anterior.
   */
  const igSemanas = exigirNumero(
    pendencias,
    ig,
    "bio_sem",
    "Idade gestacional",
    "Informe as semanas da biometria atual.",
  );
  const igDiasRaw = texto(ig, "bio_dias");
  if (igDiasRaw && (!/^\d$/.test(igDiasRaw) || Number(igDiasRaw) > 6)) {
    pendencias.push({
      onde: "Idade gestacional",
      valor: igDiasRaw,
      motivo: "Informe os dias da idade gestacional entre 0 e 6.",
      bloqueia: true,
    });
  }
  // No Automático (e no "Presente" dos estados antigos) a BCF é o próprio dado: vazia fica pendente, nunca vira ausência.
  const vitalidadeFetal = resolverVitalidadeFetal(f);
  if (vitalidadeFetal.modo === "auto") {
    if (vitalidadeFetal.entradaInvalida) {
      pendencias.push({
        onde: "BCF",
        valor: texto(f, "bcf"),
        motivo: "Revise a frequência cardíaca fetal informada.",
        bloqueia: true,
      });
    } else {
      exigirNumero(
        pendencias,
        f,
        "bcf",
        "BCF",
        "Informe a frequência cardíaca fetal em bpm ou selecione uma alteração da atividade cardíaca.",
      );
    }
  } else if (
    vitalidadeFetal.modo !== "ausente" &&
    vitalidadeFetal.bcf !== null &&
    vitalidadeFetal.sugestao !== null &&
    vitalidadeFetal.sugestao !== vitalidadeFetal.modo
  ) {
    pendencias.push({
      onde: "BCF",
      valor: texto(f, "bcf"),
      motivo: `A classificação escolhida pelo médico (${vitalidadeFetal.modo}) diverge da sugestão automática (${vitalidadeFetal.sugestao}).`,
      bloqueia: false,
    });
  }
  for (const [chave, rotulo] of [
    ["dbp", "DBP"],
    ["cc", "CC"],
    ["ca", "CA"],
    ["cf", "CF"],
    ["peso", "Peso fetal estimado"],
  ] as const) {
    exigirNumero(
      pendencias,
      b,
      chave,
      rotulo,
      `Informe ${rotulo === "Peso fetal estimado" ? "o peso fetal estimado" : `a medida de ${rotulo}`} para completar a biometria.`,
    );
  }

  /**
   * A REFERÊNCIA PRECOCE — de onde vem a idade gestacional de comparação.
   *
   * A tela mostra DUM e primeira US juntas, sem seletor; `lerDatacaoDaTela`
   * também lê os estados antigos (`referencia.usg.*`/`referencia.dum.*`). Qualquer
   * referência completa atravessa; com as duas completas, a primeira US é a
   * fonte e a DUM segue impressa como cabeçalho. O canônico aplica a regra do
   * Dr. Domingos: a biometria de hoje é a âncora, e a correção só aparece se
   * divergir mais de cinco dias. Referência começada e inválida bloqueia em vez
   * de sumir do laudo.
   */
  const datacao = lerDatacaoDaTela(ig);
  for (const p of datacao.pendencias) {
    pendencias.push({
      onde: p.campo === "dum" ? "DUM" : "Primeira ultrassonografia",
      valor: p.valor,
      motivo: p.motivo,
      bloqueia: true,
    });
  }
  const usg = datacao.us_data !== null;
  const dum = datacao.dum_data !== null;
  /** Os estados novos sempre corrigem (default do épico); os antigos podiam ter desligado. */
  const corrigir = usg || dum ? datacao.corrigir : null;

  /** Formato novo (`localizacao`/`ecotextura`/`grau`) ou antigo (`estado.detalhar.*`). */
  const placenta = lerPlacentaDaTela(p);
  if (!placenta.legado && !placenta.localizacao) {
    pendencias.push({
      onde: "Placenta",
      valor: "",
      motivo: "Selecione a localização da placenta.",
      bloqueia: true,
    });
  }
  const placentaRelacao = texto(p, "relacao_orificio");
  const placentaAchado = texto(p, "achado");

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
  const liquido = lerLiquidoDaTela(l);
  if (liquido.pendencia) {
    pendencias.push({ onde: "Líquido amniótico", valor: liquido.valorTexto, motivo: liquido.pendencia, bloqueia: true });
  }
  /** Um único `valor_cm` na tela; o legado `tipo.mbv.cm`/`tipo.ila.cm` vale para o método escolhido. */
  const liquidoTipo =
    liquido.metodo !== "subjetivo" && liquido.valor !== null ? liquido.metodo : "normal";

  // Complemento de cervicometria: leitura estrita e portões (cervicometriaLeitura.ts),
  // com a mesma IG que vai ao renderer.
  const cervico = cervicometriaComplemento(secao(estado, "cervicometria"), igSemanas);
  pendencias.push(...cervico.pendencias);

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

    ig_semanas: igSemanas,
    ig_dias: numero(ig, "bio_dias"),
    dum: datacao.dum_data,
    data_exame: usg || dum ? datacao.exame_data : null,
    primeira_us_data: datacao.us_data,
    primeira_us_ig_semanas: datacao.us_ig_sem,
    primeira_us_ig_dias: datacao.us_ig_dias,
    ig_referencia_hoje_semanas: null,
    ig_referencia_hoje_dias: null,
    referencia_fonte: usg ? "usg_precoce" : dum ? "dum" : null,
    corrigir_ig: corrigir,
    saco_gestacional_mm: null,
    saco_gestacional_medidas_mm: null,

    placenta_quantidade: null,
    placenta_localizacao: placenta.localizacao || null,
    placenta_ecotextura: placenta.ecotextura || null,
    /** Grannum é opcional; o legado digitava "II" ou "grau II" e o canônico quer só o algarismo. */
    placenta_grau: placenta.grau || null,
    placenta_relacao_orificio: ["insercao_baixa", "marginal", "previa"].includes(placentaRelacao)
      ? placentaRelacao
      : null,
    placenta_distancia_orificio_mm: placentaRelacao === "insercao_baixa"
      ? numero(p, "relacao_orificio.insercao_baixa.distancia_mm")
      : null,
    placenta_achado: ["descolamento", "acretismo", "lagos_venosos"].includes(placentaAchado)
      ? placentaAchado
      : null,
    placenta_achado_medidas: placentaAchado === "descolamento"
      ? texto(p, "achado.descolamento.medidas") || null
      : null,

    liquido_tipo: liquidoTipo,
    liquido_ila_cm: liquidoTipo === "ila" ? liquido.valor : null,
    liquido_mbv_por_feto_cm: liquidoTipo === "mbv" && liquido.valor !== null ? [liquido.valor] : null,
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
    cervicometria: cervico.dados,
    doppler: dopplerDaTela(estado),
    crescimento_fetal: crescimento,
  };

  return { dados, alteracoes: [], pendencias };
}
