# Arquitetura proposta — modelo canônico e personalização

- **Status:** decisões Q1–Q4 tomadas (2026-08-09); **§2 corrigida pela validação de viabilidade** (§2.1)
- **Data:** 2026-08-09
- **Base factual:** `00-mapa-do-sistema.md` · **Decisões:** `03-perguntas-abertas.md`

---

## 1. A tensão que este projeto precisa resolver

O sistema foi **deliberadamente enrijecido** para ganhar previsibilidade:
o ADR-0004 aposentou o RAG vetorial, 13 categorias passaram a ser montadas por
**código TypeScript** (`renderer/categories/*.ts`), e 16 guards determinísticos
corrigem a saída do writer LLM. Isso funcionou — `ABDOMEN_TOTAL` tem 5,7 % de edição manual.

Personalização, porém, exige **flexibilidade**. E é exatamente a flexibilidade que
foi removida. As três abordagens que existem hoje no ecossistema falham cada uma de um jeito:

| Abordagem | Onde | Por que não serve como está |
|---|---|---|
| Texto montado em código | renderer, 13 categorias | usuário não consegue mudar uma frase sem PR |
| Escolher variante curada | `report_template_variants` | 0 variantes elegíveis; só o admin cria; não é personalização |
| Template integral no prompt | `laudousg.com` (`templates.content_text`) | é o modelo que o backend abandonou por imprevisibilidade |

**A saída não é escolher uma das três.** É mudar o que "modelo" significa:
deixar de ser *código* ou *texto solto* e passar a ser **dado estruturado versionado**,
que o renderer interpreta e o writer serializa.

---

## 2. A estrutura canônica já foi inventada neste repositório ⭐

**[F]** As specs do Writer V2 (`apps/api/src/server/pipeline/writerV2/specs/*.json` —
`OBSTETRICA`, `DOPPLER_OBSTETRICO`, `MORFOLOGICO`, `PELVE_FEMININA`, `abdomenTotal`)
já têm exatamente a forma necessária:

```jsonc
{
  "base": [                          // 22 slots em OBSTETRICA
    { "id": "titulo",
      "frase_normal": "ULTRASSONOGRAFIA OBSTÉTRICA",
      "obrigatorio": true }          // ← invariante clínica DECLARADA COMO DADO
  ],
  "dictionary": [                    // 35 entradas em OBSTETRICA
    { "gatilho": "DUM com data e idade gestacional atual informadas",
      "slot_alvo": "data_gestacional",
      "corpo": "DUM: dd/mm/aaaa. Hoje com X semanas e X dias.",
      "conclusao": "" }              // ← alteração condicional por achado/patologia
  ],
  "contract": {                      // ← formatação e estilo
    "titulo": "ULTRASSONOGRAFIA OBSTÉTRICA",
    "numeracao_conclusao": "1)",
    "segmentos_romanos": false,
    "conclusao_modo": "por_estrutura",
    "conclusao_ordem": [ … ]
  }
}
```

Mapeando para os requisitos do projeto:

| Requisito | Onde já cabe na spec |
|---|---|
| identificador estável | `base[].id` |
| conteúdo estruturado | `base[]` |
| **regras clínicas obrigatórias** | `base[].obrigatorio` |
| modificações condicionais por patologia | `dictionary[]` (gatilho → slot_alvo → corpo + conclusão) |
| estilo clássico/objetivo | `contract` |
| item fixo na conclusão | `contract.conclusao_ordem` + slot |

**Insight decisivo:** o Writer V2 foi desligado por imprevisibilidade **do planner LLM**
que consome a spec — **não da spec**. Podemos **manter a spec e descartar o planner**.

Isso separa duas coisas que hoje estão acopladas: *o modelo* (dado) e *quem escreve o texto*
(código determinístico ou LLM).

---

## 2.1 ⚠️ Correção após a validação de viabilidade (Q4) — executada em 2026-08-09

A formulação original desta seção — *"o renderer determinístico consome a spec"* — era
**ambiciosa demais**. A leitura integral de `renderer/categories/OBSTETRICA.ts` (912 linhas)
contra `writerV2/specs/OBSTETRICA.json` (22 slots, 35 condicionais) mostra:

**O que confirma a hipótese [F]:**
as frases da spec são **literalmente as mesmas strings** do renderer. Exemplos:
`"Batimentos cardíacos ritmados (BCF = ____ bpm)."` = `OBSTETRICA.ts:626`;
`"Saco gestacional de forma normal, com diâmetro médio de ____ mm."` = `OBSTETRICA.ts:622`;
o bloco `COMENTÁRIOS` é idêntico caractere a caractere.

**O que refuta [F]:** a spec **não expressa a lógica**, e o renderer é cheio dela —
`calcDsm`, `calcPonderal`, `computeIg` (IG determinística com referência precoce),
formatação numérica (`ptBr`, `mm1`, `g0` — o estilo objetivo força 1 casa decimal),
concordância gramatical (`apresentacaoFmt`: cefálico → cefálica), ramificação
gemelar/inicial, defaults clínicos, dedup da camada flexível. Além disso:
- os `gatilho` do dictionary são **linguagem natural** ("gestação inicial com saco
  gestacional visualizado") — feitos para um LLM interpretar, não para um predicado
  determinístico sobre os findings;
- os placeholders são `____` **posicionais**, sem dizer qual campo os preenche;
- **não há gemelar** na spec (nem "Dois fetos:", nem peso médio, nem divergência ponderal);
- `contract.conclusao_ordem` = `[feto, liquido_amniotico, peso_fetal]` **diverge** do
  renderer, que no feto único monta `[IG, líquido]` — sem peso fetal.

### A formulação corrigida: separar MOTOR de CONTEÚDO

> O renderer **continua sendo o motor** (cálculo, formatação, concordância, ramificação).
> O que sai do código para dado versionado é o **catálogo de frases** (com placeholders
> **nomeados**), a **ordem dos slots** e a marcação de **obrigatoriedade**.

Isso é menos ambicioso, muito menos arriscado — e é suficiente, porque **as cinco
personalizações do briefing são todas de conteúdo, nenhuma é de lógica**.

### Prova executável

`apps/api/src/server/renderer/__tests__/model-catalog-poc.manual.ts` — determinístico,
offline, sem tocar banco nem produção. **9/9 asserções passaram**; `pnpm --filter
@laudousg/api typecheck` limpo.

```
[H1] Catálogo default reproduz o renderer byte-a-byte
  ✓ feto único, gestação padrão
  ✓ feto único, gestação inicial
[H2] Personalização = troca de entrada no catálogo
  ✓ 3 medidas do saco gestacional aparecem no texto
  ✓ o resto do laudo permanece idêntico ao base
  ✓ frase substituída aparece; a original some
  ✓ item extra na conclusão é posicionável
[H3] Invariante clínica é protegida por dado, não por convenção
  ✓ remover slot obrigatório (dbp) é rejeitado
  ✓ remover slot opcional (movimentos_fetais) é permitido
  ✓ operação sobre slot inexistente é rejeitada (detecta conflito de versão)
```

Rodar: `pnpm exec tsx apps/api/src/server/renderer/__tests__/model-catalog-poc.manual.ts`

**Achado colateral de alto valor [F]:** o exemplo nº 5 do briefing (mostrar as três
medidas do saco gestacional além do diâmetro médio) **já tem o dado extraído** —
`saco_gestacional_medidas_mm` existe no schema (`OBSTETRICA.ts:58`) e `calcDsm` usa as
medidas para calcular a média (`:338-343`) — mas o renderer **descarta as três medidas**
e imprime só o DSM (`:622`). Ou seja: a personalização mais "difícil" do briefing é, na
verdade, uma troca de frase no catálogo, com o dado já disponível. Risco quase zero.

**Lacunas assumidas do PoC** (escopo deliberado, não surpresa): gemelar; variações de
líquido (ILA/MBV/alterado) e de placenta; flags `igCorrection`/`flexivel`/`grannum`;
estilo OBJETIVO como segundo catálogo. Todas entram no corte vertical (§5).

---

## 3. Arquitetura proposta

### 3.1 Camadas de composição (precedência)

```
1. INVARIANTES CLÍNICAS      slots com obrigatorio:true + guards de segurança   [imutável]
2. CONTRATO DA CATEGORIA     contract{} da spec: títulos, numeração, ordem       [admin]
3. MODELO-BASE               base[]: slots e frases normais, versionado          [admin]
4. CONDICIONAIS POR ACHADO   dictionary[]: gatilho → slot_alvo                   [admin]
5. PERSONALIZAÇÃO            overlay de operações ancorado em slot.id            [usuário]
6. DADOS DO EXAME            achados extraídos do ditado                         [runtime]
7. COMANDOS DO MÉDICO        instruções do ditado ("não descreva a placenta")    [runtime]
8. FORMATAÇÃO FINAL          renderer/guards                                     [sistema]
```

Diferenças relevantes em relação à ordem sugerida no briefing:

- **Comandos do médico ficam DEPOIS da personalização (7 > 5)**, não antes.
  O comando é do exame de agora; a personalização é a preferência permanente.
  Um "não descreva a placenta" hoje deve vencer o modelo personalizado — mas **nunca**
  vencer uma invariante clínica (1).
- **Sanity check não é uma camada de composição.** É uma **verificação posterior**
  que roda sobre `(modelo efetivo + achados + texto)`. Colocá-lo no meio da pilha é o
  que hoje o faz depender de frase literal.

### 3.2 Personalização como OPERAÇÕES, não como cópia

Recomendo **overlay de operações ancorado em `slot.id`**, e explicitamente **não**
o template integral do usuário (modelo da web atual).

```jsonc
{
  "base_model": "OBSTETRICA",
  "base_version": 7,                    // vínculo explícito com a versão do modelo-base
  "style": "CLASSICO_COMPLETO",
  "status": "draft",                    // draft | published | archived
  "operations": [
    { "op": "replace_phrase", "slot": "placenta",
      "value": "Placenta de inserção corporal anterior, grau 0." },
    { "op": "append_conclusion_item", "value": "Recomenda-se controle ecográfico em 4 semanas." },
    { "op": "set_slot_variant", "slot": "saco_gestacional", "variant": "tres_medidas" },
    { "op": "remove_slot", "slot": "comentario_tecnico" }   // rejeitado se obrigatorio:true
  ]
}
```

Por que operações e não cópia integral:

| Critério | Operações | Cópia integral (web hoje) |
|---|---|---|
| Modelo-base evolui | usuário herda melhorias; só conflita o que ele tocou | usuário congela num modelo velho, para sempre |
| Detectar conflito | trivial: o `slot.id` sumiu ou mudou entre versões | impossível sem diff semântico |
| Proteger invariante | validável op por op, antes de salvar | só detectável relendo o texto todo |
| Rastreabilidade | a operação **é** o registro de auditoria | só resta um blob de texto |
| Alteração extensa | degrada de forma explícita (muitas ops = aviso) | indistinguível de alteração pontual |

O briefing observa que "a maioria das alterações será pequena". Operações são
exatamente a representação natural disso.

**Válvula de escape:** para o caso raro de reescrita ampla, uma operação
`replace_section` com aviso de risco — mantendo o vínculo ao slot e à versão-base.

### 3.3 Onde isso vive no banco

Reaproveitando o que já existe no banco A (que está **vazio**, logo sem custo de migração):

| Tabela | Uso proposto |
|---|---|
| `report_template_variants` | **modelo-base canônico**: `renderer_schema` jsonb passa a guardar a spec (`base`/`dictionary`/`contract`); `version`, `status`, `approved_at` já existem |
| *(nova)* `report_model_versions` | histórico imutável por versão + diff + autor |
| *(nova)* `account_report_customizations` | overlay do usuário: `base_variant_id`, `base_version`, `operations` jsonb, `status`, timestamps |
| `account_report_preferences` | mantém-se para os toggles de renderer; ganha FK para a customização publicada |
| `generation_audit` | ganha `model_version` e `customization_version` → rastreabilidade de qual camada gerou cada laudo |

**Nada disso exige alterar `reports`, `generation_runs` ou qualquer tabela quente.**

### 3.4 Sanity checks: de texto literal para conceito

Regra a adotar: **um sanity check nunca pode depender de uma frase que o usuário
tem permissão de editar.** Reclassificação proposta:

| Check atual | Hoje | Proposta |
|---|---|---|
| `placeholder_vazado` (iOS) | regex `____`/`{LINHA_*}` | mover para o servidor, verificar sobre o modelo efetivo antes de entregar |
| `medida_magnitude_estranha` (iOS) | regex sobre texto | usar os achados **estruturados** (o backend já os emite no evento `structured`, que o iOS descarta) |
| `lateralidade_inconsistente` (iOS) | heurística lexical — **hoje nunca dispara** (bug em `SanityChecker.swift:80`) | reescrever sobre achados estruturados, ou remover |
| `data_invalida` (iOS) | detecção textual + validação de calendário | manter a validação; mover a detecção para os dados |
| Guards obrigatórios (Doppler umbilical, gemelar, vitalidade) | servidor, determinísticos | **promover a invariantes** (camada 1) — nunca sobrescrevíveis por personalização |

---

## 4. Decisões tomadas (2026-08-09)

Registradas com justificativa em `03-perguntas-abertas.md`:

1. **Banco canônico: A** (`yldtkqrsbgcnwlydrrot`). Mobile/iOS é o foco; a web
   (`laudousg.com`, banco B) sai do caminho crítico e permanece como referência de UX.
   Custo de migração de dados: **zero**.
2. **Personalização por operações** sobre o modelo-base, ancoradas em `slot.id`,
   com `replace_section` como válvula de escape.
3. **Escopo por usuário, chave preparada:** `(scope_type, scope_id)` desde a v1,
   aceitando apenas `scope_type = 'user'`.
4. **Viabilidade validada** — com a correção de escopo da §2.1.

---

## 5. Primeira implementação vertical recomendada

**OBSTETRICA, estilo CLÁSSICO_COMPLETO, banco A.**

Justificativa baseada em dados, não em conveniência:
- **[F]** maior taxa de edição manual (41,8 % de 378 laudos em 60 dias)
- **[F]** menor delta médio de edição (93 caracteres) → são ajustes pontuais, o caso de uso exato
- **[F]** já tem spec estruturada pronta (`writerV2/specs/OBSTETRICA.json`, 22 slots, 35 condicionais)
- **[F]** já tem renderer determinístico em produção → existe gabarito para regressão
- **[F]** é a categoria dos dois exemplos do briefing (4º item na conclusão; medidas do saco gestacional)

Escopo do corte vertical (fim a fim, tudo atrás de feature flag):

| # | Passo | Estado |
|---|---|---|
| 0 | Provar que o catálogo reproduz o renderer byte-a-byte | ✅ **feito** |
| 1 | **Catálogo completo de OBSTETRICA clássico** (gemelar, líquido, placenta, flags) | ✅ **feito — 960/960** |
| 2 | Refatorar `renderer/categories/OBSTETRICA.ts` para ler o catálogo — **flag `MODEL_CATALOG_CATEGORIES`, default vazio** | próximo |
| 2b | Segundo catálogo: OBSTETRICA × OBJETIVO | a fazer |
| 3 | ~~Promover o catálogo ao banco~~ → **catálogo-base fica no Git** (revisão C9); o banco guarda só overlays + versão/hash do base | revisado |
| 4 | Tabela `report_scopes` + `account_report_customizations` (`scope_id` FK, `base_catalog_id`, `base_versao`, `operations`, `status`) | a fazer |
| 5 | Validador de operações | ✅ **feito — 33/33** |
| 6 | Endpoints: rascunho, prévia, publicar, restaurar padrão, histórico, rollback | a fazer |
| 7 | Geração aplicando a customização publicada | a fazer |
| 8 | `generation_audit` grava `catalog_id` + `catalog_versao` + `customization_versao` | a fazer |
| 9 | Visualização no Lab (usa `Segment.origin`, já disponível) | a fazer |
| 10 | Golden tests contra a API real | a fazer |

### Artefatos do passo 1

| Arquivo | Papel |
|---|---|
| `renderer/catalog/types.ts` | `Slot`, `SlotVariant`, `Catalog`, `Segment`, `ReportDoc`, `Operation` |
| `renderer/catalog/engine.ts` | `buildDoc`, `serialize`, `validateOperations`, `applyCustomization` |
| `renderer/catalog/OBSTETRICA.classico.ts` | o catálogo + o motor da categoria (formatação, concordância, predicados) |
| `renderer/catalog/OBSTETRICA.render.ts` | adaptador que o passo 2 vai plugar no renderer |
| `__tests__/catalog-equivalence.manual.ts` | **960 combinações** (gestação × nº de fetos × líquido × placenta × extras × flags) |
| `__tests__/catalog-guarantees.manual.ts` | **33 garantias** de segurança da personalização |

Nada disso é importado pelo pipeline ainda.

**Critério de aceitação inegociável do passo 2:** com zero customizações e a flag ligada,
a saída deve ser **byte-a-byte idêntica** à atual nos casos golden de obstetrícia
(`obstetrica-det-01-inicial`, `obstetrica-det-02-padrao`, `obstetrica-cur-01-gemelar`,
`morfologico-det-01/02`, `doppler-obstetrico-det-01`) e nos boletins do renderer.
Sem isso, nada avança.

**Ordem de segurança:** o passo 2 é uma refatoração **sem mudança de comportamento**
(flag desligada = código atual). Só depois de ele estar verde é que a personalização
(passos 3–7) passa a existir. Isso mantém cada incremento reversível.
