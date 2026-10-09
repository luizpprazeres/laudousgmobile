/**
 * BANCADA — laudos reais com Claude Haiku 5.5 (via ASSINATURA, sem API). Nasceu no ABDOMEN_TOTAL;
 * desde o W4 (09/10) cobre as categorias do renderer, dos writers dedicados e do writer genérico.
 *
 * Para cada laudo real de abdome total com laudo final salvo, roda:
 *   replay — achados extraídos em produção (generation_audit) → renderer atual.
 *            Prova que a bancada reproduz o pipeline (deve bater com generated_output).
 *   A      — Haiku 5.5 extrai os achados → renderer determinístico atual (+ free-slots
 *            também no Haiku) → guards do caminho renderer.
 *   B      — Haiku 5.5 escreve o laudo inteiro, com o MESMO prompt do Laudo Livre
 *            roteado (contrato + bundle completo da categoria) → guards do writer.
 * e compara com o laudo final do médico (e com o que o gpt saiu em produção).
 *
 * Toda chamada `api.openai.com/chat/completions` é interceptada no `fetch` e
 * respondida pelo `claude -p`. Qualquer outra chamada OpenAI é bloqueada.
 *
 * Rodar (de apps/api):
 *   pnpm exec tsx scripts/bench-haiku/bench-abdomen.ts [--days 45] [--only id8,id8] [--reps 1] [--no-judge]
 * Saída: tmp-review/bench-haiku/<timestamp>/ (gitignored — contém ditados reais).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { callClaude } from "./claudeCli";
import { callCodex } from "./codexCli";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });

// ---- Flags de produção (vercel env pull, 09/10/2026). As Sensitive vêm redigidas;
// as que importam aqui estão fixadas abaixo com o valor inferido da auditoria.
Object.assign(process.env, {
  COMMAND_INTERPRETER: "true",
  COMMAND_OPERATIONS: "true",
  COMMAND_PREGEN: "true",
  IG_REFERENCE_CORRECTION: "true",
  // Lista de produção (W4, 09/10): o .env local está defasado (10 categorias); a auditoria
  // (generation_audit 90d) mostra renderer também em DOPPLER_OBSTETRICO, MUSCULOESQUELETICO_V2,
  // PROSTATA_SUPRAPUBICA e CERVICOMETRIA. DOPPLER_CAROTIDAS, PAREDE_ABDOMINAL e ESCROTAL saem pelo writer.
  RENDERER_CATEGORIES:
    process.env.BENCH_RENDERER_CATEGORIES ??
    "ABDOMEN_TOTAL,OBSTETRICA,DOPPLER_OBSTETRICO,MORFOLOGICO,CERVICOMETRIA,TIREOIDE,MAMARIA,PARTES_MOLES,CERVICAL,ABDOMEN_SUPERIOR,PELVE_FEMININA,VIAS_URINARIAS,MUSCULOESQUELETICO_V2,PROSTATA_SUPRAPUBICA",
  // Writers dedicados dentro do caminho renderer (Sensitive no Vercel). Valores provados pela
  // auditoria: 59/59 MSK, 68/68 PELVE e 1/1 PARTES_MOLES dos últimos 90 dias saíram com
  // "[renderer/v1] <CAT> writer_guarded (gpt-4.1, …)"; 2 MSK com "MSK passthrough".
  MSK_WRITER: process.env.BENCH_MSK_WRITER ?? "true",
  MSK_PASSTHROUGH: process.env.BENCH_MSK_PASSTHROUGH ?? "true",
  PELVE_WRITER: process.env.BENCH_PELVE_WRITER ?? "true",
  PARTES_MOLES_WRITER: process.env.BENCH_PARTES_MOLES_WRITER ?? "true",
  // Flags obstétricas de produção (Sensitive no Vercel; valores da memória/README — o replay confere).
  MODEL_CATALOG_CATEGORIES: process.env.BENCH_MODEL_CATALOG_CATEGORIES ?? "OBSTETRICA",
  OBST_BIOMETRIA_DET: process.env.BENCH_OBST_BIOMETRIA_DET ?? "true",
  FLEXIBLE_CONCLUSION: process.env.BENCH_FLEXIBLE_CONCLUSION ?? "true",
  GRANNUM_PLACENTA: process.env.BENCH_GRANNUM_PLACENTA ?? "true",
  OBST_IG_SANITY: process.env.BENCH_OBST_IG_SANITY ?? "true",
  DOPPLER_UMBILICAL_SAFETY: process.env.BENCH_DOPPLER_UMBILICAL_SAFETY ?? "true",
  GOLF_BALL_SNIPPET: process.env.BENCH_GOLF_BALL_SNIPPET ?? "true",
  ASR_CLINICAL: process.env.BENCH_ASR_CLINICAL ?? "true",
  // Guards de categoria ligados em produção (memória gaps-auditoria/tireoide-pico; o replay da
  // mama só bate com o "[REVISAR: … BI-RADS …]" de produção com MAMARIA_BIRADS_GUARD ligado).
  MAMARIA_BIRADS_GUARD: process.env.BENCH_MAMARIA_BIRADS_GUARD ?? "true",
  TIREOIDE_PICO_OMIT: process.env.BENCH_TIREOIDE_PICO_OMIT ?? "true",
  PELVE_CONCL_DEDUP: process.env.BENCH_PELVE_CONCL_DEDUP ?? "true",
  OBST_REF_DEDUP: process.env.BENCH_OBST_REF_DEDUP ?? "true",
  WRITER_V2_CATEGORIES: "",
  OPENAI_MODEL_STRUCTURER: "bench-structurer",
  OPENAI_MODEL_WRITER: "bench-writer",
  // Garante que NENHUMA chamada vá à OpenAI de verdade.
  OPENAI_API_KEY: "sk-bench-blocked-no-real-openai-calls",
});
delete process.env.ANTHROPIC_API_KEY;

const HAIKU = process.env.BENCH_MODEL ?? "claude-haiku-5-5";
const JUDGE = process.env.BENCH_JUDGE_MODEL ?? "claude-opus-5-5";
const EFFORT = (process.env.BENCH_EFFORT ?? "medium") as "low" | "medium" | "high";

// ---- CLI args
const argv = process.argv.slice(2);
const arg = (k: string, d?: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const DAYS = Number(arg("days", "45"));
const ONLY = (arg("only", "") ?? "").split(",").filter(Boolean);
const REPS = Number(arg("reps", "1"));
const CONC = Number(arg("concurrency", "3"));
const JUDGE_ON = !argv.includes("--no-judge");
// --category OBSTETRICA,DOPPLER_OBSTETRICO (default ABDOMEN_TOTAL)
const CATEGORIES = (arg("category", "ABDOMEN_TOTAL") ?? "ABDOMEN_TOTAL").split(",").map((c) => c.trim()).filter(Boolean);
// --scenarios A,B2 (default A,B). Chaves: A (Haiku extrai), B (Haiku escreve), B2 (B + patch), L (Luna extrai).
const SCEN = (arg("scenarios", "A,B") ?? "A,B").split(",").map((c) => c.trim()).filter(Boolean);
// --luna: acrescenta o cenário L (GPT-6 Luna extrai via Codex/assinatura; free-slots também
// no Luna: gpt-5.4-mini não roda no Codex com conta ChatGPT). --reuse <rodada>: reaproveita gpt/A/B de
// uma rodada anterior e só roda o que falta; o juiz reavalia TODOS juntos (mesma régua).
const LUNA = argv.includes("--luna");
const LUNA_MODEL = process.env.BENCH_LUNA_MODEL ?? "gpt-6-luna";
const LUNA_FREESLOT_MODEL = process.env.BENCH_LUNA_FREESLOT_MODEL ?? "gpt-6-luna";
const REUSE = arg("reuse");
// --rejudge <rodada>: só reavalia (juiz) os textos já gerados de uma rodada; não chama modelo gerador.
const REJUDGE = arg("rejudge");
// --b2: cenário B2 = Haiku escritor com o PATCH "corpo descritivo" aplicado ao system prompt
// (só no teste; o prompt de produção não muda).
const B2 = argv.includes("--b2");
// --a-key AR: grava o cenário A com outro nome (ex.: PELVE com BENCH_PELVE_WRITER=false =
// "Haiku extrai + renderer"), para comparar com o A de outra rodada via --reuse.
const A_KEY = arg("a-key", "A")!;
const SCEN_KEYS = ["R", "A", "AR", "B", "L", "B2"];
const OUT_ROOT = process.env.BENCH_OUT_ROOT ?? join(REPO, "tmp-review/bench-haiku");

const REGRA_ANTIGA_GLOBAL =
  '- NUNCA fazer diagnóstico definitivo. Use sempre "compatível com X" / "sugestivo de X" / "achados em concordância com X" — nunca "diagnóstico de X" / "trata-se de X".';
const REGRA_NOVA_GLOBAL = `- NUNCA fazer diagnóstico definitivo. Na CONCLUSÃO, use "compatível com X" / "sugestivo de X" / "achados em concordância com X" — nunca "diagnóstico de X" / "trata-se de X".

CORPO DESCRITIVO, CONCLUSÃO DIAGNÓSTICA (regra da casa, inegociável):
- No corpo ("OS SEGUINTES ASPECTOS FORAM OBSERVADOS"), descreva só o que se vê: ecogenicidade, ecotextura, contornos/margens, paredes, medidas, localização, fenômenos acústicos (sombra, reforço, atenuação) e vascularização.
- NUNCA termine uma descrição do corpo com "compatível com…", "sugestivo de…", "achados em concordância com…", "caracterizando…", nem nomeie ali o diagnóstico. A interpretação aparece UMA vez, na conclusão — repetir no corpo é redundante.
- Se o médico ditar a interpretação junto da descrição ("…com sombra acústica, compatível com cálculo"), mantenha a descrição no corpo e leve a interpretação para a conclusão. Só a escreva no corpo se ele mandar explicitamente ("no corpo escreva…").
- Exemplo. Ditado: "cisto simples no rim direito, 2,1 x 1,8 cm, polo superior". Corpo: "Rim direito … apresentando imagem anecoica homogênea, de paredes finas e com reforço acústico posterior, medindo 2,1 x 1,8 cm, situada no polo superior." Conclusão: "Cisto simples no rim direito."`;
const REGRA_ANTIGA_CONTRATO = "9. NÃO usar linguagem alarmista. A hipótese diagnóstica entra preferencialmente na CONCLUSÃO.";
const REGRA_NOVA_CONTRATO = "9. NÃO usar linguagem alarmista. A hipótese diagnóstica entra SOMENTE na CONCLUSÃO; o corpo é descritivo (ver regra da casa \"CORPO DESCRITIVO\").";
function patchCorpoDescritivo(system: string): string {
  if (!system.includes(REGRA_ANTIGA_GLOBAL)) throw new Error("bench --b2: regra global não encontrada no prompt (o texto mudou?)");
  return system.replace(REGRA_ANTIGA_GLOBAL, REGRA_NOVA_GLOBAL).replace(REGRA_ANTIGA_CONTRATO, REGRA_NOVA_CONTRATO);
}

// ---- Interceptação do fetch
const schemaNameOf = (body: any): string | null => body.response_format?.json_schema?.name ?? null;
type Ctx = { mode: "replay" | "haiku" | "luna"; promptPatch?: boolean; caseId: string; storedFindings?: unknown; log: string };
const ctx = new AsyncLocalStorage<Ctx>();
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input?.url ?? String(input);
  if (!/api\.openai\.com/.test(url)) return realFetch(input, init);
  if (!/\/chat\/completions/.test(url)) {
    throw new Error(`bench: chamada OpenAI bloqueada (${url})`);
  }
  const c = ctx.getStore();
  if (!c) throw new Error("bench: chamada OpenAI fora de um caso");
  const body = JSON.parse(init?.body ?? "{}");
  const systemRaw = body.messages?.find((m: any) => m.role === "system")?.content ?? "";
  const system = c.promptPatch && !schemaNameOf(body) ? patchCorpoDescritivo(systemRaw) : systemRaw;
  const user = body.messages?.filter((m: any) => m.role === "user").map((m: any) => m.content).join("\n\n") ?? "";
  const schema = body.response_format?.json_schema?.schema;
  const schemaName = body.response_format?.json_schema?.name ?? null;

  let content: string;
  let usage = { prompt_tokens: 0, completion_tokens: 0 };
  let ms = 0;
  if (c.mode === "replay") {
    if (schemaName === "FreeSlots") {
      const n = (user.match(/^\d+\./gm) ?? []).length;
      content = JSON.stringify({ itens: Array.from({ length: n }, () => ({ corpo: "[[FREE-SLOT NÃO REPRODUZÍVEL]]", conclusao: null })) });
    } else {
      content = JSON.stringify(c.storedFindings);
    }
  } else if (c.mode === "luna") {
    const model = schemaName === "FreeSlots" ? LUNA_FREESLOT_MODEL : LUNA_MODEL;
    const r = await callCodex({ model, system, user, schema, reasoning: "none" });
    content = r.text;
    usage = { prompt_tokens: r.inputTokens, completion_tokens: r.outputTokens };
    ms = r.ms;
  } else {
    const r = await callClaude({ model: HAIKU, system, user, schema, effort: EFFORT });
    content = r.text;
    usage = { prompt_tokens: r.inputTokens, completion_tokens: r.outputTokens };
    ms = r.ms;
  }
  appendFileSync(
    c.log,
    JSON.stringify({ case: c.caseId, mode: c.mode, schemaName, ms, usage, system_len: system.length, user, content }) + "\n",
  );

  if (body.stream) {
    const chunk = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
    const sse =
      chunk({ id: "bench", object: "chat.completion.chunk", created: 0, model: HAIKU, choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }] }) +
      chunk({ id: "bench", object: "chat.completion.chunk", created: 0, model: HAIKU, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }) +
      chunk({ id: "bench", object: "chat.completion.chunk", created: 0, model: HAIKU, choices: [], usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens } }) +
      "data: [DONE]\n\n";
    return new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } });
  }
  return new Response(
    JSON.stringify({
      id: "bench", object: "chat.completion", created: 0, model: HAIKU,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}) as typeof fetch;

// ---- Métricas determinísticas
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N},.]+/gu, " ").trim();
function wordSimilarity(a: string, b: string): number {
  const x = norm(a).split(" ").filter(Boolean);
  const y = norm(b).split(" ").filter(Boolean);
  if (!x.length && !y.length) return 1;
  let prev = new Array(y.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}
const numbers = (s: string) =>
  new Set((s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(".", ",")).filter((n) => n !== "1" && n !== "2" && n !== "3"));
function numberFidelity(candidate: string, final: string) {
  const f = numbers(final);
  const c = numbers(candidate);
  const missing = [...f].filter((n) => !c.has(n));
  const extra = [...c].filter((n) => !f.has(n));
  return { missing, extra };
}

// ---- Juiz (Opus 5.5 via assinatura), cego para a origem de cada candidato
const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["avaliacoes"],
  properties: {
    avaliacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rotulo", "nota", "omissoes", "invencoes", "erros_medida_lateralidade", "impressao_ok", "estilo", "comentario"],
        properties: {
          rotulo: { type: "string" },
          nota: { type: "number", description: "0 a 10: qualidade clínica global frente ao laudo final do médico" },
          omissoes: { type: "array", items: { type: "string" }, description: "achados ditados/presentes no final que faltam" },
          invencoes: { type: "array", items: { type: "string" }, description: "afirmações sem base no ditado (inclui normalidade presumida de algo patológico)" },
          erros_medida_lateralidade: { type: "array", items: { type: "string" } },
          impressao_ok: { type: "boolean", description: "a impressão/conclusão diz o mesmo que a do final" },
          estilo: { type: "number", description: "0 a 10: proximidade de redação/estrutura com o final" },
          comentario: { type: "string" },
        },
      },
    },
  },
} as const;

const EXAME_LABEL: Record<string, string> = {
  ABDOMEN_TOTAL: "ABDOME TOTAL", ABDOMEN_SUPERIOR: "ABDOME SUPERIOR", OBSTETRICA: "OBSTÉTRICA (com ou sem Doppler)",
  DOPPLER_OBSTETRICO: "DOPPLER OBSTÉTRICO", MORFOLOGICO: "MORFOLÓGICA", MUSCULOESQUELETICO_V2: "MUSCULOESQUELÉTICA",
  MAMARIA: "MAMÁRIA", PELVE_FEMININA: "PÉLVICA FEMININA (via abdominal e/ou transvaginal)", TIREOIDE: "DA TIREOIDE",
  PAREDE_ABDOMINAL: "DA PAREDE ABDOMINAL", ESCROTAL: "ESCROTAL / BOLSA TESTICULAR", VIAS_URINARIAS: "DAS VIAS URINÁRIAS",
  CERVICAL: "CERVICAL", PROSTATA_SUPRAPUBICA: "DA PRÓSTATA (via suprapúbica)", DOPPLER_CAROTIDAS: "DOPPLER DE CARÓTIDAS E VERTEBRAIS",
  PARTES_MOLES: "DE PARTES MOLES",
};
/**
 * Regras do juiz específicas da categoria (contratos em src/server/prompts/contracts/ e
 * docs/estilo-casa-regras-gerais.md). Entram ao lado das regras gerais da casa.
 */
const REGRAS_CATEGORIA: Record<string, string> = {
  OBSTETRICA: `- OBSTÉTRICO: biometria (DBP, CC, CA, CF), peso fetal e percentil, idade gestacional e datação (DUM / 1ª US), BCF, apresentação, placenta (localização, grau),
  líquido amniótico (ILA/MBV e sua classe), número de fetos e índices Doppler (IP da umbilical, ACM, uterinas, RCP e percentis) — número trocado, percentil ou
  classe divergente do ditado/final, ou omissão de qualquer um deles, é grave;`,
  MUSCULOESQUELETICO_V2: `- MSK: lateralidade (direito/esquerdo) SEMPRE individualizada; lado trocado ou ausente é grave. Exame bilateral = os dois lados descritos, um após o outro.
- Cobertura: toda estrutura do exame (tendões, ligamentos, bursas, articulação, polias/túneis quando for o caso) descrita no corpo; estrutura ditada como alterada que sai
  "normal", ou estrutura de outra articulação acrescentada, é grave. Medidas de rotura/espessura/coleção com unidade correta.
- Corpo descreve (espessamento, hipoecogenicidade, descontinuidade de fibras, líquido); diagnóstico (tendinopatia, rotura parcial, bursite) só na conclusão.`,
  MAMARIA: `- MAMA: a categoria BI-RADS® é a do médico — BI-RADS diferente do ditado/final, BI-RADS inventado sem o médico informar, ou BI-RADS omitido quando ditado é grave.
  BI-RADS só no item de maior categoria. Lateralidade, quadrante/hora, distância do mamilo e medidas de cada imagem são graves.
- Léxico ACR: margens "circunscritas" (nunca "regulares"), orientação paralela/não paralela; "imagem" na descrição. Recomendação coerente com a categoria do médico.
- Rodapé BI-RADS (Breast Imaging Reporting and Data System…) é obrigatório quando o final o tem.`,
  TIREOIDE: `- TIREOIDE: medidas dos lobos e do istmo, volume (quando informado) e medidas de cada nódulo; lobo trocado é grave.
- TI-RADS (ACR) e Nota Final (Domingos) são do médico: NUNCA calculados pela IA. Pontuação/categoria diferente do ditado/final, inventada ou omitida é grave.
  Cada nódulo tem item de conclusão com a sua classificação. Rodapé com créditos Domingos/ACR quando houver nódulo classificado.
- Sem Doppler ditado, não descrever vascularização dos lobos. Linfonodos normais ficam só no corpo. "istmo" sem acento.`,
  PELVE_FEMININA: `- PELVE: via (transabdominal/transvaginal) correta; medidas do útero (3 eixos) e volume, espessura endometrial, medidas/volume de cada ovário; ovário trocado é grave.
- Menopausa/pós-menopausa ditada muda o texto (endométrio atrófico, ovários de dimensões reduzidas) — ignorá-la é grave. Miomas: número, localização (FIGO quando ditada) e medidas.
- DIU: posição em relação ao fundo/cavidade. Líquido livre não ditado = invenção grave. O-RADS só quando coerente com o ditado.
- Conclusão da casa: "que tem como diagnóstico mais provável X"; recomendação "Convém, a critério clínico, … com objetivo de …".`,
  CERVICAL: `- CERVICAL: nível de Robbins de cada linfonodo/imagem (ditado ou inequívoco), lateralidade, medidas, hilo (preservado/ausente) e vascularização.
  Ordem da casa: descrição primeiro, localização + Doppler no fim. Narração do médico ("estou vendo…") não pode vazar para o laudo.`,
  PROSTATA_SUPRAPUBICA: `- PRÓSTATA: três medidas, volume e peso estimado como ditados (não recalcular), bexiga (paredes, conteúdo) e resíduo pós-miccional (quando ditado).
  Volume/peso divergente é grave. Protrusão intravesical/lobo mediano, quando ditado, não pode sumir.`,
  VIAS_URINARIAS: `- VIAS URINÁRIAS: medidas de cada rim e espessura do parênquima quando ditadas; lado trocado é grave. Cálculos (número, tamanho, localização, sombra),
  hidronefrose/ectasia (grau) e bexiga (paredes, volume pré/pós-miccional, resíduo) como ditados.`,
  PAREDE_ABDOMINAL: `- PAREDE ABDOMINAL: hérnia — localização (umbilical, epigástrica, incisional, inguinal…), medida do anel/colo e do saco, conteúdo (gordura/alça),
  redutibilidade e comportamento à manobra de Valsalva como ditados. Diástase dos retos com a distância. Lado trocado ou medida divergente é grave.`,
  ESCROTAL: `- ESCROTAL: medidas/volume de cada testículo, epidídimos, plexo pampiniforme; lado trocado é grave. Varicocele: calibre máximo, refluxo/duração à Valsalva.
  Microlitíase/massa: conduta da casa (§4 das regras). COMENTÁRIOS numa linha. Título sem Doppler → "Complementamos o estudo com Doppler colorido…" no corpo.`,
  DOPPLER_CAROTIDAS: `- CARÓTIDAS: título "ULTRASSONOGRAFIA DOPPLER DE CARÓTIDAS E VERTEBRAIS"; laudo único bilateral. Espessura médio-intimal, placas (localização, superfície,
  ecogenicidade, extensão), grau de estenose, PSV/VDF/IR da comum, interna E externa, e vertebrais (fluxo e sentido). Valor trocado entre lados é grave.
  Linha em branco entre o lado direito e o esquerdo. Estenose crítica/oclusão → conduta de urgência vascular da casa.`,
  PARTES_MOLES: `- PARTES MOLES: localização (região, plano/profundidade), lateralidade, três medidas, ecogenicidade, contornos, conteúdo e vascularização como ditados.
  Título sem Doppler → "Complementamos o estudo com Doppler colorido…" no corpo. Diagnóstico (lipoma, cisto epidermoide…) só na conclusão.`,
  ABDOMEN_SUPERIOR: `- ABDOME SUPERIOR: fígado, vias biliares, vesícula, pâncreas, baço (e rins se ditados) com as medidas ditadas; esteatose/grau só se ditado.`,
};
REGRAS_CATEGORIA.DOPPLER_OBSTETRICO = REGRAS_CATEGORIA.OBSTETRICA;
REGRAS_CATEGORIA.MORFOLOGICO = REGRAS_CATEGORIA.OBSTETRICA;
const judgeSystemFor = (cat: string) => `Você é radiologista sênior auditando laudos de ultrassonografia ${EXAME_LABEL[cat] ?? cat} gerados por IA.
Você recebe o DITADO do médico, o LAUDO FINAL que o médico assinou (padrão-ouro de conteúdo e estilo) e candidatos rotulados.
Avalie cada candidato contra o laudo final e o ditado. Priorize segurança clínica:
- omissão de achado ditado ou presente no final = grave;
- invenção (achado, medida, grau, normalidade presumida de órgão alterado) = grave;
- medida, unidade ou lateralidade errada = grave;
- impressão/conclusão que diz algo diferente do final = grave;
${REGRAS_CATEGORIA[cat] ?? ""}
- diferenças só de redação/ordem/formatação pesam pouco (vão para "estilo").
Se o médico corrigiu algo no final que NÃO estava no ditado, não penalize o candidato por isso — mencione no comentário.

REGRAS DA CASA (docs/estilo-casa-regras-gerais.md) — violação é ERRO, não preferência de estilo:
- CORPO É DESCRITIVO; DIAGNÓSTICO SÓ NA CONCLUSÃO. No corpo ("OS SEGUINTES ASPECTOS FORAM OBSERVADOS") descreve-se a imagem;
  "compatível com cisto simples", "compatível com cálculo", "compatível com esteatose" etc. no corpo são erro (liste em "invencoes"
  como "diagnóstico no corpo: …"), MESMO que o diagnóstico esteja certo e MESMO que outro candidato faça igual.
- COMANDO DE POSIÇÃO DO MÉDICO É LEI. "Antes da conclusão acrescente X" = X entra no corpo, logo antes da conclusão, e NÃO vira item
  de conclusão; incluir X na conclusão é erro (liste em "invencoes" como "conclusão não pedida: …"). "Na conclusão coloque Y" = Y só na conclusão.
- QUALIFICADOR NÃO DITADO É INVENÇÃO: grau, intensidade ou adjetivo clínico que o médico não disse ("acentuado", "moderado", "volumoso",
  "discreto", "simples") — liste em "invencoes".
- Vocabulário: "hipoecoico/hiperecoico/anecoico", nunca "-ecogênico"; "imagem" em vez de "nódulo" na descrição.
Não elogie o que viola estas regras.
Nota 10 = o médico assinaria sem editar; 7 = edição leve de redação; 4 = edição clínica necessária; 0 = perigoso.
Seja específico e curto. Responda em português.`;

// ---- Execução
type Row = Record<string, any>;

async function main() {
  const postgres = (await import("postgres")).default;
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { getKnownCategories, getWritingStyleById, getVariantTemplateBody, resolveAccountReportPreference } = await import("../../src/server/db/lookups");
  const { runRendererStream } = await import("../../src/server/pipeline/renderer");
  const { runWriterStream } = await import("../../src/server/pipeline/writer");
  const { resolveDopplerMode, resolveWriterExam, requestedExamCategory } = await import("../../src/server/pipeline/requestedExam");
  const { ehDerivado } = await import("../../src/server/renderer/catalog/registry");
  const { resolverPersonalizacao } = await import("../../src/server/customization/resolve");
  const { resolverFrasesPersonalizadas } = await import("../../src/server/customization/resolveFrases");
  const { applyCommandOperations } = await import("../../src/server/pipeline/commandOperations");
  const { enforceStatedAmnioticClass, ensureAmnioticConclusionLine } = await import("../../src/server/pipeline/amnioticFluidGuard");
  const { ensurePesoFetalConclusion } = await import("../../src/server/pipeline/pesoFetalGuard");
  const { extractDopplerData, applyDopplerOverlay, correctDopplerConclusion } = await import("../../src/server/pipeline/dopplerOverlay");
  const { normalizeDumFormat, dedupeConclusionItems } = await import("../../src/server/pipeline/dumFormatGuard");
  const { RENDERER_PROGRAMMATIC_CATEGORIES } = await import("../../src/server/renderer/extraction");
  const { stripSpuriousMagnitudeFlags } = await import("../../src/server/pipeline/magnitudeGuard");
  const { applyVolumePolicy } = await import("../../src/server/pipeline/volumeGuard");
  const { applyDsmPolicy } = await import("../../src/server/pipeline/dsmGuard");
  const { removeEmptyConclusionItems } = await import("../../src/server/pipeline/emptyConclusionItemsGuard");
  const { sanitizeDictationArtifacts } = await import("../../src/server/pipeline/dictationSanitizer");
  const { normalizeMeasures } = await import("../../src/server/pipeline/measureNormalizer");
  const { stripInvalidDumLines } = await import("../../src/server/pipeline/dumValidation");
  const { flagImplausibleMeasures } = await import("../../src/server/pipeline/measureSanity");
  const { rendererCategoryEnabled } = await import("../../src/server/pipeline/generationPathResolver");
  const { normalizeSectionSpacing } = await import("../../src/server/pipeline/sectionSpacingGuard");
  const { stripObservationNarration } = await import("../../src/server/pipeline/cervicalNarrationGuard");
  const { applyCervicalLevelSuggestions } = await import("../../src/server/pipeline/cervicalLevelGuard");

  // Cópia de route.ts:formatObjectiveEnumerations (função privada da rota).
  const formatObjectiveEnumerations = (text: string) =>
    text
      .replace(/([^\n])\s+(\d+[-)]\s)/g, "$1\n$2")
      .split("\n")
      .filter((line) => !line.includes("____"))
      .filter((line) => !/Breast Imaging Reporting|Domingos Correia da Rocha|American College of Radiology/i.test(line))
      .join("\n");
  const universalGuards = (t: string) =>
    flagImplausibleMeasures(stripInvalidDumLines(normalizeMeasures(sanitizeDictationArtifacts(t))));

  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 2 });
  const rows: Row[] = await sql`
    select r.id, r.user_id, r.category_code, r.writing_style_id, r.raw_input, r.consolidated_transcript, a.category_hint,
           r.generated_output, r.final_output, r.created_at,
           a.model_writer, a.model_structurer, a.structured_output,
           left(a.system_message_full, 40) as sys_head
    from reports r
    left join lateral (select * from generation_audit g where g.report_id = r.id order by created_at desc limit 1) a on true
    where r.category_code = any(${CATEGORIES}) and r.final_output is not null
      and r.created_at > now() - make_interval(days => ${DAYS})
    order by r.created_at`;
  await sql.end();
  const cases = rows.filter((r) => !ONLY.length || ONLY.some((p) => r.id.startsWith(p)));

  const outDir = join(OUT_ROOT, new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + (CATEGORIES.join(",") === "ABDOMEN_TOTAL" ? "" : "-" + CATEGORIES.join("+").toLowerCase()));
  mkdirSync(outDir, { recursive: true });
  const log = join(outDir, "calls.jsonl");
  console.log(`bench: ${cases.length} casos · modelo ${HAIKU} (effort ${EFFORT}) · reps ${REPS} · juiz ${JUDGE_ON ? JUDGE : "off"}`);
  console.log(`saída: ${outDir}\n`);

  const categories = await getKnownCategories();

  /**
   * Como a rota resolve o exame de cada laudo (route.ts): a categoria salva + o
   * category_hint do request. DOPPLER_OBSTETRICO como hint = Doppler combinado
   * (salvo como OBSTETRICA) ou isolado (salvo como DOPPLER_OBSTETRICO).
   */
  function examOf(r: Row) {
    const cat: string = r.category_code;
    const hint: string | undefined = r.category_hint ?? undefined;
    // Antes de 15/09 o app não separava "obstétrico" de "obstétrico com Doppler": se a
    // produção saiu com Doppler, simula a escolha que o médico faria hoje (combinado).
    const legadoComDoppler =
      hint === "OBSTETRICA" && /DOPPLER/i.test(r.generated_output ?? "") && new Date(r.created_at) < new Date("2026-09-15");
    const efHint = legadoComDoppler ? "DOPPLER_OBSTETRICO" : hint;
    const dopplerMode: "combined" | "isolated" | undefined =
      efHint === "DOPPLER_OBSTETRICO" ? (cat === "DOPPLER_OBSTETRICO" ? "isolated" : "combined") : resolveDopplerMode(cat, undefined);
    const includeDoppler = efHint === "OBSTETRICA" ? false : undefined;
    return { cat, hint, dopplerMode, includeDoppler };
  }

  async function loadBundle(r: Row, rawInput: string, cat: string, dopplerMode: "combined" | "isolated" | undefined) {
    const writerExam = resolveWriterExam(cat, dopplerMode);
    const { variantKey: accountVariantKey, rendererPreferences } = await resolveAccountReportPreference(r.user_id, cat);
    const bundle = dopplerMode === "isolated"
      ? { blocks: [] as any[], variantKey: "isolated-code", error: null as any }
      : await loadDeterministicBundle({
          categoryCode: writerExam.categoryCode,
          writingStyleId: r.writing_style_id,
          rawInput,
          accountVariantKey: writerExam.categoryCode === cat ? accountVariantKey : undefined,
        });
    return { bundle, rendererPreferences };
  }

  async function runA(r: Row, rawInput: string, mode: "replay" | "haiku" | "luna"): Promise<{ text: string; error?: string }> {
    // Categoria cujo caminho de produção é o writer (fora de RENDERER_CATEGORIES): "A" = Haiku no
    // caminho atual, isto é, o writer com o prompt de hoje (sem o patch do B2).
    if (mode !== "replay" && !rendererCategoryEnabled(examOf(r).cat)) {
      const w = await runB(r, rawInput, false, mode);
      return { ...w, via: "writer" } as { text: string; error?: string };
    }
    return ctx.run({ mode, caseId: r.id, storedFindings: r.structured_output, log }, async () => {
      const { cat, dopplerMode, includeDoppler } = examOf(r);
      const styleRow = (await getWritingStyleById(r.writing_style_id))!;
      const { bundle, rendererPreferences } = await loadBundle(r, rawInput, cat, dopplerMode);
      const blocks = bundle.blocks ?? [];
      const programmatic = RENDERER_PROGRAMMATIC_CATEGORIES.has(cat);
      let templateBody = "";
      if (!programmatic) {
        const t = await getVariantTemplateBody({
          categoryCode: cat,
          writingStyleId: r.writing_style_id,
          variantKey: (bundle.error ? null : bundle.variantKey) ?? "padrao",
        });
        if (t === null) return { text: "", error: "sem template_body (rota cairia no writer)" };
        templateBody = t;
      }
      const usaModeloDerivado = ehDerivado(cat, styleRow.code);
      const personalizacao = !usaModeloDerivado
        ? resolverPersonalizacao({ userId: r.user_id, categoryCode: cat, styleCode: styleRow.code })
        : undefined;
      const frases = usaModeloDerivado
        ? resolverFrasesPersonalizadas({ userId: r.user_id, categoryCode: cat, styleCode: styleRow.code })
        : undefined;
      const gen = runRendererStream({
        categoryCode: requestedExamCategory(cat, dopplerMode) ?? cat,
        dopplerMode,
        includeDoppler,
        rawInput,
        templateBody,
        ragBlocks: blocks,
        rendererPreferences: rendererPreferences as any,
        writingStyleId: r.writing_style_id,
        personalizacao,
        frases,
      } as any);
      let text = "";
      try {
        for (;;) {
          const n = await gen.next();
          if (n.done) {
            text = (n.value as any)?.fullText ?? text;
            break;
          }
          text += n.value;
        }
      } catch (e) {
        return { text: "", error: `renderer falhou: ${(e as Error).message.slice(0, 300)}` };
      }
      text = applyCommandOperations(text, rawInput);
      return { text: universalGuards(text) };
    });
  }

  async function runB(r: Row, rawInput: string, promptPatch = false, mode: "haiku" | "luna" = "haiku"): Promise<{ text: string; error?: string }> {
    return ctx.run({ mode, promptPatch, caseId: r.id, log }, async () => {
      const { cat, dopplerMode, includeDoppler } = examOf(r);
      const styleRow = (await getWritingStyleById(r.writing_style_id))!;
      const { bundle } = await loadBundle(r, rawInput, cat, dopplerMode);
      if (bundle.error) return { text: "", error: `bundle ${bundle.error.code}` };
      // LIVRE_ROUTED_GENERATION_PATH: ragFewShots=true → bundle completo.
      const gen = runWriterStream({
        dopplerMode,
        includeDoppler,
        findings: { categoria_detectada: cat } as any,
        ragBlocks: bundle.blocks,
        writingStyleCode: styleRow.code,
        categoryCode: cat,
        categoryLabel: categories.labels.get(cat) ?? cat,
        rawUserMessage: rawInput,
        sourceTranscript: rawInput,
        // provider "openai" só para passar pelo fetch interceptado; o prompt é o
        // mesmo que o Livre roteado manda ao Haiku (writer.ts, credentialRef livre).
        modelConfig: { provider: "openai", model: HAIKU, reasoningEffort: EFFORT, credentialRef: "default" },
      });
      let text = "";
      try {
        for (;;) {
          const n = await gen.next();
          if (n.done) {
            text = n.value?.fullText ?? text;
            break;
          }
          text += n.value;
        }
      } catch (e) {
        return { text: "", error: `writer falhou: ${(e as Error).message.slice(0, 300)}` };
      }
      // Cadeia de guards do caminho writer (route.ts, guardsMode full && !useRenderer).
      if (styleRow.code === "OBJETIVO") text = formatObjectiveEnumerations(text);
      if (cat === "MORFOLOGICO") text = ensureAmnioticConclusionLine(text);
      text = enforceStatedAmnioticClass(text, rawInput);
      text = stripSpuriousMagnitudeFlags(text);
      text = applyVolumePolicy(text, rawInput);
      text = applyDsmPolicy(text, rawInput);
      text = applyCommandOperations(text, rawInput);
      if (cat === "CERVICAL") {
        text = stripObservationNarration(text);
        text = applyCervicalLevelSuggestions(text);
      }
      if ((cat === "DOPPLER_OBSTETRICO" && dopplerMode !== "isolated") || cat === "OBSTETRICA" || cat === "MORFOLOGICO") {
        text = ensurePesoFetalConclusion(text, rawInput);
      }
      if (cat === "MORFOLOGICO" && /\bdoppler\b/i.test(rawInput)) {
        text = applyDopplerOverlay(text, extractDopplerData(rawInput));
      } else if (cat === "DOPPLER_OBSTETRICO") {
        text = correctDopplerConclusion(text, extractDopplerData(rawInput));
      }
      text = removeEmptyConclusionItems(text);
      if (cat === "OBSTETRICA" || cat === "DOPPLER_OBSTETRICO" || cat === "MORFOLOGICO") {
        text = normalizeDumFormat(text);
        text = dedupeConclusionItems(text);
      }
      if (cat === "MUSCULOESQUELETICO_V2") text = normalizeSectionSpacing(text);
      return { text: universalGuards(text) };
    });
  }

  const results: Row[] = [];
  const prev: Map<string, Row> = new Map(
    REUSE || REJUDGE
      ? (JSON.parse(readFileSync(join(resolve((REUSE ?? REJUDGE)!), "results.json"), "utf8")) as Row[]).map((x) => [x.id, x])
      : [],
  );
  const prevHas = (k: string) => [...prev.values()].some((x) => x[k]);
  const WANT = new Set([...SCEN, ...(LUNA ? ["L"] : []), ...(B2 ? ["B2"] : [])]);
  // O cenário A pode ser gravado com outro nome (--a-key); a lista de candidatos usa os nomes gravados.
  const WANT_KEYS = new Set([...WANT].map((k) => (k === "A" ? A_KEY : k)));
  const KEYS = ["gpt", ...SCEN_KEYS.filter((k) => WANT_KEYS.has(k) || (k !== "R" && prevHas(k)) || (k === "R" && prevHas("replay") && WANT.has("R")))];
  /** Texto de cada candidato. R = achados do gpt-4.1-mini (produção) + renderer de HOJE.
   *  A que falhou no renderer cai no writer, como na rota: usa o texto do B2 (ou B). */
  const candText = (res: Row, k: string): string => {
    if (k === "gpt") return res.gpt ?? "";
    if (k === "R") return res.replay?.text || `(sem replay: ${res.replay?.error ?? "produção não passou pelo renderer"})`;
    const x = res[k]?.[0];
    if ((k === "A" || k === "AR") && x?.error && (res.B2?.[0]?.text || res.B?.[0]?.text)) return res.B2?.[0]?.text || res.B[0].text;
    return x?.text || `(falhou: ${x?.error})`;
  };
  let idx = 0;
  async function worker() {
    while (idx < cases.length) {
      const r = cases[idx++];
      const id8 = r.id.slice(0, 8);
      const rawInput = r.consolidated_transcript ?? r.raw_input ?? "";
      // Caminho da produção pela auditoria: renderer (extração + renderer), writer_guarded
      // (writer dedicado MSK/PELVE/PARTES_MOLES dentro do renderer), passthrough (MSK colado
      // pronto), hard (gpt-5.4, writer puro) ou writer (writer genérico com bundle).
      const head = String(r.sys_head ?? "");
      const prodPath = /writer_guarded/.test(head)
        ? "writer_guarded"
        : /passthrough/.test(head)
          ? "passthrough"
          : head.startsWith("[renderer")
            ? "renderer"
            : r.model_writer === "gpt-5.4"
              ? "hard"
              : "writer";
      const old = prev.get(r.id);
      const res: Row = {
        id: r.id, id8, data: r.created_at.toISOString().slice(0, 10), prodPath,
        categoria: r.category_code, hint: r.category_hint, dopplerMode: examOf(r).dopplerMode,
        prodModels: { extrator: r.model_structurer, writer: r.model_writer },
        ditado: rawInput, final: r.final_output, gpt: r.generated_output,
        editadoPeloMedico: r.final_output !== r.generated_output,
      };
      if (old) {
        // Reaproveita o que a rodada anterior já gerou (não roda Haiku de novo).
        for (const k of ["replay", "replayIgualProducao", ...SCEN_KEYS]) if (old[k] !== undefined) res[k] = old[k];
      }
      if (!res.replay && prodPath === "renderer" && r.structured_output) {
        const rp = await runA(r, rawInput, "replay");
        res.replay = rp;
        res.replayIgualProducao = rp.text.trim() === String(r.generated_output ?? "").trim();
      }
      if (WANT.has("A") && !res[A_KEY]) {
        res[A_KEY] = [];
        for (let k = 0; k < REPS; k++) res[A_KEY].push(await runA(r, rawInput, "haiku"));
      }
      if (WANT.has("B") && !res.B) {
        res.B = [];
        for (let k = 0; k < REPS; k++) res.B.push(await runB(r, rawInput));
      }
      if (WANT.has("B2") && !(old && old.B2)) {
        res.B2 = [];
        for (let k = 0; k < REPS; k++) res.B2.push(await runB(r, rawInput, true));
      }
      if (WANT.has("L") && !(old && old.L)) {
        res.L = [];
        for (let k = 0; k < REPS; k++) res.L.push(await runA(r, rawInput, "luna"));
      }
      for (const key of KEYS) {
        const text = candText(res, key);
        res[`m_${key}`] = { simFinal: Number(wordSimilarity(text ?? "", res.final).toFixed(3)), ...numberFidelity(text ?? "", res.final) };
      }
      console.log(
        `${id8} ${res.data} prod=${prodPath} editado=${res.editadoPeloMedico ? "s" : "n"}` +
          (res.replay ? ` replay=${res.replayIgualProducao ? "IGUAL" : "DIFERENTE"}` : "") +
          " | sim(final): " +
          KEYS.map((k) => `${k} ${res[`m_${k}`].simFinal}${k !== "gpt" && k !== "R" && res[k]?.[0]?.error ? "!" : ""}`).join(" · "),
      );
      results.push(res);
      writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 2));
    }
  }
  if (REJUDGE) {
    for (const r of cases) {
      const old = prev.get(r.id);
      if (!old) continue;
      delete old.juiz;
      delete old.juizErro;
      results.push(old);
    }
    for (const res of results) {
      for (const key of KEYS) {
        const text = candText(res, key);
        res[`m_${key}`] = { simFinal: Number(wordSimilarity(text ?? "", res.final).toFixed(3)), ...numberFidelity(text ?? "", res.final) };
      }
    }
    console.log(`rejudge: ${results.length} casos de ${REJUDGE} · candidatos ${KEYS.join(", ")}`);
  } else {
    await Promise.all(Array.from({ length: Math.min(CONC, cases.length) }, worker));
  }

  if (JUDGE_ON) {
    console.log(`\njuiz ${JUDGE}…`);
    let j = 0;
    async function judgeWorker() {
      while (j < results.length) {
        const res = results[j++];
        const cands = KEYS.map((k) => ({ origem: k, text: candText(res, k) })).sort(() => Math.random() - 0.5);
        const rotulos = ["X", "Y", "Z", "W", "V", "U", "T"].slice(0, cands.length);
        const user =
          `DITADO DO MÉDICO:\n${res.ditado}\n\nLAUDO FINAL ASSINADO PELO MÉDICO:\n${res.final}\n\n` +
          cands.map((c, i) => `CANDIDATO ${rotulos[i]}:\n${c.text}`).join("\n\n");
        try {
          const r = await callClaude({ model: JUDGE, system: judgeSystemFor(res.categoria), user, schema: JUDGE_SCHEMA as any, effort: "medium" });
          const parsed = JSON.parse(r.text) as { avaliacoes: Row[] };
          res.juiz = {};
          for (const av of parsed.avaliacoes) {
            const i = rotulos.indexOf(String(av.rotulo).replace(/candidato\s*/i, "").trim().toUpperCase());
            if (i >= 0) res.juiz[cands[i].origem] = av;
          }
          console.log(`${res.id8} juiz: ` + KEYS.map((k) => `${k} ${res.juiz[k]?.nota}`).join(" · "));
        } catch (e) {
          res.juizErro = (e as Error).message;
          console.log(`${res.id8} juiz falhou: ${res.juizErro}`);
        }
        writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 2));
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONC, results.length) }, judgeWorker));
  }

  // ---- Resumo
  const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : "-");
  const resumo: Row = {};
  for (const k of KEYS) {
    const nj = results.map((r) => r.juiz?.[k]).filter(Boolean);
    resumo[k] = {
      simFinal: avg(results.map((r) => r[`m_${k}`].simFinal)),
      falhas: k === "gpt" || k === "R" ? 0 : results.filter((r) => r[k]?.[0]?.error).length,
      notaJuiz: avg(nj.map((x: Row) => x.nota)),
      estilo: avg(nj.map((x: Row) => x.estilo)),
      omissoes: nj.reduce((a: number, x: Row) => a + x.omissoes.length, 0),
      invencoes: nj.reduce((a: number, x: Row) => a + x.invencoes.length, 0),
      errosMedida: nj.reduce((a: number, x: Row) => a + x.erros_medida_lateralidade.length, 0),
      impressaoOk: `${nj.filter((x: Row) => x.impressao_ok).length}/${nj.length}`,
    };
  }
  const replays = results.filter((r) => r.replay);
  resumo.replay = `${replays.filter((r) => r.replayIgualProducao).length}/${replays.length} idênticos à produção`;
  writeFileSync(join(outDir, "resumo.json"), JSON.stringify(resumo, null, 2));
  console.log("\nRESUMO");
  console.table(Object.fromEntries(KEYS.map((k) => [k, resumo[k]])));
  console.log("replay:", resumo.replay);
  console.log(`\nresultados: ${join(outDir, "results.json")}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
