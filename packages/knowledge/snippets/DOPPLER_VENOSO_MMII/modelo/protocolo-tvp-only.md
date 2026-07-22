---
id: doppler-venoso-mmii-modelo-protocolo-tvp-only
category: DOPPLER_VENOSO_MMII
kind: modelo
tags: [venoso, mmii, modelo, tvp, protocolo-restrito, dimero-d, urgencia, variant:tvp-only]
priority: 85
priority_tier: contextual
version: 0.1.0
status: published
source_path: SVS/AVF/AVLS 2023 §5 (DVT diagnostic protocol) + AIUM Practice Parameter for Peripheral Venous Ultrasound + ACR Appropriateness Criteria — Suspected Lower-Extremity DVT
source_extracted_at: 2026-05-30
---

GATILHOS DE APLICAÇÃO: "investigar TVP", "suspeita de TVP", "afastar TVP", "exame para TVP", "d-dímero elevado", "edema unilateral agudo", "Wells alto", "dor em panturrilha", "urgência venosa", "TVP solicitada", "protocolo TVP", "exame restrito TVP".

TEMPLATE — PROTOCOLO EXCLUSIVO PARA INVESTIGAÇÃO DE TVP

USE ESTE MODELO QUANDO: exame foi solicitado APENAS para investigação de trombose venosa profunda (sem solicitação de cartografia, mapeamento pré-op ou avaliação superficial). Cenários típicos:
- D-dímero elevado.
- Edema unilateral agudo / dor em panturrilha aguda.
- Wells score alto.
- Pós-operatório, imobilização, trauma.
- Suspeita clínica em paciente sem queixa varicosa.

NÃO USE este modelo (use "template-padrao" completo) quando: solicitação inclui avaliação superficial, refluxo, varizes ou cartografia. Para mapeamento pré-op específico: usar a variante `cartografia` de DOPPLER_VENOSO_MMII.

TÍTULO: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBROS INFERIORES — INVESTIGAÇÃO DE TROMBOSE VENOSA PROFUNDA"

═══════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA
═══════════════════════════════════════════════════

COMENTÁRIOS:
Exame realizado com transdutor linear (5-12 MHz) em decúbito dorsal para avaliação do sistema venoso profundo. Foram aplicadas manobras de compressibilidade ao longo de cada segmento avaliado. NÃO foi realizado mapeamento do sistema venoso superficial (safenas, perfurantes, tributárias) — escopo restrito à investigação de TVP conforme solicitação.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
1. Compressibilidade ao toque do transdutor — segmento a segmento.
2. Visualização de material trombótico intraluminal.
3. Fluxo espontâneo e fásico com respiração.
4. Aumento de fluxo a compressão distal manual.

SEGMENTOS AVALIADOS (PROTOCOLO DUS COMPLETO PARA TVP):
- Veia femoral comum.
- Veia femoral.
- Veia femoral profunda (porção visível).
- Veia poplítea.
- Veias tibiais posteriores (compressão segmentar).
- Veias fibulares (compressão segmentar).

(Se exame for "DUS limitado" / apenas proximal: incluir apenas femorais e poplítea, e declarar limitação no laudo.)

CONCLUSÃO: numerada, contemplando APENAS achados pertinentes a TVP. NÃO incluir frases sobre competência venosa superficial, refluxo ou perfurantes (não foram avaliadas).

═══════════════════════════════════════════════════
CRITÉRIOS DIAGNÓSTICOS DE TVP
═══════════════════════════════════════════════════

ACHADO DIAGNÓSTICO PRINCIPAL (obrigatório para afirmar TVP):
- INCOMPRESSIBILIDADE da veia ao toque do transdutor — é o achado de maior especificidade e considerado o critério-âncora para diagnóstico de TVP em DUS de compressão.

ACHADOS AUXILIARES (corroboram o diagnóstico, NÃO substituem incompressibilidade):
- Visualização de material trombótico intraluminal (auxilia caracterização e, junto à incompressibilidade, fortalece o diagnóstico).
- Distensão venosa (calibre aumentado vs contralateral) — sugere cronologia recente, mas não diagnostica TVP isoladamente.
- Ausência de fluxo espontâneo ou de aumento a compressão distal — achado sugestivo, isoladamente menos específico.

REGRA: NÃO afirmar TVP apenas com base em distensão ou alteração de fluxo sem incompressibilidade demonstrada. Quando incompressibilidade não é tecnicamente avaliável (ex: ilíaca proximal), declarar limitação técnica e correlacionar com achados auxiliares — sem conclusão diagnóstica firme.

═══════════════════════════════════════════════════
LIMITAÇÕES DO PROTOCOLO TVP-ONLY
═══════════════════════════════════════════════════

- NÃO afirmar competência venosa superficial — não avaliada.
- NÃO afirmar perfurantes competentes — não avaliadas.
- NÃO afirmar ausência de varicosidades — não foram pesquisadas.
- Se médico mencionar varicosidades visíveis no exame físico durante o procedimento: documentar como observação, mas indicar necessidade de mapeamento dedicado se houver indicação clínica posterior.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estender afirmações para fora do escopo do protocolo executado.
- Não classificar idade do trombo automaticamente (ver bloco tvp-aguda vs tvp-idade-indeterminada vs tvp-cronica-recanalizada).
- Não prescrever conduta terapêutica.
