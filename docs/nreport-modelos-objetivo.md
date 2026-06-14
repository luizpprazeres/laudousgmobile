# Modelos objetivo (nReport) — referência para o renderer estilo OBJETIVO

> Capturado do nReport (app-nreport.ionic.health) via Playwright, 2026-06-14.
> Fonte do **estilo OBJETIVO** do renderer. Estrutura do nReport: **TÉCNICA /
> ANÁLISE / OPINIÃO** (≠ Clássico que usa COMENTÁRIOS / OS SEGUINTES ASPECTOS /
> CONCLUSÃO). Captura incremental por categoria conforme os sprints.

## ⚠️ Decisões pendentes (Luiz)
1. **Nomenclatura das seções:** nReport usa `TÉCNICA / ANÁLISE / OPINIÃO`; o Luiz
   havia dito `TÉCNICA / ACHADOS / IMPRESSÃO`. Definir qual padronizar.
2. **Escore de nódulo tireoidiano:** nReport usa **TI-RADS (ACR)**; o renderer
   CLÁSSICO usa **escore de Domingos**. No OBJETIVO: TI-RADS, Domingos, ou ambos?

---

## TIREOIDE — objetivo (nReport)

### Estrutura / painéis da UI (campos do "modelo web sem IA")
- Estado glândula: **Normal | Tireoidopatia | Tireoidectomia**
- Medidas por **Lobo direito / Lobo esquerdo / Istmo** (3 medidas cada) + **Volume** (mm³) + **Volume total**
- Achados: **CISTO**, **NÓDULO** (com **MEDIDA**, **PUNÇÃO**, **TI-RADS**)
- **LINFONODOMEGALIAS** (Linfonodomegalia / Linfonodos proeminentes / Nível Cervical)
- ACHADOS ADICIONAIS · INDICAÇÃO · ASSINATURA

### Modelo NORMAL (verbatim capturado)
```
ULTRASSONOGRAFIA DA TIREOIDE

TÉCNICA:
Exame realizado com transdutor linear de alta frequência.

ANÁLISE:
Glândula tireoide tópica, de dimensões normais e contornos preservados.
Parênquima tireoidiano com ecotextura homogênea. Não foram caracterizadas lesões sólidas ou císticas.
Lobo direito da tireoide:
Lobo esquerdo da tireoide:
Istmo:
Volume total:

Não há evidência de linfonodomegalias.

OPINIÃO:
Estudo ultrassonográfico dentro dos padrões da normalidade.
```

### Alterados (nódulo / cisto / tireoidopatia)
> A capturar (interação dinâmica no TinyMCE — pendente). Pode ser fornecido pelo
> Luiz (colar) OU re-capturado após as decisões acima.
