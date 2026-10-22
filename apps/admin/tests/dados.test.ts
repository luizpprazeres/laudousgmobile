import assert from "node:assert/strict";
import { test } from "node:test";
import { janelaDias } from "../src/lib/data/agregar";
import { gerarExemplos, goCurto } from "../src/lib/data/exemplo";
import { montarNotificacoes, montarUso, tabelaAusente } from "../src/lib/data/fonte-fase2";
import { montarReais, type LinhasReais } from "../src/lib/data/fonte-supabase";

const dias = janelaDias("2026-10-21");

const linhas: LinhasReais = {
  perfis: [
    { id: "u1", created_at: "2026-01-01T12:00:00Z", plan: "pro", role: "admin", onboarding_completed_at: "2026-01-02T00:00:00Z" },
    { id: "u2", created_at: "2026-10-20T15:00:00Z", plan: "free", role: "user", onboarding_completed_at: null },
  ],
  laudos30: [
    { user_id: "u1", category_code: "OBSTETRICA", created_at: "2026-10-21T13:00:00Z" },
    { user_id: "u1", category_code: "OBSTETRICA", created_at: "2026-10-10T13:00:00Z" },
    { user_id: "u2", category_code: "TIREOIDE", created_at: "2026-10-21T14:00:00Z" },
  ],
  laudosTotal: 100,
  categorias: [{ code: "OBSTETRICA", label: "Obstétrica" }, { code: "TIREOIDE", label: "Tireoide" }],
  audit30: [
    { user_id: "u1", category: "OBSTETRICA", model_writer: "m1", openai_input_tokens: 100, openai_output_tokens: 10, openai_cost_usd: "0.002", error_code: null, error_stage: null, created_at: "2026-10-21T13:00:00Z", total_duration_ms: 1000, structurer_duration_ms: null, writer_duration_ms: 500 },
    { user_id: "u1", category: "OBSTETRICA", model_writer: "m2", openai_input_tokens: 100, openai_output_tokens: 10, openai_cost_usd: null, error_code: "X", error_stage: "writer", created_at: "2026-10-10T13:00:00Z", total_duration_ms: 3000, structurer_duration_ms: null, writer_duration_ms: 700 },
    { user_id: "u2", category: "TIREOIDE", model_writer: "m1", openai_input_tokens: 50, openai_output_tokens: 5, openai_cost_usd: 0.001, error_code: null, error_stage: null, created_at: "2026-10-21T14:00:00Z", total_duration_ms: 2000, structurer_duration_ms: null, writer_duration_ms: 600 },
  ],
  auditErros: [],
  runs30: [{ outcome: "success", created_at: "2026-10-21T13:00:00Z" }, { outcome: "error", created_at: "2026-10-10T13:00:00Z" }],
  runsTotal: { success: 10, blocked: 1, error: 2 },
  assinaturas: [{ environment: "Sandbox", product_id: "a.b.pro.monthly", status: "expired", is_trial: false, expires_at: null }],
  feedback30: [{ verdict: "positive", created_at: "2026-10-21T13:00:00Z" }],
  eventosPorSurface: [{ surface: "web", n: 5 }],
};

test("montarReais agrega por período e pseudonimiza usuários", () => {
  const r = montarReais(linhas, dias);
  assert.equal(r.uso.laudos.v.today, 2);
  assert.equal(r.uso.laudos.v.d30, 3);
  assert.equal(r.uso.usuarios_ativos.v.today, 2);
  assert.equal(r.aquisicao.contas_novas.v.d7, 1);
  assert.equal(r.aquisicao.primeiro_laudo_novos.v.d7, 1);
  assert.equal(r.custos.geracao_periodo.v.d30.cost_null_rows, 1);
  assert.equal(r.custos.geracao_periodo.v.d30.cost_usd, 0.003);
  assert.deepEqual(r.custos.por_usuario_30d.v.map((u) => u.rotulo), ["Usuário 1", "Usuário 2"]);
  assert.equal(r.saude.geracao.v.d30.error, 1);
  assert.equal(r.assinaturas.estado_atual.v.producao.linhas, 0);
  const json = JSON.stringify({ ...r, pseudonimos: undefined });
  assert.ok(!json.includes("u1") && !json.includes("u2"), "ids de usuário não podem sair para a tela");
});

test("todo exemplo tem GO; todo real tem fonte", () => {
  const ex = gerarExemplos(dias);
  const r = montarReais(linhas, dias);
  const metricas = [ex.aquisicao, ex.assinaturas, ex.custos, ex.saude, r.aquisicao, r.uso, r.assinaturas, r.custos, r.saude].flatMap((g) => Object.values(g));
  for (const m of metricas) {
    if (m.origem === "exemplo") assert.match(m.go, /G\d/);
    else assert.ok(m.fonte.length > 3);
  }
  assert.equal(goCurto("G6 (x) + G3 (y)"), "G6 + G3");
  assert.equal(goCurto("G3 (x) — ou G1 (y)"), "G3 ou G1");
});

test("tabelas da fase 2: ausente vira exemplo; presente vira real", () => {
  assert.equal(tabelaAusente({ code: "PGRST205", message: "Could not find the table" }), true);
  assert.equal(tabelaAusente({ code: "42501", message: "permission denied" }), false);
  assert.deepEqual(montarUso([], new Map()), {});
  const uso = montarUso(
    [
      { created_at: "2026-10-21T13:00:00Z", user_id: "u1", route: "transcribe", stage: null, provider: "openai", model: "m", input_tokens: null, cached_input_tokens: null, output_tokens: null, audio_seconds: 30, cost_usd: 0.01, measurement: "priced", ok: true, error_code: null, surface: "ios" },
      { created_at: "2026-10-21T13:00:00Z", user_id: "u1", route: "deepgram/token", stage: null, provider: "deepgram", model: "nova", input_tokens: null, cached_input_tokens: null, output_tokens: null, audio_seconds: 120, cost_usd: 0.02, measurement: "priced", ok: false, error_code: "provider_error", surface: "ios" },
      { created_at: "2026-10-21T13:00:00Z", user_id: "u1", route: "generate", stage: "writer", provider: "anthropic", model: "claude-haiku-5-5", input_tokens: 100, cached_input_tokens: 0, output_tokens: 10, audio_seconds: null, cost_usd: 0.001, measurement: "priced", ok: true, error_code: null, surface: "ios" },
    ],
    new Map([["u1", "Usuário 1"]]),
  );
  assert.equal(uso.outras?.origem, "real");
  assert.equal(uso.outras?.v[0]?.transcricao, 0.01);
  assert.equal(uso.deepgram?.v[0]?.minutos, 2);
  assert.deepEqual(uso.rotas?.v.find((r) => r.rota === "deepgram/token"), { rota: "deepgram/token", chamadas: 1, erros: 1 });
  assert.equal(uso.rotas?.v.some((r) => r.rota === "generate"), false, "geração fica fora da tabela de rotas");
  const n = montarNotificacoes(
    [
      { notification_uuid: "n1", received_at: "2026-10-20T13:00:00Z", notification_type: "SUBSCRIBED", subtype: "INITIAL_BUY", environment: "Production", product_id: "p", offer_type: 1, auto_renew_status: 1, user_id: "u1" },
      { notification_uuid: "n2", received_at: "2026-10-21T13:00:00Z", notification_type: "DID_CHANGE_RENEWAL_STATUS", subtype: "AUTO_RENEW_DISABLED", environment: "Production", product_id: "p", offer_type: null, auto_renew_status: 0, user_id: "u1" },
    ],
    dias,
    [
      { notification_uuid: "n1", received_at: "2026-10-20T13:00:00Z", result: "error" },
      { notification_uuid: "n1", received_at: "2026-10-20T13:01:00Z", result: "applied" },
      { notification_uuid: "n2", received_at: "2026-10-21T13:00:00Z", result: "applied" },
    ],
  );
  assert.equal(n.eventos?.v.testes.at(-2), 1);
  assert.equal(n.eventos?.v.cancelamentos.at(-1), 1);
  assert.equal(n.notificacoes?.v.aplicadas, 2);
});
