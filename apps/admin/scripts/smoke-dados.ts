/**
 * Smoke LOCAL e só leitura: roda o carregador do painel contra o banco e o App Store Connect reais
 * e imprime apenas agregados (nunca chaves, e-mails ou ids). Opcionalmente salva o snapshot.
 *
 *   npx tsx --env-file=<arquivo .env com SUPABASE_*> scripts/smoke-dados.ts [saida.json]
 *
 * Para o TestFlight: ASC_KEY_ID, ASC_ISSUER_ID e ASC_PRIVATE_KEY_PATH (só fora de produção).
 */
import { writeFileSync } from "node:fs";
import { carregarPainel } from "../src/lib/data/painel";
import { configServidor } from "../src/lib/env";

async function main() {
  // A allowlist não importa aqui (não há login); só evita a falha fechada do configServidor.
  const cfg = configServidor({ ...process.env, ADMIN_EMAILS: process.env.ADMIN_EMAILS || "smoke@local.invalid" });
  if (!cfg) throw new Error("Faltam SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  const d = await carregarPainel(cfg);
  const tf = d.testflight;
  const resumo = {
    hoje: d.meta.hoje,
    contas_novas: { hoje: d.aquisicao.contas_novas.v.today, d7: d.aquisicao.contas_novas.v.d7, d30: d.aquisicao.contas_novas.v.d30, total: d.aquisicao.contas_novas.v.total },
    laudos: { hoje: d.uso.laudos.v.today, d7: d.uso.laudos.v.d7, d30: d.uso.laudos.v.d30, total: d.uso.laudos.v.total },
    usuarios_ativos: { hoje: d.uso.usuarios_ativos.v.today, d7: d.uso.usuarios_ativos.v.d7, d30: d.uso.usuarios_ativos.v.d30 },
    custo_geracao_usd: { hoje: d.custos.geracao_periodo.v.today.cost_usd, d7: d.custos.geracao_periodo.v.d7.cost_usd, d30: d.custos.geracao_periodo.v.d30.cost_usd, sem_preco_30d: d.custos.geracao_periodo.v.d30.cost_null_rows },
    geracao_30d: d.saude.geracao.v.d30,
    assinaturas_producao: d.assinaturas.estado_atual.v.producao,
    testflight: tf.ok ? { testadores: tf.dados.testadores.length, sessoes_30d: tf.dados.uso.d30.sessoes, crashes_30d: tf.dados.uso.d30.crashes, build: tf.dados.builds[0]?.build, chamadas: tf.dados.chamadas.map((c) => c.status) } : { erro: tf.motivo },
    instalacoes_apple: d.instalacoes_apple.status,
    avisos: d.avisos,
  };
  console.log(JSON.stringify(resumo, null, 2));
  const saida = process.argv[2];
  if (saida) writeFileSync(saida, JSON.stringify(d));
}

main().catch((e) => {
  console.error("smoke falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
