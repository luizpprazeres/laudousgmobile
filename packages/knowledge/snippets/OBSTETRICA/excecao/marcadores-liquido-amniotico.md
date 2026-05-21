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

{LINHA_LIQUIDO_AMNIOTICO} (corpo) e {CONCLUSAO_LIQUIDO_AMNIOTICO} (conclusão) SÃO MARCADORES OBRIGATÓRIOS.

⚠️ ATUALIZADO 2026-05-21: a frase de líquido SEMPRE aparece na conclusão como item 2 (logo após "Gestação em torno de X semanas"). NÃO omitir nunca, nem em gestação única com líquido normal.

DEVEM ser substituídos pelas frases padrão da regra `liquido-amniotico-marcadores`:

CORPO ({LINHA_LIQUIDO_AMNIOTICO}) — UMA das 4 opções:
1. "Líquido amniótico de quantidade normal pela análise subjetiva." (sem medida)
2. "O índice do líquido amniótico mede X,X cm." (ILA)
3. "O maior bolsão vertical mede X,X cm." (MBV)
4. "Não foi possível aferir adequadamente a medida do líquido amniótico (quantidade reduzida)."

CONCLUSÃO ({CONCLUSAO_LIQUIDO_AMNIOTICO}) — SEMPRE incluir como item 2:
- Líquido NORMAL sem medida: "X) Líquido amniótico de quantidade normal."
- Líquido NORMAL com ILA: "X) Líquido amniótico de quantidade normal (ILA mede Y,Y cm)."
- Líquido NORMAL com MBV: "X) Líquido amniótico de quantidade normal (MBV mede Y,Y cm)."
- Líquido REDUZIDO: "X) Líquido amniótico em quantidade reduzida (ILA mede Y,Y cm)."
- Líquido AUMENTADO: "X) Líquido amniótico em quantidade aumentada (ILA mede Y,Y cm)."

PROTOCOLO DETERMINÍSTICO (quando há medida):
1. DETECTAR sigla (ILA ou MBV) — heurística se médico não informar
2. TRAVAR a sigla pra todo o laudo
3. CLASSIFICAR (ILA: <8/8-24/>24; MBV: <2/2-8/>8)
4. BLOQUEIOS (ILA<6→reduzida; ILA>26→aumentada; MBV<1,4→reduzida)
5. EXPANDIR marcadores

PROIBIÇÕES:
- NUNCA usar "oligoidrâmnio" ou "polidrâmnio"
- NUNCA deixar o marcador literal no laudo final
- NUNCA omitir frase de líquido da conclusão (padrão SEMPRE INCLUIR)
