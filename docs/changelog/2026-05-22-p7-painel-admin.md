---
slug: p7-painel-admin
title: "LaudoUSG.lab — Painel Admin de calibração do RAG"
date: 2026-05-22
status: in-progress
size: epic
tags: [lab, ui, observability, nextjs, rag]
sprint: P7
related_adrs: [0001, 0002]
files_touched: 60
---

## Resumo (leigo)

Esta é uma página web separada do app, num endereço novo: `lab.laudousg.com`. Não é pro paciente nem pro médico do dia-a-dia — é pra você (administrador) entender, ajustar e melhorar a qualidade dos laudos que a IA gera.

São 5 telas:

1. **Dashboard** — visão geral: quantos laudos hoje, quais categorias estão saudáveis, atividade recente
2. **Testbench** — laboratório de testes: você cola um exemplo de ditado, clica "Gerar laudo" e vê na hora o resultado + de quais "pedaços de RAG" cada parte do laudo veio
3. **Audit** — trilha forense: lista de todas as gerações dos últimos 7 dias com filtros e detalhes
4. **Editor de Blocks** — onde você edita as regras e modelos sem precisar mexer em código
5. **Reviewer** — análise profunda de UM laudo: cobertura, sugestões automáticas, links pra editar a regra que entrou

Por que isso importa: até agora, ajustar a IA dependia de você mandar mensagens pro Claude/dex1 ("ó, essa regra tá errada"). Com o Lab, você ajusta sozinho, vê o impacto na hora, e iteração fica 10x mais rápida.

## Detalhes (técnico)

Novo app no monorepo: `apps/lab/` (Next.js 15 + Tailwind 3.4 + Supabase auth + workspace deps).

Stack frontend: React 18.3, `next/font` (Inter + Barlow + JetBrains Mono), CodeMirror 6 (markdown lang), lucide-react icons. Server Components por default, Client Components escopados (HoverContext pra cross-pane links no Testbench).

Componentes reusáveis criados que vão escalar pra outras telas: `PriorityChip`, `SimilarityBar`, `StatPill`, `StatusIcon`, `CompactBlockList`, `Trecho`/`TrechoTiered`, `HoverProvider`.

Fluxo de implementação: `/frontend-design` skill gerou 5 mockups HTML standalone → c1 portou JSX fiel ao mockup → dex1 review do Dashboard (5 fixes aplicados: rota `/settings`, a11y sidebar, botões fantasma disabled, Sparkline useId).

Build verde em todas as 9 rotas estáticas + middleware 32kB. **Falta**: conectar dados reais (SSE proxy `/api/testbench/run`, Supabase queries no Audit, filesystem read no Editor + decisão local-only vs GitHub API) e deploy Vercel + DNS `lab.laudousg.com`.

## Impacto & Próximos passos

Hoje: 5 telas visuais navegáveis em `localhost:3001`, fiéis ao mockup, com dados mock realistas e interações funcionais (hover-link, seleção, dirty state no editor).

Próximas fases (P7.5.B → P7.7): plugar dados reais, deploy lab.laudousg.com, autenticação magic link. Em paralelo: P7.C (Changelog) sendo construído agora.
