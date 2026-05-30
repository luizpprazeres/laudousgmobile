---
id: doppler-renal-excecao-rim-transplantado
category: DOPPLER_RENAL
kind: excecao
tags: [doppler, renal, transplante, fistula, complicacao, rejeicao, pendente-curadoria]
priority: 60
priority_tier: contextual
version: 0.1.0
status: draft
source_path: AIUM/ACR/SRU Practice Parameter for the Performance of the Ultrasound Examination of Solid-Organ Transplants (2022) — PENDENTE curadoria definitiva contra guideline específica de transplante renal (não usar AIUM Native Renal Artery Duplex como fonte: aplica-se apenas a rim nativo)
source_extracted_at: 2026-05-30
---

⚠️ ARQUIVO EM PASTA `__rev__/` — webhook GitHub (apps/api/src/app/api/admin/github-webhook/route.ts) ignora automaticamente este path (linha 142: `!file.includes("/__rev__/")`). Manter aqui até curadoria definitiva da guideline específica de transplante renal.

Thresholds atuais (VPS > 250-300 na anastomose, razão > 2,5, IR > 0,80) são REFERÊNCIA preliminar e PRECISAM ser validados contra guideline específica de transplante renal (ACR Practice Parameter for Renal Transplant Sonography ou equivalente) antes de promover. A proteção contra ingest é a PASTA `__rev__/` (filtro do webhook em route.ts:142); quando curadoria definitiva concluir, mover o arquivo para `DOPPLER_RENAL/excecao/rim-transplantado.md` (sem `__rev__/`) e atualizar source_path com a guideline definitiva.


GATILHOS DE APLICAÇÃO: "rim transplantado", "transplante renal", "enxerto renal", "rim implantado", "rim em fossa ilíaca", "anastomose vascular", "rejeição", "trombose de enxerto", "estenose pós-transplante".

EXCEÇÃO — RIM TRANSPLANTADO: protocolo diferente do rim nativo

Quando paciente é transplantado, NÃO aplicar critérios de rim nativo (VPS > 250 cm/s, RAR > 3,2). Usar protocolo específico de enxerto:

ESTRUTURA DO LAUDO PRA RIM TRANSPLANTADO:

CORPO:
1. Localização do enxerto (fossa ilíaca direita/esquerda; pélvico).
2. Dimensões do enxerto e ecogenicidade do parênquima.
3. Anastomose arterial (artéria renal do enxerto com artéria ilíaca/aorta):
   - VPS na anastomose e segmentos proximal/distal.
   - Padrão espectral.
4. Veia renal do enxerto: patência e padrão de fluxo.
5. Avaliação intrarrenal: IR e IP nas artérias segmentares (3 pontos: superior, médio, inferior).
6. Coleções perienxerto (linfocele, hematoma, urinoma).

VALORES DE REFERÊNCIA — RIM TRANSPLANTADO:
- Estenose de anastomose: VPS > 250-300 cm/s na anastomose (variável conforme cirurgião).
- Razão VPS anastomose/ilíaca pré-anastomótica > 2,5 = estenose significativa.
- IR intrarrenal > 0,80 = sugere rejeição aguda, NTA, obstrução ou compressão extrínseca.
- IR < 0,55 distal: sugere estenose proximal de anastomose.

CONCLUSÃO — frase verbatim quando exame normal:
"X) Enxerto renal em fossa ilíaca [direita/esquerda] com fluxos arterial e venoso preservados, sem sinais ecográficos de estenose de anastomose, trombose ou complicações peri-enxerto."

CONCLUSÃO — frase verbatim quando achado patológico (citar a referência clínica):
"X) [Achado específico]. Recomenda-se correlação clínica com função renal (creatinina, eletrólitos) e equipe transplantadora."

NÃO INVENTAR:
- Não classificar tipo de rejeição por Doppler (clínico/biópsia confirma).
- Não inferir complicação sem critério explícito mencionado pelo médico.
