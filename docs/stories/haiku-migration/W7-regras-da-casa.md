# W7 — Regras da casa decididas pelo Luiz (prompt base, mama, tireoide, parede, vias)

Terminal: o da W3 (Codex gpt-6.1-sol). Branch nova a partir de `feat/haiku-migration`: `fix/regras-da-casa-1010`
(`git switch -c fix/regras-da-casa-1010 feat/haiku-migration` no seu worktree; `pnpm install` se o lockfile mudou).
Leia `_comum.md` e a revisão do W4: `docs/reviews/2026-10-revisao-renderers-prompts.md` (na branch
`chore/revisao-bancada`: `git show chore/revisao-bancada:docs/reviews/2026-10-revisao-renderers-prompts.md`).

## Decisões do Dr. Luiz (09/10/2026, noite)

1. **Hipótese diagnóstica — padrão da casa: "que tem como diagnóstico mais provável …"** (não "compatível com",
   "sugestivo de"). Atualize a regra global que a W3 escreveu em `prompts/global.ts` (hoje: "Na CONCLUSÃO, use
   'compatível com X' / 'sugestivo de X'…") e os contratos/estilos que ensinam outra forma. Nos renderers, levante as
   frases de **conclusão** que expressam hipótese com "compatível com"/"sugestivo de" e converta para o padrão quando for
   hipótese (diagnóstico afirmado pelo médico continua direto: "Cisto simples no rim direito."). Liste no relatório cada
   frase alterada e as que você deixou (com o motivo). Não reintroduza diagnóstico no corpo.
2. **Mama**
   - Exame normal leva **"(Categoria BI-RADS® 1)"**.
   - **Não falou de axilas = exame só das mamas**: título sem axilas; corpo sem a frase dos linfonodos axilares ("imagens
     ovais, com a periferia hipoecoica e o centro hiperecoico nas axilas"); conclusão sem o item dos linfonodos axilares.
     Axilas só entram quando ditadas/solicitadas. Vale para o renderer (`renderer/categories/MAMARIA.ts`: `escopo_exame`,
     `titulo_com_axilas`, `axilas_*`) **e** para o contrato do writer (`prompts/contracts/MAMARIA.ts`).
   - Leve em conta MA-1/MA-2/MA-3 da revisão do W4.
3. **Tireoide — tabela de Domingos (imagem do Luiz):**

   | Eixo | Pontos |
   |---|---|
   | Ecogenicidade anecoica | homogênea 0 · finos ecos/área ecogênica com reverberação 0 · com septos 1 · com componentes sólidos 1 |
   | Ecogenicidade sólida | hipoecoica 3 · isoecoica 2 · hiperecoica 1 · **com áreas anecoicas 1** · sólida com calcificação de parede (casca de ovo) 0 |
   | Margem | regular 0 · irregular 1 · espiculada 2 |
   | Halo hipoecoico (só imagem sólida) | fino e regular 0 · espesso e irregular 2 · sem halo 1 |
   | Forma | mais alto que largo 3 |
   | Dimensões (diâmetro transverso) | até 0,9 cm 0 · ≥ 1,0 até 2,9 cm 1 · ≥ 3,0 cm 2 |
   | Calcificações | sem 0 · casca de ovo 0 · grosseiras com sombra 1 · microcalcificação 3 |
   | Vascularização (Chammas) | I sem 0 · II periférica 1 · III periférica > central 2 · IV central > periférica 3 · V exclusivamente central 4 |
   | **Categorias (= TI-RADS de Domingos)** | 1 benigna: até 3 → controle anual · 2 provavelmente benigna: 4 a 5 → controle ou citopunção · 3 intermediária: ≥ 6 até 9 → citopunção · 4 suspeita: ≥ 10 → citopunção |

   - "Isoecoica com áreas anecoicas" = **1 ponto** (TI-1 da revisão: hoje não existe no enum). Atenção: na mensagem o Luiz
     escreveu "isoecoica sem áreas anecoicas vale 3", mas a tabela dele diz **isoecoica = 2** (hipoecoica = 3). Siga a
     TABELA e registre a divergência no relatório e no status para ele confirmar.
   - Compare a implementação (`renderer/categories/TIREOIDE.ts` e `docs/det-5-tireoide-domingos.md`) com a tabela, eixo a
     eixo e faixa a faixa, corrija divergências e atualize a doc. TI-2 (eixo não ditado) continua decisão pendente: não mude.
4. **Parede abdominal — diástase só com distância > 2 cm** entre os retos. A regra hoje mora no banco (bloco
   `parede-abdominal-regra-diastase-retos`, `knowledge_blocks`) — **não altere o banco**: crie o contrato do writer da
   parede (`prompts/contracts/`, siga o padrão dos outros e registre no `index.ts`) com o limiar, e prepare no relatório o
   SQL proposto para atualizar o bloco (o orquestrador pede GO ao Luiz).
5. **Vias urinárias — rim ausente/nefrectomia/agenesia saindo "normal"** (VU-1 da revisão, 3/13 casos): mesmo defeito que a
   W3 corrigiu no abdome. Corrija em `renderer/categories/VIAS_URINARIAS.ts` (+ `sharedUrinary.ts` se preciso) com teste.

## Testes

`pnpm -F api typecheck`; testes do abdome/mama/tireoide/vias existentes (`renderer/__tests__/*`), `catalog-equivalence`
(explique cada diferença — o modelo derivado aparece na Biblioteca/web), testes novos para cada decisão.
Bancada (assinatura): `--category MAMARIA --scenarios R,A,B` e `--category TIREOIDE --scenarios R,A,B` (90 dias) com
`--reuse` quando possível; compare com as rodadas do W4 em `~/laudousg-wt/revisao/tmp-review/bench-haiku/w4/`.

## Fora do escopo

Motor/pipeline/guards (W1), obstetrícia (W2/W5), web (W6).

## Entregável

Commits em `fix/regras-da-casa-1010` + `docs/stories/haiku-migration/W7-relatorio.md`; status em `status/W7.md`.
