export type DopplerMode = "combined" | "isolated";

/** Only the Doppler entry opts into a mode; old clients default to combined. */
export function resolveDopplerMode(category?: string, mode?: DopplerMode): DopplerMode | undefined {
  return category === "DOPPLER_OBSTETRICO" ? mode ?? "combined" : undefined;
}

/** The renderer may use OBSTETRICA, but the writer needs the Doppler bundle. */
export function resolveWriterExam(category: string, mode?: DopplerMode) {
  const dopplerMode = category === "OBSTETRICA" && mode === "combined"
    ? mode
    : resolveDopplerMode(category, mode);
  return { categoryCode: dopplerMode ? "DOPPLER_OBSTETRICO" : category, dopplerMode };
}

export function requestedExamInstruction(category: string, mode?: DopplerMode): string {
  if ((category === "OBSTETRICA" || category === "DOPPLER_OBSTETRICO") && mode === "combined") {
    return "\nEXAME SELECIONADO: obstétrico com Doppler. Preserve o modelo obstétrico e acrescente a seção Doppler com os achados vasculares informados. Não descarte biometria, placenta, líquido ou apresentação ditados. Não invente medidas nem normalidade vascular.";
  }
  if (category === "DOPPLER_OBSTETRICO" && mode === "isolated") {
    return "\nEXAME SELECIONADO: somente Doppler. Use o modelo vascular isolado, sem acrescentar biometria ou conclusão obstétrica de peso, placenta, apresentação ou líquido. Preserve os achados vasculares e a idade gestacional de referência quando informada.";
  }
  return "";
}

/** A escolha explicita do exame nao pode desaparecer no palpite do structurer. */
export function requestedExamCategory(categoryHint?: string, dopplerMode?: DopplerMode): string | undefined {
  if (categoryHint === "MORFOLOGICO" || categoryHint === "OBSTETRICA") return categoryHint;
  const mode = resolveDopplerMode(categoryHint, dopplerMode);
  if (mode) {
    return mode === "combined" ? "OBSTETRICA" : "DOPPLER_OBSTETRICO";
  }
  return undefined;
}
