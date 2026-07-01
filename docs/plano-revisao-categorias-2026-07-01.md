# Plano — Revisão ultrathink das categorias (qualidade & robustez do diagnóstico)

> **Data:** 2026-07-01. **Autor:** Claude. **Prioridade:** ALTA — *qualidade do laudo
> é a prioridade máxima do produto*.
> **Objetivo:** revisar TODAS as categorias com profundidade (ultrathink) para um
> **diagnóstico mais robusto**: quais têm renderer, a qualidade de cada um, o que falta,
> se falta alguma categoria, e os elementos determinísticos necessários por categoria.
> Fecha com a **categoria coringa (multi-laudo)**. Cruza com [[doutrina-msk]],
> `docs/plano-laudos-deterministicos.md` (DET-1..6) e `docs/plano-msk-2026-07-01.md`.

---

## 1) Matriz de categorias (estado real — banco + código, 2026-07-01)

33 categorias no banco (32 ativas). Renderer determinístico "programático" = monta o
laudo 100% em código a partir da extração (`RENDERER_PROGRAMMATIC_CATEGORIES`); só entra
em prod se estiver em `RENDERER_CATEGORIES` (flag). Volume = nº de laudos históricos.

> **CORREÇÃO 2026-07-01:** a fonte da verdade do `RENDERER_CATEGORIES` é o **Vercel
> (prod)**, NÃO o `.env` local (que tem só 10 e está defasado). Prod tem **13**:
> ABDOMEN_TOTAL, OBSTETRICA, MORFOLOGICO, TIREOIDE, MAMARIA, PARTES_MOLES, CERVICAL,
> ABDOMEN_SUPERIOR, PELVE_FEMININA, VIAS_URINARIAS, **MUSCULOESQUELETICO_V2,
> PROSTATA_SUPRAPUBICA, DOPPLER_OBSTETRICO**. Ou seja: NÃO há renderer "pronto e
> desligado" — os 3 que eu listava assim já estão ATIVOS.

### 1.A — Renderer determinístico ATIVO em prod (qualidade a auditar, não a criar)
| Categoria | Laudos | Nota |
|---|---|---|
| ABDOMEN_TOTAL | 769 | **bundle DET-1** (não programático — auditar à parte) |
| OBSTETRICA | 459 | programático |
| PELVE_FEMININA | 243 | programático (+ menopausa auto) |
| DOPPLER_OBSTETRICO | 232 | programático — **ATIVO ~2 dias** (gemelar → fallback writer) |
| MORFOLOGICO | 212 | programático |
| TIREOIDE | 212 | programático (istmo corrigido via ASR_CLINICAL) |
| MAMARIA | 156 | programático |
| CERVICAL | 57 | programático |
| MUSCULOESQUELETICO_V2 | 45 | programático — ATIVO; biblioteca de morfologia LIVE (PR #10) |
| PROSTATA_SUPRAPUBICA | 37 | programático — ATIVO |
| VIAS_URINARIAS | 25 | programático |
| PARTES_MOLES | 14 | programático (P1 boletim: eco cru — ver §3) |
| ABDOMEN_SUPERIOR | 5 | programático |

### 1.C — Volume relevante SEM renderer (writer LLM degradado) 🟠 — MAIOR GAP
| Categoria | Laudos | Observação |
|---|---|---|
| DOPPLER_RENAL | 57 | vascular; sem renderer |
| DOPPLER_VENOSO_MMII (TVP) | 37 | vascular; sem renderer |
| ESCROTAL | 22 | sem renderer |
| DOPPLER_ARTERIAL_MMII | 16 | vascular; sem renderer |
| DOPPLER_VENOSO_MMII_MEDIDAS | 7 | vascular; sem renderer |
| PAREDE_ABDOMINAL | 5 | snippets em curadoria |
| GLANDULAS_SALIVARES | 2 | — |
| DOPPLER_CAROTIDAS | 1 | vascular; snippets em curadoria |

> **Insight:** o maior buraco de qualidade é o **eixo vascular Doppler** (renal, venoso
> MMII, arterial MMII, carótidas) — somados >110 laudos sem renderer determinístico. É
> um family de laudos altamente estruturado (medidas, índices, lateralidade, segmentos)
> — candidato ideal a renderer, provavelmente com um **motor Doppler vascular comum**.

### 1.D — Zero volume (registradas / curadoria em curso) ⚪
ABDOMEN_TOTAL_DOPPLER, DOPPLER_ARTERIAL_MMSS, DOPPLER_VENOSO_MMSS, DOPPLER_FISTULA_AV,
OCULAR, PARATIREOIDE, PROSTATA_TRANSRETAL, QUADRIL_INFANTIL, REGIAO_INGUINAL, TORAX,
TRANSFONTANELA. (Vários têm snippets sendo adicionados — ver `packages/knowledge/snippets/`.)
MUSCULOESQUELETICO_RARAS: **desativada** (só sobra a V2).

## 2) Metodologia da revisão (ultrathink, por categoria)

Para CADA categoria com volume, produzir uma ficha auditando:

1. **Roteamento:** renderer programático? bundle? writer? Está na flag de prod?
2. **Cobertura:** todas as estruturas/segmentos do roteiro estão no schema? Falta campo?
3. **Corpo × Conclusão:** corpo = morfologia; conclusão = diagnóstico (nunca eco). [[doutrina-msk]]
4. **Elementos determinísticos:** medidas, unidades, lateralidade, índices (IR/IP/VPS/VDF),
   classificações (BI-RADS/TI-RADS/O-RADS/RSNA), datas, cálculos (volume, IG, peso fetal).
5. **Ditado só-diagnóstico:** o médico dita só o diagnóstico? Precisa de biblioteca de
   morfologia canônica (padrão MSK — ver `plano-msk-2026-07-01.md`)?
6. **Robustez de entrada:** garble ASR (ver flag `ASR_CLINICAL`), sinônimos, comando ecoado.
7. **Guards/sanity:** placeholders vazios, valores impossíveis, dedup de conclusão.
8. **Golden:** existe suíte de regressão? Byte-stability? Casos adversariais?
9. **Fidelidade "never-block":** categoria sem renderer nunca deve bloquear (fallback).

**Entregável por categoria:** ficha + lista priorizada de correções (P0–P3).
**Entregável macro:** ranking de impacto = volume × severidade dos defeitos.

## 3) Achados já conhecidos (entram na revisão)
- **PARTES_MOLES** (P1 boletim): extração não classifica a lesão → renderer ecoa cru.
  Raiz = prompt de extração / falta schema estruturado do achado.
- **TIREOIDE**: TI-RADS aplicado só ao nódulo com ecogenicidade ditada (médico quer nos 2);
  alteração ecotextural omitida. + istmo (resolvido via `ASR_CLINICAL`).
- **MSK**: ditado só-diagnóstico → corpo ecoava diagnóstico. **RESOLVIDO + LIVE** (PR #10,
  biblioteca de morfologia) — MSK_V2 já estava ATIVO em prod. Ver `plano-msk-2026-07-01.md`.
- **Fallback genérico gpt-5 nunca codado** (`/api/generate`): categorias sem renderer podem
  retornar `blocked` — implementar estrutura COMENTÁRIOS/ASPECTOS/CONCLUSÃO de segurança.
  (Ver P5.A de `plano-acao-boletins-2026-06-29.md`.)

## 4) Fila proposta (por impacto) — CORRIGIDA (os 13 renderers JÁ estão ativos)
1. **Motor Doppler vascular** (renal 57 / venoso MMII 37 / arterial MMII 16 / carótidas) —
   **o maior gap real**: são o family de maior volume SEM renderer determinístico.
2. **Auditoria das 13 já ativas** — fichas §2. Prioridade por volume: ABDOMEN_TOTAL (769),
   OBSTETRICA (459), PELVE (243), DOPPLER_OBSTETRICO (232)… achar defeitos silenciosos.
3. **ESCROTAL** — renderer (22, sem renderer).
4. **MSK** — expandir biblioteca (~30–40 achados) + roteiro (punho/cotovelo/tornozelo/quadril).
5. **Fallback genérico never-block** (transversal — categorias sem renderer não bloqueiam).

---

## 5) Categoria CORINGA — multi-laudo simultâneo (orb multicolor)

> **Status:** já registrada (P5.C de `plano-acao-boletins-2026-06-29.md` + memória
> [[boletim-semantica-colunas]]). Aqui a **visão completa** (detalhada pelo Luiz).

**Ideia:** uma categoria "coringa" (ícone/orb **multicolorido**, distinta das categorias
normais) em que o médico faz **vários exames do MESMO paciente de uma vez** — ex.: abdome
total + tireoide com doppler + pelve + joelho — ditando tudo em sequência. O sistema:
1. **Segmenta** o ditado em exames ("1º US obstétrica… próximo joelho direito…").
2. **Identifica cada categoria** (RAG simples / classificador) — sem o médico selecionar modelo.
3. **Levanta os elementos determinísticos** necessários de cada categoria (schema, medidas,
   índices, classificações) — RAG dos contratos/roteiros por categoria.
4. **Gera todos os laudos de uma vez**, cada um pelo seu renderer determinístico, encadeados
   num único output (um laudo por exame).

**Por que é forte:** casa perfeitamente com o fluxo real (paciente faz vários USs na mesma
visita) e reusa 100% os renderers determinísticos por categoria — o coringa é o
**orquestrador** (segmenta + roteia), não um novo motor de redação.

**Dependências:** quanto mais categorias tiverem renderer robusto (§4), melhor o coringa —
por isso a revisão de categorias vem ANTES. Segmentação/roteamento reusa o classificador de
categoria já existente + o "never-block" para exames sem renderer.

**Decisão do Luiz:** planejar agora; **implementar DEPOIS** das correções de qualidade.
UI: orb multicolor (não o verde/amarelo/vermelho das categorias comuns).

**Esboço de arquitetura (a detalhar):**
- `segmentarExames(ditado) → [{categoria, trecho}]` (LLM classificador + âncoras "próximo/agora").
- Para cada segmento: pipeline de geração normal da categoria (extração → renderer).
- Concatenar com cabeçalhos por exame; um `report` por exame ou um agregado (decisão de dados).
- Telemetria: uso do coringa, categorias detectadas, taxa de acerto de segmentação.
