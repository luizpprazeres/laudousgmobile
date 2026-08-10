# Lab como cockpit de análise — levantamento

- **Data:** 2026-08-10
- **Origem:** correção de rumo do Luiz. A tela `/modelos` que eu construí no Lab
  pertence à **Biblioteca do usuário** (web/iOS/Android). O Lab deve ser o
  cockpit administrativo dele, para **estudar como os laudos se formam**.
- **Método:** inventário de código + **verificação empírica** (rotas testadas em
  execução, contagens medidas no banco). Nada aqui é suposição de leitura.

## O que o Luiz pediu

(a) os prompts writer que rodam em cada categoria ·
(b) auditoria dos laudos de **todas as contas** ·
(c) o ditado × o resultado gerado ·
(d) as alterações que o médico fez à mão ·
(e) o modelo de IA usado ·
(f) dissecação visual, com cores, mostrando de onde veio cada trecho

---

## 1. ⚠️ A cautela pedida: o que sobreviveu ao fim do RAG

O Luiz alertou que o Lab foi construído na era do RAG vetorial e que muita coisa
provavelmente não funciona mais. **Está certo — mas menos do que parecia.**
Verifiquei o que é fato e o que é ruína.

### Vivo (medido no banco em 2026-08-10)

| Verificação | Resultado |
|---|---|
| `generation_audit` ainda recebe linhas? | **Sim.** 1520 no total, **72 nos últimos 7 dias**, última **hoje** |
| `GENERATION_AUDIT_ENABLED` em produção | **Ligada** — o default no código é `false`, mas prod grava |
| Linhas com o **prompt completo** (`system_message_full`) | **1466** |
| Linhas com o laudo gerado (`output_text`) | 1463 |
| Linhas com o ditado (`raw_input`) | **1520** (todas) |
| Laudos com correção manual (`final_output ≠ generated_output`) | **585** |
| Usuários distintos auditados | 4 |
| Categorias e modelos nos últimos 30 dias | 25 categorias · 4 modelos (`gpt-5.4-mini`, `gpt-5.4`, `gpt-4.1-mini`, `deepseek-v4-flash`) |

**Conclusão:** o acervo está intacto e crescendo. O prompt real de 1466 gerações
está guardado — é o ativo mais valioso para o item (a), e ninguém o está usando.

### Morto (medido, não inferido — últimos 30 dias, 532 linhas)

| Métrica do RAG | Estado real |
|---|---|
| `rag_blocks_skipped` | **0 linhas** com conteúdo — `route.ts:726` declara `const skipped = []` e nunca muta |
| `similarity` dos blocos | **null em 458 de 532** — `bundleLoader.ts:289` grava `similarity: null` |
| Quotas por kind | não existem mais; a UI lê uma constante mock |

Tudo que o Lab exibe sobre **similaridade, quota e "blocos descartados"** é
teatro. Não é bug de dado: o mecanismo que os produzia foi aposentado no ADR-0004.

### Falso-negativo perigoso

`apps/lab/src/lib/supabase/audit-queries.ts:48-55` marca uma geração como
**"error"** quando `rag_blocks_retrieved` vem vazio. Medi: **74 das 532 linhas
(14 %) não têm blocos** — e isso é normal em LIVRE/TESTE e nas categorias com
renderer programático. Ou seja: **hoje o Lab acusa erro em 1 de cada 7 laudos
saudáveis.** O `/dissecador` usa a regra certa (`error_code` + veredito do
sanity, `admin/audit.ts:90-95`).

### Rotas testadas em execução (não só compiladas)

`/` `/testbench` `/modelos` `/audit` `/blocks` `/showcase` `/changelog`
`/settings` `/login` → **200**. `/reviewer` → 307 (redireciona para o laudo mais
recente, comportamento esperado). `/dissecador` (no `apps/api`) → 307.

**Nota sobre o 307 do dissecador:** ele redireciona para `/login` quando não há
sessão admin — **mas essa rota não existe no `apps/api`**. Sem cookie válido, cai
em 404. É um beco sem saída, não uma tela quebrada.

---

## 2. Requisito por requisito

| Req | Já existe | Falta | Onde plugar |
|---|---|---|---|
| **(a) prompts por categoria** | o prompt real de 1466 gerações em `system_message_full`, visível em `dissecador/[id]/page.tsx:81-86` | **ver o prompt SEM gerar laudo** — hoje é impossível | `buildSystemMessage()` já é **função pura** (`prompts/buildSystemMessage.ts:41-48`); basta um `GET /api/admin/prompt-preview` que a chame |
| **(b) todas as contas** | leitura com service role, filtros e paginação no `dissecador` (`admin/audit.ts:49-88, 249-258`) | o Lab não filtra nem mostra **quem** é o médico | levar os filtros do dissecador para `audit-queries.ts` e juntar com `profiles` |
| **(c) ditado × gerado** | ditado e laudo lado a lado (painéis separados) | alinhamento frase-a-frase, marcação de omissão/alucinação | reusar o segmentador do reviewer, trocando a fonte da atribuição |
| **(d) correção do médico** | **585 laudos** com `generated_output ≠ final_output` | **nenhuma tela lê isso** | query nova no Lab (service role) juntando `generation_audit.report_id → reports.id` |
| **(e) modelo de IA** | `model_writer` / `model_structurer` no audit | não distingue o caminho **renderer** (`generation_runs` é que recebe `"renderer/v1"`) | expor no SELECT do Lab; para precisão, ler de `generation_runs` |
| **(f) dissecação colorida** | máquina de segmentar + pintar pronta e boa (`segment-builder.ts`, `LaudoForensic.tsx`, `TrechoTiered.tsx`) | a **atribuição** é Jaccard ≥ 0,12 contra blocos do RAG — ficção nas categorias com renderer | manter o render, trocar a função de atribuição por procedência real |

---

## 3. Reaproveitar · aposentar · criar

### Reaproveitar (o ativo é maior do que parecia)
1. **A camada visual do reviewer** — `LaudoForensic.tsx`, `TrechoTiered.tsx`,
   `LegendBar.tsx`. Segmenta o laudo em seções e frases e pinta com legenda. É
   exatamente o esqueleto de (f); só a fonte da cor está obsoleta.
2. **Os filtros e a paginação do dissecador** (`admin/audit.ts:249-258`) — o Lab
   não os tem, e são precisamente o que falta para (b).
3. **O painel `system_message_full` do dissecador** — hoje é o **único** lugar
   que mostra o prompt real. Não existe no Lab.
4. **O proxy SSE do testbench** — plumbing pronto para "gerar um caso e observar".
5. **`markdownForAudit()`** (`admin/audit.ts:176-247`) — exporta uma geração
   inteira em markdown, pronta para colar num chat de análise.

### Aposentar
1. Tudo que lê `rag_blocks_skipped` e `similarity` — medido: sempre vazio/nulo.
2. `deriveStatus`/`deriveBadge` por `retrievedCount === 0` — causa o falso "erro"
   em 14 % dos laudos. Trocar pela regra do dissecador.
3. `CoverageCard` como "% de cobertura de blocos" e as sugestões de quota —
   aconselham ações de um sistema que não existe mais.
4. A duplicidade `/dissecador` × `/audit` × `/reviewer`: três telas sobre a mesma
   tabela, com regras divergentes. Consolidar no Lab e aposentar o dissecador
   **depois** de portar o painel de prompt (que só ele tem).

### Criar
1. `GET /api/admin/prompt-preview` + tela `/prompts`: o prompt de qualquer
   categoria × estilo, **sem gerar laudo**, mostrando também **por qual caminho**
   a categoria passa (renderer / writer / LIVRE) — porque nem toda categoria usa
   prompt de writer.
2. Painel **"o que o médico corrigiu"**: diff `generated_output → final_output`,
   com taxa de edição por categoria. Há 585 casos esperando.
3. Painel **ditado × laudo** com marcação de omissão e invenção.
4. Coluna **médico** na auditoria.

---

## 4. Ressalva importante sobre o item (a)

Nem toda categoria tem "prompt de writer". Hoje, em produção:

- **13 categorias usam o renderer** — o laudo é montado em código; não há prompt
  de escrita, só o prompt de **extração** dos dados.
- **LIVRE e TESTE** usam um prompt próprio (`LIVRE_SYSTEM_PROMPT`).
- As demais usam o writer, com o prompt montado em 10 camadas.

Uma tela que prometa "o prompt da categoria" sem dizer isso vai enganar. O
cockpit precisa mostrar **o caminho** antes do texto.

---

## 5. Incertezas resolvidas nesta verificação

| Incerteza do levantamento | Resolvida |
|---|---|
| `GENERATION_AUDIT_ENABLED` está ligada em prod? | **Sim** — 72 linhas em 7 dias, última hoje |
| `rag_blocks_skipped` / `similarity` estão mortos? | **Sim** — 0 e 458/532 nulos |
| Há material para o painel de correção manual? | **Sim** — 585 laudos |
| O dissecador está quebrado? | Renderiza, mas o fluxo de login é um beco sem saída (rota inexistente) |

**Fica em aberto:** se o Basic Auth do Lab está configurado no ambiente
**Preview** da Vercel (em Production está). Sem ele, um preview do Lab nasce
público com service role — ver `02-riscos.md`.
