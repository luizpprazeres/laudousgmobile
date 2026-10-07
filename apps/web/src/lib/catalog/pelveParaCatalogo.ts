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

import {
  bladderStateConflicts,
  bladderInputIssues,
  normalizeBladderState,
} from "../deterministic/organs/urinaryShared";
import { pelvePresetDe } from "../deterministic/organs/pelvePresets";
import { MyomaFindingSchema, type MyomaFinding } from "@laudousg/schemes";

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

const MYOMA_EXTRA_KEY = "__myoma.extraFindings";
const MYOMA_LOCATION_TEXT: Record<MyomaFinding["location"], string | null> = {
  not_informed: null,
  anterior: "parede anterior",
  posterior: "parede posterior",
  lateral_direita: "parede lateral direita",
  lateral_esquerda: "parede lateral esquerda",
  fundo: "região fúndica",
  cervical: "região cervical",
};

function miomasExtras(s: EstadoDaSecao): MyomaFinding[] {
  try {
    const bruto = JSON.parse(texto(s, MYOMA_EXTRA_KEY) || "[]") as unknown;
    if (!Array.isArray(bruto)) return [];
    return bruto.flatMap((item) => {
      const validado = MyomaFindingSchema.safeParse(item);
      return validado.success ? [validado.data] : [];
    }).slice(0, 17);
  } catch {
    return [];
  }
}

function descricaoLiquidoLivre(s: EstadoDaSecao): string | null {
  const localizacao = texto(s, "liquido_livre.sim.localizacao");
  const quantidade = texto(s, "liquido_livre.sim.quantidade");
  const complemento = texto(s, "liquido_livre.sim.descricao");
  const locais: Record<string, string> = {
    fundo_saco_posterior: "no fundo de saco posterior",
    fundo_saco_anterior: "no fundo de saco anterior",
  };
  const estruturada = [quantidade ? `${quantidade} quantidade` : "", locais[localizacao] ?? ""]
    .filter(Boolean)
    .join(" ");
  return [estruturada, complemento].filter(Boolean).join(", ") || null;
}

/** Vírgula decimal é parte da medida; separe diâmetros com ;, espaço ou vírgula + espaço. */
function foliculosEstritos(bruto: string): number[] | null | "invalida" {
  if (!bruto.trim()) return null;
  const lista = bruto.trim().replace(/\s*mm$/i, "").trim();
  const partes = lista.split(/\s*;\s*|,\s+|\s+/);
  if (!partes.every((p) => /^\d+(?:[.,]\d+)?$/.test(p))) return "invalida";
  const nums = partes.map((p) => Number(p.replace(",", ".")));
  return nums.every((n) => Number.isFinite(n) && n > 0) ? nums : "invalida";
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
  const brutoFoliculos = texto(s, "foliculos_mm");
  const foliculos = foliculosEstritos(brutoFoliculos);
  if (foliculos === "invalida") {
    pendencias.push({
      onde: `ovário ${lado}`, valor: brutoFoliculos, bloqueia: true,
      motivo: `folículos do ovário ${lado} ilegíveis: informe um diâmetro por folículo em mm, separado por ponto e vírgula (ex.: 8; 10; 12,5). Não use cm nem pares de eixos`,
    });
  } else if (foliculos && !visualizado) {
    pendencias.push({
      onde: `ovário ${lado}`, valor: brutoFoliculos, bloqueia: true,
      motivo: `ovário ${lado} não visualizado não pode ter folículos medidos`,
    });
  }

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
    foliculos_mm: Array.isArray(foliculos) && visualizado ? foliculos : null,
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
  const bexiga = normalizeBladderState(secao(estado, "bexiga"));

  const modo = typeof opcoes.modo_pelve === "string" ? opcoes.modo_pelve : "rotina";
  const viaInformada = typeof opcoes.via === "string" ? opcoes.via : "ta_tv";
  const via = modo === "pos_abortamento" ? "pos_abortamento" : modo === "monitorizacao_folicular" ? "tv" : viaInformada;
  const dopplerRealizado = modo === "doppler";
  const menopausa = Array.isArray(opcoes.menopausa) && opcoes.menopausa.includes("sim");
  if (modo === "monitorizacao_folicular" && ![od, oe].some((s) =>
    s.visualizado !== "nao" && Array.isArray(foliculosEstritos(texto(s, "foliculos_mm"))),
  )) {
    pendencias.push({ onde: "folículos", valor: "", motivo: "informe os diâmetros dos folículos (mm) de ao menos um ovário", bloqueia: true });
  }

  if (via !== "tv") {
    for (const motivo of [...bladderStateConflicts(bexiga), ...bladderInputIssues(secao(estado, "bexiga"))]) {
      pendencias.push({ onde: "bexiga", valor: bexiga.replecao, motivo, bloqueia: true });
    }
  }

  const uteroMedidas = medidas(texto(u, "medidas"));

  /**
   * O MIOMA individualizado. A tela guarda os subcampos achatados, com o
   * prefixo `mioma.sim.` — é a convenção do sistema genérico, não um detalhe
   * deste arquivo.
   */
  const miomasLegados = ["mioma", "mioma2", "mioma3"]
    .filter((chave) => marcado(u, chave))
    .map((chave) => ({
      classificacao: texto(u, `${chave}.sim.classificacao`) || null,
      medidas_cm: medidas(texto(u, `${chave}.sim.medidas`)),
      parede: texto(u, `${chave}.sim.parede`) || null,
      relacao: null,
      figo: texto(u, `${chave}.sim.figo`) || null,
      ecotextura: texto(u, `${chave}.sim.ecotextura`) || null,
    }));
  const miomasDinamicos = miomasExtras(u).map((mioma) => ({
    classificacao: mioma.figoConfirmed
      ? mioma.figo <= 2
        ? "submucoso"
        : mioma.figo <= 4
          ? "intramural"
          : mioma.figo <= 7
            ? "subseroso"
            : "outro"
      : null,
    medidas_cm: mioma.sizeMaxMm == null ? null : [mioma.sizeMaxMm / 10],
    parede: MYOMA_LOCATION_TEXT[mioma.location],
    relacao: null,
    figo: mioma.figoConfirmed ? String(mioma.figo) : null,
    ecotextura: mioma.echo,
  }));
  const miomas = [...miomasLegados, ...miomasDinamicos];

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
  const fraseEndometrio = menopausa ? "menopausa" : texto(e, "frase") || null;
  const motivoEndometrio = fraseEndometrio === "nao_correlacionavel"
    ? texto(e, "frase.nao_correlacionavel.motivo") || null
    : fraseEndometrio === "outro"
      ? texto(e, "frase.outro.descricao") || null
      : null;
  if (fraseEndometrio === "outro" && !motivoEndometrio) {
    pendencias.push({
      onde: "endométrio",
      valor: "outro contexto",
      motivo: "descreva o contexto clínico escolhido para a conclusão endometrial",
      bloqueia: true,
    });
  }

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
    bexiga: via === "tv" ? null : bexiga,

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
    endometrio_frase: fraseEndometrio,
    endometrio_motivo: motivoEndometrio,
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
    liquido_livre_descricao: descricaoLiquidoLivre(e),
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

// ── PÉLVICO TRANSVAGINAL ────────────────────────────────────────────────────

/** Três eixos estritos ("7,8 x 4,2 x 4,8"); qualquer sobra torna a medida inválida. */
function tresEixos(bruto: string): number[] | null | "invalida" {
  if (!bruto) return null;
  const partes = bruto.toLowerCase().replace(/\s*cm$/, "").split(/\s*[x×]\s*/);
  if (partes.length !== 3 || partes.some((p) => !/^\d+(?:[.,]\d+)?$/.test(p.trim()))) return "invalida";
  const nums = partes.map((p) => Number.parseFloat(p.trim().replace(",", ".")));
  return nums.every((n) => n > 0) ? nums : "invalida";
}

/** Achados ovarianos focais: precisam de medida para entrar no laudo. */
const ACHADOS_FOCAIS = ["cisto_simples", "cisto_complexo", "endometrioma", "funcional", "teratoma", "hidrossalpinge", "cisto_paraovariano", "lesao_solida", "outro"];

/**
 * Regras já existentes no repositório (`apps/api/src/server/pipeline/deterministicSanity/pelveFeminina.ts`),
 * que no laudo ditado só AVISAM. No formulário estruturado viram bloqueio:
 * - endométrio > 5 mm na pós-menopausa sem achado endometrial descrito;
 * - cisto/lesão anexial > 7 cm sem O-RADS.
 */
const ENDOMETRIO_MENOPAUSA_LIMITE_CM = 0.5;
const ANEXIAL_SEM_ORADS_LIMITE_CM = 7;

/**
 * Adaptador do PÉLVICO TRANSVAGINAL: o da pelve com a via fixada em `tv`, mais
 * o portão de completude. O canônico preenche medida ausente com "____" e
 * mesmo assim conclui "útero de volume normal", "endométrio de espessura
 * normal", "ovários ecograficamente normais" — o estado vazio afirmaria
 * normalidade. Aqui, sem medida, não há laudo: há a lista do que falta.
 */
export function adaptarPelveTransvaginal(
  estado: EstadoDaPelve,
  opcoes: Record<string, string | string[]>,
): Adaptacao {
  const { via: _via, ...semVia } = opcoes;
  void _via;
  const base = adaptarPelve(estado, { ...semVia, via: "tv" });
  return { ...base, pendencias: [...base.pendencias, ...pendenciasDeCompletude(estado, opcoes, true)] };
}

/**
 * Portão de completude comum às vias fixas (TV e TA). Sem medida, não há laudo.
 * `exigeEndometrio`: na TV a espessura é obrigatória; na TA, vazia vira
 * "limitado pela técnica" (o renderer tem a frase própria).
 */
function pendenciasDeCompletude(
  estado: EstadoDaPelve,
  opcoes: Record<string, string | string[]>,
  exigeEndometrio: boolean,
): Pendencia[] {
  const pendencias: Pendencia[] = [];
  const falta = (onde: string, valor: string, motivo: string) =>
    pendencias.push({ onde, valor, motivo, bloqueia: true });

  const u = secao(estado, "utero");
  const uteroMedidas = tresEixos(texto(u, "medidas"));
  if (uteroMedidas === null) falta("útero", "", "informe as três medidas do útero (L x AP x T, em cm)");
  if (uteroMedidas === "invalida") falta("útero", texto(u, "medidas"), "medidas do útero inválidas: use L x AP x T em cm");

  const e = secao(estado, "endometrio");
  const espessuraBruta = texto(e, "espessura");
  const espessura = espessuraBruta && /^\d+(?:[.,]\d+)?(?:\s*cm)?$/i.test(espessuraBruta) ? numero(espessuraBruta) : null;
  if (!espessuraBruta) {
    if (exigeEndometrio) falta("endométrio", "", "informe a espessura do endométrio (cm)");
  } else if (espessura === null || espessura <= 0) falta("endométrio", espessuraBruta, "espessura do endométrio inválida: use cm");

  const menopausa = (Array.isArray(opcoes.menopausa) && opcoes.menopausa.includes("sim")) || texto(e, "frase") === "menopausa";
  const tipoEndometrio = texto(e, "achado_tipo");
  const achadoEndometrial = Boolean(texto(e, "achado")) || (tipoEndometrio !== "" && tipoEndometrio !== "nenhum");
  if (menopausa && espessura !== null && espessura > ENDOMETRIO_MENOPAUSA_LIMITE_CM && !achadoEndometrial) {
    falta(
      "endométrio",
      espessuraBruta,
      "endométrio acima de 0,5 cm na menopausa não pode sair como espessura normal: descreva o achado endometrial ou revise a medida",
    );
  }

  for (const lado of ["direito", "esquerdo"] as const) {
    const s = secao(estado, `ovario_${lado}`);
    const onde = `ovário ${lado}`;
    const tipo = texto(s, "achado");
    const temAchado = tipo !== "" && tipo !== "nenhum";
    const medidasOvario = tresEixos(texto(s, "medidas"));
    if (s.visualizado === "nao") {
      if (medidasOvario !== null || temAchado) falta(onde, tipo, "ovário marcado como não visualizado tem medidas ou achado preenchidos");
      continue;
    }
    if (medidasOvario === null) falta(onde, "", `informe as três medidas do ovário ${lado} ou marque não visualizado`);
    if (medidasOvario === "invalida") falta(onde, texto(s, "medidas"), `medidas do ovário ${lado} inválidas: use L x AP x T em cm`);
    if (!ACHADOS_FOCAIS.includes(tipo)) continue;
    const medidasAchado = medidas(texto(s, `achado.${tipo}.medidas`));
    if (!medidasAchado) falta(onde, tipo, `informe as medidas do achado no ovário ${lado}`);
    if (tipo === "outro" && !texto(s, `achado.${tipo}.descricao`)) falta(onde, tipo, `descreva o achado "outro" no ovário ${lado}`);
    if (medidasAchado && Math.max(...medidasAchado) > ANEXIAL_SEM_ORADS_LIMITE_CM && !texto(s, `achado.${tipo}.orads`)) {
      falta(onde, tipo, `lesão anexial acima de 7 cm no ovário ${lado} exige O-RADS confirmado pelo médico`);
    }
  }

  return pendencias;
}

// ── PÉLVICO ABDOMINAL (TA isolada) ──────────────────────────────────────────

/** Repleções em que a técnica TA canônica ("bexiga repleta") seria falsa. */
const REPLECAO_INCOMPATIVEL_TA = ["pequena", "insuficiente", "vazia"];

/**
 * Adaptador do PÉLVICO ABDOMINAL: a pelve com via fixa `ta`, o portão comum e
 * duas regras da via (audits/lote3/pelvico-abdominal-2026-10-05.md):
 *  - repleção vesical é obrigatória e precisa sustentar "bexiga repleta";
 *  - endométrio sem espessura sai como LIMITADO PELA TÉCNICA (corpo e
 *    conclusão), nunca "espessura normal" — nem com menopausa marcada.
 */
export function adaptarPelveTransabdominal(
  estado: EstadoDaPelve,
  opcoes: Record<string, string | string[]>,
): Adaptacao {
  const { via: _via, ...semVia } = opcoes;
  void _via;
  const modo = typeof opcoes.modo_pelve === "string" && ["rotina", "doppler"].includes(opcoes.modo_pelve) ? opcoes.modo_pelve : "rotina";
  const base = adaptarPelve(estado, { ...semVia, modo_pelve: modo, via: "ta" });

  const replecao = texto(secao(estado, "bexiga"), "replecao");
  // Repleção vazia é "não confirmada" (pendência própria abaixo), não "opção inválida".
  const pendencias: Pendencia[] = base.pendencias.filter(
    (p) => !(replecao === "" && p.onde === "bexiga" && /repleção tem opção inválida/.test(p.motivo)),
  );
  const falta = (onde: string, valor: string, motivo: string) =>
    pendencias.push({ onde, valor, motivo, bloqueia: true });

  if (!replecao) falta("bexiga", "", "confirme a repleção vesical: a técnica transabdominal pressupõe bexiga repleta");
  else if (REPLECAO_INCOMPATIVEL_TA.includes(replecao)) {
    falta("bexiga", replecao, "repleção vesical insuficiente para a via transabdominal isolada: o laudo afirmaria bexiga repleta");
  }
  pendencias.push(...pendenciasDeCompletude(estado, opcoes, false));

  const e = secao(estado, "endometrio");
  const temAchado = Boolean(texto(e, "achado")) || !["", "nenhum"].includes(texto(e, "achado_tipo"));
  const dados = { ...base.dados };
  if (!texto(e, "espessura") && !temAchado) {
    dados.endometrio_espessura_cm = null;
    dados.endometrio_eco = null;
    dados.endometrio_frase = "ta_limitado";
  }
  return { ...base, dados, pendencias };
}

// ── ATALHOS DA PELVE (Doppler TV/TA e monitorização folicular) ───────────────

/**
 * Adaptador dos atalhos: o adaptador do card-base (TV ou TA, com o portão de
 * completude da via) com o modo fixado, mais o dado que o modo exige.
 * - Doppler: achado ovariano focal precisa da vascularização informada (o
 *   renderer só a escreve quando informada; sem ela, o "estudo com Doppler" da
 *   técnica ficaria sem resultado para o achado).
 * - Monitorização folicular: folículos medidos em ao menos um ovário; lista
 *   ilegível bloqueia em vez de ser lida pela metade.
 */
export function adaptarPelvePreset(
  estado: EstadoDaPelve,
  categoria: string,
): Adaptacao {
  const preset = pelvePresetDe(categoria);
  if (!preset) throw new Error(`${categoria} não é um atalho da pelve`);
  const opcoes: Record<string, string | string[]> = { ...(secao(estado, "__opts") as Record<string, string | string[]>), modo_pelve: preset.modo };
  if (preset.modo === "monitorizacao_folicular") delete opcoes.menopausa;
  const base = preset.via === "ta" ? adaptarPelveTransabdominal(estado, opcoes) : adaptarPelveTransvaginal(estado, opcoes);
  const pendencias: Pendencia[] = [...base.pendencias];
  const falta = (onde: string, valor: string, motivo: string) =>
    pendencias.push({ onde, valor, motivo, bloqueia: true });

  if (preset.modo === "doppler") {
    for (const lado of ["direito", "esquerdo"] as const) {
      const s = secao(estado, `ovario_${lado}`);
      const tipo = texto(s, "achado");
      if (s.visualizado === "nao" || !ACHADOS_FOCAIS.includes(tipo)) continue;
      if (!texto(s, `achado.${tipo}.vascularizacao`)) {
        falta(`ovário ${lado}`, tipo, `informe a vascularização ao Doppler do achado no ovário ${lado}`);
      }
    }
  }
  return { ...base, pendencias };
}
