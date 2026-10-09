# W1 — rodada 3: Sonnet 5.5 nos writers pesados + guard de comandos por laudo

Terminal: W1 (Claude Code Opus 5.5), depois de terminar a rodada 2. Mesma branch `feat/haiku-motor`
(`git merge feat/haiku-migration` antes de começar). **Carregue a skill `claude-api`** (seção do Claude Sonnet 5.5).

## Decisões do Dr. Luiz (09/10/2026, noite)

1. **O gpt-4.1 sai definitivamente** (já recusado em código pelo W1 — confirme que não sobrou nenhum caminho, inclusive
   consultor/fallbacks/visão; `HARD_MODE_MODEL` gpt-5.4 e categoria TESTE continuam fora do escopo).
2. **MSK, carótidas e pelve vão para o Claude Sonnet 5.5 (`claude-sonnet-5-5`)** — exigem mais (vários laudos no mesmo
   ditado). O modelo final do MSK ainda depende do teste Haiku × Sonnet que o W4 está rodando (W8): implemente **por
   configuração** (modelo do writer por categoria via env com default no código: MUSCULOESQUELETICO_V2, PELVE_FEMININA,
   DOPPLER_CAROTIDAS → Sonnet 5.5; demais → Haiku 5.5), para trocar sem novo deploy de código.
   - MSK e pelve: no **writer dedicado** (`mskWriter.ts`, `pelveWriter.ts`), não no genérico (a pelve no genérico é
     bloqueada em 57% — falta o modelo ta-tv; o MSK genérico tirou 4,2).
   - Carótidas: writer genérico com Sonnet (produção hoje 9,8 com gpt-5.4-mini; Haiku 6,0–6,5).
   - Sonnet 5.5 no API (confirme na skill): `thinking` não pode ser `disabled`; sampling não-default → 400; esforço default
     `high` (recalibrado); recusas em várias categorias de `stop_details` — trate como o Haiku; a skill recomenda
     `fallbacks: "default"` com o beta `server-side-fallback-2026-07-01` no Claude API — **avalie e documente** (o fallback
     troca o modelo em caso de recusa; registre o modelo efetivo na auditoria). Custo/latência na auditoria.
3. **Guard de comandos (T1 + MK-1 da revisão do W4, prioridade 1 "antes do GO")** — `commandGuard.ts:130`,
   `commandOperations.ts`, `conclusionUtils.ts:26-41`, `route.ts` (aplicações pós-writer e pós-renderer):
   - operar **por laudo** (dividir pelo título "ULTRASSONOGRAFIA…") antes de mexer na conclusão — hoje, com vários laudos no
     mesmo ditado e um comando, o 2º/3º/4º laudo viram itens da conclusão do 1º (4 casos reais em produção no MSK);
   - no caminho **writer** (genérico e dedicados), **não acrescentar** itens — o writer já recebeu o comando no ditado;
   - `parseConclusion` para no rodapé; gatilho só imperativo; sem corte no ponto decimal ("1.5 cm").
   - 80% do que o guard acrescenta hoje é apagado pelo médico (56 itens em 90 dias, 45 apagados): use os casos da revisão
     (`docs/reviews/2026-10-revisao-renderers-prompts.md`, seção T1) como testes.

## Testes

Unitários (cliente falso) para o roteamento de modelo por categoria e para o guard (multi-laudo, decimal, rodapé, writer
sem acréscimo); typecheck; os `.manual.ts` afetados; replay R de ABDOMEN_TOTAL 11/11; bancada pela assinatura com
`BENCH_MODEL=claude-sonnet-5-5` num punhado de casos de MSK multi-laudo e de carótidas para provar o caminho.

## Entregável

Commits em `feat/haiku-motor`, `W1-relatorio.md` atualizado (envs novas: modelo por categoria, fallback), status `W1.md`.
