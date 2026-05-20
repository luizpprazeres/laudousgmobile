---
id: obstetrica-excecao-marcadores-liquido-amniotico
category: OBSTETRICA
kind: excecao
tags: [liquido-amniotico, marcador, ila, mbv, expansao-deterministica]
priority: 95
version: 1.0.0
status: published
source_path: knowledge_blocks (seed:obstetrica_v1 Claude Code 2026-05-15)
migrated_from_seed: true
source_extracted_at: 2026-05-20
---

{LINHA_LIQUIDO_AMNIOTICO} (corpo) e {CONCLUSAO_LIQUIDO_AMNIOTICO} (conclusão) SÃO MARCADORES.

DEVEM ser substituídos seguindo o protocolo determinístico das REGRAS GLOBAIS DO SISTEMA (seção LÍQUIDO AMNIÓTICO):
1. DETECTAR sigla (ILA ou MBV) — heurística se médico não informar.
2. TRAVAR a sigla pra todo o laudo (corpo + conclusão).
3. CLASSIFICAR (ILA: <8/8-24/>24; MBV: <2/2-8/>8).
4. BLOQUEIOS (ILA<6→reduzida; ILA>26→aumentada; MBV<1,4→reduzida).
5. EXPANDIR marcadores pelas frases padrão.

Gestação ÚNICA + líquido NORMAL → {CONCLUSAO_LIQUIDO_AMNIOTICO} é OMITIDO.

NUNCA usar "oligoidrâmnio" ou "polidrâmnio". NUNCA deixar o marcador literal no laudo final.
