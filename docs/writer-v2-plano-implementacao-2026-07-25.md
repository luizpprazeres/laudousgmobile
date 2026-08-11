# Plano de implementação — Writer V2 (arquitetura convergida)

**25/07/2026.** Implementa a arquitetura de `docs/writer-v2-arquitetura-convergida-2026-07-25.md`: inteligência no **spec editável** + no **código (montagem + auditoria)**, 5 camadas, protótipo no **abdome**, tudo **flag OFF** e medido contra o **gabarito do renderer**. Nada migra antes de empatar/superar o renderer nos casos que ele domina.

> Princípios de execução: (1) nada em produção sem flag; (2) cada fase é testável isoladamente contra o gabarito; (3) o renderer continua sendo produção; (4) uma variável por vez; (5) reusar o que existe (renderer→montagem, snippets→dicionário, ReportOperation[]→plano, status draft/published→versão, toggle difícil→escalada).

## Visão do fluxo (runtime, caso comum = 1 chamada)
```
ditado cru
  └─ (LLM, 1 chamada) → PLANO DE EDIÇÃO estruturado (patches sobre os slots do base)
        └─ (código) montagem determinística → laudo
        └─ (código) auditoria de fidelidade → divergências?
              ├─ não → laudo final
              └─ sim → (LLM, ≤1 reparo dirigido) → re-auditoria → laudo final
```

## Camadas e artefatos
| Camada | Artefato | Onde | Inteligência |
|---|---|---|---|
| 1. Spec pessoal | `ReportSpec` (base por slots + dicionário achado→frase + contrato) | dado (TS/Zod agora; DB depois) | dado |
| 2. Chamada semântica | prompt (universalCoreV2 já existe) → `EditPlan` (structured output) | `apps/api/src/server/pipeline/writerV2/` | LLM |
| 3. Montagem + auditoria | `assemble(spec, plan)` + `auditFidelity(ditado, laudo, plan)` | TS puro | código |
| 4. Reparo condicional | `repair(divergencias)` ≤1 chamada | LLM | LLM |
| 5. Flywheel | minerar histórico → propor spec → aprovar | offline | dado+curadoria |

## Progresso (25/07, sessão autônoma)
- ✅ **Fase 0** schemas (`writerV2/types.ts` — ReportSpec/EditPlan/Divergencia Zod).
- ✅ **Fase 1** spec do abdome (Dex2 → `writerV2/specs/abdomenTotal.json`, revisado).
- ✅ **Fase 2** motor determinístico (`assemble.ts` + `audit.ts`, teste PASS).
- ✅ **Fase 3** chamada semântica (`generatePlan.ts`, structured output) — harness 12 cenários: **~10/12 idêntico ao gabarito**; V2 cumpre o pedido de ajuste que o renderer ignora; auditoria pega omissão de medidas.
- ✅ **Fase 4** reparo condicional + orquestrador (`repairPlanV2` + `runWriterV2.ts`) — cenário de medidas omitidas: reparou e zerou a auditoria.
- ⏳ **Fase 5** wiring (writerProfile=v2) — próximo, toca `/api/generate`. **Aguarda decisão do Luiz** (mecanismo de opt-in).
- Tudo **INERTE / flag OFF**; nada tocou o caminho de produção.

## Fases

### Fase 0 — Schemas (fundação, sem runtime)
- `ReportSpec` (Zod): `base: SlotDoc` (seções → slots com **id estável**: `titulo`, `comentarios`, `figado`, `vesicula`, `vias_biliares`, `pancreas`, `baco`, `rim_dir`, `rim_esq`, `aorta`, `bexiga`, `conclusao`), cada slot com `frase_normal`, `obrigatorio?: bool`, `placeholder?: bool`; `dictionary: FindingPhrase[]` (gatilho → frase de corpo + frase de conclusão + termos); `contract` (título, numeração, terminologia, fechamento).
- `EditPlan` (Zod, structured output do LLM): lista de operações tipadas sobre slots: `replaceSlot{slotId, texto}`, `appendFinding{slotId, corpo}`, `setConclusion{itens[]}`, `keepNormal{slotId}`, `placeholder{campo}`. Reaproveitar o vocabulário de `ReportOperation[]` (edição incremental A1).
- Saída: só tipos + testes de schema. **Zero impacto.**

### Fase 1 — Spec do ABDOME (bootstrap) 🔵 Dex2
- Estruturar o base do abdome em slots (do `ABDOMEN_TOTAL_MODELO_BASE`) + o dicionário achado→frase (das snippets `ABDOMEN_TOTAL/conclusao/*` + `regra/*`) + contrato.
- **Delegar ao Dex2 (gpt-5.6 sol high)** — melhor desempenho nessa curadoria estruturada. Claude revisa contra o gabarito.

### Fase 2 — Motor determinístico (montagem + auditoria) 🔵 Dex1
- `assemble(spec, plan) → laudo`: aplica o plano; preserva slots não editados VERBATIM; numeração/fechamento por construção; nunca deixa `____` fora de campo obrigatório.
- `auditFidelity(ditadoCru, laudo, plan) → Divergencia[]`: extrai átomos do ditado (medidas+unidade, lados, negações, datas) por parser determinístico e confere presença/igualdade no laudo; confere placeholders obrigatórios. **Spec-aware, nunca hardcode de estilo.**
- **Delegar ao Dex1** (código longo, testável). Unit tests com os 12 cenários. **Sem LLM nesta fase.**

### Fase 3 — Chamada semântica (ditado → EditPlan)
- Prompt = `UNIVERSAL_CORE_V2` + spec do abdome → structured output `EditPlan` (strict). Modelo gpt-5.4-mini.
- Harness: rodar Fase 3+2 nos 12 cenários, comparar laudo montado × gabarito.

### Fase 4 — Reparo condicional
- Se `auditFidelity` acusa divergência → 1 chamada dirigida (só o ponto). Re-auditar. Máx 1.

### Fase 5 — Wiring flag-gated (writerProfile=v2 sobre ABDOMEN_TOTAL)
- **NÃO criar categoria nova** (perde sanity/contrato — review Dex2). Um `writerProfile=v2` no ABDOMEN_TOTAL, flag `WRITER_V2_ABDOME=false`. Requisição opt-in privada.
- Critério de avanço: empatar/superar o renderer no corpus (checklist R1–R12 de `writer-v2-criterios-regressao`).

### Fase 6 — Biblioteca editável + governança (multi-tenant, FUTURO)
- Spec por (médico × categoria) no DB: oficial imutável + fork pessoal editável, `draft/published/archived`, histórico, restaurar padrão, lixeira. Writer usa só `published`.
- É a "Biblioteca" da web/apps (liga com Frente 5).

### Fase 7 — Flywheel curado (FUTURO)
- Minerar `final_output` histórico do médico → propor frases/edições do spec → **aprovação explícita** → publica. Nunca automático.

## Marcos de decisão (gates do Luiz)
- Após Fase 3: ver o V2-montado × gabarito nos 12 cenários (HTML). Decide seguir.
- Após Fase 5: A/B no app (abdome), flag OFF, só o Luiz na variante. Decide expandir a outras categorias.

## Sequenciamento
Fase 0 → (1 Dex2 ∥ 2 Dex1) → 3 → 4 → 5 → [gate] → 6/7 futuras. Fases 1 e 2 em paralelo. Estimativa de esforço concentrado nas Fases 2–3 (o motor + o prompt de plano).
