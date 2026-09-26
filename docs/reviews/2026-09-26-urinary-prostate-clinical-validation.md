# Validação clínica — próstata transabdominal e bexiga compartilhada — 26/09/2026

Frente: Clínica (Opus 5.5). Ownership confirmado pelo root nos paths abaixo. Baseline: checkout `d1f0b76` (branch `feat/clinical-composition-category-groups`), com mudanças simultâneas de outras frentes no worktree (picker, compositor de Sol, `LaudarWebExperience` de Atlas), não revisadas aqui. **Sem commit, push, deploy nem acesso a banco.** Isto é validação técnica de fluxo e redação proposta, **não validação clínica por médico**.

Fontes: `docs/reviews/2026-09-26-clinical-evidence.md` (Brisa) e `docs/reviews/2026-09-24-ultrasound-sources.md`. Nenhuma frase de concorrente foi copiada; as imagens 8018–8026 serviram só como inventário de lacunas.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `apps/web/src/lib/deterministic/organs/prostataSuprapubica.ts` | `lerMedidaProstataCm` (parser estrito), `prostataInputIssues`, vesículas seminais com 3 estados e `lerVesiculasSeminais` |
| `apps/web/src/lib/catalog/prostataParaCatalogo.ts` | usa o parser estrito; pendências bloqueantes de próstata e vesículas; medidas só completas; campos vesicais legados espelham o estado compartilhado; `vesiculas_seminais` só quando ≠ normal |
| `apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts` | guarda de medida (≤0/NaN/∞ não impressos nem calculados); `vesiculas_seminais` `.nullable().optional()`; frases de vesículas |
| `apps/web/src/lib/deterministic/organs/urinaryShared.ts` | lesão focal: subcampos `forma` e `calcificacao`; opção inválida de forma/calcificação/Doppler (lesão e coágulo) bloqueia |
| `apps/api/src/server/renderer/categories/sharedUrinary.ts` | `forma` `.nullable().optional()` e `calcificacao` opcional no achado; frase da lesão focal |
| `apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts` | extração por ditado: `bexiga_lesao_focal` (Zod, JSON strict, prompt) e render no caminho legado |
| `apps/api/src/server/renderer/catalog/__tests__/prostata-medidas-estritas.manual.ts` | novo, 39 verificações |
| `apps/api/src/server/renderer/catalog/__tests__/bexiga-lesao-focal-descritiva.manual.ts` | novo, 11 verificações |
| `apps/api/src/server/renderer/__tests__/contrato-extracao-urinaria.manual.ts` | novo, 19 verificações (contrato do ditado) |

Nada foi renomeado ou removido do contrato. Atlas foi avisado antes da edição dos arquivos compartilhados da bexiga, com pedido de repasse a Sol.

## Lacunas reproduzidas antes da correção (caminho real: seleção → adapter → `renderizarSelecao`)

| Entrada na próstata | Antes |
|---|---|
| `d1: "5abc"`, `"5 ml"`, `"5 x 4"` | aceitas como 5 cm, sem pendência |
| `d1: "-5"` | sumia; laudo com `____ cm`, sem pendência |
| 2 de 3 medidas | as duas digitadas sumiam em silêncio |
| IPP `"1,2abc"` (volume aumentado) | aceito, laudo com "Grau 3" |
| `volume: "gigante"` | virava "dimensões normais" |
| `extra: ["nodulo"]` | descartado em silêncio |
| Vesículas seminais | sempre "normais", mesmo sem avaliação possível |
| Lesão/coágulo vesical com Doppler desconhecido | caía silenciosamente em "sem avaliação Doppler informada" |

## Melhorias entregues

1. **Medidas estritas da próstata (fluxo inteiro).** D1, D2, D3 e IPP: campo inteiro, número positivo, sufixo `cm`/`mm` opcional (mm → cm). Lixo, negativo, zero, múltiplas dimensões, unidade alheia, NaN ou objeto → pendência bloqueante, e o valor não entra no contrato. A prévia web usa o mesmo parser.
2. **Medida parcial e opção desconhecida bloqueiam.** 1–2 de 3 medidas, `volume` fora de `normal/aumentada` e `extra` desconhecido ou não-lista viram pendência. O IPP oculto (volume normal) é ignorado sem bloquear. Todas vazias mantêm o placeholder histórico `____ cm` (compatibilidade; limite abaixo).
3. **Guarda no renderer da API** (atende qualquer consumidor): dimensão ≤ 0, NaN ou ∞ não é impressa nem calcula peso; IPP negativo/NaN é omitido.
4. **Vesículas seminais.** Estados: *Normais* (padrão e legado), *Não caracterizadas adequadamente* (lado: ambas/direita/esquerda) e *Alteração observada* (lado + descrição obrigatória, com a redação do médico). "Não caracterizadas" registra um fato do exame e não afirma normalidade do lado afetado. O lado oposto continua descrito como normal, e o estilo Objetivo omite da impressão só a frase normal.
5. **Lesão vesical focal descritiva.** Forma (*polipoide* / *séssil*), vascularização (Doppler já existente: com/sem fluxo/não avaliado) e calcificação. A conclusão permanece "de natureza indeterminada ao método", sem histologia (o teste recusa neoplasia/carcinoma/tumor/papiloma/benigno/maligno/urotelial).

### Base clínica e o que é decisão editorial

| Item | Evidência | Decisão editorial |
|---|---|---|
| Vesículas no escopo do US de próstata | AIUM 2025 (tamanho, forma, posição, simetria, ecogenicidade, cistos); CBR 2025 (planos das vesículas nas vias suprapúbica e transretal) | Registrar "não caracterizadas" é **segurança editorial**: nenhuma fonte lida diz como documentar estrutura não visualizada na próstata. A analogia é com o CBR (pelve), que manda explicitar dificuldades técnicas no corpo do laudo. Não é recomendação AIUM. |
| Lesão focal com medida, topografia e Doppler | AIUM/AUA urologia (documentar área anormal, medir, Doppler para diferenciar) | Rótulos "polipoide/séssil" e "calcificação de permeio" são descritores morfológicos, sem inferência histológica |
| Volume ×0,52 | AIUM 2025 (literal) | Código usa 0,5233 (π/6), coerente |
| Peso = volume × 1,05 | **Sem fonte primária lida** | Convenção histórica mantida e documentada |

## Compatibilidade

- **Byte a byte contra HEAD (após ditado e correções da QA):** 220.500 comparações de bexiga compartilhada, Próstata (com e sem bexiga compartilhada, com e sem `bexiga_achado`) e Vias (legado e compartilhado), Clássico e Objetivo, com os campos novos ausentes e `null`: **0 diferenças não intencionais**. As 18.000 diferenças restantes são todas o caso R2 (IPP 0 com próstata aumentada), intencional.
- **Payload antigo:** bexiga legada pura (`achados`/`residuo`) e estado sem as chaves `volume`/`extra` são aceitos. O achado `lesao_focal` sem `forma`/`calcificacao` é aceito pelo schema e sai com a frase anterior.
- **Payload normal inalterado:** o adapter só envia `vesiculas_seminais` quando o estado ≠ normal. `forma`/`calcificacao` existem só no achado `lesao_focal`.
- **Regressão achada pela integração e corrigida:** com `.optional()` puro, o modelo normal da Biblioteca (`achadoNormalDe` desce em `ZodOptional`) materializava `nao_caracterizadas` no laudo padrão e no payload legado. Com `.nullable().optional()`, `achadoNormalDe` devolve `null` e a frase histórica. O teste cobre `laudoPadraoDe` e `renderizarSelecao` (sem campo == `null`). Mutação sem `.nullable()` → o teste falha.
- **Compositor de Sol:** usa `renderSharedBladder` como fonte única e remove linhas exatas; `clinical-composition-v1` (11 grupos) e `route` (5 grupos) passam.

### Extração por ditado (iOS, Android e Web por voz), ampliação aditiva

O ditado passa por `EXTRACTORS` (`apps/api/src/server/renderer/extraction.ts`): JSON Schema strict, depois prompt, depois `parse` Zod, depois o renderer. Antes desta rodada, nenhum dos campos novos chegava por ditado. A ampliação:

| Schema de extração | Campo novo (strict, `type: [object, null]`, required) | Regra do prompt |
|---|---|---|
| `PROSTATA_SUPRAPUBICA_JSON_SCHEMA` | `vesiculas_seminais` {estado `nao_caracterizadas`/`alteradas`, lateralidade, descricao} | null por padrão; preencher só com menção explícita; nunca deduzir pela ausência |
| `PROSTATA_SUPRAPUBICA_JSON_SCHEMA` e `VIAS_URINARIAS_JSON_SCHEMA` | `bexiga_lesao_focal` {topografia, medidas_cm, forma, doppler, calcificacao, descricao} | só lesão focal vesical ditada explicitamente; forma/Doppler/calcificação só se ditados; não repetir no texto livre; nunca histologia |

- **Ausência preserva o legado.** O extrator devolve `null`, e `null` ou chave ausente renderizam exatamente o texto anterior (comparação abaixo). Campos antigos não mudaram de nome, tipo nem obrigatoriedade.
- **Frase única.** `fraseLesaoFocalVesical` (em `sharedUrinary.ts`) serve a bexiga compartilhada e o ditado. No ditado, topografia e medida podem faltar, e a frase usa só o que foi dito.
- **Sem contradição.** Lesão ditada suprime "Bexiga de forma… regulares"/"Bexiga ecograficamente normal" e não passa por "a correlacionar com obstrução infravesical", frase que hoje vale para `bexiga_achado` livre e continua lá. Com repleção insuficiente, os dois fatos são descritos.
- **Autoridade.** Com `bexiga_detalhada` presente (Web), `bexiga_lesao_focal` é ignorada.
- **Dado faltante no ditado não derruba o renderer.** Uma exceção no `parse` do ditado cai no `catch` de `apps/api/src/app/api/generate/route.ts` (warning `RENDERER_FALLBACK`) e o laudo inteiro vai para o writer genérico. Isso seria perda nova, porque esses ditados eram determinísticos (QA 26/09, B5). Por isso: `medidas_cm` `[]`, ou com valor ≤ 0/não finito, vira `null` (tudo ou nada; o laudo omite a medida e, se o modelo mandou medidas inválidas, marca `[REVISAR: medida ditada inválida]`); string vazia vira `null`; vesícula `alteradas` sem descrição sai como **descrição factual incompleta** com `[REVISAR: descrever a alteração …]` no corpo e "a descrever" na conclusão, sem afirmar normalidade. Continuam recusadas pelo `parse` só violações que o JSON strict já impede (enum desconhecido, booleano nulo). A Web continua bloqueando a vesícula sem descrição no adapter, antes da API.
- **Limite:** sem chamada real ao LLM nesta frente (sem acesso remoto). O teste simula a saída strict. A aderência do modelo às regras do prompt precisa de ditados reais/benchmark antes de afirmar qualidade de extração.

### Consumidores: o que reconhece os campos novos

| Consumidor | Reconhece? |
|---|---|
| Web estruturada (adapter → `/api/catalog/.../render`) | Sim: produz e renderiza vesículas e lesão (forma/calcificação) |
| Ditado Próstata/Vias (iOS, Android, Web por voz via `/api/generate`) | Sim: vesículas (Próstata) e lesão focal (Próstata e Vias) pelo JSON Schema ampliado |
| Ditado Abdome total e Pelve feminina | **Não.** Esses schemas de extração não têm bexiga estruturada nem foram alterados (fora do ownership); lesão vesical ditada segue no texto livre do extrator. |
| Apps iOS (`laudousg-swift`) e Android (`apps/mobile`) | Consomem só o texto gerado pela API; não leem campos estruturados (busca sem ocorrências). O ganho chega a eles pelo ditado, sem mudança de app. |
| Renderer da API / composição | Aceita e renderiza; ausente/`null` = texto histórico |
| Sala do Auxiliar / exportação | Não validado nesta frente (root) |

## Correções da QA adversarial (Opus reviewer, `docs/reviews/2026-09-26-prostata-urinario-qa.md`)

| Achado | Correção | Prova |
|---|---|---|
| B1 quebra de linha na descrição das vesículas injetava cabeçalho `CONCLUSÃO:` nos achados | texto livre vira linha única na Web (`lerVesiculasSeminais`), no Zod do ditado (`textoDitadoOpcional`) e no renderer (`linhaUnica`) | Web, API direta e ditado: 1 só cabeçalho de conclusão/impressão |
| B2 mesma injeção em descrição/topografia da lesão focal e do coágulo (pré-existente) | `finding()` na Web e renderer (`fraseLesaoFocalVesical`, coágulo) colapsam espaços | Vias e Próstata, Clássico e Objetivo, e payload cru na API |
| B3 medida positiva que arredonda para `0,0` (ex.: `0,4 mm`) | piso de exibição 0,05 cm no parser Web e no renderer (`MENOR_MEDIDA_CM`): precisão de exibição, não limiar clínico | `0,4 mm`/`0,04` bloqueiam; API imprime `____ cm` |
| B4 quebra de linha em texto livre **legado** do ditado (`achados_adicionais`, `bexiga_achado`, campos verbatim de Vias: parede/conteúdo vesical, dilatação ureteral, alteração difusa, localização/característica renal) injetava cabeçalho (pré-existente) | `textoEmLinhaUnica` normaliza toda string dos findings na entrada de `renderProstataSuprapubica` e `renderViasUrinarias`, e dentro de `renderSharedBladder`/`renderSharedKidney` (protege também Abdome e Pelve, que usam as funções compartilhadas) | Próstata e Vias, Clássico e Objetivo: 1 cabeçalho de conclusão/impressão; texto sem quebra fica idêntico |
| B5 saídas comuns do extrator (`medidas_cm` `[]`/`[0]`, vesícula alterada sem descrição) derrubavam o parse → writer genérico | ver "Dado faltante no ditado"; medida ditada **descartada** por inválida agora leva `[REVISAR: medida ditada inválida]` (lista vazia = não ditada, sem marcador) | `contrato-extracao-urinaria` 19/19 |
| R2 IPP 0: Web bloqueava ("use número positivo") e API escrevia `0,0 cm (Grau 1)` | mensagem Web corrigida; API omite IPP < 0,05 cm | **Mudança intencional de texto**: payload com `hiperplasia` e `ipp_cm: 0` deixa de imprimir a linha de IPP |

**Não corrigidos (decisão editorial, registrados):** R1, em que `d1 = "45"` (provável digitação de 4,5) é aceito, com volume padrão "normal" e peso 346 g; exige decisão sobre classificação de volume, sem limiar inventado. Cosmético: forma "polipoide" com descrição "imagem polipoide" repete a palavra (texto do médico). Dimensões da bexiga saem sem casa fixa (`1 x 0,8 cm`), diferente da próstata (`4,0`), padrão pré-existente de `sharedUrinary`.

## Gates executados (26/09/2026)

| Gate | Resultado |
|---|---:|
| `prostata-medidas-estritas.manual.ts` (novo) | 39/39 PASS |
| `bexiga-lesao-focal-descritiva.manual.ts` (novo) | 11/11 PASS |
| `contrato-extracao-urinaria.manual.ts` (novo, ditado) | 19/19 PASS |
| `contrato-extracao-morfologico.manual.ts` | PASS |
| Biblioteca: `biblioteca-cobre-as-migradas`, `estilos-da-biblioteca` | PASS, 31 verificações |
| Abdome superior golden / Pelve dedup | 40/40, 5/5 PASS |
| `shared-urinary-organs-ponta-a-ponta.manual.ts` | 25 grupos PASS |
| `prostata-suprapubica.manual.ts` | 27/27 PASS |
| Vias golden clássico / objetivo | 44/44, 36/36 PASS |
| Vias boletins clássico / objetivo | 9 e 8 casos, sem diff nos HTML |
| Pelve golden clássico / objetivo | 60/60, 39/39 PASS |
| Pelve 23C3 matriz | 8/8 PASS |
| Abdome objetivo golden | 21/21 PASS |
| `clinical-composition-v1` / `route` (composição) | 14 / 5 grupos PASS |
| `tsc --noEmit` apps/api | limpo nos arquivos desta frente; 2 erros restantes em `renderer/composition/__tests__/clinical-composition-v1.manual.ts` (frente de Sol, em edição concorrente) |
| `tsc --noEmit` apps/web | limpo nos arquivos desta frente. Os 15 erros restantes estão só em `apps/web/src/lib/composition/` (frente de Sol, em andamento) |

**Falhas pré-existentes**, reproduzidas iguais num worktree limpo em `d1f0b76` e sem relação com esta frente: `abdomen-23a1` e `abdomen-23a2` (`assert.ok(laudo.includes("sem alterações"))`); `sprint16a-ponta-a-ponta` (Vias com estado misto legado/novo e redação antiga `35,0 cm³`, obsoleto frente à regra de autoridade de 24/09).

Artefatos regenerados: `showcase-ig-prostata.manual.ts` regrava `docs/showcase-ig-prostata.html` com drift **obstétrico** que já existe em HEAD. O arquivo foi restaurado com `git checkout` e não faz parte desta entrega. Os boletins de Vias saíram idênticos.

## Riscos e lacunas registrados (não alterados)

- **Escala de IPP (G3).** A casa usa Grau 1 ≤ 0,5 cm, Grau 2 ≤ 1,0, Grau 3 ≤ 1,5 e "protrusão acentuada" > 1,5 cm. A literatura (Chia 2003, via Lee 2015) diz Grau 3 > 10 mm, sem quarta faixa. Na fronteira de 5 mm há divergência entre fontes (≤ 5 em Lee; < 5 em Aganovic), e o artigo original não foi acessado. Como a escala A10 é curadoria do Luiz e falta fonte primária lida, **não foi corrigida**. O risco atual é que uma IPP > 1,5 cm saia com um rótulo que a literatura não define. A escala também foi validada por via transabdominal com bexiga 150–200 mL, e o renderer não registra o volume vesical na medida.
- **IPP só com volume "aumentada".** A IPP é distância independente do volume (Brisa §9.3); hoje é ignorada quando a próstata é marcada normal. Decisão de produto pendente.
- **Classificação de volume por padrão.** "Normal" é o padrão da UI e sai "dimensões normais" mesmo com peso alto; nenhum limiar foi criado, por instrução. Decisão editorial pendente (ex.: opção "não classificar").
- **Placeholder `____ cm`** com todas as medidas vazias foi mantido por compatibilidade com consumidores antigos.
- **Resíduo "elevado" > 100 mL** no caminho legado (sem bexiga compartilhada): nenhum corte universal encontrado (G5). Não alterado.
- **Não implementado por falta de fonte:** tipologia de HPB numerada (Wasserman 2006 inacessível; "tipo 1" não usado); limiar ou média de espessura de parede/detrusor; bexiga neurogênica, cistite enfisematosa e endometriose vesical como opções prontas; categoria transretal (G1, escopo maior).
- **Redação proposta** para vesículas e lesão focal precisa de revisão clínica do Luiz antes de produção.
- **Elastografia e gordura hepática:** fora desta frente. Recomendação mantida: campos agnósticos de aparelho (método, unidade, n, mediana/IQR, qualidade), sem cortes nem recomendação automática.

## Como reproduzir

```bash
cd apps/api
pnpm exec tsx --env-file=../../.env src/server/renderer/catalog/__tests__/prostata-medidas-estritas.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/catalog/__tests__/bexiga-lesao-focal-descritiva.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/contrato-extracao-urinaria.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/catalog/__tests__/shared-urinary-organs-ponta-a-ponta.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/prostata-suprapubica.manual.ts
pnpm exec tsc --noEmit -p .
```
