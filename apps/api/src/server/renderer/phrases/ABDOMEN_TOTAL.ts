import type {
  AbdomenFinding,
  AbdomenOrganKey,
  AbdomenOrganState,
  AbdomenTotalFindings,
} from "../findingsSchemas/ABDOMEN_TOTAL";
import { ABDOMEN_ORGAN_KEYS } from "../findingsSchemas/ABDOMEN_TOTAL";

/**
 * DET-5 — Biblioteca de frases de ABDOMEN_TOTAL, transcrita das regras
 * curadas do bundle (fonte viva ~/laudousg/lib/categoryDefaults.ts via
 * knowledge_blocks). Determinística: mesmo achado → mesma frase, byte a byte.
 *
 * Cada builder recebe o estado do órgão e devolve:
 * - body: linha(s) do corpo (null = usar default do template)
 * - conclusao: itens de conclusão que o achado gera (ordem preservada)
 * - needsFreeSlot: achados tipo "outro" que precisam do LLM secundário
 */

export type OrganRender = {
  body: string | null;
  conclusao: string[];
  freeSlotFindings: AbdomenFinding[];
};

/** 2.1 → "2,1" (pt-BR, 1 casa decimal preservando inteiros ditados) */
export function formatNumberPtBr(n: number): string {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return s.replace(".", ",");
}

/** [2.1,1.8,1.6] → "2,1 x 1,8 x 1,6 cm"; null/[] → "____" */
export function formatMedidasCm(medidas: number[] | null): string {
  if (!medidas || medidas.length === 0) return "____";
  return `${medidas.map(formatNumberPtBr).join(" x ")} cm`;
}

function maiorEixoCentimetros(medidas: number[] | null): string {
  if (!medidas || medidas.length === 0) return "____";
  return `${formatNumberPtBr(Math.max(...medidas))} centímetros`;
}

const GRAU_QUANTIDADE: Record<string, string> = {
  leve: "Pequena",
  moderado: "Moderada",
  acentuado: "Grande",
};

const LADO_LABEL: Record<string, string> = {
  direita: "direito",
  esquerda: "esquerdo",
};

function rimLado(organ: AbdomenOrganKey): string {
  return organ === "rim_direito" ? "direito" : "esquerdo";
}

function localizacaoOuPlaceholder(l: string | null): string {
  return l && l.trim() !== "" ? l : "____";
}

// ---------------------------------------------------------------------------
// Builders por órgão
// ---------------------------------------------------------------------------

function renderFigado(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;

  const lines: string[] = [];
  let vasosLine = "Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.";
  let figadoLine = "Fígado de dimensões normais, contornos regulares e ecotextura homogênea";
  let figadoFechado = false;

  for (const f of state.achados) {
    if (f.tipo === "esteatose") {
      if (f.grau === "moderado" || f.grau === "acentuado") {
        figadoLine =
          "Fígado de dimensões normais, apresentando aumento difuso da ecogenicidade parenquimatosa e atenuação sonora.";
        vasosLine =
          "Os vasos intra-hepáticos e o diafragma foram visualizados parcialmente.";
        figadoFechado = true;
        out.conclusao.push(
          `Esteatose hepática, grau ${f.grau === "acentuado" ? "acentuado" : "moderado"}.`,
        );
      } else {
        figadoLine =
          "Fígado de dimensões normais, com discreto aumento da ecogenicidade parenquimatosa.";
        figadoFechado = true;
        out.conclusao.push("Esteatose hepática, grau leve.");
      }
    } else if (f.tipo === "hepatopatia_cronica") {
      figadoLine =
        "Fígado de dimensões normais, com contornos bocelados e ecotextura difusamente heterogênea.";
      vasosLine = "Os vasos intra-hepáticos apresentam calibre preservado.";
      figadoFechado = true;
      out.conclusao.push("Sinais ecográficos sugestivos de hepatopatia crônica difusa.");
    } else if (f.tipo === "cisto_simples") {
      const loc = localizacaoOuPlaceholder(f.localizacao);
      lines.push(
        `Imagem anecoica homogênea, com margem regular, medindo ${formatMedidasCm(f.medidas_cm)}, situada no ${loc}.`,
      );
      out.conclusao.push(`Cisto hepático sem septações no ${loc}.`);
    } else if (f.tipo === "outro") {
      out.freeSlotFindings.push(f);
    } else {
      out.freeSlotFindings.push(f);
    }
  }

  if (!figadoFechado) figadoLine += ".";
  out.body = [figadoLine, vasosLine, ...lines].join("\n");
  return out;
}

function mobilidadeLabel(m: AbdomenFinding["mobilidade"], plural: boolean): string {
  // Default clínico quando o médico não diz: cálculo de vesícula é móvel.
  if (m === "imovel") return plural ? "imóveis à mudança de decúbito" : "imóvel à mudança de decúbito";
  return plural ? "móveis à mudança de decúbito" : "móvel à mudança de decúbito";
}

function renderVesicula(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status === "ausente_cirurgico") {
    out.body =
      "Ausência da imagem da vesícula biliar (paciente submetida à colecistectomia).";
    // Regra curada: colecistectomia NÃO entra na conclusão.
    return out;
  }
  if (state.status !== "alterado") return out;

  const achados = state.achados.map((raw) => ({
    ...raw,
    tipo: canonicalTipo("vesicula", raw),
  }));

  // Prefixo da vesícula: topografia usual SEMPRE; parede fina por padrão,
  // espessada (com espessura) só quando o médico informa alteração da parede.
  const paredeEspessada = achados.find((f) => f.tipo === "parede_espessada");
  let prefixo: string;
  if (paredeEspessada) {
    const esp = maiorEixoCentimetros(paredeEspessada.medidas_cm).replace(
      "centímetros",
      "cm",
    );
    prefixo = `Vesícula biliar de topografia usual, com parede espessada, medindo ${esp} no seu maior diâmetro`;
    out.conclusao.push(
      "Espessamento da parede da vesícula biliar. Convém, a critério clínico, correlacionar com exames laboratoriais para investigação da possibilidade de colecistite.",
    );
  } else {
    prefixo = "Vesícula biliar de topografia usual e parede fina";
  }

  const litiases = achados.filter((f) => f.tipo === "litiase");
  for (const f of litiases) {
    const mobil = mobilidadeLabel(f.mobilidade, f.quantidade === "multiplas");
    if (f.quantidade === "multiplas") {
      // "a menor medindo X" é OPCIONAL — omite a cláusula se não há medida.
      const menor =
        f.medidas_cm && f.medidas_cm.length > 0
          ? `, a menor medindo aproximadamente ${maiorEixoCentimetros(f.medidas_cm)}`
          : "";
      out.body = `${prefixo}, apresentando múltiplas imagens hiperecoicas, ${mobil}${menor}, ocasionando sombras acústicas.`;
    } else {
      out.body = `${prefixo}, apresentando imagem hiperecoica, ${mobil}, medindo ${maiorEixoCentimetros(f.medidas_cm)} no seu maior eixo, ocasionando sombra acústica.`;
    }
    out.conclusao.push("Litíase da vesícula biliar.");
  }

  // Parede espessada sem cálculo: a frase do prefixo é o corpo.
  if (out.body === null && paredeEspessada) {
    out.body = `${prefixo}.`;
  }

  // Achados de vesícula fora do catálogo (ex: pólipo) → free-slot.
  for (const f of achados) {
    if (f.tipo !== "litiase" && f.tipo !== "parede_espessada") {
      out.freeSlotFindings.push(f);
    }
  }
  return out;
}

function renderRim(organ: AbdomenOrganKey) {
  return (state: AbdomenOrganState): OrganRender => {
    const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
    if (state.status !== "alterado") return out;
    const lado = rimLado(organ);
    const prefixo = `Rim ${lado} com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco`;

    for (const raw of state.achados) {
      const f = { ...raw, tipo: canonicalTipo(organ, raw) };
      if (f.tipo === "cisto_simples") {
        const loc = localizacaoOuPlaceholder(f.localizacao);
        const medindo =
          f.medidas_cm && f.medidas_cm.length > 0
            ? `medindo ${formatMedidasCm(f.medidas_cm)}`
            : "medindo ____";
        out.body = `${prefixo}, apresentando imagem anecoica homogênea, com margem regular, ${medindo}, situada no ${loc}.`;
        out.conclusao.push(`Cisto simples no rim ${lado}.`);
      } else if (f.tipo === "imagem_cistica_complexa") {
        const detalhe = f.descricao_livre ?? f.termo_do_medico ?? "aspecto complexo";
        const medindo =
          f.medidas_cm && f.medidas_cm.length > 0
            ? `, medindo ${formatMedidasCm(f.medidas_cm)}`
            : "";
        out.body = `${prefixo}, apresentando imagem cística com ${detalhe}${medindo}.`;
        out.conclusao.push(`Imagem cística no rim ${lado} com ${detalhe}.`);
      } else if (f.tipo === "litiase") {
        const loc = localizacaoOuPlaceholder(f.localizacao);
        out.body = `${prefixo}, apresentando imagem hiperecoica, medindo ${maiorEixoCentimetros(f.medidas_cm).replace("centímetros", "cm")} no seu maior eixo, situada em ${loc}.`;
        out.conclusao.push(`Litíase renal ${lado === "direito" ? "direita" : "esquerda"}.`);
      } else {
        out.freeSlotFindings.push(f);
      }
    }
    return out;
  };
}

/**
 * GATILHOS curados (transcritos da biblioteca, kind=regra): reclassificação
 * determinística de achados que a extração marcou como "outro" mas casam com
 * um padrão canônico — espelha os "GATILHOS DE APLICAÇÃO" do bundle.
 */
function canonicalTipo(organ: AbdomenOrganKey, f: AbdomenFinding): AbdomenFinding["tipo"] {
  if (f.tipo !== "outro" || !f.descricao_livre) return f.tipo;
  const d = f.descricao_livre.toLowerCase();
  if (
    organ === "aorta" &&
    /(hiperecoic\w+\s+aderidas?|placas?\s+de\s+aterom|aterom)/.test(d)
  ) {
    return "ateromatose";
  }
  if (
    (organ === "rim_direito" || organ === "rim_esquerdo") &&
    /hiperecoic/.test(d) &&
    // Estreito (review dex1): imagem hiperecoica renal só vira litíase com
    // sinal corroborante — termo de cálculo, sombra acústica ou topografia
    // calicial. Hiperecogenicidade inespecífica cai no free-slot (LLM), nunca
    // em diagnóstico determinístico falso.
    /(c[áa]lcul|lit[íi]ase|concre[çc]|sombra|c[áa]lice|calicial)/.test(d) &&
    !/(anecoic|cist|septa)/.test(d)
  ) {
    return "litiase";
  }
  if (organ === "vesicula" && /(parede\s+espessad|espessamento\s+(d[ao]\s+)?parede)/.test(d)) {
    return "parede_espessada";
  }
  if (
    organ === "vesicula" &&
    /hiperecoic/.test(d) &&
    /(sombra|m[óo]ve|c[áa]lcul|lit[íi]ase)/.test(d)
  ) {
    return "litiase";
  }
  if (
    (organ === "rim_direito" || organ === "rim_esquerdo") &&
    /(c[íi]stic|anecoic)/.test(d) &&
    /(calcifica|septa|irregular|s[óo]lido)/.test(d)
  ) {
    return "imagem_cistica_complexa";
  }
  return f.tipo;
}

function renderAorta(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;
  for (const raw of state.achados) {
    const f = { ...raw, tipo: canonicalTipo("aorta", raw) };
    if (f.tipo === "ateromatose") {
      out.body =
        "Aorta abdominal de calibre normal, apresentando imagens hiperecoicas aderidas às suas paredes.";
      out.conclusao.push("Placas de ateromas na aorta abdominal.");
    } else {
      out.freeSlotFindings.push(f);
    }
  }
  return out;
}

function renderBexiga(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;
  for (const f of state.achados) {
    if (f.tipo === "volume_pre_miccional") {
      const v = f.valor_ml !== null ? formatNumberPtBr(f.valor_ml) : "____";
      out.body = `Bexiga de forma, contorno e ecotextura normais. Volume pré-miccional de ${v} mL/cm³.`;
    } else {
      out.freeSlotFindings.push(f);
    }
  }
  return out;
}

function renderGenerico(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;
  out.freeSlotFindings.push(...state.achados);
  return out;
}

const GASES_LABEL: Record<AbdomenOrganKey, string> = {
  figado: "Fígado",
  veia_porta: "Veia porta",
  vesicula: "Vesícula biliar",
  vias_biliares: "Vias biliares",
  baco: "Baço",
  pancreas: "Pâncreas",
  rim_direito: "Rim direito",
  rim_esquerdo: "Rim esquerdo",
  veia_cava: "Veia cava inferior",
  aorta: "Aorta abdominal",
  bexiga: "Bexiga",
};

export function renderOrgan(
  organ: AbdomenOrganKey,
  state: AbdomenOrganState,
): OrganRender {
  if (state.status === "nao_avaliado_gases") {
    const label = GASES_LABEL[organ] ?? organ;
    return {
      body: `${label} visualizado parcialmente devido à interposição de gases intestinais.`,
      conclusao: [],
      freeSlotFindings: [],
    };
  }
  switch (organ) {
    case "figado":
      return renderFigado(state);
    case "vesicula":
      return renderVesicula(state);
    case "rim_direito":
    case "rim_esquerdo":
      return renderRim(organ)(state);
    case "aorta":
      return renderAorta(state);
    case "bexiga":
      return renderBexiga(state);
    default:
      return renderGenerico(state);
  }
}

export function renderExtraAbdominal(f: AbdomenFinding): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (f.tipo === "derrame_pleural") {
    const quantidade = GRAU_QUANTIDADE[f.grau ?? "moderado"] ?? "Moderada";
    const lateral =
      f.lateralidade === "bilateral"
        ? "bilateralmente"
        : f.lateralidade
          ? `à ${f.lateralidade}`
          : "";
    const lateralBody = lateral ? `, ${lateral}` : "";
    out.body = `${quantidade} quantidade de líquido no espaço pleural${lateralBody}.`;
    const grauLabel = f.grau ?? "moderado";
    out.conclusao.push(
      `Derrame pleural ${grauLabel}${lateral ? ` ${lateral}` : ""}.`,
    );
  } else {
    out.freeSlotFindings.push(f);
  }
  return out;
}

export const CONCLUSAO_TODOS_NORMAIS =
  "Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.";

export const CONCLUSAO_FECHAMENTO =
  "Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.";

// ===========================================================================
// ESTILO OBJETIVO — ACHADOS por órgão (ordem fixa), reusando renderOrgan
// ===========================================================================
//
// O objetivo monta o laudo PROGRAMATICAMENTE no estilo TÉCNICA/ACHADOS/IMPRESSÃO
// SEM depender do template_body (clássico). As frases CLÍNICAS por órgão são as
// MESMAS: para órgãos alterados reusa o `body` produzido por renderOrgan; para
// órgãos normais usa a frase normal abaixo (transcrita do modelo "Abdome Total"
// do nReport). A conclusão (renderOrgan.conclusao + free-slots) vira a IMPRESSÃO.

export const ABDOMEN_TECNICA_OBJETIVO =
  "Exame realizado com transdutor convexo multifrequencial.";

/** Frase NORMAL de cada órgão (modelo Abdome Total — nReport). */
const ORGAO_NORMAL_OBJETIVO: Record<AbdomenOrganKey, string> = {
  figado:
    "Fígado com forma, dimensões e contornos preservados. Parênquima hepático com ecotextura homogênea. Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.",
  veia_porta: "Veia porta pérvia, de calibre preservado.",
  vias_biliares: "Vias biliares intra e extra-hepáticas sem sinais de dilatação.",
  vesicula:
    "Vesícula biliar de topografia usual e parede fina, com conteúdo anecoico. Não há imagens sugestivas de cálculos no seu interior.",
  pancreas: "Pâncreas com morfologia e ecotextura normais.",
  baco:
    "Baço com forma, dimensões e contornos preservados. Ecotextura esplênica homogênea.",
  rim_direito:
    "Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco. Ausência de imagens sugestivas de cálculos renais e de sinais de hidronefrose.",
  rim_esquerdo:
    "Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco. Ausência de imagens sugestivas de cálculos renais e de sinais de hidronefrose.",
  veia_cava: "Veia cava inferior de calibre normal.",
  aorta: "Aorta com trajeto, calibre e contornos preservados.",
  bexiga:
    "Bexiga com adequada repleção, paredes regulares e finas. O conteúdo vesical é anecoico e homogêneo.",
};

/**
 * Linha de um órgão no ACHADOS (objetivo): se o renderOrgan produziu corpo
 * (alterado / gases / colecistectomia), usa-o; senão, a frase normal.
 * `freeBodies` são as frases de achados fora do catálogo já redigidas pelo LLM
 * secundário (renderFreeSlots), inseridas após o corpo do órgão.
 */
export function organAchadoObjetivo(
  organ: AbdomenOrganKey,
  rendered: OrganRender,
  freeBodies: string[],
): string {
  const base =
    rendered.body !== null ? rendered.body : ORGAO_NORMAL_OBJETIVO[organ];
  const extras = freeBodies.filter((s) => s.trim() !== "");
  return [base, ...extras].filter((s): s is string => !!s).join("\n");
}

/** Ordem fixa dos órgãos no ACHADOS objetivo (clínica, modelo nReport). */
export const ABDOMEN_ORGAO_ORDEM_OBJETIVO: AbdomenOrganKey[] = [
  "figado",
  "veia_porta",
  "vias_biliares",
  "vesicula",
  "pancreas",
  "baco",
  "rim_direito",
  "rim_esquerdo",
  "veia_cava",
  "aorta",
  "bexiga",
];

export type FreeSlotRenderedAbdomen = { corpo: string; conclusao: string | null };

/**
 * Monta o laudo OBJETIVO de ABDOME TOTAL (TÉCNICA/ACHADOS/IMPRESSÃO) a partir
 * dos `renderOrgan` já produzidos, dos free-slots já redigidos (por órgão e
 * extra-abdominais) e dos `renderExtraAbdominal`. Pura/determinística — o LLM já
 * rodou antes (free-slots); aqui é só montagem. Reusada pelo pipeline e testável
 * isoladamente (golden). Não toca o caminho clássico (template_body).
 */
export function assembleAbdomenObjetivo(args: {
  organRenders: Map<AbdomenOrganKey, OrganRender>;
  freeByOrgan: Map<string, FreeSlotRenderedAbdomen[]>;
  extraRenders: OrganRender[];
  allOrganKeys: readonly AbdomenOrganKey[];
}): string {
  const { organRenders, freeByOrgan, extraRenders, allOrganKeys } = args;
  const achadosLinhas: string[] = [];
  const impressaoItens: string[] = [];

  for (const organ of ABDOMEN_ORGAO_ORDEM_OBJETIVO) {
    const r = organRenders.get(organ);
    if (!r) continue;
    const free = freeByOrgan.get(organ) ?? [];
    achadosLinhas.push(organAchadoObjetivo(organ, r, free.map((x) => x.corpo)));
    impressaoItens.push(
      ...r.conclusao,
      ...free.map((x) => x.conclusao).filter((c): c is string => !!c),
    );
  }

  // Salvaguarda: órgão com achados fora da ordem fixa (não acontece nos 11 do
  // schema) — conclusão nunca se perde.
  for (const organ of allOrganKeys) {
    if (ABDOMEN_ORGAO_ORDEM_OBJETIVO.includes(organ)) continue;
    const r = organRenders.get(organ);
    if (!r) continue;
    const free = freeByOrgan.get(organ) ?? [];
    if (r.body) achadosLinhas.push(r.body);
    achadosLinhas.push(...free.map((x) => x.corpo).filter((s) => s.trim() !== ""));
    impressaoItens.push(
      ...r.conclusao,
      ...free.map((x) => x.conclusao).filter((c): c is string => !!c),
    );
  }

  // Extra-abdominais (derrame pleural etc).
  const extraFree = freeByOrgan.get("extra_abdominal") ?? [];
  for (const r of extraRenders) {
    if (r.body) achadosLinhas.push(r.body);
    impressaoItens.push(...r.conclusao);
  }
  for (const x of extraFree) {
    if (x.corpo.trim() !== "") achadosLinhas.push(x.corpo);
    if (x.conclusao) impressaoItens.push(x.conclusao);
  }

  const impressao =
    impressaoItens.length === 0
      ? "Estudo ultrassonográfico do abdome sem alterações significativas."
      : impressaoItens.length === 1
        ? (impressaoItens[0] as string)
        : impressaoItens.map((it, i) => `${i + 1}. ${it}`).join("\n");

  return [
    "ULTRASSONOGRAFIA DE ABDOME TOTAL",
    "",
    "TÉCNICA:",
    ABDOMEN_TECNICA_OBJETIVO,
    "",
    "ACHADOS:",
    achadosLinhas.join("\n"),
    "",
    "IMPRESSÃO:",
    impressao,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Entrada síncrona do Abdome Objetivo para Biblioteca e web. Reusa exatamente
 * os mesmos renderizadores de órgão e o mesmo assembler do pipeline; nesta
 * entrada não há free-slot por LLM, apenas os achados estruturados do exame.
 */
export function renderAbdomenTotalObjetivo(f: AbdomenTotalFindings): string {
  const organRenders = new Map<AbdomenOrganKey, OrganRender>();
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    organRenders.set(organ, renderOrgan(organ, f.orgaos[organ]));
  }

  return assembleAbdomenObjetivo({
    organRenders,
    freeByOrgan: new Map(),
    extraRenders: f.achados_extra_abdominais.map(renderExtraAbdominal),
    allOrganKeys: ABDOMEN_ORGAN_KEYS,
  });
}

// ---------------------------------------------------------------------------
// Montagem SÍNCRONA do clássico — o caminho da web
// ---------------------------------------------------------------------------

/**
 * O CLÁSSICO DO ABDOME, sem o slot livre — para o caminho do catálogo.
 *
 * ## Por que esta função existe
 *
 * O abdome é a única categoria cuja máscara do laudo mora no BANCO
 * (`report_template_variants.template_body`, com slots `{{orgao:figado|…}}`),
 * e não no código. O renderer não escreve o laudo: ele preenche a máscara.
 *
 * No aplicativo isso é montado dentro de `pipeline/renderer.ts`, e de lá não
 * dá para reusar: aquele caminho é `async` porque chama `renderFreeSlots`, que
 * usa LLM para transformar em prosa os achados que não cabem no catálogo
 * fechado (`tipo: "outro"`). O catálogo — que a web usa — é síncrono e puro
 * de propósito.
 *
 * ## Por que a web não precisa do slot livre
 *
 * O slot existe porque o DITADO produz o inesperado: o médico fala algo que o
 * catálogo não tem, e o LLM vira aquilo em frase de laudo. Na web ele DIGITA,
 * e o que ele digitou já é a frase. Passar isso por um LLM seria o navegador
 * ganhar um segundo autor, não-determinístico — exatamente o que a regra do
 * §3.2 impede.
 *
 * O dado sustenta: em 843 abdomes reais de 90 dias, ZERO usaram o slot livre
 * (medido em 22/08). O catálogo fechado deu conta de todos.
 *
 * Achado com `tipo: "outro"` aqui entra pelo verbatim do médico, sem polimento.
 * Se um dia a web precisar de polimento, ele NÃO deve vir para cá — o lugar
 * dele é antes, na tela, com o médico vendo o que foi reescrito.
 */
const ORGAN_SLOT_RE_SYNC = /\{\{orgao:([a-z_]+)\|([\s\S]*?)\}\}/g;

export function renderAbdomenTotalClassico(
  f: AbdomenTotalFindings,
  templateBody: string,
): string {
  /**
   * ⚠️ O `outro` NÃO PODE SUMIR.
   *
   * `renderOrgan` empurra `tipo: "outro"` para `freeSlotFindings`, esperando
   * que alguém os transforme em prosa — no app, o LLM. Aqui não há LLM, e
   * ignorá-los faria o achado que o médico escreveu desaparecer do laudo sem
   * erro nenhum: o pior modo de falhar deste sistema, e o que os gates de
   * todas as categorias perseguem.
   *
   * Então o verbatim dele entra como está. Não é polido, e é de propósito: na
   * web o médico DIGITA, e o que ele digitou já é a frase do laudo. Polir
   * seria o navegador ganhar um segundo autor.
   */
  const verbatimDoOutro = (r: OrganRender): string[] =>
    r.freeSlotFindings
      .map((x) => (x.descricao_livre ?? x.termo_do_medico ?? "").trim())
      .filter((t) => t !== "")
      .map((t) => `${t.charAt(0).toUpperCase()}${t.slice(1).replace(/\.+$/, "")}.`);

  const organRenders = new Map<AbdomenOrganKey, OrganRender>();
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    organRenders.set(organ, renderOrgan(organ, f.orgaos[organ]));
  }
  const extraRenders = f.achados_extra_abdominais.map(renderExtraAbdominal);

  /**
   * A CONCLUSÃO SEGUE A ORDEM DOS SLOTS DO TEMPLATE, não a dos órgãos no
   * schema — é a ordem em que o médico lê o corpo. Idêntico ao pipeline.
   */
  const slotOrder = [...templateBody.matchAll(ORGAN_SLOT_RE_SYNC)].map(
    (m) => m[1] as AbdomenOrganKey,
  );
  const conclusaoItens: string[] = [];
  const organFinalText = new Map<string, string>();
  for (const organKey of slotOrder) {
    const r = organRenders.get(organKey);
    if (!r) continue;
    conclusaoItens.push(...r.conclusao);
    const linhas = [r.body, ...verbatimDoOutro(r)].filter((x): x is string => !!x);
    if (linhas.length > 0) organFinalText.set(organKey, linhas.join("\n"));
  }

  /**
   * Órgão com achado e SEM slot neste template. Não acontece nos templates de
   * hoje (têm os 11), mas a conclusão nunca pode se perder por causa de uma
   * máscara editada — o corpo vai para as linhas extras.
   */
  const extraLines: string[] = [];
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    if (slotOrder.includes(organ)) continue;
    const r = organRenders.get(organ);
    if (!r) continue;
    if (r.body) extraLines.push(r.body);
    extraLines.push(...verbatimDoOutro(r));
    conclusaoItens.push(...r.conclusao);
  }
  for (const r of extraRenders) {
    if (r.body) extraLines.push(r.body);
    extraLines.push(...verbatimDoOutro(r));
    conclusaoItens.push(...r.conclusao);
  }

  const conclusao =
    conclusaoItens.length === 0
      ? CONCLUSAO_TODOS_NORMAIS
      : [...conclusaoItens, CONCLUSAO_FECHAMENTO]
          .map((item, i) => `${i + 1}. ${item}`)
          .join("\n");

  /** Passo ÚNICO: o que se insere nunca é re-escaneado. */
  const COMBINED = /\{\{orgao:([a-z_]+)\|([\s\S]*?)\}\}|\{\{extra_abdominais\}\}\n?|\{\{conclusao\}\}/g;
  const body = templateBody.replace(
    COMBINED,
    (match, organKey: string | undefined, defaultText: string | undefined) => {
      if (organKey !== undefined) return organFinalText.get(organKey) ?? defaultText ?? "";
      if (match.startsWith("{{extra_abdominais}}")) {
        return extraLines.length > 0 ? `${extraLines.join("\n")}\n` : "";
      }
      return conclusao;
    },
  );

  return body.replace(/\n+(?=CONCLUSÃO:)/g, "\n\n").trim();
}
