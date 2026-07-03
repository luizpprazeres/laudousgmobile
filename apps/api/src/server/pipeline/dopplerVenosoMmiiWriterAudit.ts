/**
 * Fact-audit determinístico do DOPPLER_VENOSO_MMII writer_guarded.
 * Guard de SEGURANÇA central: em exame TVP-ONLY (só sistema profundo), o laudo NÃO
 * pode afirmar competência/normalidade do sistema superficial (safenas/perfurantes)
 * — não foram avaliados. Também: bloquear ____; coerência de lateralidade.
 */

export type DopplerVenosoAudit = {
  ok: boolean;
  placeholder: boolean;
  /** TVP-only mas o laudo afirma competência/normalidade do superficial. */
  superficialEmTvpOnly: boolean;
  /** Lado ditado ausente do laudo (grosso). */
  ladoAusente: boolean;
};

/** O ditado indica protocolo TVP-only? (intenção de TVP E sem menção de superficial). */
function isTvpOnly(rawLc: string): boolean {
  const intencaoTvp = /\btvp\b|trombose|d-?d[íi]mero|edema\s+agudo|investig\w+\s+trombose|afastar\s+trombose/i.test(rawLc);
  const mencionaSuperficial = /safena|varize?s?|varicos|reflux|mapeamento|cartografia|perfurante|insufici[êe]ncia\s+venosa|pr[ée]-?operat/i.test(rawLc);
  return intencaoTvp && !mencionaSuperficial;
}

/** O laudo AFIRMA competência/normalidade do sistema superficial? */
function afirmaSuperficial(laudoLc: string): boolean {
  return (
    /safena[^.]{0,40}competente/i.test(laudoLc) ||
    /sistema\s+venoso\s+superficial[^.]{0,60}(sem\s+(?:sinais?\s+de\s+)?reflux|competent|normal)/i.test(laudoLc) ||
    /perfurantes?[^.]{0,30}competent/i.test(laudoLc)
  );
}

export function auditDopplerVenosoFacts(rawInput: string, laudo: string): DopplerVenosoAudit {
  const rawLc = rawInput.toLowerCase();
  const laudoLc = laudo.toLowerCase();

  const placeholder = laudo.includes("____");
  const superficialEmTvpOnly = isTvpOnly(rawLc) && afirmaSuperficial(laudoLc);

  // Lado ditado (direito/esquerdo) ausente do laudo — bilateral não checa.
  let ladoAusente = false;
  if (/\bdireit[oa]\b/.test(rawLc) && !/bilateral|ambos/.test(rawLc) && !/direit[oa]/.test(laudoLc)) ladoAusente = true;
  if (/\besquerd[oa]\b/.test(rawLc) && !/bilateral|ambos/.test(rawLc) && !/esquerd[oa]/.test(laudoLc)) ladoAusente = true;

  return {
    ok: !placeholder && !superficialEmTvpOnly && !ladoAusente,
    placeholder,
    superficialEmTvpOnly,
    ladoAusente,
  };
}

export function dopplerVenosoRevisarNote(a: DopplerVenosoAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.placeholder) partes.push(`placeholder "____" no laudo`);
  if (a.superficialEmTvpOnly) partes.push(`exame TVP-only afirma normalidade do sistema superficial (safena/perfurante) não avaliado — remover`);
  if (a.ladoAusente) partes.push(`lateralidade ditada ausente do laudo`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
