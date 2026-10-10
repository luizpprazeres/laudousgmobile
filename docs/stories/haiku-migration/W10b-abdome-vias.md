# W10b — Prompt do abdome total e das vias urinárias (+ dono do prompt global)

Terminal: novo (Claude Code Opus 5.5). Worktree: `git worktree add ~/laudousg-wt/w10b -b fix/abdome-vias-prompt feat/haiku-migration`
(copie o `.env`, `pnpm install`). Leia `_comum.md` e `W10-comum.md`.

## Contexto

- Ambos vão para o **writer completo com Haiku 5.5** (`FULL_WRITER_CATEGORIES`): bancadas de 09/10 — abdome (W3, 90 dias)
  Haiku escreve 7,22 × produção 6,64; vias (W4) 6,00 × 4,81. As correções do renderer (W3/W7) valem para o caminho do
  renderer e para a Biblioteca/web; o foco aqui é o **prompt do writer**.
- O system do writer do abdome tem ~37 mil caracteres (global + contrato + estilo + biblioteca + few-shots) e carrega
  regras de outras categorias (ex.: protocolo de líquido amniótico com `{LINHA_LIQUIDO_AMNIOTICO}`). É o maior ganho de
  enxugamento.
- Abdome e vias compartilham rins e bexiga: alinhe as frases e as regras (inclusive rim ausente/nefrectomia/agenesia,
  hipodistensão, "imóvel").

## Você é o dono de `prompts/global.ts`, `buildSystemMessage.ts`, `styles.ts`, `universalCoreV2.ts`

Mudanças aí valem para todas as categorias do writer: meça em abdome, vias e numa terceira (ex.: mama ou parede abdominal)
antes de commitar. Mantenha as regras da casa já aprovadas: corpo descritivo, "que tem como diagnóstico mais provável…",
exame escolhido no ditado, sem conduta não ditada, saída em texto puro.

## Tarefa

Método da W10 nas duas categorias (abdome primeiro, depois vias).
