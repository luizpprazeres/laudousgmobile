# Web — achados por órgão em cards

Status: implementado e validado localmente em 24/09/2026. Sem commit, push ou deploy.

## Pedido

Exibir mais informações simultaneamente, com estética de aplicativo iOS adaptada ao desktop. Remover a coluna de seleção dos órgãos em todas as categorias. Integrar suas opções e formulários ao conteúdo central em cartões consistentes, com larguras apropriadas à complexidade de cada painel.

O topo deve ser levemente translúcido, com LaudoUSG Web e categoria à esquerda, Achados / Laudo centralizado e conexão do celular à direita. Opções equivalentes devem manter proporções consistentes, ocupando menos espaço vazio.

## Aceite

- [x] Header translúcido, centralização desktop e adaptação a telas estreitas.
- [x] Órgãos e seções disponíveis simultaneamente, sem coluna lateral de seleção.
- [x] Controles de categoria, formulários especiais, calculadoras e reset por seção preservados.
- [x] Botões compactos com opções de tamanho consistente, sem cortar rótulos ou subcampos.
- [x] Abas acessíveis; edição do laudo, estado por categoria e navegação preservados.
- [x] Verificação visual e browser de desktop e mobile, incluindo 320px e tema escuro.
- [x] Card de trissomias acompanha medidas dos achados ainda não editadas manualmente.

## Escopo e arquivos

- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/laudar/WorkspaceSectionGrid.tsx`
- `apps/web/src/components/laudar/OrganFormPanel.tsx`
- `apps/web/src/components/laudar/BiometryGrowthPanel.tsx`
- `apps/web/src/components/laudar/TireoideFormPanel.tsx`
- `apps/web/src/components/laudar/TrisomyFmfPanel.tsx`
- `apps/web/tests/workspaceTabs.browser.manual.ts`
- `apps/web/tests/trisomyFormSync.browser.manual.ts`

Os ajustes locais anteriores de safe-area da navegação mobile e sua regressão foram considerados na substituição da navegação sequencial por cards. API, banco e motores clínicos estão fora do escopo.

## Validação

O harness de navegador usa componentes reais e respostas de API simuladas: comprova UI e interações, não geração clínica nem estado da produção.

Comando do teste de sincronização do formulário:

```sh
PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/trisomyFormSync.browser.manual.ts
```

Resultado: passou. Valores herdados acompanham alterações/limpeza da origem; edições e limpeza manuais permanecem intactas.

`pnpm -F @laudousg/web test` reproduziu a falha já documentada em `tests/dopplerWebMode.manual.ts:97`: a regex proíbe a palavra placenta até na descrição técnica válida do Doppler. Não foi alterada. A suíte de agrupamento biometria/crescimento e as dez suítes posteriores do runner passaram, executadas separadamente após essa interrupção.


Validação final:

- `pnpm -F @laudousg/web typecheck`: passou.
- `pnpm -F @laudousg/web lint`: passou com avisos preexistentes.
- `pnpm -F @laudousg/web build`: compilação e geração de páginas concluídas, exit 0. O build do projeto não valida tipos; o typecheck acima foi executado separadamente.
- `PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/workspaceTabs.browser.manual.ts`: passou. Inclui mudanças em dois órgãos, persistência entre abas e reset isolado, além de acessibilidade, esquema visual, categoria/scroll, temas e viewports.
- Auditoria adicional de geometria: 15 categorias em 1440, 1024, 768, 390 e 320px, sem campos escapando dos cards, ids duplicados ou erros de execução. Evidência local em `tmp-review/web-cards/audit-result.json` e screenshots na mesma pasta.
- Subcampos de cisto e hemangioma hepáticos abertos simultaneamente: inputs contidos e clicáveis em 1440, 768 e 320px.
- `git diff --check`: passou.

A composição obstétrica foi refinada após inspeção visual: feto ocupa duas colunas na grade ampla e seus campos se distribuem conforme a largura do próprio card; biometria e crescimento ficam lado a lado a partir de 1100px. Avisos de conflito do companion na tireoide aparecem uma única vez acima dos cards. Trocar categoria leva ao início; alternar apenas Achados/Laudo restaura a posição de leitura.

Prévia local dos componentes reais, com API simulada: `http://127.0.0.1:4173/`.
