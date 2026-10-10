# W10a — Prompt da pelve feminina (TA, TV e TA+TV)

Terminal: W4 (Claude Code Opus 5.5). Branch: `fix/pelve-prompt` a partir de `feat/haiku-migration`. Leia `W10-comum.md`.

## Contexto

- Produção hoje: writer dedicado (`pipeline/pelveWriter.ts`, prompt em `renderer/categories/PELVE_FEMININA.ts` +
  `prompts/contracts/PELVE_FEMININA.ts` + biblioteca). Modelo por configuração: Sonnet 5.5 (W1 r3). No W8 (68 laudos):
  produção gpt-4.1 7,44 · Sonnet dedicado 7,06 · Haiku dedicado 6,10; writer genérico bloqueado em 57% (falta o modelo
  `ta-tv`); renderer 3,8.
- Defeitos conhecidos (revisão W4/W8): PV-2 unidade mm × cm (saco gestacional "7,1 cm"); PV-3 "endométrio com espessura
  normal para a fase do ciclo" sem medida ditada; PV-5 o prompt proíbe "____" sem alternativa e o modelo escreve
  "endométrio 0,0 cm" (`PELVE_FEMININA.ts:1530`); legenda FIGO e miomas duplicados na conclusão; título/COMENTÁRIOS
  omitidos em ditado curto. (Markdown/notas do modelo já são limpos pelo W1 r2.)
- As três vias (transabdominal, transvaginal, as duas) mudam título, técnica e o que é avaliável: confira o modelo de
  cada uma nos finais do médico.

## Tarefa

Método da W10 (placar → padrões reais → prompt enxuto → bancada). Compare **Haiku e Sonnet** com o prompt novo
(`BENCH_MODEL` explícito nos dois) e recomende o modelo da pelve — o Luiz escolheu Haiku no MSK depois do prompt novo;
se o Haiku empatar com o Sonnet na pelve, recomende Haiku.
