# Imagens individuais das categorias

Planejamento SM: pedido explicito de Luiz para criar cada imagem usando GPT,
uma por vez, e aplicar a escolha de categorias da web.

## Aceite

- [x] Gerar uma imagem individual para cada uma das 15 categorias, sequencialmente.
- [x] Copiar/exportar assets para o projeto, sem dependencia de arquivos externos.
- [x] Aplicar miniaturas leves sem alterar identificadores ou fluxo clinico.
- [x] Preservar nomes acessiveis, teclado, busca e rascunhos.
- [x] Conferir carregamento e layout desktop/mobile, tipos e build.

## Refinamento de identidade visual

Pedido de Luiz: manter os desenhos com apresentacao profissional e discreta.
- [x] Aplicar monocromia suavizada na tela, preservando originais GPT.
- [x] Verificar imagens, contraste e layout em desktop e celular.

Refinamento: grayscale(1) somente na apresentacao, opacidade 0.8 no tema
claro e 0.9 no escuro. Sem novos assets ou alteracao nos arquivos GPT.
Capturas desktop1440 e celular390 revisadas; testes verificam monocromia,
opacidade nos dois temas e fluxo existente. Typecheck 8/8 passou; lint
continua bloqueado por configuracao preexistente e npm test roda zero tarefas.

## Limites de uso

## Refinamento tipografico e simplificacao

- [x] Barlow Condensed Light local, caixa alta centralizada, sem reduzir texto com transform.
- [x] Tela de categorias sempre clara, sem mudar preferencia global de tema.
- [x] Substituir prostata e abdomens por versoes GPT simplificadas e verificar miniaturas.
- [x] Repetir testes de navegador, fonte carregada e tema escuro externo.

Fonte local licenciada OFL, peso300, tamanho20px fixo. Sem requisicoes externas
em runtime. Prostata agora predominante, sem bexiga gigante; abdomens com
menos textura e sobreposicao. V2 geradas individualmente e exportadas384px.
Opacidade0.8 permanece igual nos dois temas; escolha de tema global preservada.
Build web e typecheck8/8 passaram. Teste final de navegador passou apos ajuste
20px; capturas1440/390/320 em doppler-web-Q5zHlm, revisadas visualmente.
Preview3110 reiniciado na sessao8682 para servir fonte local. Sem deploy.

Pedido permite fundo branco uniforme como alternativa. Tentativa GPT de alpha
gerou quadriculado RGB sem transparencia e foi rejeitada. Novos assets usam
fundo branco; nao declarar transparencia real nem alterar os originais.

## Limites clinicos

Ilustracoes de navegacao, nao imagens diagnosticas, referencia anatomica validada
ou esquemas para inserir nos laudos. Sem pacientes reais, banco, prompts clinicos
ou publicacao. Originais GPT preservados fora da pasta publica. Mamaria e
cervicometria precisaram nova geracao apos recusas do servico; escolhidas
representacoes de estruturas internas isoladas.

## Arquivos

- apps/web/src/components/laudar/ExamCategoryPicker.tsx
- apps/web/src/components/laudar/examCategoryImages.ts
- apps/web/public/categories/*-v1.webp
- apps/web/tests/dopplerWeb.browser.manual.ts
- docs/assets/category-images-v1.json
- docs/assets/category-images-v2.json
- apps/web/public/fonts/BarlowCondensed-Light.ttf
- apps/web/public/fonts/BarlowCondensed-OFL.txt
- docs/stories/2026-09-14-web-imagens-categorias.md

## Evidencias

Verificacao de navegador concluida. Geracao individual via ferramenta GPT de
imagens, sem composicao em lote ou recorte de prancha. Exportacao WebP apenas
para tamanho/compressao, sem retocar conteudo anatomico.

15 WebPs de384x384 no estado final: 161232 bytes no total (3 ativos v2 + 12 ativos v1). Conjunto legado completo v1: 178290 bytes. Originais PNG copiados para
output/imagegen/category-originals-v1 sem excluir originais gerados. Assets
versionados v1, imagem112px no desktop e76px no celular estreito, object-fit
contain sem recorte adicional. Fallback ScanLine em falha de carregamento.
Imagens decorativas com alt vazio e rotulo do botao preservado para leitores
de tela. Nao entram em nenhum modelo/renderer clinico.

Typecheck web e build passaram. Teste Playwright do fluxo real local passou:
15 imagens distintas carregadas, busca/teclado/modo reduzido, rascunhos e
calculadora preservados; simular falha da imagem Tireoide mostra fallback e
mantem botao funcional. Capturas1440/390/320 revisadas e preservadas em
tmp-review/web-categorias-imagens. Sem overflow horizontal.

Lint permanece bloqueado pelo configurador ESLint preexistente; npm test
executa zero tarefas, portanto nao conta como gate. Teste explicito de
navegador e a evidencia de comportamento. Preview integrado reiniciado em
http://127.0.0.1:3110, sessao39622, com novos assets; autenticacao/salvamento
simulados, sem alteracao de producao. Sem testes/builds proprios pendentes.

## Refinamento do titulo

Pedido de Luiz: titulo "Qual exame voce deseja realizar?" com a mesma
tipografia das categorias. ExamCategoryPicker.tsx agora compartilha fonte
Category Condensed, peso300, caixa alta e espacemento zero entre titulo e
labels, mantendo tamanho28px e centralizacao. Verificacao Playwright em390
e1440px confirmou estilos iguais e ausencia de overflow. diff --check passou.
