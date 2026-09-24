# Mamas — compactação, BI-RADS por achado e defeitos clínicos (24/09/2026)

Validação técnica para a revisão final integrada. Sem commit, push ou deploy.
Nenhum teste aqui valida acerto clínico: os casos são sintéticos, embora o
adaptador e o renderer sejam os de produção.

## 1. Escopo entregue

| Frente | O que mudou |
|---|---|
| Compactação do formulário | Distâncias/horário em campos estreitos com unidade; lado, tipo, medidas, localização, horário e distâncias numa linha que quebra; tipo (10 opções) e padrão de calcificação (5) em lista; descritores ≤ 4 opções em chips; alvos de 44 px no celular. Chaves e valores do estado inalterados. |
| Painel BI-RADS por achado | Novo painel para `calc:bi-rads`, sincronizado ao estado `mamas`. Sugere categoria só com critério completo e citado; suspeito sem subcategoria; incompleto e fora de escopo sem categoria; nada entra no laudo sem o médico aplicar ou escolher. |
| Sugestão inline antiga | Retirada do `MamariaFormPanel`; o formulário usa a mesma regra do painel. Chips manuais preservados. |
| Defeito: cisto herdando descritores sólidos | O adaptador só passa os campos que a tela mostra para o tipo atual (mesmo problema corrigido em descritores adicionais, medidas e microcalcificações). |
| Defeito: forma/orientação ausentes no texto | Renderer escreve "de forma irregular/redonda" e "maior eixo não paralelo à pele". Oval segue omitida (regra da casa); oval + paralela byte a byte igual. |
| Defeito: calcificação com valor visual falso | Lista mostra "Escolha o padrão"; sem padrão, pendência que bloqueia o laudo com o motivo. |

## 2. Arquivos

Código:
- `apps/web/src/components/laudar/MamariaFormPanel.tsx`
- `apps/web/src/components/laudar/MamariaBiradsPanel.tsx` (novo)
- `apps/web/src/lib/calculators/mamariaBiradsSugestao.ts` (novo)
- `apps/web/src/lib/catalog/mamariaParaCatalogo.ts`
- `apps/api/src/server/renderer/categories/MAMARIA.ts`

Testes:
- `apps/web/tests/mamariaAdapter.manual.ts` (novo — contraexemplos)
- `apps/web/tests/mamariaBirads.manual.ts` (novo — contrato)
- `apps/web/tests/mamariaBirads.browser.tsx` e `.browser.manual.ts` (novos)
- `apps/web/tests/mamariaForm.browser.tsx` e `.browser.manual.ts` (novos)

Não foram alterados: `packages/shared/src/calculators/mamariaBirads.ts`,
`LaudarWebExperience.tsx`, `OrganFormPanel.tsx`, `run-unit.cjs`.

## 3. Comandos e resultados

Da raiz do repositório. Os de navegador precisam de
`PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright`.

```bash
pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaAdapter.manual.ts         # 12/12
pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaBirads.manual.ts          # 46/46
pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaForm.browser.manual.ts    # OK 1440 e 390 px
pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaBirads.browser.manual.ts  # OK 1440 e 390 px
```

De `apps/api`:

| Teste | Resultado |
|---|---|
| `src/server/renderer/__tests__/mamaria-golden.manual.ts` | 35 passaram, 0 falharam |
| `src/server/renderer/__tests__/mamaria-objetivo-golden.manual.ts` | 25 passaram, 0 falharam |
| `src/server/renderer/__tests__/mamaria-birads-guard.manual.ts` | 17 passaram, 0 falharam |
| `src/server/renderer/__tests__/mamaria-23c2-clinical-matrix.manual.ts` | 6/6 cenários |
| `src/server/renderer/__tests__/catalog-guarantees.manual.ts` | exit 0 |
| `src/server/renderer/__tests__/mamaria-boletim.manual.ts` | 20 casos; saída idêntica antes/depois |
| `src/server/renderer/__tests__/mamaria-objetivo-boletim.manual.ts` | 5 casos; saída idêntica antes/depois |
| `src/server/renderer/catalog/__tests__/mamaria-ponta-a-ponta.manual.ts` | exit 0; saída idêntica antes/depois |
| `src/server/renderer/__tests__/alteracoes.manual.ts` | `✗ 10 de 286 FALHARAM` — as mesmas 10 do HEAD (seção 4) |

Typecheck (`apps/web` e `apps/api`) e eslint: 0 erros nos arquivos de mama. A revisão central posterior corrigiu os erros das demais frentes e confirmou typecheck geral web/API, lint e build web/API.

### Contraexemplos no HEAD

`mamariaAdapter.manual.ts` rodado num worktree isolado do HEAD `a3d26f4`, cada
caso isolado: **8 falham** (os que reproduzem os defeitos) e 4 passam (os de
preservação: campos visíveis, oval/paralela, grosseiras escolhidas, rascunho
legado). Log: `2026-09-24-mamaria-validation-logs/head-mamariaAdapter.txt`.

## 4. As 10 falhas pré-existentes de `alteracoes.manual.ts`

Três execuções, mesmo resultado (`✗ 10 de 286`, exit 1) e `diff` vazio entre as
listas:

- HEAD `a3d26f4` num worktree isolado, sem mudanças locais → `head-alteracoes.txt`
- árvore de trabalho antes das mudanças de mama → `base-alteracoes.txt`
- árvore de trabalho depois → `depois-alteracoes.txt`

Lista: `head-alteracoes-falhas.txt`. Todos em
`docs/reviews/2026-09-24-mamaria-validation-logs/`.

1. o suspeito recebe TI-RADS alto
2. o benigno recebe TI-RADS baixo
3. …e traz as duas classificações
4. MAMARIA/CLASSICO_COMPLETO · axilas_atipicas: renderiza e muda o laudo
5. MAMARIA/OBJETIVO · axilas_atipicas: renderiza e muda o laudo
6. o suspeito recebe BI-RADS alto
7. o benigno recebe BI-RADS baixo
8. …e a classificação calculada
9. MAMARIA/CLASSICO_COMPLETO: fora do padrão diz ATÍPICO
10. MAMARIA/OBJETIVO: fora do padrão diz ATÍPICO

Não foram tratadas nesta etapa. Depois da mudança, o cenário suspeito do
catálogo passou a exibir "de forma irregular" e "maior eixo não paralelo à
pele"; a falha dele (BI-RADS calculado) continua a mesma.

## 5. Regra do painel BI-RADS

| Situação | Resultado |
|---|---|
| Cisto simples, cistos simples, linfonodo intramamário | Sugestão 2 |
| Nódulo sólido oval, circunscrito, paralelo, hipo/isoecoico, posterior ausente ou reforço, sem microcalcificações (e a função compartilhada devolve 3) | Sugestão 3 |
| Nódulo com margem não circunscrita, forma irregular, orientação não paralela, sombra ou microcalcificações | Avaliação suspeita, sem categoria nem subcategoria; motivo lista os descritores |
| Nódulo fora da tríade sem descritor suspeito (redondo, anecoico, hiperecoico, padrão combinado) | Sem sugestão automática |
| Cisto complicado, microcistos agrupados, calcificações, achado não nodular | Sem sugestão automática |
| Descritor ausente ou fora do léxico; tipo ou mama ausente; calcificação sem padrão | Dados insuficientes |
| Ginecomastia, próteses | Não se aplica |

## 6. Fontes

- **Base:** ACR BI-RADS® Atlas, 5ª edição, seção de ultrassonografia — PDF local
  `/Users/luizprazeres/laudousg-swift/ACR BI-RADS 5ª Ed.pdf`, páginas impressas
  282 e 283 (páginas 298 e 299 do PDF), conferidas visualmente pelo
  coordenador: cistos simples e linfonodos intramamários na categoria 2; nódulo
  sólido oval, circunscrito e paralelo na categoria 3, com a ressalva de
  avaliação completa e estabilidade.
- **Complemento:** informações oficiais online do ACR (2025), autorizadas pelo
  Luiz como complemento. Consultadas pelo coordenador e registradas em `2026-09-24-ultrasound-sources.md`; o agente de mamas utilizou o PDF local.
- As exigências a mais do painel para sugerir 3 (hipo/isoecoico, sem sombra, sem
  microcalcificações) o tornam mais conservador que a tríade do Atlas.

## 7. Limites e pontos para a revisão

- **Mobile:** a mudança no renderer vale para iOS e Android. Muda o texto só
  quando a forma é irregular ou redonda, ou a orientação não paralela.
- **Forma oval** segue omitida pela regra da casa (`packages/knowledge/snippets/MAMARIA/regra/nodulo-solido.md`).
  Escrevê-la é uma linha no renderer, mas muda os laudos do celular.
- **Rascunho web** salvo com calcificações e sem padrão, que antes gerava a frase
  de grosseiras, agora trava até o médico escolher o padrão.
- **Função compartilhada** (`packages/shared/.../mamariaBirads.ts`) continua com
  as regras sem base: achado não nodular = 4, `fora_nodulo` = 2, cisto
  complicado = 3 sem saber se é isolado, gradação 4A–5 por soma de pontos. O
  painel não as usa; corrigi-las exige revisão.
- **Microcalcificações** vêm do checkbox; desmarcado é tratado como "sem
  microcalcificações marcadas".
- Revisão central: os testes puros novos foram incluídos em `run-unit.cjs` e passaram; o runner ainda para na falha anterior de Doppler. Os testes de navegador continuam sendo comandos separados.

## 8. Auditoria final (sugestão indevida, perda de informação, normalidade falsa, troca de tipo)

Defeitos reproduzidos e corrigidos nesta rodada — cada um com teste que falharia sem a correção:

| Defeito | Reprodução | Correção | Teste |
|---|---|---|---|
| Calcificações vindas do celular travavam o laudo | `applyCompanionBreast` grava microcalcificação de achado "calcificacoes" como `calc: ["microcalc"]`, sem `calc_sub`; o filtro de visibilidade (seção 1) passou a exigir `calc_sub` e bloqueava com "escolha o padrão" | Adaptador aceita `calc` como padrão no tipo calcificações; a lista do formulário mostra "Microcalcificações" nesse caso | `mamariaAdapter.manual.ts` › "companion: calcificações "microcalc" viram microcalcificações, sem travar" |
| Calcificação em nódulo lida da imagem sumia do texto | Companion grava `calc_sub` (ex.: `em_nodulo`) em nódulo; a tela do nódulo não mostrava esse campo e o filtro o descartava | O card do nódulo mostra "Calcificações: <padrão>" com "Remover calcificações"; o adaptador aceita `calc_sub` no nódulo | `mamariaAdapter.manual.ts` › "companion: calcificação em nódulo lida da imagem chega ao texto" |
| Sugestão 3 indevida | Nódulo com a tríade e `calc_sub = em_nodulo` recebia sugestão 3 (o painel só olhava microcalcificação) | Qualquer calcificação associada tira da sugestão 3: microcalcificação → avaliação suspeita; outras → sem sugestão automática | `mamariaBirads.manual.ts` › "tríade com calcificação associada (imagem) → revisão, não 3" e "tríade com microcalcificações vindas da imagem → suspeita" |
| Painel dizia "nenhum achado" em rascunho legado com achado | Estado `md_tipo: 'nodulo'` sem `achados_ids` | Painel avisa que o rascunho está no formato antigo e que a sugestão por achado não está disponível | `mamariaBirads.manual.ts` › "rascunho legado COM achado é reconhecido" |

Verificado sem defeito:
- **Cisto vindo do celular** com ecogenicidade/margem/posterior de sólido sai anecoico, sem os descritores (`mamariaAdapter.manual.ts` › "companion: cisto simples não carrega descritores sólidos da imagem").
- **Valores da leitura de imagem** (`apps/api/src/server/vision/extractor.ts`) estão todos no léxico do painel; valor fora dele conta como ausente.
- **Vascularização** só entra no texto com Doppler realizado (`renderMamaria`, condição `doppler_realizado`).
- **Achado sem tipo ou mama** bloqueia o laudo (não sai "mama normal").
- **BI-RADS manual após troca de tipo** permanece, mas visível no card e no painel ("diferente da sugestão") — não é silencioso.

Resultados desta rodada:

| Teste | Resultado |
|---|---|
| `apps/web/tests/mamariaAdapter.manual.ts` | 15/15 |
| `apps/web/tests/mamariaBirads.manual.ts` | 50/50 |
| `apps/web/tests/mamariaForm.browser.manual.ts` | OK 1440 e 390 px (50 renders reais) |
| `apps/web/tests/mamariaBirads.browser.manual.ts` | OK 1440 e 390 px |
| `mamaria-golden` / `mamaria-objetivo-golden` / `mamaria-birads-guard` | 35/0, 25/0, 17/0 |
| `mamaria-23c2-clinical-matrix` / `catalog-guarantees` | 6/6, exit 0 |
| `mamaria-boletim`, `mamaria-objetivo-boletim`, `mamaria-ponta-a-ponta` | saída idêntica ao baseline |
| `alteracoes.manual.ts` | `✗ 10 de 286`, lista idêntica à do HEAD (seção 4) |
| typecheck web/api e eslint (arquivos de mama) | 0 erros |

Pendências fora do ownership:
- O **formulário** não mostra rascunhos legados (md/me); só achados com `achados_ids`. Já era assim antes desta frente.
- O painel recebe só o estado `mamas`: com escopo "somente axilas", ainda sugere para achados de mama que não entram no laudo.

## Fechamento integrado posterior

O coordenador corrigiu o escopo somente axilas no workspace: o painel BI-RADS e o esquema mamário ficam ocultos, sem apagar os achados de mama. O teste do workspace cobre retorno ao escopo mamário. A auditoria separada do catálogo corrigiu expectativas antigas e o seed `axilas_atipicas`; o gate `alteracoes.manual.ts` passou 300/300. As falhas descritas nas seções anteriores são a evidência histórica de reprodução, não pendências atuais. As 15 suítes web também passaram após correção da asserção obsoleta de Doppler.
