# DET-4 — iOS: seletor de máscara nas Preferências

> Implementado e testado E2E em 2026-06-12. Único sprint fora do monorepo:
> repo `~/laudousg-swift/LaudoUSG`. Backend (DET-3) não foi tocado.

## O que entrou (5 arquivos, iOS/SwiftUI)

| Arquivo | Mudança |
|---|---|
| `LaudoUSG/Models/ReportPreference.swift` | **NOVO** — `ReportPreferenceRecord`, `ReportTemplateVariantRecord`, `ReportPreferencesResponse` (espelham o contrato do GET) |
| `LaudoUSG/Services/ProfileService.swift` | `fetchReportPreferences()` (GET) + `updateReportPreference(categoryCode:variantId:)` (PATCH; `variantId: nil` → `default_variant_id: null` **explícito** via `encodeNil`, limpa a preferência) |
| `LaudoUSG/Core/AppState.swift` | `reportPreferences` + `availableVariants` + `refreshReportPreferences()` + `setReportPreference()`; limpeza no `signOut()` |
| `LaudoUSG/Features/Shell/AppShellView.swift` | `loadPostLogin()` busca preferências em paralelo (async let) |
| `LaudoUSG/Features/Settings/SettingsView.swift` | Seção **"Modelos de laudo"**: por categoria com >1 variante no estilo atual, picker no padrão do Writing Style picker; opção "Automático" = sem preferência; `.task` refresh ao abrir |

Geração: **nenhuma mudança** no `GenerateRequest` — o backend resolve a variante
pela preferência da conta (precedência contexto > preferência > default, DET-3).

## Decisões de implementação

- **Filtro por estilo atual**: o catálogo repete cada `variant_key` por writing
  style; o picker só oferece variantes cujo key existe no
  `app.defaultWritingStyleId`. Sem isso, era possível gravar preferência que
  cai em `BUNDLE_VARIANT_EMPTY` na geração (achado ALTA dos reviews).
- **Dedup por `variant_key`** dentro do estilo; UI mostra `name` do catálogo.
- **Categorias elegíveis hoje** (>1 variante): ABDOMEN_TOTAL,
  DOPPLER_VENOSO_MMII, MAMARIA, MORFOLOGICO, OBSTETRICA, PELVE_FEMININA,
  TIREOIDE — variantes contextuais (1t/2t/3t, ta/tv, doppler) aparecem como
  preferência por desenho do plano (precedência protege: contexto no ditado
  sempre vence a preferência).

## Reviews (processo padrão dex1 + dex2 adversarial)

1. **ALTA (dex1+dex2)**: picker oferecia variante de outro estilo →
   `BUNDLE_VARIANT_EMPTY` futuro. **Corrigido** (filtro por estilo atual).
2. **MÉDIA (dex2)**: race de signOut — GET tardio repopulava `AppState` após
   logout. **Corrigido** (guard `session == .authenticated` pós-await).
3. **BAIXA (dex1)**: double-tap no Menu durante save podia sobrescrever escolha
   mais nova com resposta mais lenta. **Corrigido** (guard
   `savingVariantCategory == nil`).

O resto passou: contrato snake_case/null OK (validado também standalone via
`swift` CLI e ciclo GET/PATCH/clear ao vivo contra prod), tokens do
DesignSystem, sem `print`, padrão visual idêntico ao picker de estilo.

## Validação

- **Build verde** (`xcodebuild`, iPhone Simulator, Xcode 26.4).
- **E2E no Simulator** (iPhone 17 Pro Max, executado pelo dex1 via
  xcodebuildmcp, usuário `golden-runner@laudousg.dev`):
  1. Preferências → "Modelos de laudo" → Mamária: "Automático" → "Enxuta" ✅
  2. Laudo MAMARIA gerado no app → **"ULTRASSONOGRAFIA MAMÁRIA — LAUDO
     RESUMIDO"** ✅ (variante aplicada)
  3. Volta para "Automático" → novo laudo → estrutura padrão ("OS SEGUINTES
     ASPECTOS…", sem "LAUDO RESUMIDO") ✅ — critério idêntico ao
     `tests/det3/preference-e2e.mjs`
  4. Confirmado também nos `reports` salvos no DB (auto-save do app).
  - Screenshots: `/tmp/det4-e2e/01…07.jpg` (sessão de 2026-06-12).
- Nota: o título padrão saiu "ULTRASSONOGRAFIA DAS MAMAS" (sem "E REGIÕES
  AXILARES") porque o ditado não citava axilas — drift de título do writer
  LLM, pré-existente e conhecido (o E2E do DET-3 usa regex frouxa por isso).
  Resolve de vez no DET-5 (renderer, estrutura por construção).

## Follow-ups (não bloqueiam)

- **Variantes contextuais como preferência** — ✅ **RESOLVIDO 2026-06-12**
  (decisão Luiz: contextuais FORA do picker; contexto do ditado é soberano).
  Implementado `preference_eligible` no catálogo (coluna + SQL vivo
  `0009_det4_preference_eligible.sql`): GET `/api/me/report-preferences` só
  devolve variantes elegíveis; PATCH rejeita não-elegível
  (`variant_not_preference_eligible`); admin CRUD expõe o flag (default
  `false`, opt-in explícito). Hoje só MAMARIA padrao/enxuta são elegíveis —
  novas variantes de estilo entram com o flag via admin/lab. **iOS não mudou**
  (o picker já consome o GET filtrado).
- **Troca de estilo de escrita não revalida preferências salvas**: se o médico
  salvar preferência num estilo e trocar de estilo, uma key inexistente no novo
  estilo dá `BUNDLE_VARIANT_EMPTY` (erro claro, por desenho do DET-3). UX de
  revalidação fica para depois.
- **Modal legal "Antes de começar" piscou no E2E** mesmo com termos aceitos no
  perfil: race pré-existente no `AppShellView` (placeholder de `signIn()` tem
  termos nil até o `refreshProfile()` chegar). Fora do escopo DET-4.
- Commit/push do repo iOS: **@devops** (mudanças prontas na working tree).
