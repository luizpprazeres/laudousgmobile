---
slug: p7c-changelog-editorial
title: "Changelog editorial multi-audiência"
date: 2026-05-22
status: in-progress
size: medium
tags: [lab, changelog, docs, transparency]
sprint: P7.C
files_touched: 12
---

## Resumo (leigo)

Esta é a página em que você está agora. Conforme o app cresce em ritmo acelerado (várias mudanças por dia), fica difícil acompanhar tudo de cabeça. A solução foi criar um diário estruturado das mudanças.

A novidade aqui: cada marco tem **3 vistas**: técnica (pra entender o código), médica (pra explicar pros colegas de profissão) e negócio (pra resumir pra investidores ou reguladores em uma linguagem mais alto-nível). Mesma data, mesmo evento, 3 traduções — você escolhe qual lente ler.

A ideia é que no futuro próximo isso vire uma página pública (talvez em `roadmap.laudousg.com`), permitindo que médicos beta-testers e investidores acompanhem o progresso sem que você precise escrever email/post pra cada um.

## Detalhes (técnico)

Schema: `docs/changelog/{YYYY-MM-DD}-{slug}.md` com frontmatter padronizado (slug, title, date, status, size, tags, sprint, related_adrs, commits, files_touched).

Body em 3 seções: `## Resumo (leigo)` + `## Detalhes (técnico)` + `## Impacto & Próximos passos`. Plain markdown — fácil de versionar, diffável no git, sem dependência de banco.

P7.C.1 (esta sprint) popula 10 marcos retroativos cobrindo Sprint 0 a 10 + P3 + P4 + P7 + P7.C. P7.C.2 (próxima) implementa UI no Lab: rota `/changelog` com hero stats + timeline reverse-chrono (estilo Linear changelog) + filtros (status/audience/tag/date). `/changelog/[slug]` com hero + toggle de 3 abas de audiência.

Leitura do filesystem em build time (RSC) — sem dependência de DB. P7.C.3 (futuro opcional) automatiza geração de draft a partir de `git log` entre datas.

## Impacto & Próximos passos

Você (Luiz) recupera contexto rápido. Próximo passo direto: P7.C.2 — UI no Lab com timeline interativa. Depois (P9+): expor versão pública filtrada por audience.
