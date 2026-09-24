# `alteracoes.manual.ts` — 10 falhas preexistentes: evidência e decisão

Data: 2026-09-24
Arquivo: `apps/api/src/server/renderer/__tests__/alteracoes.manual.ts`
Escopo: só este teste e este documento. Nenhum código de produção foi alterado (renderers, cenários, schemas). Sem commit, push, deploy nem banco.

## Resultado

| | Antes | Depois |
|---|---|---|
| Asserções | 286 | 299 |
| Falhas | 10 | **2** |

- **8 falhas eram asserções obsoletas** (o contrato dos renderers mudou de propósito). Foram reescritas, com contraposições mais fortes que as originais.
- **2 falhas são BUG REAL de produção** (cenário `axilas_atipicas` da MAMÁRIA). **Não foram mascaradas**: continuam falhando e estão descritas abaixo.

Comando: `cd apps/api && pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/alteracoes.manual.ts`

## As 10 falhas, uma a uma

### TIREOIDE — 4 obsoletas

| # (ordem original) | Asserção antiga | O que o renderer faz hoje |
|---|---|---|
| 1 | "o suspeito recebe TI-RADS alto" (`/TI-RADS [45]/`) | o clássico classifica pelo escore de **Domingos**: `NOTA FINAL 15 (características suspeitas pela escala de Domingos)` |
| 2 | "o benigno recebe TI-RADS baixo" (`/TI-RADS [123]/`) | `NOTA FINAL 3 (características benignas pela escala de Domingos)` |
| 3 | "…e traz as duas classificações" (2 × `TI-RADS`, seção 4) | uma `NOTA FINAL n` por imagem; sem ACR |
| 8 | "…e a classificação calculada" (`/TI-RADS \d/`, seção 10) | `NOTA FINAL n` |

**Por que é obsoleta, não bug.** `TIREOIDE.ts` deixou de converter a nota em TI-RADS: `calcAcrTirads` usa só os cinco grupos ACR e o comentário diz que "a Nota de Domingos não é atalho para ACR e nunca entra nesta soma" (`TIREOIDE.ts:1223`); `noduloConclusao` (`:800`) imprime a nota de Domingos e só acrescenta `; ACR TI-RADS n` quando há grupos ACR. As categorias de Domingos vêm de `tiradsDaNota` (≤3 → 1, ≤5 → 2, ≤9 → 3, ≥10 → 4) e de `caracteristicasDoTirads`. O cenário `nodulo_solido_*` não traz grupos ACR, logo não sai ACR.

**Como ficou (mais forte que antes).**
- suspeito: nota ≥ 10 **e** "características suspeitas pela escala de Domingos";
- benigno: nota ≤ 3 **e** "características benignas pela escala de Domingos";
- as duas notas são numericamente diferentes (antes esta asserção passava vazia: `"a" !== "b"` quando nenhuma classificação era encontrada);
- **contraposição nova:** nenhum `ACR TI-RADS` aparece nos cenários (a nota de Domingos não vira ACR);
- seção 4: exatamente 2 `NOTA FINAL n` e nenhum ACR inventado.

### MAMÁRIA — BI-RADS, 2 obsoletas

| # | Asserção antiga | O que o renderer faz hoje |
|---|---|---|
| 6 | "o suspeito recebe BI-RADS alto" (`/BI-RADS® [45]/`) | sem ditado e sem permissão: **nenhuma** categoria (só o rodapé `BI-RADS®`) |
| 7 | "o benigno recebe BI-RADS baixo" (`/BI-RADS® [123]/`) | idem |

**Por que é obsoleta.** `biradsDoAchado` (`MAMARIA.ts:291`): `birads_ditado` vence; sem ditado o cálculo só existe com `permitir_birads_calculado === true`, e o default é `false`. Os cenários não ligam essa permissão. Isso é a decisão registrada em `docs/reviews/2026-09-24-clinical-ui-architecture.md` (sugestão ≠ decisão médica) e em `mamaria-golden.manual.ts`.

**Como ficou.** Reproduzido antes de escrever (probe com o renderer real):

| Situação | Suspeito | Benigno |
|---|---|---|
| sem ditado, sem permissão | sem categoria | sem categoria |
| `permitir_birads_calculado: true` | 5 | 3 |
| permitido + `birads_ditado: "2"` | 2 | 2 |
| `birads_ditado: "5"` sem permissão | 5 | 5 |

O gate agora afirma, nos dois estilos: (1) sem ditado/permissão **nenhuma** categoria é inventada; (2) com permissão o renderer calcula e distingue os dois (suspeito 4/5, benigno 1–3, diferentes); (3) o ditado vence o cálculo e vale mesmo sem permissão. Cobre o que a asserção antiga cobria (o renderer classifica) e o que ela não podia cobrir (ele **não** classifica sozinho).

### MAMÁRIA — axilas atípicas, 2 obsoletas (seção 13; falhas nº 9 e 10)

| # | Asserção | Causa |
|---|---|---|
| 9, 10 | "fora do padrão diz ATÍPICO" (clássico e objetivo) | o seed do teste era `{ titulo_com_axilas: true, axilas_alteradas: true }` |

O renderer agora decide o escopo por `escopoDe(f)` (`MAMARIA.ts:432`): `escopo_exame` vence e só na ausência dele vale `titulo_com_axilas`. O achado normal derivado do schema preenche `escopo_exame` com o **primeiro valor do enum, `"mamas"`** (confirmado: `achadoNormalDe(...).escopo_exame === "mamas"`), então o seed antigo produzia um laudo **sem axilas** e não havia linha de linfonodo para conferir.

**Como ficou.** Os seeds do teste passam `escopo_exame: "mamas_axilas"` (a web faz o mesmo: `mamariaParaCatalogo.ts:352`). Todas as contraposições originais foram mantidas: normal não diz atípico; atípico diz ATÍPICO; não diz "aspecto alterado"; não escreve normalidade junto; não inventa lado nem morfologia. A asserção deixou de ser vazia: antes falhava por falta de linha, agora confere o texto real.

## BUG REAL (não mascarado): cenário `axilas_atipicas` da MAMÁRIA

**Falhas restantes (originais nº 4 e 5, seção 7):**
- `MAMARIA/CLASSICO_COMPLETO · axilas_atipicas: renderiza e muda o laudo`
- `MAMARIA/OBJETIVO · axilas_atipicas: renderiza e muda o laudo`

**Causa.** `apps/api/src/server/renderer/catalog/alteracoes/MAMARIA.ts` (id `axilas_atipicas`) tem `seed: { titulo_com_axilas: true, axilas_alteradas: true }` — sem `escopo_exame`. O comentário do próprio arquivo diz que `titulo_com_axilas` é "pré-requisito", mas hoje ele não basta: `escopo_exame` (`"mamas"` por derivação do schema) tem precedência.

**Reprodução com o caminho real da rota** (`renderizarSelecao`, o mesmo que `POST /api/catalog/MAMARIA/render`):

| Chamada | Clássico e Objetivo |
|---|---|
| `alteracoes: ["axilas_atipicas"]` | **nenhuma menção a axilas** — o achado clicado some do laudo |
| `alteracoes: ["axilas_atipicas"]` + `dados: { escopo_exame: "mamas_axilas" }` | `Linfonodos axilares de aspecto atípico.` (corpo e conclusão) |

**Impacto.**
1. `GET /api/catalog/MAMARIA` monta a lista com `previaDaAlteracao` (`route.ts:75`); como o cenário não muda o laudo, a prévia é `null` e ele **desaparece da lista** — o médico nem consegue escolher "Linfonodos axilares atípicos" por esse caminho.
2. Se algum cliente mandar o id direto, recebe **200 com laudo sem axilas**: seleção descartada em silêncio, o modo de falha que o gate existe para impedir.
3. A tela web de mamas **não** é afetada por esse caminho: o adaptador envia `escopo_exame` explícito.

**Correção sugerida (não aplicada — produção clínica):** acrescentar `escopo_exame: "mamas_axilas"` ao `seed` de `axilas_atipicas`. É uma linha; ao aplicá-la as duas falhas restantes devem passar sem mudar este teste. Como `seed` é achado clínico do cenário, a decisão é de quem é dono do catálogo MAMÁRIA.

## O que este teste NÃO prova
- Não valida a redação nem a conduta clínica; valida o comportamento do renderer e as contraposições do contrato.
- Não cobre o caminho web (adaptadores) nem a rota HTTP com autenticação; usa `renderizarSelecao` e `laudoPadraoDe` diretamente.
- As 2 falhas restantes são intencionais até a correção de produção acima.

## Correção aplicada pelo coordenador

Após a reprodução acima, o seed de `axilas_atipicas` passou a declarar `escopo_exame: "mamas_axilas"`. A verificação existente, que antes falhava, passou sem remoção nem relaxamento. Resultado final: 300/300 em `alteracoes.manual.ts`. A alteração não inventa lateralidade, morfologia ou classificação; preserva o escopo da opção que o médico selecionou.
