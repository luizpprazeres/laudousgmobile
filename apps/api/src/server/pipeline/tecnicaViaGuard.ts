/**
 * Guard determinístico de TÉCNICA / VIA DO EXAME — transversal a todas as
 * categorias (pelve, obstétrico, morfológico, Doppler).
 *
 * PROBLEMA (Luiz, 2026-08-14): o bloco COMENTÁRIOS/TÉCNICA afirma COMO o exame
 * foi feito, mas hoje é texto FIXO por categoria — então pode afirmar uma
 * técnica que não foi realizada:
 *
 *   - OBSTETRICA/MORFOLOGICO/DOPPLER não têm campo de via; o preâmbulo diz
 *     "abrangendo todo o abdome da gestante" SEMPRE. Gestação inicial avaliada
 *     por via transvaginal sai com técnica errada.
 *   - PELVE_FEMININA assume "ta_tv" quando a via não é detectada
 *     (PELVE_FEMININA.ts:446) — afirma a via MAIS COMPLETA sem saber.
 *
 * Afirmar técnica não realizada é falha de veracidade do documento, não
 * detalhe de redação.
 *
 * ESCOPO DESTA VERSÃO: só-sinaliza. Anexa "[REVISAR: …]" quando o ditado
 * CONTRADIZ a técnica afirmada. Não reescreve — reescrever exige conhecer a
 * redação de cada categoria; detectar a contradição não exige. Mesmo padrão do
 * guard de BI-RADS (MAMARIA.ts), que também só sinaliza.
 *
 * NÃO sinaliza ausência: se o médico não disse a via, o default da categoria
 * continua valendo (decisão pendente — ver docs/tecnica-via-fidelidade-2026-08-14.md).
 * Sinalizar ausência encheria o laudo de ruído; contradição é o caso que dói.
 */

export type Via = "transabdominal" | "transvaginal" | "ambas";

const TRANSVAGINAL =
  /\b(?:transvaginal(?:mente)?|trans[- ]vaginal|endovaginal|via\s+vaginal|sonda\s+vaginal|transdutor\s+(?:endo)?vaginal)\b/i;

const TRANSABDOMINAL =
  /\b(?:transabdominal(?:mente)?|trans[- ]abdominal|via\s+abdominal|suprap[úu]bic[ao]|abdome\s+da\s+gestante|abdominal)\b/i;

/**
 * Negação: "sem complementação transvaginal", "não foi realizada via vaginal".
 * Sem isto, a frase que NEGA a via seria lida como se a afirmasse.
 */
const NEG =
  "(?:sem|n[ãa]o\\s+(?:foi|houve|realizad[ao]|se\\s+realizou)|dispensad[ao]|aus[êe]ncia\\s+de)\\s+" +
  // [\wÀ-ÿ] e não \w: "complementação" tem ç/ã, e \w do JS não casa acento —
  // "sem complementação transvaginal" passava como se AFIRMASSE a via.
  "(?:[\\wÀ-ÿ]+\\s+){0,3}";

function mencionaAfirmando(texto: string, re: RegExp): boolean {
  if (!re.test(texto)) return false;
  const negada = new RegExp(NEG + re.source, "i");
  return !negada.test(texto);
}

/**
 * Via que o MÉDICO declarou no ditado. `null` = não declarou — e aí o guard
 * é no-op, porque não há contradição possível.
 */
export function detectStatedVia(rawInput: string): Via | null {
  const t = rawInput.toLowerCase();
  const tv = mencionaAfirmando(t, TRANSVAGINAL);
  const ta = mencionaAfirmando(t, TRANSABDOMINAL);
  if (tv && ta) return "ambas";
  if (tv) return "transvaginal";
  if (ta) return "transabdominal";
  return null;
}

/**
 * Via que o LAUDO afirma no bloco de técnica.
 *
 * Só olha o cabeçalho e o preâmbulo — mencionar "transvaginal" no meio dos
 * achados (ex.: "colo avaliado por via transvaginal") não é afirmação de
 * técnica do exame inteiro, e tratar como se fosse geraria falso positivo.
 */
export function detectReportedVia(laudo: string): Via | null {
  const bloco = extrairBlocoTecnica(laudo);
  if (!bloco) return null;
  const tv = TRANSVAGINAL.test(bloco);
  const ta = TRANSABDOMINAL.test(bloco);
  if (tv && ta) return "ambas";
  if (tv) return "transvaginal";
  if (ta) return "transabdominal";
  return null;
}

/** Título + COMENTÁRIOS/TÉCNICA, até o cabeçalho do corpo. */
function extrairBlocoTecnica(laudo: string): string | null {
  const linhas = laudo.split("\n");
  const fim = linhas.findIndex((l) =>
    /^\s*(?:OS SEGUINTES ASPECTOS|ACHADOS|AN[ÁA]LISE)/i.test(l),
  );
  const corte = fim === -1 ? Math.min(linhas.length, 8) : fim;
  const bloco = linhas.slice(0, corte).join("\n").trim();
  return bloco.length > 0 ? bloco : null;
}

export type ViaMismatch = {
  ditada: Via;
  afirmada: Via;
  nota: string;
};

/**
 * Contradição entre o que foi ditado e o que o laudo afirma.
 *
 * "ambas" ditado com laudo afirmando só uma via É contradição (o laudo omite
 * metade da técnica). O inverso — laudo afirmando "ambas" com ditado de uma só
 * — é PIOR: afirma técnica não realizada.
 */
export function detectViaMismatch(
  rawInput: string,
  laudo: string,
): ViaMismatch | null {
  const ditada = detectStatedVia(rawInput);
  if (!ditada) return null;
  const afirmada = detectReportedVia(laudo);
  if (!afirmada || afirmada === ditada) return null;

  const nota =
    afirmada === "ambas"
      ? `[REVISAR: a técnica afirma via transabdominal e transvaginal, mas o ditado indica ${rotulo(ditada)} — confirmar o método realizado]`
      : `[REVISAR: o ditado indica ${rotulo(ditada)}, mas a técnica do laudo afirma ${rotulo(afirmada)} — confirmar o método realizado]`;

  return { ditada, afirmada, nota };
}

function rotulo(v: Via): string {
  return v === "ambas" ? "via transabdominal e transvaginal" : `via ${v}`;
}

/**
 * Anexa a nota ao fim do bloco de técnica. Só-sinaliza: o texto original é
 * preservado byte a byte.
 */
export function applyTecnicaViaGuard(rawInput: string, laudo: string): string {
  const m = detectViaMismatch(rawInput, laudo);
  if (!m) return laudo;
  if (laudo.includes("[REVISAR: a técnica afirma") || laudo.includes("[REVISAR: o ditado indica")) {
    return laudo; // idempotente
  }

  const linhas = laudo.split("\n");
  const fim = linhas.findIndex((l) =>
    /^\s*(?:OS SEGUINTES ASPECTOS|ACHADOS|AN[ÁA]LISE)/i.test(l),
  );
  const alvo = fim === -1 ? 0 : fim - 1;
  const idx = Math.max(0, alvo);
  linhas[idx] = `${linhas[idx]} ${m.nota}`.trimEnd();
  return linhas.join("\n");
}
