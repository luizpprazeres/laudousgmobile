---
slug: sprint-7-redesign-generate
title: "Redesign da tela principal de geração"
date: 2026-05-14
status: shipped
size: medium
tags: [ios, ux, generate-view]
sprint: S7
commits: ["8437841"]
files_touched: 6
---

## Resumo (leigo)

A tela onde você gera o laudo era um bloco de texto único. Tudo num lugar só: o que você falou (os achados) e o laudo final misturados. Difícil saber o que ainda dava pra editar nos achados vs o que era pra revisar no laudo final.

Esta sprint separou as duas coisas em **abas**: "ACHADOS" (sua matéria-prima — o que você ditou) e "LAUDO" (o resultado final, pronto pra compartilhar). Você pode pular entre as abas, ajustar achados, regenerar o laudo, editar o laudo direto. Atalhos de teclado pra power-users.

Também ficou mais bonito: cores mais consistentes, melhor uso do espaço da tela, hierarquia visual clara.

## Detalhes (técnico)

`GenerateView` refatorada com `Picker(SegmentedStyle)` no topo, conteúdo condicional via `switch tab`. Editor inline no modo LAUDO usando `AttributedString` (sprint 5.1) + botão Editar/Visualizar.

Atalhos: ⌘1/⌘2 alternar abas, ⌘R regenerar, ⌘E entrar em edit mode. Indicador visual de modo (badge LIVE/IDLE) no header.

Streaming melhorado: status rotativo (10 mensagens × 1.4s, pausa na última), typing animation 3 chars × 8ms (sensação de fluência). Highlight roxo dos placeholders `____` durante streaming.

## Impacto & Próximos passos

Fluxo de geração muito mais claro. Próximos: melhoria de UX no streaming, signup completo e — mais à frente — Sprint 10 com auth E2E completa.
