# Planejamento de Sprints — 2026-06-14 (dia intenso, ~6×30min)

> **Objetivo do dia:** qualquer usuário consegue fazer os laudos **de uso real**
> com segurança e sem erros, nos **2 estilos (Clássico + Objetivo)**. Em cada
> sprint, **alimentar `docs/catalogo-clinico-exames.md`** (base da versão web
> SEM IA) com a categoria trabalhada.
> **Método por sprint:** implementar/curar → boletim determinístico OU showcase →
> revisão clínica do Luiz → golden → (deploy quando aprovado) → atualizar catálogo.

## Estado real (por volume de uso — `reports`)

| Categoria | Laudos | Clássico | Objetivo | Caminho | Situação |
|---|--:|:--:|:--:|---|---|
| ABDOMEN_TOTAL | 744 | ✅ | ⚠️ | renderer | clássico LIVE; objetivo via template a validar |
| OBSTETRICA | 402 | ✅ | ⬜ | renderer | clássico LIVE; **objetivo ONDA 2** |
| PELVE_FEMININA | 221 | ✅(4 var) | parcial | writer | migrar p/ renderer; objetivo incompleto |
| TIREOIDE | 207 | ✅ | ⬜ | renderer | clássico LIVE; **objetivo ONDA 2** |
| MORFOLOGICO | 195 | ✅ | ⬜ | renderer | clássico LIVE; **objetivo ONDA 2** |
| DOPPLER_OBSTETRICO | 181 | ✅ | ⬜ | writer | **falta objetivo** |
| MAMARIA | 149 | ✅ | ⬜ | renderer | clássico LIVE (hoje); **objetivo ONDA 2** |
| DOPPLER_RENAL | 57 | ✅ | ✅ | writer | validar 2 estilos |
| CERVICAL | 57 | ✅ | ✅ | writer | validar |
| DOPPLER_VENOSO_MMII | 37 | ✅ | ✅ | writer | validar |
| PROSTATA_SUPRAPUBICA | 32 | ✅ | ✅ | writer | validar; candidata a renderer (volume) |
| MUSCULOESQUELETICO_V2 | 29 | ✅ | ✅ | writer | validar (renomear p/ MUSCULOESQUELETICO) |
| ESCROTAL | 20 | ✅ | ⬜ | writer | **falta objetivo** |
| VIAS_URINARIAS | 18 | ✅ | ⬜ | writer | **falta objetivo** |
| DOPPLER_ARTERIAL_MMII | 16 | ✅ | ✅ | writer | validar (rework B3) |
| PARTES_MOLES | 13 | ✅ | ✅ | writer | validar |
| DOPPLER_VENOSO_MMII_MEDIDAS | 7 | ✅ | ✅ | writer | validar |
| ABDOMEN_SUPERIOR | 4 | ✅ | ✅ | writer | validar (lógica vesícula) |
| GLANDULAS_SALIVARES | 2 | ✅ | ✅ | writer | validar |

**Órfãs (0 uso — backlog, fora do dia):** ABDOMEN_TOTAL_DOPPLER (é variante do renderer),
DOPPLER_CAROTIDAS, DOPPLER_FISTULA_AV, DOPPLER_ARTERIAL_MMSS, DOPPLER_VENOSO_MMSS,
OCULAR, PARATIREOIDE, PAREDE_ABDOMINAL, PROSTATA_TRANSRETAL, QUADRIL_INFANTIL,
REGIAO_INGUINAL, TORAX, TRANSFONTANELA, MUSCULOESQUELETICO_RARAS. (Criar sob demanda.)

## Gap central
O **estilo OBJETIVO no renderer** ainda não existe (ONDA 2) — bloqueia as 5
categorias renderer de altíssimo uso (ABDOMEN, OBSTETRICA, TIREOIDE, MORFOLOGICO,
MAMARIA = **1.697 laudos / ~70% do uso**). Destravar isso é o maior ROI do dia.

## Os 6 sprints

### Sprint 1 — Infra OBJETIVO no renderer + TIREOIDE objetivo (piloto)
- Passar `writing_style` ao `runRendererStream`/render; cada `render<CAT>` ganha
  modo objetivo (formato enxuto TÉCNICA/ACHADOS/CONCLUSÃO ou conforme Luiz).
- Piloto TIREOIDE: definir frases objetivas + boletim → revisão → golden.
- Destrava o padrão para as demais renderer.

### Sprint 2 — OBSTETRICA + MORFOLOGICO objetivo (renderer)
- Aplica o modo objetivo (alto uso). Boletim por trimestre/gemelar → revisão → golden.

### Sprint 3 — ABDOMEN_TOTAL + MAMARIA objetivo (renderer)
- Fecha as **5 renderer nos 2 estilos**. Boletim → revisão → golden.

### Sprint 4 — PELVE_FEMININA (clássico 4 variantes + objetivo)
- 3ª maior (221). Validar/migrar p/ renderer; completar objetivo; tratar "A)" já feito.
- Boletim das variantes (TA, TV, TA+TV, pós-abortamento) → revisão → golden.

### Sprint 5 — DOPPLER de alto uso (OBSTETRICO + RENAL + VENOSO)
- DOPPLER_OBSTETRICO: criar estilo objetivo (só tem clássico). Validar percentis (A2/IG).
- DOPPLER_RENAL + DOPPLER_VENOSO_MMII: validar 2 estilos. Showcase → revisão.

### Sprint 6 — Lote writer médio uso
- CERVICAL, PROSTATA_SUPRAPUBICA, MUSCULOESQUELETICO_V2, PARTES_MOLES,
  ABDOMEN_SUPERIOR, GLANDULAS_SALIVARES: validar 2 estilos.
- ESCROTAL + VIAS_URINARIAS + DOPPLER_ARTERIAL_MMII: **criar objetivo** onde falta.
- Curadoria rápida no showcase → revisão em lote.

## Regra fixa de cada sprint
1. Atualizar `docs/catalogo-clinico-exames.md` (seção da categoria + tabela "Estado").
2. Golden onde aplicável (render local) ou asserções de proibição (writer).
3. Deploy via fluxo @devops quando o Luiz aprovar.

## Realismo
Os 6 sprints cobrem as ~19 categorias de **uso real (≈99% dos laudos)** nos 2
estilos. As órfãs (0 uso) ficam para depois. "Qualquer usuário com segurança" =
atendido pelas de uso real.
