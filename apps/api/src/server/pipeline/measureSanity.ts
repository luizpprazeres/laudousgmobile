/**
 * Sanity de MEDIDAS — sinaliza valores fisiologicamente IMPROVÁVEIS com [REVISAR]
 * (nunca bloqueia, nunca apaga o valor). Boletim 2026-06-17: CCN 0,1mm aceito,
 * resíduo 1019ml, cisto 0,0cm — tudo sem flag. O médico revisa o [REVISAR] e edita.
 *
 * Conservador: bounds LARGOS (só o claramente absurdo) e labels INEQUÍVOCOS
 * (CCN/DBP/CF só aparecem em obstétrico; "pré-miccional/resíduo" em urologia) para
 * não gerar falso-positivo. Idempotente (não re-sinaliza). Preserva placeholders ____.
 */

import { igSemanasPorCf } from "../renderer/categories/biometriaFetal";

const FLAG = " [REVISAR: valor improvável]";

/** Regra: label + número + unidade; sinaliza se fora de [min, max]. */
type Regra = { re: RegExp; min: number; max: number };

// Bounds são "absurdo", não faixa clínica fina — pegam garble (0,1mm; 1019ml), não bordas.
const REGRAS: Regra[] = [
  // Biometria fetal (mm) — labels inequívocos.
  { re: /\(CCN\)[^\d\n]{0,18}?(\d+(?:[.,]\d+)?)\s*mm/gi, min: 1, max: 120 },
  { re: /\(DBP\)[^\d\n]{0,18}?(\d+(?:[.,]\d+)?)\s*mm/gi, min: 5, max: 120 },
  { re: /\(CC\)[^\d\n]{0,18}?(\d+(?:[.,]\d+)?)\s*mm/gi, min: 30, max: 410 },
  { re: /\(CA\)[^\d\n]{0,18}?(\d+(?:[.,]\d+)?)\s*mm/gi, min: 30, max: 430 },
  { re: /\(CF\)[^\d\n]{0,18}?(\d+(?:[.,]\d+)?)\s*mm/gi, min: 3, max: 100 },
  // Bexiga (mL) — pré-miccional e resíduo.
  { re: /pr[ée][\s-]?miccional\s+de\s+(\d+(?:[.,]\d+)?)\s*m[lL]/gi, min: 0, max: 900 },
  { re: /res[íi]duo[^\d\n]{0,30}?(\d+(?:[.,]\d+)?)\s*m[lL]/gi, min: 0, max: 700 },
];

function num(s: string | undefined): number {
  return s ? parseFloat(s.replace(",", ".")) : NaN;
}

/** Já existe [REVISAR] logo após o match? (idempotência — checa o que SEGUE, não só m.) */
function flagSegue(full: string, offset: number, mLen: number): boolean {
  return /^\s*\[REVISAR/.test(full.slice(offset + mLen, offset + mLen + 14));
}

/**
 * Insere [REVISAR] após medidas fora da faixa plausível + dimensões zero.
 * NÃO altera o valor; só sinaliza. Idempotente. Preserva placeholders ____.
 * `opts.cfIgAware` (flag OBST_BIOMETRIA_DET): check IG×CF adicional — pega a
 * unidade errada que os bounds estáticos não pegam (boletim 02/07, 62f15728:
 * CF 5,8 mm é plausível em gestação inicial, absurdo com IG de 29 semanas).
 */
export function flagImplausibleMeasures(
  laudo: string,
  opts?: { cfIgAware?: boolean },
): string {
  let s = laudo;

  for (const r of REGRAS) {
    s = s.replace(r.re, (...args: unknown[]) => {
      const m = args[0] as string;
      const valor = args[1] as string;
      const offset = args[args.length - 2] as number;
      const full = args[args.length - 1] as string;
      if (flagSegue(full, offset, m.length)) return m;
      const v = num(valor);
      return Number.isFinite(v) && (v < r.min || v > r.max) ? `${m}${FLAG}` : m;
    });
  }

  // Dimensão ZERO em contexto de medição ("medindo/mede A x B x C cm") — 0 é absurdo.
  s = s.replace(
    /\bmed(?:indo|e)\s+(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/gi,
    (...args: unknown[]) => {
      const m = args[0] as string;
      const [a, b, c] = [args[1], args[2], args[3]] as string[];
      const offset = args[args.length - 2] as number;
      const full = args[args.length - 1] as string;
      if (flagSegue(full, offset, m.length)) return m;
      return [a, b, c].some((x) => num(x) === 0) ? `${m}${FLAG}` : m;
    },
  );

  if (opts?.cfIgAware) s = flagCfIncompativelComIg(s);

  return s;
}

const FLAG_CF_IG = " [REVISAR: CF incompatível com a IG]";

/**
 * IG×CF: sinaliza CF cuja IG estimada (fórmula canônica do app, Hadlock) diverge
 * >6 semanas da IG da conclusão ("Gestação em torno de N semanas"). Tolerância
 * LARGA de propósito (RCIU/macrossomia jamais desviam 6 semanas; unidade errada
 * desvia 15+). Só sinaliza; nunca altera. Idempotente (pula CF já flagrado).
 */
function flagCfIncompativelComIg(laudo: string): string {
  const ig = laudo.match(/Gesta[çc][ãa]o em torno de (\d+) semanas/i);
  if (!ig || ig[1] === undefined) return laudo;
  const igSemanas = parseInt(ig[1], 10);
  return laudo.replace(
    /\(CF\)[^\d\n]{0,18}?(\d+(?:[.,]\d+)?)\s*mm(?!\s*\[REVISAR)/gi,
    (m, valor: string) => {
      const est = igSemanasPorCf(num(valor));
      if (est === null) return m;
      return Math.abs(est - igSemanas) > 6 ? `${m}${FLAG_CF_IG}` : m;
    },
  );
}
