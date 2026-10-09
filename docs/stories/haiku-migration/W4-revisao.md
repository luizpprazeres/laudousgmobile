# W4 — Revisão por bancada: renderers determinísticos e prompts de base (PRIORIDADE ALTA)

Terminal: Claude Code Opus 5.5 · Worktree `~/laudousg-wt/revisao` · Branch `chore/revisao-bancada`
Leia antes: `_comum.md`, a story e `docs/estilo-casa-regras-gerais.md`.

## Objetivo

Com o método da bancada (laudos reais × laudo final assinado, Haiku 5.5 pela assinatura, juiz Opus 5.5 cego com as
regras da casa, **conferência manual da origem de cada erro grave**), produzir **propostas priorizadas** de melhoria
nos renderers determinísticos e nos prompts de base, e a evidência para o roteamento por categoria.
Você **não altera código de produção** — só a bancada e os documentos.

## Escopo (90 dias, categorias com ≥ 3 laudos finais; confira os números no banco)

MUSCULOESQUELETICO_V2, MAMARIA, PELVE_FEMININA, TIREOIDE, PAREDE_ABDOMINAL, ESCROTAL, VIAS_URINARIAS, CERVICAL,
PROSTATA_SUPRAPUBICA, DOPPLER_CAROTIDAS, ABDOMEN_SUPERIOR, PARTES_MOLES (+ quaisquer outras com casos suficientes).
Abdome total e obstétrico já foram feitos em 09/10 (rodadas em `tmp-review/bench-haiku/` do repositório principal) —
use como referência e não refaça.

Para cada categoria, cenários `R` (produção com código de hoje), `A` (Haiku extrai + caminho atual) e `B2` (Haiku
escreve tudo com o prompt "corpo descritivo"). **PELVE_FEMININA é pedido explícito do Luiz:** comparação cuidadosa
Haiku + renderer × só writer Haiku, com recomendação.

## Preparação da bancada

- Generalize o que faltar (hoje ela conhece os guards obstétricos e do abdome). Categorias com writer dedicado
  dentro do caminho do renderer (MSK_WRITER, PELVE_WRITER, PARTES_MOLES_WRITER) dependem de flags de produção que estão
  como Sensitive na Vercel: descubra os valores pelo `generation_audit` (texto do system, modelo) e pelas memórias/docs, e
  **prove com o replay** (`R` deve reproduzir o `generated_output`; diferenças só por mudança de código datada).
- Judge: acrescente às regras do juiz o que for específico da categoria (ex. TI-RADS/ACR, BI-RADS, lateralidade MSK,
  Doppler) a partir dos contratos em `apps/api/src/server/prompts/contracts/` e de `docs/estilo-casa-regras-gerais.md`.
- Assinatura tem limite de uso: rode uma categoria por vez, concorrência 3–4.

## Para cada erro grave (nota ≤ 4 ou omissão/invenção clínica)

Classifique a **origem** com evidência (`calls.jsonl` + código, `arquivo:linha`): extração (prompt de extração / schema),
renderer (frase/regra), prompt do writer (global/contrato/bundle), guard, ou artefato da bancada. Não aceite a palavra do juiz.

## Entregáveis

1. `docs/reviews/2026-10-revisao-renderers-prompts.md` (commitado): por categoria — números (R/A/B2), recomendação de
   roteamento, defeitos confirmados com `arquivo:linha` e proposta de correção (diff sugerido quando curto), problemas
   de prompt base; ao fim, **lista única priorizada** (impacto clínico × frequência × esforço).
2. HTML local por rodada (`relatorio.py`), sem dados versionados.
3. Commits da bancada generalizada em `chore/revisao-bancada`.

## Fora do escopo

Qualquer arquivo de produção em `apps/api/src`, `apps/web`, `apps/mobile`, `packages/` (só leitura).
