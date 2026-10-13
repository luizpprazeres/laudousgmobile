-- Estudo de transcrição 12/10/2026 (opção B): o que o Deepgram devolveu ANTES da edição do médico.
-- reports.raw_input guarda o texto já editado e normalizado; sem isto, os erros que o médico corrige
-- à mão (ex.: "100 sinais" → "sem sinais") são invisíveis. Dado sensível no mesmo nível do ditado:
-- só o servidor lê/escreve (RLS ligada, sem políticas, sem grant para anon/authenticated).
-- Apaga junto com o laudo e com a conta.
create table if not exists public.asr_capturas (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  categoria text,
  provedor text not null,
  modelo text,
  texto_original text not null,
  texto_enviado text not null,
  -- [[palavra, confiança, início_s], ...] dos trechos finais do Deepgram
  palavras jsonb,
  -- [{"antes": "...", "depois": "..."}] — o que mudou entre o original e o enviado
  correcoes jsonb not null default '[]'::jsonb,
  editado boolean not null,
  baixa_confianca integer,
  created_at timestamptz not null default now()
);
create index if not exists asr_capturas_created_at_idx on public.asr_capturas (created_at desc);
create index if not exists asr_capturas_report_id_idx on public.asr_capturas (report_id);
alter table public.asr_capturas enable row level security;
revoke all on public.asr_capturas from anon, authenticated;
