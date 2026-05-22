---
slug: sprint-5-1-wysiwyg
title: "Editor de laudo com formatação visual"
date: 2026-05-04
status: shipped
size: medium
tags: [ios, editor, attributed-string]
sprint: S5.1
commits: ["b3951f7"]
files_touched: 8
---

## Resumo (leigo)

Antes desta sprint, quando o laudo aparecia na tela, ele saía como texto cru — sem negrito, sem itálico, sem destaque. Pra você marcar visualmente alguma coisa, precisava colocar asteriscos no meio do texto (estilo programador). Não era prático nem bonito.

Agora o laudo aparece já formatado: negritos em negrito de verdade, itálicos inclinados, títulos maiores. Você vê o resultado final enquanto está editando — exatamente como num editor de texto comum. WYSIWYG (What You See Is What You Get — "o que você vê é o que você ganha").

## Detalhes (técnico)

Substituído `TextEditor` puro por `AttributedString` (iOS 17+) renderizada via `Text(AttributedString)`. Parser markdown leve converte `**negrito**` / `*itálico*` / `# heading` em runs com atributos visuais.

Modo dual de visualização: `Text(AttributedString)` read-only por default + botão "Editar" que troca temporariamente pra `TextEditor` em modo raw. Save volta pra view formatada.

Decisão: não usar SwiftUI markdown built-in (limitado a `LocalizedStringKey`, não suporta edição). Implementação custom no `LaudoFormatter.swift`.

## Impacto & Próximos passos

Laudos ficam visualmente mais profissionais e fáceis de ler. Próximos passos: Sala do Auxiliar (sprint 6) e redesign do fluxo principal de geração (sprint 7).
