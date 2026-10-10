# W1 — Motor Haiku 5.5 + roteamento + remoção do gpt-4.1-mini (relatório)

Branch `feat/haiku-motor` · 09/10/2026 · Claude Code (Opus 5.5)
Commits: `109dd941` motor · `a073004a` visão/consultor/testes · `6bc4697e` bancada · `cc075d51` exame no writer +
recusa clara (achado do W4) · `06ff113f` relatório + negrito markdown · **rodada 2:** `b163387c` metatexto do
extrator, saída dos writers, system do ditado cru · `f5101dcb` relatório · **rodada 3:** `d1415aa0` Sonnet 5.5 por
categoria + guard de comandos por laudo (+ bancada e relatório) · **10/10:** MSK de volta ao Haiku 5.5 (sai do
default de `LLM_WRITER_MODEL_BY_CATEGORY`)

## Resumo para o Luiz

- Todo uso de IA do laudo passa por **uma porta só** (`apps/api/src/server/ai/llm.ts`) e, por padrão, vai ao
  **Claude Haiku 5.5 pela API Anthropic**: extração do renderer, free-slots, structurer, sanity, interpretador de
  comandos, edição incremental, writer completo, os 6 writers dedicados, leitura de imagem e o Laudo Livre.
- **O gpt-4.1 / gpt-4.1-mini não é mais usado em nenhum caminho.** Se uma env antiga na Vercel ainda apontar para
  ele, o código troca por Haiku e avisa no log.
- **Rollback sem deploy**: cada papel tem a sua env de modelo; pôr ali um modelo da OpenAI (ex.: `gpt-5.4-mini`)
  volta aquele papel para a OpenAI.
- **Roteamento por env** (`FULL_WRITER_CATEGORIES`): abdome total, abdome superior, tireoide, mama, próstata,
  vias urinárias e carótidas passam ao writer completo (Haiku) no estilo clássico; obstetrícia, os 5 modelos
  clínicos e os writers Doppler ficam onde estão. Esvaziar a env devolve tudo ao renderer.
- **Achado técnico importante**: a API da Anthropic limita a saída estruturada "estrita" a 16 campos anuláveis
  por pedido; o extrator obstétrico tem 98 e o do abdome, 109. Esses vão por outro mecanismo (ferramenta não
  estrita + validação do nosso schema + uma tentativa de correção). Funciona nos testes e na bancada, mas
  **não consegui fazer o teste real na API**: a chave do `.env` local é recusada (401). Antes do deploy, alguém
  com a chave de produção precisa rodar o smoke (5 chamadas, ditados sintéticos) — comando na seção "Riscos".

## Rodada 3 — Sonnet 5.5 nos writers pesados + guard de comandos por laudo

Commit `d1415aa0` (+ bancada e relatório), sobre `feat/haiku-migration` `252e0179`.

**1. gpt-4.1 fora de vez.** Inventário depois do merge: nenhum caminho de produção usa gpt-4.1 (extração, writer,
writers dedicados, sanity, visão, consultor e fallbacks recusam a família em código; só restam comentários). Modo
difícil (`HARD_MODE_MODEL`, gpt-5.4) e TESTE seguem fora do escopo. Os comentários e o log passaram a dizer "removido
por decisão de 09/10" — a memória do projeto foi corrigida hoje: 14/10 é a data da Azure, não da API da OpenAI.

**2. Claude Sonnet 5.5 por categoria, por configuração.**
- `LLM_WRITER_MODEL_BY_CATEGORY` (CSV `CATEGORIA=modelo[:esforço]`). **Ausente** = default do código:
  `PELVE_FEMININA` e `DOPPLER_CAROTIDAS` → `claude-sonnet-5-5`; demais → Haiku 5.5. **Atualização 10/10:** o
  `MUSCULOESQUELETICO_V2` saiu do default por decisão do Luiz — Haiku 5.5 no writer dedicado, com o prompt novo da W9;
  pelve e carótidas seguem no Sonnet até a W10a decidir.
  **Vazia** = nenhuma exceção (tudo no modelo base). Ex.: voltar o MSK ao Sonnet sem deploy:
  `LLM_WRITER_MODEL_BY_CATEGORY=MUSCULOESQUELETICO_V2=claude-sonnet-5-5,PELVE_FEMININA=claude-sonnet-5-5,DOPPLER_CAROTIDAS=claude-sonnet-5-5`.
- Vale no **writer dedicado** do MSK e da pelve (`mskWriter.ts`, `pelveWriter.ts` — não no genérico) e no **writer
  completo** das carótidas. A exceção por categoria **vence** o `*_WRITER_MODEL` do dedicado.
- Esforço: o de `LLM_WRITER_EFFORT` (medium), salvo `:esforço` na entrada. No Sonnet 5.5 o default da API seria
  `high` (recalibrado); `medium` é o ponto de partida que a skill recomenda — o W8 (Haiku × Sonnet no MSK) é quem deve
  calibrar.
- API (skill `claude-api`): thinking adaptativo (o Sonnet 5.5 recusa `disabled`), sem sampling, sem prefill, `stop_reason`
  validado como no Haiku.
- **Fallback de recusa** (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`, só Claude API): **ligado por
  padrão** nas chamadas de texto do Sonnet 5.5 (recomendação da skill); `LLM_SONNET_SERVER_FALLBACK=false` desliga.
  **Avaliação:** no Sonnet 5.5 ele só refaz recusas `cyber` e `frontier_llm` (no Sonnet 5); `bio`,
  `reasoning_extraction` e `general_harms` — as que um laudo médico poderia disparar — **não** são refeitas. Ou seja,
  quase nunca vai atuar aqui; custa nada quando não atua. Quando atua, o modelo que serviu vai para a auditoria.
- **Auditoria e custo:** o `model_writer` passa a ser o modelo que **efetivamente escreveu** (writer dedicado ou o que
  serviu após um fallback; no renderer não dedicado, o extrator). Writers dedicados agora devolvem também os tokens de
  entrada. Tabela de custo: Sonnet 5.5 e Sonnet 5 a US$ 2 / 10 por milhão.
- Livre roteado para carótidas continua no Haiku (o Livre exige `claude-haiku-5-5` por contrato).

**3. Guard de comandos por laudo (T1 + MK-1).**
- `parseConclusion` para no **rodapé** (`*…`, "Breast Imaging Reporting", "ACR -", "[REVISAR", "FIGO:") e no **título do
  próximo laudo** ("ULTRASSONOGRAFIA…" em caixa alta), devolvendo o resto intacto (`after`) — vale para todos os guards
  que reescrevem a conclusão. `splitReports`/`mapReports`; o guard de itens vazios age em cada laudo.
- **Vários laudos no texto:** só a substituição literal roda; nada é acrescentado (não há como saber a qual conclusão
  o comando pertence) — fim do colapso dos laudos 2..N na conclusão do 1º.
- **Caminho writer** (completo e dedicados, detectados pelo `passthrough`): nada acrescentado; só `replace_phrase` e
  `add_comment`. O legado (`COMMAND_OPERATIONS=false`) idem.
- **Gatilho:** só imperativo/infinitivo (`acrescente|acrescentar|acrescenta`, `adicione…`, `inclua|incluir`, `coloque`,
  `colocar|coloca`) — "incluindo", "adicionalmente", "colocado" não disparam; fim da captura não corta decimal ("0.5");
  captura sem conteúdo clínico recusada (mínimo 2 palavras de conteúdo, ou 1 palavra longa sem número, ex.
  "Colelitíase." — o W4 propôs 3, que derrubaria "Cisto simples."); fala sobre a edição recusada ("tracinho",
  "a seguinte frase", "descreve"); "escreva X" vira X.
- **Medição só de leitura em 90 dias de produção** (501 laudos; guard antigo × novo sobre os mesmos ditados):

  | Caminho | Itens literais do guard antigo | Apagados pelo médico | Mantidos | Guard novo acrescentaria |
  |---|---|---|---|---|
  | renderer | 32 | 22 | 10 | 22 (13 apagados, 9 mantidos) |
  | writer dedicado | 23 | 18 | 5 | 0 |
  | writer completo | 14 | 7 | 7 | 0 |

  Lixo apagado cai de 47 para 13. O único "mantido" do renderer que o guard novo não poria (`32ae8748`) é falso
  positivo da métrica: o texto estava no **corpo** do laudo final ("volume total da tireoide, incluindo o istmo: 6,1 ml"),
  não na conclusão — era exatamente o lixo do T1. Nos caminhos writer, "mantido" significa que o texto estava no laudo
  final; o writer recebeu o comando no ditado e o escreveu.
- Teste `pipeline/__tests__/command-guard-por-laudo.manual.ts` 13/13 (multi-laudo, rodapé, writer sem acréscimo,
  decimal, gerúndio, casos legítimos).

**4. Avisos do guard de metatexto → card de pendências.** O que o extrator escrevia sobre o ditado ("medidas uterinas
ditadas de forma ilegível… conferir") sai do laudo (rodada 2) e agora entra no card de pendências (sanity, código
`ditado_a_conferir`), fora do texto copiável. Rótulo/cláusula sem aviso ("conforme conclusão do médico") não vira
pendência.

**Bancada pela assinatura**
- **Correção da bancada:** a interceptação Anthropic juntava todos os turnos de usuário; nos writers dedicados isso
  misturava os ditados dos few-shots com o real (o modelo escrevia o laudo do 1º exemplo). Agora os pares de few-shot vão
  ao system como exemplos e só o último turno é o ditado. As medições do W4 nos dedicados não foram afetadas (no máximo um
  ditado por chamada nas saídas dele). A bancada passa a respeitar o modelo pedido em cada chamada e liga
  `MSK_WRITER`/`PELVE_WRITER`/`PARTES_MOLES_WRITER` como em produção (`BENCH_*_WRITER=false` volta ao renderer).
- **MSK multi-laudo, Sonnet 5.5, writer dedicado + guard novo** (os 4 casos de produção da revisão: 19599614, e8f02f03,
  bbd7e07b, 52e66a0a): todos mantêm os laudos — **2, 2, 2 e 4 conclusões, iguais ao laudo final do médico**; em produção
  os quatro tinham saído com **1** conclusão. Similaridade com o final 0,85 (produção 0,91, que o médico remontou). Todas
  as chamadas foram ao `claude-sonnet-5-5`.
- **Carótidas, writer completo (cenário B), modelo base Haiku** — de propósito, para provar o roteamento: os 4 casos de
  90 dias saíram com **todas as chamadas do writer em `claude-sonnet-5-5`**, sem markdown e sem bloco depois da
  conclusão. Similaridade com o final 0,67 (produção gpt-5.4-mini 0,98, quase sem edição do médico); sem juiz nesta
  rodada — qualidade é com o W8/W4. Um caso pôs a medida do complexo médio-intimal na conclusão; vale olhar no juiz.
- Replay R de ABDOMEN_TOTAL: **14/14 idêntico à rodada 2** (o caminho do renderer não mudou nesta rodada); contra o
  texto salvo da época continua 8/11 — as 3 diferenças são o corpo descritivo do W3.

**Testes:** typecheck OK; `command-guard-por-laudo` 13/13; `llm` 26/26 (modelo por categoria, fallback de recusa com o
beta e o modelo servido, Haiku sem fallback); `extraction-metatext` 11/11 (avisos para o card); `modelResolver` 43/43;
fail-closed 41/41; `livreRouter` 18/18; guards de conclusão (líquido, peso, DUM, Doppler, itens vazios, dedupe,
operações, commandGuard 21/21, commandOperations, command-operations-v2) e writers dedicados — todos verdes.

**Incidente (registrado):** ao rodar a regressão em lote, executei `customization/store.manual.ts`, que exercita
escrita no banco de **produção** dentro de uma transação que termina em ROLLBACK (desenho do próprio teste). Conferi
depois só com leitura: nenhuma linha ficou (5 personalizações e 1 escopo, todos de agosto; 0 tocados nas últimas 24 h).
Não volto a rodar testes que tocam o banco.

## Rodada 2 (após integração do W3) — achados do W4 nos textos do Haiku

Commit `b163387c` (sobre o merge de `feat/haiku-migration`, `07d29655`).

**1. Metatexto do extrator nos campos livres** (W4: 11/67 saídas; gpt-4.1-mini 0). O renderer cola esses campos no
laudo; o Haiku escrevia ali "Conclusão do médico: …", "conforme conclusão do médico", "não cabem no esquema",
"ditado ilegível… conferir com o médico", "(ditado com repetição; confirmar)".
- Prevenção: `EXTRACTION_TEXT_RULE` anexada pelo motor (`ai/llm.ts`) ao system de **toda** extração — prompts por
  categoria intactos. A sanity desliga (`reportText: false`), porque os campos dela são comentário por natureza.
- Guard determinístico `renderer/extractionMetatext.ts`, antes do render (extração do renderer, free-slots e
  extrator hepático), guiado pelo schema: rótulo e cláusula de metatexto saem e o conteúdo clínico fica
  ("Litíase vesical, conforme conclusão do médico." → "Litíase vesical."; "Índices de resistividade (IR) ditados,
  não cabem no esquema: CCA D 0,74…" → "Índices de resistividade (IR): CCA D 0,74…"); a frase inteira só sai quando é
  comentário sobre o ditado ("Ditado com trechos incompreensíveis…"); enum nunca é tocado; campo que esvazia vira
  `null` onde o schema permite; `medida_invalida` (texto cru por contrato, o renderer marca `[?]`) fica com o trecho
  citado do ditado. Remoções vão ao log (`[extraction X] metatexto removido…`).
- Efeito colateral medido: um aviso útil do modelo ("medidas ilegíveis — conferir") também sai do texto. O lugar
  dele seria o card de pendências (sanity), não o laudo — fica como proposta.
- Teste `renderer/__tests__/extraction-metatext.manual.ts` 10/10 (casos reais do W4 + negativos clínicos).

**2. Saída dos writers dedicados** (W4, PELVE/MSK cenário A: markdown em 11/22 e bloco do modelo depois da conclusão
em 11/22 — "**Pontos para conferir antes de assinar:**", "Obs. para revisão: o ditado…", "Observações:
Interpretei…", e também "**Observação antes do laudo:**" antes do título).
- `pipeline/writerOutputGuard.ts` → `cleanWriterOutput`, comum a **todos** os writers (MSK, pelve, partes moles,
  Doppler renal e venoso, antes do `normalizeMskWriterFormat` e das auditorias; writer completo e Livre no texto
  final). Tira negrito `**`, títulos `#`, crases, separadores `---` e o bloco de comentário (cabeçalho de comentário
  **e** marca de metatexto: "o ditado", "interpretei", "usei", "confirme"…).
- Fica: observação clínica do modelo curado ("Observação: a avaliação por via transabdominal possui limitações…"),
  rodapés BI-RADS e Domingos/ACR (asterisco simples), `[REVISAR: …]` das auditorias e `____`. Pego no teste: tratar
  `__negrito__` destruía o placeholder `____` — descartado.
- Linha de prompt `WRITER_OUTPUT_RULE` no system de todo writer Haiku (sem markdown; nada depois da conclusão; dúvida
  real vira `[REVISAR: …]` no ponto do laudo).
- O stream ao vivo ainda mostra o texto cru; o `done.final_text` (o que é salvo) vem limpo.
- Teste `pipeline/__tests__/writerOutputGuard.manual.ts` 8/8.

**3. System do writer completo × ditado cru.** `prompts/buildSystemMessage.ts:166-168` dizia que os dados vêm
"EXCLUSIVAMENTE da seção ACHADOS ESTRUTURADOS", mas o fast-path manda "=== DITADO DO MÉDICO ===". O builder ganhou
`inputMode`; com ditado cru, o texto passa a "do DITADO DO MÉDICO (achados + instruções)". O caso estruturado é
byte-idêntico (teste). Observação: essas linhas só existem quando o bundle tem few-shots (`exemplo`) — hoje só
DOPPLER_CAROTIDAS; a recusa da CERVICAL vista pelo W4 vinha principalmente da falta do exame na mensagem, já
corrigida em `cc075d51`.

Bancada pedida — cenário B (writer completo Haiku, pela assinatura, bundle real, estilo clássico), ditado
"Exame sem alterações dignas de nota." (`scripts/bench-haiku/normal-curto.ts CERVICAL,TIREOIDE`; saída
`tmp-review/bench-haiku/normal-curto-2026-10-09T22-31-45.json`). "Antes" = mensagem antiga (sem o exame) com o
system novo; "depois" = `runWriterStream` de produção (exame + system alinhado + regra e guard de saída):

| Categoria | Antes | Depois (texto final) | Markdown no final |
|---|---|---|---|
| CERVICAL | laudo normal | laudo normal completo (níveis IA–VI sem alterações; conclusão "Ausência de alterações detectáveis pelo método") | não |
| TIREOIDE | laudo normal (na rodada 1 o braço sem exame **não** escrevia) | laudo normal com `____` nas medidas e a nota Domingos/ACR do modelo | não |

Uma amostra por braço — prova do mecanismo, não estatística. **Achado novo**: no TIREOIDE "depois" o próprio
modelo omitiu a linha "COMENTÁRIOS:" (o texto cru já veio sem ela; o guard não remove cabeçalho do laudo). Proposta
para W3/W4: guard determinístico dos cabeçalhos obrigatórios do modelo da categoria (o MSK já tem o equivalente em
`normalizeMskWriterFormat`) e conferir a taxa na bancada maior.

Regressão: llm 23/23, writerChosenExam 5/5, writers dedicados (renal 37, venoso 16, MSK 10+6+16, partes moles 14+24,
pelve 18+27), fail-closed 41/41, modelResolver 42/42, livreRouter 18/18, hepático 34, clinical-models, abdomen
corpo descritivo (W3), sanitizador 19/19. Replay R: abdome 8/11 idênticos à produção — as 3 diferenças são o corpo
descritivo do W3 ("compatível com cisto simples/cálculo" saiu do corpo), não o guard; obstétrica 16/46, igual à
rodada 1.

## Achado do W4 — writer recusava ditado curto de normalidade (corrigido)

No fast-path a mensagem do writer só levava o ditado; com "Exame sem alterações dignas de nota" o Haiku não sabia
de qual exame se tratava e pedia dados em vez de escrever. Como as categorias de `FULL_WRITER_CATEGORIES` dependem
disso, o writer padrão Haiku agora recebe, antes do ditado, o bloco **"EXAME ESCOLHIDO PELO MÉDICO"** (rótulo +
código) e a regra "ditado curto de normalidade = laudo normal completo do modelo, sem acrescentar achados"
(`pipeline/writer.ts`, `buildRawUserMessage`). Livre, modo difícil e TESTE recebem a mensagem de antes, byte a byte.

Recusa do Haiku (`stop_reason: "refusal"`) vira `LLM_REFUSED` com mensagem para o médico ("O redator … recusou
escrever este laudo. Revise o ditado e gere de novo."), e a rota emite esse código (antes: `PIPELINE_FAILURE`
genérico). Teste: `pipeline/__tests__/writerChosenExam.manual.ts` 3/3.

Bancada (`scripts/bench-haiku/normal-curto.ts`, Haiku pela assinatura, bundle real, estilo clássico, mesmo system
nos dois braços; saída em `tmp-review/bench-haiku/normal-curto-2026-10-09T17-18-04.json`):

| Categoria | Antes (sem exame) | Depois (com exame) |
|---|---|---|
| ABDOMEN_TOTAL | laudo normal | laudo normal completo (título em `**negrito**` — ver abaixo) |
| TIREOIDE | **não escreveu**: "Não há achados a descrever… preciso que você informe os dados do exame" | laudo normal completo |

A "recusa" observada é **textual** (o modelo pede dados e termina normalmente), não `stop_reason: refusal` — o
bloco do exame é o que a resolve. Uma amostra por braço: é prova do mecanismo, não estatística.

Também na bancada: o Haiku pôs o título do abdome em negrito markdown (`**ULTRASSONOGRAFIA…**`), que nenhum guard
removia e iria para o texto copiado. `stripMarkdownBold` entrou no sanitizador universal
(`dictationSanitizer.ts`; o asterisco simples das notas de rodapé do modelo fica), com 3 casos novos no teste (19/19).
No laudo normal da tireoide o writer manteve `____` nas medidas e a nota de rodapé Domingos/ACR do modelo — é o
texto do modelo curado; o renderer decidia essa nota pela preferência `show_domingos_score` (hoje ninguém a usa).

## 1. O que mudou

| Área | Arquivo(s) | Mudança |
|---|---|---|
| Motor | `server/ai/llm.ts` (novo) | `llmJson` / `llmParsed` / `llmTextStream` / `llmText`. Provedor pelo nome do modelo (`claude-*` → Anthropic; outro → OpenAI). Haiku: `thinking: adaptive`, `output_config.effort`, **sem `temperature`**, `stop_reason` validado (recusa → `LLM_REFUSED`, `max_tokens`/janela → `LLM_TRUNCATED`, outro → `LLM_STOPPED`, vazio → `LLM_EMPTY`). Prompt caching no system. Rollback OpenAI com `reasoning_effort` (GPT-5) ou `temperature` (não-reasoning). |
| Schemas | `server/ai/structuredSchema.ts` (novo) | Conta uniões/opcionais; schema dentro do limite (≤16 uniões, ≤24 opcionais) → modo estrito (`output_config.format`, restrições não suportadas removidas); fora → ferramenta não estrita com o schema original, anuláveis omitidos viram `null`, validação pelo Zod do chamador e **uma** rodada de correção (tool_result de erro, conversa só-anexa com o thinking devolvido intacto). 400 "schema too complex" no estrito → cai na ferramenta e memoriza. |
| Cliente | `server/ai/anthropic.ts` (novo), `livreProvider.ts` | Cliente Anthropic único (o do Livre, generalizado). |
| Writer | `ai/writerClient.ts`, `pipeline/writer.ts`, `pipeline/modelResolver.ts` | Writer padrão = Haiku (`streamAnthropicWriter`); o Livre virou um invólucro que só traduz os códigos de erro (`LIVRE_WRITER_*` preservados). Modo difícil e TESTE **intactos**. |
| Extração | `renderer/extraction.ts`, `pipeline/renderer.ts` (free-slots), `pipeline/structurer.ts`, `pipeline/sanityCheck.ts`, `pipeline/commandInterpreter.ts`, `pipeline/editReport.ts` | Todos pelo motor. Progresso (`achado`) continua: lê o JSON parcial (texto no estrito, `input_json_delta` na ferramenta). |
| Writers dedicados | `mskWriter`, `pelveWriter`, `partesMolesWriter`, `dopplerRenalWriter`, `dopplerVenosoMmiiWriter`, `dopplerHepaticoWriter` | Pelo motor, default `claude-haiku-5-5`, esforço `LLM_WRITER_EFFORT`. Few-shots seguem como turnos user/assistant. Auditorias e fail-closed iguais. |
| Visão | `server/vision/client.ts` | OCR das telas: `LLM_VISION_MODEL` (Haiku); era gpt-4.1 / gpt-4.1-mini **fixos no código**. Media type PNG/JPEG detectado. |
| Consultor | `app/api/consultant/route.ts`, `env.ts` | Fallback default `gpt-5.4-mini` (era gpt-4.1); gpt-4.1 vindo da env é recusado. Continua OpenAI. |
| Roteamento | `pipeline/generationPathResolver.ts`, `pipeline/caminhoDeGeracao.ts`, rota, `admin/prompt-preview` | `FULL_WRITER_CATEGORIES` (abaixo). Estilo OBJETIVO fica no renderer. |
| Rota | `app/api/generate/route.ts` | Auditoria grava `claude-haiku-5-5` em `model_structurer`/`model_writer`; **sanity por IA** passa a rodar no writer padrão (antes exigia provider OpenAI — com Haiku ela teria sumido); Writer V2 só com modelo OpenAI (`WRITER_V2_MODEL`). |
| Custo | `db/auditRepo.ts`, `db/runsRepo.ts` | `estimateCost` pela tabela do modelo: Haiku US$ 0,10 / 0,50 por milhão (entrada/saída; thinking conta como saída). Livre passa a ter custo (antes nulo). |
| Bancada | `scripts/bench-haiku/bench-abdomen.ts`, `smoke-api.ts` (novo) | Intercepta `api.anthropic.com/v1/messages` e responde pela assinatura (SSE no formato da API, inclusive `tool_use`). Cenário B usa o writer de produção (provider anthropic). |

## 2. Envs da Vercel

**Nenhuma env nova é obrigatória**: os defaults do código já são Haiku. Só `ANTHROPIC_API_KEY` precisa existir
(já existe — é a do Laudo Livre).

### Criar (opcional — só para fixar explicitamente ou mudar)

| Env | Default no código | Papel |
|---|---|---|
| `LLM_EXTRACTION_MODEL` | `claude-haiku-5-5` | extração do renderer, structurer, comandos, esquema venoso |
| `LLM_EXTRACTION_EFFORT` | `medium` | esforço (o da bancada) |
| `LLM_WRITER_MODEL` | `claude-haiku-5-5` | writer completo, free-slots, edição |
| `LLM_WRITER_EFFORT` | `medium` | também o esforço dos writers dedicados |
| `LLM_SANITY_MODEL` / `LLM_SANITY_EFFORT` | `claude-haiku-5-5` / `medium` | sanity por IA |
| `LLM_VISION_MODEL` | `claude-haiku-5-5` | leitura de imagem (esforço = `LLM_EXTRACTION_EFFORT`) |
| `FULL_WRITER_CATEGORIES` | `ABDOMEN_TOTAL,ABDOMEN_SUPERIOR,TIREOIDE,MAMARIA,PROSTATA_SUPRAPUBICA,VIAS_URINARIAS,DOPPLER_CAROTIDAS` | env **ausente** = default; **vazia** = ninguém sai do renderer |
| `WRITER_V2_MODEL` | `gpt-5.4-mini` | Writer V2 experimental (OpenAI) |
| `LLM_WRITER_MODEL_BY_CATEGORY` | ausente = `PELVE_FEMININA`, `DOPPLER_CAROTIDAS` → `claude-sonnet-5-5` (o MSK saiu em 10/10: Haiku 5.5 no writer dedicado, prompt da W9) | modelo do writer por categoria (`CAT=modelo[:esforço]`); vazia = sem exceções; vence `*_WRITER_MODEL`. Voltar o MSK ao Sonnet sem deploy: `MUSCULOESQUELETICO_V2=claude-sonnet-5-5,PELVE_FEMININA=claude-sonnet-5-5,DOPPLER_CAROTIDAS=claude-sonnet-5-5` |
| `LLM_SONNET_SERVER_FALLBACK` | `true` | rodada 3: fallback de recusa do servidor no Sonnet 5.5; `false` desliga |

### Remover (não são mais lidas, ou apontam para modelo aposentado)

| Env | Por quê |
|---|---|
| `OPENAI_MODEL_STRUCTURER`, `OPENAI_MODEL_WRITER`, `OPENAI_MODEL_SANITY`, `OPENAI_WRITER_REASONING_EFFORT` | Substituídas pelas `LLM_*`; o código não as lê mais. Deixá-las só confunde. |
| `MSK_WRITER_MODEL`, `PELVE_WRITER_MODEL`, `PARTES_MOLES_WRITER_MODEL`, `DOPPLER_RENAL_WRITER_MODEL`, `DOPPLER_HEPATICO_WRITER_MODEL`, `DOPPLER_VENOSO_WRITER_MODEL` | **Conferir na Vercel.** Ausentes = Haiku. Com `gpt-4.1` = trocadas por Haiku com aviso. **Com outro modelo OpenAI (ex.: `gpt-5.4`) continuariam na OpenAI** — remover para migrar. |
| `OPENAI_MODEL_CONSULTANT_FALLBACK` | Se estiver `gpt-4.1`, remover (o código já recusa; default novo `gpt-5.4-mini`). |

### Manter

`OPENAI_API_KEY` (transcrição, embeddings, consultor, modo difícil, Writer V2, rollback), `RENDERER_CATEGORIES`
(continua valendo; `FULL_WRITER_CATEGORIES` só subtrai dela), `HARD_MODE_*`, `TESTE_*`, `LIVRE_*`.

## 3. Plano de rollback

Do mais fino ao mais grosso — todos sem deploy de código, exceto o último:

1. **Uma categoria volta ao renderer**: tirar o código dela de `FULL_WRITER_CATEGORIES` (ex.:
   `FULL_WRITER_CATEGORIES=ABDOMEN_SUPERIOR,MAMARIA,...` sem `ABDOMEN_TOTAL`). O extrator continua Haiku.
2. **Todo o roteamento volta ao de hoje**: `FULL_WRITER_CATEGORIES=` (vazia).
3. **Um papel volta à OpenAI**: `LLM_WRITER_MODEL=gpt-5.4-mini` + `LLM_WRITER_EFFORT=low` (o writer de hoje);
   `LLM_EXTRACTION_MODEL=gpt-5.4-mini` + `LLM_EXTRACTION_EFFORT=low` para a extração. **Não existe rollback
   para o gpt-4.1-mini** — removido por decisão do Luiz (09/10) e recusado em código.
4. **Writer dedicado específico**: `MSK_WRITER_MODEL=gpt-5.4` (por exemplo) — esforço = `LLM_WRITER_EFFORT`.
5. **Tudo**: redeploy do commit anterior (volta o gpt-4.1-mini, que o Luiz decidiu remover).

## 4. Inventário de consumidores dos achados estruturados do renderer

Levantado no código e no banco de produção (só leitura, 09/10).

| Consumidor | Onde | Depende do caminho renderer? | Efeito de mover uma categoria para o writer |
|---|---|---|---|
| Auditoria (`generation_audit.structured_output`) | `onFindings` na rota | sim | Fica sem os achados tipados daquela categoria (observacional). |
| Lab / dissecador (procedência de cada frase) | `apps/lab`, `/dissecador` | sim | Perde a procedência por frase. Observacional. |
| Sanity determinística | `runDeterministicSanity` | **não** (usa ditado + `findings` do structurer) | nenhum |
| Esquema venoso (SSE `scheme`) | `extractVenousMap` | não (extração própria, depois do `done`) | nenhum — e o venoso não muda de caminho |
| Esquemas de tireoide / mama | web `visualSchemas`, app `visualSchemeState` | **não** — vêm dos cliques/marcadores do médico, não da API | nenhum |
| Esquema de miomas / Sala (`/api/sala/push-schema`) | app e web | não (diagrama do app) | nenhum |
| `/api/catalog` (web por cliques) | catálogo do renderer | não (independe da geração por voz) | nenhum |
| **Personalização (Biblioteca)** | `customization/ativa.ts`, rota | **sim — só se aplica no renderer** | A personalização publicada deixa de valer e a Biblioteca mostra "inativa". **Banco: 1 publicada, em CERVICAL** (1 conta; aplicada em 1 laudo nos últimos 30 dias). |
| Preferências do renderer (Domingos na tireoide, conduta na mama) | `account_report_preferences` | sim | Toggles ignorados no writer. **Banco: 2 linhas (MAMARIA, TIREOIDE), ambas vazias** — ninguém usa hoje. |
| Bundle do writer (modelo curado) | `knowledge_blocks` | — | Sem bundle o writer bloqueia (`BUNDLE_EMPTY`). **TIREOIDE e VIAS_URINARIAS não têm nenhum bloco no estilo OBJETIVO** → por isso o objetivo fica no renderer. Uso real nos últimos 90 dias: 100% clássico nessas categorias. |

Por categoria (as que mudam de caminho no default):

| Categoria | Laudos 30 d (prod) | Consumidor que quebraria | Decisão aplicada |
|---|---|---|---|
| ABDOMEN_TOTAL | 39 | nenhum | writer completo (clássico) |
| ABDOMEN_SUPERIOR | 5 | nenhum | writer completo (clássico) |
| TIREOIDE | 14 | toggle Domingos (sem uso); sem bundle OBJETIVO | writer completo (clássico); objetivo no renderer |
| MAMARIA | 13 | toggle conduta (sem uso) | writer completo (clássico) |
| PROSTATA_SUPRAPUBICA | 2 | nenhum | writer completo (clássico) |
| VIAS_URINARIAS | 4 | sem bundle OBJETIVO | writer completo (clássico); objetivo no renderer |
| DOPPLER_CAROTIDAS | 4 | — (já é writer em produção) | writer completo |
| **CERVICAL** | 1 | **personalização publicada** | **fica no renderer + Haiku extrator — decisão pendente do Luiz** |

## 5. Tabela de roteamento aplicada no default do código

| Grupo | Categorias | Caminho | Modelo |
|---|---|---|---|
| Obstétrica | OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO, CERVICOMETRIA | renderer (como hoje) | Haiku extrai + free-slots |
| Clínicos fail-closed | ABDOMEN_TOTAL_DOPPLER, DOPPLER_VENOSO_MMSS, DOPPLER_ARTERIAL_MMSS, TORAX, QUADRIL_INFANTIL | renderer, **travados** (ignorados se listados em `FULL_WRITER_CATEGORIES`) | Haiku extrai |
| Writers dedicados | MUSCULOESQUELETICO_V2, PARTES_MOLES (flags atuais), DOPPLER_RENAL, DOPPLER_HEPATICO, DOPPLER_VENOSO_MMII(_MEDIDAS) | dedicados; os Doppler travados | Haiku escreve (hepático: Haiku extrai) |
| Pelve | PELVE_FEMININA | atual (flag `PELVE_WRITER`); writer completo se listada em `FULL_WRITER_CATEGORIES` | Haiku (writer dedicado ou extrator) |
| Writer completo | ABDOMEN_TOTAL, ABDOMEN_SUPERIOR, TIREOIDE, MAMARIA, PROSTATA_SUPRAPUBICA, VIAS_URINARIAS, DOPPLER_CAROTIDAS — **estilo clássico** | writer (bundle + guards full) | Haiku escreve |
| Fica no renderer | CERVICAL (personalização) e o estilo OBJETIVO das categorias acima | renderer | Haiku extrai |
| Já writer hoje | ESCROTAL, PAREDE_ABDOMINAL, REGIAO_INGUINAL, PROSTATA_TRANSRETAL e demais sem renderer | writer | Haiku escreve |
| Livre | LIVRE | inalterado (roteador + writer Haiku) | Haiku |
| Não mexidos | modo "laudo difícil" (`HARD_MODE_MODEL`, gpt-5.4) e categoria TESTE | inalterados | — |

Para a comparação da pelve: cenário A da bancada = Haiku extrai + renderer; B = writer completo Haiku; o caminho
de produção atual (writer dedicado da pelve) agora também é Haiku. A bancada roda os três com
`--category PELVE_FEMININA --scenarios A,B` (+ `BENCH_PELVE_WRITER=true` não existe; o dedicado fica para o W4).

## 6. Evidências

- `pnpm -F api typecheck`: OK.
- `writerChosenExam.manual.ts` (novo) **3/3**; `dictationSanitizer.manual.ts` **19/19**.
- `ai/__tests__/llm.manual.ts` (novo, clientes falsos): **22/22** — estrito, ferramenta, correção, recusa,
  truncamento, JSON em texto, rollback OpenAI, schemas reais (obstétrica/abdome → ferramenta; cervicometria/renal → estrito).
- `modelResolver.manual.ts` **42/42** (inclui a tabela de roteamento e o bloqueio do gpt-4.1); `livreRouter.manual.ts`
  **18/18**; `generate-fail-closed.manual.ts` **41/41** (rota real com dublês; abdome no writer completo e clínico
  travado); `livreTesteCategories` 6/6; `doppler-hepatico-writer` 34 cenários; `clinical-models-v1`; `ig-sanity`
  10/10; `command-operations-v2` 25/25; `auditModelo` 4/4; `catalog-api` (contrato, hepático, renal) OK.
- Já falhavam antes (confirmado no commit-base `03503fc8`): `obstetricaPlainDoppler.manual.ts` e
  `obstetricDopplerFlow.manual.ts` (`selectedHint is not defined`).
- **Bancada, replay R** (achados salvos pela produção → renderer de hoje, agora pelo cliente Anthropic interceptado):
  ABDOMEN_TOTAL **11/11** idênticos ao texto de produção; OBSTETRICA + DOPPLER_OBSTETRICO **45/46 idênticos ao
  mesmo replay no commit-base** (16/46 iguais ao texto salvo da época, igual na base — diferença de código do
  renderer no período, não do W1). O 46º caso (`93d48961`) **falhava na base** porque o achado salvo não tem o campo
  anulável `doppler.perc_ducto_venoso` (schema evoluiu); agora passa, porque anulável omitido vira `null`.
  Resultados em `tmp-review/bench-haiku/` (dados reais, não versionados).

## 7. Riscos abertos

1. **Smoke real na API não executado** (bloqueio): a `ANTHROPIC_API_KEY` do `.env` local é recusada (401
   `invalid x-api-key`; 4 chamadas, nenhuma passou da autenticação). Antes do deploy, rodar com a chave de
   produção (~5 chamadas Haiku, ditados sintéticos):
   `cd apps/api && ANTHROPIC_API_KEY=<chave> pnpm exec tsx --env-file=../../.env scripts/bench-haiku/smoke-api.ts`.
   Ele prova o que só a API real prova: o schema obstétrico como `input_schema`, o modo estrito com
   `["x","null"]` e o writer em streaming. Se o estrito recusar algum schema por complexidade, o código já cai na
   ferramenta sozinho.
2. **Latência do caminho por ferramenta** (obstétrica, abdome no objetivo, tireoide, mama, Doppler obstétrico,
   carótidas, hepático): thinking + chamada de ferramenta; uma reprovação no Zod custa uma segunda chamada. A
   bancada via CLI não mede a latência da API — medir no smoke/preview.
3. **Evidência do writer completo só existe para o abdome** (bancada de 09/10). Tireoide, mama, próstata, vias
   urinárias e abdome superior mudam de caminho no default sem bancada própria; o W4 deveria rodar
   `--scenarios A,B` nelas antes do deploy. Pontos de atenção: TI-RADS/BI-RADS que o renderer calcula em código e o
   writer escreve; quase nenhuma categoria tem few-shots (`exemplo`) curados — só DOPPLER_CAROTIDAS tem.
4. **Prompt "corpo descritivo"** é do W3: sem ele integrado, o writer completo roda com a regra antiga.
5. **Biblioteca**: nas categorias que vão ao writer, a personalização fica inativa (hoje só CERVICAL tem uma
   publicada, e ela foi mantida no renderer).
6. **Sem `temperature`**: os writers dedicados usavam 0,2 e a extração, 0. No Haiku a variação é controlada só pelo
   prompt e pelo esforço; ditado igual pode gerar texto não idêntico byte a byte.
7. **Recusas**: o Haiku 5.5 não tem fallback de servidor. Recusa vira erro: renderer comum cai no writer (como
   hoje), clínicos e Doppler dedicados falham fechados, Livre usa `LIVRE_WRITER_REFUSED`.
8. **Rate limit** do Haiku 5.5 na conta: conferir a tier antes de mover todo o volume.
9. **Resposta textual que não é laudo** (o modelo pede dados em vez de escrever) não é `stop_reason: refusal` e
   não vira erro: o texto sai como "laudo". O bloco do exame escolhido elimina o caso medido (tireoide), mas não
   há guard determinístico para isso — sugestão para o W4/W3: guard que exija cabeçalho do exame + CONCLUSÃO no
   writer completo.
10. A bancada continua mandando ao `claude -p` só os turnos do usuário (few-shots em turnos de assistente ficam
   fora) — como antes; afeta só a simulação dos writers dedicados.

## 8. Decisões que precisam do Luiz

1. **CERVICAL**: fica no renderer por causa da personalização publicada. Mover para o writer completo desativa essa
   personalização (`FULL_WRITER_CATEGORIES` + CERVICAL).
2. Confirmar que **tireoide, mama, próstata, vias urinárias e abdome superior** vão ao writer completo já neste deploy
   (o default faz isso) ou só depois da bancada do W4 (aí, deploy com
   `FULL_WRITER_CATEGORIES=ABDOMEN_TOTAL,DOPPLER_CAROTIDAS`).
3. **Estilo OBJETIVO** fica no renderer nessas categorias (regra da casa de PELVE/PARTES_MOLES; tireoide e vias
   urinárias nem têm bundle objetivo). Manter?
4. **Leitura de imagem** (`/api/analyze-image`) passou a Haiku sem bancada — o gpt-4.1 dela foi removido de
   qualquer forma. Validar com algumas telas reais no preview (ou `LLM_VISION_MODEL=gpt-5.4-mini` como rollback).
5. Checar na Vercel os valores das envs da seção 2 ("Remover").

## File List

- `apps/api/src/server/ai/llm.ts` (novo), `ai/structuredSchema.ts` (novo), `ai/anthropic.ts` (novo),
  `ai/__tests__/llm.manual.ts` (novo), `ai/openai.ts`, `ai/livreProvider.ts`, `ai/writerClient.ts`
- `apps/api/src/server/env.ts`, `db/auditRepo.ts`, `db/runsRepo.ts`
- `apps/api/src/server/pipeline/{writer,structurer,sanityCheck,commandInterpreter,editReport,renderer,modelResolver,generationPathResolver,caminhoDeGeracao,dictationSanitizer}.ts`
- `apps/api/src/server/pipeline/{mskWriter,pelveWriter,partesMolesWriter,dopplerRenalWriter,dopplerVenosoMmiiWriter,dopplerHepaticoWriter}.ts`
- `apps/api/src/server/renderer/extraction.ts`, `vision/client.ts`
- Rodada 2: `renderer/extractionMetatext.ts` (novo), `pipeline/writerOutputGuard.ts` (novo),
  `prompts/buildSystemMessage.ts`, `renderer/__tests__/extraction-metatext.manual.ts` (novo),
  `pipeline/__tests__/writerOutputGuard.manual.ts` (novo)
- `apps/api/src/app/api/generate/route.ts`, `app/api/consultant/route.ts`, `app/api/admin/prompt-preview/route.ts`
- `apps/api/src/server/pipeline/__tests__/{modelResolver,livreRouter}.manual.ts`,
  `pipeline/__tests__/{writerChosenExam (novo),dictationSanitizer}.manual.ts`,
  `clinicalReports/__tests__/generate-fail-closed.manual.ts`
- `apps/api/scripts/bench-haiku/bench-abdomen.ts`, `scripts/bench-haiku/{smoke-api,cliAnthropicClient,normal-curto}.ts` (novos)
