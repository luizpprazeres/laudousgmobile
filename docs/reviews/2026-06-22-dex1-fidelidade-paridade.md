# Review de fidelidade Swift iOS vs React Native Android

Escopo: leitura estática, sem modificar o repo. A lógica de geração de laudo foi excluída da análise, porque o backend é comum. O gap principal não é “gerar laudo”; é tudo ao redor da geração: voz ao vivo, onboarding/legal gate, revisão, ferramentas clínicas, histórico, analytics e preferências.

## 1. Voz: Swift tem Deepgram Live, RN ainda usa Whisper batch

Status: gap alto.

O Swift usa transcrição streaming ao vivo com Deepgram. O próprio serviço declara o objetivo em `LaudoUSG/Services/DeepgramLiveService.swift:35`: “Transcrição STREAMING (ao vivo) com Deepgram Nova-3”. A conexão real é WebSocket em `LaudoUSG/Services/DeepgramLiveService.swift:199`, com `wss://api.deepgram.com/v1/listen`; os parâmetros incluem `model=nova-3`, `language=pt-BR`, `interim_results=true`, `smart_format=true` e `punctuate=true` em `LaudoUSG/Services/DeepgramLiveService.swift:200-208`. O pipeline usa `URLSessionWebSocketTask` em `LaudoUSG/Services/DeepgramLiveService.swift:81-84`, captura áudio em `linear16/16kHz/mono` em `LaudoUSG/Services/DeepgramLiveService.swift:75-79` e busca token em `/api/deepgram/token` em `LaudoUSG/Services/DeepgramLiveService.swift:192-194`.

No fluxo de geração Swift, isso está realmente ligado: `GenerateViewModel` instancia `DeepgramLiveService` em `LaudoUSG/Features/Generate/GenerateViewModel.swift:128-131`, faz prewarm do microfone/token em `LaudoUSG/Features/Generate/GenerateViewModel.swift:272-275`, inicia a gravação via `deepgram.start()` em `LaudoUSG/Features/Generate/GenerateViewModel.swift:278-292` e, ao parar, usa `deepgram.liveTranscript` sem esperar upload batch em `LaudoUSG/Features/Generate/GenerateViewModel.swift:302-310`. A UI de gravação também mostra o texto vivo: `RecordingOverlay` recebe `DeepgramLiveService` em `LaudoUSG/Components/Sheets/RecordingOverlay.swift:6` e renderiza `deepgram.liveTranscript` em `LaudoUSG/Components/Sheets/RecordingOverlay.swift:160-169`.

O RN Android não tem paridade aqui. Ele grava e só depois envia o áudio para transcrição batch: `apps/mobile/src/features/generate/transcribe.ts:42-44` diz que para a gravação, faz upload para `POST /api/transcribe` e recebe Whisper. O `fetch` para `/api/transcribe` está em `apps/mobile/src/features/generate/transcribe.ts:73-92`, e a leitura do transcript final vem de JSON em `apps/mobile/src/features/generate/transcribe.ts:118-129`. Na tela, o botão de stop chama `stopAndTranscribeWithWhisper` em `apps/mobile/app/generate.tsx:149-161`, e a UI deixa explícito “Transcrevendo seu áudio com Whisper...” em `apps/mobile/app/generate.tsx:473-485`.

Conclusão: Swift tem ditado com feedback em tempo real; RN tem captura seguida de upload/transcrição. Para o médico, isso muda a sensação do produto.

## 2. Onboarding e aceite legal obrigatório

Status: ausente no RN.

O Swift tem onboarding ativo de 6 etapas: `welcome`, `micPermission`, `firstRecording`, `processing`, `firstLaudo`, `completion` em `LaudoUSG/Features/Onboarding/OnboardingFlow.swift:3-10`, renderizado no switch de telas em `LaudoUSG/Features/Onboarding/OnboardingFlow.swift:67-117`.

O Swift também tem gate de aceite legal antes do uso. `AppShellView` calcula `showLegalGate` por `needsLegalAcceptance` em `LaudoUSG/Features/Shell/AppShellView.swift:16-24`, calcula o gate de onboarding em `LaudoUSG/Features/Shell/AppShellView.swift:27-36` e abre `DisclaimerAcceptModal` + `OnboardingFlow` via `fullScreenCover` em `LaudoUSG/Features/Shell/AppShellView.swift:66-73`. O modal exige aceite explícito de termos, privacidade e disclaimer em `LaudoUSG/Features/Legal/DisclaimerAcceptModal.swift:36-45` e bloqueia o botão “Entendi e aceito” até o aceite em `LaudoUSG/Features/Legal/DisclaimerAcceptModal.swift:52-59`.

O RN tem só gate de autenticação: sessão ativa redireciona para `/generate`, sem sessão para login, em `apps/mobile/app/index.tsx:6-14` e `apps/mobile/app/index.tsx:31-34`. A lista de rotas do Expo tem `index`, auth, generate, historico, analytics, preferencias, sobre, biblioteca, seguranca e report, mas não tem onboarding nem tela de aceite legal em `apps/mobile/app/_layout.tsx:64-76`.

## 3. Consultor IA

Status: ausente no RN.

O Swift tem Consultor IA dentro do Plus Sheet e como sheet própria. O botão aparece na seção “IA” do Plus Sheet em `LaudoUSG/Components/Sheets/PlusSheet.swift:393-435`. A tela do consultor tem navegação “Consultor IA”, lista de mensagens, indicador de streaming, anexos e campo de envio em `LaudoUSG/Features/Consultor/ConsultorSheet.swift:22-23`, `LaudoUSG/Features/Consultor/ConsultorSheet.swift:36-63`, `LaudoUSG/Features/Consultor/ConsultorSheet.swift:72-80` e `LaudoUSG/Features/Consultor/ConsultorSheet.swift:164-200`.

O modelo do consultor inclui contexto do laudo/achados e permite até 5 imagens: `LaudoUSG/Features/Consultor/ConsultorViewModel.swift:19-21`; imagens são anexadas como data URL em `LaudoUSG/Features/Consultor/ConsultorViewModel.swift:47-51`; o primeiro envio injeta contexto do exame em `LaudoUSG/Features/Consultor/ConsultorViewModel.swift:81-91`; a resposta é streaming em `LaudoUSG/Features/Consultor/ConsultorViewModel.swift:93-123`.

No RN, o Plus Sheet só oferece `calc` e `clear` em `apps/mobile/src/features/generate/PlusSheet.tsx:6-11` e renderiza apenas “Calculadoras” e “Limpar achados” em `apps/mobile/src/features/generate/PlusSheet.tsx:27-42`. Não há rota de consultor na pilha em `apps/mobile/app/_layout.tsx:64-76`.

## 4. Minhas Frases e Plus Sheet rico

Status: RN tem Plus Sheet mínimo; Swift tem ecossistema.

O Swift carrega frases do usuário no Plus Sheet: estado de frases em `LaudoUSG/Components/Sheets/PlusSheet.swift:13-17`, seção “Frases” em `LaudoUSG/Components/Sheets/PlusSheet.swift:458-495`, fallback de frases padrão em `LaudoUSG/Components/Sheets/PlusSheet.swift:481-487` e instrução para cadastrar em Preferências -> Minhas frases em `LaudoUSG/Components/Sheets/PlusSheet.swift:489-493`. A tela de ajustes também expõe “Minhas frases” em `LaudoUSG/Features/Settings/SettingsView.swift:37-40`.

O RN não tem isso. O Plus Sheet limita ações a calculadoras e limpar achados em `apps/mobile/src/features/generate/PlusSheet.tsx:6-11`, `apps/mobile/src/features/generate/PlusSheet.tsx:27-42`. A tela de preferências não tem entrada para frases: mostra conta, escrita, aparência, legal e zona de risco em `apps/mobile/app/preferencias.tsx:170-333`.

## 5. Calculadoras e ferramentas clínicas

Status: RN tem só uma fração.

O Swift tem várias ferramentas no Plus Sheet. O enum inclui IG, Doppler obstétrico, Hadlock, ILA 4 quadrantes, anemia fetal MCA-PSV, AFC, ducto venoso, BI-RADS, TI-RADS, pré-eclâmpsia, volumes prostático/tireoidiano/uterino/residual, esquema mamário, esquema tireoidiano, cartografia venosa e análise de imagem em `LaudoUSG/Components/Sheets/PlusSheet.swift:18-37`. As telas são ligadas na navegação em `LaudoUSG/Components/Sheets/PlusSheet.swift:60-156`.

O detalhe clínico aparece nas linhas de UI: Hadlock em `LaudoUSG/Components/Sheets/PlusSheet.swift:176-182`, ILA em `LaudoUSG/Components/Sheets/PlusSheet.swift:183-189`, Doppler em `LaudoUSG/Components/Sheets/PlusSheet.swift:191-198`, anemia fetal em `LaudoUSG/Components/Sheets/PlusSheet.swift:199-205`, ducto venoso em `LaudoUSG/Components/Sheets/PlusSheet.swift:206-212`, pré-eclâmpsia em `LaudoUSG/Components/Sheets/PlusSheet.swift:214-221`, BI-RADS em `LaudoUSG/Components/Sheets/PlusSheet.swift:223-230`, TI-RADS em `LaudoUSG/Components/Sheets/PlusSheet.swift:247-254`, AFC em `LaudoUSG/Components/Sheets/PlusSheet.swift:271-278`, cartografia venosa em `LaudoUSG/Components/Sheets/PlusSheet.swift:280-287`, volumes em `LaudoUSG/Components/Sheets/PlusSheet.swift:289-323`.

O RN só tipa duas calculadoras: `CalcKey = "ig" | "doppler"` em `apps/mobile/src/features/generate/CalculatorsSheet.tsx:6`, com itens “Idade gestacional” e “Doppler obstétrico” em `apps/mobile/src/features/generate/CalculatorsSheet.tsx:22-37`. O Plus Sheet até fala “IG, Doppler obstétrico, anemia fetal” em `apps/mobile/src/features/generate/PlusSheet.tsx:27-32`, mas a lista real de calculadoras não tem anemia fetal, Hadlock, BI-RADS, TI-RADS, esquemas, volumes etc.

## 6. Editor de miomas, esquemas e análise de imagem

Status: ausente no RN.

O Swift tem editor de miomas com esquema visual. A sheet é aberta no fluxo de geração em `LaudoUSG/Features/Generate/GenerateView.swift:144-146`, usando `MyomaFindingsParser.parse(vm.editedLaudoText)`. A tela tem `MyomaEditorScreen`, estado de múltiplos miomas, esquema visual e envio em `LaudoUSG/Features/Miomas/MyomaEditorView.swift:5-20`, adiciona miomas em `LaudoUSG/Features/Miomas/MyomaEditorView.swift:26`, renderiza linhas editáveis em `LaudoUSG/Features/Miomas/MyomaEditorView.swift:35`, e envia via `MyomaSchemaSender.send` em `LaudoUSG/Features/Miomas/MyomaEditorView.swift:74-82`. O canvas/schematic aparece em `LaudoUSG/Features/Miomas/MyomaSchematicView.swift:9-26`.

O Swift também tem esquemas mamário e tireoidiano pós-laudo: entrada mamária em `LaudoUSG/Components/Sheets/PlusSheet.swift:231-245`, entrada tireoidiana em `LaudoUSG/Components/Sheets/PlusSheet.swift:255-269`, gates por `reportText` em `LaudoUSG/Components/Sheets/PlusSheet.swift:374-384`. A cartografia venosa MMII também aparece em `LaudoUSG/Components/Sheets/PlusSheet.swift:280-287` e é limitada às categorias venosas em `LaudoUSG/Components/Sheets/PlusSheet.swift:386-390`.

Feature que você não citou explicitamente, mas existe no Swift: análise de imagem de USG. O Plus Sheet mostra “Analisar imagem de USG” para categorias aceitas em `LaudoUSG/Components/Sheets/PlusSheet.swift:441-452`, e a navegação abre `ImageAnalysisSheet` em `LaudoUSG/Components/Sheets/PlusSheet.swift:150-155`. Não encontrei equivalente no RN pelas rotas existentes (`apps/mobile/app/_layout.tsx:64-76`) nem no Plus Sheet RN (`apps/mobile/src/features/generate/PlusSheet.tsx:27-42`).

## 7. Feedback thumbs up/down gravando em user_feedback

Status: ausente no RN.

O Swift renderiza o card “Esse laudo ficou bom?” depois da geração em `LaudoUSG/Features/Generate/GenerateView.swift:434-436` e mostra botões `hand.thumbsup` / `hand.thumbsdown` em `LaudoUSG/Features/Generate/GenerateView.swift:506-522`; feedback negativo abre campo de comentário e submit em `LaudoUSG/Features/Generate/GenerateView.swift:525-554`. A gravação vai para `/rest/v1/user_feedback`, com upsert em `report_id,user_id`, em `LaudoUSG/Services/FeedbackService.swift:3-27`.

No RN, a tela de geração finaliza com disclaimer e botões “Abrir detalhes” / “Novo” em `apps/mobile/app/generate.tsx:786-812`. Não há rota ou tela dedicada na pilha em `apps/mobile/app/_layout.tsx:64-76`, e o detalhe do laudo só oferece copiar/compartilhar/abas em `apps/mobile/app/report/[id].tsx:122-157`.

## 8. Edição inline do laudo final

Status: ausente/pior no RN.

O Swift permite editar o laudo final inline. A view alterna entre modo visual e modo edição por `isEditingLaudo` em `LaudoUSG/Features/Generate/GenerateView.swift:11`; no modo edição usa `TextEditor` chamando `vm.laudoTextChanged` em `LaudoUSG/Features/Generate/GenerateView.swift:414-421`; no modo leitura mantém highlight e seleção de texto em `LaudoUSG/Features/Generate/GenerateView.swift:423-432`. A UI mostra estado “Edite e o app salva”, “Salvando…”, “Salvo” e erro em `LaudoUSG/Features/Generate/GenerateView.swift:755-784`.

No RN, o campo editável é o texto de achados antes de gerar, não o laudo final: `TextInput` de achados em `apps/mobile/app/generate.tsx:649-662`. O resultado final mostra apenas botões para abrir detalhes ou novo laudo em `apps/mobile/app/generate.tsx:786-812`. No detalhe, o laudo é `Text selectable`, sem edição/salvamento, em `apps/mobile/app/report/[id].tsx:163-179`.

## 9. Histórico: busca, filtros, multi-delete e ações

Status: RN tem histórico básico.

O Swift tem busca real no histórico: filtra por categoria, laudo final, laudo gerado e raw input em `LaudoUSG/Features/History/HistoryView.swift:18-26`, e expõe `.searchable` com prompt “Buscar em laudos” em `LaudoUSG/Features/History/HistoryView.swift:140-147`. Tem filtros por período e categoria em `LaudoUSG/Features/History/HistoryFilterBar.swift:13-21`, botão de categoria em `LaudoUSG/Features/History/HistoryFilterBar.swift:27-47`, limpar filtros em `LaudoUSG/Features/History/HistoryFilterBar.swift:49-58` e sheet de categorias em `LaudoUSG/Features/History/HistoryFilterBar.swift:65-75`.

O Swift tem seleção múltipla e deleção em lote: estados `isSelectionMode`, `selectedIds`, `isDeleting` em `LaudoUSG/Features/History/HistoryView.swift:14-16`, seleção/todos em `LaudoUSG/Features/History/HistoryView.swift:47-67`, deleção por `HistoryService.deleteReports` em `LaudoUSG/Features/History/HistoryView.swift:69-83`, toolbar “Cancelar/Todos” em `LaudoUSG/Features/History/HistoryView.swift:148-167` e confirmação destrutiva em `LaudoUSG/Features/History/HistoryView.swift:189-200`.

O RN carrega só os últimos 50 laudos em `apps/mobile/app/historico.tsx:55-59`. O “search pill” é apenas texto “Últimos 50 laudos da sua conta”, não input, em `apps/mobile/app/historico.tsx:109-115`. A lista agrupa por Hoje/Ontem/Últimos 7 dias/Anteriores em `apps/mobile/app/historico.tsx:193-215`, mas não tem busca, filtro, seleção múltipla, deleção em lote ou envio contextual para Sala.

## 10. Analytics com calendário/heatmap e patologias

Status: RN tem KPIs simples; Swift é mais rico.

O Swift carrega summary e até 500 laudos recentes para analytics local em `LaudoUSG/Features/Analytics/AnalyticsView.swift:17-20`. A tela mostra KPIs, top categorias, seção “Calendário” com `DailyCalendarView`, seção “Patologias frequentes” com `PathologyListView` e footer de taxa de edição em `LaudoUSG/Features/Analytics/AnalyticsView.swift:100-121` e `LaudoUSG/Features/Analytics/AnalyticsView.swift:240-242`.

O calendário/heatmap Swift tem navegação mensal, grade semanal, contagem por dia, breakdown por categoria e média de intervalo em `LaudoUSG/Features/Analytics/DailyCalendarView.swift:37-67`, `LaudoUSG/Features/Analytics/DailyCalendarView.swift:127-164` e `LaudoUSG/Features/Analytics/DailyCalendarView.swift:183-231`.

O RN chama `getMeAnalytics()` em `apps/mobile/app/analytics.tsx:32-37` e renderiza só KPIs básicos em `apps/mobile/app/analytics.tsx:86-107`, top categorias em `apps/mobile/app/analytics.tsx:131-162` e link para histórico em `apps/mobile/app/analytics.tsx:164-170`. Não há calendário, heatmap diário, navegação mensal nem patologias frequentes.

## 11. Paywall / acesso restrito

Status: ausente no RN.

O Swift tem `PaywallSheet` com título “Acesso restrito”, texto de acesso ativo e ações “Já tenho acesso — atualizar” / “Agora não” em `LaudoUSG/Features/Paywall/PaywallSheet.swift:21-25`, `LaudoUSG/Features/Paywall/PaywallSheet.swift:39-52` e `LaudoUSG/Features/Paywall/PaywallSheet.swift:66-88`. Ele é usado no fluxo de geração para bloquear recursos como Consultor quando não há acesso, abrindo `vm.isPaywallPresented` em `LaudoUSG/Features/Generate/GenerateView.swift:120-125` e apresentando a sheet em `LaudoUSG/Features/Generate/GenerateView.swift:150-156`.

No RN, preferências só mostram o plano como badge em `apps/mobile/app/preferencias.tsx:191-194`. Não há rota de paywall na pilha em `apps/mobile/app/_layout.tsx:64-76` nem ação de atualização de acesso comparável.

## 12. Settings completo

Status: RN tem versão simplificada.

O Swift tem preferências de geração: estilo de laudo, casas decimais e Minhas frases em `LaudoUSG/Features/Settings/SettingsView.swift:27-43`. Tem modelos de laudo por categoria/variante em `LaudoUSG/Features/Settings/SettingsView.swift:45-54` e cálculo de variantes por estilo atual em `LaudoUSG/Features/Settings/SettingsView.swift:221-237`. Tem preferências obstétricas de percentil em `LaudoUSG/Features/Settings/PreferencesSection.swift:6-20`, com Intergrowth, Hadlock legacy e WHO em `LaudoUSG/Features/Settings/PreferencesSection.swift:61-69`. Tem Sala do Auxiliar em `LaudoUSG/Features/Settings/SettingsView.swift:58-91`, aparência em `LaudoUSG/Features/Settings/SettingsView.swift:93-100`, conta em `LaudoUSG/Features/Settings/SettingsView.swift:102-106`, editar perfil em `LaudoUSG/Features/Settings/SettingsView.swift:108-113`, sobre em `LaudoUSG/Features/Settings/SettingsView.swift:115-120` e excluir conta em `LaudoUSG/Features/Settings/SettingsView.swift:122-137`.

O RN tem conta, nome, email, plano em `apps/mobile/app/preferencias.tsx:170-194`; escrita com lista hardcoded de três estilos em `apps/mobile/app/preferencias.tsx:24-37` e `apps/mobile/app/preferencias.tsx:197-220`; aparência em `apps/mobile/app/preferencias.tsx:223-245`; legal em `apps/mobile/app/preferencias.tsx:247-259`; exclusão de conta em `apps/mobile/app/preferencias.tsx:262-333`. Falta Minhas Frases, casas decimais, variantes por categoria, preferências obstétricas, Sala do Auxiliar dentro das preferências e edição de perfil no nível do Swift.

## 13. Features esquecidas / gaps adicionais

Além da lista inicial, encontrei estes pontos relevantes:

1. Análise de imagem de USG no Swift, ausente no RN: entrada em `LaudoUSG/Components/Sheets/PlusSheet.swift:441-452` e destino `ImageAnalysisSheet` em `LaudoUSG/Components/Sheets/PlusSheet.swift:150-155`.

2. Cartografia venosa MMII no Swift, ausente no RN: entrada em `LaudoUSG/Components/Sheets/PlusSheet.swift:280-287` e gate por categoria venosa em `LaudoUSG/Components/Sheets/PlusSheet.swift:386-390`.

3. Preferências clínicas de percentil obstétrico no Swift, ausentes no RN: `PreferencesSection` em `LaudoUSG/Features/Settings/PreferencesSection.swift:6-20` e opções Intergrowth/Hadlock/WHO em `LaudoUSG/Features/Settings/PreferencesSection.swift:61-69`.

4. Documentos legais do RN parecem desalinhados com a realidade Android/Deepgram: os Termos ainda definem o LaudoUSG como “aplicativo móvel iOS” e dizem transcrição por Whisper em `apps/mobile/src/legal/documents.ts:13`; a Política ainda cita Apple App Store Review Guidelines em `apps/mobile/src/legal/documents.ts:18`. Isso não é feature UX, mas é gap de fidelidade/compliance entre apps.

## Prioridade prática para paridade

Se o objetivo é igualar sensação de produto, eu priorizaria assim: primeiro Deepgram Live no RN, depois edição inline + autosave do laudo final, depois onboarding/legal gate, depois Plus Sheet completo com Consultor IA/frases/calculadoras principais, depois histórico com busca/filtro/multi-delete, depois analytics com calendário/patologias. O RN hoje cobre o fluxo básico, mas ainda não cobre a experiência clínica madura que o Swift já tem.
