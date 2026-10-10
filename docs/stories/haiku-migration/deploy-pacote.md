# Pacote de deploy — migração Haiku 5.5 (rodada final, 10/10/2026)

Branch `chore/rebench-final-motor` a partir de `feat/haiku-migration` `c7413d0a`. Nada foi enviado, publicado nem
alterado: sem push, sem deploy, sem `vercel env add/rm`, sem escrita no banco. A lista de envs foi comparada com
`vercel env ls production` do projeto `laudousgmobile` (só leitura — a Vercel mostra os valores como *Encrypted*, então
este documento traz só **nomes** e os valores que **propomos**; nenhum valor atual foi lido).

## 1. Placar final — Haiku 5.5 explícito (`BENCH_MODEL=claude-haiku-5-5`), sem juiz

Pela assinatura (`claude -p`), mesmos casos das rodadas finais anteriores, reaproveitadas no mesmo arquivo para comparar
caso a caso. Todas as chamadas de modelo registradas foram ao `claude-haiku-5-5`; nenhuma falha técnica.

| Rodada (hoje, `c7413d0a`) | Casos | Comparado com |
|---|---|---|
| `tmp-review/bench-haiku/2026-10-10T15-03-31-musculoesqueletico_v2` (A4) | 71 MSK (os da W8/W9/W14) | A5 = Haiku final da W14 (`w14/2026-10-10T13-31-20-musculoesqueletico_v2`) |
| `…/2026-10-10T15-03-30-obstetrica+doppler_obstetrico` (A4) | 46 | A = W5 (`obst/…/2026-10-09T23-43-51-obstetrica+doppler_obstetrico`, juiz 6,12) |
| `…/2026-10-10T15-09-17-morfologico` (A4) | 23 | A = W5 (`…/2026-10-09T23-43-51-morfologico`, juiz 5,70) |

**CERVICOMETRIA:** nenhum laudo no banco (a categoria nunca foi usada em produção) — não há caso real para a bancada; o
renderer segue coberto só pelos testes determinísticos.

### MSK — writer dedicado, Haiku 5.5 (placar da W9, `placar-msk.ts`)

| Candidato | Frases normais do roteiro omitidas (de 519) | Linhas "normal + , com" seguidas (de 15) | Invasões de numeração | Ressalvas inventadas |
|---|---|---|---|---|
| Produção (gpt-4.1) | 45 (8,7%) | 15 | 30 em 4 laudos | 0 |
| W14 final (A5) | 24 (4,6%) | 14 | 0 | 0 |
| **Hoje (A4)** | **26 (5,0%)** | **14** | **0** | **0** |

Equivalente à W14: a diferença de 2 frases está dentro da variação do writer (sem temperatura, o texto não se repete byte a
byte — só 5/71 laudos saíram idênticos ao A5, e é o esperado). Nenhuma invasão de numeração nos laudos com vários exames.
Similaridade com o laudo final 0,70 (= A5).

### Família obstétrica — Haiku extrai + renderer (`placar.ts`)

| Grupo | Candidato | Frases-padrão faltando | Título ≠ | `____`/0,0 | Conclusão duplicada | Similaridade com o final | Texto idêntico ao da W5 |
|---|---|---|---|---|---|---|---|
| Obstétrica + Doppler (46) | Produção | 152/849 (17,9%) | 6 | 6 | 1 | 0,80 | — |
| | W5 (A, juiz 6,12) | 194/849 (22,9%) | 7 | 2 | 0 | 0,78 | — |
| | **Hoje (A4)** | **196/849 (23,1%)** | **7** | **2** | **0** | **0,77** | **25/46** |
| Morfológico (23) | Produção | 246/627 (39,2%) | 7 | 7 | 4 | 0,70 | — |
| | W5 (A, juiz 5,70) | 272/627 (43,4%) | 2 | 4 | 1 | 0,68 | — |
| | **Hoje (A4)** | **283/627 (45,1%)** | **3** | **5** | **0** | **0,68** | **10/23** |

Obstétrica + Doppler: igual à W5 (mesmo título, mesmas lacunas, 2 frases a mais em 849); os 21 textos que mudaram têm
semelhança ≥ 0,80 com os da W5 (a maioria ≥ 0,95). Sem juiz não há nota nova; onde o texto é idêntico (25/46), a nota da
W5 vale como está.

Morfológico: a piora (+11 frases, +1 título, +1 lacuna) vem de **dois casos**, conferidos nas chamadas:
- `a3ea0fea` — o extrator devolveu `null` nos ossos longos que o ditado traz com clareza ("Tíbia: 36,2 mm…"), e o laudo saiu
  com `____` e sem o item "IG pela ultrassonografia precoce". **Omissão esporádica**: repetido 3 vezes
  (`2026-10-10T15-13-51-morfologico`), saiu certo nas 3 — 1 falha em 4 execuções. Não é efeito do guard nem da regra A13
  (não houve marca de revisão nem texto livre envolvido).
- `c18f149a` — ditado colado de morfológico de 1º trimestre com "ducto venoso … onda trifásica" (marcador) e
  "Dopplervelocimetria normal das artérias uterinas" na conclusão. Hoje o extrator pôs o ducto no **módulo Doppler** e o
  renderer acrescentou "COM DOPPLER COLORIDO" no título, seção DOPPLERVELOCIMETRIA e "Dados Doppler insuficientes", perdendo
  a conclusão das uterinas. Repetido 3 vezes (`2026-10-10T15-15-50-morfologico`): 1 reproduz, 1 perde só a conclusão das
  uterinas, 1 sai correta (na W5 saiu correta). **Instabilidade real do extrator obstétrico** neste tipo de ditado —
  encaminhar à frente obstétrica (W2/W5); não é regressão do motor.
- Os demais 11 que mudaram têm semelhança ≥ 0,98 (situação/polo cefálico repetidos, já descritos na W5).

### Leitura para o GO

- MSK no Haiku: mantém o resultado da W14 (omissão 5,0% × 8,7% da produção; zero invasão de numeração).
- Obstétrica/Doppler: mantém a W5.
- Morfológico: **risco fechado em `fix/morfologico-extracao`** — ossos longos do bloco da calculadora e DV do 1º
  trimestre agora determinísticos; 4/4 repetições + rodada completa corretas nos dois casos; placar dos 23 volta ao
  nível da W5 (274 × 272). Detalhe e dois achados residuais (IG pela US precoce; item livre repetido no 2º tri) em
  `W1-relatorio.md`, seção MORFO.

## 2. Variáveis de ambiente da Vercel (produção)

Legenda da ação: **manter** (já existe, não mexer) · **conferir** (existe; o valor atual, que não foi lido, precisa
bater com o proposto) · **remover** (o código não lê mais, ou lê e o default novo é o certo) · **não criar** (o default do
código é o valor certo; criar só para mudar) · **criar** (falta e é necessária).

### 2.1 Motor de IA (W1)

| Env | Na Vercel hoje | Ação | Valor proposto / observação |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | existe | **manter** | chave de produção (já usada pelo Laudo Livre e pelo smoke real do orquestrador). Só o nome aqui. |
| `ANTHROPIC_WORKSPACE_ID` | existe | manter | — |
| `OPENAI_API_KEY` | existe | manter | transcrição, embeddings, consultor, modo difícil, Writer V2, rollback |
| `LLM_EXTRACTION_MODEL` / `LLM_EXTRACTION_EFFORT` | não | **não criar** | default `claude-haiku-5-5` / `medium` |
| `LLM_WRITER_MODEL` / `LLM_WRITER_EFFORT` | não | **não criar** | default `claude-haiku-5-5` / `medium` |
| `LLM_SANITY_MODEL` / `LLM_SANITY_EFFORT` | não | não criar | default `claude-haiku-5-5` / `medium` |
| `LLM_VISION_MODEL` | não | não criar | default `claude-haiku-5-5` |
| `LLM_WRITER_MODEL_BY_CATEGORY` | não | **não criar** | ausente = default do código: `PELVE_FEMININA` e `DOPPLER_CAROTIDAS` → `claude-sonnet-5-5`; MSK e demais no Haiku (decisões 16 e 18). Criar só para mudar; vazia = ninguém no Sonnet. |
| `LLM_SONNET_SERVER_FALLBACK` | não | não criar | default `true` (fallback de recusa do servidor no Sonnet 5.5) |
| `FULL_WRITER_CATEGORIES` | não | **não criar** | ausente = default do código: `ABDOMEN_TOTAL,ABDOMEN_SUPERIOR,MAMARIA,VIAS_URINARIAS,DOPPLER_CAROTIDAS` (TIREOIDE e PROSTATA_SUPRAPUBICA no renderer). Rollback total para o renderer: criar com valor **vazio**. |
| `OPENAI_MODEL_STRUCTURER`, `OPENAI_MODEL_WRITER`, `OPENAI_MODEL_SANITY`, `OPENAI_WRITER_REASONING_EFFORT` | existem | **remover** | o código não lê mais (substituídas pelas `LLM_*`); deixá-las sugere que ainda mandam. |
| `MSK_WRITER_MODEL` | **existe** | **remover** | é o modelo do writer dedicado do MSK desde que o MSK saiu do default por categoria (decisão 16). Ausente = `claude-haiku-5-5`. Com `gpt-4.1*` o código troca por Haiku com aviso no log; com **outro** modelo OpenAI (ex.: `gpt-5.4`) o MSK continuaria na OpenAI. |
| `PELVE_WRITER_MODEL`, `PARTES_MOLES_WRITER_MODEL`, `DOPPLER_RENAL_WRITER_MODEL`, `DOPPLER_HEPATICO_WRITER_MODEL`, `DOPPLER_VENOSO_WRITER_MODEL` | não | não criar | default `claude-haiku-5-5` (a pelve vai ao Sonnet pela exceção por categoria). |
| `OPENAI_MODEL_CONSULTANT_FALLBACK` | existe | **conferir** ou remover | default novo `gpt-5.4-mini`; se o valor for `gpt-4.1`, o código já recusa e usa `gpt-5.4-mini` — remover deixa explícito. |
| `OPENAI_MODEL_CONSULTANT` | não | — | default `gpt-5` (fora da migração) |
| `WRITER_V2_MODEL` | não | não criar | default `gpt-5.4-mini` (Writer V2 experimental, OpenAI) |
| `HARD_MODE_ENABLED`, `HARD_MODE_MODEL` | existem | manter | fora do escopo (gpt-5.4) |
| `TESTE_*` | existem | manter | fora do escopo |
| `LIVRE_HAIKU_MODEL` | existe | **conferir** | tem de ser `claude-haiku-5-5` (o Livre recusa outro valor) |
| `LIVRE_ROUTER_ENABLED`, `LIVRE_ROUTER_EFFORT`, `LIVRE_WRITER_EFFORT` | existem | manter | — |
| `LIVRE_ANTHROPIC_MODEL`, `LIVRE_ANTHROPIC_EFFORT`, `LIVRE_OPENAI_MODEL`, `LIVRE_OPENAI_REASONING_EFFORT` | existem | **remover** | nenhum código do `apps/api` lê (resto de uma versão anterior do Livre). |

### 2.2 Roteamento e caminhos (flags que o pacote assume)

| Env | Na Vercel hoje | Ação | Valor esperado |
|---|---|---|---|
| `RENDERER_CATEGORIES` | existe | **conferir** | precisa conter as categorias que ficam no renderer (a auditoria de produção mostra renderer em OBSTETRICA, MORFOLOGICO, TIREOIDE, MAMARIA, CERVICAL, ABDOMEN_TOTAL, ABDOMEN_SUPERIOR, PROSTATA_SUPRAPUBICA, VIAS_URINARIAS, PELVE_FEMININA, PARTES_MOLES, MUSCULOESQUELETICO_V2). `FULL_WRITER_CATEGORIES` só subtrai dela; não mexer. |
| `MSK_WRITER` | existe | **conferir** | `true` (writer dedicado do MSK) |
| `PELVE_WRITER` | existe | **conferir** | `true` (writer dedicado da pelve, Sonnet 5.5) |
| `PARTES_MOLES_WRITER` | existe | conferir | `true` (como hoje) |
| `MSK_PASSTHROUGH` | existe | manter | — |
| `COMMAND_OPERATIONS` | existe | manter | `true` (guard de comandos por laudo usa este caminho) |
| `COMMAND_INTERPRETER`, `COMMAND_PREGEN` | existem | manter | — |
| `WRITER_V2_CATEGORIES`, `WRITER_V2_ABDOME_USER_ID` | existem | manter | Writer V2 só abre com modelo OpenAI e usuário autorizado |
| `DOPPLER_STANDALONE_V2`, `CLINICAL_MODELS_V1_ENABLED`, `HEPATIC_REPORTS_V1_ENABLED`, `DOPPLER_RENAL_WRITER_ENABLED`, `DOPPLER_VENOSO_MMII_WRITER_ENABLED`, `DOPPLER_HEPATICO_WRITER_ENABLED` | não | não criar | defaults `true` |
| Flags obstétricas (`OBST_BIOMETRIA_DET`, `OBST_IG_SANITY`, `OBST_REF_DEDUP`, `IG_REFERENCE_CORRECTION`, `FLEXIBLE_CONCLUSION`, `GRANNUM_PLACENTA`, `DOPPLER_UMBILICAL_SAFETY`, `GOLF_BALL_SNIPPET`, `MODEL_CATALOG_CATEGORIES`) | existem | manter | a bancada obstétrica roda com estes valores de produção |

### 2.3 Léxico da casa e Deepgram (W11)

| Env | Na Vercel hoje | Ação | Valor proposto |
|---|---|---|---|
| `LEXICO_DITADO_CATEGORIES` | não | **não criar** | ausente = camada de ditado ligada em todas as categorias; `""` desliga (rollback) |
| `LEXICO_SAIDA_CATEGORIES` | não | **não criar** | ausente = camada de saída ligada em todas; `""` desliga |
| `LEXICO_DESLIGADAS` | não | não criar (por ora) | ausente = todas as entradas ativas. **Pendente do Luiz (W11 §5.3):** se ele não quiser romano sempre nos compartimentos do punho, criar com `compartimento-romano`. |
| `DEEPGRAM_KEYTERMS_W11_CATEGORIES` | não | **não criar** | ausente = **desligado** (decisão: cautela no Deepgram; W11 §5.6 fica para depois) |
| `DEEPGRAM_KEYTERMS_ENABLED` | não | não criar | default `true` (keyterms antigos, como hoje) |

### 2.4 Resumo das ações na Vercel

- **Remover (9):** `OPENAI_MODEL_STRUCTURER`, `OPENAI_MODEL_WRITER`, `OPENAI_MODEL_SANITY`, `OPENAI_WRITER_REASONING_EFFORT`,
  `MSK_WRITER_MODEL`, `LIVRE_ANTHROPIC_MODEL`, `LIVRE_ANTHROPIC_EFFORT`, `LIVRE_OPENAI_MODEL`, `LIVRE_OPENAI_REASONING_EFFORT`
  (e, opcionalmente, `OPENAI_MODEL_CONSULTANT_FALLBACK`).
- **Conferir o valor (6):** `ANTHROPIC_API_KEY` (válida em produção), `LIVRE_HAIKU_MODEL` = `claude-haiku-5-5`,
  `RENDERER_CATEGORIES` (lista acima), `MSK_WRITER` = `true`, `PELVE_WRITER` = `true`, `PARTES_MOLES_WRITER` = `true`.
- **Criar: nenhuma.** Todos os valores novos (Haiku/Sonnet por categoria, writer completo, léxico ligado, keyterms W11
  desligados) são o default do código.
- **Rollback rápido sem deploy:** `FULL_WRITER_CATEGORIES=` (tudo de volta ao renderer); `LLM_WRITER_MODEL_BY_CATEGORY=`
  (ninguém no Sonnet); `LLM_WRITER_MODEL=gpt-5.4-mini` + `LLM_WRITER_EFFORT=low` (writer de volta à OpenAI);
  `LEXICO_DITADO_CATEGORIES=` / `LEXICO_SAIDA_CATEGORIES=` (léxico desligado).

### 2.5 Fora do motor (não avaliado aqui)

`SALA_CANONICAL_ENABLED` (Sala), `TRANSCRIBE_MODEL` (transcrição), `GITHUB_TOKEN`/`GITHUB_WEBHOOK_SECRET` (webhook do admin)
são lidas pelo `apps/api` e não mudam com a migração. `GITHUB_BRANCH`, `GITHUB_OWNER`, `GITHUB_REPO` não são lidas pelo
`apps/api` (podem servir a outro app). Demais envs (Supabase, Deepgram, Apple, auditoria, catálogo, personalização) não
mudam.
