# DET-2 — Verificacao cruzada DEX2 audita DEX1

Escopo: auditoria read-only dos artefatos DEX1 para `OBSTETRICA`, `DOPPLER_OBSTETRICO` e `MORFOLOGICO`.

Nao executei os SQLs. A verificacao abaixo simula o efeito por leitura direta de `UPDATE`/`INSERT`, valida os JSONs com `jq`, cruza com o loader deterministico atual e checa se os guards ainda referenciados em `generate/route.ts` ficariam sem bloco canônico.

## Veredito curto

| Categoria | Veredito | Motivo |
| --- | --- | --- |
| OBSTETRICA | PROBLEMA | O SQL deixa 2 modelos validated por estilo (`inicial` + `padrao`) e o `bundleLoader.ts` atual nao tem seletor para `OBSTETRICA`. Se a flag deterministica for ligada assim, os dois templates entram juntos. |
| DOPPLER_OBSTETRICO | OK | O SQL deixa 1 modelo validated por estilo, sem variantes internas conflitantes. Nao achei gap novo nem remocao de guard canonico. |
| MORFOLOGICO | PROBLEMA FATAL | O SQL deixa 3 modelos validated por estilo (`1t` + `2t` + `3t`) e o `bundleLoader.ts` atual nao tem seletor para trimestre. O bundle misturaria trimestres. |

## Base tecnica da refutacao

O `bundleLoader.ts` diz que variantes conflitantes nunca devem entrar juntas, mas `MODELO_VARIANT_SELECTORS` hoje so tem `DOPPLER_VENOSO_MMII` e `ABDOMEN_TOTAL` (`apps/api/src/server/pipeline/bundleLoader.ts:50-85`). Para categoria sem seletor, ele retorna as linhas intactas (`apps/api/src/server/pipeline/bundleLoader.ts:184-185`). Depois disso, o gate so exige existir algum `kind=modelo`, nao exatamente um (`apps/api/src/server/pipeline/bundleLoader.ts:149-153`). Entao qualquer categoria com 2+ modelos validated no mesmo estilo passa pelo gate e entra misturada no writer.

`morfologicoRouteSelection.ts` nao resolve isso. Ele so corrige a categoria efetiva para `MORFOLOGICO` quando o input nomeia morfologico ou combina Doppler + sinais morfologicos fortes (`apps/api/src/server/pipeline/morfologicoRouteSelection.ts:122-157`). Ele nao escolhe `1t`, `2t` ou `3t`.

Os JSONs `docs/det-2-allowlist-{obstetrica,doppler_obstetrico,morfologico}.json` estao sintaticamente validos (`jq empty` passou).

## OBSTETRICA — PROBLEMA

(a) Pos-SQL sobra `kind=modelo` validated por estilo: SIM. O SQL arquiva os modelos antigos nao seed (`docs/det-2-sql-obstetrica.sql:11-35`) e insere `obstetrica-modelo-template-padrao` para os 3 estilos (`docs/det-2-sql-obstetrica.sql:37-102`) e `obstetrica-modelo-template-inicial` para os 3 estilos (`docs/det-2-sql-obstetrica.sql:104-158`). Nao cai em `BUNDLE_NO_TEMPLATE`.

Mas isso vira problema operacional: sobram 2 modelos por estilo. Como nao existe seletor `OBSTETRICA` no `MODELO_VARIANT_SELECTORS`, o bundle carrega `inicial` e `padrao` juntos. Isso mistura mascara de gestacao inicial com mascara obstetrica padrao no mesmo prompt.

(b) Cobertura da fonte viva: nao achei gap novo nos artefatos. O SQL semeia os dois modelos verbatim da fonte (`source_lines:50-80` e `source_lines:82-99`) e a allowlist preserva curadorias mobile relevantes como liquido amniotico e peso fetal. O contrato hardcoded de `OBSTETRICA` tambem segue injetado em `CATEGORY_CONTRACTS` (`apps/api/src/server/prompts/contracts/index.ts:32-37`). O furo nao e cobertura; e selecao de variante.

(c) Variante conflitante: PROBLEMA. A propria analise DEX1 propoe seletor, mas SQL/allowlist nao executam isso. O gatilho minimo deveria escolher exatamente um:

| Variante | Gatilhos positivos realistas | Negacao que deve vencer |
| --- | --- | --- |
| `inicial` | `obstetrica inicial`, `primeiro trimestre`, `1t`, `1o trimestre`, `CCN`, `DSM`, `saco gestacional`, `vesicula vitelina`, `embriao` | `nao usar modelo inicial`, `nao e inicial`, `nao e primeiro trimestre` |
| `padrao` | `segundo trimestre`, `terceiro trimestre`, `DBP`, `CC`, `CA`, `CF`, `peso fetal`, IG >= 14s0d | `nao usar modelo padrao` |

Default seguro pro bundle: `padrao`, exceto se IG/gatilho forte apontar `inicial`. `transvaginal` sozinho nao deveria selecionar inicial se houver biometria fetal de 2T/3T.

(d) Dollar quoting e duplicidade: OK. O conteudo usa `$c$...$c$` sem conflito aparente. Os `INSERT`s usam `NOT EXISTS` por `title + writing_style_id + status validated + tag seed:det-2`, e o `UPDATE` exclui seeds para nao arquivar reexecucao (`docs/det-2-sql-obstetrica.sql:15`, `94-102`, `150-158`). O mesmo titulo pode existir arquivado + seed validated, mas nao duplica validated seed em rerun.

(e) Guards deterministicos: OK. O SQL arquiva excecoes/frases duplicadas, mas nao remove os blocos canonicos preservados na allowlist: `obstetrica-regra-liquido-amniotico-marcadores` e `obstetrica-regra-peso-fetal-percentil` (`docs/det-2-allowlist-obstetrica.json:14`, `44`). Os guards de liquido e peso continuam em codigo (`apps/api/src/app/api/generate/route.ts:775-787`, `819-830`).

## DOPPLER_OBSTETRICO — OK

(a) Pos-SQL sobra `kind=modelo` validated por estilo: SIM. O SQL arquiva o modelo antigo nao seed (`docs/det-2-sql-doppler_obstetrico.sql:11-29`) e insere um unico `doppler-obstetrico-modelo-template-padrao` por estilo (`docs/det-2-sql-doppler_obstetrico.sql:31-107`). Nao cai em `BUNDLE_NO_TEMPLATE`.

(b) Cobertura da fonte viva: OK na leitura adversarial. O modelo seeded cobre a mascara da fonte (`source_lines:157-198`) e a allowlist preserva curadorias mobile complementares, incluindo funcao/extracao, liquido, uterinas, peso e defaults normais. Nao encontrei gap novo nao coberto pela allowlist.

Observacao: `DOPPLER_OBSTETRICO_CONTRACT` so entra no estilo objetivo, via `OBJECTIVE_ONLY_CONTRACTS` (`apps/api/src/server/prompts/contracts/index.ts:43-44`, `61-62`). Para classico/detalhado, a preservacao de regras em allowlist continua importante. Os artefatos mantem isso.

(c) Variantes conflitantes: OK para modelo interno. Existem 3 linhas pos-SQL porque sao 3 estilos, nao 3 variantes. O bundle de um estilo ve so um `kind=modelo`.

Risco relacionado, mas fora do SQL: roteamento de categoria. Ditados como `doppler nao foi realizado` ou `sem doppler` precisam impedir selecao da categoria `DOPPLER_OBSTETRICO` antes do bundle. Esse problema nao e introduzido pelo artefato DEX1 e nao e resolvido por SQL/allowlist.

(d) Dollar quoting e duplicidade: OK. O conteudo usa `$c$...$c$` sem conflito aparente. O `NOT EXISTS` protege rerun por `title + writing_style_id + seed:det-2` (`docs/det-2-sql-doppler_obstetrico.sql:99-107`) e o `UPDATE` exclui seed (`docs/det-2-sql-doppler_obstetrico.sql:15`).

(e) Guards deterministicos: OK. O SQL arquiva duplicatas, mas a allowlist preserva `doppler-obstetrico-regra-liquido-amniotico-marcadores` e `doppler-obstetrico-regra-peso-fetal-percentil` (`docs/det-2-allowlist-doppler_obstetrico.json:19`, `59`). O guard de conclusao Doppler continua em codigo para a categoria (`apps/api/src/app/api/generate/route.ts:836-841`).

## MORFOLOGICO — PROBLEMA FATAL

(a) Pos-SQL sobra `kind=modelo` validated por estilo: SIM. O SQL arquiva os 3 modelos antigos nao seed (`docs/det-2-sql-morfologico.sql:11-20`) e insere `morfologico-modelo-template-1t`, `2t` e `3t` para os 3 estilos (`docs/det-2-sql-morfologico.sql:78-135`, `137-226`, `228-319`). Nao cai em `BUNDLE_NO_TEMPLATE`.

O problema e mais grave: sobram 3 modelos por estilo. Sem seletor de trimestre no `bundleLoader.ts`, todos entram no mesmo bundle e o writer recebe primeiro, segundo e terceiro trimestre juntos. Isso e fatal para determinismo clinico.

(b) Cobertura da fonte viva: nao achei gap novo de conteudo. O SQL semeia a regra geral da fonte (`source_lines:219-232`) e os tres templates verbatim (`source_lines:256-276`, `278-330`, `332-386`). A allowlist preserva curadorias mobile complementares, incluindo liquido, Doppler acessorio e peso fetal. O problema nao e falta de fonte; e excesso simultaneo de fontes conflitantes.

(c) Variante conflitante: FATAL. A proposta de seletor existe em `docs/det-2-analise-morfologico.md`, mas nao esta executavel no loader. Reusar `morfologicoRouteSelection.ts` sozinho nao resolve, porque ele so escolhe categoria, nao trimestre.

O seletor deterministico precisa escolher exatamente uma variante:

| Variante | Gatilhos positivos realistas | Regra numerica | Negacao que deve vencer |
| --- | --- | --- | --- |
| `1t` | `primeiro trimestre`, `1t`, `1o trimestre`, `CCN`, `TN`, `translucencia nucal`, `ducto venoso`, `osso nasal` | IG <= 14s0d | `nao e primeiro trimestre`, `nao usar 1t` |
| `2t` | `segundo trimestre`, `2t`, `2o trimestre`, morfologico com anatomia fetal/ossos longos sem sinais de 3T | IG 15s0d-28s6d | `nao e segundo trimestre`, `nao usar 2t` |
| `3t` | `terceiro trimestre`, `3t`, `3o trimestre`, maturidade intestinal/pulmonar, controle tardio | IG >= 29s0d | `nao e terceiro trimestre`, `nao usar 3t` |

Se o medico disser so `morfologico` sem IG nem marcador forte, o caminho seguro e bloquear com erro claro ou pedir desambiguacao. Escolher 2T por default e menos ruim epidemiologicamente, mas ainda pode gerar mascara errada; para bundle deterministico, eu trataria como `BUNDLE_VARIANT_EMPTY`/erro novo de variante ambigua, nao fallback silencioso.

(d) Dollar quoting e duplicidade: OK. O SQL usa `$c$...$c$` e nao ha `$c$` dentro do conteudo. Os `INSERT`s usam `NOT EXISTS` por `title + writing_style_id + seed:det-2` (`docs/det-2-sql-morfologico.sql:68-76`, `127-135`, `218-226`, `311-319`) e o `UPDATE` exclui seeds (`docs/det-2-sql-morfologico.sql:15`).

(e) Guards deterministicos: OK. O SQL so arquiva os modelos antigos. A allowlist preserva `morfologico-regra-liquido-amniotico-marcadores`, `morfologico-regra-doppler-acessorio` e `morfologico-regra-peso-fetal-percentil` (`docs/det-2-allowlist-morfologico.json:14`, `49`, `54`). Os guards continuam aplicados em codigo: liquido morfologico (`apps/api/src/app/api/generate/route.ts:775-787`), peso fetal (`apps/api/src/app/api/generate/route.ts:819-830`) e overlay Doppler morfologico (`apps/api/src/app/api/generate/route.ts:832-837`).

## Conclusao operacional

Nao aplicaria os SQLs de `OBSTETRICA` e `MORFOLOGICO` com a categoria dentro de `DETERMINISTIC_BUNDLE_CATEGORIES` antes de existir seletor executavel no `bundleLoader.ts` ou antes de o loader impor `exactly one kind=modelo` por categoria/estilo.

`DOPPLER_OBSTETRICO` passa como saneamento de bundle interno. O risco que sobra nele e de roteamento pre-bundle por negacao de Doppler, nao de SQL.

VERIFICACAO CRUZADA DEX2 PRONTA
