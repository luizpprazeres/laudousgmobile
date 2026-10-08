# Página clínica obstétrica Web — 07/10/2026

## Resultado e escopo

Página visual única para crescimento INTERGROWTH, Doppler Barcelona, riscos de pré-eclâmpsia e rastreio de trissomias. O formulário mostra apenas inclusão e abertura da prévia. A página completa fica no portal de impressão; o histórico oferece uma seção recolhível com a figura incluída. O PDF é produzido pela impressão do navegador, no padrão já existente. Sem biblioteca nova, alteração de banco, commit, push ou deploy.

A4 única nos casos sintéticos representativos de crescimento longitudinal + Doppler e de uterinas + rastreios do primeiro trimestre. A composição artificial que junta crescimento de 24 semanas e riscos calculados em 12 semanas ocupa duas A4, conforme exceção autorizada pelo Luiz. A quebra respeita blocos, sem `break-inside: avoid` no artigo inteiro. Não se força fonte menor para caber.

## Auditoria da origem

O README foi lido; não há AGENTS.md no repositório, e foram seguidas as instruções fornecidas na conversa. A árvore começou sem mudanças rastreadas; arquivos não rastreados existentes e os que surgiram durante o trabalho foram preservados.

`intergrowthBiometry.ts` calcula Hadlock CC/CA/CF e INTERGROWTH-21st 2020. `growthChartPersistence.ts` já congela datação, medidas, versões e até um PFE anterior informado. Essa fonte foi mantida, inclusive a diferença entre peso calculado para a curva e peso manual do laudo. `IntergrowthChart` já desenha pontos anterior/atual e trajetória: o modo compacto só altera apresentação.

`packages/shared/src/calculators/doppler.ts` é o motor Barcelona vigente. Os adapters Web e o renderer canônico já usam seus percentis. O cálculo e as classificações não foram alterados. Os renderers `DOPPLER_OBSTETRICO.ts`, o módulo fetal compartilhado e os adapters foram inspecionados. A página visual é um complemento, sem alterar o texto do renderer ou o contrato de extração.

As calculadoras Web de PE e trissomias chamam o shared. Seus resultados, marcadores e avisos alimentam a página. A antiga impressão de PE e a antiga folha INTERGROWTH usam portais no body: foco, Escape, Tab, inert, restauração e print CSS foram reutilizados como padrão. Na experiência principal, seus botões passam a abrir a folha unificada.

## Decisões clínicas e de dados

Somente blocos com dados válidos aparecem. Doppler isolado/combinado lê os IPs raiz e IG do formulário; o add-on morfológico exige `realizado: sim`. Doppler legado oculto em OBSTETRICA permanece ignorado, como no renderer. Número parcialmente válido, índice zero, IG fracionária nos campos inteiros ou dias ausentes não se tornam ponto observado. Uterinas exigem média válida; um lado inválido não é escondido pela média.

Referências Doppler ficam no shared. `referenciaDopplerBarcelona` inverte a transformação já usada pelos cálculos de cada vaso, linear no IP ou no log do IP. Não há segunda cópia de coeficientes. As amostras são diárias nas faixas existentes: uterinas 11–44s6d; demais vasos 20–44s6d. Os limites gráficos usam os z-scores ±1,645 existentes; o percentil discreto Barcelona continua identificado como rótulo do motor. Uterinas/umbilical destacam p95; ACM/RCP destacam p5. Os rótulos próximos recebem espaçamento e linhas de ligação, sem mudar as curvas.

Se a RCP informada divergir da razão dos IPs, `suppressRcp: true` omite somente seu gráfico. UA/ACM permanecem disponíveis. A tolerância de 0,005 serve apenas à compatibilidade numérica com duas casas decimais, não à classificação clínica.

Mouse, toque e foco/teclado exploram as amostras existentes: IG e p5/p50/p95. Setas avançam um dia; Home/End vão aos extremos da referência. O ponto observado não é movido. Uma região de status anuncia a exploração; cursor, tooltip, status e foco visual são ocultados na impressão. A cópia remove esses elementos temporários.

PE exibe riscos de parto com PE <37/<34/<32 semanas, os MoM realmente utilizados e o aviso de protocolo de PAM incompleto quando aplicável. Não há escala nova nem sugestão de conduta. Trissomias compara T21/T18/T13 basal e ajustado em tabela, usa os limites de apresentação do formatter existente e preserva `validation-pending`, marcadores e avisos. O gate `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION` permanece como estava.

`__clinical_charts.figure` só é salvo com inclusão explícita. O descritor v1 guarda entradas numéricas do motor e versões/fingerprint, sem nome ou data de nascimento. Ao ler, blocos inválidos ou com versão divergente falham fechados, independentemente dos demais. Ao mudar IG, Doppler, primeiro trimestre, opções, reset/companion ou entradas da calculadora, a figura anterior é retirada. A prévia usa resultados vivos e não o descritor antigo. Edição/limpeza de PE e novo salvamento foram exercitados no navegador. Mudança de figura/inclusão também libera novamente o botão de salvar, mesmo quando o texto não mudou.

Crescimento imprime a prévia viva mesmo antes de incluir. A inclusão controla apenas o salvamento. O histórico respeita o contrato INTERGROWTH já validado. A cópia transforma todos os SVGs clínicos em PNG, preservando também a tabela de riscos e MoM, mesmo com o detalhe recolhido.

## Ownership e arquivos alterados

| Área | Arquivos |
| --- | --- |
| Referência compartilhada | `packages/shared/src/calculators/doppler.ts`; `packages/shared/src/calculators/__tests__/dopplerChartReference.manual.ts` |
| Contrato e validação Web | `apps/web/src/lib/calculators/clinicalCharts.ts`; `apps/web/tests/clinicalCharts.manual.ts` |
| Página, interação e impressão | `apps/web/src/components/laudar/ClinicalChartsPage.tsx` |
| Integração pontual | `apps/web/src/components/laudar/LaudarWebExperience.tsx`; `BiometryGrowthPanel.tsx`; `PreEclampsiaFmfPanel.tsx`; `TrisomyFmfPanel.tsx` |
| Crescimento e cópia | `apps/web/src/components/laudar/IntergrowthPreview.tsx`; `reportFigureClipboard.ts` |
| Histórico | `apps/web/src/app/app/historico/page.tsx`; `apps/web/src/components/historico/HistoryItem.ts`; `ReportDetail.tsx` |
| Regressão browser e runner | `apps/web/tests/growthChart.browser.tsx`; `growthChart.browser.manual.ts`; `run-unit.cjs` |
| Registro | Este documento |

## Verificação executada

`pnpm --filter @laudousg/web test`: 70 suítes passaram. Inclui contratos clínicos, paridade FMF, limites/invalidade, persistência/versionamento, RCP suprimida e invalidação. Referências Doppler passaram 2.289 verificações numéricas contra o próprio motor, além de âncoras numéricas dos coeficientes legados.

Typechecks Web, shared e API passaram. Lint dos arquivos de UI/contrato alterados passou sem erros; permanece o aviso preexistente de `aria-description` no checkbox da calculadora de PE. `git diff --check` passou.

Browser com dados exclusivamente sintéticos e doubles locais de serviços, renderer canônico real para o texto e rede externa bloqueada:

```sh
TSX_TSCONFIG_PATH=apps/api/tsconfig.json \
PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
CLINICAL_CHART_QA_DIR=/tmp/laudousg-clinical-qa/tmp/pdfs \
pnpm exec tsx apps/web/tests/growthChart.browser.manual.ts
```

Foram preservadas as asserções de datação, cinco curvas INTERGROWTH, pontos/trajetória anterior, contrato salvo, gráfico inválido, foco, inert e print CSS. Acrescentados impressão sem inclusão, formulário compacto, atualização/remoção de risco, cópia de cinco gráficos + tabelas, exploração por teclado/mouse/toque, ocultação de tooltip no print e viewport de 320 px. PDFs reais são gerados sob mídia `print`: uma página nos dois fluxos clínicos e duas somente no máximo artificial. PDFs renderizados com `sips` e capturas foram inspecionados visualmente.

Artefatos de QA locais, sem dados reais: `/tmp/laudousg-clinical-qa/tmp/pdfs/clinical-charts-print.png`, `clinical-charts-mobile.png`, `clinical-charts-a4.pdf`, `history-doppler.pdf`, `history-firsttrim.pdf`, `real-doppler-page1.png` e `real-firsttrim-page1.png`.

## Limites e riscos restantes

A validação local não substitui homologação clínica, conta autenticada de produção, editor externo real nem impressora física. Trissomias continua pendente de validação; sua UI não foi liberada fora do gate existente. Dados sintéticos com IGs distintas permanecem identificados em cada bloco, sem presumir que pertencem ao mesmo trimestre.

Paginação depende do navegador e das opções de impressão; o teste usa Chromium, A4 e margens CSS de 10 mm. Avisos clínicos excepcionalmente longos podem aumentar o número de páginas; a quebra fica entre blocos e os avisos não são descartados.

A figura acompanha as entradas das calculadoras; não reescreve texto que o médico já inseriu ou editou. Os avisos existentes de bloco textual desatualizado continuam exigindo atualização explícita. A cópia foi verificada com doubles de ClipboardItem; formatação final depende do editor de destino.

Versões/fingerprint protegem a leitura histórica: alteração futura do motor exige nova versão e política de migração, não redesenho silencioso. A persistência foi verificada em harness local; nenhum relatório ou schema de produção foi alterado.

Fontes primárias consultadas apenas para contextualizar as referências já existentes: [Calculadoras Barcelona](https://fetalmedicinebarcelona.org/calc/?viewClass=Print&viewType=Print) e [modelo FMF de primeiro trimestre](https://www.fetalmedicine.org/var/material/pe-publications/AJOG-2.pdf). Não foi incorporado novo limiar dessas páginas.
