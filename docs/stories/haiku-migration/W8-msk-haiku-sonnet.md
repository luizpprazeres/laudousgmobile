# W8 — MSK: Haiku 5.5 × Sonnet 5.5 como escritor, pela assinatura (para o Luiz escolher)

Terminal: o da W4 (Claude Code Opus 5.5), logo depois da junção da bancada (antes da W6). Branch: `chore/revisao-bancada`.

## Decisão do Dr. Luiz (09/10/2026, noite)

O gpt-4.1 sai de vez. MSK, carótidas e pelve exigem mais (vários laudos no mesmo ditado), e a proposta é usar um modelo
mais forte, **Claude Sonnet 5.5**. Antes de decidir, ele quer **ver** os últimos laudos MSK escritos 100% pelo writer com
Haiku e com Sonnet, comparados ao laudo final do histórico.

## Rodada

- MUSCULOESQUELETICO_V2, 90 dias, todos os casos com laudo final (≈ 71), concorrência 3.
- Candidatos, julgados **juntos** pelo mesmo juiz (Opus 5.5, cego, regras da casa + MSK):
  - `gpt` — o que a produção gerou (gpt-4.1, writer dedicado);
  - Haiku no **writer dedicado** do MSK (o seu cenário A) — reaproveite se o código do writer não mudou;
  - **Sonnet 5.5 no writer dedicado** (`claude -p --model claude-sonnet-5-5`, mesma configuração de esforço);
  - Haiku no **writer genérico** (B2) e **Sonnet 5.5 no writer genérico** — para mostrar se o dedicado ainda é necessário.
  A bancada hoje tem um modelo por rodada (`BENCH_MODEL`): acrescente o que for preciso para nomear candidatos extras
  (ex.: chaves `AS`/`B2S`) e julgá-los no mesmo `--rejudge`, sem quebrar as rodadas antigas.
- Como na revisão, mostre os números também **sem os casos destruídos pelo guard de comandos** (MK-1) — o defeito é do
  guard, não do modelo, e afeta todos.
- Depois, se o MSK terminar com folga de assinatura: a mesma comparação Haiku × Sonnet (writer dedicado e genérico) em
  PELVE_FEMININA (68) e DOPPLER_CAROTIDAS (4).

## Entregáveis

- HTML local por rodada (`relatorio.py`) com os candidatos lado a lado — é o que o Luiz vai abrir para escolher.
  Ajuste os rótulos do relatório para os novos candidatos (ex.: "Sonnet 5.5 — writer dedicado").
- Seção nova no `docs/reviews/2026-10-revisao-renderers-prompts.md` com a tabela Haiku × Sonnet (média, ≤ 4, omissões,
  invenções, lateralidade, multi-laudo) e a sua recomendação; latência mediana por candidato (`calls.jsonl`).
- Status `status/W4.md` (`pronto-para-revisao` ao terminar) e depois siga para a W6.
