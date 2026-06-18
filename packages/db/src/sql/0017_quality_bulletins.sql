-- Lab v2 — boletim diário de qualidade dos laudos.
-- Gravado por um agente Claude agendado (revisa os laudos do dia anterior:
-- alucinações, comandos ignorados, números trocados, violações de doutrina,
-- bloqueios/crashes, uso do coringa, latência) e lido pelo Lab v2.
-- Ver docs/boletim-diario-prompt.md.

create table if not exists quality_bulletins (
  id            uuid primary key default gen_random_uuid(),
  bulletin_date date not null,           -- o dia analisado (D-1)
  laudos_count  integer,                 -- nº de laudos revisados
  summary       text,                    -- resumo executivo
  findings      jsonb,                   -- [{report_id, category, severidade, tipo, evidencia, sugestao}]
  actions       jsonb,                   -- [{prioridade, acao, motivo}] — ações priorizadas
  created_at    timestamptz not null default now()
);

-- 1 boletim por dia (idempotência: o agente pode re-rodar sem duplicar).
create unique index if not exists quality_bulletins_date_uidx
  on quality_bulletins (bulletin_date);
