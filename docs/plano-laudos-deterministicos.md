# Plano — Migração para Laudos Determinísticos

> **Status geral:** 🟢 Em execução — DET-1 ✅ em prod; próximo trabalho: **DET-2** (expansão às 13 categorias ativas)
> **Última atualização:** 2026-06-11
> **Decisão formal:** `docs/adr/0004-montagem-deterministica-laudos.md`
> **Origem:** análise Claude Code + validação crítica Codex/dex1 (2026-06-11), aprovada pelo Luiz
> **Repos envolvidos:** este monorepo (`apps/api/` — quase tudo) + `~/laudousg-swift/LaudoUSG` (só DET-4)

---

## Como retomar este plano em 5 minutos

1. Leia a seção **Contexto** abaixo (por que estamos fazendo isso).
2. Olhe o **Quadro de status** — o primeiro sprint sem ✅ é o próximo trabalho.
3. Cada sprint tem **Entregáveis**, **Arquivos-alvo** e **Critérios de aceite** — é autossuficiente.
4. **A decisão determinístico > RAG já está tomada e fechada (ADR-0004).** Não gastar tempo
   provando/medindo um contra o outro. Os casos golden estruturais existem só como critério
   de aceite e regressão do pipeline NOVO — nunca como comparação com o RAG.

### Quadro de status

| Sprint | Nome | Status |
|---|---|---|
| DET-1 | Bundle determinístico mão na massa (piloto ABDOMEN_TOTAL) | ✅ concluído 2026-06-11 — commit `a6e7c52` em prod com flag `DETERMINISTIC_BUNDLE_CATEGORIES=ABDOMEN_TOTAL`; golden 18/18; caching ~99%; laudo real validado pelo Luiz em prod (run `[deterministic_bundle]`, success). Saneamento: `docs/det-1-saneamento-abdomen-total.md` |
| DET-2 | Expansão a todas as categorias + desligar retrieval vetorial normativo | ✅ substancialmente concluído 2026-06-11 — 13 categorias ativas no bundle em prod (commits `17b6387`/`70bb9ab`/`6371492`, flag com 13 categorias); seletor de variante generalizado (multi-way por `variant:`); 35/35 golden; caching ~99%. Saneamento: `docs/det-2-ondas-pequenas.md` + `docs/det-2-categorias-grandes.md`. **Pendente (deferido p/ após estabilidade em prod):** remoção física do caminho vetorial normativo (quotas/overrides/RPC) — hoje é o fallback de rollback. |
| DET-3 | Variantes de máscara (entidade 1ª classe + preferências da conta) | ⬜ não iniciado |
| DET-4 | iOS: seletor de máscara nas Preferências | ⬜ não iniciado |
| DET-5 | Structured extraction + renderer (piloto 1 categoria) | ⬜ não iniciado |
| DET-6 | Comandos como operações + vocabulário pessoal curado | ⬜ não iniciado |

---

## Contexto (por que este plano existe)

### O problema

O pipeline atual de `/api/generate` usa **RAG vetorial**: o conhecimento de cada categoria
(modelos/máscaras, regras, frases, conclusões) foi fragmentado em blocos na tabela
`knowledge_blocks`, recuperados por embedding + prioridade + quotas por kind
(`apps/api/src/server/pipeline/retriever.ts`). Resultado em produção: **erros frequentes** —
frases modificadas aleatoriamente, conteúdo em posição errada, e até a estrutura padrão
imutável (COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM OBSERVADOS / CONCLUSÃO) quebrada.
Enquanto isso, os custom GPTs originais do Luiz (prompt monolítico por categoria) acertavam
quase sempre com o mesmo input.

### O diagnóstico (evidências no código)

1. **RAG é a ferramenta errada para conhecimento pequeno e curado.** O maior prompt de
   categoria tem 1.604 linhas (MSK) — cabe inteiro no contexto, sempre. Recuperação vetorial
   só adiciona variância.
2. **O template compete por vaga**: kind `modelo` entra numa quota top-2 por similaridade
   (`retriever.ts`, DEFAULT_QUOTAS). Os overrides `modelo: 12` em PELVE_FEMININA e
   MORFOLOGICO são band-aids admitindo a falha.
3. **Só 6 de 34 categorias têm contrato hardcoded** (`server/prompts/contracts/`); as outras
   28 dependem 100% do RAG recuperar o bloco certo. Fallback `RAG_EMPTY` = system prompt de
   1 frase, sem estrutura nenhuma (`buildSystemMessage.ts`).
4. **Fast-path** (default) embedda o ditado cru → recuperação sensível a como o médico falou.
5. **11 post-processors determinísticos** (`generate/route.ts:705-778`) corrigindo o que o
   contexto fragmentado quebrou — sintoma de luta contra a arquitetura.
6. **Prompt variável quebra o prompt caching** da OpenAI → mais caro e mais lento, de graça.

### A decisão (fechada — ADR-0004)

Frase-síntese do dex1: **"O produto não deve ser 'LLM escreve laudo a partir de contexto'.
Deve ser 'LLM entende o ditado; o sistema monta o laudo'."**

Arquitetura alvo:

```
Ditado do médico
   ↓
1. Chaves FIXAS: categoria → estilo → variante de máscara (preferência da conta)
   ↓
2. BUNDLE determinístico: regras globais + contrato + máscara da variante
   + regras/frases validadas da (categoria, variante) — SELECT por chave, ZERO embedding
   ↓
3. LLM structurer (temp 0, structured outputs com JSON schema da categoria):
   ditado → achados estruturados + comandos
   ↓
4. RENDERER (código TS): máscara + achados → laudo com estrutura GARANTIDA por construção
   (LLM secundário só para slots de texto patológico livre)
   ↓
5. Comandos aplicados como OPERAÇÕES estruturadas (replace_phrase, add_conclusion_item…)
   ↓
6. Sanity determinístico + guards (cinto de segurança, não muleta)
```

Princípios inegociáveis do plano (definidos pelo Luiz):
- **Previsibilidade máxima**: mesmo input → mesmo laudo. Zero aprendizado automático.
- Personalização SÓ explícita: variante de máscara escolhida nas preferências + vocabulário
  pessoal curado e opt-in.
- `knowledge_blocks` vira **CMS** (autoria/versionamento via lab.laudousg.com/blocks),
  deixa de ser índice de busca. O trabalho de curadoria NÃO é jogado fora.
- Fine-tuning e troca para modelo open-source: **descartados** (não garantem estrutura).
- **Não medir RAG vs determinístico** — decisão já tomada; energia vai para construir, não
  para convencer.

### O LaudoUSG original (web) — papel no plano

O produto original (`~/laudousg/`, em PROD em laudousg.com, Next.js multiplataforma, DB
`https://gimxiyjfuaqptahssqgb.supabase.co`) **já implementa a metodologia determinística**
que este plano recria: prompts monolíticos por categoria (`lib/categoryDefaults.ts`,
~4.835 linhas, 34 categorias) + regras globais (`lib/globalRules.ts`), validados em uso real
— o Luiz ainda o utiliza. Decisão (2026-06-11): **NÃO migrar o trabalho para o repo
original.** Ele continua intocado em prod. Seu papel no plano:

1. **Fonte de verdade VIVA dos conteúdos** — não a extração estática: o saneamento de cada
   categoria (DET-1/DET-2) sincroniza o bundle a partir de
   `~/laudousg/lib/categoryDefaults.ts` + `globalRules.ts` (leitura apenas).
   Verificado em 2026-06-11: a extração `_extraction/` está em dia (snapshot `9da68fd`
   2026-05-14, posterior às últimas mudanças de prompt: categoryDefaults 2026-05-12,
   globalRules 2026-05-04). Se o Luiz ajustar prompts no original, o diff-script acusa drift.
2. **Por que não voltar para ele:** o backend mobile tem infra que o iOS consome e o
   original não tem (SSE com structurer/sanity/auditoria — 1.357 runs em `generation_runs`,
   transcribe, IAP, Sala do Auxiliar, profile, beta whitelist); as bases de usuários/reports
   são separadas (mobile em `yldtkqrsbgcnwlydrrot`, web em `gimxiyjfuaqptahssqgb`); e o salto
   real (structurer + renderer, DET-5) não existe no original também — ele é o teto da
   abordagem por prompt, não a arquitetura destino.

⚠️ **Cuidado para não misturar os bancos:** o MCP `supabase-db` (ativo) aponta para o banco
MOBILE (`yldtkqrsbgcnwlydrrot` ✅) — migrations deste plano SÓ aqui. O MCP
`supabase-original-readonly` (config global, renomeado em 2026-06-11) aponta para o banco do
ORIGINAL (`gimxiyjfuaqptahssqgb`) — usar apenas para leitura/diagnóstico do original.

### Futuro fora de escopo (registrar, não fazer agora)

Depois do DET-5 consolidado, avaliar um **DET-7: unificação** — o frontend web passar a
consumir o engine novo (`apps/api`), encerrando a duplicação de prompts entre os dois
produtos. Pré-requisito: engine novo maduro em produção mobile e plano de migração de dados.
Até lá, o original não é tocado.

### Visão de produto que este plano habilita

O médico tem máscaras/modelos de laudo (como tinha no Word). A plataforma:
1. **Preenche as lacunas** da máscara com o que foi ditado (renderer + structurer).
2. **Entende comandos** ("mude a frase X", "adicione item Y na conclusão") como operações
   confiáveis que nunca bagunçam o resto do laudo.
3. **Permite escolher entre 1-2+ máscaras alternativas por categoria nas preferências da
   conta** (DET-3/DET-4) — cada médico com seu estilo, por chave fixa, nunca por similaridade.
4. **Aceita vocabulário pessoal ensinado explicitamente** (DET-6), sem aprendizado silencioso.

---

## Validação contínua (higiene de engenharia, não comparação)

Cada categoria migrada ganha **casos golden estruturais** (≥10-15, extraídos dos laudos
reais anonimizados em `_extraction/.../07-laudos-reais-anonimizados/`) que validam o
pipeline NOVO: cabeçalhos presentes e na ordem exata, numeração canônica da conclusão,
frases proibidas ausentes, placeholders `____` corretos, fidelidade (nada omitido, nada
inventado), casos negativos. Servem de critério de aceite do sprint e de regressão dos
seguintes. O harness aproveita a suíte golden do S27. **Não existe etapa de "medir o RAG"**
— o baseline é dispensável porque a decisão já está tomada.

---

## Sprints

> Cada sprint segue o ciclo padrão: implementar → review dex1 → ajustes → @devops commit/push
> → deploy Vercel.

### DET-1 — Bundle determinístico mão na massa (piloto ABDOMEN_TOTAL) 🎯

**Objetivo:** eliminar a variância de retrieval para a categoria-piloto, JÁ construindo o
caminho novo. Saneamento e validação embutidos no próprio sprint.

**Entregáveis:**
- **Saneamento da categoria-piloto:** reconciliar os blocos de ABDOMEN_TOTAL com a fonte
  viva (`~/laudousg/lib/categoryDefaults.ts` + `globalRules.ts`): manter/corrigir/arquivar
  duplicatas e blocos "quase certos". Variantes conflitantes (ex: modelo padrão vs modelo
  com Doppler esplâncnico) NÃO entram juntas no bundle — seleção condicional explícita no
  contrato.
- Flag de ambiente `DETERMINISTIC_BUNDLE_CATEGORIES` (lista de category_codes) em
  `apps/api/src/server/env.ts` (padrão zod já usado, ex: `FAST_PATH_DEFAULT` linha 41).
- Novo `apps/api/src/server/pipeline/bundleLoader.ts`:
  `SELECT * FROM knowledge_blocks WHERE category_code=? AND writing_style_id=? AND
  status='validated' ORDER BY kind, priority DESC` — **sem embedding, sem quota, sem RPC
  vetorial**.
- `buildSystemMessage.ts`: para categorias na flag, montar com **prefixo estável**
  (regras globais → contrato → bundle → few-shots; dado variável SEMPRE por último) para
  maximizar prompt caching. Ordem de blocos determinística (kind, priority, id).
- Fallback `RAG_EMPTY` **eliminado** para categorias na flag: bundle vazio = erro alto e
  claro no SSE (`blocked`), nunca laudo sem estrutura.
- Casos golden estruturais de ABDOMEN_TOTAL (validação contínua, ver seção acima).
- Categorias fora da flag: caminho RAG atual intocado (rollback trivial = tirar da flag).

**Critérios de aceite:**
- Casos golden de ABDOMEN_TOTAL passando (zero erro estrutural).
- Logs de uso confirmam prompt caching ativo (campo `cached_tokens` no usage da OpenAI).
- Deploy em prod com a flag ligada para ABDOMEN_TOTAL; laudos reais saindo corretos.

---

### DET-2 — Expansão + desligar retrieval vetorial normativo 🌊

**Objetivo:** todas as categorias ativas no bundle determinístico; aposentar o caminho vetorial
para conteúdo normativo.

**Entregáveis:**
- Rollout em ondas pelas 13 categorias ativas do picker, em ordem de volume (MAMARIA,
  TIREOIDE, OBSTETRICA, …). Cada onda = saneamento da categoria (fonte viva) + casos golden
  mínimos + flag ligada.
- **Script de diff/sync** (leitura apenas no original): compara conteúdo do bundle vs
  `~/laudousg/lib/categoryDefaults.ts`/`globalRules.ts` e acusa drift — protege contra
  ajustes que o Luiz fizer lá, já que ele ainda usa o original.
- Remover: quotas por kind, overrides `modelo:12`, RPC `match_knowledge_blocks` para kinds
  normativos. Infra de embedding **permanece** apenas para uso futuro em vocabulário pessoal
  (DET-6) — ou é removida se decidirmos filtro textual.
- Revisão dos 11 post-processors (`generate/route.ts:705-778`): quais viram redundantes com
  bundle completo? Rebaixar para warnings de sanity onde possível.
- Auditoria contínua: query em `generation_runs`/`generation_audit` acompanhando taxa de
  sanity issues por categoria migrada.

**Critério de aceite:** 13 categorias ativas no bundle; casos golden de todas passando;
caminho vetorial normativo morto no código (não só desligado).

---

### DET-3 — Variantes de máscara como entidade de 1ª classe 🗂️

**Objetivo:** habilitar 1-2+ máscaras alternativas por categoria, selecionáveis por conta.
Máscara deixa de ser "bloco kind=modelo" e vira entidade própria com chave fixa.

**Entregáveis:**
- Migration `report_template_variants`: `id, category_code, writing_style_id, variant_key,
  name, version, status (draft|validated|archived), template_body, renderer_schema (jsonb,
  nullable — usado a partir do DET-5), rules, created_by, approved_at`.
- Migration `account_report_preferences`: `user_id, category_code, default_variant_id`
  (RLS: user lê/escreve só o próprio).
- Seed: variante `padrao` para cada categoria ativa (conteúdo = modelo canônico atual).
- `bundleLoader.ts` resolve variante: preferência da conta → senão variante `padrao`.
  **Por chave fixa, nunca por similaridade.**
- Admin no lab (lab.laudousg.com): CRUD de variantes (criar "máscara 2" = INSERT validado).
- API: `GET/PATCH /api/me/report-preferences` (ou extensão do `/api/me/profile`).

**Critério de aceite:** 2 variantes reais em 1 categoria (sugestão: TIREOIDE ou ABDOME);
trocar a preferência via API muda o laudo gerado de forma determinística; casos golden para
ambas as variantes.

---

### DET-4 — iOS: seletor de máscara nas Preferências 📱

**Objetivo:** o médico escolhe a máscara no app, uma vez, nas preferências da conta.

**Repo:** `~/laudousg-swift/LaudoUSG` (este é o ÚNICO sprint fora do monorepo).

**Entregáveis:**
- `SettingsView`: seção "Modelos de laudo" — por categoria que tenha >1 variante, um picker
  (mesmo padrão do picker de Writing Style já existente).
- Consumo do endpoint do DET-3 (`ProfileService` + `AppState`).
- Sem mudança no fluxo de geração do app: o backend resolve a variante pela preferência.

**Critério de aceite:** trocar a máscara no Settings → próximo laudo gerado usa a variante
escolhida; build verde; testado E2E no Simulator.

---

### DET-5 — Structured extraction + renderer (piloto 1 categoria) 🏗️

**Objetivo:** o salto real além do custom GPT. O LLM para de escrever o laudo; passa a
extrair dados. O código monta o laudo — estrutura garantida por construção.

**Entregáveis:**
- JSON Schema de achados por categoria (piloto ABDOMEN_TOTAL: fígado, vesícula, vias
  biliares, baço, pâncreas, rins D/E, aorta, bexiga + lesões/medidas + slot de texto livre
  patológico).
- Structurer estendido: structured outputs strict com o schema da categoria (infra de
  `response_format: json_schema` já existe em `structurer.ts`).
- `apps/api/src/server/pipeline/renderer.ts`: `template_body` da variante (com slots
  nomeados) + achados JSON → laudo final. Cabeçalhos, ordem, numeração e placeholders `____`
  saem do código, não do LLM.
- LLM secundário SÓ para redigir slots de texto patológico livre (quando o caso foge da
  máscara), dentro de delimitadores.
- Flag por categoria (`RENDERER_CATEGORIES`); caminho writer do DET-1 continua como fallback.

**Critério de aceite:** na categoria-piloto, estrutura **byte-estável** (mesmo input → mesmo
laudo, exceto slots livres); casos golden 100%; latência igual ou melhor que o writer.

---

### DET-6 — Comandos como operações + vocabulário pessoal 🤖

**Objetivo:** a visão de "agente" do produto, confiável: comandos viram operações que nunca
bagunçam o resto do laudo. Personalização explícita, zero aprendizado automático.

**Entregáveis:**
- Conjunto fechado de operações: `replace_phrase`, `add_conclusion_item(position)`,
  `remove_item`, `set_field`, `insert_before/after(anchor)`.
- Structurer extrai `comandos_do_medico` já tipados como operações; aplicador em código
  executa sobre o laudo renderizado. `commandGuard.ts` (regex) é aposentado gradualmente.
- Endpoint de **edição conversacional**: laudo atual + comando → operações → laudo atualizado
  (permite "mude a frase tal" DEPOIS do laudo pronto, do app).
- Vocabulário pessoal: `user_phrases` como camada de substituição determinística, curada e
  opt-in (médico ensina explicitamente: "quando eu disser X, escreva Y"). Aplicada no
  renderer. Nada se aprende sozinho.
- Casos golden de comandos a partir de uso real (extrair de `generation_runs`).

**Critério de aceite:** suíte de comandos 100%; edição conversacional E2E no app;
LGPD inalterada (nenhum dado de paciente novo armazenado).

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Curadoria incompleta amplifica erro (bundle completo expõe blocos ruins) | Saneamento embutido por categoria ANTES de ligar a flag dela (DET-1/DET-2) |
| "Tudo no contexto" gera conflito entre variantes (inicial vs padrão, TA vs TV) | Variantes conflitantes ficam FORA do bundle umas das outras; seleção condicional explícita no contrato |
| Prefixo de prompt instável anula o caching | Ordem fixa de montagem verificada via `cached_tokens` no usage (DET-1) |
| LLM gerando texto livre nunca é 100% determinístico | DET-5 (renderer) é o destino; DET-1/2 são etapa intermediária honesta |
| Renderer rígido demais para casos atípicos | Slot de texto patológico livre em toda máscara (DET-5) |
| Structurer extrai errado (o erro só muda de lugar) | Casos golden cobrem extração; sanity + clarify continuam; temp 0 + schema strict |
| Regressão silenciosa na expansão | Ondas por categoria, flag + rollback trivial, casos golden como regressão |
| Misturar os bancos (mobile vs original) | MCP `supabase-db` = mobile `yldtkqrsbgcnwlydrrot` (migrations SÓ aqui); MCP `supabase-original-readonly` = original `gimxiyjfuaqptahssqgb` (leitura/diagnóstico apenas) |
| Prompts do original divergirem do bundle com o tempo (Luiz ainda usa o original) | Diff-script do DET-2 roda a cada sprint e acusa drift |

## O que NÃO fazer (decidido e fechado)

- ❌ Rodar testes/benchmarks para "provar" determinístico vs RAG — decisão já tomada
  (ADR-0004). Casos golden validam o pipeline novo, ponto.
- ❌ Fine-tuning de modelo (melhora estilo, não garante estrutura — "erra com mais confiança").
- ❌ Trocar para modelo open-source (o modelo nunca foi o problema; a montagem do contexto era).
- ❌ Qualquer aprendizado automático com o uso ("laudos que se aprimoram sozinhos") — o Luiz
  quer o oposto: previsibilidade. Personalização só explícita.
- ❌ Recuperação por similaridade para QUALQUER decisão de protocolo/máscara/estrutura.
- ❌ Jogar fora `knowledge_blocks`/lab — vira CMS, o trabalho de curadoria permanece.
- ❌ Mexer no repo original (`~/laudousg/`) ou no DB dele — leitura apenas.

## Referências

| Recurso | Path |
|---|---|
| ADR desta decisão | `docs/adr/0004-montagem-deterministica-laudos.md` |
| Pipeline atual | `apps/api/src/app/api/generate/route.ts`, `apps/api/src/server/pipeline/` |
| Retriever a aposentar | `apps/api/src/server/pipeline/retriever.ts` + `packages/db/src/sql/0002_retriever_rpc.sql` |
| Montagem do prompt | `apps/api/src/server/prompts/buildSystemMessage.ts`, `global.ts`, `contracts/` |
| Fonte canônica VIVA (original em prod, leitura apenas) | `~/laudousg/lib/categoryDefaults.ts` (34 categorias, ~4.835 linhas) + `~/laudousg/lib/globalRules.ts` |
| Snapshot organizado da fonte | `_extraction/from-laudousg-original/` (03-models, 04-rules, 05-phrases, 07-laudos-reais) — em dia com o original em 2026-06-11 |
| DB mobile (deste plano) | `https://yldtkqrsbgcnwlydrrot.supabase.co` — MCP `supabase-db` |
| DB do original (NÃO tocar; leitura/diagnóstico) | `https://gimxiyjfuaqptahssqgb.supabase.co` — MCP `supabase-original-readonly` |
| Schema dos blocos | `packages/db/src/schema/knowledgeBlocks.ts` |
| Harness golden (base) | suíte golden do S27 (Modo Objetivo, gate 19/20) |
| App iOS (DET-4) | `~/laudousg-swift/LaudoUSG` (`SettingsView`, `ProfileService`) — repo git: `LaudoUSG/` (a pasta-mãe `laudousg-swift/` NÃO é repo) |
