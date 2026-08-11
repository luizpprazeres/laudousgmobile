# Pesquisa — qual modelo de IA para gerar laudos (comparativo + recomendação)

**Pedido do Luiz (22/07):** entender os dados (custo em dólar + qualidade), não confiar cego; usar os benchmarks que já temos + sites de comparação; recomendar um modelo melhor, mesmo mais caro, priorizando **qualidade** SEM perder: laudo **rápido**, entende **comandos**, entende **linguagem natural** nos ajustes.

## 1. Configuração atual (código, `apps/api/src/server/env.ts`)
| Papel | Modelo hoje | Preço (por 1M in/out) |
|---|---|---|
| Structurer (extrai achados estruturados) | **gpt-4.1-mini** | $0.40 / $1.60 |
| Writer (escreve o laudo, streaming) | **gpt-4.1-mini** | $0.40 / $1.60 |
| Sanity (checagem) | gpt-4.1-mini | $0.40 / $1.60 |
| Consultant (chat IA) | **gpt-5** (fallback gpt-4.1) | — |
| Embeddings (RAG) | text-embedding-3-small | — |
| STT (voz) | Deepgram nova-3 (pt-BR) | — |
- `FAST_PATH_DEFAULT=true` (pula o structurer, ~5s mais rápido).
- Já existe `OPENAI_WRITER_REASONING_EFFORT` (none/low/…): infra p/ trocar o writer por um reasoning model (GPT-5) sem mexer em código.

## 2. Dados internos que JÁ temos (`docs/model-benchmark.html`)
Benchmark pontual (casos reais de prod):
| Config | Tempo total | Custo/laudo | Observação |
|---|---|---|---|
| **atual · gpt-4.1-mini** | **~5.8s** | ~$0.0024 (~$2.4/1000) | rápido, estilo da casa limpo |
| gpt-5.4-nano · xhigh | **42.7s** | ~$0.0030 | reasoning pesado; às vezes "(sem texto)"; markdown que quebra o estilo |
| deepseek-v4-flash · max | **41.5s** | ~$0.0034 | rico clinicamente (classifica TI-RADS sozinho) mas MUITO lento |
- **Achado central:** reasoning no esforço MÁXIMO = 7–8x mais lento (40s vs 5.8s) e às vezes instável → contraria a prioridade "rápido". Mas os modelos maiores dão MAIS riqueza clínica.
- **Trade-off a resolver:** qualidade clínica (raciocínio) × velocidade. A hipótese é buscar um modelo **premium não-reasoning OU reasoning de esforço BAIXO** que dê mais qualidade que o 4.1-mini sem a latência de 40s.

## 3. Preços Claude (skill claude-api, jul/2026)
| Modelo | in/out por 1M | Contexto | Nota |
|---|---|---|---|
| Claude Fable 5 | $10 / $50 | 1M | mais capaz; thinking sempre on |
| Claude Opus 4.8 | $5 / $25 | 1M | top Opus |
| Claude Sonnet 5 | $3/$15 (intro **$2/$10** até 31/08) | 1M | perto de Opus em coding/agentic; thinking adaptativo (pode rodar effort baixo p/ velocidade) |
| Claude Haiku 4.5 | $1 / $5 | 200K | mais rápido/barato |

## 4. Candidatos a avaliar (dimensões)
Dimensões que importam (do uso real): (a) seguir o ESTILO DA CASA sem markdown/inventar; (b) entender COMANDOS explícitos; (c) entender LINGUAGEM NATURAL nos ajustes (a feature de edição incremental /api/edit); (d) VELOCIDADE (streaming, tempo até 1º token); (e) custo; (f) não alucinar (segurança clínica).

Candidatos: gpt-4.1-mini (atual) · gpt-4.1 (full) · GPT-5 / GPT-5-mini com reasoning baixo · Claude Sonnet 5 · Claude Opus 4.8 · Gemini (Flash/Pro) · DeepSeek.

## 4b. Onde um modelo melhor REALMENTE ajuda (do `docs/aprendizado-correcoes-luiz.md`)
Ranking dos defeitos que o Luiz corrige à mão (226 laudos):
- **Top 6 (29/18/18/15/15/15%) = MECÂNICOS** (estrutura, placeholder ____, comando ecoado, medida dropada, termo, cosmético) → resolvidos por RENDERER/GUARD determinístico, **NÃO por modelo mais inteligente**. É a estratégia DET que o time já executa.
- **Onde um modelo melhor paga:** #3 COMANDO_NAO_EXECUTADO (18% — seguir o comando ditado fielmente), #4/#8 não dropar medida/achado ditado, #9 ALUCINACAO (9%, alta severidade), e a feature `/api/edit` (ajuste em linguagem natural).
- **Conclusão de framing:** o ganho de trocar de modelo é concentrado em **instruction-following + fidelidade + não-alucinar**, exatamente as 3 coisas que o Luiz pediu (comando, linguagem natural, qualidade). Estilo da casa exige texto limpo (sem markdown) → evitar reasoning de esforço máximo (o benchmark mostrou markdown + 40s).

## 5. Pesquisa web (jul/2026) — resultados (fontes: Artificial Analysis, LMArena, páginas oficiais)

### ⚠️ Migração é recomendada (prazo NÃO oficial p/ a API — corrigido por Dex2)
O agente de pesquisa apontou desligamento do gpt-4.1-mini na API em 14/10/2026, MAS o **Dex2 verificou na página oficial de depreciações da OpenAI e esse desligamento NÃO está listado para a API** — a retirada confirmada foi no **ChatGPT** (a API do gpt-4.1-mini segue disponível por ora). **Não tratar 14/10/2026 como fato oficial da API.** Ainda assim, migrar cedo é o certo (o 4.x é geração antiga e será eventualmente depreciado), aproveitando para ganhar qualidade. Fixar snapshots pós-piloto p/ evitar mudança silenciosa de alias.

### Nomes mudaram (jul/2026)
- OpenAI: GPT-5 puro/mini/nano → famílias **GPT-5.4 / 5.5 / 5.6** (GPT-5 mini marcado deprecated). O Dex2 roda **GPT-5.6 sol** (II 56–59).
- Google: "Gemini 3" → **Gemini 3.5/3.6 Flash** + **3.1 Pro** + **3.5 Flash-Lite**.
- DeepSeek: mais recente = **V4 flash/pro**.

### Tabela preço × velocidade × qualidade
Preço USD/1M (in/out). II = Intelligence Index (Artificial Analysis). TTFT dos reasoning é medido com raciocínio LIGADO — **cai muito se rodar em esforço mínimo**.
| Modelo | in/out | II | tok/s | TTFT | Reasoning |
|---|---|---|---|---|---|
| gpt-4.1-mini (ATUAL, morre 14/10) | ~$0,40/$1,60 | baixo | rápido | <1s | não |
| **GPT-5.4 mini** | $0,75/$4,50 | 40 | 178 | 5,7s (xhigh) | sim, ajustável |
| GPT-5.4 (full) | $2,50/$15 | alto | — | — | sim |
| GPT-5.4-nano | $0,20/$1,25 | — | — | — | sim |
| GPT-5.6 sol (Dex2) | $5/$30 | 56–59 | — | — | sim |
| **Gemini 3.5 Flash-Lite** | $0,30/$2,50 | — | **439** (líder velocidade) | — | leve |
| Gemini 3.5 Flash | $1,50/$9 | 50 | 176 | 20s (thinking ON) | sim, desligável |
| Gemini 3.1 Pro | $2/$12 | frontier | 110 | — | sim |
| **DeepSeek V4 flash** | $0,14/$0,28 | 40 | 120 | 1,2s | sim |
| Claude Sonnet 5 | $3/$15 (intro $2/$10) | alto | — | — | adaptativo (roda rápido em low) |

Reasoning tokens contam como OUTPUT em todos (OpenAI/Google/DeepSeek).

### Evidência clínica (com ceticismo)
- GPT-5 em radio-oncologia (TXIT, PMC peer-reviewed): acurácia 92,8% vs GPT-4 78,8% — mas **10% ainda com alucinação → supervisão humana necessária** (reforça manter nossos guards determinísticos).
- HealthBench Hard (agregador, indicativo): GPT-5.4 = 40,1 >> Gemini 3.1 Pro 20,6.
- Propagação de erro: se o ditado tem fato errado, os modelos repetem em ~83% dos casos → nossos guards de segurança (umbilical, oligoâmnio) continuam essenciais, independentemente do modelo.
- **Nenhum modelo genérico tem vantagem médica PROVADA em PT-BR.** Wildcard PT-BR: Sabiá-4 (Maritaca).

## 6. Recomendação

**Framing:** a maior alavanca de qualidade NÃO é o modelo — é o trabalho de renderer/guard determinístico já em andamento (resolve os top-6 defeitos mecânicos). A troca de modelo (a) é obrigatória pelo deadline e (b) dá um ganho moderado concentrado em **seguir comando, fidelidade ao ditado e não-alucinar** — exatamente o que o Luiz pediu.

**Regra de ouro p/ velocidade:** rodar reasoning em esforço **mínimo/baixo**. Reasoning no talo = TTFT 5–20s+ (inaceitável). A infra já existe: `OPENAI_WRITER_REASONING_EFFORT`.

**Plano recomendado (A/B, sem mexer em prod até validar):**
1. **Primário: `GPT-5.4 mini` com `reasoning_effort=low/minimal`.** Migração trivial (mesma stack OpenAI — SDK/streaming/structured outputs iguais; o código já tem o campo de effort). II 40 = salto claro sobre 4.x. Custo sobe (~2,8× output) mas em absoluto segue baixo (~$2,4 → ~$5–6/1000 laudos), e **prompt caching** no system prompt gigante de estilo/few-shots corta o input (nosso maior volume) em 75–90%.
2. **Para `/api/edit` (ajuste em linguagem natural) e casos difíceis: `GPT-5.4` full em low effort.** É onde instruction-following paga mais e a latência importa menos (uma edição, não o laudo inteiro).
3. **Wildcard velocidade/PT-BR: `Gemini 3.5 Flash-Lite` (thinking off).** Mais rápido e barato, mas troca de ecossistema (SDK Google) + residência de dados Google — maior custo de integração.
4. **DeepSeek: descartado** (nuvem na China → PHI do ditado em trânsito), salvo self-host.
5. **Claude Sonnet 5** (intro $2/$10): excelente instruction-following + thinking adaptativo (roda rápido em low); ecossistema diferente do writer atual, mas o time já usa Claude. Vale no A/B se quiser comparar fora do eixo OpenAI.

**Como validar (reusar a metodologia do `docs/model-benchmark.html`):** rodar os candidatos nos casos reais de prod medindo (a) TTFT + tempo total streaming; (b) fidelidade ao estilo da casa (sem markdown); (c) comando ditado executado; (d) não dropar medida/achado; (e) alucinação. Ligar por flag, comparar lado a lado, decidir com dado.

**Decisão do Luiz:** (i) confirmar A/B GPT-5.4 mini vs alternativa; (ii) prazo — deixar rolar até perto de out/2026 ou antecipar; (iii) orçamento (mesmo o cenário mais caro segue barato em absoluto).
- Preços atuais (in/out por 1M) de: GPT-5 / GPT-5-mini / GPT-5-nano; Gemini 3 Flash/Pro; DeepSeek atual.
- Benchmarks de instruction-following / escrita estruturada / latência dos candidatos.

## 6. Recomendação — [preencher após pesquisa]
