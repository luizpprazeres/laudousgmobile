/**
 * Guard determinístico de PESO FETAL (percentil) na conclusão obstétrica.
 *
 * BUG (2026-06-04): o writer (LLM) descarta o item de conclusão do peso fetal
 * mesmo quando o structurer captura o percentil (<P10 / P.I.G., <P3, >P95).
 * É clinicamente grave (flag de restrição de crescimento / G.I.G. sumindo).
 * Reforço de prompt não vence → determinístico.
 *
 * Regras de segurança clínica:
 *  - percentil isolado NÃO define estágio de Gratacós;
 *  - o estágio só é preservado quando foi explicitamente informado pelo médico;
 *  - percentil < 3: item abaixo do P3, sem inferir automaticamente restrição/estágio;
 *  - percentil >= 3 e < 10: item P.I.G. — ou restrição sem estágio quando o médico
 *    mencionar "restrição do crescimento"/"RCIU" sem informar o estágio.
 *  - percentil > 95: 1 item G.I.G.
 *  - percentil 10..95: NENHUM item adicional.
 *  - Posição: APÓS o item de líquido amniótico.
 */
import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

export interface PesoFetalData {
  abaixoP3?: boolean;
  abaixoP10?: boolean;
  acimaP95?: boolean;
  restricao?: boolean;
  gratacosEstagio?: 1 | 2 | 3 | 4;
}

const ITEM_P3 = "O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional.";
const ITEM_P10_PIG =
  "O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.). Convém, a critério clínico, acompanhamento seriado com Doppler colorido.";
const ITEM_P10_RESTR =
  "O peso fetal encontra-se abaixo do percentil 10 para a idade gestacional.";
const ITEM_RESTRICAO = "Sinais de restrição do crescimento fetal.";
const ITEM_P95_GIG =
  "O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.).";

/** Já existe um item de peso fetal na conclusão? (pra não duplicar). */
const PESO_ITEM_RE = /peso\s+fetal\s+encontra-se|p\.?i\.?g\b|g\.?i\.?g\b|gratac[óo]s/i;

/** Extrai a classificação do peso fetal a partir do input bruto. */
export function extractPesoFetal(rawInput: string): PesoFetalData {
  const t = rawInput.toLowerCase();
  const d: PesoFetalData = {};

  // Trecho que menciona PESO, SEM cruzar outra biometria/vaso (F1 review dex1):
  // "peso 1800g, DBP percentil 8" → o chunk para antes de "DBP", então o
  // percentil do DBP não vira P.I.G. indevido.
  const pesoScope =
    t.match(
      /peso(?:(?!dbp|\bca\b|\bcc\b|\bcf\b|f[êe]mur|t[íi]bia|[úu]mero|biparietal|circunfer[êe]ncia|umbilical|cerebral|uterina|ducto)[^.]){0,60}/i,
    )?.[0] ?? "";

  // "abaixo/menor que [percentil] N" → LIMIAR (peso está ABAIXO de N).
  const belowM =
    pesoScope.match(/(?:abaixo\s+d[eo]|menor\s+que|<)\s*(?:percentil\s+)?(\d{1,3})/i);
  const below = belowM?.[1] ? parseInt(belowM[1], 10) : undefined;
  // "acima/maior que [percentil] N" → LIMIAR (peso ACIMA de N).
  const aboveM =
    pesoScope.match(/(?:acima\s+d[eo]|maior\s+que|>)\s*(?:percentil\s+)?(\d{1,3})/i);
  const above = aboveM?.[1] ? parseInt(aboveM[1], 10) : undefined;
  // "percentil N" puro (valor real do peso), só se NÃO houver limiar.
  const plain =
    below === undefined && above === undefined
      ? (() => {
          const m = pesoScope.match(/percentil\s+(?:de\s+)?(\d{1,3})/i);
          return m?.[1] ? parseInt(m[1], 10) : undefined;
        })()
      : undefined;

  const pig = /\bp\.?i\.?g\b|pequeno\s+para\s+a\s+idade/i.test(t);
  const gig = /\bg\.?i\.?g\b|grande\s+para\s+a\s+idade/i.test(t);

  // Limiar "abaixo de N": N<=3 → P3; N<=10 → P10.
  if (below !== undefined) {
    if (below <= 3) d.abaixoP3 = true;
    else if (below <= 10) d.abaixoP10 = true;
  }
  // Limiar "acima de N": N>=95 → P95.
  if (above !== undefined && above >= 95) d.acimaP95 = true;
  // Valor real do percentil.
  if (plain !== undefined) {
    if (plain < 3) d.abaixoP3 = true;
    else if (plain < 10) d.abaixoP10 = true;
    else if (plain > 95) d.acimaP95 = true;
  }
  if (pig && !d.abaixoP3) d.abaixoP10 = true;
  if (gig) d.acimaP95 = true;

  d.restricao =
    /restri[çc][ãa]o\s+do?\s+crescimento|\brciu\b|\bciur\b/i.test(t);

  const gratacosDepois = t.match(
    /gratac[óo]s.{0,24}?est[áa]gio\s*(i{1,3}|iv|[1-4])\b/i,
  );
  const gratacosAntes = t.match(
    /est[áa]gio\s*(i{1,3}|iv|[1-4])\b.{0,24}?gratac[óo]s/i,
  );
  const gratacosToken = gratacosDepois?.[1] ?? gratacosAntes?.[1];
  if (gratacosToken) {
    const token = gratacosToken.toLowerCase();
    const stage = token === "i" ? 1 : token === "ii" ? 2 : token === "iii" ? 3 : token === "iv" ? 4 : Number(token);
    if (stage >= 1 && stage <= 4) {
      d.gratacosEstagio = stage as 1 | 2 | 3 | 4;
      d.restricao = true;
    }
  }

  return d;
}

/** Itens de conclusão do peso fetal (0, 1 ou 2 itens). */
export function buildPesoFetalItems(d: PesoFetalData): string[] {
  const restricaoItem = d.gratacosEstagio
    ? `Sinais de restrição do crescimento fetal, estágio ${["", "I", "II", "III", "IV"][d.gratacosEstagio]} de Gratacós.`
    : ITEM_RESTRICAO;

  if (d.abaixoP3) return d.restricao ? [ITEM_P3, restricaoItem] : [ITEM_P3];
  if (d.abaixoP10) {
    return d.restricao ? [ITEM_P10_RESTR, restricaoItem] : [ITEM_P10_PIG];
  }
  if (d.acimaP95) return [ITEM_P95_GIG];
  return [];
}

/**
 * Garante o(s) item(ns) de peso fetal na conclusão, APÓS o líquido (ou após a
 * IG se não houver líquido). No-op se não há classificação relevante OU se a
 * conclusão já tem item de peso (não duplica).
 */
export function ensurePesoFetalConclusion(
  laudo: string,
  rawInput: string,
): string {
  const data = extractPesoFetal(rawInput);
  const items = buildPesoFetalItems(data);

  const parsed = parseConclusion(laudo);
  if (!parsed.found) return laudo;

  // O writer legado podia concluir Gratacós I apenas pelo percentil. Remove essa
  // inferência quando o médico não informou estágio e corrige para o estágio ditado.
  const semInferencia = parsed.items.flatMap((item) => {
    if (!/gratac[óo]s/i.test(item)) return [item];
    if (!data.gratacosEstagio) return [];
    const romano = ["", "I", "II", "III", "IV"][data.gratacosEstagio];
    return [`Sinais de restrição do crescimento fetal, estágio ${romano} de Gratacós.`];
  });

  if (items.length === 0) {
    return semInferencia.length === parsed.items.length
      ? laudo
      : renderWithConclusion(parsed, semInferencia);
  }
  if (semInferencia.some((it) => PESO_ITEM_RE.test(it))) {
    return semInferencia.length === parsed.items.length
      ? laudo
      : renderWithConclusion(parsed, semInferencia);
  }

  // Posição: após o líquido; senão após a IG; senão no início.
  const liqIdx = semInferencia.findIndex((it) =>
    /Líquido amniótico/i.test(it),
  );
  const igIdx = semInferencia.findIndex((it) =>
    /Gesta[çc][ãa]o em torno de/i.test(it),
  );
  const at = (liqIdx !== -1 ? liqIdx : igIdx) + 1;

  const merged = [...semInferencia];
  merged.splice(at, 0, ...items);
  return renderWithConclusion(parsed, merged);
}
