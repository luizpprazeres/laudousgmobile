---
id: morfologico-regra-doppler-acessorio
category: MORFOLOGICO
kind: regra
tags: [morfologico, doppler, acessorio, dopplervelocimetria]
priority: 75
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-23
source_lines: 227-230
---

GATILHOS DE APLICAÇÃO: doppler, dopplervelocimetria, IP umbilical, IP cerebral média, IP uterina, IP ducto venoso, sala (em laudo morfológico), artérias uterinas, ratio cerebroplacentário.

═══════════════════════════════════════════════════
🧭 REGRA — DOPPLER ACESSÓRIO EM LAUDO MORFOLÓGICO
═══════════════════════════════════════════════════

SE o usuário pediu morfológico (1T, 2T ou 3T) E ADICIONALMENTE solicitou Doppler:

1) Manter integralmente o modelo do morfológico ([[morfologico-modelo-template-2t]] ou [[morfologico-modelo-template-3t]]).
2) Acrescentar o bloco DOPPLERVELOCIMETRIA imediatamente ANTES da seção CONCLUSÃO:

```
DOPPLERVELOCIMETRIA:
Artéria umbilical: IP ____ (p____, _____).
Artéria cerebral média: IP ____ (p____, _____).
Artérias uterinas (IP médio ____): p____, _____.
Ratio cerebroplacentário: ____ (p____, _____).
```

3) Acrescentar à CONCLUSÃO os itens correspondentes do modelo Doppler obstétrico (ex: "Doppler obstétrico normal" ou indicação de alteração), SEM alterar a estrutura base do morfológico (numeração e frases do morfológico permanecem).

OBSERVAÇÕES:
- Cálculo de percentis: ver tabelas FMF/Gratacós (cliente iOS faz pré-cálculo via [[doppler-obstetrico-regra-percentis-opcionais]] e [[doppler-obstetrico-regra-ip-medio-uterinas-auto-calculo]]).
- Se o médico não pediu Doppler, NÃO inserir o bloco DOPPLERVELOCIMETRIA.

ANTI-EXEMPLOS:
❌ Substituir o modelo morfológico pelo modelo Doppler obstétrico quando o pedido é "morfo + doppler" — manter o morfológico como base.
❌ Adicionar DOPPLERVELOCIMETRIA quando o médico não solicitou.
