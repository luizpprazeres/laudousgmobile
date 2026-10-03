# Insumo de síntese — Doppler renal (`DOPPLER_RENAL`)

Data: 03/10/2026. Esta ficha serve de entrada para o terminal de síntese (GPT 6.1 Sol High), conforme `docs/competitor-research/laudario/PIPELINE-ESTUDO-A-IMPLEMENTACAO.md:17-33` e `docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:17-30`. Não é texto de laudo. As estruturas e regras abaixo devem virar redação original no estilo Domingos e passar por revisão médica antes de qualquer ativação.

O texto do concorrente não foi copiado. Do Laudário vêm apenas estrutura, campos e comportamento, todos marcados como **[L]**. O que já é conteúdo clínico do LaudoUSG está marcado como **[U]**, com caminho. Decisões ainda abertas estão marcadas como **[PENDENTE]** e não devem ser completadas por suposição (`PIPELINE-ESTUDO-A-IMPLEMENTACAO.md:33`).

## 0. Fontes revisadas

| Fonte | Uso |
| --- | --- |
| `docs/competitor-research/laudario/cases/doppler-aortorrenal-2026-10-03.md` | estrutura e comportamento do concorrente (três cenários sintéticos, restaurados) |
| `docs/competitor-research/laudario/crosswalk-doppler-aortorrenal-2026-10-03.md` | estado do LaudoUSG, correções já aplicadas, lacunas e contrato mínimo |
| `docs/competitor-research/laudario/plano-formularios-estruturados-web-2026-10-03.md:38-40` | primeira onda do formulário Web e requisitos do contrato renal |
| `docs/competitor-research/laudario/crosswalk-doppler-transplante-renal-2026-10-03.md:7` e `crosswalk-doppler-aorta-iliacas-2026-10-03.md:22-38` | fronteiras com transplante e com o exame de aorta |
| `packages/knowledge/snippets/DOPPLER_RENAL/` (7 arquivos publicados, fora `__rev__`) | critérios e convenções **[U]** |
| `apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts`, `dopplerRenalFewshots.ts`, `apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts` | prompt, exemplos e auditoria atuais **[U]** |

O arquivo `packages/knowledge/snippets/DOPPLER_RENAL/excecao/__rev__/rim-transplantado.md` **não é fonte**: é rascunho de transplante em quarentena.

## 1. Identidade e escopo

- Código: `DOPPLER_RENAL`, sem categoria duplicada. "Doppler Aortorrenal" é o nome no concorrente; o canônico é "Doppler renal" (`fila-e-mapa-canonico-2026-10-03.md:27`).
- Título atual do laudo **[U]**: ultrassonografia com Doppler colorido das artérias renais (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:74`).
- Escopo: **rim nativo**. Ficam fora:
  - **Transplante renal:** categoria própria proposta (`DOPPLER_TRANSPLANTE_RENAL`, `fila-e-mapa-canonico-2026-10-03.md:35`).
  - **Doença morfológica da aorta** (aneurisma, dissecção, trombo): pertence ao exame de aorta e ilíacas. Aqui a aorta entra só como referência hemodinâmica (ver 3.2).
  - **Aparelho urinário com Doppler:** a fronteira ainda não foi decidida (`fila-e-mapa-canonico-2026-10-03.md:16`) **[PENDENTE]**.
- Uso real: 57 laudos no total, nenhum em 90 dias e nenhum assinado, segundo `docs/sprint-24-inventario-2026-09-12.md:48` e `apps/api/src/server/renderer/categories/dopplerRenalFewshots.ts:4-9`. Não há gabarito assinado; os exemplos atuais aguardam validação do Luiz.

## 2. Estado atual a respeitar

- **Clientes:** Web, Android/RN e iOS usam o mesmo código. A Web abre o workspace genérico de writer (`apps/web/src/lib/writerCategories.ts:20`). Não há contrato compartilhado (`packages/shared/src/clinicalModels/contracts.ts:3-9`).
- **API:**
  - O writer dedicado (prompt, exemplos e auditoria com falha fechada) só roda com `DOPPLER_RENAL` em `RENDERER_CATEGORIES` (`apps/api/src/server/pipeline/renderer.ts:437-470`).
  - Esse gate estava vazio em produção em 03/10 (`crosswalk-doppler-aortorrenal-2026-10-03.md:17`). Em produção vale hoje o writer genérico com o bundle RAG validado.
  - O banco tinha 28 blocos validados em 30/09 (`docs/parity/2026-09-30-cross-platform-models-schemes-audit.md:48`). O conteúdo do banco não foi reverificado aqui.
- **Consequência:** as proteções do writer dedicado (normalidade não presumida, ligação medida–lado, bloqueio de estenose sem critério) estão **dormentes**. O caminho ativo segue as instruções dos blocos de conhecimento, que têm as contradições listadas na seção 10.

## 3. Estruturas, campos e estados

Todo campo com estado usa o mesmo conjunto: `não avaliado`, `avaliação parcial`, `avaliado normal`, `alterado`, `limitado`. Esse conjunto vem do crosswalk renal (`crosswalk-doppler-aortorrenal-2026-10-03.md:59`). O padrão é sempre `não avaliado`. **Ausência de valor nunca é normalidade** (`cases/doppler-aortorrenal-2026-10-03.md:77`).

### 3.1 Contexto e técnica

| Campo | Tipo | Observações |
| --- | --- | --- |
| Indicação | opções + texto livre, opcional | **[U]** lista HAS resistente, HAS em jovem ou idoso de início recente, piora de função após IECA/BRA, assimetria renal, sopro abdominal, pré ou pós-revascularização (`packages/knowledge/snippets/DOPPLER_RENAL/modelo/template-padrao.md:67-72`). Só orienta ênfase e nunca gera achado. |
| Qualidade global | adequada / limitada | se limitada, motivo obrigatório |
| Motivo da limitação | gases, biotipo, respiração/apneia, cicatriz, janela precária, outro | **[U]** `excecao/exame-tecnicamente-limitado.md:24-29` |
| Ângulo Doppler e transdutor | constante técnica | **[U]** o texto atual de técnica é neutro quanto ao escopo (`DOPPLER_RENAL.ts:77`). O modelo de conhecimento ainda afirma escopo completo; ver seção 10, item 1 |

### 3.2 Aorta abdominal (referência hemodinâmica)

| Campo | Unidade | Regra |
| --- | --- | --- |
| Estado | — | `não avaliado` por padrão |
| VPS aórtica ao nível das emergências renais | cm/s, inteiro | origem do denominador da RAR |
| Morfologia | — | **fora do escopo** deste contrato. Se ditada, vai como achado adicional sem conclusão própria, ou o médico usa o exame de aorta. Não afirmar calibre ou contornos sem ditado (`DOPPLER_RENAL.ts:86`, auditoria em `dopplerRenalWriterAudit.ts:126-131`) |

**[L]** O concorrente tem um bloco de aorta próprio e, no estado inicial, escreve aorta normal sem medidas (`cases/doppler-aortorrenal-2026-10-03.md:11`, `:57`). Isso **não** deve ser reproduzido.

### 3.3 Artéria renal principal, por lado (direita e esquerda)

| Campo | Unidade ou opções | Regra |
| --- | --- | --- |
| Estado do lado | conjunto padrão | `limitado` exige motivo e segmento |
| Perviedade | pérvia / sem fluxo detectável / não avaliada | **[L]** campo observado (`cases/...:55`). A frase para ausência de fluxo não existe no LaudoUSG **[PENDENTE fonte]** |
| VPS por segmento: ostial ou proximal, terço médio, terço distal | cm/s, inteiro | não inventar segmento não ditado (`DOPPLER_RENAL.ts:87`). Ditado sem segmento fica como "VPS máxima" sem segmento |
| Aliasing ou turbulência | presente / ausente / não referido | **[U]** citado no modelo (`template-padrao.md:29`); sem regra de conclusão |
| Padrão hemodinâmico confirmado pelo médico | normal / estenose significativa / indeterminado | **[L]** no concorrente, a conclusão só mudou após essa seleção (`cases/...:61`). Ver a regra em 5.2 |
| Artéria acessória | não pesquisada / não identificada / identificada | **[U]** limitação conhecida (`exame-tecnicamente-limitado.md:29`). VPS opcional |

### 3.4 Relação aorto-renal (RAR), por lado

- **Derivada:** RAR = maior VPS da artéria renal ÷ VPS aórtica (`template-padrao.md:31`). Só é calculada com as duas medidas presentes. O contrato guarda os dois valores usados e o segmento de origem.
- Se o médico ditar a RAR e as duas VPS existirem, comparar com a derivada. Uma divergência acima da tolerância gera pendência **[PENDENTE: tolerância]**.
- Sem VPS aórtica, não há RAR derivada. A limitação deve ser declarada, porque compromete o critério (`exame-tecnicamente-limitado.md:45`).
- Formato: duas casas, vírgula decimal (`DOPPLER_RENAL.ts:95`).

### 3.5 Hemodinâmica intrarrenal, por lado

| Campo | Unidade | Regra |
| --- | --- | --- |
| IR por polo (superior, médio, inferior) | adimensional, 2 casas | **[U]** três pontos por rim (`template-padrao.md:32`, `regra/medidas-padrao.md:31-33`) |
| IR médio | derivado | só quando houver ao menos um polo; registrar quantos polos entraram |
| IP | adimensional | opcional, sem regra de conclusão |
| Morfologia espectral | normal / tardus-parvus / não avaliada | **[L]** o concorrente tem padrão intrarrenal como critério indireto (`cases/...:55`) |
| Tempo de aceleração | **ms** no contrato | **[U]** o critério de conhecimento está em segundos (`conclusao/estenose-significativa.md:35`). Converter e exibir em uma única unidade **[PENDENTE: unidade de exibição]** |
| Índice de aceleração | **[PENDENTE: unidade e regra]** | **[L]** campo observado; sem conteúdo no LaudoUSG |
| Relação renal/segmentar | **[PENDENTE]** | **[L]** campo observado; sem conteúdo no LaudoUSG |

### 3.6 Rins, por lado (modo B, apoio)

- Comprimento bipolar em cm. Os três eixos são opcionais (`regra/medidas-padrao.md:35-36`).
- **Diferença entre os rins:** derivada como diferença absoluta dos comprimentos bipolares, em cm. O conhecimento chama isso de "diferença interpolar" (`template-padrao.md:49`) **[PENDENTE: confirmar que é diferença de comprimento bipolar]**.
- Diferenciação corticomedular e ecogenicidade: opcionais, de apoio para IR elevado (`regra/nefroesclerose-doenca-microvascular.md:27-29`). Não geram diagnóstico.

### 3.7 Veias renais, achados especiais, comparativos e adicionais

**[L]** O concorrente tem esses blocos (`cases/...:55`), mas a rodada não testou o conteúdo. O LaudoUSG não tem conhecimento sobre eles. **[PENDENTE fonte e decisão]** sobre incluir ou não na v1.

### 3.8 Recomendações

São um bloco separado, com publicação sujeita à confirmação do médico. **[L]** No concorrente, as sugestões não entraram no texto com a inclusão desligada (`cases/...:65`). **[U]** A regra atual exige contexto de investigação ou intervenção (`conclusao/estenose-significativa.md:29-30`, `DOPPLER_RENAL.ts:104`).

## 4. Medidas, unidades e faixas plausíveis

| Medida | Unidade | Formato | Faixa plausível já usada no código |
| --- | --- | --- | --- |
| VPS (aorta e renal) | cm/s | inteiro | renal 10–600 (`apps/api/src/server/pipeline/deterministicSanity/extractor.ts:788`) |
| RAR | — | 2 casas, vírgula | 0,5–10 (`extractor.ts:779`) |
| IR | — | 2 casas, vírgula | 0–2 (`extractor.ts:796`) |
| Tempo de aceleração | ms | inteiro | **[PENDENTE]** |
| Rim (bipolar, eixos), diferença | cm | 1 casa | **[PENDENTE]** |

Valores fora da faixa geram pendência, não são descartados em silêncio. Unidade dita diferente da do contrato (por exemplo, TA em segundos) deve ser convertida com registro da origem.

## 5. Dependências e derivações determinísticas

### 5.1 Critérios adotados pelo LaudoUSG

**[U]** Protocolo JVB 2005, `template-padrao.md:42-61`:

| Situação | Critério |
| --- | --- |
| Normal | VPS renal até 180 cm/s; RAR < 3,2; IR entre 0,55 e 0,70; sem tardus-parvus; diferença entre rins < 1,5 cm |
| Limítrofe | VPS renal entre 180 e 250 cm/s; não diagnostica sozinha |
| Estenose hemodinamicamente significativa | VPS renal > 250 cm/s **ou** RAR > 3,2 (critérios independentes) |
| Adjunto | IR < 0,55 distal ou TA prolongado indicam tardus-parvus, que sugere estenose proximal e não é critério isolado |
| Adjunto | IR ≥ 0,80 bilateral indica achado parenquimatoso inespecífico, não estenose |

O texto do laudo **não exibe** percentual de estenose (`DOPPLER_RENAL.ts:99`; a auditoria bloqueia em `dopplerRenalWriterAudit.ts:215`).

### 5.2 Regra de publicação de diagnóstico

1. **Medida não muda conclusão sozinha.** Uma medida que atinge critério cria pendência visível; o diagnóstico só é publicado com o padrão confirmado pelo médico. **[L]** foi o comportamento útil observado (`cases/...:61-63`). Isso endurece a regra atual, que publica com critério numérico ou com afirmação ditada (`DOPPLER_RENAL.ts:98`) **[PENDENTE: decisão do Luiz]**.
2. **Tardus-parvus é achado espectral, com lado e território.** Sozinho, sem critério direto ipsilateral, não vira estenose significativa: no máximo achado sugestivo (`DOPPLER_RENAL.ts:98-100`). **[L]** O concorrente faz o contrário e **não deve ser reproduzido** (`cases/...:69-71`).
3. **Normalidade bilateral** exige os dois lados `avaliado normal`. A normalidade do IR exige IR informado e dentro da faixa nos dois lados (`DOPPLER_RENAL.ts:103`).
4. **Lado limitado ou não avaliado:** some do texto normal, e a conclusão restringe a normalidade às estruturas avaliadas. **[L]** útil (`cases/...:75-77`).
5. **Medida ligada a lado e parâmetro.** Troca entre direita e esquerda, ou entre VPS, RAR e IR, bloqueia a publicação (`dopplerRenalWriterAudit.ts:242-247`).
6. **Medida incompatível com o estado escolhido** (por exemplo, VPS > 250 com padrão "normal") gera pendência e não pode conviver em silêncio com uma conclusão normal.
7. **Remoção de achado:** apagar uma medida ou um achado recompõe corpo, conclusão, derivados e recomendações. Nada pode permanecer.

## 6. Achados para o corpo e correspondência na conclusão

As linhas descrevem **conteúdo exigido**, não redação. Convenções **[U]**: o corpo vem sob "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", em ordem fixa (aorta, artéria direita, artéria esquerda, RAR, intrarrenal, rins; `regra/medidas-padrao.md:18-36`). A conclusão lista só achados relevantes; item normal não vira item; a numeração só aparece com dois ou mais itens (`DOPPLER_RENAL.ts:102`, `template-padrao.md:36`).

| # | Achado (gatilho no contrato) | Corpo deve conter | Conclusão deve conter | Condição de publicação |
| --- | --- | --- | --- | --- |
| A1 | Exame completo normal bilateral | valores medidos por lado, só os medidos | ausência de estenose significativa bilateral; IR normal só se medido nos dois lados | dois lados `avaliado normal` |
| A2 | Normal de um lado; outro não avaliado ou limitado | valores do lado avaliado; limitação do outro com motivo | normalidade restrita ao lado avaliado + limitação | motivo obrigatório |
| A3 | VPS limítrofe (180–250), RAR < 3,2 | VPS e segmento; achado descrito como limítrofe | sem estenose significativa pelos critérios adotados, mencionando a faixa limítrofe, ou nenhum item **[PENDENTE: escolha do Luiz]** (`conclusao/exame-normal.md:37`) | não usar "estenose" como diagnóstico |
| A4 | Estenose por VPS > 250 | VPS, segmento e lado; RAR se houver | estenose hemodinamicamente significativa no lado, com os critérios **efetivamente disponíveis** | confirmação médica (5.2-1). Hoje as frases exigem VPS **e** RAR (`conclusao/estenose-significativa.md:21`); a síntese precisa de uma variante com um critério só |
| A5 | Estenose por RAR > 3,2, sem VPS > 250 | RAR com os valores de origem | idem A4, citando a RAR | RAR derivada ou ditada coerente |
| A6 | Estenose bilateral | por lado | item bilateral com valores por lado (`estenose-significativa.md:24`) | confirmação dos dois lados |
| A7 | Tardus-parvus com critério direto ipsilateral | morfologia, IR e TA se houver | complemento do item de estenose do mesmo lado | — |
| A8 | Tardus-parvus isolado | morfologia, lado, IR e TA se houver | achado sugestivo de lesão proximal, sem significância hemodinâmica | nunca vira A4 sem critério direto |
| A9 | IR < 0,55 sem morfologia descrita | IR por lado | **[PENDENTE]**: o conhecimento trata IR < 0,55 como tardus-parvus (`template-padrao.md:60`), mas falta regra quando a morfologia não foi descrita | — |
| A10 | IR ≥ 0,80 bilateral | IR por lado | IR bilateralmente elevado, achado parenquimatoso inespecífico, sem etiologia específica (`regra/nefroesclerose-doenca-microvascular.md:16-20`, `:40`) | só bilateral |
| A11 | IR elevado unilateral | IR do lado | **sem regra** (`nefroesclerose...md:42`) **[PENDENTE]** | não aplicar A10 |
| A12 | IR entre 0,71 e 0,79 | IR | **[PENDENTE]**: fora da faixa normal e abaixo do limiar de A10; hoje a auditoria só impede chamá-lo de normal (`dopplerRenalWriterAudit.ts:153`) | não declarar normal |
| A13 | Diferença entre rins ≥ 1,5 cm | dimensões e diferença | assimetria renal **[PENDENTE: redação e se exige item]** (`template-padrao.md:49`, `conclusao/exame-normal.md:35`) | dimensões dos dois rins |
| A14 | Artéria renal sem fluxo detectável | perviedade por lado | **[PENDENTE fonte]**: o LaudoUSG não tem regra de oclusão renal | confirmação médica |
| A15 | Artéria acessória identificada / não pesquisada | presença e lado; VPS se medida | não pesquisada sob suspeita clínica forte vira limitação (`exame-tecnicamente-limitado.md:29`, `:46`) | — |
| A16 | Limitação técnica por segmento ou global | motivo e segmentos não caracterizados | limitação com o escopo efetivamente avaliado (`exame-tecnicamente-limitado.md:35`) | não estender a limitação a segmentos avaliados (`:53`) |
| A17 | Sem VPS aórtica | — | limitação do cálculo da RAR | quando a RAR seria necessária |
| A18 | Pós-revascularização (stent) | **[PENDENTE fonte]**: a indicação existe (`template-padrao.md:72`), mas não há critérios | — | — |
| R1 | Recomendação de método complementar | — | item separado | só com contexto clínico e confirmação (`estenose-significativa.md:29`) |

## 7. Dados mínimos antes de publicar

- **Normal bilateral:** VPS renal dos dois lados e declaração médica de normalidade; IR nos dois lados para afirmar IR normal.
- **Estenose significativa:** lado, VPS > 250 (com segmento, se dito) ou RAR > 3,2 com as duas VPS de origem, mais confirmação médica.
- **Tardus-parvus:** lado e morfologia; IR ou TA quando houver.
- **IR elevado bilateral:** IR dos dois lados.
- **Limitação:** motivo e segmento.
- **Recomendação:** contexto clínico e confirmação.

## 8. Roteiro para o prompt mobile (ditado)

- O médico dita de forma **compacta**, só o que mediu (`DOPPLER_RENAL.ts:7-8`). O prompt converte o ditado no contrato da seção 3 e não escreve texto livre.
- Segmento não dito fica sem segmento. Lado não dito fica ambíguo, e a ambiguidade gera pergunta ou pendência, nunca suposição.
- Expressões como "sem estenose" ou "normal" preenchem estado só para o que foi citado.
- "Relação renal-aorta" é a mesma RAR. "Aorta" perto de RAR não é lateralidade (`dopplerRenalWriterAudit.ts:94-95`).
- Fora do escopo: enxerto, anastomose ou fossa ilíaca indicam transplante (outra categoria). Aneurisma ou dissecção de aorta indicam o exame de aorta.
- **Glossário de transcrição atual** **[U]**: `apps/api/src/server/asr/medicalGlossary.ts:158-167`. A síntese pode propor termos para tempo e índice de aceleração e artéria acessória.
- **Exemplos sintéticos para o prompt** (originais; não reutilizar os ditados reais dos exemplos atuais):
  1. "Aorta 80. Renal direita 110 no óstio, esquerda 105. IR 0,63 à direita e 0,61 à esquerda. Sem estenose." → normal bilateral; RAR derivada 1,38 e 1,31.
  2. "Renal esquerda 290 no terço proximal; aorta 90; tardus-parvus intrarrenal à esquerda, IR 0,50. Direita 100, IR 0,64. Estenose significativa à esquerda." → A4 + A7, RAR derivada 3,22.
  3. "Renal direita 120, IR 0,62. Esquerda não caracterizada por gases." → A2 + A16, sem RAR (A17).
  4. "Tardus-parvus à direita, IR 0,52. Renal direita 160, aorta 85." → A8, sem estenose significativa.
  5. "IR 0,84 à direita e 0,86 à esquerda, rins de 9,0 e 9,2 cm." → A10.

## 9. Formulário Web

- Uma coluna por lado, mais aorta e contexto. Cada estrutura começa em `não avaliado`. Não há preset de normalidade global silencioso; um botão de "normal" só preenche estruturas que o médico marcar como avaliadas.
- Campos numéricos com unidade fixa visível. Derivados (RAR, IR médio, diferença entre rins) são somente leitura e mostram a origem.
- Ao atingir um critério, aparece uma pendência com confirmação explícita. A conclusão só muda após a confirmação (5.2-1).
- Tardus-parvus é uma opção da morfologia espectral por lado, sem efeito diagnóstico isolado.
- Recomendações ficam num bloco separado, desligado por padrão.
- Desfazer recompõe tudo (5.2-7).
- **Paridade:** Web e mobile gravam o mesmo contrato em `packages/shared` (`plano-formularios-estruturados-web-2026-10-03.md:38-40`).

## 10. Riscos e lacunas

1. **Técnica que afirma escopo completo.** O modelo de conhecimento declara aorta, os dois lados e três segmentos avaliados (`template-padrao.md:25`). Isso conflita com o texto neutro do writer (`DOPPLER_RENAL.ts:77`) e alimenta o caminho ativo em produção.
2. **Aorta presumida preservada.** A regra de apresentação de medidas escreve aorta "de calibre preservado" sempre que há VPS aórtica (`regra/medidas-padrao.md:21`). Isso contraria a auditoria (`dopplerRenalWriterAudit.ts:130-131`).
3. **Recomendação automática.**
   - O exame limitado traz a recomendação embutida na frase de conclusão (`exame-tecnicamente-limitado.md:37`), apesar de proibir sugerir exame sem contexto (`:54`).
   - O prompt manda recomendar avaliação complementar em todo achado sugestivo (`DOPPLER_RENAL.ts:100`), contra `estenose-significativa.md:29`.
4. **Percentual.** O título do bloco de estenose usa "≥ 60%" (`conclusao/estenose-significativa.md:16`), enquanto o texto não pode exibir percentual. A síntese não deve propagar isso.
5. **Tardus-parvus.** O conhecimento o chama de "compatível com estenose proximal" (`estenose-significativa.md:26-27`), e o prompt o trata como sugestivo (`DOPPLER_RENAL.ts:98`). A síntese deve adotar a forma sugestiva (5.2-2) **[confirmar com o Luiz]**.
6. **Faixas e limites.**
   - IR entre 0,71 e 0,79 não tem regra (A12).
   - "IR > 0,80" (`template-padrao.md:61`) e "≥ 0,80" (`nefroesclerose...md:16`) divergem no limite.
   - TA está em segundos no conhecimento e em ms no concorrente.
   - Não há regra para VPS aórtica fora da faixa como denominador da RAR **[PENDENTE]**.
7. **Frases que exigem as duas medidas.** As conclusões atuais pedem VPS e RAR juntas (`estenose-significativa.md:21`, `DOPPLER_RENAL.ts:104`); falta variante com um critério.
8. **Lacunas de cobertura** (A14, A18, seção 3.7): oclusão, pós-stent, veias renais e índice de aceleração não têm fonte no LaudoUSG.
9. **Sanity geral fraco.** Guarda um único valor por tipo e não liga a medida a lado nem a segmento (`crosswalk-doppler-aortorrenal-2026-10-03.md:47`).
10. **Conhecimento fora do caminho ativo.** Assimetria, faixa limítrofe e limitação não governam o writer dedicado (`crosswalk-doppler-aortorrenal-2026-10-03.md:47-49`).
11. **Exemplos sem gabarito.** Os exemplos atuais aguardam validação, e há zero laudos assinados (`dopplerRenalFewshots.ts:4-9`).
12. **Desvio de enxerto.** Ditado de transplante pode cair neste writer e receber critérios nativos (`crosswalk-doppler-transplante-renal-2026-10-03.md:29`).

## 11. Comportamento do concorrente

- **Útil [L]:**
  - Blocos separados de qualidade, perviedade, padrão hemodinâmico, critérios diretos e indiretos por artéria.
  - RAR calculada com alerta e conclusão condicionada à confirmação.
  - Recomendações sugeridas e publicadas à parte.
  - Lado não avaliado retirado da normalidade.
  - Restauração completa ao desfazer (`cases/...:53-81`).
- **Não reproduzir [L]:**
  - Laudo normal completo sem nenhuma medida no estado inicial (`cases/...:57`).
  - Estenose significativa concluída por tardus-parvus selecionado isoladamente (`cases/...:69`).
  - Os números e limiares do concorrente: o LaudoUSG usa só critérios próprios versionados (`cases/...:63`).

## 12. Casos sintéticos para validação

1. Normal bilateral completo.
2. Normal só do lado direito, com o esquerdo limitado por gases.
3. VPS limítrofe (por exemplo, 220) com RAR 2,4.
4. Estenose direita por VPS isolada, sem VPS aórtica (sem RAR).
5. Estenose direita só por RAR derivada.
6. Estenose bilateral.
7. Tardus-parvus isolado.
8. Tardus-parvus com critério direto.
9. IR 0,84/0,86 bilateral.
10. IR 0,85 só de um lado.
11. IR 0,75.
12. Assimetria de 1,8 cm.
13. Troca direita/esquerda e troca RAR/IR (precisa bloquear).
14. RAR ditada diferente da derivada.
15. TA ditado em segundos.
16. Medida com critério e estado "normal" (precisa gerar pendência).
17. Remoção de um achado após publicado.
18. Ditado de enxerto (precisa recusar ou redirecionar).
19. Limites exatos: VPS 250 e 251; RAR 3,2 e 3,21; IR 0,55, 0,70 e 0,80.
20. Serialização ponta a ponta nos três clientes, nos estilos clássico e objetivo.

## 13. Decisões para o Luiz antes da síntese final

1. A conclusão de estenose exige confirmação mesmo com critério numérico (5.2-1)?
2. Redação da faixa limítrofe (A3) e se a assimetria vira item de conclusão (A13).
3. Regras para IR entre 0,71 e 0,79, IR elevado unilateral e IR < 0,55 sem morfologia.
4. Unidade de exibição do TA e limiar adotado.
5. Inclusão na v1 de veias renais, oclusão, pós-stent e índice de aceleração, com fonte.
6. Fronteira com Aparelho urinário com Doppler.
