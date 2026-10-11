# W16 — Latência da extração (obstétrica e família) + andamento na tela

Pedido do Luiz (10/10/2026, noite), testando no iOS em produção: obstétricos levam 12–25 s até o laudo aparecer.

## Diagnóstico (orquestrador, `generation_audit`)
- Antes (30 d, gpt-4.1-mini): OBSTETRICA p50 7,5 s até o texto (p90 9,7); ~690 tokens de saída.
- Agora (Haiku 5.5): 17,1 s e 25,5 s nos laudos do Luiz; extração (`writer_duration_ms` no caminho do renderer) 16,7–24,7 s com
  **4,4–8,5 mil tokens de saída** — quase tudo raciocínio (`thinking: adaptive`, `effort: medium`, `tool_choice: auto` que mantém
  o thinking — `ai/llm.ts` ~267–334).
- A sanity (7–11 s) roda **depois** do `done` (route.ts ~1656) — não pesa na espera, mas custa.

## Decisão do Luiz
**Desligar o raciocínio na extração.** Testar pela assinatura (bancada `claude -p`, prompt do mobile), sem gastar API.

## Tarefas
### A — W1 (motor)
1. Extração sem raciocínio: `thinking` desligado (ou omitido) e, no caminho por ferramenta, `tool_choice` forçado na ferramenta
   (o forçado pula o thinking). Vale para a **extração** (renderer: OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO, CERVICOMETRIA,
   TIREOIDE, PROSTATA e demais que usam `runRendererExtraction`/`llmParsed` de extração). Writers e Livre **não mudam**.
   Rollback por env (ex.: `LLM_EXTRACTION_THINKING=adaptive`), default = desligado. Confira na doc oficial da Anthropic (skill
   claude-api) o formato exato de thinking desligado no Haiku 5.5 e se `tool_choice` forçado é compatível com o que já usamos.
2. Medir pela assinatura: a bancada já intercepta a Anthropic e chama `claude -p`. Faça o shim respeitar "sem raciocínio"
   (ex.: `MAX_THINKING_TOKENS=0` no ambiente do `claude -p`, ou o equivalente documentado do Claude Code — **confirme na doc** e
   prove no stream-json que não vem bloco de thinking). Rode extração atual × sem raciocínio nos mesmos casos: obstétrica+Doppler 46,
   morfológico 23, tireoide 20 (BENCH_MODEL=claude-haiku-5-5 explícito). Compare **campo a campo** os JSONs extraídos e o placar do
   laudo (frases-padrão, IG, biometria, lacunas); conte tokens de saída. Meta: nenhuma piora clínica; se houver, mostre os casos.
3. Ganhos baratos de saída: a extração pode omitir campos nulos/vazios em vez de escrever todos? (só se o parser aceitar sem
   mudar o renderer; medir tokens).
4. Cache do prompt: confira se o system+tools da extração estão realmente sendo cacheados (estável entre chamadas — sem data/hora
   ou conteúdo variável antes do ditado) e registre `cache_read_input_tokens` no audit/log para medirmos em produção.
5. Sanity: avaliar `effort: low`/sem raciocínio também (roda depois do done; só custo) — proponha, com bancada curta.
Status: linha `W16A: pronto` no `status/W1.md`. Nada de push/deploy/env.

### B — W4 (andamento na tela)
O iOS já mostra andamento (flag `RENDERER_PROGRESS` / eventos SSE de progresso). Estude ponta a ponta: quais eventos a API emite
no caminho do renderer e quando (route.ts), e como o app Swift (`~/laudousg-swift/LaudoUSG`, repo `LaudoUSG-app`) os exibe.
Proponha (e implemente o lado da API, atrás de flag) melhorias: etapas reais com tempo (recebido → lendo o ditado → montando o
laudo → pronto), primeiro evento imediato, e — se seguro — começar a mostrar o laudo por seções assim que o renderer montar
(sem esperar a pós-geração). Mudança no app Swift: só proposta + diff, sem build/push (o Luiz decide). Status: `status/W16B.md`.

## Pedido extra do Luiz (W16A)
Junto com os números, um **HTML local** (em `tmp-review/bench-haiku/w16/`) para comparar na prática laudos gerados **com raciocínio
× sem raciocínio**, lado a lado, com as diferenças destacadas e o laudo final do médico como referência: alguns casos de
**obstétrica, Doppler obstétrico e morfológico** (pode incluir ditados sintéticos simulando o mobile). Mostre por caso os tokens
de saída e o tempo medido. Reaproveite o `relatorio.py` da bancada.

## W16C — destravar a extração sem raciocínio (W1, depois da W16A)
Resultado da W16A: sem raciocínio, obstétrica 18,3 s → 5,8 s, mas IG da conclusão errada em 4/46 (IG de referência ditada
ficou vazia e o renderer projetou a 1ª US), tireoide perdeu TI-RADS em 1 caso, ~15 números a menos.
1. **Leitor determinístico** (sem LLM) da IG de referência ditada — "hoje com X semanas e Y dias", "IG pela ultrassonografia precoce
   X semanas", variantes de ASR — preenchendo `ig_referencia_hoje_*` (e afins) **só quando o extrator deixou vazio**; nunca
   sobrescreve o que veio. Testes positivos/negativos (negação, "na primeira US com…", datas).
2. Investigue os ~15 números perdidos (BCF, peso, CC…): se for padrão, outro preenchimento determinístico do mesmo tipo (como o
   bloco da calculadora já faz no morfológico) ou um ajuste curto no prompt de extração.
3. **Raciocínio por categoria**: `LLM_EXTRACTION_THINKING` aceitar lista (ex.: `OBSTETRICA,DOPPLER_OBSTETRICO,MORFOLOGICO,
   CERVICOMETRIA` sem raciocínio; o resto adaptativo). Tireoide fica adaptativa.
4. Re-medir pela assinatura (proxy local da W16A): obst+Doppler 46, morfológico 23, 2 execuções; meta = nenhuma piora clínica
   × com raciocínio. Atualizar o HTML `tmp-review/bench-haiku/w16/html/` com a nova coluna.
Status: linha `W16C: pronto` no `status/W1.md`.

## W16D — corrigir os erros do modo sem raciocínio (decisão do Luiz, 11/10)
O Luiz gostou do **sem raciocínio com ferramenta forçada** e quer seguir com ele, corrigindo os erros por ajustes pequenos (prompt de
extração e/ou determinístico). Exemplos que ele viu no HTML da W16C:
- **Morfológico 1º tri**: acertou a frase do ducto venoso na conclusão (que o médico esqueceu), mas **removeu "Morfologia fetal normal
  para esta fase da gestação."**, que é **obrigatória** no morfológico mesmo sem ser ditada.
- **Morfológico 2º tri**: **tirou as siglas** das estruturas — "Comprimento do fêmur direito (CF) de 43,2 mm" virou "Comprimento do
  fêmur direito de 43,2 mm" — "entre outros detalhes".
Tarefa (W1):
1. Ache a causa de cada um (frase fixa do renderer que não saiu porque um campo veio vazio/diferente? texto indo para a camada livre em
   vez do campo estruturado? regra do prompt de extração?). Corrija na causa, de forma enxuta. A frase obrigatória do morfológico deve
   ser garantida pelo renderer (determinística), não pelo modelo.
2. Varra **todas** as diferenças sem raciocínio × com raciocínio × final no HTML (obst 46, Doppler, morfo 23) e classifique: o que é
   erro corrigível por prompt/determinístico, o que é variação aceitável, o que é melhoria (como o ducto venoso). Corrija os
   corrigíveis.
3. Re-medir pela assinatura (proxy sem raciocínio, ferramenta forçada, 2 execuções, data do caso) e atualizar o HTML com a coluna
   nova; meta: siglas e frases obrigatórias 100%, e nenhuma piora clínica × com raciocínio.
Status: linha `W16D: pronto` no `status/W1.md`.
