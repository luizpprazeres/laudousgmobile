/**
 * Golden manual A1-core — edição incremental por laudo inteiro + diff-guard.
 *
 * Chama OpenAI. Rodar:
 *   pnpm --filter @laudousg/api exec tsx src/server/pipeline/__tests__/editReport.manual.ts
 */
import { config } from "dotenv";
import { editReport, type EditTarget } from "../editReport";

config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

type Case = {
  name: string;
  category: string;
  baseText: string;
  instruction: string;
  target: EditTarget;
  expected: RegExp;
  /** Texto que NÃO pode sobreviver (ex.: a frase antiga numa substituição). */
  notExpected?: RegExp;
  /** Seção onde a mudança DEVE cair (valida o roteamento por alvo). */
  expectedSection: "body" | "conclusion";
};

const OBST_BASE = [
  "ULTRASSONOGRAFIA OBSTÉTRICA",
  "",
  "COMENTÁRIOS:",
  "Exame realizado com transdutor de 4.0 MHz.",
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "Feto único, em apresentação cefálica.",
  "Placenta de localização anterior, grau II.",
  "Líquido amniótico em quantidade normal.",
  "",
  "CONCLUSÃO:",
  "1. Gestação tópica, única, em torno de 30 semanas.",
  "2. Líquido amniótico em quantidade normal.",
].join("\n");

const CASES: Case[] = [
  {
    name: "OBSTETRICA líquido — alvo CORPO",
    category: "OBSTETRICA",
    baseText: OBST_BASE,
    instruction: "muda a frase do líquido, ILA 10,4",
    target: "body",
    expected: /O índice do líquido amniótico mede 10,4 cm\./,
    expectedSection: "body",
  },
  {
    name: "OBSTETRICA líquido — SUBSTITUI (ILA→MBV, a antiga some)",
    category: "OBSTETRICA",
    baseText: OBST_BASE.replace(
      "Líquido amniótico em quantidade normal.",
      "O índice do líquido amniótico mede 10,4 cm.",
    ),
    instruction: "troca a frase do líquido para maior bolsão vertical mede 5 cm",
    target: "body",
    expected: /Maior bolsão vertical mede 5/i,
    notExpected: /índice do líquido amni[oó]tico/i,
    expectedSection: "body",
  },
  {
    name: "OBSTETRICA líquido — alvo CONCLUSÃO (roteamento)",
    category: "OBSTETRICA",
    baseText: OBST_BASE,
    instruction: "muda a frase do líquido, ILA 10,4",
    target: "conclusion",
    expected: /índice do líquido amniótico mede 10,4 cm/,
    expectedSection: "conclusion",
  },
  {
    name: "DOPPLER_OBSTETRICO — troca uma frase (corpo)",
    category: "DOPPLER_OBSTETRICO",
    baseText: [
      "ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERVELOCIMETRIA",
      "",
      "DOPPLERVELOCIMETRIA:",
      "Artéria umbilical com índice de pulsatilidade de 0,90.",
      "Artéria cerebral média com índice de pulsatilidade de 1,80.",
      "",
      "CONCLUSÃO:",
      "1. Dopplervelocimetria dentro dos limites da normalidade.",
    ].join("\n"),
    instruction: "troque só a frase da artéria umbilical para IP 1,2",
    target: "body",
    expected: /Artéria umbilical com índice de pulsatilidade de 1,2\./,
    expectedSection: "body",
  },
  {
    name: "PELVE — adiciona na CONCLUSÃO",
    category: "PELVE_FEMININA",
    baseText: [
      "ULTRASSONOGRAFIA PÉLVICA",
      "",
      "ACHADOS:",
      "Útero em anteversoflexão, de dimensões normais.",
      "Ovários de aspecto habitual.",
      "",
      "CONCLUSÃO:",
      "1. Exame pélvico sem alterações significativas.",
    ].join("\n"),
    instruction: "adicione: achados compatíveis com adenomiose",
    target: "conclusion",
    expected: /adenomiose/i,
    expectedSection: "conclusion",
  },
];

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n${detail}` : ""}`);
  }
}

async function main() {
  for (const c of CASES) {
    console.log(`\n=== ${c.name} ===`);
    const result = await editReport({
      baseText: c.baseText,
      instruction: c.instruction,
      category: c.category,
      target: c.target,
    });
    console.log(
      JSON.stringify(
        {
          accepted: result.accepted,
          reason: result.reason,
          changedLines: result.changedLines,
        },
        null,
        2,
      ),
    );

    check(`${c.name}: accepted=true`, result.accepted, result.reason);
    check(
      `${c.name}: changedLines <= 3`,
      result.changedLines.length > 0 && result.changedLines.length <= 3,
      result.editedText,
    );
    check(`${c.name}: contém frase esperada`, c.expected.test(result.editedText), result.editedText);
    if (c.notExpected) {
      check(
        `${c.name}: frase antiga sumiu`,
        !c.notExpected.test(result.editedText),
        result.editedText,
      );
    }
    const sectionOk =
      c.expectedSection === "conclusion"
        ? result.changedLines.every((l) => l.section === "conclusion")
        : result.changedLines.every((l) => l.section !== "conclusion");
    check(
      `${c.name}: mudança no alvo (${c.expectedSection})`,
      result.changedLines.length > 0 && sectionOk,
      JSON.stringify(result.changedLines),
    );
  }

  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (fail > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
