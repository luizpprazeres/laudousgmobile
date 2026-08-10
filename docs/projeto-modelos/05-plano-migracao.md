# Plano de migração — personalização de modelos

- **Migration:** `packages/db/src/sql/0022_model_customizations.sql` — **escrita, NÃO aplicada**
- **Schema Drizzle:** `packages/db/src/schema/reportModelCustomizations.ts`
- **Ambiente alvo:** projeto Supabase `laudousgmobile`, ref `yldtkqrsbgcnwlydrrot`,
  us-east-2, PG 17.6.1 — **é o único projeto da organização: não há staging**

---

## 1. Modelo de dados atual (o que já existe)

| Tabela | Papel hoje | Este projeto mexe? |
|---|---|---|
| `profiles` | usuário (= `auth.users.id`) | **não** — só é referenciada |
| `categories` | catálogo de categorias | **não** — só é referenciada |
| `writing_styles` | clássico / objetivo (+2 legados) | **não** — o enum `writing_style_code` é reusado |
| `report_template_variants` | catálogo de "máscaras" (100 linhas, **oco**) | **não agora** — ver §7 |
| `account_report_preferences` | variante escolhida + 2 toggles (2 linhas, **vazias**) | **não** — segue funcionando |
| `reports`, `generation_runs`, `generation_audit` | laudos e execução | **não** — item 8 do corte vertical |

## 2. O que a migration cria

Duas tabelas **novas**. Nenhum `ALTER` em tabela existente, nenhum dado movido.

```
report_scopes                       report_model_customizations
├ id            uuid pk             ├ id              uuid pk
├ scope_type    text = 'user'       ├ scope_id        → report_scopes
├ user_id       → profiles          ├ category_code   → categories
└ created_at                        ├ style_code      writing_style_code
  unique (scope_type, user_id)      ├ base_catalog_id text     ┐ vínculo com o
                                    ├ base_versao     integer  ┘ modelo-base
                                    ├ versao          integer
                                    ├ status          draft|published|archived
                                    ├ operations      jsonb (array, ≤200)
                                    ├ note, created_by
                                    └ created_at, updated_at, published_at
                                      unique (scope_id, category, style, versao)
```

### Por que `report_scopes` existe

A decisão Q3 foi "usuário, com a chave preparada para conta/clínica". A revisão do
Codex (C10) apontou que um par solto `(scope_type, scope_id)` **perderia a FK para
`profiles`** que hoje existe em `account_report_preferences`. A entidade resolve
isso: a indireção ganha integridade referencial, e amanhã basta acrescentar
`'organization'` ao CHECK — sem migrar nada do que já estiver gravado.

### Por que o catálogo-base NÃO vai para o banco

Revisão C9: `report_template_variants.renderer_schema` é `z.unknown()` e o endpoint
admin permite alterar o JSON **sem incrementar a versão**. Canonizar o modelo-base
ali agora criaria risco de o código e o modelo saírem de sincronia, com rollback
não atômico. O catálogo-base fica **versionado no Git**, fazendo deploy junto com o
código que o interpreta. O banco guarda só o overlay e a versão do base.

## 3. Versionamento, auditoria e rollback

- **Uma linha por versão.** Publicar cria `versao + 1` e arquiva a anterior.
- **Índices únicos parciais** garantem no máximo **um `draft`** e **um `published`**
  por `(escopo, categoria, estilo)`. Arquivadas não entram no índice — são o histórico.
- **Diff entre versões** e **rollback** saem de graça: republicar uma versão arquivada.
- **Auditoria de origem** já existe no documento (`Segment.origin` = base/custom/computed).
  Gravar `catalog_id` + `catalog_versao` + `customization_versao` em `generation_audit`
  é o item 8, migration separada.
- `created_by` registra quem publicou.

## 4. Índices

| Índice | Para quê |
|---|---|
| `rmc_one_draft_uidx` (parcial) | garante um único rascunho |
| `rmc_one_published_uidx` (parcial) | garante uma única versão publicada |
| `rmc_lookup_idx` | **hot path da geração** — achar a publicada do médico |
| `rmc_historico_idx` (`versao desc`) | tela de histórico e rollback |
| `rmc_base_versao_idx` | quem está ancorado numa versão antiga do base (aviso de conflito) |
| `report_scopes_type_user_uidx` | um escopo por usuário |

## 5. Acesso e isolamento entre contas

- RLS habilitada nas duas tabelas, com policies own-row (nas customizações, o dono
  é alcançado por `exists (… report_scopes … user_id = auth.uid())`).
- **Ressalva honesta:** o backend acessa via service role e **bypassa RLS**
  (`packages/db/src/client.ts:6-9`). O isolamento em runtime continua sendo feito
  **em código**, com `WHERE` explícito — como em todo o resto do sistema. As policies
  protegem o acesso direto com anon key pelos clientes. Isso não é introduzido aqui;
  é o padrão vigente, e está registrado como risco R3 em `02-riscos.md`.

## 6. Impacto e compatibilidade

| Dimensão | Avaliação |
|---|---|
| Dados existentes | **nenhum impacto** — tabelas novas, nada migrado |
| Apps antigos (iOS/Android/web) | **nenhum** — não leem estas tabelas |
| Pipeline de geração | **nenhum** — só passa a ler no item 7, atrás de flag |
| Tempo de aplicação | instantâneo (tabelas vazias, sem backfill) |
| Locks | nenhum em tabela existente |
| Reversibilidade | **total** — `DROP` das duas tabelas; ninguém depende delas |

`set_updated_at()` é **reusada** de `0001_extensions_and_triggers.sql`, não recriada.
O rollback não a remove: é compartilhada.

## 7. Coexistência com `report_template_variants`

As duas convivem sem conflito. A tabela antiga continua servindo à escolha de
variante de máscara (`account_report_preferences.default_variant_id`), hoje inerte
por não haver nenhuma variante com `preference_eligible = true`. Consolidar as duas
é decisão futura, fora deste corte vertical — e mais fácil depois que a nova estiver
em uso, não antes.

## 8. Backup e restauração

O projeto tem backup automático do Supabase (PITR conforme o plano). Como a migration
**não altera nem apaga nada**, o cenário de restauração é apenas o `DROP` do §6 —
não há necessidade de snapshot prévio. Se ainda assim for desejado, o caminho é o
backup on-demand pelo painel antes de aplicar.

## 9. Como aplicar — decisão pendente

| Opção | Prós | Contras |
|---|---|---|
| **A. Branch Supabase** | testa fora de produção | US$ 0,01344/h; `list_branches` retornou erro — pode exigir o projeto ligado a um repositório Git |
| **B. `BEGIN; … ROLLBACK;` em produção** | valida sintaxe, FKs, CHECKs e policies **sem persistir** | executa DDL no banco de produção, mesmo que revertido |
| **C. Aplicar direto** | um passo | sem ensaio |

**Recomendação: B, seguido de C.** O ensaio com rollback pega qualquer erro de
sintaxe ou de referência em segundos, sem deixar nada; confirmado que passa, aplica.
Como são tabelas novas e vazias, o risco de C após B é próximo de zero.

**Nada será executado sem autorização explícita.**

## 10. Depois de aplicar

1. `mcp get_advisors(type: "security")` — confere se as policies novas satisfazem o linter.
2. Repositório de dados + endpoints (item 6).
3. Ligar a Biblioteca à persistência.
4. `generation_audit` com `catalog_versao` + `customization_versao` (item 8, migration à parte).
