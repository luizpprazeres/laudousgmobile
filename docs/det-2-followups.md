# DET-2 — Follow-ups (não-bloqueantes)

## 1. App iOS: quebras de linha "coladas" no Doppler obstétrico (build antigo)

**Sintoma reportado (2026-06-11):** na tela de geração, o laudo de Doppler
obstétrico aparece com linhas grudadas (sem respeitar quebra). Só nessa categoria.

**Diagnóstico:** NÃO é o backend. Confirmado:
- `/api/generate` em prod retorna o `final_text` com quebras corretas
  (`\n` por linha, `\n\n` por seção), determinístico (temp 0.1, 3+ gerações).
- O código ATUAL do app (`String+LaudoHighlight.swift`, corrigido em 2026-06-05;
  `MarkdownTextEditor.swift`) preserva as quebras — verificado com a lógica exata
  em swift CLI (parse, round-trip parse→serialize, laudoHighlighted).

**Causa:** build antigo no aparelho do Luiz, anterior às correções de
renderização. O modelo novo do Doppler obstétrico (seed da fonte, DET-2) usa
quebra simples entre linhas densas (biometria + dopplervelocimetria + conclusão
de 6 itens); um renderizador antigo que colapsava `\n` simples cola exatamente
essas linhas — por isso aparece só nessa categoria.

**Ação:** atualizar/reinstalar o app (build ≥ commit `7c0ba8f`, 2026-06-07).
Se persistir após atualizar, é bug de renderização real — pedir print e corrigir
no Swift (repo `~/laudousg-swift/LaudoUSG`).

## 2. Remoção física do caminho vetorial normativo (RAG)

Deferido até o bundle das 13 categorias estar estável em produção (alguns dias
de observação). Hoje o retriever vetorial (`retriever.ts`, quotas por kind,
overrides `modelo:12`, RPC `match_knowledge_blocks`) é o **fallback de rollback**:
desligar a flag devolve qualquer categoria ao RAG sem deploy. Remover agora
tiraria essa rede de segurança. Quando remover: revisar também os 11
post-processors em `generate/route.ts` (quais viram redundantes com bundle
completo). Critério de aceite DET-2: "caminho vetorial normativo morto no código".

## 3. Categorias ativas sem volume (não migradas)

ABDOMEN_SUPERIOR, GLANDULAS_SALIVARES, DOPPLER_ARTERIAL_MMII, PROSTATA_*,
PARTES_MOLES, MUSCULOESQUELETICO_V2, TRANSFONTANELA, etc. — seguem no RAG
(volume baixo/zero). Entram em ondas futuras se ganharem uso. `diff:bundle`
acusa drift alto nelas (esperado — não saneadas).
