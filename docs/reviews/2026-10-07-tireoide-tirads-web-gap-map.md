# Laudo USG — Tireoide · Domingos × ACR TI-RADS · Mapa de gaps (Web primeiro)

- **Data:** 07/10/2026
- **Repositório auditado:** `/Users/luizprazeres/laudousgmobile-def` (base `4f93b0d`; a correção C1 foi revisada no mesmo pacote)
- **Fonte do pedido:** anexo de feedback, itens **18 a 21** (Parte 4 — Tireoide), com os princípios do item 23 e as prioridades do item 24.
- **Escopo:** classificação de Domingos, ACR TI-RADS, localização nodular, recomendações de conduta e layout da calculadora na Web; impactos em API e mobile apenas registrados.
- **Restrições respeitadas:** nenhum arquivo do repositório foi editado, nada foi commitado e o Laudário não foi aberto. Nenhum texto ou arte de concorrente foi usado.

---

## 0. Método e limites

1. Li o código atual da Web (`apps/web`), do renderer canônico (`apps/api`), do companion/visão e da calculadora mobile, e também os snippets de conhecimento e os prompts.
2. Rodei apenas os testes existentes da tireoide, sem escrever no repo:
   - `apps/web/tests/tireoideAcr.manual.ts` → **passou** ("Tireoide ACR: prévia, localização e Domingos opcional aprovados").
   - `apps/api/src/server/renderer/__tests__/tireoide-23c1-clinical-matrix.manual.ts` → **40 passaram, 0 falharam**.
   - Não rodei o teste de navegador (`tireoideForm.browser.manual.ts`), lint nem typecheck.
3. Para confirmar os gaps, rodei uma sonda de `renderTireoide` no scratchpad da sessão, fora do repo. O arquivo foi apagado depois. As saídas estão citadas em §3.
4. **Não fiz pesquisa externa.** Os limiares ACR citados aqui são os que já estão no código (e coincidem com o ACR TI-RADS 2017 amplamente citado). Mesmo assim, **todo critério clínico de §6 precisa ser conferido no white paper oficial (Tessler et al., JACR 2017) e revisado por médico** antes de virar regra nova.
5. Durante a sessão apareceram no `git status` arquivos em `docs/competitor-research/laudario/…`. **Não foram criados por esta auditoria** e não foram lidos.
6. **⚠️ Alterações concorrentes no working tree (não feitas por esta auditoria, não commitadas).** Depois das leituras principais, outra sessão modificou estes arquivos:
   - `apps/api/src/app/api/catalog/[category]/render/route.ts`, `apps/api/src/server/renderer/catalog/alteracoes.ts`, `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts`
   - `apps/web/src/app/api/catalog/[category]/render/route.ts`, `apps/web/src/lib/catalog/cliente.ts`, `package.json`
   - mais o arquivo novo `apps/api/src/server/renderer/catalog/__tests__/tireoide-preferencias-web.manual.ts`

   O conteúdo implementa o núcleo do **P0/C1**: o proxy Web lê as preferências da conta e manda `renderer_preferences`, e a API repassa via `ContextoDeRender.tireoidePreferences` até `renderTireoide`. A auditoria partiu do **HEAD `4f93b0d`** e também registrou a correção C1 preparada no mesmo pacote. Ver §3, C1.

Legenda de status: ✅ implementado · 🟡 parcial · ❌ ausente · ⚠️ contradição ativa.

---

## 1. Resumo executivo

| Item | Pedido | Estado real na Web | Veredito |
|---|---|---|---|
| **18** | ACR principal, Domingos opcional e complementar, sem equivalência inadequada, prompts mobile corrigidos | A UI e o adapter estão certos: o ACR é exigido, o Domingos é ligado por nódulo e cada escala é calculada separadamente. Mas a equivalência ainda vaza em **5 pontos**: `ti_rads_ditado` alimenta as duas escalas; com Domingos ativo, o corpo do laudo usa só os descritores de Domingos; a conclusão põe o Domingos antes do ACR; snippets e prompts ainda mandam escrever "equivalente ao TI-RADS ACR" (com 4a/4b/4c); e o companion importa só Domingos, ativando-o por padrão | 🟡 / ⚠️ |
| **19** | Localização selecionável (terços) | `<select>` com Terço superior/médio/inferior, oculto para o istmo; valor fora da lista é preservado | ✅ (gaps residuais menores) |
| **20** | Cinco grupos da esquerda para a direita, com pontos e cores TR1–TR5 discretas mais o texto | Ordem certa, pontos nos rótulos, cores TR1 verde → TR5 vermelho com o texto da categoria, 5 colunas em `xl`. As quebras são por viewport, não por largura do card; entre 900 e 1279 px ficam 2 colunas com o 5º grupo sobrando; a cor aparece só no badge e na faixa de conduta | 🟡 |
| **21** | Conduta ACR automática por categoria e tamanho, por nódulo, na seção escolhida pelo médico | A lógica está no renderer e é testada. **No HEAD, na Web, ela nunca entra no laudo** (há uma correção em andamento no working tree, de outra sessão e não commitada — ver §0.6 e C1): o render do catálogo chama `renderTireoide(f, undefined)` e ignora a preferência da conta, embora a tela prometa o contrário. A posição (dentro da conclusão) não é configurável. A redação existe em 3 versões divergentes. A numeração dos nódulos diverge da tela. Nódulos sem indicação ficam em silêncio | 🟡 / ⚠️ |

**Prioridade recomendada:**

1. **P0:** ligar a preferência na Web, ou corrigir o texto da UI até lá.
2. **P1:** separar o TI-RADS "ditado" por escala.
3. **P2:** dar coerência entre os descritores de Domingos e ACR, e pôr o ACR em primeiro na conclusão.
4. **P3:** decidir onde a conduta entra e como os nódulos são identificados.
5. **P4:** criar uma fonte única para as regras ACR.
6. **P5:** responsividade por container.
7. **P6:** limpar prompts e snippets.
8. **P7:** mobile, depois da Web.

---

## 2. Estado real por arquivo e linha

### 2.1 Web — UI

| Arquivo:linha | O que existe hoje | Item |
|---|---|---|
| `apps/web/src/components/laudar/TireoideFormPanel.tsx:212-239` | `newNodulo()` cria o nódulo **sem classificação**: Domingos com `domingosAtivo:false` e ACR todo `null`/`[]` | 18 |
| `…/TireoideFormPanel.tsx:241-268` | Opções ACR com pontos no rótulo (`'Sólido/quase sólido · 2'` etc.) | 20 |
| `…/TireoideFormPanel.tsx:270-275` | `LOCALIZACOES`: Não informada, Terço superior/médio/inferior. O valor já vem com a preposição ("no terço médio") | 19 |
| `…/TireoideFormPanel.tsx:277-283` | `TIRADS_STYLE`: TR1 emerald, TR2 yellow, TR3 amber, TR4 orange, TR5 red, com variantes dark | 20 |
| `…/TireoideFormPanel.tsx:381-384` | Texto: "O ACR TI-RADS é a classificação principal. A escala de Domingos pode ser acrescentada… sem conversão" | 18 |
| `…/TireoideFormPanel.tsx:412-440` | Grid Lobo + Localização (`select`, `h-11`/`sm:h-9`). Oculto e limpo quando o lobo é o istmo (`418`, `426`). Valor desconhecido é preservado como `<option>` extra (`434-436`) | 19 |
| `…/TireoideFormPanel.tsx:442-460` | Três medidas (c1×c2×c3) em cm, `inputMode="decimal"`, `w-16` | 21 |
| `…/TireoideFormPanel.tsx:462-488` | Bloco "ACR TI-RADS · principal" com badge `TRx · N pontos` (`role="status"`) ou "Classificação incompleta" | 20 |
| `…/TireoideFormPanel.tsx:489` | **`grid gap-2 sm:grid-cols-2 xl:grid-cols-5`** — quebras por **viewport** | 20 |
| `…/TireoideFormPanel.tsx:490-498, 500-507, 502` | Cístico ou espongiforme zera e desabilita os outros 4 grupos. "Anecoico" some fora da composição TR1 | 20/clínico |
| `…/TireoideFormPanel.tsx:508-525` | Focos: multisseleção; "Nenhum/cauda de cometa" é exclusivo | 20 |
| `…/TireoideFormPanel.tsx:527-534` | Faixa colorida com `ACR TRx — risco. management.` e a frase **"A recomendação entra no laudo quando essa opção estiver ativada em Preferências."** | 21 ⚠️ |
| `…/TireoideFormPanel.tsx:540-565` | Botão "Classificação de Domingos — Opcional e complementar; não altera o cálculo ACR". Expande os 6 eixos. A expressão `domingosAtivo ?? Boolean(...)` se repete 5× (`543, 544, 551, 552, 555`) | 18 |
| `…/TireoideFormPanel.tsx:89-111, 309-319` | `Chip` dos eixos de Domingos **sem `aria-pressed`**; `AcrEixo` (`347-359`) tem | a11y |
| `apps/web/src/components/preferencias/ModelosPreferidos.tsx:74-93` | Toggles da conta: "Mostrar escore de Domingos" (padrão `true`) e "Incluir recomendação ACR TI-RADS" (padrão `false`) — "sincronizada com os aplicativos" | 18/21 |
| `apps/web/src/components/laudar/LaudarWebExperience.tsx:138` | `FULL_WIDTH_SECTIONS` inclui `'nodulos'`: o card ocupa a linha inteira | 20 |
| `…/LaudarWebExperience.tsx:513-516` | Tireoide **sem calculadoras genéricas** (o `tiRadsSpec` não aparece para TIREOIDE) | 20 |
| `…/LaudarWebExperience.tsx:537, 1224` | Seção genérica "Recomendações" (`RecommendationsPanel`, texto livre do médico) | 21 |
| `…/LaudarWebExperience.tsx:773-783` | `composedText = [generatedText, …calculatorBlocks, "RECOMENDAÇÕES:\n…", …]`. A recomendação manual entra **depois do texto do renderer, que termina no rodapé Domingos/ACR** | 21 |
| `…/LaudarWebExperience.tsx:599, 1272` | `adaptarTireoide(tireoideState)` → `/api/catalog/TIREOIDE/render`; o painel é renderizado com `TireoideFormPanel` | todos |
| `…/LaudarWebExperience.tsx:1641-1667` | Grade de cards: 1 coluna; ≥900 px, 2 colunas; ≥1360 px, 3 colunas. O card é `container-type: inline-size` (`1649`) | 20 |

### 2.2 Web — lógica

| Arquivo:linha | O que existe hoje | Observação |
|---|---|---|
| `apps/web/src/lib/calculators/tiRads.ts:62-68` | Categoria por pontos: `<2`→TR1, `2`→TR2, `3`→TR3, `4-6`→TR4, `≥7`→TR5 | igual à API |
| `…/tiRads.ts:83-89` | Limiares (mm): TR3 PAAF ≥25 / seguimento ≥15; TR4 15/10; TR5 10/5 | igual à API e ao mobile |
| `…/tiRads.ts:91-101` | Cístico **ou** espongiforme → TR1 sem somar os outros grupos | ver §6 (R2) |
| `…/tiRads.ts:105` | `anecoico` fora de cístico/espongiforme → `null` | |
| `…/tiRads.ts:121-137` | Texto de conduta da **prévia**: "Critério dimensional para PAAF (maior dimensão X mm ≥ Y mm)", "Acompanhamento ultrassonográfico em 1, 3 e 5 anos (…)" | 3ª redação, diferente da API |
| `apps/web/src/lib/calculators/tireoideAcr.ts:35-65` | `previewAcrDoNodulo`: maior das 3 medidas × 10 → mm; exige os 5 grupos (ou composição TR1) | "Prévia visual; o renderer continua sendo a autoridade" |
| `apps/web/src/lib/calculators/specs.ts:56-90` | `tiRadsSpec` (calculadora genérica) reaproveita `calcularTiRads`/`formatarBlocoTiRads` | não usada na Tireoide; mais um consumidor de `tiRads.ts` |
| `apps/web/src/lib/deterministic/organs/tireoide.ts:40-68` | Tipo `NoduloTireoide`: 6 eixos de Domingos + `domingosAtivo?` + 5 grupos ACR + `localizacao: string` | |
| `…/organs/tireoide.ts:161-162` | **Exporta** `NOTAS_DOMINGOS` 1–6 e `TIRADS_VALUES = ['1','2','3','4a','4b','4c','5']` (reexportados em `deterministic/index.ts:153-154`) | legado; o ACR não tem 4a/4b/4c |
| `…/organs/tireoide.ts:180-187` | `caracteristicaDaNota`: nota 5 → "provavelmente malignas" (código morto, **invertido** em relação à tabela do renderer) | legado |
| `apps/web/src/lib/catalog/eixosDoNodulo.ts:25-31` | Comentário: "A tela **nunca** calcula nota nem TI-RADS" | **desatualizado**: a prévia ACR calcula na tela |
| `apps/web/src/lib/catalog/tireoideParaCatalogo.ts:187-257` | `adaptarNodulo` | ver abaixo |
| `…/tireoideParaCatalogo.ts:191-194` | Domingos ativo = flag explícita ou, no estado legado, existência de eixo preenchido | |
| `…/tireoideParaCatalogo.ts:201-224` | Pendências **bloqueantes**: sem medidas; ACR incompleto (exceto legado com Domingos); misto/sólido + anecoico | ACR passa a ser obrigatório |
| `…/tireoideParaCatalogo.ts:226-232` | Com Domingos inativo, os 6 eixos vão como `null` | correto |
| `…/tireoideParaCatalogo.ts:240-242` | Localização vai como string livre; "no istmo" vira `null` | |
| `…/tireoideParaCatalogo.ts:244-245` | `nota_domingos_ditada` e `ti_rads_ditado` sempre `null` na Web | correto na Web; o problema está na API e no mobile |
| `apps/web/src/app/api/catalog/[category]/render/route.ts:9-12, 44` | O proxy Web manda `{alteracoes, dados, estilo}`. **Não manda as preferências do renderer** | ⚠️ 21 |
| `apps/web/src/lib/companionStructured.ts:296-311` | Nódulo vindo do celular entra só com os 6 eixos de Domingos e **`domingosAtivo: true`**; nenhum campo ACR | ⚠️ 18 |
| `…/companionStructured.ts:313-330` | Merge por chave `lobo\|c1\|c2\|c3\|localizacao`; conflitos só nos eixos de Domingos | |

### 2.3 API — renderer canônico e pipeline

| Arquivo:linha | O que existe hoje | Observação |
|---|---|---|
| `apps/api/src/server/renderer/categories/TIREOIDE.ts:1-17` | Cabeçalho: "deriva o TI-RADS… e a conduta **da NOTA**" | **desatualizado** em relação ao código atual |
| `…/TIREOIDE.ts:100-117` | `NoduloSchema`: eixos de Domingos, `nota_domingos_ditada`, **um único `ti_rads_ditado`**, `acr_tirads` opcional | ⚠️ 18 |
| `…/TIREOIDE.ts:166-173` | Preferências padrão: `show_domingos_score:true`, `show_conduct_recommendation:false` | |
| `…/TIREOIDE.ts:326-337` | Prompt de extração (o "mobile" de verdade): ACR separado e "NUNCA converta a Nota de Domingos em ACR". Mas `nota_domingos_ditada / ti_rads_ditado` têm a mesma regra para as duas escalas | ⚠️ 18 |
| `…/TIREOIDE.ts:399-411` | `calcNotaDomingos`: soma os eixos, incluindo dimensão e Chammas | |
| `…/TIREOIDE.ts:414-419` | `tiradsDaNota`: nota → **categoria Domingos** 1–4 (≤3, 4-5, 6-9, ≥10) | categoria própria de Domingos, chamada de "TI-RADS" |
| `…/TIREOIDE.ts:425-435` | `caracteristicasDoTirads` aceita 5 ("altamente suspeitas") por causa do ACR ditado | mistura as escalas |
| `…/TIREOIDE.ts:442-466` | `classificarNodulo`: **`ti_rads_ditado` substitui a categoria de Domingos** | ⚠️ 18 |
| `…/TIREOIDE.ts:490` | Rodapé fixo citando Domingos e ACR | |
| `…/TIREOIDE.ts:688-702` | `descritorAcr`: composição, ecogenicidade, margem, forma, focos, medidas e localização | |
| `…/TIREOIDE.ts:709-724` | `noduloDescritor`: **usa o descritor ACR só quando não há ecogenicidade de Domingos**. Com Domingos ativo, o corpo traz só os eixos de Domingos | ⚠️ 18 |
| `…/TIREOIDE.ts:800-824` | `noduloConclusao`: com Domingos, **"NOTA FINAL N (… pela escala de Domingos); ACR TI-RADS X"** — Domingos primeiro | 🟡 18 |
| `…/TIREOIDE.ts:1117-1124` | Conduta clássica: **item numerado dentro da CONCLUSÃO** ("Conduta sugerida (…ACR TI-RADS X): …") | 21 |
| `…/TIREOIDE.ts:1196-1202` | Categoria ACR por pontos (igual à Web) | |
| `…/TIREOIDE.ts:1217-1240` | `calcAcrTirads`: **`ti_rads_ditado` 1–5 substitui a categoria ACR** (`1221-1223`) | ⚠️ 18 |
| `…/TIREOIDE.ts:1258-1276` | `condutaAcr`: textos "punção aspirativa por agulha fina (PAAF)" / "acompanhamento ultrassonográfico em 1, 3 e 5 anos"… e `null` quando abaixo do limiar | 2ª redação |
| `…/TIREOIDE.ts:1292-1319` | `condutasAcrDosNodulos`: identificação `"{Lobo}, nódulo {índice no lobo}…"` (`1305`); limite de 2 PAAF por categoria → pontos → diâmetro (`1313-1316`) | numeração ≠ tela |
| `…/TIREOIDE.ts:1514-1515` | Objetivo: cístico → "(ACR TI-RADS 1)" | |
| `…/TIREOIDE.ts:1555-1562` | Objetivo: **seção própria** "Conduta sugerida:" | |
| `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts:306-321` | Catálogo: **`renderTireoide(f, undefined as any, {...})`** | ⚠️ 21 (raiz) |
| `apps/api/src/server/renderer/catalog/alteracoes.ts:461` + `modeloNormalRegistry.ts:460` | `renderizarSelecao` → `laudoPadraoDe` → `m.render(parsed.data, {objetivo}, ctx)`, sem preferências | |
| `apps/api/src/app/api/catalog/[category]/render/route.ts:13-25` | O `Corpo` aceita `estilo`, `alteracoes` e `dados`; **não aceita preferências** | |
| `apps/api/src/server/pipeline/renderer.ts:788-792` | Fluxo mobile `/api/generate`: `renderTireoide(fnd, args.rendererPreferences, …)` — **aqui as preferências chegam** | mobile ≠ Web |
| `apps/api/src/server/pipeline/deterministicSanity/tireoide.ts:18` | Sugestão de TR4/TR5 só com PAAF (sem a faixa de seguimento) | não-ACR |
| `…/deterministicSanity/tireoide.ts:32` | "TI-RADS 3: seguimento em **1–2 anos** … ou controle em **3–5 anos**" | **diverge** do renderer (1, 3 e 5 anos) |
| `…/deterministicSanity/tireoide.ts:47` | "Nódulos < 5 mm **raramente atingem TR4/TR5**" | afirmação clínica sem fonte; no ACR, a categoria não depende do tamanho |
| `…/deterministicSanity/tireoide.ts:51-62` | Bócio: volume > 25 mL | limiar sem fonte no código |
| `apps/api/src/server/prompts/global.ts:43-44` | "NUNCA sugerir conduta…" | conflita com o item 21 no caminho writer |
| `…/prompts/global.ts:198-199` | "**Classificação Domingos é padrão, sempre com correlação TI-RADS**"; "Nota Final e TI-RADS NUNCA calculados" | ⚠️ contradiz o item 18 e o renderer |
| `…/prompts/global.ts:220-221, 272` | Reproduzir classificações ditadas | |
| `apps/api/src/server/prompts/contracts/TIREOIDE.ts:10, 23, 29, 67-68, 80` | Contrato writer: "NOTA FINAL e TIRADS NUNCA calculados — reproduzir" | conflita com o renderer |
| `apps/api/src/server/vision/client.ts:247-290` | Prompt de visão: extrai só os eixos de Domingos; "NÃO atribua TI-RADS" | ACR ausente |
| `apps/api/src/server/vision/extractor.ts:56-77` | `location` livre (até 120 caracteres), sem normalizar para os terços | 19 (mobile) |
| `apps/api/.env.local:48` | `RENDERER_CATEGORIES` inclui `TIREOIDE` (local) | produção não verificada (H3) |

### 2.4 Conhecimento, documentação e marketing

| Arquivo:linha | Conteúdo | Problema |
|---|---|---|
| `packages/knowledge/snippets/TIREOIDE/regra/nodulos-com-classificacao.md:40, 51, 53, 58-68` | Formato obrigatório "…NOTA FINAL [N] (…), **equivalente ao TI-RADS [Z] ACR**"; Z ∈ {1,2,3,**4a,4b,4c**,5}; nota 5 = "provavelmente malignas" | ⚠️ equivalência; ACR não tem 4a/4b/4c; escala de "características" invertida em relação ao renderer |
| `…/frase/descritores-de-nodulo.md:26` | "NOTA FINAL 4 (provavelmente benigna), **equivalente ao TI-RADS 2 ACR**" | ⚠️ |
| `…/excecao/classificacoes-nao-calcular.md:15-18` | "NUNCA calcular" | conflita com o renderer |
| `…/regra/preservar-terminologia-do-medico.md:29-33, 51-55` | "Não substituir uma classificação pela outra" | ok; reforça a separação |
| `…/comentario_tecnico/recomendacoes-acr-tirads-2017.md:21-28` | Tabela de recomendações ACR 2017 (mesmos limiares) | 4ª redação |
| `docs/det-5-tireoide-domingos.md:76-81, 119-131, 133-139` | Spec original: "equivalente ao TI-RADS Z ACR", "TI-RADS ainda é calculado pela nota", conduta por categoria de Domingos | ⚠️ histórico contraditório com o estado atual |
| `apps/web/src/components/landing/v2/hero/heroCases.ts:183-186` | Exemplo da landing: "NOTA FINAL 3 (provavelmente benignas), **equivalente ao TI-RADS 3 ACR**" | ⚠️ vitrine com a equivalência; pela tabela do renderer, nota 3 → "benignas" |

### 2.5 Mobile

| Arquivo:linha | O que existe | Observação |
|---|---|---|
| `apps/mobile/src/shared/calculators/tirads.ts:198-199` | Total `0`→TR1, **`≤2`→TR2** | Web/API: `<2`→TR1. Diverge com total 1 |
| `…/tirads.ts:67-77` + `calcularTIRADS` | **Não** faz o atalho cístico/espongiforme → TR1; soma os outros grupos | diverge da Web/API |
| `…/tirads.ts:159-185` | Arredonda o tamanho para 1 casa; textos "seguimento clínico", "Acompanhamento clínico — abaixo do limiar", TR5 "seguimento anual" (sem "por até 5 anos"), TR3 "Minimamente suspeito" | 4ª redação; termos fora do ACR |
| `…/tirads.ts:217` + `features/generate/TIRADSCalculatorSheet.tsx:73-74, 148-154` | Insere no laudo um bloco livre com "Conclusão: TRx… Recomenda-se…" | concorre com a conduta do renderer |

---

## 3. Gaps confirmados (com evidência)

> Confirmado = verificado no código e, quando indicado, reproduzido pela sonda do renderer.

**C1 ⚠️ (item 21, alta): a conduta ACR nunca entra no laudo Web, e a tela promete que entra.**
- `TireoideFormPanel.tsx:531` diz "A recomendação entra no laudo quando essa opção estiver ativada em Preferências".
- O caminho Web é proxy (`web …/render/route.ts:44`) → API (`render/route.ts:13-25`, sem preferências) → `laudoPadraoDe` → `modeloNormalRegistry.ts:307` `renderTireoide(f, undefined)`. As preferências caem no padrão `show_conduct_recommendation:false`.
- O toggle de `ModelosPreferidos.tsx:91` só vale no fluxo mobile (`pipeline/renderer.ts:789`).
- Efeito colateral: na Web, o toggle "Mostrar escore de Domingos" também é ignorado (sempre `true`). Hoje isso é mascarado pelo toggle por nódulo.
- Os testes da API passam preferências direto ao `renderTireoide` (`tireoide-23c1-clinical-matrix.manual.ts:142-189`). **Nenhum teste cobre o caminho Web → catálogo com preferências.**

> **Atualização (working tree, não commitado, outra sessão):** o diff concorrente fecha a raiz de C1 e adiciona `tireoide-preferencias-web.manual.ts`, que testa `renderizarSelecao` com `tireoidePreferences`. Não rodei nem revisei a fundo. Pontos a conferir antes do merge:
> - (a) o teste novo cobre a API, mas **não o proxy Web** (`preferenciasDeTireoide` + `chamarPreferencias`). T1 continua pendente.
> - (b) se `chamarPreferencias()` falhar, o laudo volta em silêncio ao padrão (conduta desligada). Convém registrar ou avisar.
> - (c) agora `show_domingos_score:false` da conta passa a valer na Web e **suprime o Domingos mesmo com o toggle do nódulo ligado**. A tela (`TireoideFormPanel.tsx:540-565`) precisa refletir isso, ou a regra de precedência conta × nódulo precisa ser decidida.
> - (d) o texto de `TireoideFormPanel.tsx:531` só fica verdadeiro depois do merge e do deploy dos dois apps (Web e API).
> - (e) a rota da API aceita preferências no corpo sob autenticação de serviço (ver §9).
>
> C3–C14 continuam abertos.

**C2 ⚠️ (item 18, alta): um único `ti_rads_ditado` alimenta as duas escalas.**
- `classificarNodulo` (`TIREOIDE.ts:458-465`) usa o valor como categoria de Domingos.
- `calcAcrTirads` (`1221-1223`) usa o mesmo valor como categoria ACR.
- Sonda: isoecoica (Domingos) + `ti_rads_ditado:"3"` → `"…NOTA FINAL 3 (características intermediárias pela escala de Domingos); ACR TI-RADS 3."`
- Pela própria tabela de Domingos, nota 3 dá a categoria 1 ("benignas"). Ou seja, o ditado cria uma equivalência e contradiz a tabela.
- Afeta o mobile (ditado → extração → renderer). Na Web o campo é sempre `null`.

**C3 ⚠️ (itens 18 e 23.3, alta): com Domingos ativo, o corpo descreve o nódulo só pelos eixos de Domingos, e a conclusão cita o ACR.**
- `noduloDescritor` (`TIREOIDE.ts:709-713`) só usa o descritor ACR se não houver ecogenicidade de Domingos.
- Os dois conjuntos de descritores são independentes na tela e no schema. Forma, margem e calcificação×focos podem divergir. Não há validação cruzada (`tireoideParaCatalogo.ts:187-257`).
- Sonda: Domingos `margem regular` e `calcificações: sem`, ACR `lobulada/irregular` e `focos puntiformes`:
  - Corpo: "…imagem hipoecoica, com margem regular, …, sem calcificações…"
  - Conclusão: "…NOTA FINAL 4 (características provavelmente benignas pela escala de Domingos); ACR TI-RADS 5."
- O laudo afirma um TR5 sem descrever nenhum critério que o justifique e com texto que o contradiz.
- Também viola o item 23.2: o médico informa duas vezes forma, margem e calcificação.

**C4 🟡 (item 18, média): a ordem da conclusão põe Domingos antes do ACR.**
- `noduloConclusao` (`TIREOIDE.ts:817-821`) escreve `…com NOTA FINAL N (…); ACR TI-RADS X`.
- O pedido é ACR principal. Hoje a redação o deixa como apêndice.

**C5 ⚠️ (item 18, alta para o fallback e o writer): snippets e prompts ainda mandam a equivalência.**
- `nodulos-com-classificacao.md:40,58-68`, `descritores-de-nodulo.md:26`, `global.ts:198` ("Domingos é padrão, sempre com correlação TI-RADS"), `contracts/TIREOIDE.ts:29,68`, `docs/det-5…:119-131`, `heroCases.ts:186`.
- Contêm "equivalente ao TI-RADS Z ACR", categorias 4a/4b/4c (não existem no ACR) e "características" por nota invertidas em relação ao renderer (nota 5 = "provavelmente malignas" no snippet; nota 5 → categoria 2 "provavelmente benignas" no renderer).
- Impacto real depende de quando o writer/RAG é usado para a TIREOIDE (H3).

**C6 ⚠️ (itens 18 e 23.5, média): a integração mobile → Web inverte a hierarquia.**
- `applyCompanionThyroid` (`companionStructured.ts:296-311`) cria o nódulo com `domingosAtivo:true` e só os eixos de Domingos.
- A visão (`vision/client.ts:247-290`, `extractor.ts:8-16`) não extrai nada de ACR.
- Resultado: nódulo importado chega com Domingos ligado e ACR vazio, e o laudo fica bloqueado pela pendência "ACR TI-RADS incompleto" (`tireoideParaCatalogo.ts:209-215`) até o médico refazer o ACR.

**C7 🟡 (item 21, média): a conduta mora dentro da conclusão e não é configurável.**
- Clássico: item numerado na CONCLUSÃO (`TIREOIDE.ts:1117-1124`). Objetivo: seção "Conduta sugerida:" (`1555-1562`).
- O pedido fala em "seção de recomendações ou após a conclusão, respeitando a configuração escolhida pelo médico". Não existe essa opção.
- A Web já tem um bloco "RECOMENDAÇÕES:" manual (`LaudarWebExperience.tsx:773-783`), sem integração nem deduplicação com a conduta ACR. Ele é anexado **depois do rodapé** de créditos Domingos/ACR.

**C8 🟡 (item 21, média): a identificação dos nódulos diverge entre a tela e o laudo.**
- A tela numera globalmente ("Nódulo {index+1}", `TireoideFormPanel.tsx:400`).
- A conduta numera por lobo ("Lobo esquerdo, nódulo 1", `TIREOIDE.ts:1305`).
- Com 2 nódulos em lobos diferentes, o "Nódulo 2" da tela vira "Lobo esquerdo, nódulo 1" no laudo.
- O corpo segue a regra da casa e usa "imagem", mas a linha de conduta usa "nódulo" (inconsistência terminológica).

**C9 🟡 (item 21, média): nódulos abaixo do limiar ou fora do limite de PAAF somem em silêncio.**
- `condutaAcr` devolve `null` para TR1/TR2 e abaixo do limiar.
- `condutasAcrDosNodulos` descarta a 3ª PAAF em diante (`1313-1316`) **sem nenhuma linha substituta**.
- Sonda: TR4 de 0,8 cm não gera linha nenhuma.
- O pedido inclui explicitamente "situações em que não há recomendação rotineira". Decidir se isso aparece (e como) exige revisão médica (§6).

**C10 🟡 (itens 21 e 23.7, média): a regra ACR existe em 4 implementações com redações diferentes.**
- Web `tiRads.ts:121-137` (prévia), API `TIREOIDE.ts:1258-1276` (laudo), mobile `tirads.ts:159-185` (bloco), snippet `recomendacoes-acr-tirads-2017.md` (writer).
- Mais a sanidade, `deterministicSanity/tireoide.ts:18,32`, com um texto de TR3 **errado** ("1–2 anos … 3–5 anos").
- Divergências de cálculo confirmadas: mobile total 1 → TR2 e sem atalho cístico; Web/API → TR1 e atalho. Mobile arredonda o tamanho; Web/API não.

**C11 🟡 (item 20, baixa/média): a responsividade dos cinco grupos depende do viewport, não da largura do card.**
- `TireoideFormPanel.tsx:489` usa `sm:grid-cols-2 xl:grid-cols-5`.
- O teste de navegador (`tireoideForm.browser.manual.ts:55-104`) monta o painel **isolado**, fora do workspace com rail e cards, e só testa 1440 e 390 px.
- Entre 900 e 1279 px o layout fica em 2 colunas, com o 5º grupo (Focos) sozinho na 3ª linha.
- O card já é container (`LaudarWebExperience.tsx:1649`), mas o Tailwind 3.4.17 não tem o plugin de container queries (`tailwind.config.ts:38`).

**C12 🟢 (item 19, baixa): localização — resíduos.**
- O valor vindo do celular é texto livre (`extractor.ts:66`). Se vier "terço médio" sem a preposição, a tela mostra uma opção extra e o renderer escreve "situada terço médio".
- Não há opção para o istmo (ex.: lateralização). Não foi pedido; só registro.

**C13 🟢 (higiene): comentários e constantes legadas enganosas.**
- `eixosDoNodulo.ts:25-31` ("a tela nunca calcula"), cabeçalho `TIREOIDE.ts:1-11` ("TI-RADS … da NOTA"), `TIRADS_VALUES` com 4a/4b/4c exportado e `caracteristicaDaNota` invertida (`organs/tireoide.ts:161-187`).
- Risco de alguém reutilizar.

**C14 🟢 (a11y): os chips dos eixos de Domingos não têm `aria-pressed`** (`TireoideFormPanel.tsx:99-110`). Os grupos ACR usam botões com `aria-pressed` no lugar de semântica de radiogroup/checkbox.

---

## 4. Hipóteses a verificar (não confirmadas)

| # | Hipótese | Como verificar |
|---|---|---|
| H1 | O médico entende o badge TR e a faixa de conduta na tela como "o que vai para o laudo" e assina sem a conduta (consequência de C1) | Teste de uso e conferência de laudos salvos com nódulo TR3+ |
| H2 | Laudos Web atuais com Domingos ativo trazem C3 (corpo e ACR incoerentes) | Consultar `web_reports` (somente leitura) por conclusões com "NOTA FINAL" e "ACR TI-RADS" |
| H3 | Em produção, a TIREOIDE do `/api/generate` passa pelo renderer, não pelo writer/RAG (então C5 só afeta o fallback) | Conferir `RENDERER_CATEGORIES` em produção e se a variante resolvida tem `template_body` |
| H4 | `deterministicSanity` da tireoide mostra os textos de §2.3 ao médico | Rastrear o consumo de `runDeterministicSanity` na UI mobile/Web |
| H5 | No workspace real, entre 1280 e 1359 px, as 5 colunas cabem em menos de ~170 px e os rótulos ("Extensão extratireoidiana · 3") quebram em 3+ linhas | Teste de navegador **dentro** do workspace em 1280/1366/1440 |
| H6 | Em 900–1279 px, o 5º grupo sozinho prejudica a leitura da tabela | Revisão visual com o médico |
| H7 | O iOS/Android ainda inserem o bloco da calculadora mobile no mesmo laudo em que o renderer gera conduta (texto duplicado ou contraditório) | Gerar um laudo mobile com o toggle ligado e a calculadora inserida |
| H8 | `ti_rads_ditado` no mobile às vezes recebe a categoria de Domingos ("TI-RADS 3 de Domingos") | Auditar `auditState.structuredOutput` de laudos mobile com Domingos ditado |

---

## 5. Proposta incremental (Web primeiro)

> Cada passo é pequeno, reversível e testável. Ordem pensada para fechar primeiro o que promete algo falso ao médico.

### P0 — Ligar a preferência de conduta na Web (C1)
1. **API** `apps/api/src/app/api/catalog/[category]/render/route.ts`: aceitar um campo opcional `preferencias` (Zod fechado: `show_domingos_score?`, `show_conduct_recommendation?`). Repassar via `contexto` ou argumento até `laudoPadraoDe` e `m.render`.
2. **API** `modeloNormalRegistry.ts:306-321`: trocar `undefined as any` por `ctx?.preferencias ?? undefined`. Manter a Biblioteca sem preferências, como hoje.
3. **Web** proxy `apps/web/src/app/api/catalog/[category]/render/route.ts`: ler `account_report_preferences.renderer_preferences` da conta (mesma fonte de `ModelosPreferidos`) e anexar. A preferência é da conta; o servidor resolve, nunca o cliente.
4. **Mitigação imediata e independente:** até P0 entrar, trocar o texto de `TireoideFormPanel.tsx:531` para não prometer inclusão.
5. Testes: os de §8 (T1–T3).

### P1 — Separar o "ditado" por escala (C2)
1. Schema `TIREOIDE.ts:100-117` e JSON Schema: `acr_tirads_ditado` (1–5) e `domingos_categoria_ditada` (1–4, se fizer sentido clínico). Manter `ti_rads_ditado` como **legado**, aplicado **só** ao ACR e só quando o ditado mencionar ACR (regra a validar; ver §6 R7).
2. `classificarNodulo` não lê mais o ditado ACR. `caracteristicasDoTirads` volta a aceitar só 1–4 (Domingos).
3. Prompt de extração (`326-337`): exemplos explícitos de "TI-RADS 4" sem menção de escala → ACR; "categoria/TI-RADS de Domingos" → Domingos. Um ditado ambíguo gera pendência, não equivalência.

### P2 — Coerência entre descritores e ACR como protagonista (C3, C4)
1. **Corpo:** com ACR completo, o descritor ACR é a base. Os eixos exclusivos de Domingos (halo; ecogenicidade detalhada só quando acrescentar algo) entram como complemento. Chammas continua fora do texto, como hoje.
2. **Conclusão:** `imagem … — ACR TI-RADS X (risco)` primeiro; Domingos depois, entre parênteses e rotulado ("escala de Domingos: NOTA FINAL N, …"). **Nunca** "equivalente".
3. **Tela:** quando Domingos é ativado, oferecer "usar forma do ACR" (forma é o único eixo com par 1:1 e mesmo rótulo). Margem e calcificação×focos **não** têm par 1:1: mostrar um aviso **não bloqueante** quando os pares divergirem de forma clinicamente incompatível. Os pares precisam de tabela revisada por médico (§6 R6).
4. `tireoideParaCatalogo.ts`: nova `Pendencia` sem `bloqueia` para divergência de descritores, para a tela mostrar e o gate registrar.

### P3 — Onde a conduta entra e como os nódulos são identificados (C7, C8, C9)
1. Preferência da conta `conduct_placement: 'conclusao' | 'recomendacoes'`. O padrão depende de decisão médica (§6 R5).
2. Com `'recomendacoes'`, o renderer devolve a conduta separada (campo estruturado ou seção "RECOMENDAÇÕES"). A Web junta com o bloco manual de `RecommendationsPanel` **sem duplicar** e **antes do rodapé** de créditos.
3. Identificação única e estável: a tela e o laudo usam a mesma referência, por exemplo "Nódulo 2 — lobo esquerdo, terço inferior, 0,8 cm". Gerar a referência no adapter e mandar como `rotulo` (novo campo opcional).
4. Nódulos sem indicação e PAAF acima do limite: o comportamento depende de §6 R3/R4. Opções: omitir (hoje), uma linha agregada ("demais nódulos: sem indicação de PAAF ou seguimento pelo ACR TI-RADS") ou uma linha por nódulo. Implementar como opção depois da decisão médica.

### P4 — Fonte única das regras ACR (C10)
1. Mover a pontuação, a categoria e os limiares para `packages/shared` (função pura que devolve **códigos**, ex.: `{kind:'paaf'|'seguimento'|'sem_indicacao', esquemaAnos:[1,3,5], limiarMm}`), não frases.
2. Web (prévia), API (renderer) e mobile (calculadora) consomem a mesma função. A redação fica em um único mapa por estilo.
3. Conferir a restrição documentada em `eixosDoNodulo.ts` ("`apps/web` não depende de pacote do workspace"). Se ela ainda valer, gerar um espelho com teste de paridade em vez de importar.
4. Corrigir `deterministicSanity/tireoide.ts:18,32,47` para usar a mesma função, ou remover a frase clínica.

### P5 — Layout responsivo dos cinco grupos (C11, C14)
Detalhes em §7.

### P6 — Limpeza de conhecimento e prompts (C5, C13)
- Reescrever `nodulos-com-classificacao.md` e `descritores-de-nodulo.md`: remover "equivalente", 4a/4b/4c e a tabela invertida; declarar o ACR principal e o Domingos opcional, sem conversão.
- `global.ts:198`: trocar "Domingos é padrão, sempre com correlação TI-RADS" por uma regra coerente com o item 18.
- `contracts/TIREOIDE.ts`: alinhar ao renderer (que calcula) ou marcar como exclusivo do fallback.
- Atualizar `docs/det-5-tireoide-domingos.md` §5–§7 com nota de "superado", o exemplo da landing (`heroCases.ts:186`) e os comentários e constantes legadas.

### P7 — Mobile (depois da Web, item 24 prioridade 3)
- Companion e visão: adicionar os campos ACR à visão (apenas o que estiver explícito na tela do aparelho) e **não** ativar Domingos por padrão em `applyCompanionThyroid`.
- Normalizar `location` para os três terços quando houver correspondência inequívoca; manter o original como alternativa.
- Calculadora mobile: consumir a função de P4. Remover os textos "seguimento clínico"/"acompanhamento clínico". Decidir se o bloco "Inserir no laudo" continua quando o renderer já gera conduta.
- Prompts mobile: os mesmos de P1 e P6.

---

## 6. Regras clínicas que exigem fonte oficial ou revisão médica

> Nenhuma destas deve ser implementada ou alterada sem conferir o documento oficial do ACR TI-RADS (white paper de 2017 e eventuais atualizações) e a validação do médico responsável. As de Domingos dependem da publicação original e do material "anteriormente discutido" citado no item 18, que **não está no repositório**.

| # | Regra | Estado no código | O que decidir/conferir |
|---|---|---|---|
| R1 | Pontos por grupo e cortes TR1–TR5 (0 / 2 / 3 / 4–6 / ≥7) | Web e API iguais; mobile difere quando o total é 1 | Confirmar como tratar o total 1 (combinação incompleta/inválida → `null`?) |
| R2 | "Cístico ou quase totalmente cístico" → TR1 **sem somar** os outros grupos | Web e API fazem; mobile não | O documento oficial diz explicitamente "não somar" para **espongiforme**. Para **cístico**, conferir se os outros grupos (ex.: focos) devem pontuar |
| R3 | Limiares de PAAF e seguimento (TR3 25/15 mm; TR4 15/10; TR5 10/5) e agenda (1-3-5 / 1-2-3-5 / anual até 5 anos) | Iguais em Web, API, mobile e snippet; sanidade de TR3 diverge | Confirmar o texto oficial e a redação em português; corrigir `deterministicSanity/tireoide.ts:32` |
| R4 | Limite de PAAF em multinodular (até 2, pelos maiores pontos) e o que dizer dos excedentes | API limita a 2 e omite os excedentes | Confirmar a regra oficial (biópsia de no máximo 2; relato de até 4 nódulos de maior pontuação) e o texto para os excedentes |
| R5 | Onde a conduta entra (conclusão × seção de recomendações) e o padrão da conta | Clássico: conclusão; objetivo: seção | Decisão do médico/produto |
| R6 | Pares Domingos↔ACR para checar coerência (margem, calcificações×focos, forma, ecogenicidade×composição) | Inexistente (correto: sem conversão) | Tabela de **incompatibilidades** (não de equivalências), revisada pelo médico com o material citado no item 18 |
| R7 | Ditado "TI-RADS N" sem escala → qual sistema | Hoje vale para as duas escalas | Regra de desambiguação; preferência: pedir confirmação |
| R8 | Tabela de Domingos (pontos, categoria 1–4, "características", dimensão pela maior medida) | `TIREOIDE.ts` e `docs/det-5…:9-81`; decisão C/D/E de 2026-06-13 | Reconfirmar com a publicação original; a nota dex2 sobre superpontuação em nódulo alongado continua aberta (`docs/det-5…:221-224`) |
| R9 | Valores "indeterminados" (composição ou ecogenicidade impossível de avaliar por calcificação) | Ausentes | O documento oficial tem regras para isso; conferir e decidir se entra na UI |
| R10 | Nódulo sem medida: hoje bloqueia o laudo; sem maior dimensão, não há conduta | `tireoideParaCatalogo.ts:201-208` | Confirmar se TR1/TR2 sem medida deve bloquear |
| R11 | Achados que mudam a conduta além de categoria e tamanho (extensão extratireoidiana, linfonodos suspeitos, crescimento entre exames) | Não modelado | Definir se a recomendação automática se cala, alerta ou remete à correlação clínica |
| R12 | Bócio > 25 mL e "< 5 mm raramente TR4/TR5" na sanidade | `deterministicSanity/tireoide.ts:45-62` | Fonte, ou remover |
| R13 | Texto de risco por categoria ("levemente" × "minimamente suspeito") | Web/API: "levemente"; mobile: "minimamente" | Escolher uma tradução de "mildly suspicious" e usá-la em todo lugar |
| R14 | Frases das tireoidites (corpo, conclusão, recomendação laboratorial) | Marcadas no código como pendentes de aprovação | Fora do escopo 18–21, mas na mesma tela |

---

## 7. UI responsiva dos cinco grupos (proposta para a Web)

**Objetivo:** ler como a tabela ACR (cinco colunas lado a lado) quando houver espaço e degradar sem rolagem horizontal.

1. **Quebrar pela largura do card, não pelo viewport.** Opções:
   - (a) adicionar `@tailwindcss/container-queries` (Tailwind 3.4) e usar `@[56rem]:grid-cols-5 @[36rem]:grid-cols-3`;
   - (b) CSS local no `<style>` do workspace, que já define `.workspace-section-card` como container (`LaudarWebExperience.tsx:1647-1651`). Exemplo:

   ```css
   @container organ-card (min-width: 56rem) { .acr-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
   @container organ-card (min-width: 36rem) and (max-width: 55.99rem) { .acr-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .acr-grid > .acr-focos { grid-column: span 2; } }
   ```

   A opção (b) não adiciona dependência. Os cortes (56rem/36rem) devem ser medidos no workspace real.
2. **Larguras intermediárias:** 3 + 2 (Composição, Ecogenicidade, Forma; depois Margens e Focos, com Focos mais largo por ser multisseleção) em vez de 2+2+1.
3. **Celular (< 36rem de card):** uma coluna. Cada grupo vira um bloco com cabeçalho "Composição · 2 pts — Sólido" e as opções abaixo (alvo ≥ 44 px, como hoje). Não usar rolagem horizontal.
4. **Cabeçalho de cada coluna com a pontuação escolhida** (ex.: "Margens · 2"). O total já fica no badge e, perto da tabela, se lê como a soma das colunas.
5. **Cores das categorias:**
   - Manter TR1 verde, TR2 amarelo-claro, TR3 amarelo-escuro/âmbar, TR4 laranja, TR5 vermelho.
   - Mover para tokens (ex.: `--tirads-1…5-bg/fg/border`, com variantes dark) usados pelo badge, pela faixa de conduta e por uma **legenda compacta opcional** (TR1…TR5) logo abaixo da grade.
   - Conferir contraste AA, em especial texto amarelo sobre fundo amarelo-50 e as variantes `*-950/30` no dark.
   - O texto da categoria continua sempre visível; a cor nunca é o único sinal.
   - Não usar cor nas opções individuais: os pontos são o sinal, e a cor fica para o resultado.
6. **Semântica:** grupos de escolha única como `role="radiogroup"` com `aria-checked`; Focos como checkboxes. `aria-pressed` nos chips de Domingos (C14). Manter "clicar de novo desmarca", anunciado pelo leitor de tela.
7. **Estado TR1 por composição:** manter os grupos desabilitados com a explicação já existente (`TireoideFormPanel.tsx:474-476`). Na grade de 5 colunas, considerar recolher as 4 colunas inativas para economizar altura.
8. **Domingos (complementar):** manter recolhido e abaixo do ACR. Quando aberto em card largo, 3 colunas (já é `xl:grid-cols-3`, também por viewport; aplicar a mesma regra de container).

---

## 8. Testes recomendados

**Web (unitários, `apps/web/tests`, via `run-unit.cjs`)**
- T1 — proxy de render: com a conta `show_conduct_recommendation:true`, o corpo enviado à API carrega as preferências. Com `false` ou ausente, não carrega e não inventa.
- T2 — `adaptarTireoide`: Domingos inativo → eixos `null` (já existe). Descritores Domingos×ACR divergentes → pendência **não bloqueante** (P2). Rótulo de identificação estável por nódulo (P3).
- T3 — `applyCompanionThyroid`: nódulo importado **não** liga Domingos por padrão (P7). Localização "terço médio" é normalizada para "no terço médio".
- T4 — paridade ACR: uma tabela-ouro única (todas as combinações válidas dos 5 grupos × tamanhos nos limites 4,9/5,0/9,9/10,0/14,9/15,0/24,9/25,0 mm) roda contra a Web (`tiRads.ts`), a API (`calcAcrTirads` + `condutaAcr`) e o mobile (`tirads.ts`). Exige o mesmo código de saída (P4).

**API (`apps/api/src/server/renderer/__tests__`)**
- T5 — rota `/api/catalog/TIREOIDE/render` com `preferencias.show_conduct_recommendation:true` → o laudo contém a conduta. Sem o campo → não contém. Isso fecha a lacuna de C1, que hoje nenhum teste cobre.
- T6 — `ti_rads_ditado`/`acr_tirads_ditado` não alteram as "características" de Domingos. Domingos ditado não altera a categoria ACR (P1).
- T7 — corpo × conclusão: com ACR TR4/TR5, o corpo contém o critério ACR que pontuou (margem, focos, forma). Nenhum laudo contém "equivalente" nem "4a/4b/4c" (snapshot negativo em todos os estilos).
- T8 — ordem: com Domingos ativo, "ACR TI-RADS" aparece antes de "NOTA FINAL" no item do lobo (P2).
- T9 — multinodular: identificação igual à da tela. Excedentes de PAAF e nódulos sem indicação seguem a decisão R4/R5 (P3).
- T10 — `deterministicSanity`: o texto de TR3 coincide com a função única (P4).

**Navegador (`tireoideForm.browser.manual.ts`, ampliado)**
- T11 — montar **dentro do workspace real** (rail + grade de cards), não isolado. Viewports 390, 768, 900, 1024, 1280, 1366, 1440 e 1920. Checar: sem rolagem horizontal; 5 colunas só quando a largura do card permitir; 3+2 no intermediário; alvos ≥ 44 px no mobile; nenhum rótulo cortado.
- T12 — modo escuro e contraste das cinco cores (axe ou cálculo de contraste).
- T13 — teclado e leitor de tela: navegação por grupo, seleção e desmarcação, anúncio do badge (`role="status"`).
- T14 — fluxo ponta a ponta: preencher o ACR, ligar a preferência e gerar o laudo; a conduta aparece no lugar configurado e uma única vez, junto com uma recomendação manual.

**Prompts e conhecimento**
- T15 — busca estática (CI) que falha se `packages/knowledge/snippets/TIREOIDE/**`, `prompts/**` ou `landing/**` contiverem `equivalente ao TI-RADS` ou `TI-RADS 4[abc]`.

**Gates do projeto antes de concluir cada passo:** `npm run lint`, `npm run typecheck` e `npm test` (Web e API), e a atualização da story correspondente em `docs/stories/` (Story-Driven Development).

---

## 9. Riscos para mobile e API

| Risco | Origem | Mitigação |
|---|---|---|
| Mudar o schema do nódulo (P1, P3) quebra clientes iOS/Android antigos que mandam `ti_rads_ditado` | `TIREOIDE.ts:100-117`, JSON Schema strict (OpenAI) | Campos novos opcionais; `ti_rads_ditado` aceito como legado; versionar o JSON Schema; o teste de contrato `catalog-api/contrato.manual.ts` deve cobrir |
| JSON Schema strict exige todos os campos como `required` e nullable: um campo novo esquecido em `NODULO_JSON` derruba a extração | `TIREOIDE.ts:180-226` | Teste que compara as chaves do Zod com as do JSON Schema |
| Preferência resolvida em lugares diferentes (`/api/generate` resolve na API; a Web resolveria no proxy) pode divergir | `pipeline/renderer.ts:789` × proxy Web | Uma função de resolução compartilhada, ou a API do catálogo resolvendo pela conta quando recebe a identidade |
| A rota do catálogo usa autenticação de serviço (`autorizarServico`), sem usuário. Aceitar preferências no corpo deixa o serviço decidir o conteúdo | `render/route.ts` | Aceitar só o subconjunto validado; o proxy Web é o único chamador autenticado |
| Mudar a ordem e a redação da conclusão (P2) altera laudos ouro e o histórico de comparação | `tests/golden-*`, testes manuais | Atualizar os goldens no mesmo PR, com diff revisado pelo médico |
| Duplicação de conduta no mobile (bloco da calculadora + renderer) | `TIRADSCalculatorSheet.tsx:148-154` | Desativar "Inserir no laudo" quando a preferência de conduta estiver ligada, ou deduplicar |
| A visão passa a extrair ACR (P7) e preenche grupos que o médico não viu | `vision/client.ts` | Só o que estiver explícito na tela do aparelho; sempre "a revisar"; nunca completar os 5 grupos sozinha |
| Snippets alterados afetam o RAG de outras categorias que compartilham tags (`tirads`, `domingos`) | `packages/knowledge` | Rodar a busca de RAG antes e depois; publicar snippets versionados |
| `web_reports.exam_state` não é reidratado hoje (`organs/tireoide.ts:267-274`). Se passar a ser, os estados legados (sem `domingosAtivo`) e os novos campos precisam de migração | Web | Manter `estadoLegadoDomingos` e testar a reidratação quando ela existir |
| Mudança de comportamento clínico sem fonte (R1–R14) | Todos | Gate de revisão médica por regra, registrada na story |

---

## 10. Fora de escopo desta auditoria

- BI-RADS (item 22) e as Partes 1–3 do anexo.
- Execução do teste de navegador, lint e typecheck.
- Consulta a dados de produção (H2, H3, H4, H8) e às variáveis de ambiente de produção.
- Pesquisa nas fontes oficiais ACR e Domingos: listada como pré-requisito em §6, não realizada.
- Qualquer edição de código, commit ou navegação no Laudário.
