/**
 * Guard determinístico de VOLUME.
 *
 * Regra do dono (2026-06-04): o PADRÃO é NUNCA calcular volume. O sistema só
 * deve calcular quando o médico PEDIR explicitamente. Hoje o writer (LLM)
 * auto-calcula sem ser pedido (ex.: inventa "volume de 57,9 cm³" na pelve) —
 * comportamento indesejado. Reforço de prompt não vence → determinístico.
 *
 * Decisão do Luiz de 10/10/2026 (rodada 2, "calcule o volume"): com o pedido, o volume
 * da estrutura com 3 eixos ditados é C x L x AP x 0,52 (elipsoide), com uma casa
 * decimal; volume DITADO nunca é recalculado; na tireoide o total é a soma de todos
 * (ditados + calculados). A conta é do código: nos ditados reais o LLM errou o fator
 * (útero 47,0 em vez de 46,6; próstata com 0,55).
 *
 * Comportamento:
 *  1. Médico PEDIU cálculo ("calcule o volume", "me dá o volume", ...):
 *     cada volume escrito logo após as 3 medidas da estrutura ("medindo A x B x C cm
 *     (volume de V cm³)") é recalculado, salvo o volume que o médico ditou. O mesmo
 *     valor repetido em outra linha (conclusão) acompanha; o total da tireoide é a soma
 *     dos lobos e do istmo. Volume que não dá para ligar a 3 eixos fica como está.
 *  2. Médico NÃO pediu E NÃO mencionou volume no input:
 *     remove qualquer volume que o LLM inventou → vira placeholder "____"
 *     (coerente com a filosofia de placeholders intencionais).
 *  3. Médico mencionou "volume" no input mas não pediu cálculo:
 *     deixa como está (ele está ditando os volumes; não mexer).
 *
 * Writers dedicados (pelve, MSK, partes moles, Doppler) usam só o item 1
 * (`{ soPedido: true }`): o prompt deles já proíbe volume não ditado.
 */

const FACTOR = 0.52; // elipsóide padrão (x·y·z·0,52)

const num = (s: string): number => parseFloat(s.replace(",", "."));
/** Uma casa decimal sempre ("6,0"), como os volumes dos lobos. */
const fmt = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
const mesmoValor = (a: number, b: number): boolean => Math.abs(a - b) < 0.05;

/** "não calcule o volume", "sem calcular o volume": não é pedido. */
const NEGADO_RE = /\b(?:n[ãa]o|sem)\s+(?:precisa\s+)?calcul\w*[^.]{0,25}/gi;
const PEDIDO_RE =
  /calcul\w*[^.]{0,20}volum|volum[^.]{0,20}calcul|c[áa]lculo\s+d[oa]s?\s+volum|me\s+d[êéáe][^.]{0,12}volum|qual[^.]{0,15}volum/i;

/** O médico pediu explicitamente o cálculo do volume? */
export function requestedVolumeCalc(rawInput: string): boolean {
  return PEDIDO_RE.test(rawInput.replace(NEGADO_RE, " "));
}

/** Números que o médico ditou como volume ("volume de 103.7", "com volume de, 6 ml"). */
function volumesDitados(rawInput: string): number[] {
  const out: number[] = [];
  for (const m of rawInput.matchAll(/volum\w*\D{0,40}?(\d+(?:[.,]\d+)?)/gi)) out.push(num(m[1] as string));
  return out;
}

const N = String.raw`\d+(?:[.,]\d+)?`;
const UNIT = String.raw`\s*(?:cm³|cm3|ml|mL|cc)`;
const TRIPLE = String.raw`(${N})\s*(?:x|×|por)\s*(${N})\s*(?:x|×|por)\s*(${N})\s*cm`;
// Volume logo depois das 3 medidas, na mesma frase. Grupos: 1-3 eixos; 4 tudo até o
// valor; 5 valor ou slot; 6 unidade.
const INLINE_RE = new RegExp(
  String.raw`${TRIPLE}((?:[^.\n]{0,40}?\bvolume\s+(?:aproximado\s+|estimado\s+)?(?:de|em)\s+)|\s*\(\s*)(${N}|_+)(${UNIT})`,
  "gi",
);
// Outros volumes com número ou slot: "(volume de 6,2 ml)", "volume normal (57,9 cm³)".
const OUTRO_RE = new RegExp(
  String.raw`(\(\s*volume\s+(?:aproximado\s+|estimado\s+)?de\s+|volume[^.()\n]{0,30}\(\s*)(${N}|_+)(${UNIT})`,
  "gi",
);

// Slots de volume com NÚMERO (pra zerar no modo padrão). Duas formas:
//  a) "(volume de 6,2 ml)"        — parêntese antes de "volume"
//  b) "volume normal (57,9 cm³)"  — parêntese depois de "volume"
const STRIP_A = /(\(\s*volume\s+de\s+)([\d.,]+)(\s*(?:ml|cm³|cc))/gi;
const STRIP_B = /(volume[^.()]{0,25}\(\s*)([\d.,]+)(\s*(?:ml|cm³|cc)\s*\))/gi;

/** Estrutura de que a linha fala: "Útero", "Lobo direito", "Ovário esquerdo". */
function sujeito(linha: string): string {
  const m = linha
    .replace(/^\s*(?:\d+[.)]\s*)/, "")
    .match(/^\s*([\p{L}]+)(?:\s+(direit[oa]|esquerd[oa]))?/u);
  const s = m ? `${m[1]}${m[2] ? ` ${m[2]}` : ""}` : "";
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

type Calculado = { sujeito: string; valor: number; antes: number | null };

function calcularPedido(laudo: string, rawInput: string): string {
  const ditados = volumesDitados(rawInput);
  const foiDitado = (v: number) => ditados.some((d) => mesmoValor(d, v));
  const linhas = laudo.split("\n");
  const feitos: Calculado[] = [];
  const tocado = new Set<number>(); // linhas cujo volume já está ligado aos eixos

  // 1) Volume logo após as 3 medidas.
  const passo1 = linhas.map((linha, i) =>
    linha.replace(INLINE_RE, (m, a: string, b: string, c: string, pre: string, slot: string, unit: string) => {
      tocado.add(i);
      const antes = /^_+$/.test(slot) ? null : num(slot);
      if (antes !== null && foiDitado(antes)) {
        feitos.push({ sujeito: sujeito(linha), valor: antes, antes });
        return m;
      }
      const v = num(a) * num(b) * num(c) * FACTOR;
      if (!Number.isFinite(v) || v <= 0) return m;
      feitos.push({ sujeito: sujeito(linha), valor: Math.round(v * 10) / 10, antes });
      return m.slice(0, m.length - slot.length - unit.length) + fmt(v) + unit;
    }),
  );

  // Estrutura com uma só medida em 3 eixos no corpo e sem volume ao lado
  // ("Útero em retroversão, medindo 5,9 x 4,0 x 3,8 cm.").
  const eixos = new Map<string, number>();
  const umTriplo = new RegExp(TRIPLE, "gi");
  for (const linha of passo1) {
    const ms = [...linha.matchAll(umTriplo)];
    const s = sujeito(linha);
    if (ms.length === 1 && s && !eixos.has(s)) {
      const [, a, b, c] = ms[0] as RegExpMatchArray;
      eixos.set(s, Math.round(num(a as string) * num(b as string) * num(c as string) * FACTOR * 10) / 10);
    }
  }

  // 2) Demais volumes (conclusão, total da tireoide).
  const tireoide = feitos.filter((f) => /^(?:lobo|istmo)/.test(f.sujeito));
  return passo1
    .map((linha, i) => {
      if (tocado.has(i)) return linha;
      return linha.replace(OUTRO_RE, (m, pre: string, slot: string, unit: string) => {
        const antes = /^_+$/.test(slot) ? null : num(slot);
        if (antes !== null && foiDitado(antes)) return m;
        const s = sujeito(linha);
        let novo: number | undefined;
        if (s === "tireoide" && tireoide.length >= 2) {
          novo = tireoide.reduce((t, f) => t + f.valor, 0);
        } else {
          novo =
            (antes !== null ? feitos.find((f) => f.antes !== null && mesmoValor(f.antes, antes)) : undefined)?.valor ??
            feitos.find((f) => f.sujeito !== "" && f.sujeito === s)?.valor ??
            eixos.get(s);
        }
        return novo === undefined ? m : `${pre}${fmt(novo)}${unit}`;
      });
    })
    .join("\n");
}

/**
 * Aplica a política de volume sobre o laudo final, a partir do input bruto.
 */
export function applyVolumePolicy(
  laudo: string,
  rawInput: string,
  opts: { soPedido?: boolean } = {},
): string {
  // 1. Pediu cálculo → a conta é do código (0,52, uma casa), volume ditado fica.
  if (requestedVolumeCalc(rawInput)) return calcularPedido(laudo, rawInput);

  if (opts.soPedido) return laudo;

  // 3. Mencionou "volume" sem pedir cálculo → está ditando; não mexe.
  if (/volume/i.test(rawInput)) return laudo;

  // 2. Padrão (não pediu, não ditou) → NUNCA calcular: zera volumes inventados.
  return laudo
    .replace(STRIP_A, (_m, pre: string, _n: string, unit: string) => `${pre}____${unit}`)
    .replace(STRIP_B, (_m, pre: string, _n: string, post: string) => `${pre}____${post}`);
}
