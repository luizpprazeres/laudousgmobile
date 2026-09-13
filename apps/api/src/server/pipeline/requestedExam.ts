export type DopplerMode = "combined" | "isolated";

export function requestedExamInstruction(category: string, mode?: DopplerMode): string {
  if (category === "OBSTETRICA" && mode === "combined") {
    return "\nEXAME SELECIONADO: obstétrico com Doppler. Preserve o modelo obstétrico e acrescente a seção Doppler com os achados vasculares informados. Não descarte biometria, placenta, líquido ou apresentação ditados. Não invente medidas nem normalidade vascular.";
  }
  if (category === "DOPPLER_OBSTETRICO" && mode === "isolated") {
    return "\nEXAME SELECIONADO: somente Doppler. Use o modelo vascular isolado, sem acrescentar biometria ou conclusão obstétrica de peso, placenta, apresentação ou líquido. Preserve os achados vasculares e a idade gestacional de referência quando informada.";
  }
  return "";
}

/** A escolha explicita do exame nao pode desaparecer no palpite do structurer. */
export function requestedExamCategory(categoryHint?: string, dopplerMode?: DopplerMode): string | undefined {
  if (categoryHint === "MORFOLOGICO") return "MORFOLOGICO";
  if (categoryHint === "DOPPLER_OBSTETRICO" && dopplerMode) {
    return dopplerMode === "combined" ? "OBSTETRICA" : "DOPPLER_OBSTETRICO";
  }
  return undefined;
}
