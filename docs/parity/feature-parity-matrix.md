# Matriz de paridade de features — RN Android × Swift iOS

> Gerado 2026-07-04 (Fase 0). Legenda: ✅ paridade | 🟡 parcial | ❌ ausente no RN | 🚫 fora de escopo (D1).
> Fase = onde entra no roadmap (L = caminho crítico de Loja; 1 = paridade core; 2 = features ricas).

## Core

| Feature | iOS (ref) | RN hoje | Δ | Fase |
|---|---|---|---|---|
| Auth login/signup | LoginView + SignUpView + Forgot/Reset/ConfirmEmail | 1 tela toggle signin/signup, erros humanizados PT | 🟡 falta forgot password + confirm email flow | 1 |
| Generate: ditado→SSE→laudo | GenerateView, stages de progresso c/ chips "achados reconhecidos", TypingCursor, highlight roxo `____` | fluxo completo, tabs Achados/Laudo, clarify Q&A, highlight `[REVISAR]` roxo | 🟡 sem stages ricos de progresso (chips), sem TypingCursor | 1–2 |
| Voz | Deepgram Live (+ Whisper batch no onboarding) | Whisper batch (`transcribe.ts` → `/api/transcribe`) | 🚫 **D1: Whisper FICA no Android** (A/B). RecordingOverlay adaptar p/ batch (sem legenda live) | — |
| RecordingOverlay | timer mono, waveform real 32 barras, legenda live, Cancelar/Parar | overlay existe; waveform FAKE (barras aleatórias) | 🟡 waveform real (RMS local via expo-av metering) sem Deepgram | 2 |
| Edição inline + autosave | Generate: debounce 600ms; ReportDetail: 1200ms; salva texto limpo (strip REVISAR); indicador Salvando/Salvo | ❌ laudo imutável (Text selecionável) | ❌ | 1 |
| Feedback 👍/👎 | feedbackCard pós-laudo; 👎 expande textarea; POST `/rest/v1/user_feedback` (report_id, category_code, verdict, comment) | ❌ | ❌ | 1 |
| Sanity card | acordeão "N ponto(s) a revisar" (SanityChecker local) | ❌ (eventos sanity do SSE são recebidos mas sem UI dedicada) | ❌ | 2 |
| Atalhos por categoria (aba Achados) | shortcutsBar dinâmico (obst/tireoide/mama/abdome/pelve/default) — `GenerateViewModel.swift:22-62` | quick actions só p/ obstétricas (IG DUM/1ª USG) | 🟡 | 2 |
| Clarify Q&A | via SSE | ✅ inline + resume | ✅ | — |

## Gates e onboarding

| Feature | iOS | RN | Δ | Fase |
|---|---|---|---|---|
| Disclaimer accept-gate | 3 checkboxes + versões ("2.0"), grava via `recordLegalAcceptance`, bloqueia app | ❌ | ❌ **item de loja** | L |
| Onboarding 6 steps | welcome→mic→gravação 5s→processing (5 stages)→firstLaudo→confete; usa Whisper batch ✅ (portável) | ❌ | ❌ | 1 |
| Tour | TourFlowView pós-onboarding | ❌ | ❌ (P2, opcional) | 2 |
| Docs legais | markdown renderizado (`MarkdownDocumentView`), versões | texto puro com `#`/`|` literais; contato `contato@laudousg.com` | 🟡 corrigir render + conteúdo (diz "iOS"/"Whisper") | L |

## Histórico / Analytics / Report

| Feature | iOS | RN | Δ | Fase |
|---|---|---|---|---|
| Busca no histórico | `.searchable` client-side (categoria+conteúdo) | ❌ | ❌ | 1 |
| Filtro data + categorias | chips range + CategoryPickerSheet multi | ❌ | ❌ | 1 |
| Multi-delete | modo seleção + "Todos" + confirmationDialog | ❌ | ❌ | 1 |
| Push p/ Sala por card | botão paperplane por item | ❌ (só push automático pós-geração) | ❌ | 1 |
| Heatmap diário | DailyCalendarView (500 reports) | ❌ | ❌ | 2 |
| Patologias frequentes | PathologyExtractor local | ❌ | ❌ | 2 |
| KPIs | 4 cards + taxa de edição | ✅ equivalente (inclui custo USD extra) | ✅ | — |
| Report detail | edição+autosave, disclaimer CFM 2.314/2022 rodapé | 4 tabs (Laudo/Entendido/RAG/Meta) imutáveis | 🟡 adicionar edição; avaliar manter tabs RAG/Meta (dev-only?) | 1 |

## Settings

| Feature | iOS | RN | Δ | Fase |
|---|---|---|---|---|
| Estilo de laudo | dinâmico de `/rest/v1/writing_styles` | 3 hardcoded | 🟡 | 2 |
| Casas decimais (0/1/2) | picker | ❌ | ❌ | 2 |
| Variantes por categoria | `/api/me/report-preferences` | ❌ | ❌ | 2 |
| Percentil obstétrico | Intergrowth/Hadlock/WHO (PreferencesStore local) | ❌ | ❌ | 2 |
| Tema Sistema/Claro/Escuro | funcional | UI existe mas **valor nunca é aplicado** (`laudousg.theme_mode` órfão) | 🟡 bug real | 1 |
| Minhas frases (CRUD) | MyPhrasesView + `/rest/v1/user_phrases` + fallback | ❌ | ❌ | 2 |
| Editar perfil | EditProfileView | 🟡 só nome inline | 🟡 | 2 |
| Delete account | DeleteAccountView | ✅ digitar "EXCLUIR" → `/api/me/delete-account` | ✅ (falta **link web** exigido pelo Google — item de loja) | L |
| Assinatura/IAP | StoreKit, 4 produtos `com.laudousg.LaudoUSG.*`, trial 7d, validate-receipt | ❌ nunca teve billing | ❌ decidir: Play Billing × web checkout (AbacatePay) — **decisão de produto** | 2 |

## Plus / ferramentas clínicas

| Feature | iOS | RN | Δ | Fase |
|---|---|---|---|---|
| PlusSheet hub | Calculadoras (por categoria) + Imagem + IA + Frases | 2 itens (calc, limpar) | 🟡 | 2 |
| Calculadoras | **14**: IG, Hadlock EFW, ILA 4Q, Doppler obst, Anemia MCA-PSV, Ducto venoso, Pré-eclâmpsia 1T, BI-RADS, TI-RADS, AFC, Vol prostático+PSA, Vol tireoide, Vol uterino, Resíduo pós-miccional | **2**: IG, Doppler obst | 🟡 12 faltando (lógica em `Services/*Calculator*.swift` — portar espec, não código) | 2 |
| Consultor IA | chat SSE `/api/consultant`, até 5 imagens base64, contexto do caso, gate Pro | ❌ | ❌ | 2 |
| Paywall gate | Consultor: `hasProEffective` senão PaywallSheet | ❌ | ❌ (junto com decisão billing) | 2 |
| Análise de imagem | até 3 imgs → `/api/analyze-image` → insere achados | ❌ | ❌ | 2 |
| Editor de miomas | FIGO+localização+tamanho+eco, preview canvas, parser do laudo, push Sala | ❌ | ❌ | 2 |
| Esquema mamário / tireoidiano | View+Editor+Sheet+Parser+Exporter | ❌ | ❌ | 2 |
| Cartografia venosa | 760×700, 4 vistas, 18 segmentos, push `/api/sala/push-schema` | ❌ | ❌ | 2 |

## Categorias e config

| | iOS | RN | Δ |
|---|---|---|---|
| Categorias | 28 (enum `ReportCategory`, 17 priorizadas, `tintHex`) | 14 hardcoded (`tokens.ts:129-144`) | 🟡 igualar às 28 (ou buscar do backend) |
| Base API | `laudousgmobile.vercel.app` | idem | ✅ |
| Supabase | `yldtkqrsbgcnwlydrrot` | idem | ✅ |
| Bundle id | `com.laudousg.mobile` (iOS) | `com.laudousg.LaudoUSG` (Android) | ⚠️ divergente; Android já publicável assim — NÃO mudar depois de publicar |

## Endpoints usados só pelo iOS (a adotar no RN conforme features entram)

`/api/consultant`, `/api/analyze-image`, `/api/me/report-preferences`, `/api/sala/push-schema`, `/api/iap/validate-receipt`, `/rest/v1/user_feedback`, `/rest/v1/user_phrases`, `/rest/v1/writing_styles`, Supabase auth `/recover` (forgot password).
