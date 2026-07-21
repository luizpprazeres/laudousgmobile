import type {
  VenosoMMIIFindings,
  SegmentoVenoso,
  LadoVenoso,
  SegmentoVenosoFinding,
} from "./findings";

/**
 * Ponte determinística: achados estruturados (DOPPLER_VENOSO_MMII) → `MapaVenoso`,
 * o modelo que o motor de composição do ESQUEMA VISUAL (cartografia venosa)
 * consome para colorir/marcar o desenho.
 *
 * ESCOPO (decisão Luiz 08/07): determinístico é SÓ o DESENHO. O TEXTO do laudo
 * segue no writer, sem mudança. Esta função NÃO gera texto de laudo — só o mapa.
 *
 * Independente de como o desenho é renderizado depois (SVG server-side, recolor
 * de foto, ou client) — este é o modelo intermediário estável.
 */

export type EstadoSegmento =
  | "normal"
  | "refluxo"
  | "trombose_oclusiva"
  | "trombose_parcial"
  | "recanalizada"
  | "varicosidade";

export type LesaoDesenho = {
  lado: LadoVenoso;
  segmento: SegmentoVenoso;
  estado: EstadoSegmento;
  label: string; // título do callout (ex.: "Refluxo em safena magna")
  sub: string; // subtítulo (ex.: "3,1 s")
};

export type PerfuranteDesenho = {
  lado: LadoVenoso;
  topografia: "coxa" | "joelho" | "perna_medial" | "panturrilha";
  incompetente: boolean;
  label: string;
  sub: string;
};

export type LadoDesenho = {
  avaliado: boolean;
  /** Estado por segmento (só os alterados; ausência = normal). */
  segmentos: Partial<Record<SegmentoVenoso, EstadoSegmento>>;
};

/**
 * Anotação manuscrita (C5/D3): medida curta ao lado do vaso (cm/mm/profundidade).
 * `segmento` posiciona na célula/vaso (magna→medial, parva→posterior); `topografia`
 * (perfurante) posiciona por nível aproximado. Só entra quando há número claro.
 */
export type VenousAnnotation = {
  lado: LadoVenoso;
  tipo: "calibre" | "perfurante" | "refluxo";
  texto: string; // ex.: "5,8 mm" · "Ø 3,3 mm"
  segmento?: SegmentoVenoso;
  topografia?: PerfuranteDesenho["topografia"];
};

export type MapaVenoso = {
  lados: { direito: LadoDesenho; esquerdo: LadoDesenho };
  lesoes: LesaoDesenho[];
  perfurantes: PerfuranteDesenho[];
  tvp_presente: boolean;
  // Anotações manuscritas (C5). Opcional/aditivo: clientes antigos ignoram.
  anotacoes?: VenousAnnotation[];
};

/** Nome de exibição por segmento (pt-BR) para os rótulos do desenho. */
export const NOME_SEGMENTO: Record<SegmentoVenoso, string> = {
  femoral_comum: "Veia femoral comum",
  femoral: "Veia femoral",
  femoral_profunda: "Veia femoral profunda",
  poplitea: "Veia poplítea",
  tibial_posterior: "Veias tibiais posteriores",
  tibial_anterior: "Veias tibiais anteriores",
  fibular: "Veias fibulares",
  gastrocnemias: "Veias gastrocnêmias",
  soleares: "Veias soleares",
  safena_magna: "Safena magna",
  safena_parva: "Safena parva",
  safena_acessoria_anterior: "Safena acessória anterior",
  giacomini: "Veia de Giacomini",
  jsf: "Junção safeno-femoral",
  jsp: "Junção safeno-poplítea",
};

const TOPO_LABEL: Record<PerfuranteDesenho["topografia"], string> = {
  coxa: "coxa",
  joelho: "joelho",
  perna_medial: "perna medial",
  panturrilha: "panturrilha",
};

function fmt(n: number): string {
  return String(n).replace(".", ",");
}

/** Mapeia um achado de segmento para (estado, rótulo, subtítulo) do desenho. */
function mapSegmento(f: SegmentoVenosoFinding): {
  estado: EstadoSegmento;
  label: string;
  sub: string;
} | null {
  const nome = NOME_SEGMENTO[f.segmento];
  switch (f.tipo) {
    case "refluxo":
      return {
        estado: "refluxo",
        label: `Refluxo em ${nome.toLowerCase()}`,
        sub:
          f.refluxo_tempo_s != null
            ? `${fmt(f.refluxo_tempo_s)} s`
            : "refluxo patológico",
      };
    case "trombose": {
      const parcial = f.trombose_extensao === "parcial";
      const idade = f.trombose_idade ? ` · ${f.trombose_idade}` : "";
      return {
        estado: parcial ? "trombose_parcial" : "trombose_oclusiva",
        label: parcial ? "Trombose parcial" : "TVP oclusiva",
        sub: `${nome.toLowerCase()}${idade}`,
      };
    }
    case "recanalizacao":
      return { estado: "recanalizada", label: "Recanalização", sub: nome.toLowerCase() };
    case "varicosidade":
      return { estado: "varicosidade", label: "Varicosidade", sub: nome.toLowerCase() };
    case "outro":
      return f.descricao_livre
        ? { estado: "varicosidade", label: nome, sub: f.descricao_livre }
        : null;
    default:
      return null;
  }
}

/** Achados estruturados → MapaVenoso (determinístico, sem LLM). */
export function buildMapaVenoso(findings: VenosoMMIIFindings): MapaVenoso {
  const lados: MapaVenoso["lados"] = {
    direito: { avaliado: findings.lados.direito.avaliado, segmentos: {} },
    esquerdo: { avaliado: findings.lados.esquerdo.avaliado, segmentos: {} },
  };
  const lesoes: LesaoDesenho[] = [];
  const perfurantes: PerfuranteDesenho[] = [];
  const anotacoes: VenousAnnotation[] = [];
  // Segmentos com coords na arte de 4 vistas → anotar calibre ao lado do vaso.
  const SEG_ANOTAVEL = new Set<SegmentoVenoso>(["safena_magna", "safena_parva"]);

  (["direito", "esquerdo"] as const).forEach((lado) => {
    const leg = findings.lados[lado];
    for (const f of leg.segmentos) {
      // Anotação manuscrita de calibre (C5): só das safenas desenhadas, quando ditado.
      if (f.calibre_mm != null && SEG_ANOTAVEL.has(f.segmento)) {
        anotacoes.push({
          lado,
          tipo: "calibre",
          texto: `${fmt(f.calibre_mm)} mm`,
          segmento: f.segmento,
        });
      }
      const m = mapSegmento(f);
      if (!m) continue;
      // Estado por segmento (o mais grave vence se repetir — trombose > refluxo).
      const prev = lados[lado].segmentos[f.segmento];
      if (!prev || gravidade(m.estado) > gravidade(prev)) {
        lados[lado].segmentos[f.segmento] = m.estado;
      }
      lesoes.push({ lado, segmento: f.segmento, estado: m.estado, label: m.label, sub: m.sub });
    }
    for (const p of leg.perfurantes) {
      if (p.competente) continue; // só desenha perfurante incompetente
      const detalhes = [
        p.diametro_mm != null ? `Ø ${fmt(p.diametro_mm)} mm` : null,
        p.refluxo_tempo_s != null ? `refluxo ${fmt(p.refluxo_tempo_s)} s` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      perfurantes.push({
        lado,
        topografia: p.topografia,
        incompetente: true,
        label: `Perfurante de ${TOPO_LABEL[p.topografia]} incompetente`,
        sub: detalhes,
      });
      // Anotação manuscrita da perfurante (C5): Ø ao lado, por topografia.
      if (p.diametro_mm != null) {
        anotacoes.push({
          lado,
          tipo: "perfurante",
          texto: `Ø ${fmt(p.diametro_mm)} mm`,
          topografia: p.topografia,
        });
      }
    }
  });

  return { lados, lesoes, perfurantes, tvp_presente: findings.tvp_presente, anotacoes };
}

/** Ordem de gravidade p/ resolver segmento com múltiplos achados. */
function gravidade(e: EstadoSegmento): number {
  switch (e) {
    case "trombose_oclusiva":
      return 5;
    case "trombose_parcial":
      return 4;
    case "recanalizada":
      return 3;
    case "refluxo":
      return 2;
    case "varicosidade":
      return 1;
    default:
      return 0;
  }
}
