# Sessão longa — migração de modelo + toggle "laudo difícil" + categorias Livre/Teste + destravar bloqueadas

**Data:** 22/07/2026. Pedido do Luiz. Papéis: Claude = plano-mestre/orquestração; Dex2 = decisões/planos; Dex1 = execução de código longo.
**Base de pesquisa:** `docs/pesquisa-modelos-ia-laudos-2026-07-22.md` (deadline gpt-4.1-mini 14/10/2026; recomendação GPT-5.4 mini reasoning=low).

## Insight arquitetural que unifica tudo
O writer (`apps/api/src/server/pipeline/writer.ts`) já: (a) escolhe o modelo por `env().OPENAI_MODEL_WRITER`; (b) trata reasoning models (`gpt-5*`) vs clássicos automaticamente (reasoning_effort vs temperature); (c) tem o caminho **`rawUserMessage`** = writer PURO a partir do ditado cru (sem structurer). O route (`generate/route.ts`) já ramifica **RENDERER_CATEGORIES → renderer** senão **writer**, e no FAST_PATH manda `rawUserMessage`.
→ **Toggle difícil, categoria Livre e categoria Teste são a MESMA espinha:** "writer puro, modelo parametrizável, sem renderer". Só muda o ponto de entrada e qual modelo resolve.

**Peça central (nova):** `resolveWriterModel(ctx)` — dado `{mode, categoryCode}`, devolve `{model, reasoningEffort, baseUrl?, apiKey?}`. Config via env (Teste swappável sem deploy). O writer passa a aceitar override; o route decide o modo.

---

## FRENTE A — Migração para GPT-5.4 mini (writer + structurer) [CONFIRMADA pelo Luiz]
Deadline real: gpt-4.1-mini morre 14/10/2026. GPT-5.4 mini é reasoning model → o writer JÁ trata isso (usa `reasoning_effort`).
- **Env:** `OPENAI_MODEL_WRITER=gpt-5.4-mini` + `OPENAI_WRITER_REASONING_EFFORT=low` (ou `minimal`); `OPENAI_MODEL_STRUCTURER=gpt-5.4-mini`.
- **Prompt caching:** manter (o writer já lê `cached_tokens`) — corta o input do system prompt de estilo.
- **Rollout seguro (decisão Dex2):** NÃO flipar prod às cegas. Validar primeiro na categoria **Teste** e em device com casos reais (metodologia `model-benchmark.html`: TTFT + tempo + estilo sem markdown + comando + fidelidade + alucinação). Depois flipar `OPENAI_MODEL_WRITER` em prod. `chat-latest` path intacto = rollback trivial.
- **Risco:** GPT-5.4 mini pode escrever mais verboso/markdown que o 4.1-mini → reforçar no system prompt "texto corrido, sem markdown" e reasoning=low (não max).

---

## FRENTE B — Toggle "LAUDO DIFÍCIL" (ultrathink) [PLANEJAR + implementar]
**Conceito do Luiz:** toggle discreto; ao ativar, o botão "Gerar laudo" muda de cor; a partir dali os laudos saem por um modelo mais atual/caro, **sem efeitos determinísticos (writer puro)**, **rápido (sem reasoning)**, considerando **exclusivamente o modelo padrão (template da categoria) + a descrição dos achados daquele momento**.

### É possível? SIM — é aditivo e de baixo risco. Como:
1. **Request:** novo campo `mode: "standard" | "hard"` (default standard). App envia `hard` quando o toggle está ON.
2. **Backend (route):** se `mode==="hard"` →
   - **força o caminho writer PURO** (ignora RENDERER_CATEGORIES/renderer e a montagem determinística);
   - **contexto exclusivo:** system message = **template padrão da categoria** (o `modelo/template-padrao.md` da categoria) + regras mínimas de estilo; user message = **ditado cru** daquele momento. SEM RAG few-shots (evita "sujar"). Isso atende o "exclusivamente".
   - **modelo premium via `resolveWriterModel`:** `HARD_MODE_MODEL` (ex.: `gpt-5.4` full) com `reasoning_effort=minimal` → inteligente MAS rápido.
   - **guards de SEGURANÇA clínica PERMANECEM** (sanity: umbilical/oligoâmnio/medida implausível/alucinação) — são aviso não-bloqueante, não reescrita; segurança do paciente não é "efeito determinístico de estilo". (DECIDIR c/ Dex2 — recomendo manter.)
3. **Frontend:**
   - **iOS (Swift):** toggle discreto (ex.: pequeno switch ao lado do seletor de categoria, ou no menu). Botão "Gerar laudo" muda de cor (verde → roxo/âmbar "premium") quando ON. Envia `mode:"hard"`.
   - **Android (RN):** espelhar.
   - Estado do toggle **por sessão** (não persistente global) — o médico liga só quando precisa.
4. **Flag:** `HARD_MODE_ENABLED` (default OFF) — libera quando validado.

### Por que "sem reasoning" com um modelo premium?
GPT-5.4 full em `reasoning_effort=minimal` = base mais inteligente que o mini, sem os 40s do reasoning alto. Mantém streaming rápido. Custo maior ($2,50/$15) só nos laudos que o médico escolher — aceitável.

---

## FRENTE C — Categorias LIVRE e TESTE [implementar]
Ambas = **writer puro + regras gerais da casa**, aparecem no seletor (linhas na tabela `categories`).
- **LIVRE:** modelo = padrão novo (**GPT-5.4 mini**). Uso: qualquer exame sem categoria cadastrada. Escape hatch geral.
- **TESTE:** modelo = experimental **swappável por env** (`TESTE_CATEGORY_MODEL` + `TESTE_CATEGORY_BASE_URL` + `TESTE_CATEGORY_API_KEY`). Começar com **DeepSeek V4** (mais atual; API compatível-OpenAI → reusa o client OpenAI com base_url/key trocados). Luiz troca o modelo periodicamente sem deploy.
  - ⚠️ **PHI:** DeepSeek é nuvem na China → o ditado do paciente trafega p/ lá. É categoria de TESTE do próprio Luiz (dado dele, escolha dele) — implementar com o modelo atrás de env (desligável) e registrar o aviso. Confirmar com Dex2/Luiz.

### System prompt geral (LIVRE/TESTE) — regras da casa (de `docs/estilo-casa-regras-gerais.md`) + "Nãos"
**Estrutura:**
- `COMENTÁRIOS:` detalhes do transdutor/método.
- `OS SEGUINTES ASPECTOS FORAM OBSERVADOS:` descrição (corpo é DESCRITIVO).
- `CONCLUSÃO:` impressão diagnóstica, numerada, SEM repetir frases do corpo.

**Vocabulário:** `hipoecoico/isoecoico/hiperecoico/anecoico` — NUNCA `ecogênico`. `líquido` (não "líquido anecoico"). "sólido" OU "hipoecoico", não os dois.

**Os "NÃOS" (segurança/fidelidade):**
- NÃO inventar dados/medidas/lateralidade/achados que não foram ditados.
- NÃO classificar (BI-RADS/TI-RADS/O-RADS/PI-RADS) se o médico não ditou.
- NÃO derivar DUM de IG; NÃO emitir data inválida.
- NÃO transformar "processo expansivo/imagem" em "neoplasia/tumor/câncer".
- NÃO diagnosticar no corpo (diagnóstico só na CONCLUSÃO).
- NÃO repetir no corpo e na conclusão a mesma frase.
- NÃO usar markdown (negrito, asteriscos, listas markdown) — texto corrido de laudo.
- NÃO dropar medida/achado que o médico ditou.
- Conduta/recomendação só se ditada; formato "convém... a critério clínico" quando fizer sentido.
- Lateralidade (direito/esquerdo) fiel ao ditado; na dúvida, não inventar.

---

## FRENTE D — Destravar categorias bloqueadas [pesquisar + plano]
Categorias sem modelo/renderer validado (o Luiz citou: **partes moles, região inguinal, Doppler de carótidas e vertebrais**, etc.). URGENTE.
- **Mapa (22/07):** renderers ativos (11): ABDOMEN_SUPERIOR, CERVICAL, MAMARIA, MORFOLOGICO, MUSCULOESQUELETICO, OBSTETRICA, PARTES_MOLES, PELVE_FEMININA, PROSTATA_SUPRAPUBICA, TIREOIDE, VIAS_URINARIAS. **Correção:** *partes moles NÃO está bloqueada* (tem renderer + writer). **Bloqueadas de fato** (têm snippet curado mas sem renderer/writer validado): **DOPPLER_CAROTIDAS** (inclui vertebrais), **REGIAO_INGUINAL**, **OCULAR**, **PARATIREOIDE**, **PAREDE_ABDOMINAL**, **TRANSFONTANELA**, **PROSTATA_TRANSRETAL/TRANSABDOMINAL**, **ESCROTAL**, **DOPPLER_FISTULA_AV**. (DOPPLER_ARTERIAL/RENAL/VENOSO = writer_guarded, pilotos já vivos.)
- **Alívio imediato:** a categoria **LIVRE** já cobre qualquer exame não cadastrado (o médico usa Livre enquanto a categoria dedicada não existe). Frente C destrava o uso HOJE.
- **Plano definitivo:** para cada bloqueada, decidir writer_guarded (few-shots curados) vs renderer, e curar o template. Delegar curadoria/few-shots depois (padrão dos writers já validado: PELVE/PARTES_MOLES/DOPPLER_RENAL).

---

## Sequência de execução
1. **Backend núcleo (Dex1):** `resolveWriterModel` + writer aceita override de modelo/effort/baseUrl + route respeita `mode:"hard"` e categorias Livre/Teste (força writer puro). tsc 0 + testes. Flag-gated.
2. **Categorias Livre/Teste (Dex1):** migration/SQL insere as linhas na `categories`; system prompts gerais; DeepSeek via client OpenAI-compat (env).
3. **Env/migração A:** setar GPT-5.4 mini (writer/structurer) + reasoning=low; validar na Teste antes de flipar prod.
4. **Frontend toggle (Dex2/Dex1):** iOS switch discreto + cor do botão + `mode:"hard"`; espelhar Android.
5. **Frente D:** pesquisa das bloqueadas + plano de curadoria.
6. Validar em device (casos reais) + memória + handoff.

## DECISÕES DEX2 (22/07 — registradas, valem)
1. **Hard mode + guards:** manter os guards de segurança, MAS garantir que sejam ALERTA (advisory), não reescrita. Se um guard hoje reescreve o texto (não é advisory), no modo hard ele vira só alerta. Maior risco funcional: chamar de "writer puro" enquanto sanitizers/guards posteriores ainda alteram o texto → auditar o pós-processamento.
2. **Modelos (corrigido):** writer padrão `gpt-5.4-mini` effort `low` ✅. Hard = `gpt-5.4` (full) effort **`low`** — ⚠️ **`minimal` NÃO existe na família 5.4** (níveis: none/low/medium/high/xhigh). DeepSeek: usar **`deepseek-v4-pro`** (qualidade) ou **`deepseek-v4-flash`** (velocidade) — `deepseek-v4` NÃO é ID válido; `deepseek-chat` é alias temporário com retirada 24/07. Família 5.4 é válida (não a mais nova) — não misturar outra troca nesta migração.
3. **DeepSeek/PHI:** SIM, mas só com dados sintéticos/desidentificados/do próprio Luiz. Env-off + aviso NÃO bastam: **restringir TESTE no servidor à conta do Luiz**, logar provider/model, **fail-closed** se config ausente. Nenhum ditado de paciente real vai ao provider sem revisão de LGPD/contrato/retenção.
4. **Livre/Teste = categorias REAIS no DB** (preserva histórico/analytics/templates/normalização/paridade). LIVRE aparece normal; **TESTE = linha experimental PRIVADA, retornada só p/ usuários autorizados**. Toggle hard = MODO de geração, não categoria.
5. **Rollout (corrigido):** (a) TESTE → gpt-5.4-mini primeiro, validar goldens + device, SÓ ENTÃO mudar `OPENAI_MODEL_WRITER`; depois trocar TESTE p/ DeepSeek (resultado DeepSeek NÃO valida a migração OpenAI). (b) **Structurer precisa de validação SEPARADA** (writer puro não passa por ele). (c) ⚠️ **DEADLINE 14/10 NÃO confirmado para a API** — a página oficial de depreciações NÃO lista desligamento do gpt-4.1-mini na API; a retirada foi no ChatGPT, API segue disponível. Migrar cedo mesmo assim, mas SEM usar esse prazo como fato.
6. **resolveWriterModel (ajustado):** retornar `{provider, model, reasoningEffort, client/credentialRef}` — **NUNCA a API key crua** em objeto que possa cair em log. Separar em DOIS resolvers: `resolveWriterModel(ctx)` (qual modelo) + **`resolveGenerationPath(ctx)`** (renderer vs RAG vs writer-puro + política de pós-processamento). **Cada provider tem seu adapter** (OpenAI-compat não garante params idênticos). Config inválida FALHA, nunca troca de provider em silêncio.
- **Riscos extras (Dex2):** sanity por IA pode mandar o mesmo ditado ao DeepSeek e depois à OpenAI → no TESTE externo usar sanity determinístico ou o mesmo provider. Logar o modelo efetivamente resolvido; considerar fixar snapshots pós-piloto (evitar mudança silenciosa de alias).
