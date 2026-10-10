# Pacote de deploy — migração Haiku 5.5 (GO final, 10/10/2026)

HEAD avaliada: `feat/haiku-migration` `65964d9b`, com tudo integrado: motor Haiku, W5/W6, W11 léxico, W12 FIGO, W14/W14b,
W15 técnica, "calcule o volume", correlação só quando ditada e as decisões do Luiz. Este documento é da branch
`docs/go-final`, criada a partir dela.

Nada foi enviado, publicado nem alterado: sem push, sem deploy, sem `vercel env add/rm`, sem escrita no banco. Na Vercel só
houve leitura: `vercel env ls production` dos dois projetos e `vercel inspect` dos deployments que estão no ar. A Vercel
mostra os valores como *Encrypted*, então aqui ficam só **nomes** e os valores que **propomos**; nenhum valor atual foi lido.
A lista de nomes do `laudousgmobile` é a mesma da leitura do REBENCH (nenhuma env entrou ou saiu desde então).

**Atenção — a env só vale a partir do deploy seguinte.** Na Vercel, cada deployment congela as envs da hora do build:
- criar, remover ou trocar uma env não muda o deployment que já está no ar;
- promover ou voltar um deployment antigo traz de volta as envs dele.

Consequências:
- as envs da seção 1 são mexidas **antes** do deploy candidato;
- o rollback por `vercel rollback`/`promote` do deployment anterior é limpo, porque ele mantém as envs antigas;
- todo "rollback por env" deste documento é **sem mudar código, mas com redeploy**: criar ou trocar a env e rodar
  `vercel redeploy <url do deployment em produção> --scope prazeresapp` (um build, alguns minutos). Corrige o "sem
  deploy" dos documentos anteriores.

## 1. Envs da Vercel — projeto `laudousgmobile` (API, produção)

### 1.1 Remover (9, mais 1 opcional)

O código desta HEAD não lê nenhuma delas (só aparecem em comentário do `env.ts`). Deixá-las faz parecer que ainda mandam.

| Env | Por quê |
|---|---|
| `OPENAI_MODEL_STRUCTURER`, `OPENAI_MODEL_WRITER`, `OPENAI_MODEL_SANITY`, `OPENAI_WRITER_REASONING_EFFORT` | Substituídas pelas `LLM_*` (motor por papel, default `claude-haiku-5-5`/`medium`). |
| `MSK_WRITER_MODEL` | **Esta é lida**: é o modelo do writer dedicado do MSK. Ausente = `claude-haiku-5-5` (decisão 16). Com um valor `gpt-4.1*`, o código troca por Haiku e avisa no log. Com outro modelo OpenAI (ex.: `gpt-5.4`), o MSK **continuaria na OpenAI**. Remover antes do deploy candidato. |
| `LIVRE_ANTHROPIC_MODEL`, `LIVRE_ANTHROPIC_EFFORT`, `LIVRE_OPENAI_MODEL`, `LIVRE_OPENAI_REASONING_EFFORT` | Nenhum código lê (sobra de uma versão anterior do Livre). |
| `OPENAI_MODEL_CONSULTANT_FALLBACK` (opcional) | Default novo `gpt-5.4-mini`. Se o valor for `gpt-4.1`, o código já recusa e usa `gpt-5.4-mini`; remover deixa isso explícito. |

Rollback: não há o que repor. O código novo não lê essas envs, e o deployment anterior guarda os valores dele. **Não
reconstruir** o código antigo (`main` `312c9df8`) depois de removê-las: sem elas, ele cai no default `gpt-4.1-mini`/`gpt-4.1`,
que não é o que roda hoje. Voltar sempre por `vercel rollback`/`promote` do deployment anterior (seção 3).

### 1.2 Criar (1) — keyterms W11 do Deepgram (o Luiz mandou ligar)

| Env | Valor proposto | Efeito |
|---|---|---|
| `DEEPGRAM_KEYTERMS_W11_CATEGORIES` | **`MAMARIA`** | O `/api/deepgram/token?category=MAMARIA` passa a devolver a lista W11 da mama: 30 → 33 termos (348 caracteres, abaixo do teto de 500 tokens). Entram `superolateral`, `inferolateral`, `superomedial` e `inferomedial`; sai `córtico-medular` (o médico assina "córtico medular"/"corticomedular"). As outras categorias não mudam. |

- **Onde vale:** só no ditado ao vivo do **iOS**. O app manda `?category=` com o `rawValue` da categoria (`MAMARIA`) ao
  pedir o token, e o build atual já faz isso. O Android e a web não usam Deepgram, então não mudam.
- **Próximo passo:** depois de 1–2 semanas, compare nos ditados novos de mama "superlateral/super lateral" com
  "superolateral" (`lexico-mineracao.ts`, W11 §4). Se melhorar, passe para `MAMARIA,MUSCULOESQUELETICO_V2`. No MSK entram
  `supraespinhal`, `infraespinhal`, `subdeltoidea` e `metacarpofalangiana`: 41 → 40 termos, 457 caracteres.
- **Nos logs:** confirme que a conexão abre sem "Keyterm limit exceeded".
- **Rollback:** remover a env (ou deixá-la vazia) + redeploy. Não precisa de versão nova do app.
- **Comando** (orquestrador): `printf 'MAMARIA' | vercel env add DEEPGRAM_KEYTERMS_W11_CATEGORIES production --scope prazeresapp`.
  O `printf` sem `\n` evita o problema do valor com quebra de linha; a leitura da lista também apara espaços.

### 1.3 Conferir o valor (6) — existem; o valor não foi lido

| Env | Valor esperado |
|---|---|
| `ANTHROPIC_API_KEY` | Chave de produção válida. É a única env que o motor novo exige: sem ela, extração, writers e Livre falham. O `/api/health` **não** testa a Anthropic (só Supabase, Deepgram e OpenAI), então quem prova a chave é o smoke de geração (seção 3, passo 3). |
| `LIVRE_HAIKU_MODEL` | `claude-haiku-5-5` (o Livre recusa outro valor) |
| `RENDERER_CATEGORIES` | Inclui as categorias do renderer: OBSTETRICA, MORFOLOGICO, TIREOIDE, MAMARIA, CERVICAL, ABDOMEN_TOTAL, ABDOMEN_SUPERIOR, PROSTATA_SUPRAPUBICA, VIAS_URINARIAS, PELVE_FEMININA, PARTES_MOLES e MUSCULOESQUELETICO_V2. O `FULL_WRITER_CATEGORIES` só subtrai dela; não mexer. |
| `MSK_WRITER` | `true` (writer dedicado do MSK, Haiku) |
| `PELVE_WRITER` | `true` (writer dedicado da pelve, Sonnet 5.5) |
| `PARTES_MOLES_WRITER` | `true` |

### 1.4 Flags novas que não se criam (o default do código é o valor do GO)

Ausente = ligado como foi testado. Criar só para fazer rollback (com redeploy, ver o topo).

| Env | Ausente (default) | Rollback |
|---|---|---|
| `LEXICO_DITADO_CATEGORIES` | Léxico da casa no ditado, em todas as categorias (W11) | `""` desliga a camada; `"A,B"` = só essas |
| `LEXICO_SAIDA_CATEGORIES` | Léxico da casa na saída (o que a IA escreve), em todas | `""` desliga |
| `LEXICO_DESLIGADAS` | As 11 entradas ativas. Decisão de 10/10: compartimentos do punho **sempre em romano**, como está; não criar. | Desliga entradas por id: `ecoico-sem-acento`, `ecogenico-para-ecoico`, `quadrante-mama-grafia`, `quadrante-mama-contextual`, `compartimento-romano`, `segmento-hepatico-romano`, `ecogenico-sozinho`, `bursa-subacromial-subdeltoidea`, `bolsa-para-bursa`, `modificacao-padrao-ecotextural`, `metacarpofalangiana` |
| `CORRELACAO_SO_DITADA` | `true`: "Correlacionar com dados clínicos" só quando ditado, em todo caminho do `/api/generate` | `false` desliga só o guard. As frases fixas já sem a correlação (renderers, catálogo, prompts, web) são código e não voltam pela env. |
| `TECNICA_GUARD` | Ligado (W15): COMENTÁRIOS por via, transdutor e contexto ditados, mais a frase de técnica preferida da conta | `false` desliga os dois, **inclusive a técnica preferida** que o médico salvou |
| `DEEPGRAM_KEYTERMS_ENABLED` | `true` (keyterms por categoria, como hoje) | `false` desliga todos os keyterms |
| `LLM_EXTRACTION_MODEL`/`_EFFORT`, `LLM_WRITER_MODEL`/`_EFFORT`, `LLM_SANITY_MODEL`/`_EFFORT`, `LLM_VISION_MODEL` | `claude-haiku-5-5` / `medium` | Writer de volta à OpenAI: `LLM_WRITER_MODEL=gpt-5.4-mini` + `LLM_WRITER_EFFORT=low` (o mesmo vale para os outros papéis) |
| `LLM_WRITER_MODEL_BY_CATEGORY` | `PELVE_FEMININA` e `DOPPLER_CAROTIDAS` → `claude-sonnet-5-5`; o resto no Haiku | `""` = ninguém no Sonnet |
| `LLM_SONNET_SERVER_FALLBACK` | `true` | `false` |
| `FULL_WRITER_CATEGORIES` | `ABDOMEN_TOTAL,ABDOMEN_SUPERIOR,MAMARIA,VIAS_URINARIAS,DOPPLER_CAROTIDAS` no writer completo | `""` = todas de volta ao renderer |
| `PELVE_WRITER_MODEL`, `PARTES_MOLES_WRITER_MODEL`, `DOPPLER_RENAL_WRITER_MODEL`, `DOPPLER_HEPATICO_WRITER_MODEL`, `DOPPLER_VENOSO_WRITER_MODEL` | `claude-haiku-5-5` (a pelve vai ao Sonnet pela exceção por categoria) | — |
| `WRITER_V2_MODEL` | `gpt-5.4-mini` (Writer V2 experimental, OpenAI) | — |

### 1.5 Manter (sem mudança)

- **Fora da migração:** `ANTHROPIC_WORKSPACE_ID`, `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_MODEL_CONSULTANT`, as
  `HARD_MODE_*`, as `TESTE_*` e as `LIVRE_ROUTER_*`/`LIVRE_WRITER_EFFORT`. A chave da OpenAI continua necessária: o
  `/api/health` a testa, e transcrição, embeddings, consultor, modo difícil e Writer V2 a usam.
- **Roteamento, comandos e edição:** `MSK_PASSTHROUGH`, `COMMAND_*`, `EDIT_INCREMENTAL`, as `WRITER_V2_*`.
- **Flags obstétricas e de renderer** (a bancada roda com estes valores): `OBST_BIOMETRIA_DET`, `OBST_IG_SANITY`,
  `OBST_REF_DEDUP`, `IG_REFERENCE_CORRECTION`, `FLEXIBLE_CONCLUSION`, `GRANNUM_PLACENTA`, `DOPPLER_UMBILICAL_SAFETY`,
  `GOLF_BALL_SNIPPET`, `MODEL_CATALOG_CATEGORIES`, `MODEL_CUSTOMIZATION_*`, `TIREOIDE_PICO_OMIT`, `PELVE_CONCL_DEDUP`,
  `MAMARIA_BIRADS_GUARD`, `ASR_CLINICAL`, `RENDERER_PROGRESS`, `VENOUS_SCHEME_*`.
- **Infra:** Supabase, Deepgram, catálogo, Apple, auditoria, Sala, GitHub.
- **`PROMPT_VERSION` na Vercel:** só rotula a tabela `runs` (`runsRepo`). A versão que vai no laudo vem do código (`v1.15`).
  Não afeta o GO.

### 1.6 Resumo

**Remover 9** (+1 opcional) · **criar 1** (`DEEPGRAM_KEYTERMS_W11_CATEGORIES=MAMARIA`) · **conferir 6** · **nenhuma
outra criação**.

## 2. Web — projeto `laudousg-web` (`apps/web`)

**Envs: nenhuma mudança.** O código desta HEAD lê as mesmas envs que a `main` lê. As da Vercel, todas existentes, são:
`NEXT_PUBLIC_API_URL`, `CATALOG_API_URL`, `CATALOG_SERVICE_TOKEN`, as `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`,
`ABACATEPAY_*` e `WEB_*`. As flags novas do motor são da API e não têm par na web.

**O que muda para o médico na web** (62 arquivos de `apps/web` desde a `main`; mais `packages/schemes`, `packages/shared` e
`packages/knowledge`, que entram nos dois projetos):
- **Datação na obstétrica (W6):** o médico escolhe a frase da conclusão (biometria, US precoce ou as duas relacionadas).
  Além disso, `computeIG` segue a política W5.
- **Pelve (W12):** FIGO ↔ localização no formulário dos miomas. A tabela FIGO aprovada (2-5 = "subseroso, estendendo-se desde
  a mucosa") está em `packages/schemes/myoma/figoLocalizacao`.
- **Técnica (W15):**
  - COMENTÁRIOS pela tabela única (`packages/schemes/tecnica`), por via e transdutor;
  - tela nova em **Preferências → Técnica preferida**, por categoria, gravada em
    `account_report_preferences.renderer_preferences.tecnica_padrao`. A mesma frase vale no celular, porque o
    `/api/generate` a aplica.
- **Termos do Luiz:** frases fixas dos órgãos na grafia da casa (hiperecoico, bursa, "modificação do padrão ecotextural").
- **Correlação clínica:** "Correlacionar com dados clínicos" sai das conclusões automáticas e só entra quando o médico
  escolhe.

**Ordem: a API vai antes da web.** A web grava a técnica preferida pela API (`PATCH /api/me/report-preferences`). A API em
produção hoje não conhece `tecnica_padrao`: o zod descarta o campo e responde 200. Com a web nova sobre a API antiga, a
preferência **sumiria em silêncio**.

**Banco: sem migração.** `renderer_preferences` é um JSONB que já existe, e o PATCH faz merge das chaves. As mudanças da
Biblioteca (`knowledge_blocks`) **já estão aplicadas em produção** pelo orquestrador, cada uma com cópia de segurança e SQL
de volta nos relatórios:
- termos: 75 blocos, `knowledge_blocks_bkp_termos_20261010`;
- correlação: 74 blocos, `…_bkp_correlacionar_20261010`;
- técnica de próstata e parede: 16 blocos, `…_bkp_tecnica_20261010`.

O rollback de código não desfaz a Biblioteca. Isso não é preciso, porque o texto novo já está no ar com o código antigo.

**Apps nativos:** nada muda (nem iOS nem Android precisam de build novo). O motor é todo do servidor, e os keyterms W11
usam o `?category=` que o iOS já manda.

## 3. Passos do deploy, na ordem, com o rollback de cada um

Quem executa é o orquestrador/@devops; nada disto foi feito aqui. O método é o mesmo da publicação de 29/09
(`docs/reviews/2026-09-29-sala-api-release.md` e `…-web-release.md`): deploy **candidato sem domínio** de um worktree limpo,
smoke e só então `promote`.

**Linha de base** (lida em 10/10 com `vercel inspect`, os dois de 09/10 10:20, alias `git-main`):

| Projeto | Deployment no ar | URL | Domínios |
|---|---|---|---|
| API `laudousgmobile` | `dpl_88hD8BDPAkPvdWGgZuXfu4bvpM9T` | `laudousgmobile-ldbcgv1x3-prazeresapp.vercel.app` | `laudousgmobile.vercel.app`, `sala.laudousg.com`, `sala.laudousg.com.br` |
| Web `laudousg-web` | `dpl_9f7yhUhNMSZ3YLtdRmvyYMVMWwj2` | `laudousg-pfv9jx9hv-prazeresapp.vercel.app` | `web.laudousg.com`, `laudousg.com.br`, `www.laudousg.com.br` |

> ⚠️ **Não fazer merge nem push na `main` antes da promoção.** Os dois projetos publicam a `main` direto em produção, com
> domínio (integração Git, alias `git-main`). E o inverso também vale: **depois** de promover, a `main` precisa receber o
> mesmo código logo (passo 8). Senão, o próximo push na `main` (um hotfix qualquer) publica o código antigo por cima.

| # | Passo | Como conferir | Rollback |
|---|---|---|---|
| 0 | Anotar a linha de base acima (`vercel inspect laudousgmobile.vercel.app` e `web.laudousg.com`) | IDs batem com a tabela | — |
| 1 | **Envs da API** (seção 1): remover as 9 (+1), criar `DEEPGRAM_KEYTERMS_W11_CATEGORIES=MAMARIA` e conferir as 6 | `vercel env ls production` | Nada a desfazer: o deployment no ar mantém as envs antigas. Se o GO for abortado, remova só a env W11; as removidas não fazem falta enquanto ninguém reconstruir o código antigo (1.1) |
| 2 | **Candidato da API sem domínio**, de um worktree limpo em `65964d9b` (raiz do repo, `.vercel` → `laudousgmobile`; o build vem do `vercel.json` da raiz): `vercel deploy --prod --skip-domain --yes --scope prazeresapp` | `vercel inspect <url>` → ● Ready; log do build `@laudousg/api` | Nenhum: o candidato não recebe tráfego. Descartar. |
| 3 | **Smoke da API no candidato** com `vercel curl` (o deployment tem proteção), conta de teste e ditados sintéticos (lista abaixo) | Tudo da lista; nos logs (`vercel logs <url>`), nenhum 401/403 da Anthropic, nenhum `LIVRE_PROVIDER_NOT_CONFIGURED`, nenhum `gpt-4.1` | Descartar o candidato e corrigir antes de seguir |
| 4 | **Promover a API**: `vercel promote <url do candidato> --yes --scope prazeresapp` | `vercel inspect laudousgmobile.vercel.app` → candidato com os 3 domínios; `/api/health` 200; uma geração pelo app | **Instantâneo:** `vercel rollback dpl_88hD8BDPAkPvdWGgZuXfu4bvpM9T --scope prazeresapp` (ou `promote` da URL de base). Volta com as envs antigas. Depois de um rollback, a Vercel deixa de pôr domínio sozinha nos deploys da `main` até um novo `promote`. |
| 5 | **Observar 30–60 min** com o tráfego real | `vercel logs` sem 5xx novos em `/api/generate`, `/api/edit` e `/api/analyze-image`; latência do `/api/generate` | O mesmo do passo 4 |
| 6 | **Candidato da web sem domínio**, de um worktree limpo em `65964d9b` com `.vercel` → `laudousg-web`: `vercel deploy --prod --skip-domain --yes --scope prazeresapp --local-config apps/web/vercel.json` (conferir no log que o build é `@laudousg/web`, nunca o comando da API do `vercel.json` da raiz) | Ready. Smoke: login; obstétrica com os 3 modos de datação; pelve com mioma FIGO; Preferências → Técnica preferida (salvar, recarregar e ver o valor); um laudo montado por cliques sem "Correlacionar" automático | Descartar o candidato |
| 7 | **Promover a web**: `vercel promote <url> --yes --scope prazeresapp` | Os 3 domínios no candidato; página inicial e `/app` 200 | `vercel rollback dpl_9f7yhUhNMSZ3YLtdRmvyYMVMWwj2 --scope prazeresapp`. A web antiga funciona com a API nova (só não mostra a técnica preferida). |
| 8 | **Levar o código à `main`** (`feat/haiku-migration` → `main`, push pelo @devops). A integração Git refaz o deploy dos dois projetos com o **mesmo** código e as mesmas envs | Os dois deployments novos Ready e com domínio; `/api/health` 200; uma geração | Para voltar, use o `rollback` do deployment anterior; não reverta commits na pressa |
| 9 | **Keyterms W11:** 1–2 semanas de mama e depois decidir o MSK (1.2) | `lexico-mineracao.ts` nos ditados novos | Remover a env + redeploy |

**Smoke do passo 3**, uma geração por família, com ditado sintético e conta de teste. Grava um laudo de teste no banco, com
dados fictícios. Em todas: nenhum "Correlacionar com dados clínicos" que não foi ditado, e COMENTÁRIOS com a técnica da
casa.

| Família | Caminho | O que ver |
|---|---|---|
| Obstétrica 2º/3º tri, com a linha da calculadora | renderer + extração Haiku | IG W5 ("corrigida pela ultrassonografia precoce"), biometria da calculadora, sem `____` |
| Morfológico 1º tri, com ducto venoso | renderer + normalização MORFO | Sem módulo Doppler; conclusão das uterinas presente |
| Tireoide com "calcule o volume" | renderer | Volume do elipsoide (× 0,52, uma casa) somado ao VT |
| Abdome total normal | writer completo (Haiku) | Laudo completo, sem markdown e sem nota do modelo depois da conclusão |
| MSK ombro ("supraespinhal", "bolsa subacromial") | writer dedicado (Haiku) | Grafia da casa ("bursa subacromial-subdeltoidea") |
| Pelve com mioma FIGO 4 | writer dedicado (**Sonnet 5.5**) | Classificação FIGO no corpo e na conclusão |
| Doppler renal ou venoso de MMII | writer Doppler dedicado (Haiku) | Sem cair no writer geral |
| Laudo Livre | roteador + writer Haiku | Exame identificado; sem `LIVRE_PROVIDER_NOT_CONFIGURED` |
| `/api/edit` sobre um laudo pronto | edição incremental (Haiku) | Só o trecho pedido muda |
| `/api/deepgram/token?category=MAMARIA` e `?category=ABDOMEN_TOTAL` | keyterms | Mama com `superolateral`; abdome sem mudança |
| `/api/analyze-image` (opcional) | visão Haiku | Medidas lidas da tela |

## 4. Gates rodados nesta HEAD (`65964d9b`)

As suítes rodaram **offline**: sem chave de LLM, sem `DATABASE_URL`, sem rede para Supabase ou Deepgram.

| Gate | Resultado |
|---|---|
| Typecheck API (`apps/api`, `tsc --noEmit`) | ✅ 0 erros |
| Typecheck web (`apps/web`, `tsc --noEmit`) | ✅ 0 erros |
| Web `pnpm test` (`tests/run-unit.cjs`) | ✅ 74 suítes |
| Pacotes (`packages/*`, 15 arquivos de teste: `schemes` miomas/FIGO e vascular, `shared` calculadoras e modelos clínicos, `db` seed) | ✅ 15/15 |
| API: 231 suítes manuais (`src/**/__tests__/*.manual.ts`) | ✅ **194 passam** (187 direto, 3 a partir da raiz do repo, 4 com env fictícia apontando para `127.0.0.1`) · 25 dependem de LLM, banco, servidor local ou arquivo em `/tmp` (não rodadas, pela regra de LLM só pela assinatura) · **11 falham igual na `main` `312c9df8`** (pré-existentes) · **1 nova**, explicada abaixo |

**Suítes principais (todas ✅):**
- catálogo × renderer: **21600/21600** byte a byte;
- obstétrica W5: 116 verificações;
- `ig-renderer` 12/12; IGCALC 5 blocos; PACOTE2 6 blocos; MORFO 6 blocos;
- `writerOutputGuard` 17/17;
- léxico da casa: 99 verificações (11 entradas);
- correlação clínica 45/45;
- técnica: guard 50/50, via 22/22, golden W15 19/19;
- volume: guard 39/39, tireoide 13;
- `msk-writer-audit` 12/12;
- motor `llm.manual` 26/26.

**A falha nova em relação à `main`:** `renderer/catalog/__tests__/flags-de-producao.manual.ts`, no caso
`IG_REFERENCE_CORRECTION`. **É o teste que está desatualizado; não é defeito.**
- O teste exige que ligar a flag mude o laudo montado por `laudoPadraoDe` (o caminho da Biblioteca e da web).
- Desde a W5/W6, esse caminho manda `datacaoConclusao` (padrão `"biometria"`). Com ele, o renderer força a correção de IG
  (`OBSTETRICA.render.ts:104`), e a frase da 1ª US sai com a flag ligada ou desligada. Então o texto é o mesmo nos dois
  estados.
- O `/api/generate` não passa por esse caminho, e a equivalência catálogo × renderer segue 21600/21600.
- Pendente: atualizar a expectativa do teste para a W5/W6. Não foi feito nesta rodada, que é só de documento.

**As 11 pré-existentes** falham com o mesmo erro na `main`, rodadas com a mesma env fictícia:
- `golf-ball`;
- `obstetricDopplerFlow` e `obstetricaPlainDoppler` (`selectedHint is not defined`);
- `obstetricaPlainFailClosed`;
- `pelveAnexialConditional` (compara com um controle fixo da `main`);
- `pelve-23c3-clinical-matrix`;
- `sprint16a`/`sprint16b-ponta-a-ponta`;
- `pelve-ponta-a-ponta` (campo `mioma2` órfão);
- `modelo-normal` e `biblioteca-todas-categorias` (ABDOMEN_TOTAL sem modelo normal).

Nenhuma é do motor Haiku.

**Cuidado para quem rodar os gates:** três suítes carregam sozinhas o `.env` do checkout principal com `dotenv`
(`editReport`, `camada-flexivel-corpo-smoke`, `doppler-writer-showcase`). Elas fazem **chamada real de LLM** mesmo sem
`--env-file`. Nesta rodada:
- na `main`, chamaram a OpenAI com a chave local (3 chamadas);
- nesta HEAD, a Anthropic recusou com 401 (a chave local não é a de produção).

Para os gates, rode com env fictícia (chaves falsas): o `dotenv` não sobrescreve variável que já existe.

**Não repetido nesta HEAD:**
- `next build` (o build do candidato no passo 2 cumpre esse papel);
- bancada Haiku: a última completa do motor é a IGCALC (`63877776`: obstétrica 194/849, morfológico 273/627, iguais à W5);
  a W15 teve bancada própria de 148 laudos.

Os boletins HTML em `docs/` que algumas suítes regeneram ficaram diferentes do commit (desvio antigo) e foram restaurados.


## Anexo A — Placar do REBENCH (`c7413d0a`): Haiku 5.5 explícito (`BENCH_MODEL=claude-haiku-5-5`), sem juiz

Pela assinatura (`claude -p`), mesmos casos das rodadas finais anteriores, reaproveitadas no mesmo arquivo para comparar
caso a caso. Todas as chamadas de modelo registradas foram ao `claude-haiku-5-5`; nenhuma falha técnica.

| Rodada (hoje, `c7413d0a`) | Casos | Comparado com |
|---|---|---|
| `tmp-review/bench-haiku/2026-10-10T15-03-31-musculoesqueletico_v2` (A4) | 71 MSK (os da W8/W9/W14) | A5 = Haiku final da W14 (`w14/2026-10-10T13-31-20-musculoesqueletico_v2`) |
| `…/2026-10-10T15-03-30-obstetrica+doppler_obstetrico` (A4) | 46 | A = W5 (`obst/…/2026-10-09T23-43-51-obstetrica+doppler_obstetrico`, juiz 6,12) |
| `…/2026-10-10T15-09-17-morfologico` (A4) | 23 | A = W5 (`…/2026-10-09T23-43-51-morfologico`, juiz 5,70) |

**CERVICOMETRIA:** nenhum laudo no banco (a categoria nunca foi usada em produção) — não há caso real para a bancada; o
renderer segue coberto só pelos testes determinísticos.

#### MSK — writer dedicado, Haiku 5.5 (placar da W9, `placar-msk.ts`)

| Candidato | Frases normais do roteiro omitidas (de 519) | Linhas "normal + , com" seguidas (de 15) | Invasões de numeração | Ressalvas inventadas |
|---|---|---|---|---|
| Produção (gpt-4.1) | 45 (8,7%) | 15 | 30 em 4 laudos | 0 |
| W14 final (A5) | 24 (4,6%) | 14 | 0 | 0 |
| **Hoje (A4)** | **26 (5,0%)** | **14** | **0** | **0** |

Equivalente à W14: a diferença de 2 frases está dentro da variação do writer (sem temperatura, o texto não se repete byte a
byte — só 5/71 laudos saíram idênticos ao A5, e é o esperado). Nenhuma invasão de numeração nos laudos com vários exames.
Similaridade com o laudo final 0,70 (= A5).

#### Família obstétrica — Haiku extrai + renderer (`placar.ts`)

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

#### Leitura para o GO

- MSK no Haiku: mantém o resultado da W14 (omissão 5,0% × 8,7% da produção; zero invasão de numeração).
- Obstétrica/Doppler: mantém a W5.
- Morfológico: **risco fechado em `fix/morfologico-extracao`** — ossos longos do bloco da calculadora e DV do 1º
  trimestre agora determinísticos; 4/4 repetições + rodada completa corretas nos dois casos; placar dos 23 volta ao
  nível da W5 (274 × 272). Detalhe e dois achados residuais (IG pela US precoce; item livre repetido no 2º tri, ambos resolvidos no PACOTE2) em
  `W1-relatorio.md`, seção MORFO.


## Execução (10/10/2026, noite — GO do Luiz)

| # | Resultado |
|---|---|
| 0 | Linha de base conferida: API `dpl_88hD8BDPAkPvdWGgZuXfu4bvpM9T`, web `dpl_9f7yhUhNMSZ3YLtdRmvyYMVMWwj2` |
| 1 | Removidas as 9 + `OPENAI_MODEL_CONSULTANT_FALLBACK`; criada `DEEPGRAM_KEYTERMS_W11_CATEGORIES=MAMARIA` |
| 2 | Candidato API `dpl_GZQMmivTefJDYphCJGwJUN3EDYis` (`28651596`), Ready, health 200 |
| 3 | Smoke com a conta demo, 8 famílias + `/api/edit`: todas `done`; auditoria = Haiku 5.5 em tudo, Sonnet 5.5 só no writer da pelve; sem "Correlacionar" não ditado; tireoide "calcule o volume" (istmo 0,2, VT 9,2) |
| 4 | API promovida; health 200; keyterms em produção: mama 33 (com os quadrantes), abdome 35 (igual) |
| 5 | Sem tráfego real no intervalo (sábado à noite) — observação segue nos primeiros laudos reais |
| 6–7 | Web `dpl_DbCMzP17shyeiiHkYWM48X3owT5r` (build `@laudousg/web`), promovida; domínios redirecionam para `www.laudousg.com.br` como antes |
| 8 | `main` avançada por fast-forward `312c9df8..28651596`; deploys da integração Git: API `dpl_Er53L5XtSLEzeovTv1z77PjVm3Vt`, web `dpl_sDEfDW9jrV1mGK1TVxSDkrE3Z5x9`, ambos Ready e com os domínios; geração no domínio público ok |

Rollback (código antigo + envs antigas): `vercel rollback dpl_88hD8BDPAkPvdWGgZuXfu4bvpM9T` (API) e
`vercel rollback dpl_9f7yhUhNMSZ3YLtdRmvyYMVMWwj2` (web). Laudos de teste gravados na conta demo (apple-review).
