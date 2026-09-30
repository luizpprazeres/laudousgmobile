# Web: catálogo e áreas clínicas com melhor aproveitamento da tela

## Objetivo

Ampliar a apresentação dos exames disponíveis na landing e reorganizar os geradores de mama, obstetrícia e abdome total para o uso cotidiano em telas Web. A interface deve manter controles relacionados e esquemas anatômicos visíveis ao mesmo tempo, reduzir rolagem e espaços vazios e preservar os contratos clínicos existentes.

## Escopo

- Landing: preservar os 15 exames implementados, detalhar modalidades e regiões, e marcar planejados como `Em breve` sem prometer exames combinados ou procedimentos guiados.
- Mama: composição aproximadamente 50/50 entre controles e esquema; edição de achado sem ocultar o cartograma; sequência Axilas, Recomendações e BI-RADS; arraste contínuo com hora e distância em tempo real.
- Obstetrícia: integrar biometria, peso, idade gestacional derivada quando aplicável, percentil e curvas; manter valores manuais explícitos; remover o esquema de posição fetal.
- Abdome total: manter a família visual atual, reorganizar os blocos por encaixe e unificar visualmente Vesícula e vias biliares sem perder os estados clínicos internos.

## Fora de escopo

- Copiar lista, design, textos ou claims do Laudário.
- Implementar exames combinados ou procedimentos guiados.
- Alterar fórmulas clínicas sem fonte e testes existentes.
- Alterar a Sala do Auxiliar, banco de dados, iOS ou Android nesta rodada.

## Critérios de aceite

- [x] A landing diferencia claramente exames disponíveis e planejados.
- [x] A seção de exames parece integrada ao fundo e funciona em desktop e mobile.
- [x] O esquema mamário permanece visível durante a criação e edição de achados em desktop.
- [x] O marcador mamário se move livremente em duas dimensões e exibe hora e distância durante o arraste.
- [x] Axilas, Recomendações e BI-RADS mantêm alinhamento e ordem coerentes.
- [x] A biometria atualiza apenas derivados suportados pelas fórmulas existentes e permite override manual identificável.
- [x] O esquema de posição fetal não aparece nos exames obstétricos.
- [x] Vesícula e vias biliares formam um único bloco visual sem perda do conteúdo clínico.
- [x] Os layouts passam em 1440, 1024, 768, 390 e 320 px, sem overflow horizontal; movimento reduzido permanece coberto pelo teste do Hero.
- [x] Typecheck, testes focais, suíte Web e build de produção passam.

## Plano de arquivos

- Landing: `apps/web/src/components/landing/v2/Specialties.tsx` e testes da landing.
- Mama: `apps/web/src/components/visualSchemas/BreastSchema.tsx`, painéis mamários e integração no workspace.
- Obstetrícia: `BiometryGrowthPanel.tsx`, `IntergrowthPreview.tsx` e integração no workspace.
- Abdome: módulos determinísticos e configuração de seções/grid.
- Integração central: `LaudarWebExperience.tsx` e `WorkspaceSectionGrid.tsx`, revisados pelo orquestrador depois das frentes isoladas.

## Verificação e file list

- [x] Implementação revisada centralmente.
- [x] Contratos clínicos comparados antes/depois: a união dos cards do abdome não cria chaves clínicas e a curva INTERGROWTH não sobrescreve o peso manual do laudo.
- [x] `pnpm --filter @laudousg/web typecheck`.
- [x] `pnpm --filter @laudousg/web test` — 20 suítes.
- [x] ESLint focal dos arquivos alterados.
- [x] Build de produção isolado com Next.js 15.5.18 — 17 páginas geradas; apenas avisos preexistentes fora desta frente.
- [x] QA no Chrome real: landing em 1440/1024/768/390/320; gerador sintético de mama em 1440/1024/768/390/320; abdome e obstetrícia em 1440. A prévia isolada ficou aberta em `http://localhost:4177`.

## File list

- `apps/web/src/components/landing/v2/Specialties.tsx`
- `apps/web/src/components/landing/v2/specialtyCatalog.ts`
- `apps/web/src/components/laudar/BiometryGrowthPanel.tsx`
- `apps/web/src/components/laudar/IntergrowthPreview.tsx`
- `apps/web/src/components/laudar/biometryAutomation.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/laudar/WorkspaceSectionGrid.tsx`
- `apps/web/src/components/visualSchemas/BreastSchema.tsx`
- `apps/web/src/lib/deterministic/organs/abdomeTotalGrid.ts`
- `apps/web/src/lib/deterministic/organs/abdomeTotalGrid.manual.ts`
- `apps/web/src/lib/visualSchemas/breastGeometry.ts`
- `apps/web/src/lib/visualSchemas/__tests__/breast-geometry.manual.ts`
- `apps/web/tests/biometryAutomation.manual.ts`
- `apps/web/tests/landingScrollytelling.browser.manual.ts`
- `apps/web/tests/run-unit.cjs`
- `apps/web/tests/workspaceTabs.browser.manual.ts`
