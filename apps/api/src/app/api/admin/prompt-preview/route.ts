import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import { z } from "zod";
import { env } from "@/server/env";
import { getDbClient, schema } from "@laudousg/db";
import { and, eq } from "drizzle-orm";
import { buildSystemMessage } from "@/server/prompts/buildSystemMessage";
import { resolveConditionalPromptBlocks } from "@/server/prompts/conditionalBlocks";
import { getCategoryContract } from "@/server/prompts/contracts";
import { getStyleOverlay } from "@/server/prompts/styles";
import { PROMPT_VERSION, contractHashFor } from "@/server/prompts/version";
import { loadDeterministicBundle } from "@/server/pipeline/bundleLoader";
import { getWritingStyleById } from "@/server/db/lookups";
import { RENDERER_PROGRAMMATIC_CATEGORIES, EXTRACTORS } from "@/server/renderer/extraction";
import { catalogEnabledFor } from "@/server/renderer/catalog/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/prompt-preview — o prompt de uma categoria SEM gerar laudo.
 *
 * Até aqui, o único lugar onde o prompt final existia era
 * `generation_audit.system_message_full`, escrito durante uma geração. Para
 * estudar o prompt de uma categoria era preciso gerar um laudo — gastando
 * OpenAI e sujando `reports`.
 *
 * Isto é possível porque `buildSystemMessage()` é uma função PURA (sem I/O, sem
 * env) e `loadDeterministicBundle()` só faz SELECT em `knowledge_blocks`.
 * **Zero chamada de IA, zero linha gravada.**
 *
 * Ressalva que a resposta carrega explicitamente: nem toda categoria usa prompt
 * de writer. Hoje 11 categorias montam o laudo em CÓDIGO (renderer), e
 * LIVRE/TESTE usam um prompt próprio. Por isso a resposta traz `caminho` —
 * mostrar só o texto enganaria quem está estudando.
 *
 * Admin-only. Read-only.
 */

const QuerySchema = z.object({
  category: z.string().min(1),
  writing_style_id: z.string().uuid().optional(),
  writing_style_code: z.string().optional(),
  /** Opcional: exercita a seleção de variante e os blocos condicionais. */
  raw_input: z.string().max(8000).optional(),
  hardening: z.enum(["true", "false"]).optional(),
});

type Caminho = "renderer" | "writer" | "livre" | "renderer+writer";

function descreverCaminho(categoryCode: string): {
  caminho: Caminho;
  explicacao: string;
  renderer_ligado: boolean;
  /**
   * O caminho depende de RENDERER_CATEGORIES, que é do AMBIENTE — o valor local
   * costuma estar defasado em relação ao da Vercel. Expor a lista lida evita a
   * conclusão errada de que uma categoria não usa renderer quando ela usa.
   */
  renderer_categories_lido: string[];
} {
  const rendererCsv = env().RENDERER_CATEGORIES;
  const lista = rendererCsv.split(",").map((x) => x.trim()).filter(Boolean);
  const ligado = catalogEnabledFor(rendererCsv, categoryCode);
  const programatica = RENDERER_PROGRAMMATIC_CATEGORIES.has(categoryCode);
  const temExtrator = Object.prototype.hasOwnProperty.call(EXTRACTORS, categoryCode);

  if (categoryCode === "LIVRE" || categoryCode === "TESTE") {
    return {
      caminho: "livre",
      renderer_ligado: false,
      renderer_categories_lido: lista,
      explicacao:
        "Categoria livre: o prompt abaixo é o LIVRE_SYSTEM_PROMPT, e o contrato, o bundle e os few-shots não se aplicam.",
    };
  }
  if (ligado && programatica) {
    return {
      caminho: "renderer",
      renderer_ligado: true,
      renderer_categories_lido: lista,
      explicacao:
        "A ESTRUTURA do laudo é montada em código. Mas o laudo NÃO é 100% código: o LLM da extração preenche campos de texto livre (achados adicionais, descrições de achados alterados) que entram literalmente no laudo. Em exame normal o texto é praticamente todo de código; em exame alterado, a parcela escrita pelo LLM cresce. O prompt que COMANDA esta categoria é o de EXTRAÇÃO, abaixo — o prompt do writer só valeria em fallback.",
    };
  }
  if (ligado && temExtrator) {
    return {
      caminho: "renderer+writer",
      renderer_ligado: true,
      renderer_categories_lido: lista,
      explicacao:
        "O renderer monta o laudo a partir de um template com slots, e um SEGUNDO LLM (free-slots) escreve frases inteiras — de corpo e de conclusão — para os achados que não têm campo próprio. É o caminho mais misto: em exame alterado, boa parte do texto é do LLM.",
    };
  }
  return {
    caminho: "writer",
    renderer_ligado: false,
    renderer_categories_lido: lista,
    explicacao: "O laudo inteiro é escrito pelo LLM a partir do prompt abaixo.",
  };
}

/**
 * Percorre o JSON Schema de extração e devolve os caminhos de campos do tipo
 * string — os candidatos a "texto que o LLM escreve e entra no laudo".
 *
 * Heurística deliberada: campos com `enum` são classificação, não redação, e
 * saem de fora. Um campo string SEM enum é onde o LLM redige. Isto não prova
 * que o campo é renderizado — só mostra onde ele PODE redigir.
 */
function camposDeTexto(schema: Record<string, unknown>, prefixo = ""): string[] {
  const out: string[] = [];
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props) return out;
  for (const [nome, def] of Object.entries(props)) {
    const caminho = prefixo ? `${prefixo}.${nome}` : nome;
    const tipo = def.type;
    const ehString =
      tipo === "string" || (Array.isArray(tipo) && (tipo as string[]).includes("string"));
    if (ehString && !def.enum) out.push(caminho);
    if (def.type === "object" || def.properties) {
      out.push(...camposDeTexto(def, caminho));
    }
    if (def.type === "array" && def.items) {
      const it = def.items as Record<string, unknown>;
      const itTipo = it.type;
      if (
        (itTipo === "string" || (Array.isArray(itTipo) && (itTipo as string[]).includes("string"))) &&
        !it.enum
      ) {
        out.push(`${caminho}[]`);
      } else {
        out.push(...camposDeTexto(it, `${caminho}[]`));
      }
    }
  }
  return out;
}

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    category: url.searchParams.get("category") ?? "",
    writing_style_id: url.searchParams.get("writing_style_id") ?? undefined,
    writing_style_code: url.searchParams.get("writing_style_code") ?? undefined,
    raw_input: url.searchParams.get("raw_input") ?? undefined,
    hardening: url.searchParams.get("hardening") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "parâmetros inválidos", detalhes: parsed.error.issues }, { status: 400 });
  }
  const { category, raw_input: rawInput = "", hardening } = parsed.data;

  const db = getDbClient();

  // Categoria precisa existir no banco (fonte canônica, não enum de código).
  const [cat] = await db
    .select({ code: schema.categories.code, label: schema.categories.label, active: schema.categories.active })
    .from(schema.categories)
    .where(eq(schema.categories.code, category))
    .limit(1);
  if (!cat) return Response.json({ error: `categoria desconhecida: ${category}` }, { status: 404 });

  // Estilo: por id, por code, ou o clássico como default.
  let styleId = parsed.data.writing_style_id ?? null;
  if (!styleId) {
    const code = parsed.data.writing_style_code ?? "CLASSICO_COMPLETO";
    const [row] = await db
      .select({ id: schema.writingStyles.id })
      .from(schema.writingStyles)
      .where(and(eq(schema.writingStyles.code, code as never), eq(schema.writingStyles.active, true)))
      .limit(1);
    if (!row) return Response.json({ error: `estilo desconhecido ou inativo: ${code}` }, { status: 404 });
    styleId = row.id;
  }
  const style = await getWritingStyleById(styleId);
  if (!style) return Response.json({ error: "estilo não encontrado" }, { status: 404 });

  const usarHardening = hardening ? hardening === "true" : env().WRITER_HARDENING === "true";
  const caminho = descreverCaminho(category);

  /**
   * Nas categorias de renderer, quem manda no laudo é o prompt de EXTRAÇÃO —
   * é ele que instrui o LLM a preencher os campos, inclusive os de TEXTO LIVRE
   * que entram literalmente no laudo. Mostrar só o prompt do writer daria a
   * impressão errada de que a categoria é 100% código.
   */
  const extrator = EXTRACTORS[category];
  const extracao = extrator
    ? {
        schema_name: extrator.schemaName,
        prompt: extrator.prompt,
        prompt_chars: extrator.prompt.length,
        /** Campos string do schema — os candidatos a texto livre no laudo. */
        campos_de_texto: camposDeTexto(extrator.jsonSchema),
      }
    : null;

  // LIVRE/TESTE não passam por bundle nem contrato: buildSystemMessage devolve
  // o LIVRE_SYSTEM_PROMPT direto. Sem este atalho, o bundle vazio faria a
  // categoria parecer "sem prompt" — quando ela tem um.
  if (caminho.caminho === "livre") {
    const sm = buildSystemMessage({
      categoryCode: category,
      categoryLabel: cat.label,
      writingStyleCode: style.code,
      ragBlocks: [],
      hardening: usarHardening,
    });
    return Response.json({
      categoria: { code: cat.code, label: cat.label, ativa: cat.active },
      estilo: { id: styleId, code: style.code },
      caminho,
      prompt_version: PROMPT_VERSION,
      contract_hash: contractHashFor(category, styleId),
      hardening: usarHardening,
      variante: null,
      camadas: {
        contrato_da_categoria: null,
        overlay_de_estilo: null,
        blocos_condicionais: [],
        bundle_por_kind: {},
        bundle_total: 0,
      },
      blocos: [],
      system_message: sm,
      system_message_chars: sm.length,
    });
  }

  // Bundle determinístico: SELECT em knowledge_blocks por (categoria × estilo).
  const bundle = await loadDeterministicBundle({
    categoryCode: category,
    writingStyleId: styleId,
    rawInput,
  });
  if (bundle.error) {
    // 200 com diagnóstico: para uma categoria de renderer, bundle vazio é o
    // estado NORMAL — ela não usa prompt de writer. A tela precisa explicar
    // isso em vez de mostrar "erro".
    const EXPLICACAO: Record<string, string> = {
      BUNDLE_EMPTY: "Não há blocos validados para esta combinação de categoria e estilo.",
      BUNDLE_NO_TEMPLATE: "Há blocos, mas nenhum do tipo `modelo` — sem template não se monta prompt.",
      BUNDLE_VARIANT_EMPTY: "A variante selecionada não tem modelo validado no banco.",
      BUNDLE_MODEL_AMBIGUOUS: "Mais de um modelo sobrou após a seleção — máscaras conflitantes.",
    };
    return Response.json({
      categoria: { code: cat.code, label: cat.label, ativa: cat.active },
      estilo: { id: styleId, code: style.code },
      caminho,
      sem_prompt: true,
      motivo: { codigo: bundle.error.code, explicacao: EXPLICACAO[bundle.error.code] ?? null },
      detalhes: bundle.error,
      // Mesmo sem prompt de writer, a categoria de renderer TEM prompt — o de
      // extração. É ele que comanda o laudo aqui.
      extracao,
    });
  }

  const condicionais = resolveConditionalPromptBlocks(category, rawInput);


  const systemMessage = buildSystemMessage({
    categoryCode: category,
    categoryLabel: cat.label,
    writingStyleCode: style.code,
    ragBlocks: bundle.blocks,
    hardening: usarHardening,
    conditionalBlocks: condicionais,
  });

  // As camadas, separadas — é o que permite estudar de onde vem cada parte.
  const contrato = getCategoryContract(category, style.code);
  const overlay = getStyleOverlay(style.code);
  const porKind = bundle.blocks.reduce<Record<string, number>>((acc, b) => {
    acc[b.kind] = (acc[b.kind] ?? 0) + 1;
    return acc;
  }, {});

  return Response.json({
    categoria: { code: cat.code, label: cat.label, ativa: cat.active },
    estilo: { id: styleId, code: style.code },
    caminho,
    prompt_version: PROMPT_VERSION,
    contract_hash: contractHashFor(category, styleId),
    hardening: usarHardening,
    variante: bundle.variantKey,
    camadas: {
      contrato_da_categoria: contrato,
      overlay_de_estilo: overlay,
      blocos_condicionais: condicionais,
      bundle_por_kind: porKind,
      bundle_total: bundle.blocks.length,
    },
    blocos: bundle.blocks.map((b) => ({
      id: b.id, kind: b.kind, title: b.title, priority: b.priority,
      tamanho: b.content.length,
    })),
    extracao,
    system_message: systemMessage,
    system_message_chars: systemMessage.length,
  });
}
