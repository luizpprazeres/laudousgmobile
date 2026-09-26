# Seletor de categoria em famílias — entrega (26/09/2026)

Story: `docs/stories/2026-09-26-clinical-composition-categories.md` (frente "Category picker", owner Opus). Sem commit, push ou deploy.

## O que mudou

- Cinco famílias sempre abertas, sem acordeão nem aba: **Medicina interna** (Abdome Total, Abdome Superior, Vias Urinárias, Próstata, Doppler de carótidas e vertebrais), **Obstetrícia** (Obstétrica, Obstétrica com Doppler, Morfológica, Cervicometria), **Saúde da mulher** (Pelve feminina, Mamas e axilas), **Pequenas partes** (Tireoide, Cervical, Partes Moles) e **Musculoesquelético**.
- Cada exame aparece **uma vez**. Mamas mora em Saúde da mulher e tem um **atalho** (botão compacto, não card) em Pequenas partes; o atalho some durante a busca.
- Mosaico que ocupa a largura: cada família cresce na proporção dos seus exames (cards de ~140 a 280 px). 1920 px: 2 linhas; 1440: 3; 1024: 4; celular: famílias empilhadas, 2 colunas (1 coluna em 320 px).
- Busca global sem acento por **início de palavra** no nome, nos sinônimos e no nome da família ("tiroide", "joelho", "gravidez", "saúde da mulher", "colo"). Enter na busca abre o exame quando sobra um único resultado.
- **IDs de categoria inalterados** (os do catálogo compartilhado). Nada em `LaudarWebExperience` nem na API.

## Arquivos

- `apps/web/src/components/laudar/ExamCategoryPicker.tsx`
- `apps/web/src/components/laudar/categoryGroups.ts` (novo — famílias, nomes de exibição, sinônimos, busca)
- `apps/web/tests/categoryPicker.browser.tsx` (novo)
- `apps/web/tests/categoryPicker.browser.manual.ts` (novo)

## Evidência

```bash
PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
  pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/categoryPicker.browser.manual.ts
```

Resultado: `categoryPicker.browser: OK` em 1920, 1440, 1024, 390 e 320 px. Em cada largura o teste verifica:

- famílias e exames na ordem esperada, 15 exames únicos, 15 imagens distintas, 5 títulos `h2`, 1 atalho de mama em Pequenas partes;
- sem rolagem horizontal, rótulos sem estouro, largura ocupada (1800 px em 1920, 1376 em 1440, 960 em 1024), cards ≤ 290 px no desktop;
- alvos ≥ 44 px no celular (≥ 32 px com ponteiro fino);
- **clique real por coordenada** no centro de cada um dos 15 cards e do atalho: `elementFromPoint` confirma que nada cobre o card e a escolha registrada é a do card;
- teclado: Tab da busca chega ao primeiro exame e segue a ordem visual (atalho depois de Pequenas partes); Enter escolhe; com texto, o Tab passa por "Limpar busca";
- busca: `obstetrica` → 2; `próstata`, `tiroide`, `joelho`, `gravidez`, `colo`, `mama` → 1 exame certo; `saude da mulher` e `pequenas partes` → a família; sem resultado → "Nenhum exame encontrado."; Limpar restaura os 15.

Typecheck e eslint dos quatro arquivos: 0 erros (2 avisos `no-img-element`, mesmo padrão que o picker já tinha).

Regressão `apps/web/tests/dopplerWeb.browser.manual.ts` (teste não alterado): todas as verificações do picker passaram (15 cards e imagens, filtro cinza, fundo branco, fonte e rótulos, busca `obstetrica` = 2, "Nenhum exame encontrado.", Limpar, larguras 1440/390/320, Tab até o primeiro card, movimento reduzido, clique em "Obstétrica com Doppler"). O teste falha **depois**, no workspace:

```
locator.click: Timeout 30000ms exceeded.
  - waiting for getByRole('button', { name: 'Biometria e crescimento', exact: true })
```

A mesma falha, na mesma linha, se reproduz no **HEAD `d1f0b76` isolado** (worktree sem nenhuma mudança local, sem o picker novo). O teste procura o botão da antiga coluna de seções, que não existe no workspace atual. Não é regressão do picker; ninguém foi designado para o teste obsoleto. Logs: `2026-09-26-category-picker-logs/head-d1f0b76-dopplerWeb.log` (HEAD) e `worktree-dopplerWeb.log` (com o picker).

## Limites

- Sinônimos são termos de busca, não conteúdo clínico; um sinônimo amplo demais traz exames que o médico não pediu (comentário em `categoryGroups.ts`).
- Categoria nova no catálogo sem família cai no fim de Medicina interna, para nunca sumir do seletor.
