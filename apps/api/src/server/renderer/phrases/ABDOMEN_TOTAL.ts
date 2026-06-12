import type {
  AbdomenFinding,
  AbdomenOrganKey,
  AbdomenOrganState,
} from "../findingsSchemas/ABDOMEN_TOTAL";

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
