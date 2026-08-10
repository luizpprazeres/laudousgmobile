# Riscos, divergências e achados

- **Data:** 2026-08-09 · **Base:** `00-mapa-do-sistema.md`
- **[F]** fato verificado · **[I]** inferência · **[?]** não confirmado

---

## 1. 🔴 Bomba armada: os guards de conclusão morrem em silêncio no estilo OBJETIVO

**[F] Verificado diretamente no código e no banco.**

`apps/api/src/server/pipeline/conclusionUtils.ts:27`:
```ts
const idx = laudo.search(/^CONCLUS[ÃA]O:/im);
if (idx === -1) return { …, found: false };
```

Seis módulos dependem dessa função — verificado por grep:
`operations.ts`, `amnioticFluidGuard.ts`, `dopplerOverlay.ts`, `commandGuard.ts`,
`emptyConclusionItemsGuard.ts`, **`pesoFetalGuard.ts`**.

O estilo OBJETIVO substitui `CONCLUSÃO:` por `IMPRESSÃO:`
(`prompts/contracts/objective.ts:2-5`). Quando isso acontece, `found: false` e **todos
esses guards viram no-op silencioso** — incluindo:
- `pesoFetalGuard` — impede o sumiço de P.I.G. / < percentil 3 / Gratacós / G.I.G.
- `commandGuard` — garante a execução da diretiva explícita do médico
- `dopplerOverlay` — corrige a conclusão Doppler pelo vaso certo
- `amnioticFluidGuard` — impede o LLM de contradizer o líquido amniótico ditado

**Impacto hoje: NENHUM — o risco é futuro. [F]** Todos os 452 laudos já gerados em
estilo OBJETIVO são de **02–03/06/2026** (sessões de validação do sprint S27) e usam
os cabeçalhos legados `TÉCNICA / ANÁLISE / OPINIÃO DO RELATÓRIO`. **Nenhum laudo em
estilo OBJETIVO foi gerado desde 03/06/2026**, e nenhum contém `IMPRESSÃO:`.

**Por que importa mesmo assim:** o projeto tem como objetivo declarado "os estilos
clássico e objetivo claramente representados". No dia em que o OBJETIVO for ligado
para um usuário real, as proteções de segurança clínica desligam sozinhas, sem erro,
sem log, sem teste que pegue.

**Correção recomendada (pequena, isolada, testável):** `parseConclusion` deve aceitar
o conjunto de cabeçalhos de conclusão conhecidos (`CONCLUSÃO`, `IMPRESSÃO`,
`OPINIÃO DO RELATÓRIO`) e devolver qual encontrou, para `renderWithConclusion`
reconstruir com o mesmo. Um teste `.manual.ts` por variante de cabeçalho.

**Achado adjacente [F]:** a documentação e a memória do projeto afirmam que o estilo
objetivo usa `TÉCNICA / ACHADOS / IMPRESSÃO`. Os laudos realmente gerados usam
`TÉCNICA / ANÁLISE / OPINIÃO DO RELATÓRIO` (os cabeçalhos do nReport, que
`docs/nreport-modelos-objetivo.md:9` diz terem sido **rejeitados**). Como a geração
parou em 03/06, é provável que o código tenha sido corrigido depois e nunca reexercitado —
mas **isso significa que o estilo OBJETIVO nunca foi validado em produção na sua forma atual**.

---

## 2. Acoplamento a texto literal — 28 pontos catalogados

Regra que o projeto deveria adotar: **nenhum sanity check ou guard pode depender de
uma frase que o usuário tem permissão de editar.** Hoje isso é violado sistematicamente.

Os mais consequentes (todos em `apps/api/src/server/pipeline/`, salvo indicação):

| # | Local | Depende de | Se a frase mudar |
|---|---|---|---|
| 1 | `conclusionUtils.ts:27` | `/^CONCLUS[ÃA]O:/im` | §1 — 6 guards viram no-op |
| 2 | `amnioticFluidGuard.ts:64-88` | `"Líquido amniótico de/em quantidade …"` | LLM pode contradizer o líquido ditado |
| 3 | `pesoFetalGuard.ts:26-37` | **4 frases clínicas inteiras** hardcoded (P.I.G., Gratacós, G.I.G., < P3) | item de peso fetal duplicado ou perdido |
| 4 | `dopplerOverlay.ts:373-398` | regex de peso/percentil/vasos | decide **quais itens de conclusão apagar** — falso positivo apaga achado |
| 5 | `deterministicSanity.ts:51-52,386-394` | `____` → severity **`critical`** | conflita com `global.ts:57-59`, que **manda** usar `____` |
| 6 | `deterministicSanity.ts:264-276` | palavras-chave do comando presentes no laudo → **`critical`** | falso "comando_ignorado" quando o writer parafraseia |
| 7 | `fetalVitalityGuard.ts:3-14` | frases de vitalidade/óbito | **falha em detectar óbito fetal contradito** |
| 8 | `dictationSanitizer.ts:17-46` | frases faladas (`vírgula`, `escreva que`, `tchau`…) | falso positivo apaga conteúdo clínico |
| 9 | `generate/route.ts:112-118` | apaga **linhas inteiras** que contenham `____` no estilo OBJETIVO | apaga linha clínica legítima |
| 10 | `measureSanity.ts:11` vs `magnitudeGuard.ts:16` | **duas grafias diferentes** de `[REVISAR]` (`:` vs `—`) | `stripSpuriousMagnitudeFlags` só limpa uma delas |
| 11 | `apps/mobile/.../reviewMarkers.tsx:6` | `/\[REVISAR\b[^\]]*\]/g` | cliente para de destacar/remover marcador |
| 12 | `apps/web/.../LaudoPreview.tsx:48` | lista literal de 3 cabeçalhos clássicos | preview não segmenta laudo objetivo |

Lista completa (28 itens) no relatório de investigação; o levantamento é um **piso, não
um teto** — três arquivos grandes (`deterministicSanity/extractor.ts` 862 linhas,
`dopplerOverlay.ts` 424, e os 11 renderers) não foram lidos integralmente.

**Consequência para o projeto:** personalizar uma frase pode desligar um guard sem aviso.
Este é o risco número um da missão, e a razão pela qual a personalização **precisa** ser
ancorada em `slot.id` estrutural, não em texto.

---

## 3. Divergências entre o briefing e o código

| Premissa do briefing | Realidade verificada |
|---|---|
| "backend e banco de dados compartilhados" | **Dois bancos.** `laudousg.com` usa `gimxiyjfuaqptahssqgb`; todo o resto usa `yldtkqrsbgcnwlydrrot`, em organizações Supabase diferentes |
| "o lab ficou inútil após a mudança do pipeline" | Parcialmente. ~85 % do lab é funcional contra Supabase/prod; o que morreu foi o **modelo mental** (tiers, quotas, similaridade). `/blocks` não funciona em prod; `/login` é stub |
| "concorrente NiPort" | O nome correto é **nReport** (`app-nreport.ionic.health`), capturado em 14/06/2026 → `docs/nreport-modelos-objetivo.md` |
| personalização a construir do zero | Já existe **em duas formas**: esqueleto vazio no banco A; e um sistema completo e em uso na web (`templates`, `style_preferences`, `reference_reports`, `category_settings`) |
| "modelos nos estilos clássico e objetivo" | O objetivo **nunca teve conteúdo curado próprio**: o ingest grava o mesmo markdown para os 4 estilos (`knowledgeIngest.ts:178-188`); o objetivo é o clássico com cabeçalhos trocados em runtime |

---

## 4. Riscos operacionais

| # | Risco | Severidade | Evidência |
|---|---|---|---|
| R1 | **Não existe staging.** Só um projeto Supabase; dev e prod são o mesmo banco | **Alta** | `list_projects` retorna 1 projeto |
| R2 | **Não existe CI.** Único gate é o build da Vercel do `apps/api`; `pnpm test` é no-op | **Alta** | sem `.github/workflows`; nenhum package define `test` |
| R3 | Backend usa service role e **bypassa RLS**; isolamento entre contas é feito em código | **Alta** | `packages/db/src/client.ts:6-9` |
| R4 | Migrations em duas trilhas; `migrate.ts` **não** aplica 0003, 0004, 0005, 0018–0021 | Média | `packages/db/src/migrate.ts:20-35` |
| R5 | 4 tabelas em produção (`room_tokens`, `sala_schemas`, `sala_annotations`, `user_phrases`) **sem DDL no repositório** | Média | grep em `packages/db` |
| R6 | Env de prod lê `WRITER_V2_ABDOME_USER_ID`; o código lê `WRITER_V2_USER_ID` | Média | `vercel env ls` × `env.ts:73` |
| R7 | `product_events.surface` CHECK `IN ('web','ios','watch')` → **Android não grava telemetria** | Média | schema do banco |
| R8 | `product_events.metadata` é jsonb aberto (`z.record(z.unknown())`), sem allowlist → PII acidental | Média | `apps/api/src/app/api/events/route.ts` |
| R9 | `generation_audit` grava `raw_input`, `output_text` e `system_message_full` — o Lab novo não pode expor isso sem controle | Média | schema + RLS admin-only |
| R10 | `reports.raw_input` é o ditado bruto: se o médico falar o nome do paciente, ele é persistido. Nada no código impede | Média | ausência de sanitização |
| R11 | `apps/mobile/src/shared/` é cópia vendorizada **já divergente** de `packages/shared` | Média | `diff -rq` acusa 5 arquivos diferentes |
| R12 | Android sem `expo-updates` → nenhuma correção OTA possível | Média | `apps/mobile/package.json` |
| R13 | `apps/lab/vercel.json` tem `ignoreCommand: "exit 1"` → **builda em todo push** (na semântica da Vercel, exit≠0 = buildar) | Baixa | `apps/lab/vercel.json:6` |
| R14 | `GITHUB_TOKEN` do lab tem escopo `repo` e commita direto no `main` | Média | `apps/lab/src/app/api/blocks/file/route.ts` |
| R15 | Golden tests batem contra a **API de produção**, gerando linhas reais em `reports`/`generation_audit` | Média | `tests/golden-*/runner.ts` |
| R16 | `tests/golden-deterministico/runner.ts` referencia `DETERMINISTIC_BUNDLE_CATEGORIES`, que **não existe** em `env.ts` → o gate anti-falso-verde pode estar quebrado | Média | grep |
| R17 | Blocos condicionais por patologia **não rodam no caminho renderer** — "placenta prévia" em OBSTETRICA não dispara o `PLACENTA_BLOCK` | **Alta** | `resolveConditionalPromptBlocks` só em `writer.ts:77` |
| R18 | `report_template_variants` tem 100 linhas semeadas contra os 4 estilos, **incluindo os 2 inativos** | Baixa | query |
| R19 | Base de usuários do banco A é minúscula (6 perfis, 2 ativos em 30 dias) — métricas de qualidade refletem essencialmente um médico | Média | query |

---

## 5. O que NÃO é risco (verificado e descartado)

- **[F]** `lab.laudousg.com` **não** está exposto: responde **401** com
  `WWW-Authenticate: Basic realm="LaudoUSG.lab"`, e `LAB_BASIC_AUTH_USER`/`PASS` estão
  setados no ambiente Production do projeto `laudousg-lab`.
  *(Uma auditoria intermediária havia sinalizado isso como severidade alta; a sondagem
  HTTP e o `vercel env ls` desmentem.)*
- **[F]** Arquivar `apps/lab` **não quebra produção** — nenhum app declara
  `@laudousg/lab`; a única importação cross-app é o script de seed
  `tests/showcase/generate-samples.ts:12`.
- **[F]** Migrar a personalização no banco A **não tem custo de dados**:
  0 variantes elegíveis, 0 preferências preenchidas.
