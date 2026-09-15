# Doppler e prontidao App Store

## Escopo aprovado por Luiz

Separar a entrada Doppler do obstetrico; Doppler combinado por padrao no iOS,
com opcao somente Doppler. Preservar morfologico e medidas dos ossos longos.
Nao introduzir proibicoes globais em pelve/vias urinarias a partir da auditoria antiga.
Corrigir assinatura Apple multiplataforma e submeter versao atual apos validacao.

## Checklist

- [x] Confirmar repositorios vivos: iOS Swift e backend laudousgmobile-def.
- [x] Ler rejeicoes reais: compras nao localizadas e produtos nao enviados.
- [x] Revisao independente com Claude Code; confirmar tabela subscriptions ausente.
- [x] Adicionar modo explicito Doppler sem alterar o ditado original.
- [x] Preservar categoria MORFOLOGICO escolhida pelo medico.
- [x] Reproduzir HTTP 400 real no contrato MORFOLOGICO e corrigir campo required ausente.
- [x] Teste real com IA: combinado preserva biometria; morfo preserva seis ossos e Doppler.
- [x] Reproduzir selecao errada 1T por ducto venoso e corrigir precedencia do trimestre (5 falhas antes; 8/8 depois).
- [x] Reforco de prompt exclusivo do morfologico, sem alterar pelve/vias urinarias.
- [x] Remover opcao Doppler da extracao de imagem obstetrica; conservar biometria no combinado.
- [x] Executar testes clinicos e contratos iOS: 76 passaram, 3 WHO ignorados por curadoria pendente (sem alterar tabelas).
- [x] Corrigir/verificar dominio de assinatura: 105 assercoes sinteticas; compra sandbox real ainda pendente.
- [x] Conferir contrato comercial, produtos e conta de revisao Apple.
- [x] Publicar API validada e aplicar migration subscriptions com RLS; sem mudar planos web.
- [x] Compilar iOS com consentimento explicito para IA e bloqueio de envio quando recusado.
- [ ] Concluir testes nativos, compra sandbox e restauracao no build assinado.
- [x] Atualizar politica de privacidade nativa/publica e declaracoes da loja para IAP e consentimento IA (dez tipos publicados e relidos).
- [x] Salvar e reler URLs de notificacoes Apple de producao e sandbox na loja.
- [ ] Confirmar notificacao Apple V2 real ponta a ponta.
- [x] Archive/upload do build 190 corrigido, processado e associado a versao 1.0.
- [x] Reparar tabelas de preco dos quatro produtos, preservando valores brasileiros.
- [x] Submissao completa: app190, quatro produtos e grupo, todos Aguardando revisao; envio parcial anterior retirado.
- [ ] Aprovacao efetiva pela Apple (externa, nao presumida).

## Arquivos desta frente clinica

- packages/shared/src/schemas/generate.ts
- apps/api/src/app/api/generate/route.ts
- apps/api/src/server/pipeline/requestedExam.ts
- apps/api/src/server/pipeline/bundleLoader.ts
- apps/api/src/server/pipeline/__tests__/morfologicoBundleVariant.manual.ts
- apps/api/src/server/pipeline/__tests__/morfologicoWriterLive.manual.ts
- apps/api/src/server/prompts/contracts/MORFOLOGICO.ts e index.ts
- apps/api/src/server/pipeline/__tests__/requestedExam.manual.ts
- apps/api/src/server/pipeline/renderer.ts
- apps/api/src/server/pipeline/writer.ts
- apps/api/src/server/renderer/extraction.ts
- apps/api/src/server/renderer/__tests__/morfologico-23b4-ios-clinical-matrix.manual.ts
- apps/api/src/server/renderer/categories/MORFOLOGICO.ts (required; duas correcoes preexistentes de conclusao 1T incorporadas apos revisao e 18 casos aprovados)
- apps/api/src/server/renderer/__tests__/morfologico-conclusao-sistemas.manual.ts (preexistente, revisado)
- apps/api/src/server/renderer/__tests__/contrato-extracao-morfologico.manual.ts
- apps/api/src/server/renderer/__tests__/requested-doppler-e2e.manual.ts
- iOS: Models/GenerateRequest.swift; Features/Generate/GenerateView.swift e GenerateViewModel.swift
- iOS: Components/Sheets/PlusSheet.swift, CompanionSheet.swift e ImageAnalysisSheet.swift
- iOS: Services/ImageAnalysisService.swift e LaudoUSGTests/ImageAnalysisServiceTests.swift
- iOS: LaudoUSGTests/ObstetricGenerationContractTests.swift
- IAP: apps/api/src/server/iap/* e __tests__/*; api/iap/*; api/me/profile/route.ts; server/env.ts
- IAP: packages/db/src/schema/subscriptions.ts; sql/0029_profile_plan_essencial.sql e 0030_subscriptions_apple_ownership.sql; migrate.ts (preservado trecho preexistente 0028)
- IAP: .env.example; apps/api/package.json; package.json; pnpm-lock.yaml; apps/web/src/lib/planos.ts
- iOS: Services/StoreManager.swift e IAPEntitlementResolver.swift; Core/AppState.swift; Paywall/PaywallSheet.swift; Settings/SettingsView.swift e DeleteAccountView.swift; Shell/AppShellView.swift
- iOS: Services/AIConsentPolicy.swift e APIClient.swift; Services/DeepgramLiveService.swift; Features/Legal/AIConsentView.swift; testes AIConsentPolicyTests e IAPEntitlementTests
- iOS: Models/LegalVersions.swift; Resources/Legal/privacy-policy.md (versao 2.1 no build enviado)
- Site publico (repo /Users/luizprazeres/laudousg): app/privacy/page.tsx; alinhamento factual com o app, sem alterar outros fluxos do site.
- iOS: LaudoUSG.xcodeproj/project.pbxproj (build 190); PrivacyInfo.xcprivacy; docs/appstore/privacy-nutrition-labels.md; release-189.md; release-190.md; ExportOptions-AppStore.plist

## Evidencia inicial

11 assercoes de selecao/modo, matriz clinica (89 + 15) e 26 goldens Doppler passaram.
Contrato strict morfologico recursivo passou. Extracao real sintetica reproduziu
HTTP 400 (itens_conclusao_livres ausente em required); apos correcao, combinado
e morfologico com ossos/Doppler passaram pela IA e renderer. Isso nao prova
acerto em todos os ditados nem compra sandbox. Typecheck da API passou.
Lint da API bloqueado por configuracao ESLint ausente (prompt interativo).
`pnpm test` executou zero tarefas: NAO conta como gate aprovado.

Exportacao de variaveis protegidas retornou campos vazios; isso NAO confirma
RENDERER_CATEGORIES nem whitelist beta em producao. Morfologicos recentes
registram gpt-5.4-mini. Writer real com esse modelo passou no caso sintetico.
O HTTP 400 do schema e defeito do caminho estruturado local,
nao causa confirmada dos laudos recentes. NAO foi alterada a flag de geracao.
O seletor de bundle ativo em producao foi testado separadamente.
Contrato Apple pago/banco/fiscal ativos. Quatro assinaturas em Preparar para
envio. URLs de notificacao sandbox e producao ainda ausentes. Conta demo free,
com whitelist beta nao confirmada; tem 117 laudos e nao deve ser apagada nos testes.
Mudancas preexistentes de outros trabalhos foram preservadas.

## Publicacao e verificacao em 13/09/2026

API publicada a partir de worktree isolada /tmp/laudousg-release-186, sem os
demais arquivos de outros trabalhos. Deployment ativo:
dpl_Ejykq36xYgMMVXhNKfC2qjJKs6Rk
https://laudousgmobile-17rle442c-prazeresapp.vercel.app
Promovido para laudousgmobile.vercel.app. Build remoto concluido; typecheck
local passou separadamente (o build Next esta configurado para pular tipos).

Migration subscriptions_apple_ownership aplicada pelo conector Supabase apos
ativar as rotas que verificam JWS. Tabela inicialmente vazia; RLS ativo;
authenticated apenas SELECT proprio, anon sem grants. Nenhum plano web alterado.
Health 200, login da conta de revisao 200, profile 200/free. JWS forjado
recusado com 422 na rota autenticada e 401 em notificacoes. Isso NAO comprova
compra sandbox real ou renovacao real; essas etapas seguem pendentes.

105 verificacoes IAP (30 JWS, 56 dominio, 19 notificacoes) passaram. Replay apos
reembolso foi reproduzido e corrigido, assim como concorrencia de updates,
grace no restore e compra nova com periodo menor. Plano web nao e sobrescrito.

Build iOS de simulador passou. A execucao de testes nativos ficou presa na
instalacao do app no simulador e foi interrompida sem executar testes (exit 73).
Nao e gate aprovado. Archive 189 ficou sem progresso e apresentou aviso de
credencial incompleta no chaveiro do Xcode; foi interrompido (exit 75).
Nao ha archive de distribuicao validado nem upload novo. App Store Connect
ja possui builds 186 e 188 internos; numero reservado para este envio: 189.
Claude Code atingiu limite de sessao antes de encerrar gates; revisao final
continuada pelo Codex. Mac bloqueado impediu continuar a UI da Apple; solicitado
desbloqueio manual a Luiz. Nenhuma submissao Apple nova, nem aprovacao.

Politica nativa atualizada localmente de 2.0 para 2.1, com dados de assinatura
recebidos da Apple, appAccountToken, permissao explicita para IA e exclusao.
LegalVersions atualizado para novo aceite. Onboarding de IA agora exige decisao
true, para nao conduzir quem recusou a um tutorial que depende de IA.
Build de simulador arm64/x86_64 passou novamente com esses ajustes e numero
189; politica embutida conferida contra o fonte. Teste isolado do AIConsentPolicy
real com autenticacao simulada passou (permissao, isolamento, revogacao e rotas
sem IA). NAO substitui XCTest nem teste de interface/dispositivo.
Pagina publica verificada por HTTP: ainda e 1.2, com notas de rascunho e billing
como futuro, servida pelo repo laudousg no commit 770e44ab196e61c528ff6c8d1db3e0517ed5bbdd.
Essa pagina e as declaracoes de privacidade da loja precisam de revisao antes
do envio. Caminhos das notas de revisao ainda dependem de conferencias finais.
A pequena correcao de prioridade de planos em apps/web/src/lib/planos.ts esta
no codigo desta frente, mas o aplicativo web nao foi publicado separadamente.

## Retomada com Mac desbloqueado

Certificado Apple Distribution criado na equipe existente sem revogar os demais.
Archive 189 concluiu. Exportacao CLI falhou (No Accounts/perfil antigo); pelo
Organizer do Xcode, validacao concluiu e upload 1.0 (189) foi confirmado na UI.
Metodo App Store Connect, nao Internal Only. Ainda falta conferir processamento,
compra/restauracao sandbox, metadados e submissao conjunta dos quatro produtos.

XCTest: 76 passed, 0 failed, 3 skipped (WHO Multicentre table pending curation).
Resultado em /tmp/laudousg-tests-189-unlocked, conferido via xcresulttool.
Simulador exclusivo desta frente desligado apos testes; outros preservados.

Politica publica 2.1 publicada e verificada por HTTP. Deployment
dpl_5G9c9jdhVyGjrw8xqmsP8zWfDiiF, worktree /tmp/laudousg-privacy-189, apenas
app/privacy/page.tsx alterado a partir do mesmo commit que estava em producao.
Lint/typecheck/build passaram; npm test ausente; QA Playwright 390/1440 passou.
Declaracoes de dados na loja ainda pendentes. Nenhuma aprovacao Apple presumida.

URLs de notificacoes de producao e sandbox salvas e relidas na interface Apple,
ambas apontando para /api/iap/notifications do backend ativo. A UI nao mostrou
seletor de versao; nao presumir validacao V2 ponta a ponta sem evento Apple real.

## Conferencia posterior da loja e build 190

189 processado como Pronta para envio, sem restricao Internal Only. Revisao
antiga cancelada; versao 1.0 agora Rejeitado pelo desenvolvedor (retirada para
editar). Descricao e notas corrigidas e salvas. Associacao 189 no modal nao
persistiu na verificacao independente: versao ainda mostrou 147.

Login no simulador funcionou, parou no aceite legal 2.0/2.1/2.0. Autorizacao
solicitada a Luiz no momento da acao; nao houve aceite nem exclusao da conta.

Manifesto de privacidade ainda antigo identificado e corrigido: Name, Health,
Sensitive Info, Photos or Videos e Purchase History adicionados. Preservados
tipos anteriores, ausencia de tracking e motivos de API. Nao houve mudanca
clinica nem no fluxo de compra em relacao ao 189. plutil, diff --check e
checagem estruturada passaram. Archive 190 concluiu; plist confirma arm64,
team/bundle corretos e manifesto identico ao fonte. Upload 190 iniciado no
Organizer com metodo App Store Connect; UI confirmou "LaudoUSG 1.0 (190) uploaded".
Processamento e associacao final ainda pendentes. Notas de compra/beneficios
salvas em todos os quatro produtos, sem alterar precos. Questionario de dados
passou de sete para dez tipos; finalidades dos quatro adicionados pendentes.

Atualizacao: 190 processado como Pronta para envio, associado e salvo na versao
1.0 apos remover/salvar 147 antes de selecionar o novo. Rascunho de revisao
criado com iOS App 1.0 (190), NAO enviado. Inclusao dos quatro produtos pendente.
Privacidade ainda incompleta: aviso Apple informa que os quatro novos tipos
nao aparecerao publicamente antes da configuracao de finalidades; nao confundir
rascunho com publicacao. Controles de texto nao abriram editor pela automacao,
rolagem/coordenadas retornaram noWindowsAvailable apesar de IOConsoleLocked=No.
Aceite legal da conta de demonstracao aguarda resposta de Luiz; compra sandbox
evidencia fisica, restauracao e notificacoes reais ainda nao verificadas.

## Aceite autorizado e teste no aparelho

Luiz autorizou aceite dos tres documentos. No simulador 189 foram selecionados
Termos 2.0, Privacidade 2.1 e Disclaimer 2.0 e confirmado Entendi e aceito.
Permissao IA apareceu separada; Agora nao abriu app sem tutorial IA, permitindo
menu/preferencias. Paywall acessivel, mas StoreKit retornou vazio apos retry.
Logs: quatro IDs corretos, catalogo US, conta sandbox nil/local, erro Anisette.
Regiao US versus planos BR e hipotese, nao causa unica provada. Restauracao
abriu login Apple; cancelado sem conta sandbox identificada, UI mostrou falha
em vez de sucesso. Exclusao conferida ate confirmacao textual vazia, botao
final desabilitado; voltou e cancelou, sem apagar a conta nem seus laudos.

iPhone 15 Pro Max conectou por cabo. Instalado/aberto build 190 development-signed
sem desinstalar 185. Espelhamento existente bloqueado por Microfone do iPhone em
Uso; solicitado Luiz encerrar gravacao/chamada quando puder. Teste sandbox real
continua pendente. Produtos nao incluidos no rascunho porque dropdown da Apple
nao abriu via AX/teclado e coordenadas retornam noWindowsAvailable. Ficha de
privacidade continua com finalidades pendentes. Nao houve submissao final.

Retomada seguinte: iPhone conectado e espelhamento controlavel. Conta de demo
entrou no build 190, reaplicados os mesmos aceites autorizados 2.0/2.1/2.0 e
recusada IA separadamente. Menu/preferencias/paywall acessiveis. Catalogo tambem
falhou no aparelho; restauracao pediu Conta Apple, foi cancelada e mostrou erro,
sem compra ou exclusao. Luiz nao tem ou nao sabe se possui conta Sandbox Brasil.
No painel, Profissional Anual exibiu exigencia de adicionar preco apesar da
tabela atual mostrar Brasil R$ 1.629,90. Nota de caminho Menu salva. Inclusao
no rascunho nao confirmada; depois Chrome ficou com AX de menu antigo e sem
screenshot. Solicitado trazer navegador para frente. Restantes gates pendentes.

## Recuperacao do painel e reparo de precos

Navegador integrado abriu a sessao autenticada da Apple e desbloqueou a operacao.
Sandbox nao tinha testers: formulario entregue a Luiz para criar conta Brasil,
com senha definida pelo proprio usuario. Privacidade concluida e publicada:
dez tipos persistidos apos reload, incluindo saude, confidenciais, imagens e
compras, somente App Functionality, vinculados, sem tracking. Preview conferido.

Erro de preco reproduzido no Pro Anual e Mensal. Regravar valor BR mantendo a
tabela antiga nao resolveu. Reconstruir tabela por Recalcular todos os paises,
Brasil e mesmo preco gerou 175 precos e desbloqueou Pro Mensal (Pronto para
revisao, incluido no rascunho). Aplicado aos quatro planos, preservando valores
BR 159,90/1629,90/1019,90/99,90. Sem mudanca de disponibilidade; Pro Mensal
confirmado somente Brasil e Essencial Mensal continua 1/175 locais de venda.
Notas dos quatro produtos corrigidas para Menu. Compra sandbox ainda pendente.

Envio parcial de app190 + Pro Mensal + grupo observado as 21:20; causa do
acionamento nao confirmada. Cancelamento imediato feito e status Removido
conferido para os tres itens. Envio 508fbe0b-d70d-44c9-8d75-755b4bb606b1.
Submissao completa continua pendente e precisa conter seis itens apos gates.
Nao afirmar que nunca houve submissao neste trabalho ou que ha aprovacao.
Retry do catalogo no iPhone apos reparo nao confirmado por falha de controle.

## Envio completo confirmado

Luiz autorizou seguir pelo TestFlight, com prioridade para submissao. Build190
ja associado ao grupo interno Beta Medicos, um tester; instrucoes de teste
salvas. Senha da conta Sandbox perdida; TestFlight dispensa essa conta especifica
para teste basico. Instalacao/purchase/restore no TestFlight nao confirmados,
cliques no espelhamento bloqueados. Pendencia informada, nao mascarada.

Notas da versao corrigidas para Menu e storefront Brasil. Rascunho 21:41 com
seis itens conferidos. Decisao de enviar para revisao antes do teste de compra
completo comunicada, preservando lancamento manual como gate de liberacao.
Enviar para revisao acionado e Apple confirmou 6 itens enviados. Todos relidos
em Aguardando revisao no envio 2ba0be0d-64fb-40fd-8964-0190b9ce149c: app1.0/190,
quatro assinaturas e grupo LaudoUSG Planos. Radio Lancar esta versao manualmente
confirmado apos reload. Sem aprovacao nem publicacao efetiva ainda.
