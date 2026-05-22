---
slug: sprint-0-fundacao
title: "Fundação técnica do app iOS"
date: 2026-03-15
status: shipped
size: large
tags: [ios, design-system, foundation]
sprint: S0
related_adrs: []
files_touched: 30
---

## Resumo (leigo)

Esta foi a primeira pedra do app nativo. Antes dela, o LaudoUSG existia como web e como uma versão experimental em React Native. Decidimos começar do zero em Swift puro (a linguagem nativa do iPhone) pra ter um app que parece e responde como um app de verdade — rápido, fluido, fiel ao jeito iOS.

Nesta fundação ficaram as "fôrmas" que todas as outras telas vão usar depois: as cores oficiais do produto (verde médico), as fontes (Inter e Barlow), os botões padronizados, os cartões, o sistema que conversa com o servidor e a tela inicial que decide se você está logado ou não.

Nenhuma funcionalidade visível pra usuário ainda. Mas sem este alicerce, nada do que veio depois teria suporte.

## Detalhes (técnico)

Stack consolidada: SwiftUI + `@Observable` (iOS 17+), AppShell com `AppState` global `@MainActor`, sem dependências externas de UI.

Estruturado em 6 pastas: `Core/`, `DesignSystem/`, `Models/`, `Services/`, `Components/`, `Features/`. Projeto usa `PBXFileSystemSynchronizedRootGroup` — qualquer `.swift` em `LaudoUSG/` é auto-incluído sem mexer no pbxproj.

`APIClient` em `URLSession` puro (sem SDK Supabase — REST direto pra menor blast radius e zero overhead). Tokens (cores, fontes, spacing, radii, shadows) centralizados em `DesignSystem/`. iOS 17.0 deployment target.

Decisões trancadas: bundle `com.laudousg.LaudoUSG`, transcrição via Whisper batch (não Apple Speech — falha no Simulator), 3 estilos fixos de laudo (Tradicional, Estruturado, Livre).

## Impacto & Próximos passos

Não tem impacto direto pra usuário — é puro alicerce. Mas serviu como base estável pra todas as ~30 sprints seguintes (incluindo P7, o Painel Admin no Lab). Próximo passo na época: Sprint 1 (UI Shell navegável).
