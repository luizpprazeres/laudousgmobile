import { checkFetalVitality } from "../fetalVitalityGuard";

function expectIssue(input: string, output: string): void {
  const issues = checkFetalVitality(input, output);
  if (
    !issues.some(
      (issue) =>
        issue.type === "vitalidade_fetal_divergente" &&
        issue.severity === "critical",
    )
  ) {
    throw new Error(`esperava critical de vitalidade: ${JSON.stringify(issues)}`);
  }
}

function expectNoIssue(input: string, output: string): void {
  const issues = checkFetalVitality(input, output);
  if (issues.length > 0) {
    throw new Error(`não esperava issue de vitalidade: ${JSON.stringify(issues)}`);
  }
}

// Boletim 1f3bc01e.
expectIssue(
  "Batimentos cardíacos fetais não visualizados pelo modo B e Doppler. Feto sem vitalidade.",
  "Batimentos cardíacos ritmados (BCF = ____ bpm).",
);

// Outro padrão positivo pedido: BCF numérico contradiz ausência.
expectIssue(
  "Embrião sem atividade cardíaca.",
  "BCF = 145 bpm, presentes e rítmicos.",
);

// Ausência de BCF no input, isoladamente, não autoriza inferir inviabilidade.
expectNoIssue(
  "Feto único, cefálico. Placenta posterior.",
  "Batimentos cardíacos presentes. BCF = 145 bpm.",
);

// Negação preservada no laudo não dispara.
expectNoIssue(
  "Feto sem vitalidade e sem batimentos.",
  "Batimentos cardíacos fetais não visualizados ao modo Doppler.",
);

console.log("fetalVitalityGuard.manual ok: 4/4");
