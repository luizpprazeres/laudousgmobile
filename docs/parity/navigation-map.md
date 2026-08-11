# Mapa de navegação — RN (Android) × Swift (iOS)

> Gerado 2026-07-04 (Fase 0 — auditoria). Fontes: auditoria de código dos dois apps.
> Paths RN relativos a `apps/mobile/`; paths Swift relativos a `laudousg-swift/LaudoUSG/LaudoUSG/`.

## Arquitetura de navegação

| | iOS Swift (referência) | RN Android (hoje) |
|---|---|---|
| Padrão | `NavigationStack(path:)` + enum `AppDestination`; **home = GenerateView**, sem TabBar | Stack única expo-router; **home = /generate**, sem tabs — ✅ mesmo modelo |
| Root gate | `AppShellView` switch `.checking/.signedOut/.authenticated` + splash animado | `app/index.tsx` (`IndexGate`) → Redirect login/generate + `BrandSplash` — ✅ equivalente |
| Gates pós-login | 1º `DisclaimerAcceptModal` (legal) → 2º `OnboardingFlow` → 3º `TourFlowView` (fullScreenCover em cadeia, `AppShellView.swift:65-87`) | ❌ NENHUM gate — login vai direto ao generate |
| Menu | `MenuSheet`: Histórico, Analytics, Biblioteca, Preferências, Sobre, Sair | `MenuSheet.tsx:39-42`: Histórico, Analytics, Preferências (+Sala, Tema, Sair). Sem Biblioteca/Sobre no menu (Sobre acessível via Preferências) |

## Rotas RN existentes (`app/_layout.tsx:64-76`)

| Rota RN | Equivalente Swift | Estado |
|---|---|---|
| `index` (gate) | `AppShellView` | ✅ |
| `(auth)/login` | `LoginView` + `SignUpView` | 🟡 RN é 1 tela com toggle; iOS tem SignUp/Forgot/Reset/ConfirmEmail separados. **RN não tem forgot password** |
| `generate` | `GenerateView` | ✅ core igual (2 tabs Achados/Laudo) |
| `report/[id]` | `ReportDetailView` | 🟡 RN tem 4 tabs (Laudo/Entendido/RAG/Meta); iOS tem edição+autosave 1200ms |
| `historico` | `HistoryView` | 🟡 sem busca/filtro/multi-delete/push-Sala por card |
| `analytics` | `AnalyticsView` | 🟡 sem heatmap/patologias |
| `preferencias` | `SettingsView` | 🟡 simplificado (ver matriz) |
| `sobre` | `AboutAppView` + Legal views | 🟡 texto puro, markdown não renderizado |
| `biblioteca` | `PlaceholderView` (library) | ✅ ambos placeholder; RN sem link de navegação |
| `seguranca` | — (não existe no iOS) | ⚠️ tela RN órfã, sem equivalente iOS |

## Telas/fluxos iOS SEM rota RN

- **Onboarding** (6 steps: welcome→micPermission→firstRecording(5s)→processing(5 stages)→firstLaudo→completion c/ confete) — `Features/Onboarding/OnboardingFlow.swift`
- **DisclaimerAcceptModal** (3 cards de documento + 3 checkboxes + "Entendi e aceito"; Sair = signOut) — `Features/Legal/DisclaimerAcceptModal.swift`
- **Tour** (`TourFlowView`, flag `@AppStorage("laudousg.hasSeenTour")`)
- **ForgotPassword / ResetPassword / ConfirmEmail** — `Features/Auth/`
- **MyPhrasesView** (CRUD frases, reorder+swipe-delete) — `Features/Settings/MyPhrasesView.swift`
- **EditProfileView** / **DeleteAccountView** (RN tem delete inline em preferencias ✅)
- **ConsultorSheet** (chat SSE + 5 imagens) — `Features/Consultor/`
- **ImageAnalysisSheet** (até 3 imagens → `/api/analyze-image`) — `Components/Sheets/`
- **MyomaEditorScreen** (miomas FIGO) — `Features/Miomas/`
- **PaywallSheet** (StoreKit; no Android será Play Billing OU web — decidir) — `Features/Paywall/`
- **Esquemas**: mamário, tireoidiano, cartografia venosa (760×700, 4 vistas) — `Components/`
- **Calculadoras**: 14 no iOS vs 2 no RN (ver matriz)

## Sheets RN existentes (não são rotas)

`CategorySheet`, `MenuSheet`, `SalaPairingSheet`, `PlusSheet` (2 itens vs hub rico iOS), `CalculatorsSheet` (2 calcs), `IGCalculatorSheet`, `DopplerCalculatorSheet` — todos montados em `app/generate.tsx:488-536`.
