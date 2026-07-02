/**
 * Fact-audit determinístico do PARTES_MOLES writer_guarded — mesma receita do MSK
 * (mskWriterAudit.ts): compara o DITADO com o LAUDO e sinaliza FATOS objetivos que
 * faltam/sobram. NÃO julga prosa.
 *
 * Mesma decisão de UX do MSK (Luiz, opção 2): streama otimista e, se um fato crítico
 * falha, ANEXA "[REVISAR: …]" no fim (não re-roda — mantém o TTFT). Tudo é logado.
 *
 * Diferença p/ o MSK: aqui não há roteiro fechado de estruturas por segmento — o
 * check de over-coverage é a DERIVA DE EXAME (writer descrevendo achado
 * musculoesquelético que o médico NÃO ditou: tendão, menisco, derrame articular…),
 * condicionada ao ditado (se o médico ditou o termo, não é invenção).
 */
import { extractMeasureNumbers, numberInLaudo } from "./mskWriterAudit";

/** Termos de deriva: só são problema se aparecem no LAUDO sem estarem no DITADO.
 *  MSK (deriva de exame musculoesquelético) + órgãos/planos cervicais (review dex1:
 *  o modelo pode generalizar "região cervical" para avaliar tireoide/parótida/
 *  submandibular/estudo comparativo que o médico não ditou). */
const TERMOS_DERIVA = [
  "tendinopatia",
  "tenossinovite",
  "bursite",
  "derrame articular",
  "menisco",
  "tendão",
  "tendões",
  "tireoide",
  "parótida",
  "submandibular",
  "glândula",
  "contralateral",
  "modo b",
];

export type PartesMolesAudit = {
  ok: boolean;
  /** Medidas ditadas (número) não encontradas no laudo. */
  missingMeasures: string[];
  /** Lateralidade ditada não encontrada no laudo. */
  missingSides: string[];
  /** Termos MSK no laudo sem suporte no ditado (deriva de exame / invenção). */
  extraStructures: string[];
  /** Placeholder "____" no laudo (proibido — o writer nunca inventa lacuna). */
  placeholder: boolean;
  /** Doppler/fluxo no laudo sem o médico ter mencionado (vascularização inventada —
   *  pego no smoke: ditado sem Doppler → "sem fluxo ao Doppler colorido"). */
  dopplerInventado: boolean;
};

/** Audita o laudo PARTES_MOLES contra o ditado. Determinístico, conservador. */
export function auditPartesMolesFacts(rawInput: string, laudo: string): PartesMolesAudit {
  const laudoLc = laudo.toLowerCase();
  const rawLc = rawInput.toLowerCase();

  // Medidas ditadas ausentes no laudo (mesma heurística do MSK).
  const ditadas = extractMeasureNumbers(rawInput);
  const missingMeasures = [...new Set(ditadas)].filter((n) => !numberInLaudo(n, laudo));

  // Lateralidade ditada ausente (grosso — pega drop total de um lado).
  const missingSides: string[] = [];
  if (/\bdireit[oa]s?\b/.test(rawLc) && !/direit[oa]/.test(laudoLc)) missingSides.push("direito");
  if (/\besquerd[oa]s?\b/.test(rawLc) && !/esquerd[oa]/.test(laudoLc)) missingSides.push("esquerdo");

  // Deriva: termo no laudo SEM estar no ditado → invenção de achado/estrutura.
  const extraStructures = TERMOS_DERIVA.filter(
    (t) => laudoLc.includes(t) && !rawLc.includes(t),
  );

  const placeholder = laudo.includes("____");

  // Doppler no laudo sem suporte no ditado (fato inventado).
  const dopplerInventado =
    /doppler|fluxo/.test(laudoLc) && !/doppler|fluxo|vasculariza/.test(rawLc);

  return {
    ok:
      missingMeasures.length === 0 &&
      missingSides.length === 0 &&
      extraStructures.length === 0 &&
      !placeholder &&
      !dopplerInventado,
    missingMeasures,
    missingSides,
    extraStructures,
    placeholder,
    dopplerInventado,
  };
}

/** Nota "[REVISAR: …]" para anexar ao fim do laudo quando o audit falha. */
export function partesMolesRevisarNote(a: PartesMolesAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s) no texto: ${a.missingMeasures.join(", ")}`);
  if (a.missingSides.length) partes.push(`lateralidade ditada: ${a.missingSides.join(", ")}`);
  if (a.extraStructures.length) partes.push(`termo(s) sem suporte no ditado: ${a.extraStructures.join(", ")}`);
  if (a.placeholder) partes.push(`placeholder "____" no laudo`);
  if (a.dopplerInventado) partes.push(`Doppler/fluxo no laudo sem o médico ter mencionado`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
