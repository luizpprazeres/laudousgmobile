import { GenerateRequestSchema } from "@laudousg/shared";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { sseResponse, nowIso } from "@/server/sse/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * /api/generate/mock — emite a sequência completa de eventos SSE com payload
 * fake. Útil para:
 *  - desenvolver a UI antes de OpenAI/Deepgram/RAG estarem prontos
 *  - validar parser SSE no app, abort propagation, heartbeat, estados
 *  - testar fluxos clarifying/blocked/done sem custo de tokens
 *
 * Cenário ditado pelo body opcional `mock_scenario`:
 *  - "happy"     (default)  → open → structured → validator(ok) → rag → token×N → sanity(ok) → done
 *  - "clarify"               → ... → validator(ok=false) → clarify (encerra)
 *  - "blocked"               → ... → sanity(critical) → blocked (encerra)
 *  - "error"                 → erro no meio do streaming
 *  - "slow"                  → como "happy" mas com 200ms entre cada token
 */

type Scenario = "happy" | "clarify" | "blocked" | "error" | "slow";

const FAKE_REPORT = `## Pelve transabdominal e transvaginal

Útero em anteversão, contornos regulares, medindo 6,3 x 3,1 x 4,0 cm,
volume estimado em 43,2 cm³. Miométrio com ecotextura homogênea.
Endométrio com espessura de 0,3 cm, regular, compatível com a fase
proliferativa do ciclo menstrual.

Ovário direito tópico, medindo 3,2 x 2,1 x 1,9 cm. Ovário esquerdo
tópico, medindo 3,4 x 2,3 x 2,0 cm. Ambos com ecotextura preservada
e folículos em diferentes estágios.

Não há líquido livre em fundo de saco posterior.

## Conclusão

Pelve feminina sem alterações ao exame ultrassonográfico atual.

O exame atual comparado ao anterior, realizado em 07/04/2026, mostra
manutenção do aumento do volume dos ovários. Sem outros novos achados.`;

const sleep = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: { mock_scenario?: Scenario } & Record<string, unknown> = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* ignore — usamos defaults */
  }

  // valida formato do request real (mas tolera campos faltantes p/ dev)
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success && process.env.NODE_ENV === "production") {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
    });
  }

  const scenario = (body.mock_scenario ?? "happy") as Scenario;
  const reportId = crypto.randomUUID();

  return sseResponse(async ({ emit }, signal) => {
    const checkAbort = () => {
      if (signal.aborted) throw new Error("aborted");
    };

    emit({ type: "open", ts: nowIso(), report_id: reportId });
    await sleep(150);
    checkAbort();

    emit({
      type: "structured",
      ts: nowIso(),
      payload: {
        schema_version: "v1",
        categoria_detectada: "PELVE_FEMININA",
        tipo_exame: "Pelve transabdominal e transvaginal",
        achados: {
          utero: {
            posicao: "anteversao",
            medidas_cm: ["6,3", "3,1", "4,0"],
            volume_cm3: "43,2",
          },
          endometrio: {
            espessura_cm: "0,3",
            interpretacao: "normal para a fase do ciclo menstrual",
          },
        },
        comandos_do_medico: [
          {
            tipo: "adicionar_conclusao_final",
            texto:
              "O exame atual comparado ao anterior, realizado em 07/04/2026, mostra manutencao do aumento do volume dos ovarios. Sem outros novos achados.",
          },
        ],
        trechos_confusos: [],
        nivel_de_confianca: "alta",
      },
    });
    await sleep(150);
    checkAbort();

    if (scenario === "clarify") {
      emit({
        type: "validator",
        ts: nowIso(),
        ok: false,
        issues_count: 1,
      });
      emit({
        type: "clarify",
        ts: nowIso(),
        questions: [
          {
            id: "q1",
            question:
              "Você disse 'volume aumentado dos ovários' mas não passou medidas. Quanto mediu cada ovário?",
            expects: "text",
            target_field: "ovarios.volume_cm3",
          },
        ],
      });
      return;
    }

    emit({ type: "validator", ts: nowIso(), ok: true, issues_count: 0 });
    await sleep(120);
    checkAbort();

    const fakeBlocks = [
      { id: crypto.randomUUID(), kind: "modelo", title: "Modelo padrão pelve", priority: 90 },
      { id: crypto.randomUUID(), kind: "regra", title: "Endométrio: faixa normal por fase", priority: 80 },
      { id: crypto.randomUUID(), kind: "frase", title: "Útero anteversão padrão", priority: 70 },
      { id: crypto.randomUUID(), kind: "conclusao", title: "Pelve sem alterações", priority: 85 },
    ];
    emit({
      type: "rag",
      ts: nowIso(),
      blocks_used: fakeBlocks.map((b) => b.id),
      blocks_summary: fakeBlocks,
    });
    await sleep(150);
    checkAbort();

    if (scenario === "error") {
      emit({
        type: "error",
        ts: nowIso(),
        code: "MOCK_FAILURE",
        message: "Erro simulado no meio do streaming",
      });
      return;
    }

    // Stream de tokens (palavra a palavra)
    const tokens = FAKE_REPORT.split(/(\s+)/);
    const tokenDelay = scenario === "slow" ? 200 : 25;
    for (const t of tokens) {
      checkAbort();
      emit({ type: "token", ts: nowIso(), delta: t });
      await sleep(tokenDelay);
    }

    if (scenario === "blocked") {
      const sanity = {
        verdict: "critical" as const,
        summary:
          "Medida ditada (utero 6,3 x 3,1 x 4,0) divergente do laudo gerado.",
        issues: [
          {
            type: "medida_divergente" as const,
            severity: "critical" as const,
            detail: "Volume calculado no laudo (43,2) inconsistente com 6,3*3,1*4,0*0,523.",
            campo_achado: "utero.volume_cm3",
          },
        ],
      };
      emit({ type: "sanity", ts: nowIso(), result: sanity });
      emit({
        type: "blocked",
        ts: nowIso(),
        report_id: reportId,
        reason: sanity.summary,
        sanity,
      });
      return;
    }

    const sanityOk = {
      verdict: "ok" as const,
      summary: "Sem inconsistências detectadas.",
      issues: [],
    };
    emit({ type: "sanity", ts: nowIso(), result: sanityOk });
    emit({
      type: "done",
      ts: nowIso(),
      report_id: reportId,
      final_text: FAKE_REPORT,
    });
  });
}
