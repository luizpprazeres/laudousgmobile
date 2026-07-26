# Arquitetura convergida — assistente de laudos confiável (Claude/Fable + Codex 5.6)

**25/07/2026.** Conclusão do diálogo Fable × Codex sobre a lógica de processo de um assistente que escreva EXATAMENTE como o ultrassonografista escreveria, rápido e confiável. Convergência: minha tese (um writer reflexivo + estilo como dado + validação em código + flywheel) foi aceita e **refinada em 3 pontos** pelo Codex.

## A resposta em uma linha
**UMA passada semântica que emite um PLANO DE EDIÇÃO estruturado sobre o spec pessoal do médico; montagem e auditoria DETERMINÍSTICAS em código; no máximo UMA reparação condicional quando o auditor detecta divergência.** Nada de prompt gigante, RAG normativo, grafo de agentes ou modelo fraco como estratégia central.

## As 5 camadas

1. **SPEC PESSOAL (dado tipado, versionado, editável)** — por (médico × categoria):
   - laudo-base normal COMPLETO e ESTRUTURADO (slots por órgão + frases de normalidade + marcação de campos OBRIGATÓRIOS),
   - dicionário achado→frase (tipado, composável),
   - contrato curto da categoria.
   O médico é dono e edita; só a versão **publicada** entra em produção (draft/published/histórico). É AQUI que mora o estilo dele — capturado como dado, não escrito num prompt.

2. **UMA CHAMADA SEMÂNTICA (o leitor reflexivo)** — lê o ditado cru + o spec + os princípios universais e emite um **PLANO DE EDIÇÃO estruturado** (patches sobre o base): que frase de normalidade trocar (por qual morfologia), que achado é inédito (prosa nova), que itens de conclusão (com o termo cadastrado), que campo obrigatório ficou sem valor (→ placeholder). **Ela ENTENDE; não monta o texto.**

3. **MONTAGEM + AUDITORIA DETERMINÍSTICAS (código, ~0ms)** — aplica o plano ao base (garantindo por construção: base preservado verbatim onde não foi editado, numeração correta, fechamento correto, zero deriva de paráfrase); audita a fidelidade (toda medida+unidade/lateralidade/negação ditada presente e inalterada; placeholders obrigatórios presentes; nada inventado).

4. **REPARAÇÃO CONDICIONAL (no máximo 1 chamada extra)** — só se o auditor apontar divergência, UMA chamada dirigida corrige aquele ponto específico. Caso comum: nunca dispara. Latência: comum = 1 chamada LLM + código instantâneo; difícil = 2 chamadas.

5. **APRENDIZADO = FLYWHEEL CURADO (nunca automático)** — minerar os laudos históricos + corrigidos do médico → PROPOR atualizações do spec (frases novas, edições do base) → o médico APROVA explicitamente → publicado. **Nunca aprendizado silencioso** (num produto médico, auto-aprender arriscaria fixar um erro ou derivar). Bootstrap do estilo dele a partir do histórico (escrever "como ele" antes de ele falar) + refino por aprovação.

## Por que isso responde às opções que o Luiz levantou
- **Prompt gigante?** Não — o prompt é pequeno (princípios universais + spec compacto DA categoria). O inchaço era o veneno.
- **Biblioteca grande / RAG?** Não — o spec por categoria é pequeno e carrega INTEIRO (retriever vetorial já aposentado, DET-2). Sem passo de busca, sem quebrar cache.
- **Conjunto de agentes / rede tipo grafo?** Não — 1 chamada semântica + código + reparo condicional. Mais chamadas sequenciais = mais lento e mais pontos de falha. O único "2º passo" garantido é CÓDIGO (montagem/auditoria), não agente.
- **Modelo fraco e rápido?** A chamada semântica exige compreensão — mas um mid-tier (gpt-5.4-mini) basta PORQUE o spec faz o trabalho pesado e o código faz a montagem. Escala para modelo forte só no caso incomum (o toggle "difícil" já existe). A parte determinística é código: grátis e instantânea.

## O insight central
A confiabilidade vem de **tirar a inteligência de dentro do modelo e colocá-la no DADO (o spec editável do médico) + no CÓDIGO (montagem/auditoria)** — assim UMA chamada rápida basta. O modelo só decide O QUE mudar (plano); o código garante COMO fica (texto fiel). E o aprendizado é **curado com aprovação**, nunca automático.

## Refinamentos que o Codex acrescentou à minha tese
1. A chamada não escreve o laudo livre — emite um **plano de edição estruturado**; o **código monta**. (Separa entendimento de montagem → mata a deriva de paráfrase do base.)
2. **Reparo condicional** (1 chamada extra só sob evidência do auditor) em vez de sempre 1 passada.
3. Spec **tipado + versionado**; flywheel com **aprovação explícita**, nunca auto-aprendizado.

## Mapeia no que já existe (não é reescrita do zero)
- Determinismo do renderer → vira a **montagem/auditoria em código**.
- Flexibilidade do writer → vira a **chamada semântica de plano de edição**.
- Snippets de conclusão → viram o **dicionário tipado**.
- `status draft/published` → o **spec versionado** (seção 12 do brief).
- Fluxo de aprovação dos golden cases → o **flywheel com aprovação**.
- `ReportOperation[]` / interpretador de comandos (edição incremental A1) → o formato do **plano de edição**.
- Toggle "difícil" → a **escalada de modelo**.

## Personalização / multi-tenant (por que a mesma arquitetura escala por usuário)

A personalização NÃO é um puxadinho — é a razão de a arquitetura ser essa. Como o estilo mora no **dado** (spec), "cada médico com seu estilo" é o estado natural. O agente não sabe o estilo de ninguém; **lê** o spec daquele médico a cada laudo. Um médico novo funciona no 1º dia, sem re-treino.

- **Eficiência preservada:** personalizar muda QUAL dado carrega, não QUANTAS chamadas nem o tamanho do modelo. Latência ≈ de graça. Contra-intuitivo: quanto melhor o spec, MENOS o modelo precisa pensar.
- **Cache em 2 níveis:** princípios universais = idênticos p/ todos (cache global); spec do médico = estável entre os exames dele (cacheia no 2º laudo). Ordem no prompt: universal → spec → ditado.
- **LINCHPIN — base ESTRUTURADO por slots com ids estáveis** (`figado`, `vesicula`, `rim_dir`…): o plano de edição e o dicionário apontam para slots; se o médico edita a frase do fígado, o slot `figado` persiste e nada dessincroniza. Base como texto livre = personalização frágil. **É aqui que se investe.**
- **Governança = git para laudos** (seção 12 do brief): oficial imutável → o médico bifurca uma cópia pessoal editável; só a versão **publicada** entra em produção; histórico + restaurar versão + restaurar padrão + lixeira; o oficial pode ser atualizado no centro sem atropelar o fork de ninguém.
- **Auditor spec-aware, NÃO hardcoded:** o código confere só invariantes universais (medida+unidade/lado/negação presentes e inalteradas, placeholder obrigatório, nada inventado). Estilo (numeração, frase) é garantido por **reproduzir o base**, nunca por regra fixa — senão quebra quando o usuário muda o padrão.
- **Onboarding do médico novo = flywheel:** ele manda laudos históricos → a gente PROPÕE o base + dicionário iniciais → ele aprova/ajusta. Chega "escrevendo como ele" sem montar o spec do zero.
- **Alternativas descartadas p/ personalizar:** fine-tuning por médico (lento, caixa-preta, sem restaurar-padrão), RAG por médico (desnecessário, spec por categoria é pequeno). Dado-como-spec ganha: edição instantânea, transparente, versionável, barata, segura.
- **Riscos a vigiar:** (1) crescimento do dicionário (limitado por ser por-categoria; medir, não pré-otimizar); (2) auditor jamais hardcodar estilo; (3) bootstrap por histórico como caminho de onboarding.

## Próximos passos
Ver plano faseado em `docs/writer-v2-plano-implementacao-2026-07-25.md`.
