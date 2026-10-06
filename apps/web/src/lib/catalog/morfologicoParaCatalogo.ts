/**
 * MORFOLÓGICO — do estado da TELA para o contrato do RENDERER canônico.
 *
 * A quinta categoria da troca de motor (§3.2), e a que ficou bloqueada por dois
 * dias por um motivo que valia registrar: o canônico não tinha onde pôr o
 * DIAGNÓSTICO.
 *
 * ## O que travava, e o que destravou
 *
 * A tela descreve a anatomia por sistema — crânio/SNC, face, coração, vísceras
 * — e, quando algum está alterado, o médico escreve a descrição (que vai ao
 * corpo) e o diagnóstico (que deveria ir à conclusão). O canônico só tinha
 * `achados_adicionais`, que chega ao corpo, e afirmava na conclusão
 * "Morfologia fetal sem evidência de alteração detectável pelo método" —
 * incondicionalmente.
 *
 * Ou seja: migrar antes produziria um laudo que DESCREVE a malformação no
 * corpo e a NEGA na conclusão. Pior que perder o achado.
 *
 * O renderer ganhou `itens_conclusao_livres` (o mesmo canal da obstétrica) e a
 * frase de normalidade virou condicional. Este adaptador é o que faltava.
 *
 * ## O que fica de cada lado (regra §1)
 *
 * A tela informa o que foi MEDIDO e o que foi VISTO. Idade gestacional, peso e
 * percentil saem do renderer, que tem as regras.
 */

import { dopplerDaTela } from "./dopplerParaCatalogo";
import { fetalGrowthDaTela } from "./fetalGrowthParaCatalogo";
import { cervicometriaComplemento } from "./cervicometriaLeitura";
import { crlToGaDays } from "@laudousg/shared";

type EstadoDaSecao = Record<string, unknown>;
export type EstadoMorfologico = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean };

/** Os quatro sistemas da tela, na ordem em que ela os apresenta. */
const SISTEMAS = ["snc", "face", "coracao", "visceras"] as const;
const ESTRUTURAS_PRECOCES = ["cranio", "face", "coluna", "coracao", "parede_abdominal", "estomago_bexiga", "membros"] as const;
const CAMPOS_BIOMETRIA_SEGUNDO_TERCEIRO = [
  ["dbp", "DBP"], ["cc", "CC"], ["cerebelo", "cerebelo"], ["cisterna", "cisterna magna"],
  ["binocular", "distância binocular"], ["ca", "CA"], ["femur", "fêmur"], ["tibia", "tíbia"],
  ["fibula", "fíbula"], ["umero", "úmero"], ["radio", "rádio"], ["ulna", "ulna"], ["peso", "peso fetal"],
] as const;

function secao(estado: EstadoMorfologico, id: string): EstadoDaSecao {
  const s = estado?.[id];
  return s && typeof s === "object" ? (s as EstadoDaSecao) : {};
}

function texto(s: EstadoDaSecao, chave: string): string {
  const v = s[chave];
  return typeof v === "string" ? v.trim() : "";
}

function marcado(s: EstadoDaSecao, chave: string, valor = "sim"): boolean {
  const dado = s[chave];
  return Array.isArray(dado) && dado.includes(valor);
}

function numero(s: EstadoDaSecao, chave: string): number | null {
  const n = Number.parseFloat(texto(s, chave).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function numeroEstrito(s: EstadoDaSecao, chave: string): number | null | "invalido" {
  const bruto = texto(s, chave);
  if (!bruto) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(bruto)) return "invalido";
  const valor = Number(bruto.replace(",", "."));
  return Number.isFinite(valor) && valor > 0 ? valor : "invalido";
}

/** Primeira letra maiúscula e ponto final — o item entra numa lista numerada. */
function frase(t: string): string {
  const limpo = t.trim().replace(/\.+$/, "");
  if (limpo === "") return "";
  return `${limpo.charAt(0).toUpperCase()}${limpo.slice(1)}.`;
}

export type Adaptacao = {
  dados: Record<string, unknown>;
  alteracoes: string[];
  pendencias: Pendencia[];
};

export function adaptarMorfologico(
  estado: EstadoMorfologico,
  /** Controles de categoria (trimestre). Opcional: a tela pode não tê-los ainda. */
  opcoes: Record<string, string | string[]> = {},
): Adaptacao {
  const pendencias: Pendencia[] = [];

  const ig = secao(estado, "ig");
  const f = secao(estado, "feto");
  const f1 = secao(estado, "primeiro_trimestre");
  const precoce = secao(estado, "avaliacao_precoce");
  const doppler = secao(estado, "doppler");
  const an = secao(estado, "anatomia");
  const b = secao(estado, "biometria");
  const ex = secao(estado, "extrafetal");
  const ac = secao(estado, "achados");
  const crescimento = fetalGrowthDaTela(estado, pendencias);
  const achadoLivre = texto(ac, "texto");
  const conclusaoLivre = frase(texto(ac, "conclusao"));
  const dispensaConclusao = marcado(ac, "dispensar_conclusao");

  if (achadoLivre && !conclusaoLivre && !dispensaConclusao) {
    pendencias.push({
      onde: "achados adicionais",
      valor: achadoLivre,
      motivo: "informe a conclusão correspondente ou confirme que o texto deve permanecer somente no corpo",
      bloqueia: true,
    });
  }
  if (!achadoLivre && conclusaoLivre) {
    pendencias.push({
      onde: "achados adicionais",
      valor: conclusaoLivre,
      motivo: "a conclusão adicional precisa de uma descrição correspondente no corpo",
      bloqueia: true,
    });
  }
  if (!achadoLivre && dispensaConclusao) {
    pendencias.push({
      onde: "achados adicionais",
      valor: "somente no corpo",
      motivo: "não há achado descrito para manter somente no corpo",
      bloqueia: true,
    });
  }

  /**
   * A ANATOMIA ALTERADA — descrição ao corpo, diagnóstico à conclusão.
   *
   * Os dois campos são livres e vêm por sistema. Juntam-se preservando a ordem
   * da tela, que é a ordem em que o médico examina.
   */
  const descricoes: string[] = [];
  const diagnosticos: string[] = [];
  for (const sis of SISTEMAS) {
    if (texto(an, sis) !== "alterado") continue;
    const corpo = frase(texto(an, `${sis}.alterado.corpo`));
    const diag = frase(texto(an, `${sis}.alterado.diag`));
    if (corpo) descricoes.push(corpo);
    if (diag) diagnosticos.push(diag);

    /**
     * Sistema marcado como alterado e SEM UMA PALAVRA escrita. Bloqueia: o
     * laudo sairia afirmando morfologia normal — o médico marcou uma alteração
     * e receberia de volta um exame normal.
     */
    if (!corpo && !diag) {
      pendencias.push({
        onde: `anatomia · ${sis}`,
        valor: "alterado, sem descrição nem diagnóstico",
        motivo:
          "marcar o sistema como alterado sem escrever nada faria o laudo concluir morfologia normal, negando o que foi marcado",
        bloqueia: true,
      });
    }
  }

  const fonte = texto(ig, "referencia") || "nenhuma";
  const usg = fonte === "usg";
  const dum = fonte === "dum";
  const sub = (k: string) => texto(ig, `referencia.${fonte}.${k}`);

  const genitalia = texto(an, "genitalia");
  const primeiroTrimestre =
    ((typeof opcoes.trimestre === "string" ? opcoes.trimestre : "") || "2t") === "1t";
  const terceiroTrimestre =
    ((typeof opcoes.trimestre === "string" ? opcoes.trimestre : "") || "2t") === "3t";
  const transversa = texto(f, "situacao") === "transversa";
  const bcfLido = numeroEstrito(f1, "bcf");
  const ccnLido = numeroEstrito(f1, "ccn");
  const tnLida = numeroEstrito(f1, "tn");
  const bcfPrimeiroTrimestre = typeof bcfLido === "number" ? bcfLido : null;
  const ccnPrimeiroTrimestre = typeof ccnLido === "number" ? ccnLido : null;
  const tnPrimeiroTrimestre = typeof tnLida === "number" ? tnLida : null;
  const tnClassificacao = tnPrimeiroTrimestre === null
    ? null
    : texto(f1, "tn_classificacao") === "limitrofe"
      ? "limitrofe"
      : tnPrimeiroTrimestre >= 3.5 ? "aumentada" : "normal";
  const avaliacaoPrecoceRealizada = primeiroTrimestre && texto(precoce, "realizada") === "sim";
  const medidaPrecoce = (chave: "dbp" | "cc" | "ca" | "femur") => numeroEstrito(precoce, `realizada.sim.${chave}`);
  const dbpPrecoceLido = avaliacaoPrecoceRealizada ? medidaPrecoce("dbp") : null;
  const ccPrecoceLido = avaliacaoPrecoceRealizada ? medidaPrecoce("cc") : null;
  const caPrecoceLido = avaliacaoPrecoceRealizada ? medidaPrecoce("ca") : null;
  const femurPrecoceLido = avaliacaoPrecoceRealizada ? medidaPrecoce("femur") : null;
  const estruturasPrecoces = Object.fromEntries(ESTRUTURAS_PRECOCES.map((estrutura) => {
    const valor = texto(precoce, `realizada.sim.${estrutura}`);
    return [estrutura, ["normal", "alterada", "limitada"].includes(valor) ? valor : "nao_avaliada"];
  })) as Record<(typeof ESTRUTURAS_PRECOCES)[number], "normal" | "alterada" | "limitada" | "nao_avaliada">;
  const estruturasPrecocesAlteradas = ESTRUTURAS_PRECOCES.filter((estrutura) => estruturasPrecoces[estrutura] === "alterada");
  const estruturasPrecocesLimitadas = ESTRUTURAS_PRECOCES.filter((estrutura) => estruturasPrecoces[estrutura] === "limitada");
  const anatomiaPrecoceCompleta = avaliacaoPrecoceRealizada && ESTRUTURAS_PRECOCES.every((estrutura) => estruturasPrecoces[estrutura] === "normal");
  const achadoPrecoce = texto(precoce, "realizada.sim.achado");
  const conclusaoPrecoce = frase(texto(precoce, "realizada.sim.conclusao"));
  const limitacaoPrecoce = texto(precoce, "realizada.sim.limitacao");
  const igBioSemanas = numero(ig, "bio_sem");
  const igBioDias = numero(ig, "bio_dias");
  const igCcnDias = primeiroTrimestre && ccnPrimeiroTrimestre !== null
    ? Math.round(crlToGaDays(ccnPrimeiroTrimestre))
    : null;
  const igEfetivaSemanas = igBioSemanas ?? (igCcnDias !== null ? Math.floor(igCcnDias / 7) : null);
  const igEfetivaDias = igBioSemanas !== null ? (igBioDias ?? 0) : (igCcnDias !== null ? igCcnDias % 7 : null);
  const vitalidade1t = texto(f1, "vitalidade");
  const vitalidade = primeiroTrimestre
    ? vitalidade1t === "na" || !vitalidade1t
      ? bcfPrimeiroTrimestre !== null ? "normal" : "nao_avaliada"
      : vitalidade1t
    : texto(f, "vitalidade") || "normal";
  const movimentos1t = texto(f1, "movimentos");
  const movimentos = primeiroTrimestre
    ? movimentos1t === "na" || !movimentos1t ? "nao_avaliados" : movimentos1t
    : texto(f, "movimentos") || "normais";
  const cordao = primeiroTrimestre ? "nao_avaliado" : texto(f, "cordao_vasos") || "nao_avaliado";
  const sistemasAlterados = SISTEMAS.filter((sistema) => texto(an, sistema) === "alterado");
  const liquidoAvaliacao = primeiroTrimestre
    ? texto(f1, "liquido") === "na" || !texto(f1, "liquido") ? "nao_avaliado" : texto(f1, "liquido")
    : texto(ex, "liquido_avaliacao") || "normal";
  const bcfSegundoTerceiroLido = primeiroTrimestre ? null : numeroEstrito(f, "bcf");
  const biometriaSegundoTerceiro = Object.fromEntries(CAMPOS_BIOMETRIA_SEGUNDO_TERCEIRO.map(
    ([chave, rotulo]) => [chave, { rotulo, valor: primeiroTrimestre ? null : numeroEstrito(b, chave) }],
  )) as Record<string, { rotulo: string; valor: number | null | "invalido" }>;
  const ilaSegundoTerceiroLido = primeiroTrimestre ? null : numeroEstrito(ex, "ila");

  if (primeiroTrimestre && vitalidade1t === "ausente" && bcfPrimeiroTrimestre !== null) {
    pendencias.push({ onde: "vitalidade", valor: texto(f1, "bcf"), motivo: "atividade cardíaca ausente não pode ter BCF numérico", bloqueia: true });
  }
  if (primeiroTrimestre && vitalidade1t === "ausente" && !["", "na", "ausentes"].includes(movimentos1t)) {
    pendencias.push({ onde: "movimentos", valor: movimentos1t, motivo: "movimentos presentes ou reduzidos são incompatíveis com ausência de vitalidade", bloqueia: true });
  }
  if (!primeiroTrimestre) {
    const vitalidadeSegundoTerceiro = texto(f, "vitalidade") || "normal";
    const movimentosSegundoTerceiro = texto(f, "movimentos") || "normais";
    if (bcfSegundoTerceiroLido === "invalido") pendencias.push({
      onde: "BCF",
      valor: texto(f, "bcf"),
      motivo: "informe o BCF como número positivo em bpm",
      bloqueia: true,
    });
    if (vitalidadeSegundoTerceiro === "ausente" && typeof bcfSegundoTerceiroLido === "number") pendencias.push({
      onde: "vitalidade",
      valor: texto(f, "bcf"),
      motivo: "atividade cardíaca ausente não pode ter BCF numérico",
      bloqueia: true,
    });
    if (vitalidadeSegundoTerceiro === "ausente" && !["", "ausentes"].includes(movimentosSegundoTerceiro)) pendencias.push({
      onde: "movimentos",
      valor: movimentosSegundoTerceiro,
      motivo: "movimentos ativos ou reduzidos são incompatíveis com ausência de vitalidade",
      bloqueia: true,
    });
    for (const [chave, leitura] of Object.entries(biometriaSegundoTerceiro)) {
      if (terceiroTrimestre && chave === "binocular") continue;
      if (leitura.valor === "invalido") pendencias.push({
        onde: `biometria · ${leitura.rotulo}`,
        valor: texto(b, chave),
        motivo: `informe ${leitura.rotulo} como número positivo${chave === "peso" ? " em g" : " em mm"}`,
        bloqueia: true,
      });
    }
    if (ilaSegundoTerceiroLido === "invalido") pendencias.push({
      onde: "ILA",
      valor: texto(ex, "ila"),
      motivo: "informe o ILA como número positivo em cm",
      bloqueia: true,
    });
  }
  if (primeiroTrimestre) {
    if (bcfLido === "invalido") pendencias.push({ onde: "BCF", valor: texto(f1, "bcf"), motivo: "informe o BCF como número em bpm", bloqueia: true });
    else if (bcfLido === null && vitalidade1t !== "ausente") pendencias.push({ onde: "BCF", valor: "", motivo: "informe o BCF ou marque atividade cardíaca ausente", bloqueia: true });
    if (ccnLido === "invalido") pendencias.push({ onde: "CCN", valor: texto(f1, "ccn"), motivo: "informe o CCN como número em mm", bloqueia: true });
    else if (ccnLido === null) pendencias.push({ onde: "CCN", valor: "", motivo: "informe o CCN em mm", bloqueia: true });
    else if (ccnLido < 45 || ccnLido > 84) pendencias.push({
      onde: "CCN",
      valor: `${ccnLido} mm`,
      motivo: "CCN fora da janela de 45–84 mm do rastreio combinado; não use este exame no cálculo FMF de trissomias",
      bloqueia: false,
    });
    if (tnLida === "invalido") pendencias.push({ onde: "TN", valor: texto(f1, "tn"), motivo: "informe a translucência nucal como número em mm", bloqueia: true });
    else if (tnLida === null) pendencias.push({ onde: "TN", valor: "", motivo: "informe a translucência nucal em mm", bloqueia: true });

    if (avaliacaoPrecoceRealizada) {
      for (const [rotulo, valor] of [["DBP", dbpPrecoceLido], ["CC", ccPrecoceLido], ["CA", caPrecoceLido], ["Fêmur", femurPrecoceLido]] as const) {
        if (valor === "invalido") pendencias.push({
          onde: `avaliação precoce · ${rotulo}`,
          valor: texto(precoce, `realizada.sim.${rotulo === "Fêmur" ? "femur" : rotulo.toLowerCase()}`),
          motivo: "informe a medida como número positivo em mm",
          bloqueia: true,
        });
      }
      const temMedida = [dbpPrecoceLido, ccPrecoceLido, caPrecoceLido, femurPrecoceLido].some((valor) => typeof valor === "number");
      const temEstruturaAvaliada = ESTRUTURAS_PRECOCES.some((estrutura) => estruturasPrecoces[estrutura] !== "nao_avaliada");
      if (!temMedida && !temEstruturaAvaliada) pendencias.push({
        onde: "biometria e anatomia precoce",
        valor: "incluída sem dados",
        motivo: "informe ao menos uma medida ou avalie uma estrutura, ou desative o bloco opcional",
        bloqueia: true,
      });
      if (estruturasPrecocesAlteradas.length > 0 && !achadoPrecoce) pendencias.push({
        onde: "anatomia precoce",
        valor: estruturasPrecocesAlteradas.join(", "),
        motivo: "descreva a alteração anatômica observada",
        bloqueia: true,
      });
      if (estruturasPrecocesAlteradas.length > 0 && !conclusaoPrecoce) pendencias.push({
        onde: "anatomia precoce",
        valor: estruturasPrecocesAlteradas.join(", "),
        motivo: "informe a conclusão correspondente à alteração",
        bloqueia: true,
      });
      if (estruturasPrecocesAlteradas.length === 0 && (achadoPrecoce || conclusaoPrecoce)) pendencias.push({
        onde: "anatomia precoce",
        valor: achadoPrecoce || conclusaoPrecoce,
        motivo: "há texto de alteração, mas nenhuma estrutura foi marcada como alterada",
        bloqueia: true,
      });
      if (estruturasPrecocesLimitadas.length > 0 && !limitacaoPrecoce) pendencias.push({
        onde: "anatomia precoce",
        valor: estruturasPrecocesLimitadas.join(", "),
        motivo: "informe o motivo da limitação",
        bloqueia: true,
      });
      if (estruturasPrecocesLimitadas.length === 0 && limitacaoPrecoce) pendencias.push({
        onde: "anatomia precoce",
        valor: limitacaoPrecoce,
        motivo: "há motivo de limitação, mas nenhuma estrutura foi marcada como limitada",
        bloqueia: true,
      });
    }
  }

  // Complemento de cervicometria: leitura estrita e portões (cervicometriaLeitura.ts),
  // com a mesma IG que vai ao renderer.
  const cervico = cervicometriaComplemento(secao(estado, "cervicometria"), igEfetivaSemanas);
  pendencias.push(...cervico.pendencias);
  const estadoParaDoppler = primeiroTrimestre && igBioSemanas === null && igEfetivaSemanas !== null
    ? {
        ...estado,
        ig: { ...ig, bio_sem: String(igEfetivaSemanas), bio_dias: String(igEfetivaDias ?? 0) },
      }
    : estado;

  const dados: Record<string, unknown> = {
    trimestre: (typeof opcoes.trimestre === "string" ? opcoes.trimestre : "") || "2t",
    apresentacao: transversa
      ? null
      : primeiroTrimestre ? null : texto(f, "situacao.longitudinal.apresentacao") || texto(f, "apresentacao") || "cefálica",
    dorso: texto(f, "dorso") || null,
    polo_cefalico: transversa
      ? texto(f, "situacao.transversa.polo_cefalico") || "à direita"
      : null,
    bcf_bpm: primeiroTrimestre
      ? bcfPrimeiroTrimestre
      : vitalidade === "ausente" ? null : typeof bcfSegundoTerceiroLido === "number" ? bcfSegundoTerceiroLido : null,
    vitalidade,
    movimentos_fetais: movimentos,
    cordao_vasos: cordao === "tres" || cordao === "dois" ? cordao : null,
    liquido_avaliacao:
      liquidoAvaliacao === "normal" || liquidoAvaliacao === "oligoamnio" || liquidoAvaliacao === "polidramnio" || liquidoAvaliacao === "nao_avaliado"
        ? liquidoAvaliacao
        : null,
    // No 1T, a síntese global só é autorizada quando o bloco opcional foi
    // ativado e todas as estruturas precoces foram avaliadas como normais.
    anatomia_avaliada: primeiroTrimestre ? anatomiaPrecoceCompleta : true,
    anatomia_alterada: sistemasAlterados,

    ccn_mm: primeiroTrimestre ? ccnPrimeiroTrimestre : null,
    tn_mm: primeiroTrimestre ? tnPrimeiroTrimestre : null,
    tn_classificacao: primeiroTrimestre ? tnClassificacao : null,
    anatomia_precoce: avaliacaoPrecoceRealizada ? {
      estruturas: estruturasPrecoces,
      achado: achadoPrecoce || null,
      conclusao: conclusaoPrecoce || null,
      limitacao: limitacaoPrecoce || null,
    } : null,
    osso_nasal:
      primeiroTrimestre
        ? texto(f1, "osso_nasal") === "na" || !texto(f1, "osso_nasal")
          ? "nao_avaliado"
          : texto(f1, "osso_nasal")
        : null,
    regurgitacao_tricuspide:
      primeiroTrimestre
        ? texto(f1, "tricuspide") === "na" || !texto(f1, "tricuspide")
          ? "nao_avaliado"
          : texto(f1, "tricuspide")
        : null,
    ducto_venoso:
      primeiroTrimestre
        ? texto(f1, "ducto_venoso") === "na" || !texto(f1, "ducto_venoso")
          ? "nao_avaliado"
          : texto(f1, "ducto_venoso")
        : null,
    uterina_ip_direita:
      primeiroTrimestre && texto(doppler, "realizado") === "sim"
        ? numero(doppler, "realizado.sim.ip_ut_dir")
        : null,
    uterina_ip_esquerda:
      primeiroTrimestre && texto(doppler, "realizado") === "sim"
        ? numero(doppler, "realizado.sim.ip_ut_esq")
        : null,

    dbp_mm: primeiroTrimestre ? (typeof dbpPrecoceLido === "number" ? dbpPrecoceLido : null) : typeof biometriaSegundoTerceiro.dbp?.valor === "number" ? biometriaSegundoTerceiro.dbp.valor : null,
    cc_mm: primeiroTrimestre ? (typeof ccPrecoceLido === "number" ? ccPrecoceLido : null) : typeof biometriaSegundoTerceiro.cc?.valor === "number" ? biometriaSegundoTerceiro.cc.valor : null,
    cerebelo_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.cerebelo?.valor === "number" ? biometriaSegundoTerceiro.cerebelo.valor : null,
    cisterna_magna_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.cisterna?.valor === "number" ? biometriaSegundoTerceiro.cisterna.valor : null,
    binocular_mm: primeiroTrimestre || terceiroTrimestre ? null : typeof biometriaSegundoTerceiro.binocular?.valor === "number" ? biometriaSegundoTerceiro.binocular.valor : null,
    ca_mm: primeiroTrimestre ? (typeof caPrecoceLido === "number" ? caPrecoceLido : null) : typeof biometriaSegundoTerceiro.ca?.valor === "number" ? biometriaSegundoTerceiro.ca.valor : null,
    femur_mm: primeiroTrimestre ? (typeof femurPrecoceLido === "number" ? femurPrecoceLido : null) : typeof biometriaSegundoTerceiro.femur?.valor === "number" ? biometriaSegundoTerceiro.femur.valor : null,
    tibia_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.tibia?.valor === "number" ? biometriaSegundoTerceiro.tibia.valor : null,
    fibula_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.fibula?.valor === "number" ? biometriaSegundoTerceiro.fibula.valor : null,
    umero_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.umero?.valor === "number" ? biometriaSegundoTerceiro.umero.valor : null,
    radio_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.radio?.valor === "number" ? biometriaSegundoTerceiro.radio.valor : null,
    ulna_mm: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.ulna?.valor === "number" ? biometriaSegundoTerceiro.ulna.valor : null,
    peso_g: primeiroTrimestre ? null : typeof biometriaSegundoTerceiro.peso?.valor === "number" ? biometriaSegundoTerceiro.peso.valor : null,
    peso_variacao_g: null,
    /** O percentil sai do renderer, que tem a curva. */
    percentil: crescimento ? crescimento.efwPercentile : null,

    /** `na` na tela quer dizer "não avaliada" — nulo, não uma genitália. */
    genitalia: genitalia && genitalia !== "na" ? genitalia : null,

    placenta_localizacao:
      (primeiroTrimestre ? texto(f1, "placenta_loc") : texto(ex, "placenta_loc")) || null,
    placenta_grau: texto(ex, "placenta_grau").replace(/^grau\s*/i, "") || null,
    ila_cm: primeiroTrimestre ? null : typeof ilaSegundoTerceiroLido === "number" ? ilaSegundoTerceiroLido : null,

    ig_semanas: igEfetivaSemanas,
    ig_dias: igEfetivaDias,
    dum: dum ? sub("dum_data") || null : null,
    data_exame: (usg || dum ? sub("exame_data") : "") || null,
    primeira_us_data: usg ? sub("us_data") || null : null,
    primeira_us_ig_semanas: usg ? numero(ig, "referencia.usg.us_ig_sem") : null,
    primeira_us_ig_dias: usg ? numero(ig, "referencia.usg.us_ig_dias") : null,
    ig_referencia_hoje_semanas: null,
    ig_referencia_hoje_dias: null,
    referencia_fonte: usg ? "usg_precoce" : dum ? "dum" : null,
    corrigir_ig: usg || dum ? sub("corrigir") !== "nao" : null,

    /**
     * As descrições dos sistemas vão junto do texto livre do médico, no corpo.
     * A ordem é a da tela: primeiro os sistemas, depois a observação solta.
     */
    achados_adicionais:
      [...descricoes, achadoLivre].filter(Boolean).join(" ") || null,

    /** O CANAL QUE FALTAVA. Cada diagnóstico vira um item da conclusão. */
    itens_conclusao_livres: [...diagnosticos, ...(conclusaoLivre ? [conclusaoLivre] : [])],
    cervicometria: cervico.dados,
    doppler: dopplerDaTela(estadoParaDoppler),
    crescimento_fetal: crescimento,
  };

  return { dados, alteracoes: [], pendencias };
}
