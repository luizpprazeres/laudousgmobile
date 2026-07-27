import { checkMetaCommandLeaks } from "../metaCommandLeakGuard";

function expectIssue(output: string): void {
  const issues = checkMetaCommandLeaks(output);
  if (
    !issues.some(
      (issue) =>
        issue.type === "metacomando_residual" &&
        issue.severity === "critical",
    )
  ) {
    throw new Error(`esperava metacomando critical: ${JSON.stringify(issues)}`);
  }
}

function expectNoIssue(output: string): void {
  const issues = checkMetaCommandLeaks(output);
  if (issues.length > 0) {
    throw new Error(`não esperava metacomando: ${JSON.stringify(issues)}`);
  }
}

// Boletim 46bf85a2.
expectIssue("CONCLUSÃO:\n1) Pode colocar, pólipos da vesícula biliar.");

// Padrão do boletim a962a942 ("aí você pode colocar...").
expectIssue("Aí você pode colocar as frases de tireoidite de Hashimoto.");

expectIssue("Na conclusão coloque controle ultrassonográfico.");
expectIssue("No lugar de cisto, troque por nódulo.");

// Linguagem clínica legítima não contém os imperativos fechados.
expectNoIssue(
  "CONCLUSÃO:\n1) Pólipos de colesterol na vesícula biliar.\n2) Recomenda-se controle ultrassonográfico.",
);

console.log("metaCommandLeakGuard.manual ok: 5/5");
