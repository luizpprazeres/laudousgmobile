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

## Próximos passos (quando o Luiz decidir)
1. Definir o SCHEMA do plano de edição (operações sobre o base) e do spec tipado.
2. Protótipo do fluxo: ditado → plano (LLM) → montagem+auditoria (código) → [reparo condicional] — na categoria abdome, flag OFF, contra o gabarito do renderer.
3. Auditor determinístico de fidelidade (ditado→laudo).
4. Flywheel de proposta+aprovação (bootstrap do histórico do Luiz).
