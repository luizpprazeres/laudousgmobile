/**
 * Fact-audit determinístico do PELVE writer_guarded — mesma receita do MSK/PARTES_MOLES.
 * Compara o DITADO com o LAUDO e sinaliza FATOS objetivos que faltam/sobram. Não julga
 * prosa. Falha → anexa "[REVISAR: …]" ao fim (não re-roda — mantém o TTFT).
 */
import { figoNormalizada, figosDaLocalizacao, localizacaoDaFigo, type FigoFamilia } from "@laudousg/schemes";
import { extractMeasureNumbers, numberInLaudo } from "./mskWriterAudit";

export type PelveAudit = {
  ok: boolean;
  /** Medidas ditadas (número) não encontradas no laudo. */
  missingMeasures: string[];
  /** Menopausa ditada mas laudo NÃO tem "praticamente sem folículos". */
  menopausaSemMarca: boolean;
  /** Laudo alucina "líquido livre" sem o médico ter ditado (anti-líquido-livre). */
  liquidoLivreInventado: boolean;
  /** Placeholder "____" no laudo (proibido). */
  placeholder: boolean;
  /** Categoria FIGO no laudo que não foi ditada nem sai da localização ditada pela tabela (A03, W12). */
  figoInventado: boolean;
  figosInventados: string[];
  /** Família do mioma no laudo que não foi ditada nem sai da FIGO ditada pela tabela (A03, W12). */
  tipoMiomaInventado: string[];
  /** Tipo de mioma ditado que sumiu do laudo (A03). */
  tipoMiomaOmitido: string[];
  /** Medida no laudo que não aparece no ditado (eixo ou volume preenchido pelo modelo, A02). */
  medidasNaoDitadas: string[];
  /** [REVISAR] por dado não ditado — a regra manda omitir a oração (A02). */
  revisaoPorFalta: boolean;
  /** Tipo e categoria FIGO incompatíveis na mesma linha, sem sinalização (A03; tabela do FIGO_RULES). */
  figoTipoIncompativel: string[];
};

// ── Miomas: a mesma tabela FIGO ↔ localização do prompt e do renderer (`@laudousg/schemes`) ──

/** Início de uma localização de mioma ("subseroso com mais de 50% intramural", "intramural"…). */
const RE_LOCALIZACAO = /((?:com\s+)?(?:mais|menos)\s+de\s+50\S*\s+(?:(?:por\s+cento|x\s+100)\s+)?)?(submucos\w*|subseros\w*|intramura\w*)(?:(?!\s*(?:categoria|fi[gc]o)\b)[^.;,()\n]){0,45}/gi;
/** "subseroso, com mais de 50% intramural" → sem a vírgula, para a frase não partir ao meio. */
const juntaLocalizacao = (t: string) => t.replace(/,\s+(com\s+(?:mais|menos)\s+de\s+50)/gi, " $1");
/** Categorias possíveis da frase; "intramurais e subserosos" soma as duas famílias. */
function figosDaFrase(frase: string): string[] {
  const partes = frase.split(/\s+e\s+/).map((p) => figosDaLocalizacao(p));
  return [...new Set([...figosDaLocalizacao(frase), ...partes.flat()])];
}
/** Remoção, troca ou negação logo antes da menção: não afirma o achado (revisão W13 rodada 2, R2-02). */
const RE_NAO_AFIRMA = /(remov\w*|retir\w*|\btire\b|apag\w*|exclu\w*|delet\w*|\bsem\b|n[ãa]o\s+h[áa]|aus[êe]ncia\s+de|no\s+lugar\s+d[aeo]s?)[^.;\n]{0,40}$/i;
const afirmado = (texto: string, indice: number) => !RE_NAO_AFIRMA.test(texto.slice(Math.max(0, indice - 60), indice));

const FAMILIAS_DA_FIGO = (figo: string): FigoFamilia[] => {
  const l = localizacaoDaFigo(figo);
  if (!l) return [];
  return l.familia === "hibrido" ? ["submucoso", "subseroso"] : [l.familia];
};
const familiasDe = (figos: string[]) => new Set(figos.flatMap(FAMILIAS_DA_FIGO));

/** Localizações afirmadas no texto → categorias possíveis de cada uma. `semFigoAoLado`: só as que não
 *  trazem FIGO ditada logo depois (com FIGO ditada, é ela que vale para aquele mioma). */
function localizacoes(textoOriginal: string, soAfirmadas: boolean, semFigoAoLado = false): string[][] {
  const texto = juntaLocalizacao(textoOriginal);
  return [...texto.matchAll(RE_LOCALIZACAO)]
    .filter((m) => !soAfirmadas || afirmado(texto, m.index!))
    .filter((m) => !semFigoAoLado || !/^\W{0,3}(?:categoria\W{0,5})?fi[gc]o\W{0,20}[0-8]/i.test(texto.slice(m.index! + m[0].length, m.index! + m[0].length + 40)))
    .map((m) => figosDaFrase(m[0]))
    .filter((f) => f.length > 0);
}

/** Uma categoria ou lista delas: "5", "2-5", "4 e 5", "4, 5 e 6". */
const LISTA_FIGO = "([0-8](?:\\s*-\\s*[0-8])?(?:\\s*(?:,|e)\\s*[0-8](?:\\s*-\\s*[0-8])?)*)(?!\\d)";
const daLista = (lista: string) => lista.split(/\s*(?:,|\be\b)\s*/).map((x) => figoNormalizada(x)).filter((f): f is string => !!f);

/** FIGOs afirmadas no ditado ("figo 5", "FIGO4", "categoria figo, 5", "2-5", "FIGO 4 e 5"). */
function figosDoDitado(raw: string): string[] {
  return [...raw.matchAll(new RegExp(`fi[gc]o\\W{0,20}${LISTA_FIGO}`, "gi"))]
    .filter((m) => afirmado(raw, m.index!))
    .flatMap((m) => daLista(m[1]!));
}

/** FIGOs escritas no laudo (fora da legenda). */
function figosDoLaudo(laudo: string): string[] {
  return [...laudo.matchAll(new RegExp(`FIGO\\s*${LISTA_FIGO}`, "g"))].flatMap((m) => daLista(m[1]!));
}

/** Por lesão: a localização escrita logo antes de "(categoria FIGO n)" confere com n pela tabela? */
function figoTipoConflitos(laudo: string): string[] {
  const out: string[] = [];
  for (const linha of juntaLocalizacao(laudo).split("\n")) {
    if (/\[REVISAR/.test(linha)) continue;
    let inicio = 0;
    for (const m of linha.matchAll(/\(?categoria\s*\(?\s*FIGO\s*([0-8](?:\s*-\s*[0-8])?)\)?/gi)) {
      const trecho = linha.slice(inicio, m.index!);
      inicio = m.index! + m[0].length;
      const figo = figoNormalizada(m[1]);
      const locs = [...trecho.matchAll(RE_LOCALIZACAO)];
      const loc = locs[locs.length - 1]?.[0];
      if (!figo || !loc) continue;
      const possiveis = figosDaFrase(loc);
      if (!possiveis.length || possiveis.includes(figo)) continue;
      // Híbrida 2-5 descrita pela parte submucosa ou subserosa não é conflito.
      if (figo === "2-5" && possiveis.some((p) => FAMILIAS_DA_FIGO(p).some((f) => f === "submucoso" || f === "subseroso"))) continue;
      out.push(`${loc.trim()} × FIGO ${figo}`);
    }
  }
  return out;
}

const RE_REVISAO_POR_FALTA = /\[REVISAR[^\]]*(?:n[ãa]o\s+(?:foi\s+)?(?:ditad|informad|mencionad)|ausente|faltando|n[ãa]o\s+consta)/i;

const EXTENSO: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100,
};
const RE_EXTENSO = new RegExp(`\\b(${Object.keys(EXTENSO).sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");

/** "dois centímetros" → "2 centímetros"; "vinte e cinco" → 25; "dois vírgula cinco"/"dois e meio" → 2.5 (R2-01). */
export function extensoParaDigitos(texto: string): string {
  return texto
    .replace(RE_EXTENSO, (w) => String(EXTENSO[w.toLowerCase()]))
    .replace(/\b([2-9]0) e ([1-9])\b/g, (_, d, u) => String(Number(d) + Number(u)))
    .replace(/\b(\d+)\s+(?:v[íi]rgula|ponto)\s+(\d+)\b/gi, "$1.$2")
    .replace(/\b(\d+)\s+e\s+meio\b/gi, "$1.5");
}

/** Número logo depois de uma classificação ("FIGO 4", "O-RADS 2", "categoria 3") não é medida (A02, rodada 2). */
const RE_CLASSIFICACAO_ANTES = /(?:fi[gc]o|o-?\s?rads|bi-?\s?rads|ti-?\s?rads|categoria|grau|tipo)\W{0,12}$/i;

/** Valores numéricos do ditado (com ou sem unidade, exceto classificações), em cm e na escala ×10/÷10 (mm↔cm). */
function numerosDoDitado(raw: string): Set<number> {
  const out = new Set<number>();
  const texto = extensoParaDigitos(raw);
  const medida = (m: RegExpMatchArray) => !RE_CLASSIFICACAO_ANTES.test(texto.slice(Math.max(0, m.index! - 20), m.index!));
  // O ASR às vezes separa o decimal por espaço ("volume de 8 4" = 8,4): conta as duas leituras.
  const numeros = [
    ...[...texto.matchAll(/\d+(?:[.,]\d+)?/g)].filter(medida).map((m) => m[0]),
    ...[...texto.matchAll(/\b(\d{1,3})\s+(\d)\b/g)].filter(medida).map((m) => `${m[1]}.${m[2]}`),
  ];
  for (const n of numeros) {
    const v = parseFloat(n.replace(",", "."));
    for (const x of [v, v / 10, v * 10]) out.add(Math.round(x * 1000) / 1000);
  }
  return out;
}

/** Números de VOLUME ditados sem unidade adjacente ("volume de 69,8", "volume
 *  aumentado de 189,1", "volume 54,0") — o extractMeasureNumbers (com unidade) não
 *  os pega, mas o volume é fato crítico (vai na conclusão). O "de" é OPCIONAL
 *  (review dex1: o médico dita "volume 54,0" sem "de"). */
function extractVolumeNumbers(text: string): string[] {
  const re = /volume\s+(?:normal\s+|aumentado\s+|reduzido\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]!);
  return out;
}

/** O número foi ditado em MILÍMETROS? (ex.: "12 mm" / "12 milímetros"). */
function ditadoEmMm(num: string, raw: string): boolean {
  const pat = num.replace(/[.,]/g, "[.,]");
  return new RegExp(`(?<![\\d.,])${pat}\\s*(?:mm|mil[íi]metros?)\\b`, "i").test(raw);
}

/** Forma em cm (÷10) de um número ditado em mm — "12" → "1.2" (numberInLaudo
 *  já casa vírgula/ponto). Usado p/ tolerar a conversão mm→cm do writer. */
function mmParaCm(num: string): string {
  const v = parseFloat(num.replace(",", ".")) / 10;
  return String(v);
}

const RE_MENOPAUSA = /menop[áa]usic|\bmenopausa\b|ov[áa]rios?\s+atr[óo]fic/i;
const RE_MENOPAUSA_NEG = /pr[ée]-?\s*menopausa|n[ãa]o\s+(?:est[áa]\s+)?(?:na\s+|em\s+)?menopausa/i;
const RE_LIQ_LIVRE = /l[íi]quido\s+livre/i;

export function auditPelveFacts(rawInput: string, laudo: string): PelveAudit {
  const rawLc = rawInput.toLowerCase();
  const laudoLc = laudo.toLowerCase();

  // Medidas ditadas ausentes no laudo (com unidade, via MSK) + volumes sem unidade.
  // Tolerância mm→cm (achado do smoke ampliado): quando o médico dita em mm e o
  // writer converte p/ cm (ex.: "12 mm" → "1,2 cm"), o número literal "12" não está
  // no laudo — mas a forma /10 está. Não é drop; aceita a conversão correta.
  const rawDigitos = extensoParaDigitos(rawInput);
  const ditadas = [...extractMeasureNumbers(rawDigitos), ...extractVolumeNumbers(rawDigitos)];
  const missingMeasures = [...new Set(ditadas)].filter((n) => {
    if (numberInLaudo(n, laudo)) return false;
    if (ditadoEmMm(n, rawDigitos) && numberInLaudo(mmParaCm(n), laudo)) return false;
    return true;
  });

  // Menopausa ditada → o laudo TEM que marcar "praticamente sem folículos".
  const menopausaDitada = RE_MENOPAUSA.test(rawLc) && !RE_MENOPAUSA_NEG.test(rawLc);
  const menopausaSemMarca =
    menopausaDitada && !/praticamente sem fol[íi]culos/.test(laudoLc);

  // Anti-líquido-livre: o laudo menciona "líquido livre" POSITIVAMENTE sem o médico
  // ter ditado. NÃO conta menção NEGADA ("ausência de/sem/não há líquido livre") —
  // review dex1: evita falso-positivo quando o writer escreve a negação de rotina.
  const liqLivreNoLaudo = RE_LIQ_LIVRE.test(laudoLc);
  const liqLivreNegado = /(aus[êe]ncia\s+de|sem|n[ãa]o\s+h[áa]|n[ãa]o\s+se\s+observ\w+)\s+l[íi]quido\s+livre/i.test(laudoLc);
  const liquidoLivreInventado =
    liqLivreNoLaudo && !liqLivreNegado && !RE_LIQ_LIVRE.test(rawLc);

  const placeholder = laudo.includes("____");

  // Miomas (W12): o que foi ditado — FIGO e localização — e o que a tabela deriva disso, nos dois sentidos.
  const figosDitados = figosDoDitado(rawInput);
  const locsDitadas = localizacoes(rawInput, true);
  const figosPermitidos = new Set([...figosDitados, ...localizacoes(rawInput, true, true).filter((f) => f.length === 1).flat()]);
  const familiasDitadas = new Set([...familiasDe(locsDitadas.flat()), ...familiasDe(figosDitados)]);
  const figosInventados = [...new Set(figosDoLaudo(laudo))].filter((f) => !figosPermitidos.has(f));
  const figoInventado = figosInventados.length > 0;
  // Por frase: uma localização ambígua ("com mais de 50% intramural" = 2 ou 5) só é inventada se NENHUMA
  // das famílias possíveis foi ditada; e a ditada só some se nenhuma frase do laudo a cobre.
  const locsDoLaudo = localizacoes(laudo, false);
  const familiasDoLaudo = familiasDe(locsDoLaudo.flat());
  const nomeFamilia = (figos: string[]) => [...familiasDe(figos)].filter((f) => f !== "outros").join("/");
  const tipoMiomaInventado = [...new Set(locsDoLaudo
    .filter((figos) => ![...familiasDe(figos)].some((f) => f === "outros" || familiasDitadas.has(f)))
    .map(nomeFamilia))].filter(Boolean);
  const tipoMiomaOmitido = [...new Set(locsDitadas
    .filter((figos) => ![...familiasDe(figos)].some((f) => f === "outros" || familiasDoLaudo.has(f)))
    .map(nomeFamilia))].filter(Boolean);
  const doDitado = numerosDoDitado(rawInput);
  // Grupos "A x B x C cm" inteiros (a unidade vem só no fim) + medidas soltas com unidade.
  const doLaudo = [
    ...[...laudo.matchAll(/\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)+\s*(?:cm|mm)/gi)].flatMap((m) => m[0].match(/\d+(?:[.,]\d+)?/g) ?? []),
    ...extractMeasureNumbers(laudo),
  ];
  const medidasNaoDitadas = [...new Set(doLaudo)].filter(
    (n) => !doDitado.has(Math.round(parseFloat(n.replace(",", ".")) * 1000) / 1000),
  );
  const revisaoPorFalta = RE_REVISAO_POR_FALTA.test(laudo);
  const figoTipoIncompativel = figoTipoConflitos(laudo);

  return {
    ok:
      missingMeasures.length === 0 &&
      !menopausaSemMarca &&
      !liquidoLivreInventado &&
      !placeholder &&
      !figoInventado &&
      tipoMiomaInventado.length === 0 &&
      tipoMiomaOmitido.length === 0 &&
      medidasNaoDitadas.length === 0 &&
      !revisaoPorFalta &&
      figoTipoIncompativel.length === 0,
    missingMeasures,
    menopausaSemMarca,
    liquidoLivreInventado,
    placeholder,
    figoInventado,
    figosInventados,
    tipoMiomaInventado,
    tipoMiomaOmitido,
    medidasNaoDitadas,
    revisaoPorFalta,
    figoTipoIncompativel,
  };
}

/** Nota "[REVISAR: …]" para anexar ao fim do laudo quando o audit falha. */
export function pelveRevisarNote(a: PelveAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s) no texto: ${a.missingMeasures.join(", ")}`);
  if (a.menopausaSemMarca) partes.push(`menopausa ditada mas ovários não marcados como "praticamente sem folículos"`);
  if (a.liquidoLivreInventado) partes.push(`"líquido livre" no laudo sem o médico ter ditado (confirmar se não é coleção ovariana)`);
  if (a.placeholder) partes.push(`placeholder "____" no laudo`);
  if (a.figoInventado) partes.push(`categoria FIGO não ditada: ${a.figosInventados.join(", ")}`);
  if (a.tipoMiomaInventado.length) partes.push(`tipo de mioma não ditado: ${a.tipoMiomaInventado.join(", ")}`);
  if (a.tipoMiomaOmitido.length) partes.push(`tipo de mioma ditado ausente no laudo: ${a.tipoMiomaOmitido.join(", ")}`);
  if (a.medidasNaoDitadas.length) partes.push(`medida(s) no laudo que não estão no ditado: ${a.medidasNaoDitadas.join(", ")}`);
  if (a.revisaoPorFalta) partes.push(`[REVISAR] por dado não ditado (omitir a oração)`);
  if (a.figoTipoIncompativel.length) partes.push(`tipo do mioma incompatível com a categoria FIGO: ${a.figoTipoIncompativel.join(", ")}`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
