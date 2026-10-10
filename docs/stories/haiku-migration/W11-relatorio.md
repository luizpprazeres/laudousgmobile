# W11 — Léxico da casa e Deepgram — relatório

Branch `feat/w11-lexico` (base `cc8924cd`). 10/10/2026. Sem LLM na medição; banco só leitura; sem push, deploy, env ou banco.

## 1. Mineração (sem LLM) — 869 laudos com final, 180 dias

Scripts: `apps/api/scripts/bench-haiku/lexico-mineracao.ts` (vigilância por camada + trocas que o médico fez entre o
`generated_output` e o `final_output`) e `lexico-validacao.ts`. Detalhe local em `tmp-review/haiku-migration/lexico/`.

**Origem**: ASR = variante presente no ditado; IA = presente no gerado e não no ditado.

| Termo canônico | Variantes vistas | Ditado (ASR) | Gerado (IA) | Final assinado | Categorias |
|---|---|---|---|---|---|
| anecoico / hipoecoico / hiperecoico / isoecoico **sem acento** | anecóica(s), isoecóica, hiperecóica(s), hipoecóica | 39 | 17 | 5 (médico corrigiu 13) | pelve, mama, tireoide, vias |
| -ecoico em vez de **-ecogênico** | hiperecogênicos, hiperecogênica | 2 | 6 | 4 | MSK, abdome, pelve |
| **superolateral / inferolateral / superomedial / inferomedial** | superlateral, super lateral, superior lateral, inferior lateral, inferior medial | 13 + 8 + 3 + 6… | 8 | **12 finais com a grafia errada** | mama |
| **I…VI compartimento** (punho) | 4º, quarto, 6º, primeiro, 2º | 31 | 67 | 57 (21× "4º") | MSK |
| **segmento I…VIII** (fígado) | segmento 4 | 3 | 1 | 0 | abdome |
| **subacromial-subdeltoidea** | subacromial subdeltoidea, … e subdeltoidea, subdeltóidea | 12 | 4 | 0 | MSK |
| metacarpofalangiana | — | 0 | 0 | 0 | (pedido do Luiz; nenhuma variante no período) |

Preferências do médico achadas na descoberta, **não implementadas** (decisão): "modificação do padrão ecotextural" (83 finais) ×
"alteração do padrão…" (32; a IA escreve "alteração" em 52); "bolsa" (9) × "bursa" (49); "córtico medular" (95, é a frase do
modelo do abdome) × "corticomedular" (26, vias); "×" em 5 de 50 laudos de mama (36 usam "x" — não é regra).

## 2. Léxico da casa — `apps/api/src/server/pipeline/lexicoDaCasa.ts` (uma fonte só)

8 entradas, cada uma com escopo (categorias), camadas (ditado/saída) e tipo (grafia segura × contextual):
`ecoico-sem-acento`, `ecogenico-para-ecoico`, `quadrante-mama-grafia` (não-palavras: "superlateral", "súpero-lateral"),
`quadrante-mama-contextual` (só depois de "quadrante(s)"), `compartimento-romano` (MSK, ordinal antes de "compartimento",
inclusive listas "do 1º ao 6º"), `segmento-hepatico-romano` (abdome/fígado; nunca medida), `bursa-subacromial-subdeltoidea`
(mantém "bolsa"/"bursa" como ditado), `metacarpofalangiana`.

Testes `pipeline/__tests__/lexicoDaCasa.manual.ts`: 58 verificações, positivos **e negativos** — "isoecoico", "ecogenicidade",
"foco ecogênico" (fica), medidas, TI-RADS/BI-RADS, horários da mama, "porção inferior lateral do músculo", "quarto dedo",
"segmento 4 cm", "segmento de 4 cm", "segmento um pouco", categoria fora do escopo; idempotência.

**Aplicação e flags** (env, cada uma com rollback sem deploy):

| Camada | Onde | Flag | Default |
|---|---|---|---|
| Ditado | `/api/generate` (junto do `normalizeAsrTranscript`, antes de qualquer LLM) e a instrução ditada do `/api/edit` | `LEXICO_DITADO_CATEGORIES` | todas (ausente); `""` desliga |
| Saída | `/api/generate`, depois dos guards finais (writer, writers dedicados e renderer); loga cada troca | `LEXICO_SAIDA_CATEGORIES` | todas; `""` desliga |
| Entrada isolada | — | `LEXICO_DESLIGADAS=id1,id2` | nenhuma |
| Prompt | já feito no M03/W14: uma linha de vocabulário no `WRITER_OUTPUT_RULE` (todo writer) | — | — |

O texto-base da edição (já assinado) não passa pelo léxico. A web (`apps/web`) tem geração própria e não é tocada.

## 3. Validação nos laudos históricos (sem LLM)

Camada de saída aplicada ao `generated_output` de cada laudo, comparada por contexto com o final assinado:

| Entrada | Trocas no gerado | Médico fez igual | Médico manteve o original | Reescrito | Trocas num **final** assinado | Trocas no ditado |
|---|---|---|---|---|---|---|
| ecoico-sem-acento | 21 | 9 | 2 | 10 | 5 | 56 |
| ecogenico-para-ecoico | 9 | 1 | 6 | 2 | 7 | 4 |
| quadrante-mama-grafia | 26 | 10 | 16 | 0 | 12 | 21 |
| quadrante-mama-contextual | 10 | 1 | 9 | 0 | 8 | 11 |
| compartimento-romano | 67 | 16 | 40 | 11 | 57 | 31 |
| segmento-hepatico-romano | 1 | 1 | 0 | 0 | 0 | 3 |
| bursa-subacromial-subdeltoidea | 4 | 4 | 0 | 0 | 0 | 12 |
| metacarpofalangiana | 0 | 0 | 0 | 0 | 0 | 0 |

Leitura: **nenhuma troca indevida de conteúdo** — toda troca num final assinado é exatamente uma forma que o Luiz pediu para
mudar e que passou ("superlateral", "super lateral", "inferior lateral", "anecóica", "hiperecogênicos", "4º compartimento").
"Médico manteve o original" = o médico assinou a forma antiga. Nos quadrantes, no -ecogênico e no acento é o erro que ele não
viu; nos **compartimentos** é volume grande (21 finais com "4º") — por isso a confirmação abaixo.

## 4. Deepgram — documentação oficial relida (10/10/2026) e proposta

Lido por subagente e conferido diretamente (página de keyterm):

- Keyterm no Nova-3 vale para transcrição monolíngue e multilíngue; limite de **500 tokens por requisição**, erro
  "Keyterm limit exceeded…" (não trunca); recomendação de focar nos **20–50 termos** mais importantes; a transcrição "may not
  always exactly match the keyterm's formatting" — https://developers.deepgram.com/docs/keyterm.md
- Nova-3 com `pt`/`pt-BR` desde 02/09/2025 — https://developers.deepgram.com/changelog/2025/9/2.md ·
  https://developers.deepgram.com/docs/models-languages-overview.md
- Modelos de português atualizados em 13/05/2026 e novos monolíngues em 24/09/2026, sem mudar a requisição —
  https://developers.deepgram.com/changelog/2026/5/13.md · https://developers.deepgram.com/changelog/2026/9/24.md
  (as medições de 03/08 e 06/08 do `medicalGlossary.ts`, inclusive o teto de 137 palavras, são de antes do modelo atual).
- `keywords` não vale para o Nova-3 — https://developers.deepgram.com/docs/keywords.md
- Existe `replace=find:replacement` (streaming, todos os idiomas, ~200 termos) —
  https://developers.deepgram.com/docs/find-and-replace.md — **não usado**: exigiria mudar os apps; o léxico no servidor já faz
  a troca determinística para todos os clientes.
- Atualização de keyterms no meio do stream via `Configure` — https://developers.deepgram.com/changelog/2026/10/2.md (não usado).

**Conclusão**: grafia exata é do normalizador (seção 2), não do keyterm. O keyterm só deve trazer a palavra certa para o
decode, na grafia que o médico assina. Proposta (`medicalGlossary.ts`, `medicalAsrKeytermsW11`), **desligada por padrão**,
liga por categoria com `DEEPGRAM_KEYTERMS_W11_CATEGORIES` (rollback: tirar da env; sem nova versão dos apps):

- trocas de grafia: "supraespinal"→"supraespinhal" (108 finais), "infraespinal"→"infraespinhal" (72), "subdeltóidea"→"subdeltoidea"
  (87); sai "supraespinhoso" (0 nos finais) e "córtico-medular" (3 nos finais; o médico usa "córtico medular"/"corticomedular");
- acréscimos: mama "superolateral, inferolateral, superomedial, inferomedial"; MSK "metacarpofalangiana";
- só listas por categoria (29–74 palavras, todas abaixo do teto e perto da faixa recomendada); o fallback `ALL` (136/137) não muda.

Validação proposta (não há áudio guardado): ligar uma categoria por vez (mama primeiro), comparar por 1–2 semanas a
frequência de "superlateral/super lateral" × "superolateral" nos ditados novos (`lexico-mineracao.ts`), e voltar pela env se
piorar. Confirmar nos logs que a conexão com keyterms abre sem "Keyterm limit exceeded".

## 5. Decisões para o Luiz

> Respondidas em 10/10 (tarde): `DECISOES-LUIZ-2026-10-10.md`. Itens 1, 2, 4 e 5 implementados em `TERMOS-relatorio.md`
> (golf ball pendente); item 3 mantido; item 6 no pacote de deploy do W1.

1. **"ecogênico" sozinho** ("foco ecogênico", "conteúdo ecogênico", 12 no período) também vira "ecoico"? Hoje fica.
2. **Bursa**: grafia "bursa subacromial-subdeltoidea" (49 finais) — e "bolsa" (9 finais) vira "bursa"? Hoje fica como ditado.
3. **Romanos**: compartimentos do punho I–VI e segmentos hepáticos I–VIII (implementado). O médico assinou "4º compartimento"
   em 21 laudos — confirmar que quer romano sempre (rollback da entrada: `LEXICO_DESLIGADAS=compartimento-romano`).
4. **"modificação do padrão ecotextural"** × "alteração do padrão" no MSK — padronizar?
5. Frases fixas com "-ecogênico" nos renderers da **web** (`apps/web/src/lib/deterministic/organs/*`, ~30) e nos snippets da
   Biblioteca (`packages/knowledge/snippets`) — proposta separada (o app já sai corrigido pela camada de saída).
6. Ligar a proposta de keyterms do Deepgram (mama primeiro).

## Gates

typecheck ✓ · `lexicoDaCasa` 58 ✓ · `medicalGlossaryW11` 62 ✓ · `medicalGlossary` ✓ (fallback 136/137) · `medicalTermCorrector` ✓ ·
`transcriptNormalizer` 26/26 · `w14-revisao-global` 9 · `writerChosenExam` 6/6 · `writerOutputGuard` 8/8 · W7 71 · morfológico 528 ·
vias golden 44. `editReport.manual.ts` chama a API real (falha de chave local) — não é gate determinístico.
