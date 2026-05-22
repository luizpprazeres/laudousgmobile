---
slug: sprint-2-e2e-abdome
title: "Primeira geração de laudo de verdade (Abdome Total)"
date: 2026-04-01
status: shipped
size: large
tags: [ios, rag, whisper, supabase, sse]
sprint: S2
files_touched: 25
---

## Resumo (leigo)

Marco zero do produto. Pela primeira vez, o app pegou um áudio do médico, transcreveu o que foi falado e devolveu um laudo escrito de verdade — não mais um exemplo congelado.

Funcionou pra categoria "Abdome Total". Você grava no celular, o áudio sobe pro servidor, é transcrito, processado por IA, e o laudo aparece na tela palavra por palavra, em tempo real (efeito de "máquina de escrever" inteligente).

A partir desta sprint, o produto deixou de ser maquete e virou ferramenta clínica utilizável.

## Detalhes (técnico)

End-to-end funcional: login Supabase real via REST + Whisper batch via `/api/transcribe` + SSE streaming via `/api/generate` + auto-save no histórico Supabase.

Pipeline: `Speech → Whisper (OpenAI) → Structurer (gpt-4.1-mini) → Writer (gpt-4.1-mini com RAG) → SSE eventos (structured/validator/rag/token/sanity/done)`.

Lição aprendida #1: `SFSpeechRecognizer` pt-BR falha no Simulator iOS 26 (`Failed to initialize recognizer`). Solução: Whisper batch como default permanente. Lição aprendida #2: Simulator não roteia mic do Mac por default — ativar `Device → Microphone → Internal Microphone`.

## Impacto & Próximos passos

Você consegue gerar um laudo de Abdome Total falando livremente no microfone. Próximo passo: estender pra outras categorias e adicionar verificação automática de erros (Sprint 3).
