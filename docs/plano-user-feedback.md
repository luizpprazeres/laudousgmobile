# Plano — Feature `user_feedback` (avaliação de laudos)

> **Status:** 🔵 PLANEJADO (não implementar agora). Origem: boletim de qualidade de
> 2026-06-20 registrou ação de **prioridade baixa** — "criar a tabela `user_feedback`
> no banco MOBILE para habilitar o cruzamento de feedbacks (Passo 3 do protocolo)".
> **Decisão (Luiz, 2026-06-21):** planejar a feature completa (tabela + UI Swift) e
> executar **junto da resubmissão iOS (S10)**, não agora.

## Diagnóstico (2026-06-21) — por que não funciona hoje
1. **Tabela `user_feedback` não existe** no banco MOBILE (`laudousgmobile`,
   `yldtkqrsbgcnwlydrrot`). Confirmado via Supabase (19 tabelas, nenhuma de feedback)
   e não há migration (existem 0001–0017 em `packages/db/src/sql/`).
2. **App Swift não coleta feedback de laudo.** Os "feedback" no código são *haptic
   feedback*; não há UI de avaliação nem `insert`. A tela do laudo é
   `~/laudousg-swift/LaudoUSG/LaudoUSG/Features/Generate/GenerateView.swift`.
3. **`reports` não tem coluna `feedback`** no banco MOBILE (colunas reais: id, user_id,
   category_code, writing_style_id, status, raw_input, consolidated_transcript,
   structured_findings, generated_output, final_output, rag_blocks_used, sanity_result,
   generation_metadata, created_at, updated_at). → Feedback precisa ser **tabela à parte**.

Conclusão: o Passo 3 do protocolo (cruzamento de feedbacks) não tem como rodar enquanto
faltarem **a tabela** e **a coleta no cliente**.

## Peça 1 — Migration `user_feedback` (monorepo)
Arquivo: `packages/db/src/sql/0018_user_feedback.sql`

```sql
create table public.user_feedback (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_code text,                     -- denormalizado de reports p/ cruzamento no boletim
  verdict     text not null check (verdict in ('positive','negative')),  -- 👍/👎
  comment     text,                       -- feedback livre, opcional
  created_at  timestamptz not null default now()
);

-- 1 feedback por (laudo, usuário); permite atualizar o veredito
create unique index user_feedback_report_user_uniq on public.user_feedback (report_id, user_id);
create index user_feedback_category_idx on public.user_feedback (category_code, created_at);

alter table public.user_feedback enable row level security;
create policy user_feedback_select_own on public.user_feedback for select using (auth.uid() = user_id);
create policy user_feedback_insert_own on public.user_feedback for insert with check (auth.uid() = user_id);
create policy user_feedback_update_own on public.user_feedback for update using (auth.uid() = user_id);
-- O backend (service role) bypassa RLS e lê tudo para o boletim.
```

Decisão de modelo: `verdict` 👍/👎 (binário) é o mínimo viável e o que o boletim precisa
para cruzar "laudo ruim ↔ achado de qualidade". Evoluível para `rating smallint (1..5)`
depois sem quebrar (coluna adicional). `comment` opcional captura o "porquê".

## Peça 2 — UI no app Swift (`GenerateView`)
- Após o laudo gerado (estado `.done` no `GenerateViewModel`), exibir um bloco discreto:
  **"Esse laudo ficou bom?"** com 👍 / 👎 e, ao tocar 👎, um campo opcional de comentário.
- Ao avaliar: `insert`/`upsert` em `user_feedback` via o Supabase client já usado no app
  (mesmo padrão de `reports`), com `report_id` = id do report recém-criado pela geração,
  `category_code` copiado do report, `verdict` e `comment`.
- Idempotência: upsert por `(report_id, user_id)` — reavaliar troca o veredito.
- Acessível também na `HistoryView` (avaliar um laudo antigo) — opcional na 1ª fase.

## Peça 3 — Cruzamento no boletim (monorepo, `apps/api`)
- O Passo 3 do protocolo de qualidade passa a ler `user_feedback` (join com `reports`)
  e cruzar **feedbacks negativos** com os achados de qualidade do dia (alucinação, número
  trocado, etc.), priorizando casos onde o usuário sinalizou 👎.
- Enquanto a tabela estiver vazia, o boletim apenas reporta "0 feedbacks" (sem erro).

## Faseamento (executar no S10 — iOS, dex1)
1. `apply_migration` 0018 no banco MOBILE (cria tabela + RLS).
2. UI de feedback na `GenerateView` + service de insert (dex1, Swift).
3. Ajuste do Passo 3 do boletim para consumir `user_feedback` (engine, monorepo).
4. Validar ponta a ponta: avaliar um laudo no app → linha em `user_feedback` → boletim cruza.

## Notas
- **Só criar a tabela sem a UI deixa-a vazia** (silencia o boletim, mas sem dados) — por
  isso a decisão de fazer as 3 peças juntas no S10, não a tabela isolada agora.
- Achado lateral do diagnóstico: `quality_bulletins` está com **RLS desabilitado** no banco
  MOBILE (exposto à anon key) — tratar à parte com policy adequada.
