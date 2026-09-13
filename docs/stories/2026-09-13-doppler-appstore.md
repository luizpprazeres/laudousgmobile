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
- [ ] Validar testes clinicos e contratos iOS completos.
- [x] Corrigir/verificar dominio de assinatura: 105 assercoes sinteticas; compra sandbox real ainda pendente.
- [x] Conferir contrato comercial, produtos e conta de revisao Apple.
- [x] Publicar API validada e aplicar migration subscriptions com RLS; sem mudar planos web.
- [x] Compilar iOS com consentimento explicito para IA e bloqueio de envio quando recusado.
- [ ] Concluir testes nativos, compra sandbox e restauracao no build assinado.
- [ ] Atualizar politica de privacidade nativa/publica e declaracoes da loja para IAP e consentimento IA.
- [ ] Configurar notificacoes Apple V2 de producao e sandbox na loja.
- [ ] Archive/upload do build atual corrigido e submissao conjunta dos produtos.
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
- iOS: LaudoUSG.xcodeproj/project.pbxproj (build 189); docs/appstore/release-189.md e ExportOptions-AppStore.plist

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

Antes do envio, revisar a politica de privacidade 2.0 (nativa e site publico):
o texto ainda chama billing de futuro e precisa refletir dados de assinatura
recebidos da Apple e permissao explicita para IA. Declaracoes de privacidade
da loja e caminhos das notas de revisao ainda dependem de conferencias finais.
A pequena correcao de prioridade de planos em apps/web/src/lib/planos.ts esta
no codigo desta frente, mas o aplicativo web nao foi publicado separadamente.
