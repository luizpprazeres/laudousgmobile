-- 0018_web_reports.sql
-- Versiona a tabela `web_reports` (laudos do gerador determinístico da WEB, S9).
-- A tabela e suas RLS policies já existem no banco MOBILE (criadas via MCP no S9);
-- esta migration documenta/versiona o estado real e é IDEMPOTENTE (segura para
-- reaplicar). Gaveta própria, separada de `reports` (pipeline com IA); o histórico
-- da web unifica as duas por origem.

create table if not exists public.web_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  category_code text not null,
  title         text,
  laudo_text    text not null,
  exam_state    jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists web_reports_user_created_idx
  on public.web_reports (user_id, created_at desc);

alter table public.web_reports enable row level security;

-- Isolamento por usuário (auth.uid() = user_id) — espelha as policies de `reports`.
drop policy if exists web_reports_select_own on public.web_reports;
create policy web_reports_select_own on public.web_reports
  for select using (auth.uid() = user_id);

drop policy if exists web_reports_insert_own on public.web_reports;
create policy web_reports_insert_own on public.web_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists web_reports_update_own on public.web_reports;
create policy web_reports_update_own on public.web_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists web_reports_delete_own on public.web_reports;
create policy web_reports_delete_own on public.web_reports
  for delete using (auth.uid() = user_id);
