---
id: doppler-venoso-mmii-modelo-template-padrao
category: DOPPLER_VENOSO_MMII
kind: modelo
tags: [doppler, venoso, mmii, modelo, tvp, insuficiencia, ceap, variant:completo]
priority: 95
priority_tier: universal
version: 0.1.0
status: published
source_path: SVS/AVF/AVLS 2023 — Varicose Vein Clinical Practice Guidelines + CEAP 2020 + AIUM Practice Parameters
source_extracted_at: 2026-05-30
---

TEMPLATE-BASE DOPPLER VENOSO DE MEMBROS INFERIORES — UNIVERSAL (protocolo COMPLETO: TVP + refluxo + cartografia)

TÍTULO: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBROS INFERIORES"

═══════════════════════════════════════════════════
DIFERENCIAÇÃO DE PROTOCOLOS (LEIA ANTES DE USAR)
═══════════════════════════════════════════════════

ATENÇÃO — este modelo cobre o PROTOCOLO COMPLETO. Se o exame foi solicitado EXCLUSIVAMENTE para investigação de TVP (sem avaliação superficial / sem cartografia pré-operatória), usar o modelo "protocolo-tvp-only" em vez deste:

- "Protocolo COMPLETO" (este modelo): TVP + competência venosa profunda + sistema superficial (safenas, perfurantes, tributárias).
- "Protocolo TVP-only": APENAS patência/compressibilidade do sistema profundo. NÃO afirmar competência de safenas/perfurantes se não foram avaliadas.

A distinção é clínica: solicitação para "investigar TVP / TVP / suspeita de trombose / D-dímero alterado" em paciente sem queixa varicosa = TVP-only. "Mapeamento pré-operatório / cartografia / pré-radiofrequência / varizes" = use a variante `cartografia` de DOPPLER_VENOSO_MMII. Quando o pedido cobre AMBOS sem foco cartográfico, usar este modelo completo.

═══════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA
═══════════════════════════════════════════════════

COMENTÁRIOS:
Exame realizado com transdutor linear (5-12 MHz) em decúbito dorsal (sistema profundo) e ortostase ou Trendelenburg (sistema superficial). Manobras de compressibilidade, Valsalva e compressão distal manual aplicadas. Foram avaliados:
- Sistema venoso profundo: veias femoral comum, femoral, poplítea, tibiais posteriores e fibulares.
- Sistema venoso superficial: veia safena magna (todo seu trajeto), veia safena parva, principais tributárias.
- Veias perfurantes: identificação e teste de competência.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
1. Patência/compressibilidade dos segmentos do sistema profundo.
2. Calibre da safena magna em junção safeno-femoral, terço proximal, médio e distal de coxa, joelho, e perna.
3. Calibre da safena parva (se aplicável).
4. Refluxo: tempo de refluxo em segundos após manobra (Valsalva ou compressão distal).
5. Veias perfurantes: localização (medial, lateral, posterior; coxa, joelho, perna) + diâmetro + competência.
6. Tributárias varicosas (se presentes): localização e dimensões.

CONCLUSÃO: numerada por item, achados positivos.

═══════════════════════════════════════════════════
CRITÉRIOS DE REFLUXO — SVS/AVF/AVLS 2023 (granular)
═══════════════════════════════════════════════════

REFLUXO PATOLÓGICO > 1,0 SEGUNDO:
- Veia femoral comum.
- Veia femoral.
- Veia poplítea.

REFLUXO PATOLÓGICO > 0,5 SEGUNDO (500 ms):
- Veias superficiais: safena magna, safena parva, tributárias.
- Veias tibiais (tibial posterior, tibial anterior, fibular).
- Veia femoral PROFUNDA.
- Veias perfurantes (associado a diâmetro > 3,5 mm para competência alterada).

Referência: SVS/AVF/AVLS 2023 Varicose Vein Clinical Practice Guidelines Part II.

═══════════════════════════════════════════════════
CRITÉRIOS DE TVP (TROMBOSE VENOSA PROFUNDA)
═══════════════════════════════════════════════════

Diagnóstico = INCOMPRESSIBILIDADE da veia ao toque do transdutor + visualização de material trombótico intraluminal. Achados adicionais:
- Distensão venosa (calibre aumentado vs contralateral).
- Ausência de fluxo espontâneo ou fásico ao Doppler.
- Ausência de aumento de fluxo a compressão distal.

═══════════════════════════════════════════════════
CLASSIFICAÇÃO CEAP (DOENÇA VENOSA CRÔNICA — referência)
═══════════════════════════════════════════════════

- C0: sem sinais visíveis.
- C1: telangiectasias e veias reticulares.
- C2: veias varicosas.
- C3: edema.
- C4a: pigmentação, eczema. C4b: lipodermatosclerose, atrofia branca.
- C5: úlcera cicatrizada.
- C6: úlcera ativa.

NÃO citar classe CEAP no laudo a menos que médico tenha mencionado clínica explicitamente. CEAP combina dados ecográficos + clínicos.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não citar tempos de refluxo se médico não mencionou.
- Não classificar CEAP sem clínica explícita.
- Não recomendar conduta cirúrgica (ablação, esclerose) — apenas avaliação por cirurgião vascular.
