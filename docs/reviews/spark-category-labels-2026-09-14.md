# Auditoria de consistência de nomes de categorias na Web — 2026-09-14

## Revisao do coordenador

O achado de diferenca entre nome de categoria e titulo do documento NAO e um
bug confirmado. O pedido de Luiz define categoria combinada por padrao e modo
isolado opcional: os titulos precisam distinguir esses estados. Nao existe
requisito de nomenclatura unica entre categoria, controle e documento. Sugestao
de padronizar titulo isolado como combinado rejeitada. Nenhuma mudanca de codigo
decorre desta auditoria. Abaixo permanece o relato original para rastreabilidade.

Conferência refeita no checkout ativo: `/Users/luizprazeres/laudousgmobile-def`.

Conclusão anterior foi substituída; este documento registra a revisão atual com base no checkout ativo.

## Escopo e evidência

Diretório auditado (somente leitura): `/Users/luizprazeres/laudousgmobile-def`.

Foram lidos os arquivos abaixo com SHA256:

- `apps/web/src/components/laudar/ExamCategoryPicker.tsx` 
  - `ec133b3ec839c4111a55c37a980fec1825cc007b2bbacf6f26dc96d510eaba5b`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
  - `5c6a2fc11e20a692df0fb52970647a987bac54a6a98e207e1c7935a0be2c5db8`
- `apps/web/src/components/laudar/categoryPresentation.ts`
  - `a6b2a30c88caa50fcf7879aa3bfc3db6a8b00f94eb252b26b739be2b553f3d48`
- `apps/web/src/lib/catalog/dopplerWebMode.ts`
  - `bbfb9d792473ee293654875deff8326d873475c6276d2f5077aabbff0f70448b`

## Achados confirmados

Problema 1
Categoria: `DOPPLER_OBSTETRICO`
Textos encontrados
- Tela de seleção inicial (card): `Obstétrica com Doppler` em `apps/web/src/components/laudar/ExamCategoryPicker.tsx:11`.
- Seletor durante o exame (opção da lista): `Obstétrica com Doppler` em `apps/web/src/components/laudar/LaudarWebExperience.tsx:124-127`.
- Função de apresentação de nome de categoria: `Obstétrica com Doppler` retornada por `categoryVisualName` em `apps/web/src/components/laudar/LaudarWebExperience.tsx:94-96`.
- Texto do botão de retorno de seção: `Somente Doppler` (rótulo de controle da opção de modo) em `apps/web/src/components/laudar/LaudarWebExperience.tsx:808-818`.
- Geração de título no salvar laudo: `Somente Doppler obstétrico` quando `somente_doppler='sim'` e `Obstétrica com Doppler` no modo combinado em `apps/web/src/components/laudar/LaudarWebExperience.tsx:572-574`, com decisão em `apps/web/src/lib/catalog/dopplerWebMode.ts:7-13`.

Motivo
- O fluxo da interface não tem apenas uma nomenclatura de modo para o mesmo contexto. Há, no mesmo código, três textos diferentes: nome de categoria principal, nome de opção de controle e título de documento salvo por estado de `somente_doppler`.
- Isso aparece como comportamento contextual e não como simples erro de truncamento ou acento. O texto `Somente Doppler` da checkbox é adequado para ação/controle; porém o título de salvamento em modo isolado (`Somente Doppler obstétrico`) quebra a regra de manter a categoria visível igual no seletor/fluxo e no título exibido ao salvar.

Sugestão pontual
- Se o objetivo é consistência estrita de nomenclatura pública, padronizar em todas as superfícies de persistência o termo base e definir variação apenas para controles. Exemplo: manter a categoria sempre como `Obstétrica com Doppler` e, no contexto de controle, manter `Somente Doppler` como estado, e no título de persistência usar `Obstétrica com Doppler` ou `Obstétrica com Doppler — Somente`. Se for decisão de produto manter diferença contextual, documentar essa regra no fluxo para evitar interpretação de erro.

Problema 2
Não foi encontrado conflito adicional de acentuação ou truncagem entre categoria selecionada e texto de cabeçalho/sessões.

Evidência
- Cabeçalho e seleção durante exame usam `categoryVisualName` para o seletor exibido e `currentCategory.name` para o restante do fluxo em `apps/web/src/components/laudar/LaudarWebExperience.tsx:95,124-132,713-730`.
- `categoryPresentation` não altera o nome base da categoria; só define agrupamento visual e dot/chave compacta em `apps/web/src/components/laudar/categoryPresentation.ts:24-49`.

Conclusão corrigida
A revisão anterior de que não havia ocorrências de `Obstétrica com Doppler` e `Somente Doppler` está incorreta para este checkout ativo. Há uso explícito desses textos, com comportamento contextual (seleção vs modo isolado), e existe uma divergência entre nome de categoria e título final quando `somente_doppler='sim'`.
