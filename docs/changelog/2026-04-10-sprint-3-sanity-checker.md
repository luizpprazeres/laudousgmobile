---
slug: sprint-3-sanity-checker
title: "Histórico real e Sanity Checker (verificador) sem IA"
date: 2026-04-10
status: shipped
size: medium
tags: [ios, supabase, sanity, lgpd]
sprint: S3
related_adrs: [0001]
files_touched: 14
---

## Resumo (leigo)

Duas conquistas grandes nesta sprint:

Primeiro, os laudos passaram a ficar salvos de verdade no seu histórico (antes era mockado). Você consegue voltar lá depois, editar texto, e a alteração salva automaticamente, sem botão de "salvar".

Segundo — e mais importante — criamos um "verificador automático" que olha pra cada laudo antes de você compartilhar e aponta erros bobos que escapariam (medidas inconsistentes, idade gestacional errada, etc). Esse verificador funciona inteiramente no seu celular, sem chamar nenhuma IA, sem mandar dados pra fora. É instantâneo e a prova de falha de conexão.

## Detalhes (técnico)

`HistoryView` lê de Supabase via `SupabaseRESTClient` (REST puro, sem SDK). Edição inline com auto-save (`onChange` + debounce 300ms). `SettingsView` com style picker (3 opções fixas: Tradicional, Estruturado, Livre).

`SanityChecker.swift` implementado como `enum` stateless com 4 regras client-side, **100% síncrono, ZERO IA** (decisão trancada — viraria ADR-0001 §6 mais tarde). Regras: medidas inconsistentes, IG vs DUM, formato de números, vocabulário forbidden.

LGPD compliance: zero dados sensíveis de paciente no banco. Imagem nunca é armazenada. `SanityIssue` Zod schema com `.nullish()` (não `.optional()`) pra tolerar campos null vindos do backend.

## Impacto & Próximos passos

Histórico utilizável + segurança extra antes de você compartilhar um laudo. Próximas sprints: editor visual WYSIWYG (negrito/itálico) e Sala do Auxiliar pra atendimento em dupla.
