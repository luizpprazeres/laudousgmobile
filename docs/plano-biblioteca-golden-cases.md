# Plano — Biblioteca de Golden Cases editáveis (web)

> **Status:** 🔵 PLANEJADO. Manter **"em breve"** na sidebar do gerador. **Decisão (Luiz,
> 2026-06-21):** planejar agora, **ativar depois** que os golden cases e os boletins diários
> estabilizarem — evita interferir com o pipeline de validação de qualidade.

## Visão
Transformar os **golden cases** (laudos validados, fonte de verdade dos boletins) em
**templates vivos**: o usuário abre o laudo de uma categoria e vê as partes determinísticas
(medidas, volumes, classificações) como **blocos nomeados/coloridos** no lugar dos valores —
ex., na tireoide, `[Lobo D: A×B×C]`, `[Volume LD]`, `[TI-RADS]`. Ele edita o esqueleto e gera
um laudo personalizado, partindo de um padrão-ouro.

## Por que é viável reusando o que já existe
- **`golden_cases`** (banco MOBILE) já tem o necessário: `expected_output` (o laudo gold),
  `expected_findings` (jsonb estruturado), `category_code`, `writing_style_id`, `status`.
  ⚠️ **Hoje está VAZIA (0 rows)** — a feature depende de populá-la com os casos validados.
- **`category_showcase_samples`** (27 rows) já guarda exemplos por categoria — candidata a
  fonte inicial / complemento (confirmar formato no S-da-Biblioteca).
- O **renderer determinístico** (`apps/api/.../renderer`) já monta laudo a partir de
  `StructuredFindings`, e os **placeholders/medidas** já são campos estruturados — os "blocos
  coloridos" da UI são exatamente os campos do formulário do gerador, mostrados in-line.

## Risco (levantado pelo Luiz) e mitigação
**Risco:** editar golden cases pode "quebrar os boletins diários" (que validam contra o gold).
**Mitigação — isolamento canônico × cópia:**
- O **golden case canônico** (o que os boletins validam) é **READ-ONLY**; a Biblioteca só *lê*.
- Ao editar, cria-se uma **cópia pessoal do usuário** numa tabela própria (`user_templates`)
  ou reaproveitando `web_reports` com flag de origem `template`. A cópia **nunca** toca o
  canônico. Edição do usuário e validação dos boletins ficam em trilhos separados → risco zero.

## Modelo de dados (proposta)
- `golden_cases` — **canônico, read-only** pela Biblioteca (já existe; popular).
- `user_templates` (novo) — cópia editável do usuário:
  `id, user_id, source_golden_id (fk, nullable), category_code, body_text, slots jsonb,
  created_at, updated_at` + RLS `*_own`. (Ou reusar `web_reports` com `kind = 'template'`.)

## UI (esboço)
- Em `/app/biblioteca`: grade por categoria → lista de golden cases (cards).
- Ao abrir um case: o laudo renderizado com os **slots determinísticos destacados** (chips
  coloridos editáveis: medida, volume, classificação). Editar um slot recompõe o texto.
- Ações: "Salvar como meu modelo" (→ `user_templates`), "Usar no gerador" (pré-preenche o
  formulário determinístico com os `expected_findings`).

## Faseamento (ativar depois)
1. Popular `golden_cases` (ou mapear `category_showcase_samples`) com os casos validados.
2. Página `/app/biblioteca` read-only: visualizar golden cases por categoria (sem edição).
3. Camada de slots editáveis + cópia do usuário (`user_templates` + RLS).
4. "Usar no gerador" (ponte com o formulário determinístico via `expected_findings`).
5. Ligar na rail (tirar "em breve") só quando 1–4 estáveis e os boletins não dependerem de
   nada que a Biblioteca toque.

## Por que "em breve" agora (concordo)
- Precisa do isolamento canônico↔cópia bem-feito.
- `golden_cases` está vazia e os boletins acabaram de sair dos P0 — gold ainda assentando.
- Editor de blocos merece design dedicado (não improvisar sobre o gerador atual).
