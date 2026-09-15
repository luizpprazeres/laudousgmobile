# Sprint 24 — inventário: categorias cadastradas que a web ainda não estrutura

Autor: Cartografo (FAROL) · 12/09/2026 · tarefa T26 · sem código.

## Como foi levantado

- **Banco:** tabela `categories` (36 códigos, 34 ativos) e `reports` por
  `category_code`, consulta somente leitura no Supabase de produção em 12/09.
  "90d" = laudos criados desde 14/06/2026. "Editados" = `final_output` diferente
  de `generated_output`, ou seja, o médico corrigiu o texto gerado.
- **Renderer canônico:** arquivos em `apps/api/src/server/renderer/categories/`
  e o roteamento em `generationPathResolver.ts`: categoria fora de
  `RENDERER_CATEGORIES` vai para o **writer puro** (LLM com few-shots, guards
  completos). `RENDERER_CATEGORIES` de produção vive na Vercel e não foi lida
  aqui; isso não muda o inventário, porque só duas das onze têm código de
  renderer ou writer dedicado.
- **Schema/extração:** `apps/api/src/server/renderer/extraction.ts`.
- **iOS:** enum `Models/Category.swift` do repo `LaudoUSG-app`.
- **Android:** `CategorySheet.tsx` lista o que a API devolve da tabela
  `categories`, então toda categoria ativa aparece.
- **Web:** `apps/web/src/lib/catalog/migradas.ts` (15 migradas) e a pasta
  `apps/web/src/lib/deterministic/organs/` (25 módulos). Nenhuma das onze tem
  módulo de órgão nem entrada em `CATEGORIAS_MIGRADAS`; a web só conhece o
  rótulo de duas delas no histórico.

Contexto que pesa em tudo: **só 3 médicos geraram laudo nos últimos 90 dias**, e
em dez das onze categorias o volume vem de **um** usuário. O corpus é a prática
do Luiz, não o mercado. A tabela `golden_cases` do banco está **vazia**; os
gabaritos que existem estão em `tests/golden-objetivo`,
`tests/golden-deterministico` e nos gates manuais de `apps/api/src/server/renderer/__tests__`,
e cobrem só as categorias já migradas.

## Inventário

| # | categoria (código) | DB | renderer canônico (API) | schema / extração | iOS | Android | web | 90d (n / médicos) | total | editados 90d |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Bolsa testicular (`ESCROTAL`) | ativa | não → writer puro | não | sim | sim | não | 16 / 1 | 36 | 8 de 16 |
| 1b | Bolsa testicular com Doppler | **não existe código**; o precedente é `ABDOMEN_TOTAL_DOPPLER` (2 laudos) | — | — | — | — | — | — | — | — |
| 2 | Região inguinal (`REGIAO_INGUINAL`) | ativa | não → writer puro | não | sim | sim | não | 8 / 1 | 8 | 0 |
| 3 | Próstata transretal (`PROSTATA_TRANSRETAL`) | ativa | não (a suprapúbica tem) | não | sim | sim | não | 2 / 1 | 2 | 0 |
| 4 | Parede abdominal (`PAREDE_ABDOMINAL`) | ativa | não → writer puro | não | sim | sim | não | 25 / 1 | 27 | 13 de 25 |
| 5 | Glândulas salivares (`GLANDULAS_SALIVARES`) | ativa | não → writer puro | não | sim | sim | não | 0 | 2 | — |
| 6 | Paratireoide (`PARATIREOIDE`) | ativa | não → writer puro | não | sim | sim | não | 5 / 1 | 5 | 0 |
| 7a | Doppler venoso MMII, TVP (`DOPPLER_VENOSO_MMII`) | ativa | **writer_guarded** dedicado + esquema venoso 4 vistas | **sim** (`DOPPLER_VENOSO_MMII_JSON_SCHEMA` + `_SCHEME`) | sim | sim | só rótulo no histórico | 18 / 2 | 55 | 0 |
| 7b | Doppler venoso MMII completo (`DOPPLER_VENOSO_MMII_MEDIDAS`) | ativa | cai no writer puro | não | sim | sim | não | 0 | 7 | — |
| 7c | Doppler arterial MMII (`DOPPLER_ARTERIAL_MMII`) | ativa | não → writer puro (frente pausada em 03/07) | não | sim | sim | não | 0 | 16 | — |
| 8 | Fístula AV (`DOPPLER_FISTULA_AV`) | ativa | não → writer puro | não | sim | sim | não | 3 / 1 | 3 | 0 |
| 9 | Doppler renal (`DOPPLER_RENAL`) | ativa | **writer_guarded** dedicado | **sim** (`DOPPLER_RENAL_JSON_SCHEMA`) | sim | sim | só rótulo no histórico | 0 | 57 | — |
| 10 | Transfontanela (`TRANSFONTANELA`) | ativa | não → writer puro | não | sim | sim | não | 4 / 1 | 4 | 0 |
| 11 | Quadril infantil (`QUADRIL_INFANTIL`) | ativa | não | não | **não está no enum** | sim | não | 0 | 0 | — |

Leituras diretas da tabela:

- **Nove das onze não têm renderer nem schema.** "A web estruturar" essas nove
  não é meio dia de formulário: pela regra da casa (texto clínico tem UMA fonte,
  o renderer canônico), cada uma exige antes renderer no `apps/api`, golden
  Clássico + Objetivo e gate diferencial, e só depois o contrato da web. É o
  mesmo caminho da Sprint 16, que levou um dia ou mais por categoria.
- **Duas já têm a espinha pronta** (`DOPPLER_VENOSO_MMII`, `DOPPLER_RENAL`):
  schema de extração e writer dedicado. Nelas a web liga um contrato a um motor
  que existe. Essas cabem em meio dia cada.
- **Edição alta = writer puro errando.** Parede abdominal (13 de 25) e bolsa
  testicular (8 de 16) são corrigidas em metade dos laudos. Os Dopplers
  dedicados saem com zero edição. É o argumento mais forte para a ordem abaixo.
- **Quadril infantil não existe no iOS** e nunca gerou laudo. Cadastro sem uso.
- **"Com Doppler" não deve virar categoria nova.** `ABDOMEN_TOTAL_DOPPLER` mostra
  o custo: código duplicado no banco, 2 laudos, sem renderer. Doppler da bolsa
  testicular entra como complemento opcional do mesmo contrato, no padrão do
  `cervicometriaAddon.ts` da web.

## Ordem de execução proposta

| ordem | categoria | evidência | esforço | risco | dependência |
|---|---|---|---|---|---|
| 1 | Parede abdominal | maior volume das onze (25/90d) e 52% de edição; anatomia curta (hérnias, diástase, coleções, lipomas) | renderer novo + web: ~1,5 dia | baixo: sem classificador, sem cálculo | gabarito do Luiz: 5 normais + 5 alterados |
| 2 | Bolsa testicular, com Doppler como complemento | 16/90d, 50% de edição, 36 no total; é o segundo maior corpus | renderer novo + web + complemento Doppler: ~2 dias | médio: varicocele e torção exigem frases de Doppler validadas | gabarito do Luiz; decidir o modelo de complemento antes (não criar `ESCROTAL_DOPPLER`) |
| 3 | Doppler venoso MMII (TVP) | 18/90d por 2 médicos, zero edição; schema + writer + esquema 4 vistas já existem no backend; a web não tem render venoso | web liga o contrato existente: ~0,5 dia; esquema visual é da Sprint 20 | baixo | Sprint 20A (fundação vascular) para o desenho; o texto não depende |
| 4 | Região inguinal | 8/90d, zero edição; contrato mínimo (hérnia, conteúdo, redutibilidade, linfonodos); compartilha vocabulário com parede abdominal | ~1 dia, junto com a 1 | baixo | fazer na sequência da parede abdominal |
| 5 | Paratireoide | 5/90d; contrato mínimo (adenoma: sede, medidas, vascularização); é adendo natural da tireoide já migrada | ~0,5 dia como modo/complemento de TIREOIDE | baixo | TIREOIDE migrada (feito) |
| 6 | Transfontanela | 4/90d; contrato médio (ventrículos, hemorragia por graus, leucomalácia); gabarito neonatal ainda não existe | ~1,5 dia | médio: graduação de hemorragia é classificação, tem de ser do renderer | gabarito do Luiz |
| 7 | Doppler renal | zero em 90d, 57 no total; writer + schema prontos | web liga o contrato: ~0,5 dia | baixo | nenhuma |
| 8 | Fístula AV | 3/90d, 3 no total; exame de nefrologia com medidas de fluxo | ~1 dia | médio: cálculo de débito exige gabarito | gabarito do Luiz |
| 9 | Próstata transretal | 2 laudos; anatomia igual à suprapúbica migrada, muda via e detalhe zonal | modo da `PROSTATA_SUPRAPUBICA` na web: ~0,5 dia | baixo | PROSTATA_SUPRAPUBICA migrada (feito) |
| 10 | Glândulas salivares | 2 laudos, nenhum em 90d | ~1 dia | baixo | sem urgência; só com demanda |
| 11 | Doppler arterial MMII | 16 no total, zero em 90d; frente pausada em 03/07 (0 corpus assinado) | ~2 dias | alto: classificação de estenose | retomar só depois do venoso e com gabarito |
| 12 | Quadril infantil | 0 laudos, fora do iOS | ~1 dia (Graf é classificação, do renderer) | médio | só com gabarito e decisão de incluir no iOS |

Total estimado para as posições 1 a 5: cerca de 5,5 dias de FORJA, cobrindo 72
dos 81 laudos das onze categorias nos últimos 90 dias. As posições 6 a 12 somam
27 laudos no total histórico e podem esperar demanda real.

## O que precisa vir do Luiz antes de cada tarefa

Nenhuma das onze tem golden case. Para cada categoria aprovada: 5 laudos normais
e 5 alterados assinados (podem ser os já existentes no banco, revisados), mais a
lista de achados que a interface deve oferecer. Sem isso a FORJA fica sem
gabarito para o gate Clássico + Objetivo, que é critério permanente do ciclo.

## Fora deste inventário, anotado

- `ABDOMEN_TOTAL_DOPPLER` (2 laudos) e `DOPPLER_VENOSO_MMII_MEDIDAS` (7 laudos)
  são duplicações de categoria que valem consolidar: viram complemento da
  categoria-mãe. Não é Sprint 24, é higiene de cadastro.
- `OCULAR` (4 laudos) e `TORAX` (0) estão ativos no banco e não constam da
  Sprint 24 nem de outra. Ficam onde estão até haver demanda.
