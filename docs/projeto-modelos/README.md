# Projeto: Modelos canônicos e personalização de laudo

Documentação viva deste projeto. **Comece por aqui** ao retomar em outra sessão
ou com outro agente.

## Objetivo

Permitir que cada usuário personalize os modelos padrão de laudo de forma segura,
previsível e compatível com a IA, mantendo alinhamento entre iOS, Android e web —
e reconstruir `lab.laudousg.com` como ferramenta administrativa de modelos, regras,
sanity checks, versões e métricas.

## Índice

| Doc | Conteúdo |
|---|---|
| `00-mapa-do-sistema.md` | **O mapa real verificado**: repositórios, domínios, bancos, pipeline, clientes, testes. Respostas às 12 perguntas da investigação |
| `01-arquitetura-proposta.md` | Modelo canônico, personalização por operações, camadas de precedência, primeira implementação vertical |
| `02-riscos.md` | Achados graves, 28 acoplamentos a texto literal, divergências briefing × código, 19 riscos operacionais |
| `03-perguntas-abertas.md` | Decisões do responsável — Q1–Q4 respondidas; Q5–Q7 abertas |
| `04-revisao-codex.md` | Revisão adversarial do Codex 1: 7 críticas procedentes, 5 já incorporadas ao PoC, 2 que mudaram o plano + 1 bug novo confirmado |
| `05-plano-migracao.md` | O que a migration `0022` cria, impacto, índices, RLS, rollback — **aplicada em 10/08** |
| `06-lab-cockpit.md` | Levantamento do Lab: o que sobreviveu ao fim do RAG, o que aposentar, o que criar |
| `07-verificacao-achado-inventado.md` | Os 371 alertas de "achado inventado" são **falso positivo** — e o que se descobriu no lugar |

Convenção usada em todos: **[F]** fato verificado por comando/arquivo ·
**[I]** inferência · **[?]** não confirmado.

## Estado atual — 2026-08-10

O projeto tem **duas frentes**, que se separaram durante o trabalho:

| Frente | Onde vive | Estado |
|---|---|---|
| **A. Modelo canônico + personalização** | backend + Biblioteca (web/iOS/Android) | catálogo e motor prontos; persistência criada; falta a Biblioteca no produto |
| **B. Cockpit do Lab** | `lab.laudousg.com` | 3 telas entregues; procedência destravada |

> **Correção de rumo (10/08):** a tela `/modelos` que nasceu no Lab pertence à
> **Biblioteca do usuário**, não ao Lab. Ela fica onde está por ora, como bancada
> de avaliação, e migra quando formos ao `apps/web`. O Lab é o cockpit do Luiz
> para *estudar* como os laudos se formam — ver `06-lab-cockpit.md`.

### Frente A — modelo canônico e personalização

- **Fase 1 (Descoberta): concluída** — 09/08
- **Fase 2 (Arquitetura): decidida e revisada duas vezes**
  Q1–Q4 respondidas em 09/08; Q7 (edição livre) em 10/08. A proposta foi corrigida
  pela validação de viabilidade (`01 §2.1` — o renderer é *motor*, só o *conteúdo*
  vira dado) e pela revisão adversarial do Codex (`04-revisao-codex.md` — a unidade
  interna passou a ser um **documento estruturado**, com a string como último passo).
- **Fase 3 (Implementação): 4 de 10 itens**

| # | Item | Estado |
|---|---|---|
| 1 | Catálogo de OBSTETRICA × clássico | ✅ **3840/3840** byte-a-byte |
| 2 | Renderer lê o catálogo atrás de `MODEL_CATALOG_CATEGORIES` (default vazio) | ✅ |
| 2b | Catálogo do estilo OBJETIVO | ⏳ |
| 3 | Catálogo-base versionado — **no Git**, não no banco (revisão C9) | ✅ por decisão |
| 4 | Tabelas `report_scopes` + `report_model_customizations` | ✅ **aplicadas** em 10/08 |
| 5 | Validador de operações | ✅ **58 garantias** |
| 6 | Endpoints: rascunho, prévia, publicar, restaurar, histórico, rollback | ⏳ só a prévia existe |
| 7 | Geração aplicando a customização publicada | ⏳ |
| 8 | Auditoria com `catalog_id` + versões | ⏳ |
| 9 | Visualização no Lab | ✅ bancada `/modelos` |
| 10 | Golden tests contra a API real | ⏳ |

### Frente B — cockpit do Lab

| Tela | Estado | O que entrega |
|---|---|---|
| `/prompts` | ✅ | O prompt de qualquer categoria × estilo **sem gerar laudo**, dissecado nas camadas, com o caminho (renderer/writer/livre) explícito |
| `/audit` | ✅ | Todas as contas, com filtro por **tipo** de alerta; falso "erro" corrigido |
| `/correcoes` | ✅ | Os 585 laudos que o médico corrigiu, com diff por linha |
| Procedência por trecho | ✅ motor · ⏳ tela | Destravado em 10/08 (ver abaixo) |

## O que já foi alterado no sistema

Até 09/08 nada havia sido tocado. Depois disso, com autorização explícita:

| Data | Mudança | Risco |
|---|---|---|
| 10/08 | **Migration `0022`** aplicada — 2 tabelas novas, nenhum `ALTER`, 0 linhas afetadas | verificada: invariantes testadas em transação com rollback; advisor limpo |
| 10/08 | Flag `MODEL_CATALOG_CATEGORIES` em `env.ts` — **default vazio** | nulo enquanto vazia |
| 10/08 | `pipeline/renderer.ts` + `route.ts`: callback `onFindings` grava a extração do renderer na auditoria | aditivo e observacional; não altera o texto gerado; 3840/3840 e goldens verdes depois |

## Comandos de validação

```bash
# equivalência byte-a-byte do catálogo com o renderer (3840 combinações)
pnpm exec tsx apps/api/src/server/renderer/__tests__/catalog-equivalence.manual.ts
# garantias de segurança da personalização (58)
pnpm exec tsx apps/api/src/server/renderer/__tests__/catalog-guarantees.manual.ts
# projeção que a Biblioteca consome (25)
pnpm exec tsx apps/api/src/server/renderer/__tests__/catalog-describe.manual.ts
# diff das correções (9) e procedência (17)
pnpm exec tsx apps/lab/src/lib/diff/linhas.manual.ts
pnpm exec tsx apps/lab/src/lib/procedencia/index.manual.ts

pnpm --filter @laudousg/api typecheck && pnpm --filter @laudousg/lab typecheck
# ⚠️ pnpm test é NO-OP: nenhum package define script "test"
```

## Os cinco fatos que mudam o entendimento do projeto

1. **São dois bancos, não um.** `laudousg.com` (a web em produção) usa um projeto
   Supabase diferente de todo o resto do ecossistema, em outra organização.
2. **A personalização já existe — duas vezes.** Um esqueleto **vazio** no banco do mobile
   (`report_template_variants` / `account_report_preferences`, 0 registros úteis) e um
   sistema **completo e em uso** na web (`templates`, `style_preferences`,
   `reference_reports`, `category_settings`).
3. **Não há fonte canônica de modelos** — há quatro: renderers em código TS (13 categorias),
   `knowledge_blocks` no banco, `template_body` de variantes, e `categoryDefaults.ts` da web.
4. **O conteúdo dos modelos é extraível do código sem mudar o texto** — provado, 9/9.
   As frases das specs do Writer V2 são *literalmente as mesmas strings* do renderer.
   Mas a spec **não** expressa a lógica (cálculos, formatação, concordância, gemelar),
   então o renderer permanece como motor e só o conteúdo vira dado. Ver `01 §2.1`.
5. **Os guards de conclusão morrem em silêncio no estilo OBJETIVO**
   (`conclusionUtils.ts:27` só reconhece `CONCLUSÃO:`). Latente hoje — nenhum laudo
   objetivo desde 03/06/2026 — mas arma no momento em que o estilo for ligado.

## Como retomar

1. Leia `00-mapa-do-sistema.md` — é o estado de verdade, com caminhos reais.
2. Veja as decisões no topo de `03-perguntas-abertas.md` (Q1–Q4 e Q7, respondidas)
   e as duas correções de rumo: `01 §2.1` (motor × conteúdo) e `04-revisao-codex.md`
   (documento estruturado).
3. Rode os comandos de validação acima — reancoram o entendimento em algo executável.
4. Suba o ambiente para ver as telas:
   ```
   pnpm --filter @laudousg/api dev                                  # :3000
   BACKEND_API_URL=http://localhost:3000 pnpm --filter @laudousg/lab dev   # :3001
   ```
5. **Antes de tocar o banco**: projeto `laudousgmobile`, ref `yldtkqrsbgcnwlydrrot`,
   us-east-2 — é **produção, e não há staging**. Só com autorização explícita.

### Próximos passos, em ordem

1. **Tela de procedência** — o motor está pronto (`apps/lab/src/lib/procedencia/`) e
   o dado passou a ser gravado em 10/08. Precisa de laudos novos para ter o que mostrar.
2. **Endpoints de personalização** (item 6): rascunho, publicar, histórico, rollback —
   as tabelas já existem e estão vazias.
3. **Geração aplicando a customização** (item 7), atrás de flag.
4. **Catálogo do estilo OBJETIVO** (item 2b).
5. **Biblioteca no produto** — mover `/modelos` do Lab para o `apps/web`.

### Frentes que apareceram no caminho e não são deste projeto

- **Garble de ASR no MSK** — erros de transcrição vazando no laudo
  (`07-verificacao-achado-inventado.md §3`). É a categoria com maior taxa de
  correção manual: 41 %.
- **Sanity saturado** — `medida_divergente` é 74 % dos alertas e
  `achado_inventado` é falso positivo. Com os findings agora gravados, dá para
  o comparador saber o que veio de campo estruturado.
- **Estilo objetivo ignorado** em `MUSCULOESQUELETICO` e `PROSTATA_SUPRAPUBICA` —
  são chamados sem o parâmetro de estilo e produzem laudo clássico em silêncio.
- **`observacoes_do_medico` descartado** em ABDOMEN_TOTAL e ABDOMEN_SUPERIOR: o
  prompt promete respeitar, nada renderiza.
- **Q5 e Q6 seguem abertas** — arquivar o Lab antigo; renomear
  `WRITER_V2_ABDOME_USER_ID`; futuro do estilo OBJETIVO.
