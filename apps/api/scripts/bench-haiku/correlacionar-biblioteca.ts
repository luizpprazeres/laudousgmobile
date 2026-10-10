/**
 * "CORRELACIONAR COM DADOS CLÍNICOS" NA BIBLIOTECA (decisão do Luiz de 10/10: só quando o médico ditar, na redação
 * dele, em todas as categorias). Uma tabela curada de trocas EXATAS, aplicada igual aos snippets e aos blocos do banco:
 *   - correlação clínica colada a um achado ("…, a correlacionar clinicamente.", ". Correlacionar com dados clínicos.")
 *     → sai;
 *   - frase de correlação sozinha, de exemplo/recomendação → fica com a ressalva "só quando o médico ditar";
 *   - linhas de regra para o redator ("sugerir correlação clínica quando aplicável") → "só quando o médico ditar".
 * Condutas específicas (marcadores tumorais, PSA, TSH, FSH/LH, avaliação urológica…) não são desta decisão e ficam.
 *
 *   --snippets   reescreve o corpo de packages/knowledge/snippets/**.md
 *   --sql        lê knowledge_blocks (SÓ LEITURA, status validated) e escreve a PROPOSTA de SQL com guardas
 *                (id + status + md5 do conteúdo atual; aborta tudo se alguma linha não bater) em
 *                docs/stories/haiku-migration/CORRELACIONAR-biblioteca-proposta.sql (+ .json).
 * Em ambos, lista o que o regex ainda acha e a tabela não cobriu (meta: só linhas com a ressalva).
 *
 * Nada é aplicado no banco: o SQL é para o orquestrador aplicar com GO.
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/correlacionar-biblioteca.ts --snippets --sql
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";
import { CORRELACAO_CLINICA_RE } from "../../src/server/pipeline/correlacaoClinica";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });
const argv = process.argv.slice(2);
const SO_DITADA = " — só quando o médico ditar, na redação dele.";

/** [de, para] — trechos exatos. */
export const TROCAS: ReadonlyArray<readonly [string, string]> = [
  // Correlação colada a um achado → sai.
  [" Convém, a critério clínico, complementar com correlação clínico-laboratorial para esclarecimento etiológico.", ""],
  ["podem corresponder a prostatite, a correlacionar clinicamente.", "podem corresponder a prostatite."],
  ["a esclarecer. Correlacionar com dados clínicos.\"", "a esclarecer.\""],
  ["[abscesso/hematoma/cisto de inclusão epidérmica/higroma]. Correlacionar com dados clínicos.\"", "[abscesso/hematoma/cisto de inclusão epidérmica/higroma].\""],
  ["Esplenomegalia (vide medidas). Convém, a critério clínico, correlacionar com quadro clínico-laboratorial.\"", "Esplenomegalia (vide medidas).\""],
  ["\"Ventriculomegalia ___, a correlacionar clinicamente.\"", "\"Ventriculomegalia ___.\""],
  [" (especialmente em correlação clínica com tabagismo, sexo masculino, idade > 50 anos)", ""],
  ["\"Fluxo volumétrico ___ da fístula, a correlacionar clinicamente.\"", "\"Fluxo volumétrico ___ da fístula.\""],
  ["inicial de processo obstrutivo, correlacionar com clínica.", "inicial de processo obstrutivo."],
  ["com calibre de ___ mm. Convém, a critério clínico, complementar com correlação clínica.\"", "com calibre de ___ mm.\""],
  ["prosseguir a avaliação com cirurgião vascular para correlação clínica e definição de conduta.", "prosseguir a avaliação com cirurgião vascular para definição de conduta."],
  ["ajustar tom (correlação clínica para definição de urgência).", "ajustar tom (definição de urgência)."],
  ["Conclusão: \"Linfonodo de aspecto suspeito no nível ___. Correlacionar com achados clínicos.\"", "Conclusão: \"Linfonodo de aspecto suspeito no nível ___.\""],
  ["Sinais de orqui-epididimite à direita. Convém, a critério clínico, correlacionar com quadro clínico-laboratorial.\"", "Sinais de orqui-epididimite à direita.\""],
  ["\"Hidrocele complexa à direita, sugerindo correlação clínica.\"", "\"Hidrocele complexa à direita.\""],
  ["O diagnóstico mais provável é padrão reacional, devendo ser correlacionado com a história clínica.\"", "O diagnóstico mais provável é padrão reacional.\""],
  [" Sugere-se correlação clínica e, se a suspeita clínica persistir, considerar complementação com tomografia ou ressonância cervical.\"", " Se a suspeita clínica persistir, considerar complementação com tomografia ou ressonância cervical.\""],
  ["Próstata difusamente aumentada com hiperemia ao Doppler. Convém, a critério clínico, correlacionar com quadro clínico-laboratorial e considerar prostatite aguda como diagnóstico diferencial.\"", "Próstata difusamente aumentada com hiperemia ao Doppler. Convém, a critério clínico, considerar prostatite aguda como diagnóstico diferencial.\""],
  ["NÃO descarta pielonefrite aguda — convém, a critério clínico, correlacionar com quadro clínico-laboratorial e considerar tomografia com contraste se necessário.\"", "NÃO descarta pielonefrite aguda — convém, a critério clínico, considerar tomografia com contraste se necessário.\""],
  ["X) Convém, a critério clínico, complementar com correlação clínica para estratificação de risco cardiovascular global e, quando indicado, com ITB pós-exercício", "X) Convém, a critério clínico, complementar com ITB pós-exercício"],
  ["\"X) [Achado específico]. Recomenda-se correlação clínica com função renal (creatinina, eletrólitos) e equipe transplantadora.\"", "\"X) [Achado específico]. Recomenda-se correlação com função renal (creatinina, eletrólitos) e equipe transplantadora.\""],
  // Frase de correlação sozinha (exemplo de recomendação) → fica, só quando ditada.
  ["\"Convém, a critério clínico, correlacionar com quadro clínico-laboratorial.\"", `"Convém, a critério clínico, correlacionar com quadro clínico-laboratorial."${SO_DITADA}`],
  ["\"Achado de provável relevância clínica reduzida — correlacionar com queixa clínica.\"", `"Achado de provável relevância clínica reduzida — correlacionar com queixa clínica."${SO_DITADA}`],
  ["\"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica.\"", `"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica."${SO_DITADA}`],
  ["\"Sugere-se correlação clínica com história, sintomatologia infecciosa/inflamatória e exame físico.\"", `"Sugere-se correlação clínica com história, sintomatologia infecciosa/inflamatória e exame físico."${SO_DITADA}`],
  ["\"O diagnóstico definitivo requer correlação clínica e, quando indicado, confirmação histopatológica.\"", `"O diagnóstico definitivo requer correlação clínica e, quando indicado, confirmação histopatológica."${SO_DITADA}`],
  ["\"X) Sugere-se correlação clínica e seguimento conforme conduta da equipe assistente.\"", `"X) Sugere-se correlação clínica e seguimento conforme conduta da equipe assistente."${SO_DITADA}`],
  // Regras para o redator.
  ["SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa e correlação clínica):", "SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa):"],
  ["- Seguir as recomendações das conclusões (correlação clínica; exames laboratoriais; TC cervical ou biópsia por agulha fina quando aplicável).", "- Recomendação (exames laboratoriais; TC cervical ou biópsia por agulha fina; correlação clínica) só quando o médico ditar, na redação dele."],
  ["- A recomendação segue as frases dos cenários (correlação clínica; TC cervical ou biópsia por agulha fina quando aplicável).", "- Recomendação (TC cervical ou biópsia por agulha fina; correlação clínica) só quando o médico ditar, na redação dele."],
  ["Possíveis causas para correlação clínica:", "Possíveis causas (contexto para o redator, não vão para o laudo sem ditado):"],
  ["- Não recomendar conduta cirúrgica/intervencionista — apenas sugerir correlação clínica quando aplicável.", "- Não recomendar conduta cirúrgica/intervencionista; correlação clínica só quando o médico ditar, na redação dele."],
  ["- Não prescrever conduta — apenas correlação clínica.", "- Não prescrever conduta; correlação clínica só quando o médico ditar, na redação dele."],
  ["— recomendar correlação clínica quando relevante.", "— correlação clínica só quando o médico ditar, na redação dele."],
];

/** Linha que o regex ainda acha e não está marcada como "só quando ditada". */
const sobra = (texto: string) =>
  texto.split("\n").filter((l) => CORRELACAO_CLINICA_RE.test(l) && !/^tags:/.test(l) && !/só quando o médico ditar/.test(l));

function aplicar(texto: string): { texto: string; usadas: number[] } {
  let t = texto;
  const usadas: number[] = [];
  TROCAS.forEach(([de, para], i) => {
    if (!t.includes(de)) return;
    // A frase sozinha não pode reaplicar a ressalva (idempotência).
    if (para.includes(SO_DITADA) && t.includes(para)) return;
    t = t.split(de).join(para);
    usadas.push(i);
  });
  return { texto: t, usadas };
}

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : p.endsWith(".md") ? [p] : [];
  });
}

function snippets() {
  const raiz = join(REPO, "packages/knowledge/snippets");
  let n = 0;
  const restos: string[] = [];
  for (const f of arquivos(raiz)) {
    const s = readFileSync(f, "utf8");
    const m = /^(---\n[\s\S]*?\n---\n)([\s\S]*)$/.exec(s);
    const [cabeca, corpo] = m ? [m[1], m[2]] : ["", s];
    const r = aplicar(corpo);
    if (r.usadas.length) {
      writeFileSync(f, cabeca + r.texto);
      n++;
      console.log(`${relative(REPO, f)}: trocas ${r.usadas.join(",")}`);
    }
    for (const l of sobra(r.texto)) restos.push(`${relative(REPO, f)}: ${l.trim().slice(0, 160)}`);
  }
  console.log(`snippets alterados: ${n}; linhas que ainda casam sem a ressalva: ${restos.length}`);
  for (const r of restos) console.log(`  SOBRA ${r}`);
}

async function sqlProposta() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select kb.id, kb.category_code cat, ws.code estilo, kb.kind, kb.title, kb.content
    from knowledge_blocks kb join writing_styles ws on ws.id = kb.writing_style_id
    where kb.status = 'validated' order by kb.category_code, kb.title, ws.code`;
  await sql.end();
  const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
  const restos: string[] = [];
  const mudancas = rows.flatMap((r) => {
    const out = aplicar(r.content);
    for (const l of sobra(out.texto)) restos.push(`${r.cat}/${r.kind}/${r.title} (${r.estilo}): ${l.trim().slice(0, 160)}`);
    return out.usadas.length ? [{ ...r, novo: out.texto, trocas: out.usadas }] : [];
  });
  // Blocos que a proposta dos TERMOS também muda: aplicar uma muda o md5 da outra.
  const termosJson = join(REPO, "docs/stories/haiku-migration/TERMOS-biblioteca-proposta.json");
  const termos = existsSync(termosJson) ? new Set((JSON.parse(readFileSync(termosJson, "utf8")) as { id: string }[]).map((x) => x.id)) : new Set<string>();
  const emComum = mudancas.filter((m) => termos.has(m.id)).length;
  const data = new Date().toISOString().slice(0, 10);
  const linhas = [
    "-- CORRELACIONAR (decisão do Luiz 10/10: \"Correlacionar com dados clínicos\" só quando ditado) — PROPOSTA, NÃO APLICADA.",
    "-- Gerada por apps/api/scripts/bench-haiku/correlacionar-biblioteca.ts a partir de knowledge_blocks (status validated)",
    "-- com a tabela curada de trocas exatas (a mesma aplicada aos snippets do repositório).",
    `-- ${mudancas.length} blocos de ${rows.length} validados. Condutas específicas (PSA, marcadores, TSH…) ficam.`,
    `-- GUARDAS: cada UPDATE exige id, status validated E md5 do conteúdo lido em ${data};`,
    "-- se qualquer bloco tiver mudado desde então, a transação inteira aborta (nada é aplicado).",
    `-- ${emComum} destes blocos também estão na proposta dos TERMOS: aplicada uma, regenere a outra (o script relê o banco).`,
    "-- O embedding não é recalculado (frase de conduta retirada; reingestão opcional).",
    "begin;",
    "do $correlacionar$",
    "declare n int;",
    "begin",
  ];
  for (const m of mudancas) {
    linhas.push(
      `  -- ${m.cat} ${m.estilo} ${m.kind} ${m.title}: trocas ${m.trocas.join(",")}`,
      `  update knowledge_blocks set content = $c$${m.novo}$c$, version = version + 1, updated_at = now()`,
      `   where id = '${m.id}' and status = 'validated' and md5(content) = '${md5(m.content)}';`,
      "  get diagnostics n = row_count;",
      `  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '${m.id}', n; end if;`,
    );
  }
  linhas.push("end", "$correlacionar$;", "commit;", "");
  if (mudancas.some((m) => m.novo.includes("$c$") || m.novo.includes("$correlacionar$"))) throw new Error("delimitador no conteúdo");
  writeFileSync(join(REPO, "docs/stories/haiku-migration/CORRELACIONAR-biblioteca-proposta.sql"), linhas.join("\n"));
  writeFileSync(
    join(REPO, "docs/stories/haiku-migration/CORRELACIONAR-biblioteca-proposta.json"),
    JSON.stringify(
      mudancas.map(({ id, cat, estilo, kind, title, trocas }) => ({ id, cat, estilo, kind, title, trocas: trocas.map((i) => TROCAS[i]) })),
      null,
      2,
    ) + "\n",
  );
  console.log(`knowledge_blocks validados: ${rows.length}; com troca: ${mudancas.length}; em comum com TERMOS: ${emComum}; linhas que ainda casam sem a ressalva: ${restos.length}`);
  for (const r of restos) console.log(`  SOBRA ${r}`);
}

(async () => {
  if (argv.includes("--snippets")) snippets();
  if (argv.includes("--sql")) await sqlProposta();
})().catch((e) => { console.error(e); process.exit(1); });
