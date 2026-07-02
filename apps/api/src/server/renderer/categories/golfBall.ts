/**
 * Golf ball / foco ecogênico intracardíaco — snippet determinístico (gap #1 da
 * auditoria 2026-07-01, severidade 🔴: falha de seguimento — a IA dropava o achado
 * e a recomendação de ecocardiografia fetal).
 *
 * Frases canônicas EXATAS do Dr. Luiz (corpus aprendizado-correcoes-luiz.md §2):
 *  - Corpo (após "Coração com quatro câmaras visíveis."):
 *    "Imagem hiperecoica puntiforme no ventrículo {lado}, medindo {N} cm no seu maior eixo."
 *  - Conclusão (item próprio): "Foco ecogênico intracardíaco no ventrículo {lado} de
 *    aspecto inespecífico (Golf Ball). Convém, a critério clínico, realizar
 *    ecocardiografia fetal em torno de 28 semanas de idade gestacional com o
 *    objetivo de acompanhar a evolução."
 * Aplicável a OBSTETRICA, DOPPLER_OBSTETRICO e MORFOLOGICO. Flag GOLF_BALL_SNIPPET.
 *
 * Detecção CONSERVADORA (por sentença do ditado — "foco ecogênico" sozinho pode ser
 * renal/hepático, só dispara com contexto cardíaco): "golf ball" | "foco ecogênico
 * intracardíaco" | "foco ecogênico" + "ventrículo" na mesma sentença | "hiperecoica
 * puntiforme" + "ventrículo" na mesma sentença.
 * Lateralidade NUNCA inventada: sem "ventrículo esquerdo/direito" ditado → frases
 * sem lado. Medida só a ditada na sentença do achado.
 */

export type GolfBall = {
  lado: "esquerdo" | "direito" | null;
  /** Medida ditada normalizada ("0,3 cm" / "4 mm"), ou null. */
  medida: string | null;
};

const RE_GOLF = /golf\s*ball/i;
const RE_FOCO_INTRACARDIACO = /focos?\s+ecog[êe]nicos?\s+intracard[íi]acos?/i;
const RE_FOCO = /focos?\s+ecog[êe]nicos?/i;
const RE_PUNTIFORME = /hiperec[oó]ic[ao]s?\s+puntiformes?/i;
const RE_VENTRICULO = /ventr[íi]culo/i;
const RE_MEDIDA = /(\d+(?:[.,]\d+)?)\s*(cm|cent[íi]metros?|mm|mil[íi]metros?)\b/i;

function sentencaDispara(s: string): boolean {
  if (RE_GOLF.test(s)) return true;
  if (RE_FOCO_INTRACARDIACO.test(s)) return true;
  if (RE_FOCO.test(s) && RE_VENTRICULO.test(s)) return true;
  if (RE_PUNTIFORME.test(s) && RE_VENTRICULO.test(s)) return true;
  return false;
}

function ladoDe(texto: string): "esquerdo" | "direito" | null {
  if (/ventr[íi]culo\s+esquerdo/i.test(texto)) return "esquerdo";
  if (/ventr[íi]culo\s+direito/i.test(texto)) return "direito";
  return null;
}

/** Detecta golf ball / foco ecogênico intracardíaco no ditado. null = não ditado. */
export function detectGolfBall(rawInput: string): GolfBall | null {
  // Split por sentença SEM quebrar ponto decimal (0.3) — ponto só encerra frase
  // quando seguido de espaço/fim; quebra também em ; e nova linha.
  const sentencas = rawInput.split(/[;\n]+|\.(?=\s|$)/);
  for (const s of sentencas) {
    if (!sentencaDispara(s)) continue;
    // Lado: prioridade pra sentença do achado; fallback pro ditado inteiro.
    const lado = ladoDe(s) ?? ladoDe(rawInput);
    const m = RE_MEDIDA.exec(s);
    const medida = m
      ? `${m[1]!.replace(".", ",")} ${/^m/i.test(m[2]!) ? "mm" : "cm"}`
      : null;
    return { lado, medida };
  }
  return null;
}

/** Linha canônica do CORPO. */
export function golfBallCorpo(g: GolfBall): string {
  const onde = g.lado ? ` no ventrículo ${g.lado}` : ", intracardíaca";
  const medindo = g.medida ? `, medindo ${g.medida} no seu maior eixo` : "";
  return `Imagem hiperecoica puntiforme${onde}${medindo}.`;
}

/** Item canônico da CONCLUSÃO (com a recomendação de eco fetal ~28s). */
export function golfBallConclusao(g: GolfBall): string {
  const onde = g.lado ? ` no ventrículo ${g.lado}` : "";
  return (
    `Foco ecogênico intracardíaco${onde} de aspecto inespecífico (Golf Ball). ` +
    `Convém, a critério clínico, realizar ecocardiografia fetal em torno de 28 semanas ` +
    `de idade gestacional com o objetivo de acompanhar a evolução.`
  );
}

/**
 * Remove do texto (achados_adicionais / item livre) as sentenças que ecoam o golf
 * ball — o snippet canônico substitui o eco cru da extração (dedup). Retorna ""
 * quando não sobra conteúdo.
 */
export function stripGolfBallEcho(texto: string): string {
  return texto
    .split(/(?<=[.;])\s+|\n+/)
    .filter((s) => s.trim() !== "" && !sentencaDispara(s))
    .join(" ")
    .trim();
}

/**
 * Insere a linha do corpo na POSIÇÃO CANÔNICA dos aspectos: após "Coração com
 * quatro câmaras visíveis." (morfológico) ou após a linha do estômago/bexiga
 * (bloco de anatomia do obstétrico/Doppler); sem âncora → ao fim. Muta o array.
 */
export function insertGolfBallCorpo(aspectos: string[], g: GolfBall): void {
  const linha = golfBallCorpo(g);
  const idxCoracao = aspectos.findIndex((l) => /cora[çc][ãa]o com quatro c[âa]maras/i.test(l));
  const idxAnatomia = aspectos.findIndex((l) => l.includes("O estômago e a bexiga"));
  const idx = idxCoracao >= 0 ? idxCoracao : idxAnatomia;
  if (idx >= 0) aspectos.splice(idx + 1, 0, linha);
  else aspectos.push(linha);
}

/** Conclusão genérica de morfologia quando há o foco (corpus §2). */
export const CONCLUSAO_DEMAIS_MORFOLOGIA =
  "Demais aspectos da morfologia fetal sem evidência de alteração detectável pelo método.";

/**
 * Aplica o snippet num laudo SEM linha genérica de morfologia (OBSTETRICA /
 * DOPPLER_OBSTETRICO): corpo na posição canônica + item próprio na conclusão.
 * Muta os arrays (chamar depois de montados, antes da numeração).
 */
export function applyGolfBall(aspectos: string[], conclusao: string[], g: GolfBall): void {
  insertGolfBallCorpo(aspectos, g);
  conclusao.push(golfBallConclusao(g));
}

/**
 * Aplica o snippet no MORFOLOGICO: além do corpo + item, a conclusão genérica
 * ("Morfologia fetal sem evidência…" / "Morfologia fetal normal…") vira "Demais
 * aspectos da morfologia fetal…" (corpus §2) — o laudo não afirma morfologia
 * integralmente normal com o foco presente. Item do foco entra antes da genérica.
 */
export function applyGolfBallMorfologico(
  aspectos: string[],
  conclusao: string[],
  g: GolfBall,
): void {
  insertGolfBallCorpo(aspectos, g);
  const idx = conclusao.findIndex((c) => /morfologia fetal/i.test(c));
  if (idx >= 0) {
    conclusao.splice(idx, 0, golfBallConclusao(g));
    conclusao[idx + 1] = CONCLUSAO_DEMAIS_MORFOLOGIA;
  } else {
    conclusao.push(golfBallConclusao(g));
  }
}
