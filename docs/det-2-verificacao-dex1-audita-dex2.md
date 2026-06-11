# DET-2 — Verificacao adversarial cruzada DEX1 audita DEX2

Escopo auditado: `docs/det-2-sql-{pelve_feminina,tireoide,mamaria,cervical}.sql` e `docs/det-2-allowlist-{pelve_feminina,tireoide,mamaria,cervical}.json`.

Comandos/evidencias usados sem tocar DB: leitura dos SQLs/allowlists, SELECT readonly em `knowledge_blocks` e `writing_styles`, `DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts <CAT>` no estado atual, leitura de `bundleLoader.ts`, `route.ts`, contratos hardcoded e fonte viva `/Users/luizprazeres/laudousg/lib/categoryDefaults.ts`.

## PELVE_FEMININA — PROBLEMA

Veredito: o SQL nao causa `BUNDLE_NO_TEMPLATE`, mas deixa quatro modelos conflitantes por estilo e o caminho deterministico atual nao aplica `applyPelveRouteSelection`.

Evidencia A — template apos SQL: OK parcial. O SQL nao arquiva nenhum `kind=modelo`. Sobram, por cada um dos 3 estilos classicos, estes 4 modelos validated:

| Estilo | Modelos validated pos-SQL |
|---|---|
| `CLASSICO_COMPLETO` | `pelve-feminina-modelo-template-pos-abortamento`, `pelve-feminina-modelo-template-ta`, `pelve-feminina-modelo-template-ta-tv`, `pelve-feminina-modelo-template-tv` |
| `DIRETO_OBJETIVO` | mesmos 4 |
| `DETALHADO_PROTOCOLAR` | mesmos 4 |

Isso evita `BUNDLE_NO_TEMPLATE`, mas cria bundle ambíguo. Em `route.ts`, quando `useDeterministicBundle` e true, `blocks = bundle.blocks`; o `applyPelveRouteSelection(...)` so roda no branch RAG. Em `bundleLoader.ts`, `MODELO_VARIANT_SELECTORS` atual so tem `DOPPLER_VENOSO_MMII` e `ABDOMEN_TOTAL`. Logo, se `PELVE_FEMININA` entrar na flag hoje, os quatro templates entram juntos no prompt.

Evidencia B — cobertura da fonte viva: OK com ressalva. O diff atual acusa `drift=36 gap=2`, mas os dois gaps sao `REGRAS ESPECIFICAS DA PELVE...` e `SAIDA Retornar apenas...`, cobertos pelo `PELVE_FEMININA_CONTRACT`. O SQL arquiva duplicatas e preserva os modelos; nao vejo gap novo real contra a fonte viva, desde que o contrato continue carregado.

Evidencia C — variantes: PROBLEMA. A analise propoe seletor TA/TV/TA+TV/pos-abortamento, mas o artefato executavel nao o implementa. O SQL sozinho deixa variantes conflitantes no bundle. Isso e ruim o suficiente para bloquear ligar `PELVE_FEMININA` no `DETERMINISTIC_BUNDLE_CATEGORIES`.

Evidencia D — INSERT/dollar-quoting: OK. Nao ha INSERT neste SQL.

Evidencia E — curadoria mobile: OK. O SQL preserva `preservar-terminologia`, `frases-normais`, `posicao-uterina-vocabulario`, medidas incompletas, padrao de diagnostico/conclusao, recomendacao clinica e conclusao de adenomiose. Nao vi remocao de curadoria insubstituivel.

## TIREOIDE — PROBLEMA

Veredito: o SQL preserva/injeta template, mas deixa dois modelos conflitantes por estilo e o seletor TIREOIDE ainda nao existe no `bundleLoader.ts`.

Evidencia A — template apos SQL: OK parcial. O SQL arquiva `tireoide-modelo-template-com-doppler` atual e insere um novo seed do mesmo titulo. Pos-SQL mental, sobram por estilo:

| Estilo | Modelos validated pos-SQL |
|---|---|
| `CLASSICO_COMPLETO` | `tireoide-modelo-template-padrao`, `tireoide-modelo-template-com-doppler` novo |
| `DIRETO_OBJETIVO` | mesmos 2 |
| `DETALHADO_PROTOCOLAR` | mesmos 2 |

Nao ha `BUNDLE_NO_TEMPLATE`, mas ha conflito de modelo. O bundle deterministico atual nao tem selector `TIREOIDE`, entao sem alteracao de codigo os dois modelos entram juntos quando a categoria estiver na flag.

Evidencia B — cobertura da fonte viva: OK. O diff atual ja da `gap=0`; depois do SQL, o modelo Doppler reescrito e substituido por seed com placeholders `____`, alinhado ao `TIREOIDE_MODELO_DOPPLER` hardcoded e a fonte viva. As regras/frases arquivadas sao duplicadas do contrato/modelos ou conteudo tecnico extra (`recomendacoes-acr-tirads-2017`) que nao pertence ao bundle deterministico basico.

Evidencia C — variantes: PROBLEMA. A analise propoe regex de Doppler com negacao, mas isso esta apenas no markdown. `MODELO_VARIANT_SELECTORS` nao tem `TIREOIDE`. Sem esse codigo, exame sem Doppler recebe tambem o template com Doppler; exame com negacao tipo "sem Doppler" tambem.

Evidencia D — INSERT/dollar-quoting: OK parcial. O SQL tem 2 ocorrencias de `$c$`, formando um par correto. `select distinct ... from knowledge_blocks where category_code = 'TIREOIDE'` nao multiplica por bloco porque o projection constante + `writing_style_id` fica distinto por estilo. Porem nao ha `not exists`: se for reexecutado, o `UPDATE` arquiva tambem seed anterior pelo mesmo titulo e insere outro seed novo. Nao duplica validated apos reexecucao, mas gera churn historico e IDs novos.

Evidencia E — curadoria mobile: OK. O SQL preserva `preservar-terminologia`, `frases-normais`, `nodulos-com-classificacao`, `linfonodos-cervicais` e a excecao de linfonodos normais no corpo. Nao vi remocao de curadoria insubstituivel.

## MAMARIA — PROBLEMA

Veredito: ha um FATAL real para o estilo `OBJETIVO`: o SQL arquiva o unico `kind=modelo` validated desse estilo e nao insere substituto.

Evidencia A — template apos SQL: PROBLEMA FATAL. Pos-SQL mental:

| Estilo | Modelos validated pos-SQL |
|---|---|
| `CLASSICO_COMPLETO` | `mamaria-modelo-template-padrao` |
| `DIRETO_OBJETIVO` | `mamaria-modelo-template-padrao` |
| `DETALHADO_PROTOCOLAR` | `mamaria-modelo-template-padrao` |
| `OBJETIVO` | nenhum |

O quarto estilo existe (`44444444-4444-4444-8444-444444444444`, code `OBJETIVO`). No inventario readonly, esse estilo tinha `mamaria-modelo-template-mamas-sem-axilas`, e o SQL arquiva esse titulo. Como `loadDeterministicBundle` bloqueia se nao houver `kind=modelo`, MAMARIA + OBJETIVO cairia em `BUNDLE_NO_TEMPLATE` antes do contrato objetivo conseguir ajudar.

Evidencia B — cobertura da fonte viva: OK nos estilos com modelo, problema operacional no OBJETIVO. O diff atual acusa `drift=28 gap=3`; os gaps de fonte viva sobre nodulo solido e conclusoes BI-RADS estao tratados pela allowlist proposta como curadoria mobile (`circunscritas` e BI-RADS nao inferido) e pelo contrato hardcoded `MAMARIA_CONTRACT`. Para `OBJETIVO`, porem, a cobertura teorica do contrato nao basta porque o gate do bundle exige modelo em `knowledge_blocks`.

Evidencia C — variantes: OK depois do archive, mas com custo fatal no OBJETIVO. Para os tres estilos classicos, arquivar `mamaria-modelo-template-mamas-sem-axilas` remove a variante conflitante e sobra apenas o padrao. A decisao de tratar axilas por contrato/escopo e boa. O erro foi nao garantir um modelo para `OBJETIVO`.

Evidencia D — INSERT/dollar-quoting: OK. Nao ha INSERT neste SQL, mas justamente por isso o buraco do `OBJETIVO` fica sem correcao.

Evidencia E — curadoria mobile: OK. O SQL preserva `preservar-terminologia`, `frases-normais`, `nodulo-solido`, `conclusao-imagens-solidas-birads`, `birads-nao-inferir` e `margens-circunscritas`. BI-RADS nao foi removido; a remocao e de duplicatas/modelo sem axilas.

## CERVICAL — OK com ressalva

Veredito: o SQL e coerente como saneamento DET-2: remove reescrita externa e semeia a fonte viva como modelo unico. Nao vejo bloqueante para o artefato, mas ele tambem leva seed para `OBJETIVO` sem modelo objetivo proprio.

Evidencia A — template apos SQL: OK. O SQL arquiva todo o bundle antigo e insere `cervical-modelo-template-padrao`. Pos-SQL mental, sobra 1 modelo por cada um dos 4 estilos (`CLASSICO_COMPLETO`, `DIRETO_OBJETIVO`, `DETALHADO_PROTOCOLAR`, `OBJETIVO`). Nao ha `BUNDLE_NO_TEMPLATE`.

Evidencia B — cobertura da fonte viva: OK. O diff atual acusa `drift=132 gap=8`, mas isso e antes do SQL. O seed inserido no SQL corresponde ao bloco `CERVICAL` da fonte viva: funcao, regras gerais, modelo normal, frase de linfonodos normais por nivel e linfonodo aumentado/suspeito. Como `CERVICAL` nao tem contrato hardcoded, esse INSERT e necessario e cobre os gaps essenciais.

Evidencia C — variantes: OK. Nao ha variantes legitimas na fonte viva; apos SQL sobra um unico modelo. Nao precisa selector em `MODELO_VARIANT_SELECTORS`.

Evidencia D — INSERT/dollar-quoting: OK parcial. O SQL tem 2 ocorrencias de `$c$`, formando um par correto. `select distinct ... from knowledge_blocks where category_code = 'CERVICAL'` gera uma linha por estilo, nao uma por bloco. Mas tambem nao tem `not exists`: reexecucao arquiva o seed anterior pelo mesmo titulo e cria outro seed novo. Nao duplica validated, mas gera churn historico.

Evidencia E — curadoria mobile: OK para o objetivo DET-2. A allowlist vazia faz sentido porque o conteudo antigo era reescrita externa AIUM/Robbins/AAO-HNS, nao curadoria mobile validada da fonte viva. Se Luiz quiser preservar essa medicina mais rica, deve virar curadoria clinica separada; nao deve ficar misturada no saneamento.

## Resumo do bloqueio

Nao aplicaria estes SQLs como lote e nao ligaria essas quatro categorias na flag depois deles.

Bloqueantes:

1. `MAMARIA`: FATAL em `OBJETIVO`, fica sem `kind=modelo` e bloqueia por `BUNDLE_NO_TEMPLATE`.
2. `PELVE_FEMININA`: quatro modelos entram juntos no bundle deterministico, porque o seletor de pelve atual so roda no caminho RAG.
3. `TIREOIDE`: dois modelos entram juntos no bundle deterministico, porque nao ha selector `TIREOIDE` em `MODELO_VARIANT_SELECTORS`.

Aceitavel:

`CERVICAL` passa como artefato de saneamento, com ressalva de idempotencia/churn historico por falta de `not exists`.

VERIFICACAO CRUZADA DEX1 PRONTA
