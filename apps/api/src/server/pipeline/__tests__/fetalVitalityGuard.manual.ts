/**
 * O guard de vitalidade fetal — inclusive no gemelar, onde a v1 era
 * falso-positivo garantido.
 *
 * Rodar: pnpm exec tsx src/server/pipeline/__tests__/fetalVitalityGuard.manual.ts
 */
import { checkFetalVitality } from "../fetalVitalityGuard";

let ok = 0;
const falhas: string[] = [];

function expectIssue(nome: string, input: string, output: string): void {
  const issues = checkFetalVitality(input, output);
  const achou = issues.some(
    (i) => i.type === "vitalidade_fetal_divergente" && i.severity === "critical",
  );
  if (achou) ok++;
  else falhas.push(`${nome} — esperava critical, veio ${JSON.stringify(issues)}`);
}

function expectNoIssue(nome: string, input: string, output: string): void {
  const issues = checkFetalVitality(input, output);
  if (issues.length === 0) ok++;
  else falhas.push(`${nome} — não esperava issue, veio ${JSON.stringify(issues)}`);
}

// ---------------------------------------------------------------- feto único
// Boletim 1f3bc01e.
expectIssue(
  "BCF não visualizados no ditado, laudo afirma ritmados",
  "Batimentos cardíacos fetais não visualizados pelo modo B e Doppler. Feto sem vitalidade.",
  "Batimentos cardíacos ritmados (BCF = ____ bpm).",
);
expectIssue(
  "sem atividade cardíaca no ditado, laudo dá número",
  "Embrião sem atividade cardíaca.",
  "BCF = 145 bpm, presentes e rítmicos.",
);
// Ausência de BCF no input, isoladamente, não autoriza inferir inviabilidade.
expectNoIssue(
  "input sem menção a vitalidade não dispara",
  "Feto único, cefálico. Placenta posterior.",
  "Batimentos cardíacos presentes. BCF = 145 bpm.",
);
expectNoIssue(
  "negativa preservada no laudo não dispara",
  "Feto sem vitalidade e sem batimentos.",
  "Batimentos cardíacos fetais não visualizados ao modo Doppler.",
);

// ------------------------------------------------- vocabulário de óbito (v1 era muda)
for (const [nome, ditado] of [
  ["óbito fetal", "Paciente com óbito fetal, 32 semanas."],
  ["morte fetal", "Morte fetal confirmada ao Doppler."],
  ["feto morto", "Feto morto, sem movimentos."],
  ["óbito embrionário", "Óbito embrionário."],
  ["ausência de atividade cardíaca", "Ausência de atividade cardíaca."],
] as const) {
  expectIssue(
    `ditado "${nome}" é reconhecido`,
    ditado,
    "Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = 142 bpm).",
  );
}

// ------------------------------------------------------------------- gemelar
const GEMELAR_CORRETO = `ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Dois fetos: o feto A, e o feto B.

Feto A:
Batimentos cardíacos presentes (BCF = 140 bpm).
Peso aproximado de 1800 gramas.

Feto B:
Ausência de batimentos cardíacos fetais.
Peso aproximado de 1450 gramas.

CONCLUSÃO:
1) Gestação gemelar em torno de 32 semanas.
2) Óbito fetal (feto B).`;

// O caso que a v1 marcava como divergente SEMPRE — e é o laudo certo.
expectNoIssue(
  "gemelar com um óbito e um vivo é CORRETO",
  "Gemelar. Feto A com BCF 140. Feto B sem batimentos, óbito fetal.",
  GEMELAR_CORRETO,
);

// A negativa sumiu: os dois fetos saíram com BCF positivo.
expectIssue(
  "gemelar em que nenhum feto registra a negativa",
  "Gemelar. Feto B sem batimentos, óbito fetal.",
  GEMELAR_CORRETO.replace("Ausência de batimentos cardíacos fetais.", "Batimentos cardíacos presentes (BCF = 148 bpm).")
    .replace("2) Óbito fetal (feto B).", "2) Líquido amniótico em quantidade normal."),
);

// Contradição DENTRO do bloco de um feto — o pior caso, e o mais silencioso.
expectIssue(
  "gemelar com negativa e BCF positivo no MESMO bloco",
  "Gemelar. Feto B sem batimentos.",
  GEMELAR_CORRETO.replace(
    "Ausência de batimentos cardíacos fetais.",
    "Ausência de batimentos cardíacos fetais.\nBatimentos cardíacos presentes (BCF = 148 bpm).",
  ),
);

// A conclusão não pode ser lida como se fosse bloco de feto: ela junta itens de
// fetos diferentes, e "Óbito fetal (feto B)" ali não prova nada sobre o corpo.
expectIssue(
  "óbito SÓ na conclusão, com os dois fetos vivos no corpo",
  "Gemelar. Feto B com óbito fetal.",
  GEMELAR_CORRETO.replace("Ausência de batimentos cardíacos fetais.", "Batimentos cardíacos presentes (BCF = 148 bpm)."),
);

// ------------------------------------------------------------------ relatório
const total = ok + falhas.length;
if (falhas.length === 0) {
  console.log(`fetalVitalityGuard.manual ok: ${ok}/${total}`);
} else {
  console.log(`fetalVitalityGuard.manual: ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
  process.exit(1);
}
