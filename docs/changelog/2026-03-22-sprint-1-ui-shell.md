---
slug: sprint-1-ui-shell
title: "Esqueleto de navegação do app"
date: 2026-03-22
status: shipped
size: medium
tags: [ios, ui, navigation]
sprint: S1
files_touched: 18
---

## Resumo (leigo)

Com a fundação pronta, esta sprint montou o "mapa" de telas do app. Todas as principais já apareciam: Login, Gerar laudo, Histórico, Detalhe do laudo. Eram cascas — sem dados reais — mas você já conseguia navegar entre elas e ter ideia do produto final.

Pense como uma maquete de apartamento decorado: os móveis estão lá, mas ainda não tem fiação, só pra você visualizar o espaço.

## Detalhes (técnico)

Implementadas: `LoginView`, `GenerateView`, `HistoryView`, `ReportDetailView`, `AppShellView` orquestrando navegação via `TabView` + `NavigationStack`. Sheets pra Inputs Salvos, Frases Comuns e Settings.

Tudo usando componentes do DesignSystem (`PrimaryButton`, `Card`, `BrandLogo`). State management via `AppState` (root) + `@State` local nas views. Mocks em `Models/MockData.swift` simulando endpoints até Sprint 2.

Dispatched pro dex1 com brief estruturado (5 seções: contexto, arquivos existentes, tarefas numeradas, padrões, validação). Validado que o padrão de delegação funcionava bem pra UI bem-escopada.

## Impacto & Próximos passos

Primeira vez que dá pra "ver" o app no simulador. Próximo passo era ligar a fiação: Sprint 2 conectou login Supabase real + Whisper + SSE streaming pra primeiro laudo end-to-end.
