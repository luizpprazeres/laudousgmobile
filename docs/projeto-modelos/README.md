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
| `03-perguntas-abertas.md` | As 6 decisões que dependem do responsável |

Convenção usada em todos: **[F]** fato verificado por comando/arquivo ·
**[I]** inferência · **[?]** não confirmado.

## Estado atual

- **Fase 1 (Descoberta): concluída** — 2026-08-09
- **Fase 2 (Arquitetura): decidida** — Q1–Q4 respondidas em 2026-08-09; viabilidade
  **validada com prova executável** (9/9). A proposta foi **corrigida** pela validação:
  o renderer permanece como *motor*; só o *conteúdo* (frases, ordem, obrigatoriedade)
  vira dado. Ver `01-arquitetura-proposta.md §2.1`.
- **Fase 3 (Implementação): não iniciada** — próximo passo é o item 1 do corte
  vertical (`01-arquitetura-proposta.md §5`).

Nada foi alterado no banco, em produção ou em configuração de domínio. As escritas
desta sessão são: os 5 documentos desta pasta e **um** arquivo de teste novo,
`apps/api/src/server/renderer/__tests__/model-catalog-poc.manual.ts` (PoC isolado,
não importado por código de produção). `pnpm --filter @laudousg/api typecheck` limpo.

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

## Primeira implementação vertical proposta

**OBSTETRICA / CLASSICO_COMPLETO / banco A** — escolhida por dados, não por conveniência:
maior taxa de edição manual (41,8 % de 378 laudos em 60 dias) com o **menor** delta médio
(93 caracteres), ou seja, exatamente o padrão "ajuste pontual repetitivo" que a
personalização elimina. Já tem spec estruturada e renderer em produção como gabarito.

**Critério de aceitação do primeiro passo:** com zero customizações, saída
**byte-a-byte idêntica** à atual nos 52 casos golden. Sem isso, nada avança.

## Comandos de validação

```bash
pnpm --filter @laudousg/api typecheck
pnpm --filter @laudousg/api build
GOLDEN_AUTH_TOKEN=<jwt> pnpm validate:golden:deterministico
# ⚠️ pnpm test é NO-OP: nenhum package define script "test"
```

## Como retomar

1. Leia `00-mapa-do-sistema.md` — é o estado de verdade, com caminhos reais.
2. Leia as decisões no topo de `03-perguntas-abertas.md` (Q1–Q4, já respondidas)
   e a correção de escopo em `01-arquitetura-proposta.md §2.1`.
3. Rode o PoC para reancorar o entendimento em algo executável:
   `pnpm exec tsx apps/api/src/server/renderer/__tests__/model-catalog-poc.manual.ts`
4. Continue pelo item 1 do corte vertical (`01 §5`): completar o catálogo de OBSTETRICA
   (gemelar, variações de líquido/placenta, flags, estilo OBJETIVO).
5. Confirme o ambiente antes de qualquer acesso ao banco: projeto `laudousgmobile`,
   ref `yldtkqrsbgcnwlydrrot`, us-east-2 — **é o banco de produção, não há staging**.
6. Continuam **abertas**: Q5 (autorizações operacionais — criar tabelas, ligar flags,
   arquivar o lab) e Q6 (renomear `WRITER_V2_ABDOME_USER_ID`; futuro do estilo OBJETIVO).
