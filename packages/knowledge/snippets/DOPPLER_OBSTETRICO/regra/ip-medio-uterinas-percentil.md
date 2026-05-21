---
id: doppler-obstetrico-regra-ip-medio-uterinas-percentil
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, uterinas, ip-medio, percentil, conclusao]
priority: 70
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 153-155
---

GATILHOS DE APLICAÇÃO:
- IP médio
- artérias uterinas
- percentil 95
- uterina direita
- uterina esquerda

REGRAS DE DOPPLER — ARTÉRIAS UTERINAS
- Se o percentil do IP médio das artérias uterinas for maior que 95: acrescentar um novo item na conclusão após o item de líquido amniótico: "X) IP médio das artérias uterinas acima do percentil 95 para a idade gestacional." E substituir o item "Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média." por: "X) Índices de pulsatilidade normais nas artérias umbilical e cerebral média."
- Se o percentil do IP médio das artérias uterinas for 95 ou menor: manter o item padrão "Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média." sem alteração.
