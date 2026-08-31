# Sprint 5 — FMF e trissomias do primeiro trimestre

## Status

Em andamento — núcleo compartilhado, homologação web e fluxo morfológico de
primeiro trimestre concluídos.

## Objetivo

Concluir a frente FMF sem criar três calculadoras divergentes. Pré-eclâmpsia
permanece no núcleo compartilhado atual; trissomias T21, T18 e T13 deve nascer de
uma única fonte versionada, com validação numérica antes das telas web, Android e
iOS.

## Estado encontrado

### Pré-eclâmpsia

Está presente na web, Android e iOS. Web e Android consomem o núcleo TypeScript
compartilhado. O iOS possui port Swift protegido pelo mesmo conjunto de 342 casos
golden. A nova conferência manteve os oito pontos medidos manualmente no software
FMF e comparou 600 casos entre o motor de referência e o port TypeScript sem
divergências.

O teste isolado da integração web havia deixado de executar por causa da forma
como o runner `tsx` expõe módulos CommonJS. O cálculo não estava quebrado; o gate
foi ajustado para aceitar o carregamento do runner e voltou a passar 10/10, com o
typecheck web verde.

### Trissomias

Não existe no produto atual. O repositório iOS contém apenas o plano de 26/06. O
projeto web descontinuado contém um protótipo e parâmetros históricos, mas usa
outro produto e outro banco; ele será tratado somente como material de pesquisa,
nunca como implementação atual nem fonte automaticamente confiável.

O protótipo histórico ainda não prova paridade externa suficiente para liberar
risco clínico. Portanto, copiar a tela antiga ou portar diretamente o código para
Swift/Android está bloqueado até existir um núcleo canônico no repositório atual,
vetores golden e registro explícito da versão dos parâmetros.

Durante a migração foi encontrada uma falha no protótipo: a FCF aparecia em
`markersUsed`, mas era ignorada quando PAPP-A e Free β-hCG não estavam presentes.
No núcleo atual, FCF isolada participa efetivamente da verossimilhança. O caso foi
congelado em golden para impedir regressão.

Os CSVs necessários agora estão no repositório atual. Um gerador produz os
parâmetros TypeScript e grava o fingerprint SHA-256 da fonte. A v1 aceita
bioquímica somente como MoM já corrigido pelo laboratório; valores fora dos
limites do modelo geram aviso explícito. Peso materno é obrigatório quando o
marcador tricúspide é usado, pois ele participa da equação.

A tela web foi ligada à categoria obstétrica e ao Morfológico de 1º trimestre apenas quando
`NEXT_PUBLIC_FMF_TRISOMY_VALIDATION=true`. Sem a flag, nada novo aparece em
produção. A tela declara validação externa pendente, separa risco basal e
corrigido, mostra marcadores usados/ausentes e não esconde truncamentos.

O Morfológico agora oferece o 1º trimestre na web com CCN, TN, BCF, osso nasal,
regurgitação tricúspide e ducto venoso. Cervicometria e Doppler permanecem
complementos opcionais. Os dados seguem para o renderer canônico, em vez de
compor texto clínico no navegador. Ao abrir a calculadora de trissomias, CCN,
TN, BCF, osso nasal, tricúspide e IP do ducto venoso já preenchidos no exame são
reaproveitados; a calculadora continua oculta fora do 1º trimestre e sem a flag.

## Validação desta entrega

- Núcleo: 5 golden vectors e 4 bloqueios de domínio aprovados.
- Adaptador web: 3 cenários aprovados, incluindo vírgula decimal e confirmação de MoM.
- Validação externa parcial: o exemplo numérico publicado por Wright et al.
  (CCN 60 mm, TN 2,5 mm, LR T21 2,653) foi reproduzido com tolerância de 0,002.
  Isto valida o componente de TN, não o risco combinado completo.
- Morfológico 1º trimestre: gate tela → renderer, navegação e calculadoras aprovado.
- Renderer morfológico objetivo: 38/38 casos aprovados; marcador não avaliado
  não é mais convertido em normal e marcador alterado não convive com conclusão
  de morfologia normal. O gate de não contradição clássico/objetivo também passou.
- Typecheck: 8/8 pacotes aprovados.
- Build web com a flag de homologação: aprovado.
- `pnpm test`: não há tarefas de teste registradas no Turbo; os gates FMF foram executados explicitamente.
- `pnpm lint`: bloqueado pela configuração preexistente do Next.js, que abre um assistente interativo em web, API e Lab. Nenhuma configuração foi criada automaticamente.

## Sequência de implementação

- [x] Reconfirmar paridade e integração da pré-eclâmpsia atual.
- [x] Delimitar código atual, plano iOS e protótipo histórico descontinuado.
- [x] Congelar contrato clínico da v1: idade materna, CCN, TN e marcadores ecográficos; bioquímica opcional como MoM já corrigido.
- [x] Importar parâmetros por gerador reproduzível, com versão e hash.
- [x] Criar núcleo compartilhado T21/T18/T13 e vetores golden internos.
- [ ] Completar validação externa documentada do risco combinado e bloquear divergências próximas aos cortes (componente de TN já conferido).
- [x] Integrar na web atrás de flag de homologação.
- [ ] Integrar Android e iOS usando os mesmos vetores.
- [x] Inserir bloco coerente no laudo morfológico de primeiro trimestre na web, atrás da flag de homologação.
- [ ] Criar PDF tabular; gráficos ficam para uma etapa posterior validada.

## Critério de segurança

Até a validação externa terminar, a interface não deve usar “certificado” ou
“endossado pela FMF”, nem apresentar o resultado como substituto de rastreio
diagnóstico. O cálculo precisa mostrar separadamente risco basal e corrigido,
marcadores usados e ausentes, truncamentos e versão do modelo.

## File list

- `apps/web/src/lib/calculators/preEclampsia.test.mts`
- `apps/web/src/lib/calculators/trisomyFmf.ts`
- `apps/web/src/lib/calculators/trisomyFmf.test.mts`
- `apps/web/src/components/laudar/TrisomyFmfPanel.tsx`
- `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`
- `apps/api/src/server/renderer/__tests__/morfologico-objetivo-golden.manual.ts`
- `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`
- `apps/web/src/lib/catalog/morfologicoPrimeiroTrimestre.test.mts`
- `apps/web/src/lib/calculators/specs.ts`
- `apps/web/src/lib/deterministic/organs/abdomeTotal.ts`
- `apps/web/src/lib/deterministic/organs/morfologico.ts`
- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `packages/fmf-trisomy/generate-params.mjs`
- `packages/fmf-trisomy/source/*.csv`
- `packages/shared/src/calculators/fmfTrisomy.ts`
- `packages/shared/src/calculators/fmfTrisomyTypes.ts`
- `packages/shared/src/calculators/fmfTrisomyParams.ts`
- `packages/shared/src/calculators/fmfTrisomyFormatter.ts`
- `tests/fmf-trisomy/golden.json`
- `tests/fmf-trisomy/runner.ts`
- `package.json`
- `docs/stories/2026-08-30-sprint-5-fmf-e-trissomias.md`
