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

function medidasOpcionais(medidas: number[] | null, prefixo = ", medindo "): string {
  return medidas && medidas.length > 0 ? `${prefixo}${formatMedidasCm(medidas)}` : "";
}

type CanonicalAbdomenTipo =
  | AbdomenFinding["tipo"]
  | "hepatomegalia"
  | "hemangioma_hepatico"
  | "nodulo_hepatico"
  | "calcificacao_hepatica"
  | "liquido_perihepatico"
  | "veia_porta_dilatada"
  | "vesicula_contraida"
  | "vesicula_distendida"
  | "lama_biliar"
  | "polipo_vesicular"
  | "adenomiomatose"
  | "colesterolose"
  | "vesicula_porcelana"
  | "polipo_vesicular_maior_10mm"
  | "colecistite_alitiasica"
  | "colecistostomia"
  | "dilatacao_vias_intra"
  | "coledoco_dilatado"
  | "coledocolitiase"
  | "pancreas_visualizacao_prejudicada"
  | "pancreas_heterogeneo"
  | "lipomatose_pancreatica"
  | "wirsung_dilatado"
  | "cisto_pancreatico"
  | "nodulo_pancreatico"
  | "esplenomegalia"
  | "baco_heterogeneo"
  | "cisto_esplenico"
  | "calcificacao_esplenica"
  | "baco_acessorio";

// ---------------------------------------------------------------------------
// Builders por órgão
// ---------------------------------------------------------------------------

function renderFigado(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;

  const lines: string[] = [];
  let vasosLine = "Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.";
  let dimensoes = "dimensões normais";
  let parenquima = "contornos regulares e ecotextura homogênea";

  for (const raw of state.achados) {
    const f = { ...raw, tipo: canonicalTipo("figado", raw) };
    if (f.tipo === "hepatomegalia") {
      const [loboDireito, loboEsquerdo] = f.medidas_cm ?? [];
      const medidas = [
        loboDireito !== undefined ? `lobo direito com diâmetro longitudinal de ${formatNumberPtBr(loboDireito)} cm` : "",
        loboEsquerdo !== undefined ? `lobo esquerdo com diâmetro longitudinal de ${formatNumberPtBr(loboEsquerdo)} cm` : "",
      ].filter(Boolean);
      const descricaoMedidas = f.localizacao?.trim() || medidas.join(" e ");
      dimensoes = `dimensões aumentadas${descricaoMedidas ? ` (${descricaoMedidas})` : ""}`;
      out.conclusao.push("Hepatomegalia.");
    } else if (f.tipo === "esteatose") {
      if (f.grau === "moderado" || f.grau === "acentuado") {
        parenquima = "aumento difuso da ecogenicidade parenquimatosa e atenuação sonora";
        vasosLine =
          "Os vasos intra-hepáticos e o diafragma foram visualizados parcialmente.";
        out.conclusao.push(
          `Esteatose hepática, grau ${f.grau === "acentuado" ? "acentuado" : "moderado"}.`,
        );
      } else {
        parenquima = "discreto aumento da ecogenicidade parenquimatosa";
        out.conclusao.push("Esteatose hepática, grau leve.");
      }
    } else if (f.tipo === "hepatopatia_cronica") {
      parenquima = "contornos bocelados e ecotextura difusamente heterogênea";
      vasosLine = "Os vasos intra-hepáticos apresentam calibre preservado.";
      out.conclusao.push("Sinais ecográficos sugestivos de hepatopatia crônica difusa.");
    } else if (f.tipo === "cisto_simples") {
      const loc = f.localizacao?.trim() || "parênquima hepático";
      lines.push(
        `Imagem anecoica homogênea, com margem regular${medidasOpcionais(f.medidas_cm)}, situada no ${loc}.`,
      );
      out.conclusao.push(
        f.quantidade === "multiplas"
          ? "Cistos hepáticos simples."
          : `Cisto hepático sem septações no ${loc}.`,
      );
    } else if (f.tipo === "hemangioma_hepatico") {
      const loc = f.localizacao?.trim() || "parênquima hepático";
      lines.push(`Imagem nodular hiperecogênica, homogênea e de contornos bem definidos${medidasOpcionais(f.medidas_cm)}, situada no ${loc}, sugestiva de hemangioma.`);
      out.conclusao.push("Imagem hepática sugestiva de hemangioma.");
    } else if (f.tipo === "nodulo_hepatico") {
      const loc = f.localizacao?.trim() || "parênquima hepático";
      lines.push(`Imagem nodular sólida${medidasOpcionais(f.medidas_cm)}, situada no ${loc}, de natureza indeterminada ao método.`);
      out.conclusao.push("Nódulo hepático a esclarecer. Convém, a critério clínico, complementar a investigação com método contrastado.");
    } else if (f.tipo === "calcificacao_hepatica") {
      lines.push("Foco hiperecogênico com sombra acústica posterior, compatível com calcificação residual.");
      out.conclusao.push("Calcificação hepática residual.");
    } else if (f.tipo === "liquido_perihepatico") {
      lines.push("Observa-se lâmina líquida peri-hepática.");
      out.conclusao.push("Líquido livre peri-hepático.");
    } else {
      out.freeSlotFindings.push(raw);
    }
  }

  const figadoLine = `Fígado de ${dimensoes}, com ${parenquima}.`;
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
  const contraida = achados.some((f) => f.tipo === "vesicula_contraida");
  const distendida = achados.some((f) => f.tipo === "vesicula_distendida");
  let prefixo: string;
  if (paredeEspessada) {
    const esp = medidasOpcionais(paredeEspessada.medidas_cm, ", medindo ");
    prefixo = `Vesícula biliar de topografia usual, com parede espessada${esp}`;
    const suspeitaAguda = /agud|inflamat/i.test(paredeEspessada.termo_do_medico ?? "");
    out.conclusao.push(
      suspeitaAguda
        ? "Espessamento da parede da vesícula biliar, a correlacionar com os demais critérios clínicos e laboratoriais de colecistite aguda."
        : "Espessamento da parede da vesícula biliar.",
    );
  } else if (contraida) {
    prefixo = "Vesícula biliar contraída, com avaliação do conteúdo parcialmente prejudicada";
    out.conclusao.push("Vesícula biliar contraída, com avaliação do conteúdo parcialmente prejudicada.");
  } else if (distendida) {
    prefixo = "Vesícula biliar distendida, de paredes finas";
    out.conclusao.push("Distensão da vesícula biliar.");
  } else {
    prefixo = "Vesícula biliar de topografia usual e parede fina";
  }

  const litiases = achados.filter((f) => f.tipo === "litiase");
  for (const f of litiases) {
    const mobil = mobilidadeLabel(f.mobilidade, f.quantidade === "multiplas");
    if (f.quantidade === "multiplas") {
      const maior =
        f.medidas_cm && f.medidas_cm.length > 0
          ? `, a maior medindo aproximadamente ${maiorEixoCentimetros(f.medidas_cm)}`
          : "";
      out.body = `${prefixo}, apresentando múltiplas imagens hiperecoicas, ${mobil}${maior}, ocasionando sombras acústicas.`;
    } else {
      const medida = f.medidas_cm && f.medidas_cm.length > 0 ? `, medindo ${maiorEixoCentimetros(f.medidas_cm)} no maior eixo` : "";
      out.body = `${prefixo}, apresentando imagem hiperecoica, ${mobil}${medida}, ocasionando sombra acústica.`;
    }
    out.conclusao.push("Litíase da vesícula biliar.");
  }

  const adicionais: string[] = [];
  for (const f of achados) {
    if (f.tipo === "lama_biliar") {
      adicionais.push("Conteúdo ecogênico móvel, sem sombra acústica, compatível com lama biliar.");
      out.conclusao.push("Lama biliar.");
    } else if (f.tipo === "polipo_vesicular") {
      adicionais.push(`Imagem polipoide aderida à parede, sem mobilidade ou sombra acústica${medidasOpcionais(f.medidas_cm)}.`);
      out.conclusao.push("Pólipo da vesícula biliar.");
    } else if (f.tipo === "adenomiomatose") {
      adicionais.push("Espessamento parietal focal com pequenas imagens císticas intramurais e artefatos em cauda de cometa, compatível com adenomiomatose.");
      out.conclusao.push("Adenomiomatose da vesícula biliar.");
    } else if (f.tipo === "colesterolose") {
      adicionais.push("Pequenos focos ecogênicos parietais aderidos, sem sombra acústica, compatíveis com colesterolose.");
      out.conclusao.push("Colesterolose da vesícula biliar.");
    } else if (f.tipo === "vesicula_porcelana") {
      adicionais.push("Parede difusamente calcificada, com sombra acústica posterior, compatível com vesícula em porcelana.");
      out.conclusao.push("Vesícula em porcelana.");
    } else if (f.tipo === "polipo_vesicular_maior_10mm") {
      adicionais.push("Imagem polipoide séssil maior que 10 mm, aderida à parede e sem sombra acústica.");
      out.conclusao.push("Pólipo da vesícula biliar maior que 10 mm. Convém avaliação especializada.");
    } else if (f.tipo === "colecistite_alitiasica") {
      adicionais.push("Vesícula biliar distendida, com espessamento parietal e sem cálculos identificáveis.");
      out.conclusao.push("Achados que podem corresponder a colecistite alitiásica no contexto clínico apropriado.");
    } else if (f.tipo === "colecistostomia") {
      adicionais.push("Dreno de colecistostomia em posição no interior da vesícula biliar.");
      out.conclusao.push("Colecistostomia em posição.");
    }
  }

  if (adicionais.length > 0) {
    out.body = [out.body ?? `${prefixo}.`, ...adicionais].join("\n");
  }

  // Alteração de estado/parede sem conteúdo adicional: o prefixo é o corpo.
  if (out.body === null && (paredeEspessada || contraida || distendida)) {
    out.body = `${prefixo}.`;
  }

  // Achados de vesícula fora do catálogo (ex: pólipo) → free-slot.
  const consumidos = new Set<CanonicalAbdomenTipo>([
    "litiase", "parede_espessada", "vesicula_contraida", "vesicula_distendida",
    "lama_biliar", "polipo_vesicular", "adenomiomatose", "colesterolose",
    "vesicula_porcelana", "polipo_vesicular_maior_10mm", "colecistite_alitiasica", "colecistostomia",
  ]);
  for (const raw of state.achados) {
    if (!consumidos.has(canonicalTipo("vesicula", raw))) {
      out.freeSlotFindings.push(raw);
    }
  }
  return out;
}

function renderVeiaPorta(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;

  for (const raw of state.achados) {
    const f = { ...raw, tipo: canonicalTipo("veia_porta", raw) };
    if (f.tipo === "veia_porta_dilatada") {
      out.body = `Veia porta pérvia, de calibre aumentado${medidasOpcionais(f.medidas_cm)}.`;
      out.conclusao.push("Veia porta de calibre aumentado.");
    } else {
      out.freeSlotFindings.push(raw);
    }
  }
  return out;
}

function renderViasBiliares(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;

  const linhas: string[] = [];
  for (const raw of state.achados) {
    const f = { ...raw, tipo: canonicalTipo("vias_biliares", raw) };
    if (f.tipo === "dilatacao_vias_intra") {
      linhas.push("Vias biliares intra-hepáticas dilatadas.");
      out.conclusao.push("Dilatação das vias biliares intra-hepáticas.");
    } else if (f.tipo === "coledoco_dilatado") {
      linhas.push(`Canal colédoco de calibre aumentado${medidasOpcionais(f.medidas_cm)}.`);
      out.conclusao.push("Dilatação do canal colédoco.");
    } else if (f.tipo === "coledocolitiase") {
      linhas.push(`Imagem hiperecogênica com sombra acústica posterior no interior do canal colédoco${medidasOpcionais(f.medidas_cm)}.`);
      out.conclusao.push("Coledocolitíase.");
    } else {
      out.freeSlotFindings.push(raw);
    }
  }

  if (linhas.length > 0) out.body = linhas.join("\n");
  return out;
}

function renderPancreas(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;

  let visualizacaoPrejudicada = false;
  let parenquima = "Pâncreas de dimensões e ecotextura normais";
  let wirsung = "Ducto pancreático principal de calibre normal.";
  const lesoes: string[] = [];

  for (const raw of state.achados) {
    const f = { ...raw, tipo: canonicalTipo("pancreas", raw) };
    if (f.tipo === "pancreas_visualizacao_prejudicada") {
      visualizacaoPrejudicada = true;
      out.conclusao.push("Avaliação pancreática parcialmente prejudicada pela interposição gasosa.");
    } else if (f.tipo === "pancreas_heterogeneo") {
      parenquima = "Pâncreas de dimensões normais e ecotextura heterogênea";
      out.conclusao.push("Ecotextura pancreática heterogênea, achado inespecífico.");
    } else if (f.tipo === "lipomatose_pancreatica") {
      parenquima = "Pâncreas de dimensões normais, com aumento difuso da ecogenicidade parenquimatosa";
      out.conclusao.push("Lipomatose pancreática.");
    } else if (f.tipo === "wirsung_dilatado") {
      wirsung = "Ducto pancreático principal ectasiado.";
      out.conclusao.push("Dilatação do ducto pancreático principal, a esclarecer.");
    } else if (f.tipo === "cisto_pancreatico") {
      lesoes.push(`Imagem cística pancreática${medidasOpcionais(f.medidas_cm)}.`);
      out.conclusao.push("Cisto pancreático. Convém, a critério clínico, complementar a avaliação com método de imagem contrastado.");
    } else if (f.tipo === "nodulo_pancreatico") {
      lesoes.push(`Imagem nodular sólida pancreática${medidasOpcionais(f.medidas_cm)}, de natureza indeterminada ao método.`);
      out.conclusao.push("Nódulo pancreático a esclarecer. Convém, a critério clínico, complementar a investigação com método de imagem contrastado.");
    } else {
      out.freeSlotFindings.push(raw);
    }
  }

  if (visualizacaoPrejudicada) {
    parenquima = parenquima.includes("normais")
      ? "Pâncreas com avaliação parcialmente prejudicada pela interposição gasosa, sem alterações evidentes nas porções visibilizadas"
      : `${parenquima}, com avaliação parcialmente prejudicada pela interposição gasosa`;
  }
  out.body = [`${parenquima}.`, ...lesoes, wirsung].join("\n");
  return out;
}

function renderBaco(state: AbdomenOrganState): OrganRender {
  const out: OrganRender = { body: null, conclusao: [], freeSlotFindings: [] };
  if (state.status !== "alterado") return out;

  let dimensoes = "dimensões normais";
  let ecotextura = "ecotextura homogênea";
  const lesoes: string[] = [];

  for (const raw of state.achados) {
    const f = { ...raw, tipo: canonicalTipo("baco", raw) };
    if (f.tipo === "esplenomegalia") {
      const [maior, menor] = f.medidas_cm ?? [];
      const medidas = [
        maior !== undefined ? `maior eixo medindo ${formatNumberPtBr(maior)} cm` : "",
        menor !== undefined ? `menor eixo medindo ${formatNumberPtBr(menor)} cm` : "",
      ].filter(Boolean);
      const descricaoMedidas = f.localizacao?.trim() || medidas.join(" e ");
      dimensoes = `dimensões aumentadas${descricaoMedidas ? `, com ${descricaoMedidas}` : ""}`;
      out.conclusao.push("Esplenomegalia.");
    } else if (f.tipo === "baco_heterogeneo") {
      ecotextura = "ecotextura heterogênea";
      out.conclusao.push("Ecotextura esplênica heterogênea, achado inespecífico.");
    } else if (f.tipo === "cisto_esplenico") {
      lesoes.push(`Imagem anecoica, de paredes finas e com reforço acústico posterior${medidasOpcionais(f.medidas_cm)}, compatível com cisto simples.`);
      out.conclusao.push("Cisto esplênico simples.");
    } else if (f.tipo === "calcificacao_esplenica") {
      lesoes.push("Foco hiperecogênico com sombra acústica posterior, compatível com calcificação residual.");
      out.conclusao.push("Calcificação esplênica residual.");
    } else if (f.tipo === "baco_acessorio") {
      lesoes.push("Imagem nodular homogênea junto ao hilo esplênico, com ecotextura semelhante à do baço, compatível com baço acessório.");
      out.conclusao.push("Baço acessório.");
    } else {
      out.freeSlotFindings.push(raw);
    }
  }

  out.body = [`Baço de ${dimensoes} e ${ecotextura}.`, ...lesoes].join("\n");
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
        out.freeSlotFindings.push(raw);
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
function canonicalTipo(organ: AbdomenOrganKey, f: AbdomenFinding): CanonicalAbdomenTipo {
  if (f.tipo !== "outro") return f.tipo;
  const d = `${f.termo_do_medico ?? ""} ${f.descricao_livre ?? ""}`.toLowerCase();
  if (!d.trim()) return f.tipo;
  if (organ === "figado" && /hepatomegal|f[íi]gado\s+(aumentad|de\s+dimens[õo]es\s+aumentadas)/.test(d)) return "hepatomegalia";
  if (organ === "figado" && /hemangioma/.test(d)) return "hemangioma_hepatico";
  if (organ === "figado" && /n[óo]dulo\s+hep[áa]tic|nodular\s+hep[áa]tic/.test(d)) return "nodulo_hepatico";
  if (organ === "figado" && /calcifica/.test(d)) return "calcificacao_hepatica";
  if (organ === "figado" && /l[íi]quido\s+peri[- ]?hep[áa]tic|l[âa]mina\s+l[íi]quida\s+peri[- ]?hep/.test(d)) return "liquido_perihepatico";
  if (organ === "veia_porta" && /(porta|veia\s+porta).*(dilatad|calibre\s+aumentad)/.test(d)) return "veia_porta_dilatada";
  if (organ === "vesicula" && /contra[íi]da/.test(d)) return "vesicula_contraida";
  if (organ === "vesicula" && /distendid/.test(d) && !/colecistite\s+alit/.test(d)) return "vesicula_distendida";
  if (organ === "vesicula" && /lama\s+biliar|barro\s+biliar/.test(d)) return "lama_biliar";
  if (organ === "vesicula" && /adenomiomatose/.test(d)) return "adenomiomatose";
  if (organ === "vesicula" && /colesterolose/.test(d)) return "colesterolose";
  if (organ === "vesicula" && /porcelana/.test(d)) return "vesicula_porcelana";
  if (organ === "vesicula" && /p[óo]lipo/.test(d) && /(maior\s+que\s+10|>\s*10)/.test(d)) return "polipo_vesicular_maior_10mm";
  if (organ === "vesicula" && /p[óo]lipo/.test(d)) return "polipo_vesicular";
  if (organ === "vesicula" && /colecistite\s+alit/.test(d)) return "colecistite_alitiasica";
  if (organ === "vesicula" && /colecistostomia/.test(d)) return "colecistostomia";
  if (organ === "vias_biliares" && /coledocolit/.test(d)) return "coledocolitiase";
  if (organ === "vias_biliares" && /(col[ée]doco|canal\s+col[ée]doco).*(dilatad|ectasiad|calibre\s+aumentad)/.test(d)) return "coledoco_dilatado";
  if (organ === "vias_biliares" && /vias\s+biliares\s+intra[- ]?hep[áa]ticas.*dilatad/.test(d)) return "dilatacao_vias_intra";
  if (organ === "pancreas" && /visualiza|avalia[çc][ãa]o/.test(d) && /prejudicad/.test(d)) return "pancreas_visualizacao_prejudicada";
  if (organ === "pancreas" && /heterog[eê]n/.test(d)) return "pancreas_heterogeneo";
  if (organ === "pancreas" && /lipomatose|esteatose\s+pancre[áa]tic|ecogenicidade\s+pancre[áa]tica/.test(d)) return "lipomatose_pancreatica";
  if (organ === "pancreas" && /(wirsung|ducto\s+pancre[áa]tico).*(dilatad|ectasiad)/.test(d)) return "wirsung_dilatado";
  if (organ === "pancreas" && /cist.*pancre[áa]tic|pancre[áa]tic.*cist/.test(d)) return "cisto_pancreatico";
  if (organ === "pancreas" && /n[óo]dulo.*pancre[áa]tic|nodular.*pancre[áa]tic/.test(d)) return "nodulo_pancreatico";
  if (organ === "baco" && /esplenomegal|ba[çc]o.*dimens[õo]es\s+aumentad/.test(d)) return "esplenomegalia";
  if (organ === "baco" && /heterog[eê]n/.test(d)) return "baco_heterogeneo";
  if (organ === "baco" && /cist.*espl[eê]nic|espl[eê]nic.*cist/.test(d)) return "cisto_esplenico";
  if (organ === "baco" && /calcifica/.test(d)) return "calcificacao_esplenica";
  if (organ === "baco" && /ba[çc]o\s+acess[óo]rio/.test(d)) return "baco_acessorio";
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
      out.freeSlotFindings.push(raw);
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
    case "veia_porta":
      return renderVeiaPorta(state);
    case "vesicula":
      return renderVesicula(state);
    case "vias_biliares":
      return renderViasBiliares(state);
    case "pancreas":
      return renderPancreas(state);
    case "baco":
      return renderBaco(state);
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
