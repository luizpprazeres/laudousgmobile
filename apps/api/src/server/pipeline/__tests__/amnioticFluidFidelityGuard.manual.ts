import {
  checkAmnioticFluidFidelity,
  extractAmnioticFluidObservations,
} from "../amnioticFluidFidelityGuard";

function expectCritical(input: string, output: string): void {
  const issues = checkAmnioticFluidFidelity(input, output);
  if (!issues.some((issue) => issue.severity === "critical")) {
    throw new Error(`esperava critical de líquido: ${JSON.stringify(issues)}`);
  }
}

function expectNoIssue(input: string, output: string): void {
  const issues = checkAmnioticFluidFidelity(input, output);
  if (issues.length > 0) {
    throw new Error(`não esperava issue de líquido: ${JSON.stringify(issues)}`);
  }
}

// Boletim 0660b2bd: MBV virou ILA, mantendo o mesmo número.
expectCritical(
  "Maior bolsão vertical mede 8,1 cm.",
  "Índice do líquido amniótico de 8,1 cm.",
);

// Boletim fbf705b2: MBV sumiu e classe reduzida virou normal.
expectCritical(
  "Maior bolsão vertical mede 1,1 cm; índice do líquido amniótico mede 3,3 cm; quantidade reduzida.",
  "ILA de 3,3 cm. Líquido amniótico em quantidade normal.",
);

// Valor alterado com método preservado.
expectCritical("ILA mede 7,2 cm.", "ILA mede 12,0 cm.");

// Mesmo método, valor e classe explícita devem passar.
expectNoIssue(
  "MBV mede 1,8 cm, quantidade reduzida.",
  "Maior bolsão vertical de 1,8 cm. Líquido amniótico em quantidade reduzida.",
);

// Sem classe explícita, o guard não deriva normalidade pelo valor.
expectNoIssue("ILA mede 26 cm.", "Índice do líquido amniótico de 26 cm.");

const parsed = extractAmnioticFluidObservations(
  "MBV mede 1,1 cm e ILA mede 3,3 cm; quantidade reduzida.",
);
if (
  parsed.length !== 2 ||
  parsed.some((item) => item.explicitClass !== "reduzida")
) {
  throw new Error(`extração inesperada: ${JSON.stringify(parsed)}`);
}

console.log("amnioticFluidFidelityGuard.manual ok: 6/6");
