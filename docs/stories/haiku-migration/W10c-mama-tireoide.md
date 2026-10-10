# W10c — Prompt de mamas/axilas e da tireoide

Terminal: novo (Claude Code Opus 5.5). Worktree: `git worktree add ~/laudousg-wt/w10c -b fix/mama-tireoide-prompt feat/haiku-migration`
(copie o `.env`, `pnpm install`). Leia `_comum.md` e `W10-comum.md`.

## Contexto

- **Mama → writer completo com Haiku** (W7: Haiku escreve 5,86, 6 graves × produção 5,22, 14 graves). Regras aprovadas pelo
  Luiz: normal = "(Categoria BI-RADS® 1)"; sem menção às axilas = exame só das mamas (título, corpo e conclusão sem axilas);
  hipótese = "que tem como diagnóstico mais provável…". Quadrantes da casa: superolateral, inferolateral, superomedial,
  inferomedial (a revisão de termos W11 vem depois, mas não introduza variantes).
- **Tireoide → renderer + Haiku extrator** (W7: produção 6,50 × Haiku extrai 5,70 × Haiku escreve 5,58). O "prompt" aqui é
  o de **extração** (`renderer/categories/TIREOIDE.ts`) e o contrato; a escrita é determinística (tabela de Domingos
  confirmada pelo Luiz, ACR separado). Meça erros de extração por eixo (ecogenicidade, margem, halo, forma, dimensões,
  calcificações, vascularização) contra os finais.
- O prompt global é da W10b: se precisar mudar algo nele, proponha no status.

## Tarefa

Método da W10 nas duas categorias (mama primeiro).
