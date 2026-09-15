# Escolha inicial de categoria na web

Planejamento SM, requisito de Luiz: escolher o exame antes de preencher o laudo.
Implementacao local; nao altera autenticacao, modelos ou publicacao.

## Aceite

- [x] Exibir todas as categorias existentes antes do formulario, com busca.
- [x] Identificar Obstetrica com Doppler como categoria combinada.
- [x] Permitir voltar a escolha sem apagar preenchimento ou rascunhos.
- [x] Nao solicitar render de laudo enquanto a escolha estiver aberta.
- [x] Teclado, foco, movimento reduzido e telas pequenas funcionais.
- [x] Testes de navegador, tipos e build verificados.

## Arquivos

- apps/web/src/components/laudar/ExamCategoryPicker.tsx
- apps/web/src/components/laudar/LaudarWebExperience.tsx
- apps/web/tests/dopplerWeb.browser.manual.ts

## Validacao

Navegador local usa autenticacao e salvamento simulados, componentes e renderer
reais. Teste dopplerWeb.browser.manual.ts passou com busca sem acento, busca
vazia/sem resultado, todas as 15 categorias, zero requests antes da escolha,
Tab ate botoes, prefers-reduced-motion, imagem carregada e rascunho preservado.
Regressoes combinado/isolado, resposta atrasada e erro de salvar passaram.
O formulario permanece montado e oculto durante a escolha, para preservar
tambem valores locais de calculadoras e conexao companion. Teste adicional
preenche peso PE, volta a escolha e reabre a mesma categoria: valor mantido.
Primeira tentativa de teste procurou PE no combinado (ainda sem calculator
herdada nessa versao); teste correto em OBSTETRICA passou. Inclusao da mesma
calculadora no combinado tratada na story Doppler sem criar motor novo.

Capturas revisadas em tmp-review/web-categorias (1440, 390, 320px). Em 320px
lista de uma coluna evita quebrar palavra longa; demais larguras usam grade
responsiva, quatro colunas levemente deslocadas no desktop. Nao e simulacao 3D.

pnpm -F web build passou; npm run typecheck passou em todos os oito pacotes
(cinco com cache). npm test executou ZERO tarefas: nao representa gate de
testes. npm run lint continua bloqueado pelo configurador ESLint preexistente.
git diff --check passou. Sem publicacao nem teste autenticado em producao.
