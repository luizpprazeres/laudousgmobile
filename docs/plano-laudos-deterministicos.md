# Plano — Migração para Laudos Determinísticos

> **Status geral:** 🟢 Em execução — DET-1 a DET-5 ✅ em prod. RAG vetorial aposentado; **renderer determinístico (DET-5) cobre 4 categorias LIVE em prod: ABDOMEN_TOTAL, OBSTETRICA, MORFOLOGICO, TIREOIDE** (TIREOIDE com escore Domingos calculável — shipped 2026-06-13). **MAMARIA renderer v1 (CLÁSSICO) APROVADO pelo Luiz (2026-06-14) + golden 28/28 (`mamaria-golden.manual.ts`); flag OFF, pronta p/ @devops ligar em prod.** Bugs obstétricos de prod corrigidos (DSM obrigatório, conversão de unidade, alucinação gemelar) — aguardam deploy.** Saneamento dos writing styles em prod (2 estilos). Curadoria S2 aplicada. **Próximo: validar MAMARIA + ligar flag; backlog de UX/bugs (ver tarefas) + DET-6.**
> **Última atualização:** 2026-06-14 (MAMARIA aprovada + golden 28/28 → pronta p/ flag; bugs obstétricos de prod corrigidos [DSM/unidade/gemelar]; Pelve "A)" fix; toggles UI no lab; DET-6 fundação+integração atrás de flag)
> **Decisão formal:** `docs/adr/0004-montagem-deterministica-laudos.md`
> **Origem:** análise Claude Code + validação crítica Codex/dex1 (2026-06-11), aprovada pelo Luiz

> **🗂️ REPOS E BANCOS (nuances — não misturar):**
> - **`~/laudousgmobile-def`** (ESTE) — monorepo do backend mobile + lab. `apps/api/`
>   = engine/API (Next.js, SSE, renderer DET-5); `apps/lab/` = showcase/testbench;
>   `apps/mobile/` = app RN antigo (o iOS Swift é o oficial). DB: **MOBILE**
>   `yldtkqrsbgcnwlydrrot.supabase.co` (MCP `supabase-db` ✅ — migrations SÓ aqui).
> - **`~/laudousg-swift/LaudoUSG`** — app iOS oficial (Swift/SwiftUI). Consome a API
>   deste monorepo (`https://laudousgmobile.vercel.app`) + Supabase REST do DB MOBILE.
>   Repo git: `LaudoUSG/`. Build no Xcode (delegar a dex1 — não buildo Swift daqui).
>   **Uncommitted/tratado pelo Luiz/@devops.**
> - **`~/laudousg`** — produto ORIGINAL web (Next.js, em PROD em laudousg.com).
>   **NÃO TOCAR** (leitura/diagnóstico apenas). É a FONTE VIVA dos prompts
>   (`lib/categoryDefaults.ts` 34 cat + `lib/globalRules.ts`). DB: **ORIGINAL**
>   `gimxiyjfuaqptahssqgb.supabase.co` (MCP `supabase-original-readonly` — só leitura).
> - **Deploy:** Vercel projeto `laudousgmobile` (team `prazeresapp`); flag
>   `RENDERER_CATEGORIES` (env, **não-sensitive** desde 2026-06-13) liga o renderer
>   DET-5 por categoria. Migrations: `packages/db/src/sql/00NN_*.sql` registradas em
>   `packages/db/src/migrate.ts` (aplicar ANTES do código).
> **Processo validado:** implementar → review dex1 + verificação adversarial dex2 (OU auto-revisão Fable quando o Luiz pedir só este terminal) → golden + byte-stability → push → deploy Vercel → regenerar showcase. Token de teste prod: `golden-runner@laudousg.dev` (senha em `/tmp/golden-runner-pw.txt`; expira em ~1h, renovar via `/auth/v1/token?grant_type=password`).
>
> **⚠️ DOCS-CHAVE PARA RECUPERAR ESTADO (ler nesta ordem ao retomar):**
> 1. Este plano (quadro de status + seção "Feito na sessão 2026-06-13" + "Estado em 2026-06-13" abaixo).
> 2. `docs/catalogo-clinico-exames.md` — ⭐ catálogo clínico de opções/variações por exame (fonte do modelo web SEM IA + do renderer).
> 3. `docs/det-5-design.md` — design técnico do renderer (ABDOMEN piloto).
> 4. `docs/det-5-tireoide-domingos.md` — escore Domingos calculável (tireoide).
> 5. `docs/det-5-mamaria.md` + `docs/det-5-mamaria-birads-pesquisa.md` — MAMARIA (spec + Atlas BI-RADS US).
> 6. `docs/saneamento-writing-styles.md` — consolidação para 2 estilos (Clássico + Objetivo).
> 7. `docs/curadoria-showcase-2026-06-12.md` — backlog clínico do Luiz (Lotes A+B).
> 8. **Tarefas (TaskList)** — backlog vivo de UX/bugs (iOS login/Pelve, "A)" no título, percentil doppler, etc).

## Feito na sessão 2026-06-13 (longa) — resumo para recuperar

1. **TIREOIDE → renderer + escore Domingos CALCULÁVEL** (extração classifica enums
   por eixo → código soma NOTA → TI-RADS → características → conduta; ditado vence;
   2 toggles `show_domingos_score`/`show_conduct_recommendation` fiados ponta-a-ponta
   via coluna JSONB `renderer_preferences`). **SHIPPED em prod** (PR #1; flag ligada;
   smoke test `renderer/v1` ok). 3 rodadas dex1+dex2.
2. **Saneamento writing styles** — descoberto que havia 4 estilos ativos (só 2
   reais: CLÁSSICO + OBJETIVO; os outros 2 eram overlays extras; "enxuta" = OBJETIVO,
   não variante). Migration `0013` aplicada em prod (2 estilos; remove `enxuta`);
   backend valida `active` + fallback CLÁSSICO; **iOS `fetchWritingStyles` estava
   QUEBRADO** (colunas inexistentes → picker vazio) — corrigido (compila; pendente
   build/funcional). PR #2 merged.
3. **MAMARIA renderer v1 (CLÁSSICO)** — `apps/api/src/server/renderer/categories/
   MAMARIA.ts`: 10 tipos+NML, léxico US do Atlas em enums, BI-RADS calculável
   (maior-vence + ditado-vence + heurística 4A/4B/4C), título dinâmico, axilas,
   elastografia, correlação com exames prévios, toggle conduta. Dex2 revisou (9
   achados corrigidos). **flag OFF — aguardando validação clínica do Luiz + golden.**
4. **Backlog de ressalvas do Luiz** capturado nas TAREFAS (UX iOS login/Pelve, "A)"
   no título da Pelve, IG errada nos percentis do doppler, preferência de percentil).

## Feito na sessão 2026-06-14 — backlog UX + toggles + DET-6 fundação

1. **Pelve "A)" no título — CORRIGIDO em prod.** Os 3 blocos `modelo` da
   PELVE_FEMININA TA+TV (um por writing style) começavam com o prefixo `A) `
   (resíduo do separador A/B/C/D do prompt original) que vazava pro TÍTULO do
   laudo. Migration `0014_fix_pelve_title_prefix.sql` (idempotente; remove só os
   3 chars) aplicada no DB MOBILE + registrada no `migrate.ts` + snippet-fonte
   alinhado. Era o ÚNICO caso de prefixo de letra em `knowledge_blocks`.
2. **Toggles UI no lab — FEITO.** `apps/lab` ganhou seção "Preferências de
   renderer" em `/settings` (TIREOIDE: Domingos + conduta; MAMARIA: conduta) +
   proxy `apps/lab/src/app/api/me/report-preferences/route.ts` (admin token,
   mesmo padrão do testbench). Decisão: prefs PERSISTENTES da conta admin (usa o
   endpoint pronto do DET-5), não override por-request — evita mexer no contrato
   de produção do `/api/generate`. Validado E2E em dev: GET→PATCH→persiste→null
   restaura; defaults espelham o backend (Domingos ON / conduta OFF). Typecheck
   limpo. **Falta:** UI equivalente no iOS (dex1).
3. **DET-6 — FUNDAÇÃO + INTEGRAÇÃO atrás de flag (default OFF).**
   - `packages/shared/src/schemas/operations.ts`: `ReportOperation` (union
     fechada: `replace_phrase`, `add_conclusion_item`, `remove_conclusion_item`,
     `insert_before`, `insert_after`).
   - `apps/api/src/server/pipeline/operations.ts`: `applyOperations(laudo, ops)`
     — função PURA, aplica em ordem, reusa `conclusionUtils` (renumeração),
     retorna auditoria (applied + reason por op). 16 testes verdes.
   - `apps/api/src/server/pipeline/commandOperations.ts`: ponte
     `comandos do ditado → ReportOperation[]` (reusa o detector regex do
     commandGuard; `insertAt` 0-based → `position` 1-based). Drop-in
     `applyCommandOperations(laudo, rawInput)`. 6 testes verdes.
   - Plugado em `generate/route.ts` (writer + renderer) via helper
     `applyConfiguredCommands`, atrás da flag **`COMMAND_OPERATIONS`** (env,
     default "false"). Flag OFF → commandGuard legado intocado (15/15 regressão).
   - **Falta:** ligar a flag após golden + review; depois o salto de capacidade
     (replace_phrase/insert com `from/to`/`anchor` exige EXTRAÇÃO de operações —
     structurer estendido ou endpoint conversacional).

### Pendências iOS (próxima rodada com dex1)
- **Bug percentil Doppler × IG (iOS).** Investigado: no BACKEND o percentil é
  sempre número DITADO; a IG (`ig_semanas/ig_dias`) só alimenta a frase "Gestação
  em torno de X sem" e NUNCA cruza com percentil (`dopplerOverlay.ts`,
  `MORFOLOGICO/OBSTETRICA.ts`). Logo o bug "percentil usa IG errada" é no APP iOS
  (cálculo/exibição do percentil contra IG) — não há nada a corrigir no backend.
- UI iOS: login (logo/rodapé), botões da Pelve, + a UI de toggles do item 2.

### Próximos passos DET-6 (fatias que faltam — envolvem decisão/produção, review dex1/dex2)
- **Ligar a flag `COMMAND_OPERATIONS`** após golden + review (comparar dedup
  conservador das ops vs. heurística 60% do commandGuard). Integração já codada.
- **Extração de operações tipadas** (habilita replace_phrase/insert ricos): o
  structurer estendido (campo `operacoes`) OU o endpoint conversacional abaixo
  precisam produzir `from/to`/`anchor` — exige chamada LLM com json_schema strict
  (validar com chave OpenAI, não testável local).
- **Endpoint de edição conversacional:** laudo atual + comando → operações → laudo
  atualizado (decisões: persiste? streaming? auth).
- **`user_phrases`:** tabela + aplicador de substituição determinística opt-in.

### Próximos passos (ordem sugerida)
- MAMARIA: Luiz valida gradação 4A/4B/4C + regras de escalada do sólido → golden →
  ligar flag em prod → ONDA 2 (formato OBJETIVO no renderer).
- Backlog UX/bugs (tarefas): "A)" no título Pelve (backend, rápido); percentil
  doppler IG (iOS); ajustes de UI iOS (login logo/rodapé, botões Pelve).
- Toggles: UI no lab/iOS (tireoide Domingos/conduta; mamaria conduta).
- DET-6 (comandos como operações).

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
| DET-2 | Expansão a todas as categorias + desligar retrieval vetorial normativo | ✅ **concluído** 2026-06-12 — 16 categorias no bundle (13 ativas + 3 com uso: prostata/partes_moles/MSK), bundle é o caminho ÚNICO. **RAG vetorial REMOVIDO** (commit `7755f0a`): retriever.ts/pelveRouteSelection.ts deletados, flag removida, embedding fora da geração. Seletor de variante generalizado por tag `variant:`. 38/38 golden; caching ~99%. Validado em prod pelo Luiz. Docs: `det-2-ondas-pequenas.md`, `det-2-categorias-grandes.md`, `det-2-remocao-rag.md`, `det-2-followups.md`. |
| DET-3 | Variantes de máscara (entidade 1ª classe + preferências da conta) | ✅ **concluído** 2026-06-12 — backend completo em prod (commits `4e9da03`/`bd2e710`). Tabelas `report_template_variants` (catálogo) + `account_report_preferences` (RLS própria); bundleLoader resolve por preferência (precedência contexto > preferência > default); APIs `/api/me/report-preferences` + `/api/admin/report-template-variants`. Piloto demo MAMARIA "enxuta": E2E prova que trocar a preferência muda o laudo. 38/38 golden regressão. Reviews dex1+dex2 aplicados. Doc: `det-3-variantes-preferencia.md`. |
| DET-4 | iOS: seletor de máscara nas Preferências | ✅ **concluído** 2026-06-12 — repo `~/laudousg-swift/LaudoUSG` (uncommitted, aguardando @devops). Seção "Modelos de laudo" no `SettingsView` (picker por categoria com >1 variante **no estilo atual**, opção "Automático"); `ProfileService` GET/PATCH `/api/me/report-preferences`; `AppState` + load pós-login. Reviews dex1+dex2 aplicados (3 fixes: filtro por writing style atual evita `BUNDLE_VARIANT_EMPTY`; guard race de signOut; guard double-tap). Build verde; E2E no Simulator (dex1/xcodebuildmcp): Enxuta→"LAUDO RESUMIDO", Automático→padrão (critério DET-3), confirmado nos reports salvos no DB. Doc: `det-4-ios-seletor-mascara.md`. |
| DET-5 | Structured extraction + renderer | ✅ **em prod (3 categorias) + TIREOIDE pronta p/ flag (2026-06-13)** — piloto ABDOMEN_TOTAL (template_body com slots + LLM secundário) + **OBSTETRICA e MORFOLOGICO** (render PROGRAMÁTICO). **TIREOIDE portada + escore Domingos CALCULÁVEL** 2026-06-13: a extração classifica enums por eixo, o código SOMA → NOTA FINAL → TI-RADS → características → conduta (spec `docs/det-5-tireoide-domingos.md`). 2 toggles (Domingos on/off, conduta on/off) **fiados ponta-a-ponta (ONDA 2)**: coluna JSONB `renderer_preferences` em `account_report_preferences` (migration `0012`), lookup consolidado (1 query resolve variante+toggles), endpoint GET/PATCH parcial. Reviews dex1+dex2 nas 3 rodadas. **SHIPPED em prod 2026-06-13** (PR #1 merged; migration `0012` aplicada; flag `RENDERER_CATEGORIES` com TIREOIDE; smoke test prod = `renderer/v1` + NOTA Domingos 5→TI-RADS 2 calculado; OBSTETRICA sem regressão). **Resta: UI lab/iOS dos toggles** (coluna nasce null → defaults Domingos ON / conduta OFF). Arquitetura: `renderer/categories/<CAT>.ts` + `extraction.ts` + `pipeline/renderer.ts`. Flag `RENDERER_CATEGORIES=ABDOMEN_TOTAL,OBSTETRICA,MORFOLOGICO` (+`,TIREOIDE` ao promover). Cálculos: peso médio/divergência (obst.), IP uterinas (morfo), **VT + escore Domingos→TI-RADS (tireoide)**. Golden: abdome 19/19, obst. 3/3, morfo 3/3, tireoide 8 casos (render local 100%). Doc: `det-5-design.md`, `det-5-tireoide-domingos.md`. **PRÓXIMO: MAMARIA.** |
| DET-6 | Comandos como operações + vocabulário pessoal curado | 🟡 **fundação + integração atrás de flag (2026-06-14)** — schema `ReportOperation` + aplicador puro `applyOperations` (16 testes) + ponte `commandOperations` (6 testes) plugada em `generate/route.ts` via flag **`COMMAND_OPERATIONS`** (default OFF; commandGuard legado intocado, 15/15 regressão). Faltam: ligar flag (golden+review); extração de operações tipadas (replace/insert ricos); endpoint de edição conversacional; `user_phrases`. |

> **O que já está em produção (2026-06-12):** todo laudo é montado pelo bundle
> determinístico (SELECT por chave: categoria × estilo × validated), sem
> embedding/RAG. A máscara é escolhida por: (1) **contexto do exame** — gatilho no
> ditado (trimestre, via TA/TV, com/sem Doppler), imperativo clínico; (2)
> **preferência do médico** quando o ditado não decide (DET-3); (3) **default**.
> Categoria ativa sem modelo curado → erro claro `BUNDLE_EMPTY` (nunca laudo sem
> estrutura). Suíte golden: `tests/golden-deterministico/` (38 casos) + E2E de
> preferência `tests/det3/preference-e2e.mjs`.

---

## ⭐ Estado em 2026-06-13 (sessões 12-13/jun) — leia para recuperar tudo

### Arquitetura do renderer (DET-5) — como funciona hoje
Dois modos, escolhidos por categoria via flag `RENDERER_CATEGORIES` (env Vercel):
- **ABDOMEN_TOTAL** = render por TEMPLATE: `report_template_variants.template_body`
  com slots `{{orgao:chave|default}}`, `{{extra_abdominais}}`, `{{conclusao}}`;
  achados fora do catálogo ("outro") viram 1 chamada LLM secundária (free-slot).
- **OBSTETRICA + MORFOLOGICO + TIREOIDE** = render PROGRAMÁTICO: laudo montado
  100% em código (`renderer/categories/OBSTETRICA.ts`, `MORFOLOGICO.ts`,
  `TIREOIDE.ts`), SEM template_body, SÓ a extração usa LLM. Registradas em
  `RENDERER_PROGRAMMATIC_CATEGORIES` (extraction.ts) — o gate no route não exige
  template_body para elas. (TIREOIDE: código pronto 2026-06-13, aguardando flag
  em prod + review dex1/dex2.)
- **Fluxo comum:** route → `runRendererStream` (pipeline/renderer.ts, dispatcher)
  → extração tipada (`runRendererExtraction`, registry `EXTRACTORS` em
  extraction.ts, schema strict por categoria, temp 0) → render da categoria →
  SSE. `generation_runs.model_writer = "renderer/v1"`.
- **Adicionar categoria nova ao renderer:** criar módulo em
  `renderer/categories/<CAT>.ts` (schema JSON strict + prompt + parse + render),
  registrar no `EXTRACTORS` de extraction.ts, adicionar ao dispatcher de
  renderer.ts, (se programática) a `RENDERER_PROGRAMMATIC_CATEGORIES`, e à flag.
- **Cálculos determinísticos já feitos em código** (o writer LLM não fazia):
  peso fetal médio + divergência ponderal (g e %) no gemelar; IP médio das
  artérias uterinas no morfo 1t; grau de placenta romano; concordância pt-BR;
  **VT (volume total) somado dos volumes ditados na tireoide** + característica
  clínica derivada da NOTA FINAL Domingos (NOTA/TI-RADS reproduzidos verbatim).

### Curadoria clínica do showcase (S2) — TODA aplicada e em prod
O Luiz revisou o showcase e mandou ajustes (backlog íntegro em
`docs/curadoria-showcase-2026-06-12.md`). Aplicado por categoria:
- **ABDOMEN_TOTAL** (renderer): vesícula com árvore completa (ausência/colecistectomia
  → parede fina ou espessada+colecistite → cálculo único/múltiplo, móvel/imóvel
  À MUDANÇA DE DECÚBITO, "ocasionando sombra(s) acústica(s)", medida menor
  opcional); título "ABDOME TOTAL COM DOPPLER COLORIDO" na variante doppler;
  comentários sem "em N fotos".
- **ABDOMEN_SUPERIOR** (writer/bloco): mesma lógica de vesícula espelhada no
  bloco `abdomen-superior-regra-colelitiase` (normalização "ocasionando", mobilidade,
  parede espessada).
- **TIREOIDE** (writer): corpo sem "nódulo" (usa "imagem ... mais larga do que
  alta, sem calcificações"); sem "parênquima homogêneo" no lobo alterado;
  conclusão condicional (item 1 volume; item 2+ achado por lobo); sem Chammas.
- **PROSTATA_SUPRAPUBICA** (writer): título "(TRANSABDOMINAL)"; corpo com volume
  pré-miccional; IPP (índice de protrusão, graus I/II/III); conclusão só peso (sem cm³).
- **ESCROTAL**: varicocele individualiza os dois lados (esq. aumentado + dir. normal).
- **GLANDULAS_SALIVARES**: estrutura COMENTÁRIOS + conclusão item único sem "1)".
- **DOPPLER_RENAL/VENOSO/OBSTETRICO** (writer): conclusões simplificadas,
  comentários enxutos, frase 1ª USG opcional.
- **DOPPLER_ARTERIAL_MMII** (writer): título por membro, COMENTÁRIOS, conclusão só
  diagnóstico ("Doença aterosclerótica difusa..."), ITB removido (blocos archived).
- **MUSCULOESQUELETICO**: categoria antiga inativa; V2 é o padrão; conclusão resume
  (não copia corpo) + tranquilização do manguito com lógica estrita.
- **MORFOLOGICO** (renderer): 1t/2t/3t estrutura por construção; peso com variação(+-g)
  e percentil opcionais; 3t SEM distância binocular e SEM "orifício interno do colo";
  placenta com grau; achados_adicionais só patológico (sem frases normais soltas).
- **OBSTETRICA** (renderer): feto único + gemelar; gestação inicial sem "Sem
  descolamentos" solto; gemelar com individualização por feto + peso médio/divergência.

### Suíte golden de regressão da curadoria (writer)
`tests/golden-deterministico/cases/*-cur-*.json` (6 casos): travam as DECISÕES
(proibições: sem ITB, sem "nódulo" no corpo de tireoide, sem "via suprapúbica",
sem "Feto único" no gemelar, título morfológico ≠ obstétrico). Asserções de
PROIBIÇÃO são determinísticas; estrutura completa (headers) é flaky no writer
(some no renderer). Rodar: `GOLDEN_API_URL=http://localhost:3000
GOLDEN_AUTH_TOKEN=... pnpm validate:golden:deterministico` (filtro `-cur-`).

### Aprendizado-chave (decide a fila do renderer)
O caminho WRITER (LLM escreve seguindo o bundle) é **flaky na estrutura**: omite
seções, erra título, não calcula. Reforço de prompt não resolve. **O renderer
resolve por construção.** Por isso MORFOLOGICO/OBSTETRICA foram portados primeiro,
depois TIREOIDE (2026-06-13); **MAMARIA é a próxima** (alto volume, BI-RADS).

### Pendências/follow-ups (não bloqueiam)
> - **ABDOMEN_SUPERIOR ainda é writer** — candidato fácil ao renderer (é o abdome
>   total sem a parte inferior).
> - **commandGuard no caminho renderer** pode transformar instrução de estrutura
>   ("inclua a tabela") em item de conclusão espúrio — ajustado por ditado, mas
>   a causa raiz fica para o DET-6 (comandos como operações).
> - **Variantes contextuais** (1t/2t/3t, ta/tv, pos-abortamento) saíram do picker
>   de preferências via `preference_eligible` (decisão Luiz) — só variantes de
>   estilo são elegíveis; hoje só MAMARIA padrao/enxuta.
> - **Conteúdo real das variantes** (a "enxuta" da MAMARIA é demo) — Luiz fornece via lab.
> - **UI no lab** p/ CRUD de variantes (só a API admin entrou).
> - **OpenAI 429** em rajadas de geração (showcase) — Luiz recarrega o billing.
> - **Categorias órfãs** sem modelo → `BUNDLE_EMPTY`; **`match_knowledge_blocks`** órfã (drop opcional).

---

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

### DET-3 — Variantes de máscara como entidade de 1ª classe 🗂️ ✅ CONCLUÍDO (2026-06-12)

**Entregue (ver `docs/det-3-variantes-preferencia.md`):** tabelas
`report_template_variants` (catálogo) + `account_report_preferences` (RLS própria),
seed espelhando todas as variantes existentes, `bundleLoader` resolvendo por
preferência com precedência **contexto > preferência da conta > default**, APIs
`/api/me/report-preferences` (GET/PATCH) e `/api/admin/report-template-variants`
(CRUD). Piloto demo **MAMARIA "enxuta"** prova o critério de aceite (E2E:
`tests/det3/preference-e2e.mjs`). Reviews dex1+dex2 aplicados.

**Diferenças vs o plano original (decisões do Luiz na execução):**
- Variante de 2 categorias é por **CONTEXTO** (1t/2t/3t, TA/TV, Doppler — já
  existiam como tag `variant:` desde o DET-2) e o DET-3 ADICIONA a camada de
  **PREFERÊNCIA** (escolha do médico) por cima, sem conflito.
- O catálogo é registro + chave; o **conteúdo do modelo continua em
  `knowledge_blocks`** (tag `variant:<chave>`) no DET-3 — `template_body` vira
  fonte primária só no DET-5 (renderer).
- Piloto = **demonstração** ("enxuta"), não conteúdo clínico real (Luiz fornece
  via lab depois). **Só a API admin** entrou; UI do lab fica para depois.

---

### DET-4 — iOS: seletor de máscara nas Preferências 📱 ⬅️ PRÓXIMO

**Objetivo:** o médico escolhe a máscara no app, uma vez, nas preferências da conta.

**Repo:** `~/laudousg-swift/LaudoUSG` (este é o ÚNICO sprint fora do monorepo).
O **backend já está 100% pronto e em prod** (DET-3) — este sprint é só iOS/SwiftUI.

**Backend a consumir (já no ar em `https://laudousgmobile.vercel.app`):**
- `GET /api/me/report-preferences` → `{ preferences: [{category_code, default_variant_id,
  variant_key}], available_variants: [{id, category_code, writing_style_id, variant_key,
  name}] }`. Filtrar `available_variants` por categoria que tenha **>1** variante para
  decidir quais categorias mostram picker.
- `PATCH /api/me/report-preferences` body `{ category_code, default_variant_id }`
  (`default_variant_id: null` limpa a preferência → volta ao padrão).
- Geração: **NENHUMA mudança** no `GenerateRequest` — o backend resolve a variante
  pela preferência da conta automaticamente.

**Entregáveis:**
- `SettingsView` (`LaudoUSG/Features/Settings/SettingsView.swift`): seção "Modelos de
  laudo" — por categoria com >1 variante, um picker (mesmo padrão do picker de Writing
  Style já existente, linhas ~178-239).
- `ProfileService` (`LaudoUSG/Services/ProfileService.swift`): `fetchReportPreferences()`
  + `updateReportPreference(categoryCode, variantId)` — espelha
  `updateDefaultWritingStyle()` (PATCH `/api/me/profile`).
- `AppState` (`LaudoUSG/Core/AppState.swift`): `reportPreferences` + `availableVariants`
  + `refreshReportPreferences()`.

**Critério de aceite:** trocar a máscara no Settings → próximo laudo gerado usa a variante
escolhida; build verde; testado E2E no Simulator. **Pré-requisito de teste:** a categoria
precisa ter ≥2 variantes no catálogo (hoje só MAMARIA tem, com a "enxuta" demo).

**Delegação:** o repo iOS tem padrão de delegar UI bem-escopada ao dex1/Codex (ver
`~/laudousg-swift/LaudoUSG/CLAUDE.md` §Delegação Maestri/Codex — brief de 5 seções).

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
