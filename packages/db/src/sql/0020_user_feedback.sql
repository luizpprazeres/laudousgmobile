-- 0020_user_feedback.sql
-- Feature de avaliação de laudos (S10). Origem: boletim de qualidade pediu a tabela
-- para habilitar o cruzamento de feedbacks (Passo 3 do protocolo). Ver
-- docs/plano-user-feedback.md. Coletada pelo app Swift (👍/👎 após o laudo) e lida
-- pelo boletim diário (service role).

create table if not exists public.user_feedback (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  category_code text,                     -- denormalizado de reports p/ cruzamento no boletim
  verdict       text not null check (verdict in ('positive','negative')),  -- 👍/👎
  comment       text,                     -- feedback livre, opcional
  created_at    timestamptz not null default now()
);

-- 1 feedback por (laudo, usuário); reavaliar troca o veredito (upsert).
create unique index if not exists user_feedback_report_user_uidx
  on public.user_feedback (report_id, user_id);
create index if not exists user_feedback_category_idx
  on public.user_feedback (category_code, created_at);

alter table public.user_feedback enable row level security;

drop policy if exists user_feedback_select_own on public.user_feedback;
create policy user_feedback_select_own on public.user_feedback
  for select using (auth.uid() = user_id);

drop policy if exists user_feedback_insert_own on public.user_feedback;
create policy user_feedback_insert_own on public.user_feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists user_feedback_update_own on public.user_feedback;
create policy user_feedback_update_own on public.user_feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- O backend (service role) bypassa RLS e lê tudo para o boletim diário.
