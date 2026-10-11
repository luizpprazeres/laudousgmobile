/**
 * W17 — "acrescente <achado>" na edição incremental (/api/edit), sem modelo.
 *
 * Defeito (Luiz, 10/10): o achado entrava no corpo, mas a frase normal do órgão
 * e a conclusão "sem evidência de alterações ecográficas" ficavam. Aqui se
 * testa a parte determinística: detecção do acréscimo, alvo "body" liberando a
 * conclusão para a coerência e o guard pós-geração da conclusão normal. A saída
 * do modelo é FIXA (cliente falso); o comportamento do modelo com o prompt novo
 * é medido em scripts/bench-haiku/edicao-acrescente.ts (assinatura).
 *
 * Rodar (da raiz):
 *   node_modules/.bin/tsx --tsconfig apps/api/tsconfig.json --env-file=.env apps/api/src/server/pipeline/__tests__/editReport-acrescimo.manual.ts
 */
process.env.LLM_WRITER_MODEL = "claude-haiku-5-5";

import { editReport, guardNormalConclusion, isAcrescimo, isGlobalNormalItem } from "../editReport";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

/**
 * Cliente Anthropic falso: devolve as saídas em sequência (repete a última) e
 * guarda as mensagens do usuário de cada chamada.
 */
function fakeClient(outputs: string | string[], seen: { users: string[] } = { users: [] }) {
  const list = Array.isArray(outputs) ? outputs : [outputs];
  return {
    messages: {
      stream: (params: { messages: Array<{ content: unknown }> }) => {
        const c = params.messages[0]?.content;
        seen.users.push(typeof c === "string" ? c : JSON.stringify(c));
        const text = list[Math.min(seen.users.length - 1, list.length - 1)]!;
        return {
          async *[Symbol.asyncIterator]() {
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
          },
          finalMessage: async () => ({
            content: [{ type: "text", text }],
            stop_reason: "end_turn",
            stop_details: null,
            usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0 },
          }),
        };
      },
    },
  } as never;
}

const AORTA = "Aorta abdominal de calibre e contornos normais.";
const NORMAL_GLOBAL = "Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.";
const base = (conclusao: string[], aorta = AORTA) =>
  [
    "ULTRASSONOGRAFIA DO ABDOME TOTAL",
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    "Fígado de dimensões normais, contornos regulares e ecotextura homogênea.",
    aorta,
    "Bexiga de forma, contorno e ecotextura normais.",
    "",
    "CONCLUSÃO:",
    ...conclusao,
  ].join("\n");

async function main() {
  // ── detecção do acréscimo ──
  for (const s of [
    "acrescente um cisto simples de 2,0 cm no rim direito",
    "Acrescente no corpo: Aorta abdominal com placas calcificadas parietais.",
    "adicione um mioma intramural de 2,1 cm",
    "inclua nódulo no lobo direito da tireoide",
    "coloca um cálculo de 5 mm no rim esquerdo",
  ]) {
    check(`acréscimo: "${s}"`, isAcrescimo(s));
  }
  for (const s of [
    "troca a frase do líquido para maior bolsão vertical mede 5 cm",
    "muda a frase do líquido, ILA 10,4",
    "no lugar de cisto coloque nódulo",
    "tire o item 2 da conclusão",
  ]) {
    check(`não é acréscimo: "${s}"`, !isAcrescimo(s));
  }

  // ── item de conclusão "exame normal" ──
  for (const s of [
    NORMAL_GLOBAL,
    "Exame dentro dos limites da normalidade.",
    "1. Exame pélvico sem alterações significativas.",
    "Dentro dos limites da normalidade.",
  ]) {
    check(`normal global: "${s}"`, isGlobalNormalItem(s));
  }
  for (const s of ["2) Demais órgãos sem alterações.", "Rins sem alterações ecográficas.", "1) Esteatose hepática."]) {
    check(`não é normal global: "${s}"`, !isGlobalNormalItem(s));
  }

  // ── guard: modelo pôs o achado e esqueceu o item normal → sai e renumera ──
  {
    const edited = base(["1) " + NORMAL_GLOBAL, "2) Placas calcificadas parietais na aorta abdominal."]);
    const g = guardNormalConclusion(edited, "acrescente placas calcificadas na aorta");
    check(
      "guard tira o item normal e deixa o item único sem número",
      g.rejection === null && g.text.endsWith("CONCLUSÃO:\nPlacas calcificadas parietais na aorta abdominal."),
      g.text,
    );
  }
  {
    const edited = base(["1. Esteatose hepática.", "2. Exame dentro dos limites da normalidade.", "3. Cisto simples no rim direito."]);
    const g = guardNormalConclusion(edited, "acrescente cisto simples no rim direito");
    check(
      "guard renumera no formato já usado (1. 2.)",
      g.text.endsWith("CONCLUSÃO:\n1. Esteatose hepática.\n2. Cisto simples no rim direito."),
      g.text,
    );
  }
  // ── guard: só o item normal → recusa (não inventa a conclusão) ──
  {
    const edited = base([NORMAL_GLOBAL], "Aorta abdominal de calibre normal, com placas calcificadas parietais.");
    const g = guardNormalConclusion(edited, "Acrescente no corpo: Aorta abdominal com placas calcificadas parietais.");
    check("guard recusa achado novo com conclusão só normal", g.rejection === "achado novo com conclusão normal — confirme");
  }
  // ── guard não age fora do caso ──
  {
    const edited = base([NORMAL_GLOBAL]);
    check("guard ignora substituição", guardNormalConclusion(edited, "troca a frase do fígado").rejection === null);
    check(
      "guard ignora acréscimo sem achado patológico",
      guardNormalConclusion(edited, "acrescente que o exame foi limitado por gases").rejection === null,
    );
    check(
      "guard ignora acréscimo nos comentários",
      guardNormalConclusion(edited, "acrescente nos comentários paciente com cisto renal conhecido").rejection === null,
    );
    const demais = base(["1) Cisto simples no rim direito.", "2) Demais órgãos sem alterações."]);
    check("guard preserva 'demais órgãos sem alterações'", guardNormalConclusion(demais, "acrescente cisto no rim direito").text === demais);
  }

  // ── editReport: alvo "body" + acréscimo libera a conclusão (antes: recusado) ──
  {
    const baseText = base([NORMAL_GLOBAL]);
    const modelOut = base(
      ["Placas calcificadas parietais na aorta abdominal."],
      "Aorta abdominal de calibre normal, com placas calcificadas parietais.",
    );
    const seen = { users: [] as string[] };
    const r = await editReport({
      baseText,
      instruction: "Acrescente no corpo: Aorta abdominal com placas calcificadas parietais.",
      category: "ABDOMEN_TOTAL",
      target: "body",
      anthropicClient: fakeClient(modelOut, seen),
    });
    check("acréscimo com alvo corpo aceita trocar a conclusão normal", r.accepted, r.reason);
    check("frase normal da aorta saiu", !r.editedText.includes(AORTA), r.editedText);
    check("conclusão normal saiu", !r.editedText.includes(NORMAL_GLOBAL), r.editedText);
    check(
      "diretiva do alvo libera a conclusão só para a coerência",
      /Na CONCLUSÃO, mexa SÓ para trocar a normalidade/.test(seen.users[0] ?? ""),
      seen.users[0],
    );
    check("acertou de primeira → 1 chamada só", seen.users.length === 1, String(seen.users.length));
  }
  // ── editReport: modelo esquece a conclusão → 2ª tentativa apontando o item ──
  {
    const baseText = base([NORMAL_GLOBAL]);
    const esqueceu = base([NORMAL_GLOBAL], "Aorta abdominal de calibre normal, com placas calcificadas parietais.");
    const corrigiu = base(
      ["Placas calcificadas parietais na aorta abdominal."],
      "Aorta abdominal de calibre normal, com placas calcificadas parietais.",
    );
    const seen = { users: [] as string[] };
    const r = await editReport({
      baseText,
      instruction: "Acrescente no corpo: Aorta abdominal com placas calcificadas parietais.",
      category: "ABDOMEN_TOTAL",
      target: "body",
      anthropicClient: fakeClient([esqueceu, corrigiu], seen),
    });
    check("conclusão esquecida → 2ª tentativa aceita", r.accepted && r.editedText === corrigiu, r.reason);
    check(
      "2ª tentativa aponta o item normal",
      seen.users.length === 2 && (seen.users[1] ?? "").includes(`CORREÇÃO: a conclusão continuou afirmando "${NORMAL_GLOBAL}"`),
      seen.users[1],
    );
  }
  // ── editReport: esquece de novo → recusa (não grava laudo contraditório) ──
  {
    const baseText = base([NORMAL_GLOBAL]);
    const modelOut = base([NORMAL_GLOBAL], "Aorta abdominal de calibre normal, com placas calcificadas parietais.");
    const seen = { users: [] as string[] };
    const r = await editReport({
      baseText,
      instruction: "acrescente placas calcificadas parietais na aorta",
      category: "ABDOMEN_TOTAL",
      target: "body",
      anthropicClient: fakeClient(modelOut, seen),
    });
    check("conclusão normal esquecida 2× → recusado e laudo intacto", !r.accepted && r.editedText === baseText, r.reason);
    check("no máximo 2 chamadas", seen.users.length === 2, String(seen.users.length));
  }
  // ── editReport: substituição com alvo corpo continua barrando a conclusão ──
  {
    const baseText = base(["1) Esteatose hepática."]);
    const modelOut = base(["1) Fígado normal."]).replace("Fígado de dimensões normais", "Fígado de dimensões aumentadas");
    const r = await editReport({
      baseText,
      instruction: "troca a frase do fígado para dimensões aumentadas",
      category: "ABDOMEN_TOTAL",
      target: "body",
      anthropicClient: fakeClient(modelOut),
    });
    check("substituição com alvo corpo que mexe na conclusão segue recusada", !r.accepted, r.reason);
  }

  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (fail > 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
