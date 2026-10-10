/**
 * Mioma: categoria FIGO ↔ localização, nos dois sentidos (W12). Fonte única do texto que vai ao laudo:
 * o renderer canônico (web), o formulário da web e o prompt do writer da pelve (mobile) leem daqui.
 *
 * Textos: FIGO 3, 4, 5 e 6 seguem os laudos finais assinados (90–180 dias: "intramural em contato com a
 * mucosa", "intramural", "subseroso com mais de 50% intramural", "subseroso com menos de 50% intramural");
 * os demais seguem a tabela PALM-COEIN do pedido do Luiz. TEXTOS PROVISÓRIOS até a confirmação dele
 * (status W12) — mudar aqui muda as três superfícies juntas.
 *
 * Regras de derivação (do que o médico informa):
 * - só a categoria → a localização sai da tabela;
 * - só a localização → a categoria sai da tabela quando a localização é unívoca ("intramural" = 4);
 *   família genérica ("subseroso", "submucoso") só restringe as categorias possíveis;
 * - as duas → conferidas; incompatíveis não são corrigidas em silêncio (quem decide é o médico);
 * - nenhuma → nada é inferido.
 */

export type FigoFamilia = "submucoso" | "intramural" | "subseroso" | "outros" | "hibrido";

export type FigoLocalizacao = {
  /** Categoria como vai ao laudo: "0"…"8" ou "2-5" (híbrida). */
  figo: string;
  familia: FigoFamilia;
  /** Texto após "nódulo miomatoso" no laudo (singular). */
  texto: string;
  /** Texto após "nódulos miomatosos" (plural). */
  plural: string;
};

export const FIGO_LOCALIZACOES: readonly FigoLocalizacao[] = [
  { figo: "0", familia: "submucoso", texto: "submucoso pediculado intracavitário", plural: "submucosos pediculados intracavitários" },
  { figo: "1", familia: "submucoso", texto: "submucoso com menos de 50% intramural", plural: "submucosos com menos de 50% intramural" },
  { figo: "2", familia: "submucoso", texto: "submucoso com mais de 50% intramural", plural: "submucosos com mais de 50% intramural" },
  { figo: "3", familia: "intramural", texto: "intramural em contato com a mucosa", plural: "intramurais em contato com a mucosa" },
  { figo: "4", familia: "intramural", texto: "intramural", plural: "intramurais" },
  { figo: "5", familia: "subseroso", texto: "subseroso com mais de 50% intramural", plural: "subserosos com mais de 50% intramural" },
  { figo: "6", familia: "subseroso", texto: "subseroso com menos de 50% intramural", plural: "subserosos com menos de 50% intramural" },
  { figo: "7", familia: "subseroso", texto: "subseroso pediculado", plural: "subserosos pediculados" },
  { figo: "8", familia: "outros", texto: "de localização atípica", plural: "de localização atípica" },
  { figo: "2-5", familia: "hibrido", texto: "submucoso e subseroso, estendendo-se da mucosa à serosa", plural: "submucosos e subserosos, estendendo-se da mucosa à serosa" },
];

/** Famílias genéricas: a localização não basta para a categoria, só restringe. */
export const FIGO_FAMILIAS_GENERICAS: Readonly<Record<string, readonly string[]>> = {
  submucoso: ["0", "1", "2"],
  subseroso: ["5", "6", "7"],
};

const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** "4", "FIGO 4", "categoria figo, 5", "2-5", "2 5", "II" → categoria da tabela; senão null. */
export function figoNormalizada(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const s = sem(valor).replace(/categoria|figo|[(),:]/g, " ").trim();
  const hib = s.match(/^([0-8])\s*(?:-|a|e|\s)\s*([0-8])$/);
  if (hib) return `${hib[1]}-${hib[2]}` === "2-5" ? "2-5" : null;
  const m = s.match(/^([0-8])$/);
  return m ? m[1]! : null;
}

export function localizacaoDaFigo(figo: string | null | undefined): FigoLocalizacao | null {
  const f = figoNormalizada(figo);
  return f ? FIGO_LOCALIZACOES.find((l) => l.figo === f) ?? null : null;
}

/**
 * Localização informada (texto livre ou valor do formulário) → categorias possíveis.
 * Unívoca → uma categoria; família genérica → as da família; não reconhecida → [].
 */
export function figosDaLocalizacao(localizacao: string | null | undefined): string[] {
  if (!localizacao) return [];
  const s = sem(localizacao);
  const exata = FIGO_LOCALIZACOES.find((l) => sem(l.texto) === s);
  if (exata) return [exata.figo];
  const pediculado = /pediculad/.test(s);
  const mais = /mais de 50|50 ?% ou mais|>= ?50|≥ ?50/.test(s);
  const menos = /menos de 50|< ?50/.test(s);
  if (/submucos/.test(s) && /subseros/.test(s)) return ["2-5"];
  if (/submucos/.test(s)) return pediculado ? ["0"] : menos ? ["1"] : mais ? ["2"] : [...FIGO_FAMILIAS_GENERICAS.submucoso!];
  if (/subseros/.test(s)) return pediculado ? ["7"] : menos ? ["6"] : mais ? ["5"] : [...FIGO_FAMILIAS_GENERICAS.subseroso!];
  if (/intramura/.test(s)) return /contato|mucosa|endometri|cavidade/.test(s) ? ["3"] : ["4"];
  if (/atipic|cervical|colo|ligamento largo|parasit/.test(s)) return ["8"];
  return [];
}

export type MiomaClassificado = {
  /** Texto após "nódulo miomatoso" (vazio se nada informado). */
  texto: string;
  plural: string;
  /** Categoria a imprimir (null se não informada nem derivável). */
  figo: string | null;
  /** Localização e categoria informadas e incompatíveis (não corrigido). */
  conflito: boolean;
};

/** Junta o que o médico informou (localização e/ou FIGO) nos dois sentidos, sem inferir o que falta. */
export function classificarMioma(localizacao: string | null | undefined, figo: string | null | undefined): MiomaClassificado {
  const loc = (localizacao ?? "").trim();
  const daFigo = localizacaoDaFigo(figo);
  const possiveis = figosDaLocalizacao(loc);
  if (daFigo) {
    if (!loc) return { texto: daFigo.texto, plural: daFigo.plural, figo: daFigo.figo, conflito: false };
    if (possiveis.length && !possiveis.includes(daFigo.figo)) {
      return { texto: loc, plural: loc, figo: daFigo.figo, conflito: true };
    }
    // Compatível: a localização da tabela é a mais completa (ex.: "subseroso" + 6 → "…com menos de 50% intramural").
    return { texto: daFigo.texto, plural: daFigo.plural, figo: daFigo.figo, conflito: false };
  }
  if (possiveis.length === 1) {
    const l = FIGO_LOCALIZACOES.find((x) => x.figo === possiveis[0])!;
    return { texto: l.texto, plural: l.plural, figo: l.figo, conflito: false };
  }
  return { texto: loc, plural: pluralLivre(loc), figo: null, conflito: false };
}

function pluralLivre(loc: string): string {
  const s = sem(loc);
  if (s === "submucoso") return "submucosos";
  if (s === "subseroso") return "subserosos";
  return loc;
}

/** Tabela compacta para prompt (uma linha por categoria). */
export function tabelaFigoParaPrompt(): string {
  return FIGO_LOCALIZACOES.map((l) => `${l.figo} = ${l.texto}`).join("; ");
}
