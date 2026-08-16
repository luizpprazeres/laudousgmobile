# Técnica do exame — fidelidade à via realmente realizada

**Data:** 2026-08-14
**Origem:** Luiz — *"realmente é um problema que tem acontecido"*
**Escopo:** transversal — pelve, obstétrico, morfológico, Doppler

---

## O problema

O bloco **COMENTÁRIOS / TÉCNICA** afirma como o exame foi feito. Hoje ele é **texto fixo por categoria**, então pode afirmar uma técnica que não foi realizada.

> Afirmar técnica não realizada é falha de veracidade do documento — não é detalhe de redação.

### Estado por categoria

| Categoria | Campo de via | Comportamento hoje | Risco |
|---|---|---|---|
| `PELVE_FEMININA` | `via: "ta" \| "tv" \| "ta_tv" \| "pos_abortamento"` | `resolveVia(null) → "ta_tv"` (`:446`) | **afirma a via mais completa quando não sabe** |
| `CERVICOMETRIA` | — | fixo *"pela técnica transvaginal"* (`:128`) | ok — é sempre TV |
| `OBSTETRICA` | **nenhum** | preâmbulo fixo: *"múltiplos cortes, abrangendo todo o **abdome da gestante**"* | afirma transabdominal **sempre** |
| `MORFOLOGICO` | **nenhum** (zero ocorrências de "via") | idem | idem |
| `DOPPLER_OBSTETRICO` | **nenhum** (herda o obstétrico) | idem | idem |

**Casos reais que quebram hoje:**
- gestação inicial avaliada por **via transvaginal** → o laudo diz "abdome da gestante"
- obstétrico com **cervicometria transvaginal complementar** → a técnica não menciona a TV
- pelve **só transabdominal** sem a via ditada → o laudo afirma TA **+** TV

---

## O vocabulário (Luiz, 14/08)

> *"só transvaginal, só transabdominal, ambos, no abdome da pelve ou da gestante"*

Dois eixos — e a lição dos eixos ortogonais vale de novo:

| Eixo | Valores | Origem |
|---|---|---|
| **Via** | `transabdominal` · `transvaginal` · `ambas` | **ditado** |
| **Sujeito do abdome** | pelve · gestante | **categoria**, não ditado |

O sujeito não é um campo: decorre da categoria. *"abdome da pelve"* e *"abdome da gestante"* são a **mesma via**, com sujeito diferente.

> `pos_abortamento` da pelve **não é via** — é indicação clínica (apontado pelo Codex). O enum atual mistura técnica e protocolo. Separar é pré-requisito para unificar o vocabulário.

---

## Desenho — em duas camadas

### Camada 1 · guard de fidelidade *(transversal, começa aqui)*

Um guard determinístico, no padrão da casa (`amnioticFluidGuard`, `volumeGuard`), que **compara o ditado com a técnica afirmada** e sinaliza a contradição.

**Modo "só-sinaliza"** na v1 — mesmo padrão do guard de BI-RADS. Reescrever a técnica exige conhecer a redação de cada categoria; **detectar a mentira não exige.**

```
ditado menciona transvaginal  +  técnica afirma só transabdominal   → [REVISAR]
ditado menciona só transabdominal  +  técnica afirma TA + TV        → [REVISAR]
```

Vantagens: funciona **independente da categoria** (opera sobre texto + ditado), não muda laudo nenhum hoje, e mede o tamanho real do problema antes de qualquer correção automática.

### Camada 2 · via como fato compartilhado *(depois)*

`via_exame` entra no schema das categorias obstétricas (hoje inexistente) e a técnica passa a ser **derivada**, não fixa. A pelve migra do enum atual para via + indicação separadas.

Encaixa na arquitetura de módulos do Codex: a via é um fato do **plano de exame**, não da categoria.

---

## Política de ausência — decisão pendente

Quando a via **não foi ditada**:

| Opção | |
|---|---|
| **a** | manter o default da categoria, mas o guard registra a ausência (telemetria) |
| **b** | nunca assumir — `[REVISAR: via não informada]` |
| **c** | default por categoria, exceto quando o ditado **contradiz** |

> Precedente: no `orificio_interno_fechado` o Luiz aceitou o default *"a maioria está fechado"*. Aqui ele sinalizou que a fidelidade importa mais. **A opção (c) é a que respeita as duas coisas** — não enche o laudo de `[REVISAR]`, e pega a contradição, que é o caso que dói.

---

## Sequência

| # | Passo |
|---|---|
| 1 | Guard só-sinaliza + testes *(esta sessão)* |
| 2 | Medir em produção: quantos laudos contradizem | 
| 3 | Decidir a política de ausência com o dado na mão |
| 4 | `via_exame` como fato compartilhado; técnica derivada |
| 5 | Separar `pos_abortamento` de via, na pelve |
