# Restauracao obstetrica e fila de calculadoras/web

Papel de planejamento: SM. Escopo solicitado por Luiz em 14/09/2026.

## Ordem e aceite

Atualizacao de continuidade: previa INTERGROWTH/Hadlock3 integrada e verificada
localmente (story intergrowth-preview-integration); App Store consultada ao vivo:
1.0(190) Aguardando revisao, lancamento manual, sem alteracao da submissao
(docs/reviews/appstore-live-2026-09-14.md). Folha/envio de curvas, paridade
mobile e validacao dos demais riscos continuam pendentes.

- [x] Ler arquitetura e verificar repositorios/alteracoes existentes.
- [x] Consultar modelos atuais e historicos sem alterar dados clinicos.
- [x] Comparar amostra dos ultimos 30 exames obstetricos da conta solicitante.
- [ ] Obstetrica simples sem complemento Doppler; imagem apenas obstetrica.
- [x] Categoria Doppler combinada por padrao, isolado somente por escolha explicita (implementacao local).
- [ ] Alinhar API, Android, iOS e web sem perder modelo combinado existente.
- [x] Morfologico 1/2/3T: trimestre explicito, estrutura, medidas e laterais preservadas nos casos de regressao e testes reais registrados.
- [x] Abdomen superior: reproduzir e corrigir esteatose sem ampliar escopo anatomico.
- [ ] Testes direcionados, tipos e build; publicar somente conjunto verificado.
- [x] iOS: 19 testes dirigidos executados no aparelho fisico, host isolado, sem substituir190.
- [x] Inventariar motores FMF e fontes, sem presumir validacao independente dos goldens.
- [ ] Conferir versao interna do FMF instalado e executar comparacoes ficticias.
- [ ] Validar trissomias e endpoints adicionais antes de disponibilizar riscos.
- [ ] Folha portuguesa imprimivel com versao, fontes, riscos, limites e graficos validados.
- [x] Web local: categorias iniciais com busca e rascunhos preservados.
- [x] Web local: rins compactos e historia materna condicional, testes direcionados.
- [x] Web local: IP bilateral/media exclusiva, sem alteracao do motor clinico.
- [ ] Web posterior: biometria/crescimento integrado e overrides.
- [ ] Web posterior: sexo opcional, curvas verificadas, envio/impressao na sala auxiliar.

## Evidencia e limites

Consulta read-only de 14/09: ultimos 30 exames obstetricos incluem 21 OBSTETRICA,
8 MORFOLOGICO e 1 DOPPLER_OBSTETRICO. Entre os 8 morfologicos, 5 carregaram
bloco variant:1t apesar de texto explicitamente de segundo/terceiro trimestre.
Os registros sao anteriores a correcao de precedencia feita em 13/09; nao
demonstram falha persistente depois dessa publicacao. Regressao sintetica deve
incluir data da primeira ultrassonografia com IG antiga menor que a atual.

Banco conserva modelo combinado DOPPLER_OBSTETRICO. Renderer vascular isolado
e remapeamento combinado para OBSTETRICA requerem separar categoria do modelo
da categoria interna do renderer. Nao substituir modelos do banco sem causa.

Comparacoes individuais revelaram perda de cabecalhos anatomicos, cervicometria
omitida do titulo/duplicada como conclusao, e percentil arredondado. Algumas
edicoes finais tambem alteram medidas/IG: nao devem virar regra para transformar
valores de entrada. Nao armazenar textos reais/pacientes nesta story ou fixtures.

FMF: goldens atuais verificam paridade, nao validacao externa completa. Trissomias
tem validation-pending. Nao liberar novos riscos com base apenas em testes internos.
App Store enviada em 13/09 permanece separada desta frente; nao cancelar envio.

## Arquivos do coordenador

- docs/stories/2026-09-14-modelos-e-calculadoras.md
- apps/api/src/server/prompts/contracts/MORFOLOGICO.ts
- apps/api/src/server/pipeline/__tests__/morfologicoBundleVariant.manual.ts
- apps/api/src/server/pipeline/__tests__/morfologico-fidelity-live.manual.ts
- apps/api/src/server/prompts/morfologicoTemplate.ts
- apps/api/src/server/pipeline/__tests__/morfologico-template.manual.ts
- apps/api/src/server/pipeline/__tests__/obstetric-doppler-live.manual.ts
- apps/api/src/server/renderer/__tests__/morfologico-lateralidade-live.manual.ts
- docs/fmf-verificacao-2026-09-14.md

Stories especificas dos agentes registram demais arquivos e verificacoes.

## Verificacao incremental do coordenador

13 testes do preparo de template, 10 selecoes de trimestre (incluindo IG de
ultrassonografia antiga), 11 selecoes de categoria, 96 cenarios de chamada real
do writer com transporte simulado e 89 verificacoes morfologicas passaram.
13 casos de abdomen superior e 9 de imagem/modo Android repetidos: passaram.
API typecheck e build passaram; o build Next pula tipos, verificados separadamente.

Writer real com modelo do banco: combinado e isolado passaram. Morfologico
1/2/3T passou com gpt-5.4-mini/none apos remover conflitos, especializar o
template cervical e retirar placeholders de apresentacao/dorso nao informados.
Uma rodada com reasoning low tambem passou; configuracao de producao NAO mudou.
Rodadas anteriores falharam por titulo/medida cervical omitidos, arredondamento,
data inventada e placeholder qualitativo. Registrar falhas e nao tratar uma
rodada verde como garantia de todos os ditados. Repeticao no default local
gpt-4.1-mini/none tambem passou nos tres trimestres apos os ajustes finais.

Extracao real strict de ossos: femur direito41/esquerdo39, tibia esquerda35 sem
contralateral inventado e fibula generica34 preservados. Fixture ficticia.

Regra legada de primeira USG do bundle conflita com regra de funcao: a primeira
exige linha mesmo sem data; a segunda so a inclui quando data foi informada.
Preparo do prompt substitui apenas essa regra MORFOLOGICO em memoria, sem DML,
alinhando ao criterio data explicita. Modelos historicos no banco preservados.

Sem deploy desta frente. FMF UI permanece bloqueada para cliques. Web mobile
teve corte visual identificado e corrigido; capturas revisadas em
tmp-review/web-doppler-responsive. Preview sintetico atualizado na porta3108,
componentes/renderer reais, autenticacao e salvamento simulados. Revisao iOS achou
persistencia do toggle ao trocar categoria e dados de imagem nao filtrados no
companion; ambas implementadas sem alterar build190 ou submissao Apple.
Compilacao atual do app e dos testes iOS passou. Execucao XCTest nao ocorreu:
simulador falhou ao abrir app (server died/Invalid device state), encerrada
apos cerca de cinco minutos. Nenhum xcodebuild desta frente pendente.
Story nativa: ../laudousg-swift/LaudoUSG/docs/stories/2026-09-14-ios-doppler-mode-images.md.

Preview anterior3107 encerrado; somente http://127.0.0.1:3108 mantido para
inspecao local (sessao28134). Web build/typecheck e navegador passaram apos
responsividade e label. Nao houve smoke autenticado nem pareamento fisico.

Proxima liberacao depende dos gates reais pendentes, nao apenas destes testes:
iOS no aparelho/simulador funcional, Android fisico, web autenticada e rollout
coordenado. Calculadoras/folha impressa e restante da UI seguem na fila acima;
nao foram implementadas nesta rodada. Nao afirmar plataforma publicada/corrigida
em producao, nem aprovacao FMF/Apple.

OBSTETRICA explicitamente selecionada envia includeDoppler:false ao extractor e
renderer, inclusive com indices residuais. 24 casos passaram, sem modificar os
defaults compartilhados usados pelo combinado web. Writer livre/fallback ainda
depende das instrucoes para nao aproveitar indices contraditorios no ditado;
isso nao e garantia deterministica de exclusao de qualquer mencao vascular.

## Continuacao de 14/09

Escolha inicial das 15 categorias implementada em ExamCategoryPicker, com busca
sem acentos, retorno sem perda de rascunho e suspensao de requests enquanto a
escolha esta aberta. Capturas desktop/mobile em tmp-review/web-categorias.
Testes de navegador cobrem tambem teclado, movimento reduzido e imagem carregada.

Rins: checkbox interno de Dimensoes mostra medidas/espessura em duas colunas.
Desmarcar esvazia campos ativos para o renderer e preserva rascunho; 13 casos
de estado/adaptador/renderer repetidos pelo coordenador passaram. Primeiro
comando sem tsconfig falhou por alias; repeticao com tsconfig API passou.

PE: nulipara/multipara, PE previa explicita condicional, labels curtos com
tooltips e tres colunas de IP. Fonte manual/bilateral exclusiva, lados
incompletos recusados; display em pt-BR sem ruido binario, sem arredondar kernel.
31 testes repetidos pelo coordenador passaram. Comparacoes externas FMF
continuam pendentes; esses testes verificam integracao, nao validacao clinica.

npm run typecheck passou nos oito pacotes (cinco cacheados); build web repetido
com sucesso. npm run lint permanece bloqueado por configuracao ESLint ausente;
npm test executa zero tarefas. Testes explicitos sao a evidencia de comportamento.

Preview integrado atual: http://127.0.0.1:3110 (sessao73434), autenticacao e
salvamento simulados, componentes/renderer reais. Preview antigo3108 encerrado.

iOS: novo boot isolado bloqueou em BackBoard por60s antes de instalar app.
iPhone pareado, mas bloqueado; desbloqueio solicitado. FMF legivel em1.0.44,
cliques ainda noWindowsAvailable; solicitada janela em primeiro plano. Nenhum
teste clinico ficticio novo foi submetido ao FMF nesta continuacao.

Writer plain: matriz real com politica apenas em prompt ficou13/18; cinco
falhas registradas, inclusive um vazamento Doppler. Nao considerar resolvido.
Tratamento explicito de conflito implementado localmente, registrado na story
API: conflitos reconhecidos recusados antes da geracao; tokens do obstetrico
simples ficam retidos ate checagem da saida para nao entregar laudo parcial.
Nada reclassificado/apagado. Detector contextual ainda pode falhar com linguagem
inesperada; nao equivale a validacao clinica abrangente.

Repeticao do coordenador: 19 contextos aceitos, 12 recusados e seis simulacoes
da rota sem token/done/generated nas recusas passaram. 16 comparacoes de prompt
e ligacoes principal/fallback passaram. Agente executou dois novos casos reais
sem conflito, nos dois estilos, preservando variacao320g, medida renal8mm e
negacao contralateral; nao demonstram garantia universal nem anulam13/18.

Web combinado agora herda as calculadoras obstetricas ja existentes, mantendo
flags de validacao; isolado nao as mostra. Dez casos de modo repetidos passaram.
Picker preserva tambem preenchimento PE ainda nao inserido, mantendo formulario
oculto sem desmonta-lo. Correcoes de quebra visual renal e badge PE conferidas.
Build web final33854 passou; typechecks web/API apos ajustes passaram.
Build API final70842 passou. Nenhum teste/build desta continuacao pendente;
somente preview integrado73434 mantido. Comparacao FMF e XCTest real bloqueados
conforme acima; novas curvas, folha impressa e restante da biometria continuam
pendentes, nao sao cobertos por este fechamento local.
Sem alteracao de banco, deploy ou nova submissao Apple.

## Retomada FMF apos refinamento visual

FMF1.0.44 confirmado novamente na interface. Navegacao por elementos de
acessibilidade funciona parcialmente; acoes por coordenadas ainda retornam
noWindowsAvailable. Algumas respostas da arvore chegam antes da mudanca visual.
Nao tratar o software inteiro como inacessivel. Secao PE foi aberta e lida.
Novo cadastro ID3 aberto exclusivamente para teste, nome exibido TESTE / SINTETICO
LAUDOUSG, com uma gestacao e um exame. Nenhum cadastro preexistente editado.
Nascimento nao confirmado: tentativas de preenchimento voltaram a campo vazio,
idade nao calculada. Solicitada ajuda de Luiz para confirmar nome e preencher
nascimento14/09/1996, altura165cm e peso65kg neste cadastro novo. Nao executado
novo calculo FMF nem comparacao numerica externa nesta etapa; nenhum risco
adicional liberado. Motor compartilhado preservado. Restante da fila pendente.

Luiz confirmou nascimento, altura e peso no ID3. Verificacao na UI:30anos,
165cm,65kg,IMC23.9. Menus nativos ainda sem selecao confirmada pela automacao;
solicitado CRL65mm, White, nao fumante e concepcao espontanea para completar
o caso ficticio antes de abrir PE. Nenhum resultado numerico obtido ainda.

Auditoria read-only da biometria: web/shared possuem medidas e peso/percentil
manuais; nao foi encontrado motor de peso estimado nem curva de percentil de
peso nesse escopo. fetalGrowth.ts classifica crescimento, nao deriva percentil.
Menor proxima etapa: agrupar interface preservando chaves, exigir fonte explicita
e erros visiveis. Antes de automatizar, resolver contrato/fontes para peso,
percentis e sexo no laudo. Achados reproduzidos no codigo, ainda nao corrigidos:
fetalGrowthParaCatalogo.ts usa parseFloat (aceita8abc), omite percentil invalido
silenciosamente e assume Intergrowth se fonte vazia; schema tambem preseleciona
Intergrowth. Percentil manual nao e invalidado ao mudar peso/IG. Nao ampliar
matematica nem expor novos riscos com base nesses campos manuais.

Confirmacao seguinte de Luiz: White, CRL65mm e concepcao espontanea. Interface
FMF1.0.44 confirmou IG12+5 (89dias), DPP24/03/2027 e feto unico. Antecedentes,
paridade e atividade cardiaca ainda nao selecionados visualmente apos tentativa
de automacao; solicitada marcacao manual No nos seis antecedentes, Nulliparous,
Present, MAP90 e IPuterino1.5, sem bioquimica, seguida de Calculate.

Calculo LOCAL preparatorio com adaptador web existente, nao resultado FMF:
idade30,65kg,165cm,89dias,branca,nulipara,flagsfalse; afericao sintetica120/75
para obter PAM90 e IPmanual1.5. Versao FMF/AJOG-2020+cal-2026-08-22,
MoM_MAP1.052786519734484, MoM_UTPI0.9232501950109783;
risco37=0.003505369940255935 (1em285),34=0.0006197508400152534,
32=0.0001649923389066789. Kernel e constantes NAO alterados.
Resultado externo permanece pendente. Conferir idade continua/idade na DPP do
FMF antes de atribuir qualquer diferenca ao algoritmo; idade30 do formulario
local nao prova equivalencia de entrada com calculo interno por datas no FMF.

## Status apos pedido de continuidade

Fonte de percentil corrigida pontualmente na web: novos estados iniciam com
nao_informada; fonte ausente e outra sem nome renderizam 'pela curva nao
informada'. Fontes armazenadas preservadas; sem proveniencia nao e possivel
distinguir escolha medica de default legado, portanto nao migrar rascunhos
automaticamente. Story web-percentil-fonte registra arquivos e13testes,
repetidos pelo coordenador com sucesso. Sem mudanca de formula/limiar/renderer.
Parser permissivo e invalidacao por mudanca de peso/IG continuam pendentes.

Coordenador repetiu testes plain (19contextos aceitos,12recusados,6simulacoes),
96casos de modo/prompt com IO simulado,13assercoes de template morfologico e
10casos de trimestre: passaram. Isso nao substitui gates clinicos/dispositivo.
FMF consultado novamente: MAP vazio, nenhum novo resultado externo calculado.
Sem deploy ou alteracao de status da submissao Apple nesta retomada.

## USB e continuacao dos percentis

Gate iOS antes bloqueado agora APROVADO para as tres suites selecionadas:
19/19 no iPhone15ProMax iOS26.6.1,0falhas,0skips. Coordenador leu diretamente
xcresulttool summary em /tmp/laudousg-doppler-device-gate/device-tests.xcresult.
Host isolado com assinatura local, sem grupos/keychain/URLscheme do app190;
removido apos testes. Ver story iOS para mecanismo e isolamento. Nao e prova
de extracao IA real, smoke autenticado completo nem publicacao.

Percentil malformado agora cria pendencia bloqueante em OBST/MORFO/combinado,
sem parseFloat parcial e sem apagar rascunho.55casos repetidos passaram;
navegador confirmou aviso, bloqueio de save e ausencia de novos requests enquanto
invalido. Story web-percentil-pendencias. Build web/typecheck8/8 passaram;
lint preexistente bloqueado, npm test0tarefas. Invalidacao de percentil manual
ao mudar peso/IG e calculos automaticos continuam pendentes.

Spark labels: primeira auditoria nao refletia checkout ativo. Reauditoria
identificou nomes distintos de categoria/modo/documento, mas os classificou
indevidamente como bug. Coordenador rejeitou sugestao: distinguir combinado
de isolado e requisito explicito do usuario. Registro em docs/reviews/
spark-category-labels-2026-09-14.md. Nenhuma alteracao de nomes aplicada.
