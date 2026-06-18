/**
 * PoC da camada flexível: a extração captura CONTEÚDO clínico livre (ex.: comparação
 * com exame anterior) LIMPO — a substância, sem as palavras de comando ("adicione
 * um item") nem ruído. Roda no ditado REAL (caso 6, que tem comparação + comandos).
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/camada-flexivel-poc.manual.ts
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rows = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8")) as { raw_input: string }[];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ig_semanas", "ig_dias", "itens_conclusao_livres", "comandos_detectados"],
  properties: {
    ig_semanas: { type: ["number", "null"] },
    ig_dias: { type: ["number", "null"] },
    // CONTEÚDO clínico livre que o médico quer na conclusão e não tem campo próprio.
    itens_conclusao_livres: { type: "array", items: { type: "string" } },
    // Só para o PoC mostrar a separação: o que era COMANDO (não vira conteúdo).
    comandos_detectados: { type: "array", items: { type: "string" } },
  },
} as const;

const PROMPT = `Você é a EXTRAÇÃO do LaudoUSG (obstétrico). Extraia o JSON. NÃO redija laudo.

REGRA DA CAMADA FLEXÍVEL — classifique a fala em 3 tipos:
1. CONTEÚDO clínico que o médico quer NO LAUDO e não cabe nos campos estruturados
   (ex.: comparação com exame anterior, observação clínica): coloque a SUBSTÂNCIA,
   LIMPA, em itens_conclusao_livres — nas palavras do médico, mas SEM as palavras de
   comando ("adicione um item", "no final coloque", "acrescente") e SEM ruído.
   Ex.: "adicione 1 item: o exame atual comparado ao anterior de 19/05 mostra evolução
   normal" → itens_conclusao_livres: ["O exame atual, comparado ao anterior realizado
   em 19/05/2026, mostra evolução normal da gestação."]
2. COMANDO de edição ("corrija o item 1", "vírgula", "remova"): coloque em
   comandos_detectados (NÃO vira conteúdo do laudo).
3. RUÍDO (hesitação, "deixa eu ver"): DESCARTE.
ig_semanas/ig_dias = IG da biometria atual. NUNCA invente nada.`;

const run = async () => {
  for (const idx of [5, 1]) { // caso 6 (comparação) e caso 2 (sem item livre)
    const raw = rows[idx]!.raw_input;
    const res = await client.chat.completions.create({
      model: "gpt-4.1-mini", temperature: 0, max_tokens: 4000,
      response_format: { type: "json_schema", json_schema: { name: "Flex", strict: true, schema: SCHEMA } },
      messages: [{ role: "system", content: PROMPT }, { role: "user", content: `Ditado:\n${raw}` }],
    } as never);
    const f = JSON.parse((res as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "{}");
    console.log(`\n===== caso ${idx + 1} =====`);
    console.log("itens_conclusao_livres:", JSON.stringify(f.itens_conclusao_livres, null, 0));
    console.log("comandos_detectados:   ", JSON.stringify(f.comandos_detectados, null, 0));
    const itens = (f.itens_conclusao_livres ?? []).join(" ");
    const limpo = !/adicione|acrescente|no final|coloque|item 1 da/i.test(itens);
    console.log(limpo ? "  ✓ conteúdo LIMPO (sem palavra de comando)" : "  ✗ vazou comando no conteúdo");
  }
  console.log("\n✓ PoC concluído");
};
run().catch((e) => { console.error(e); process.exit(1); });
