# ADR-0004 — Montagem determinística de laudos (aposentadoria do RAG vetorial normativo)

- **Status:** Accepted
- **Data:** 2026-06-11
- **Decisores:** Luiz (produto/clínica) + Claude Code (análise) + Codex/dex1 (review crítico)
- **Contexto trigger:** erros frequentes em produção (frases modificadas, posição errada,
  estrutura padrão COMENTÁRIOS/OS SEGUINTES ASPECTOS quebrada) enquanto os custom GPTs
  originais, com prompt monolítico por categoria, acertavam quase sempre com o mesmo input.
- **Plano de execução:** `docs/plano-laudos-deterministicos.md` (sprints DET-1 a DET-6)
- **Nota (2026-06-11):** Luiz dispensou benchmarks comparativos RAG vs determinístico —
  a decisão é final; os sprints começam direto na implementação. Casos golden estruturais
  permanecem como critério de aceite/regressão do pipeline novo.

## Decisão

1. **Aposentar a recuperação vetorial** (`knowledge_blocks` + pgvector + quotas por kind em
   `retriever.ts`) para todo conteúdo **normativo** (modelo, regra, frase, conclusao,
   excecao, comentario_tecnico). O system prompt passa a ser montado por **bundle
   determinístico**: SELECT por (categoria, estilo, variante, status=validated), ordem fixa,
   zero embedding.
2. **`knowledge_blocks` vira CMS** (autoria, versionamento e validação via
   lab.laudousg.com/blocks) — deixa de ser índice de busca.
3. Evoluir em seguida para **structured extraction + renderer**: o LLM converte o ditado em
   JSON validado por schema da categoria; o código monta o laudo (estrutura garantida por
   construção). Lema (dex1): *"LLM entende o ditado; o sistema monta o laudo."*
4. **Máscaras alternativas** viram entidade de 1ª classe (`report_template_variants`) com
   preferência por conta (`account_report_preferences`), resolvidas por chave fixa.
5. **Personalização só explícita** (variante escolhida + vocabulário pessoal curado opt-in).
   Zero aprendizado automático.

## Racional (resumo das evidências)

- O conhecimento por categoria é pequeno (140–1.604 linhas) e cabe inteiro no contexto —
  retrieval só adiciona variância sem benefício.
- O template competia em quota top-2 por similaridade; overrides `modelo:12` em
  PELVE/MORFOLOGICO eram band-aids; só 6/34 categorias tinham contrato hardcoded; fallback
  `RAG_EMPTY` gerava laudo sem estrutura; 11 post-processors corrigiam o que a fragmentação
  quebrava; prompt variável anulava o prompt caching.
- O custom GPT acertava por ter **menos caminhos dinâmicos** (previsibilidade de instrução),
  não por mérito do formato monolítico em si — é a previsibilidade que devemos reproduzir.

## Alternativas rejeitadas

- **Fine-tuning:** melhora estilo, não garante estrutura nem fidelidade clínica.
- **Modelo open-source próprio:** o modelo nunca foi o problema; só adiciona infra e risco.
- **Reorganizar os blocos (chunks maiores/diferentes) mantendo retrieval vetorial:** atenua,
  mas mantém a causa raiz (seleção probabilística de conteúdo normativo).
- **Aprendizado automático com o uso:** rejeitado pelo produto — previsibilidade é requisito.

## Consequências

- Positivas: estrutura de laudo garantida, prompt caching efetivo (custo/latência menores),
  rollback trivial por flag/categoria, máscaras por preferência da conta viáveis, post-
  processors rebaixados a cinto de segurança.
- Negativas/custos: saneamento obrigatório do `knowledge_blocks` antes do rollout (DET-1);
  manutenção de schemas/renderer por categoria (DET-6); golden suite estrutural passa a ser
  gate permanente (DET-0).
- Itens das decisões anteriores afetados: a regra "13 categorias ativas" e os 3+1 estilos de
  escrita permanecem; muda apenas o mecanismo de montagem do contexto.
