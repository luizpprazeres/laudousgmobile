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

type EstadoDaSecao = Record<string, unknown>;
export type EstadoMorfologico = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean };

/** Os quatro sistemas da tela, na ordem em que ela os apresenta. */
const SISTEMAS = ["snc", "face", "coracao", "visceras"] as const;

function secao(estado: EstadoMorfologico, id: string): EstadoDaSecao {
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

function cervicometriaDaTela(estado: EstadoMorfologico): Record<string, unknown> | null {
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
  const doppler = secao(estado, "doppler");
  const an = secao(estado, "anatomia");
  const b = secao(estado, "biometria");
  const ex = secao(estado, "extrafetal");
  const ac = secao(estado, "achados");

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

  const dados: Record<string, unknown> = {
    trimestre: (typeof opcoes.trimestre === "string" ? opcoes.trimestre : "") || "2t",
    apresentacao: texto(f, "apresentacao") || null,
    dorso: texto(f, "dorso") || null,
    bcf_bpm: primeiroTrimestre ? numero(f1, "bcf") : numero(f, "bcf"),

    ccn_mm: primeiroTrimestre ? numero(f1, "ccn") : null,
    tn_mm: primeiroTrimestre ? numero(f1, "tn") : null,
    osso_nasal:
      primeiroTrimestre && texto(f1, "osso_nasal") !== "na"
        ? texto(f1, "osso_nasal") || null
        : null,
    ducto_venoso:
      primeiroTrimestre && texto(f1, "ducto_venoso") !== "na"
        ? texto(f1, "ducto_venoso") || null
        : null,
    uterina_ip_direita:
      primeiroTrimestre && texto(doppler, "realizado") === "sim"
        ? numero(doppler, "realizado.sim.ip_ut_dir")
        : null,
    uterina_ip_esquerda:
      primeiroTrimestre && texto(doppler, "realizado") === "sim"
        ? numero(doppler, "realizado.sim.ip_ut_esq")
        : null,

    dbp_mm: numero(b, "dbp"),
    cc_mm: numero(b, "cc"),
    cerebelo_mm: numero(b, "cerebelo"),
    cisterna_magna_mm: numero(b, "cisterna"),
    binocular_mm: numero(b, "binocular"),
    ca_mm: numero(b, "ca"),
    femur_mm: numero(b, "femur"),
    tibia_mm: numero(b, "tibia"),
    fibula_mm: numero(b, "fibula"),
    umero_mm: numero(b, "umero"),
    radio_mm: numero(b, "radio"),
    ulna_mm: numero(b, "ulna"),
    peso_g: numero(b, "peso"),
    peso_variacao_g: null,
    /** O percentil sai do renderer, que tem a curva. */
    percentil: null,

    /** `na` na tela quer dizer "não avaliada" — nulo, não uma genitália. */
    genitalia: genitalia && genitalia !== "na" ? genitalia : null,

    placenta_localizacao:
      (primeiroTrimestre ? texto(f1, "placenta_loc") : texto(ex, "placenta_loc")) || null,
    placenta_grau: texto(ex, "placenta_grau").replace(/^grau\s*/i, "") || null,
    ila_cm: numero(ex, "ila"),

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
    corrigir_ig: usg || dum ? sub("corrigir") !== "nao" : null,

    /**
     * As descrições dos sistemas vão junto do texto livre do médico, no corpo.
     * A ordem é a da tela: primeiro os sistemas, depois a observação solta.
     */
    achados_adicionais:
      [...descricoes, texto(ac, "texto")].filter(Boolean).join(" ") || null,

    /** O CANAL QUE FALTAVA. Cada diagnóstico vira um item da conclusão. */
    itens_conclusao_livres: diagnosticos,
    cervicometria: cervicometriaDaTela(estado),
    doppler: dopplerDaTela(estado),
  };

  return { dados, alteracoes: [], pendencias };
}
