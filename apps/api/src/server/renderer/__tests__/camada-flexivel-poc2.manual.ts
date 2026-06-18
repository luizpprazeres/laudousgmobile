/**
 * PoC v2 da camada flexível: itens_conclusao_livres ADICIONADO ao schema COMPLETO
 * do OBSTETRICA. Prova que, com os campos estruturados presentes, a IA roteia
 * IG/1ªUS/etc. para eles e deixa SÓ o conteúdo extra (comparação) no campo livre —
 * sem duplicar o que já é determinístico.
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/camada-flexivel-poc2.manual.ts
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { EXTRACTORS } from "../extraction";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ext = EXTRACTORS.OBSTETRICA!;
const rows = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8")) as { raw_input: string }[];

// Clona o schema completo + adiciona o campo livre.
const baseSchema = ext.jsonSchema as { required: string[]; properties: Record<string, unknown> };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...baseSchema.required, "itens_conclusao_livres"],
  properties: { ...baseSchema.properties, itens_conclusao_livres: { type: "array", items: { type: "string" } } },
};

const PROMPT = ext.prompt + `

CAMADA FLEXÍVEL — itens_conclusao_livres: APENAS conteúdo clínico que o médico quer
na conclusão e que NÃO cabe em NENHUM outro campo deste schema (ex.: comparação com
exame anterior, observação clínica solta). NÃO repita aqui IG, 1ª US, líquido, peso,
nem nada já capturado por um campo próprio. Coloque a SUBSTÂNCIA LIMPA, sem palavras
de comando ("adicione um item", "no final coloque") e sem ruído. Vazio se não houver.`;

const run = async () => {
  for (const idx of [5, 2]) { // caso 6 (tem comparação) e caso 3 (não tem item extra)
    const raw = rows[idx]!.raw_input;
    const res = await client.chat.completions.create({
      model: "gpt-4.1-mini", temperature: 0, max_tokens: 8000,
      response_format: { type: "json_schema", json_schema: { name: "ObstFlex", strict: true, schema: SCHEMA } },
      messages: [{ role: "system", content: PROMPT }, { role: "user", content: `Ditado:\n${raw}` }],
    } as never);
    const f = JSON.parse((res as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "{}");
    console.log(`\n===== caso ${idx + 1} =====`);
    console.log("  ig:", `${f.ig_semanas}s${f.ig_dias ?? 0}d`, "| primeira_us_data:", f.primeira_us_data);
    console.log("  itens_conclusao_livres:", JSON.stringify(f.itens_conclusao_livres));
    const itens = (f.itens_conclusao_livres ?? []).join(" ");
    const semDup = !/biometria atual|devendo ser corrigida|ultrassonografia realizada|primeira u/i.test(itens);
    const semCmd = !/adicione|acrescente|no final|tem 1|item 1 da/i.test(itens);
    console.log(`  ${semDup ? "✓" : "✗"} sem duplicar determinístico | ${semCmd ? "✓" : "✗"} sem comando`);
  }
  console.log("\n✓ PoC v2 concluído");
};
run().catch((e) => { console.error(e); process.exit(1); });
