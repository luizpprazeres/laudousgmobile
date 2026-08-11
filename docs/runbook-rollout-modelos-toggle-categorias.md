# Runbook de rollout — GPT-5.4 mini + toggle difícil + categorias Livre/Teste

Feature completa e testada na branch `feat/model-resolver-hard-mode` (backend+RN) + branch própria no repo Swift (iOS). Tudo flag-gated; **hoje em prod nada mudou** (defaults preservam o gpt-4.1-mini e o modo hard desligado). Rollout em fases, na ordem — cada fase é reversível.

## Fase 0 — merge + deploy do código (sem ligar nada)
- Merge das branches (backend/RN via worktree limpo p/ main, como no padrão do venoso; iOS via seu fluxo). Deploy. Como todos os defaults preservam o comportamento atual, este deploy é no-op funcional.
- **Aplicar a migration no DB de prod:** `packages/db/src/sql/0021_categorias_livre_teste.sql` (cria LIVRE e TESTE, `ON CONFLICT DO NOTHING`). Após isso, **LIVRE** aparece no seletor de todos; **TESTE** só aparece para o usuário autorizado (Fase 2).

## Fase 1 — validar GPT-5.4 mini na categoria TESTE (antes de tocar no padrão)
Objetivo: ver o modelo novo na prática sem afetar nenhum laudo real.
- Descubra seu `user_id` (tabela `profiles`/auth do Supabase — o id da sua conta).
- Setar no Vercel (projeto `laudousgmobile`), com `printf 'valor\n'` (o trailing newline é gotcha conhecido) + **deploy fresco**:
  - `TESTE_ALLOWED_USER_ID` = seu user_id
  - `TESTE_CATEGORY_MODEL` = `gpt-5.4-mini` (validar o candidato ao padrão AQUI primeiro)
  - `TESTE_CATEGORY_BASE_URL` = `https://api.openai.com/v1` (usando OpenAI mesmo, só p/ exercitar o caminho)
  - `TESTE_CATEGORY_API_KEY` = sua OPENAI_API_KEY
  - `TESTE_REASONING_EFFORT` = `low`
- No app (sua conta): categoria **Teste** → ditar casos reais → comparar com o writer atual (metodologia `docs/model-benchmark.html`: TTFT, tempo total, estilo sem markdown, comando executado, medida/achado preservados, alucinação).

## Fase 2 — trocar a TESTE para o DeepSeek (experimentação)
Só depois de validar o GPT-5.4 mini. ⚠️ **PHI:** só ditados sintéticos/desidentificados/seus — DeepSeek é nuvem China (sem LGPD/contrato).
- `TESTE_CATEGORY_MODEL` = `deepseek-v4-pro` (qualidade) ou `deepseek-v4-flash` (velocidade)
- `TESTE_CATEGORY_BASE_URL` = `https://api.deepseek.com`
- `TESTE_CATEGORY_API_KEY` = sua key DeepSeek
- (fail-closed já garante: se faltar qualquer uma, a Teste falha explícito, não vaza p/ o provider default.)

## Fase 3 — flipar o writer PADRÃO para GPT-5.4 mini (prod)
Só depois de Fase 1 aprovada. **Structurer valida separado** (writer puro não passa por ele).
- `OPENAI_MODEL_WRITER` = `gpt-5.4-mini`
- `OPENAI_WRITER_REASONING_EFFORT` = `low`
- `OPENAI_MODEL_STRUCTURER` = `gpt-5.4-mini` (validar structurer com casos que passam por ele)
- Rollback trivial: voltar as duas envs p/ `gpt-4.1-mini` + `none` e deploy.
- Considerar **fixar snapshot** do modelo pós-validação (evitar mudança silenciosa de alias).

## Fase 4 — ligar o toggle "laudo difícil"
- `HARD_MODE_ENABLED` = `true`
- `HARD_MODE_MODEL` = `gpt-5.4` (default; effort é forçado `low` no código)
- No app: o toggle "Avançado" (RN) / cérebro (iOS) passa a gerar com o modelo premium + writer puro (sem renderer, guards viram aviso). Se OFF no server, o toggle no app não tem efeito (cai no standard).

## Notas
- Gotcha env Vercel: `printf 'true\n'` (mostra "Removed trailing newline") + **deploy fresco** (redeploy pode reusar env antigo).
- Nenhuma env exposta em log carrega a API key (o resolver retorna `credentialRef`, não a key).
- Validação em device pendente: Android com PIN bloqueia screenshot; iOS no iPhone do Luiz.
