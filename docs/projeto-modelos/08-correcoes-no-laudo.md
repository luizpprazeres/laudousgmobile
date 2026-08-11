# 08 — Pendências e correções dentro do laudo

Plano da frente pedida em 10/08: padronizar como o laudo mostra o que falta e o
que está errado, e deixar o médico **aceitar uma correção com um botão** em vez
de digitar à mão.

Convenção: **[F]** fato verificado no código · **[I]** inferência · **[?]** não confirmado.

---

## 1. O que existe hoje

Levantamento completo em `apps/api/src/server/pipeline/`, `apps/mobile/`, o repo
Swift e `apps/api/src/app/sala/`.

### 1.1 Três sistemas paralelos, não um

| # | Sistema | Onde nasce | Quem consome |
|---|---|---|---|
| 1 | Marcador textual `[REVISAR …]` | guards do pipeline **e o próprio LLM**, via prompt | regex nos clientes |
| 2 | `sanity` (≈40 checks determinísticos + IA) | `deterministicSanity.ts` + `sanityCheck.ts` | **só o Android** |
| 3 | `SanityChecker.swift` (4 checks) | roda **no aparelho** | **só o iOS** |

**[F] iOS e Android mostram pendências diferentes para o mesmo laudo.** O iOS
ignora o evento do backend — `GenerateViewModel.swift:522` é literalmente
`case .sanity: break` — e no lugar roda `SanityChecker.swift:11-21`, com quatro
verificações locais. O Android consome o do backend
(`state.ts:158`). Não é um detalhe de UI: são **dois conjuntos distintos de
achados**, e o médico vê um ou outro conforme o aparelho que tiver na mão.

Isto não estava no diagnóstico inicial. Vale corrigir antes de qualquer
mudança visual — padronizar a cor de duas listas que discordam só deixa a
discordância mais bonita.

### 1.2 Os marcadores nem sempre vêm do código

| Marcador | Quem escreve |
|---|---|
| `[REVISAR: valor improvável]` | `measureSanity.ts:11` — **código** |
| `[REVISAR — nível sugerido]` | `cervicalLevelGuard.ts:46` — **código** |
| `[REVISAR — magnitude]` | **o LLM**, instruído em `prompts/global.ts:68` |
| `[REVISAR — medida ambígua]` | **o LLM** (`global.ts:79-82`) |
| `[REVISAR — divergência com calculadora]` | **o LLM** (`global.ts:25`) |
| `[REVISAR — sigla LA]` | **o LLM** (`global.ts:106`) |
| `[REVISAR — DSM requer 3 medidas…]` | **o LLM** (`contracts/OBSTETRICA.ts:48`) |
| `____` | guards e writer; no determinístico da web, dezenas de pontos |

Metade é pedida ao LLM por prompt. Ou seja: **parte das pendências de hoje
depende de o modelo lembrar de marcá-las.** Uma pendência que o LLM esquece não
existe para o sistema.

Detalhe menor mas real: `measureSanity.ts` usa dois-pontos e todo o resto usa
travessão. O regex dos clientes (`\[REVISAR\b[^\]]*\]`) cobre os dois, então
hoje não quebra — mas qualquer tentativa de classificar por tipo quebraria.

### 1.3 A Sala não mostra — e isso é decisão registrada

**[F]** `api/sala/latest/route.ts:83-85` apaga os marcadores antes de entregar,
com o comentário: *"anotação pro médico conferir; não deve aparecer pro
auxiliar"*. Não é esquecimento. É uma decisão de produto, escrita.

**[F]** A Sala também nunca recebe o sanity: `/api/sala/latest` devolve quatro
campos (`id, outputText, category, createdAt`). Não há canal por onde uma
pendência chegasse, mesmo que a UI quisesse mostrá-la.

**[F] Inconsistência já presente:** `/api/sala/report` (o histórico, ao clicar
num laudo antigo) **não faz o strip** (`route.ts:61-63`). Se um laudo não foi
salvo limpo, os `[REVISAR …]` aparecem crus na Sala. Vale corrigir de qualquer
maneira, independentemente desta frente.

### 1.4 Sugestão de correção não existe

Há um campo `suggestion` em `deterministicSanity/types.ts:5`, preenchido por
~40 checks. Mas:

- o conteúdo é **conselho, não texto de reposição** — *"Confirme o valor do IP
  umbilical"*, *"ACOG 2022: até 13s+6d, discordância >7 dias indica…"*;
- ele é **achatado dentro de `detail`** antes de sair
  (`deterministicSanity.ts:143`), e o `SanityIssue` que chega ao cliente nem tem
  esse campo;
- o sanity de IA é **proibido de sugerir**: *"NÃO sugira correções"*
  (`sanityCheck.ts:55`), *"o sanity NÃO reescreve. Apenas julga e aponta."*

> **A consequência é o ponto central deste plano.** A parte visual do pedido —
> frase riscada, sugestão verde, botão aceitar — é a parte fácil. O difícil é
> **ter o que mostrar**: hoje nada no sistema produz o texto substituto. Isso é
> capacidade nova, não mudança de interface.

Único lugar que chega perto: `cervicalLevelGuard.ts:35-49` **escreve a correção
direto no laudo** (troca `nível ___` por `nível IB [REVISAR — nível sugerido]`).
É o padrão invertido — corrige primeiro, avisa depois — mas prova que, quando o
sistema sabe a resposta, ele já a produz.

---

## 2. O desenho proposto

### 2.1 Uma lista de pendências, no lugar de três verdades

O laudo passa a viajar com uma lista estruturada, em vez de marcadores que cada
cliente decifra por conta própria:

> **Corrigido após a revisão do Codex (`09`).** Minha primeira versão tinha dois
> tipos, `falta | sugestao`, e a regra "sem resposta, vira falta roxa". Está
> errado: uma lateralidade conflitante ou uma data impossível **não é uma
> falta**, e também não é sugestão sem texto substituto. Com dois tipos, o
> sistema teria de esconder o problema ou nomeá-lo falsamente.

Problema e ação são dimensões **separadas**:

```ts
type Pendencia = {
  id: string;                 // estável e idempotente
  problema: "faltando" | "incorreto" | "conflitante" | "ambiguo";
  acao: "preencher" | "substituir" | "revisar_manualmente";
  substituirPor?: string;     // obrigatório sse acao === "substituir"
  mensagem: string;
  origem: string;             // qual guard produziu — auditável
  evidencia?: {               // por que o sistema acha que sabe a resposta
    rawInputTrecho?: string;  // o médico ditou isto
    structuredPath?: string;
    calculoId?: string;
  };
  ancora: TextAnchor;
  severidade: "critical" | "warning";
};
```

O cruzamento dá as cores pedidas — e um terceiro estado honesto:

| problema + ação | como aparece |
|---|---|
| `faltando` + `preencher` | **roxo** — placeholder, item ausente |
| `incorreto` + `substituir` | **riscado + verde**, com botão Aceitar |
| `incorreto` + `revisar_manualmente` | aviso, **sem inventar correção** |
| `ambiguo` + `revisar_manualmente` | aviso de confirmação |

**A âncora precisa de mais que o trecho [revisão `09 §1`].** Só trecho +
ocorrência não basta: se o médico insere uma frase igual antes da que estava
marcada, a ocorrência continua existindo mas passa a apontar para outro órgão —
não é falha de busca, é **acerto no alvo errado**.

```ts
type TextAnchor = {
  detectedOnRevision: number;
  detectedOnTextHash: string;
  trechoExato: string;
  contextoAntes: string;
  contextoDepois: string;
  ocorrencia: number;
};
```

Aplicar exige as três condições ao mesmo tempo: revisão igual, hash igual,
trecho igual. **Se qualquer uma falhar, não procurar outro lugar** — a pendência
vira `stale`, continua visível como "reveja este ponto", e o botão Aceitar
some até ser reconciliada.

### 2.2 De onde a sugestão pode vir

Três fontes, em ordem de risco:

| Fonte | Exemplo | Risco | v1? |
|---|---|---|---|
| **a. Guard que já sabe a resposta** | nível Robbins; conversão cm→mm; magnitude fora de faixa | baixo — é cálculo | **sim** |
| **b. O `structured_output`** *com evidência no ditado* | o laudo tem `____` no fêmur, a extração tem `femur: 3.4` **e "3,4" aparece na transcrição** | baixo | **sim** |
| **c. LLM reescrevendo** | pedir ao modelo a frase corrigida | alto — inventa | **não** |

A fonte (b) só se tornou possível em 10/08: até então a extração do renderer não
era gravada. Foi o `onFindings` desta semana que a destravou.

**Regra para a v1: sugerir só quando o sistema TEM a resposta, nunca quando ele
acha.** Onde não há resposta, a pendência é `revisar_manualmente` — aparece,
mas sem correção inventada.

**Ressalva do Codex (`09 §5.2`, R8):** eu havia classificado o
`structured_output` como fonte determinística "porque o dado foi ditado". Não é
— **a extração é feita por LLM** (`pipeline/renderer.ts:47-52`), e pode errar
campo, unidade ou lateralidade. Um valor só vira correção aplicável se tiver
**evidência**: ou aparece no ditado, ou vem de cálculo determinístico. Daí o
campo `evidencia` no contrato.

### 2.2-bis O texto não pode mudar depois do `done`

**Achado crítico da revisão (`09 §4.3`), e é a consequência direta da decisão de
pôr as linhas no texto.**

A ordem real do backend hoje:

| # | O quê | Onde |
|---|---|---|
| 1 | sanity **determinístico** (~40 checks) | `route.ts:1165` |
| 2 | laudo finalizado com esse resultado | `route.ts:1193` |
| 3 | **`done`** entrega o texto ao cliente | `route.ts:1224` |
| 4 | sanity de **IA** roda | `route.ts:1261` |
| 5 | laudo finalizado de novo, evento `sanity` | `route.ts:1274` |

Enquanto a pendência é metadado, os passos 4-5 só causam listas
temporariamente diferentes. **No momento em que a pendência vira linha de
texto, essa mesma ordem significa que o laudo muda depois de entregue** — o
médico já pode estar digitando nele, e a Sala pode estar lendo outra versão.

> **Regra inegociável: nada acrescenta ou remove linha do texto depois do
> `done`.**

**Decidido (D4): só as determinísticas viram texto.** Elas já existem no passo 1,
antes do `done`. As de IA continuam como card no app, exatamente como hoje.

```
geração → sanity determinístico → texto + REVISAR: → done → Sala vê
                     sanity de IA (depois) → card no app, só metadado
```

Custo aceito conscientemente: **pendência levantada pela IA não aparece na
Sala** na v1. Em troca, o texto é imutável depois de entregue e não há latência
nova. Se a medição do passo 3 mostrar que a IA pega coisas relevantes que o
determinístico não pega, isso vira argumento para promover aqueles checks a
determinísticos — não para reabrir a janela de mutação do texto.

### 2.3 A Sala

O pedido foi: pôr `REVISAR: faltou tal coisa` no fim do texto, para aparecer na
Sala junto com o laudo, e avaliar o roxo lá também.

**Risco concreto de pôr no texto [F]:** o auxiliar copia o laudo da Sala para o
sistema da clínica (`copyReportToClipboard`, `page.tsx:1596`). Se a pendência
estiver *dentro do texto*, ela vai junto — e "REVISAR: faltou a medida do
fêmur" entra no prontuário do paciente. É exatamente o que o strip de
`latest/route.ts:83` evita hoje.

**DECIDIDO em 10/08 — as linhas ficam DENTRO do texto**, como pedido. Eu havia
recomendado um bloco separado; o Luiz manteve a proposta original depois de
ver o risco.

O risco continua real, e é coberto na saída em vez de na entrada:

> **O botão Copiar da Sala remove as linhas `REVISAR:` do que vai para a área
> de transferência**, e avisa: *"copiado sem as 2 linhas de REVISAR — há
> pendências não resolvidas"*.

Assim as três coisas valem ao mesmo tempo:

- as linhas aparecem no texto, na tela da Sala — que é o que o médico pediu;
- não é preciso canal novo para elas chegarem lá;
- nada de `REVISAR:` alcança o prontuário, que é o que o strip de
  `latest/route.ts:83` protege hoje.

`REVISAR:` é sempre efêmero — nenhum laudo final o quer. Removê-lo na cópia é
correto em todos os casos, não é um caso especial.

**Mas a mitigação não é completa [revisão `09 §4.4`].** O botão cobre o botão.
Continuam abertos: seleção manual com Ctrl+C, o menu do navegador, impressão e
PDF, exportação, e as rotas de histórico. O próprio projeto já prova o risco
dessa duplicação — `/api/sala/latest` limpa, `/api/sala/report` não.

A alternativa que preserva a decisão visual: **guardar texto clínico e
pendências separados e compor na renderização**. Na tela as linhas aparecem
dentro do laudo, como pedido; o que é copiado nasce limpo, porque nunca esteve
junto. Se em vez disso as linhas forem mesmo persistidas dentro do
`final_output`, isso fica registrado como **risco residual aceito**, e todos os
caminhos de saída precisam de teste.

Consequência técnica: o strip do `latest/route.ts:83` **sai do servidor e vai
para o botão de copiar**. O texto entregue à Sala passa a conter as linhas; a
limpeza acontece no momento da cópia, nos dois lugares que copiam
(`copyReportToClipboard`, `page.tsx:1596`, e o fluxo de anotações).

---

## 3. Sequência de implementação

Incrementos pequenos, cada um verificável e reversível sozinho.

Revisada depois do parecer `09`. Cada passo é verificável e reversível sozinho.

| Passo | O que muda | Visível? |
|---|---|---|
| **1** | Contrato: taxonomia, `TextAnchor`, revisão, `stale`, evidência, IDs | não |
| **2** | Backend produz `pendencias[]` em **shadow mode** — só determinísticas, sem tocar o texto | não |
| **3** | **Prova diferencial** iOS × Android × lista nova, com adjudicação dos deltas (§3.1) | não |
| **4** | Linhas `REVISAR:` no texto, **antes do `done`**, só as aprovadas no passo 3 | sim |
| **5** | iOS passa a consumir o backend em vez do `SanityChecker` local | corrige divergência |
| **6** | **Uma** sugestão sem sobreposição, bloqueada após qualquer edição | sim |
| **7** | Aceite idempotente, com compare-and-swap e registro do patch | sim |
| **8** | Sala mostra; **sem** permissão de aceitar (D1) | sim |
| **9** | Auditar todo caminho de saída: copiar, selecionar, imprimir, exportar, histórico | não |
| **10** | Só então avaliar sugestão vinda de IA, com evidência e benchmark próprio | sim |

O passo 6 é o coração. Candidato mais seguro: **placeholder `____` cujo valor
está no `structured_output` E aparece no ditado** — o dado foi falado, extraído,
e só não foi renderizado. Um caso só, medido antes de ampliar.

### 3.1 Como provar que nada se perdeu

Eu havia escrito "provar equivalência". **Não dá** (`09 §4.1`): não existe uma
verdade única para comparar — iOS e Android já discordam — e a mudança nem
pretende ser equivalente, porque hoje `[REVISAR]` também é roxo e no desenho
novo roxo passa a significar só ausência.

O critério certo é **"nenhum problema relevante foi perdido"**. A prova é
diferencial, sobre um corpus congelado, com três produtores:
`oldIOS(texto, categoria)`, `oldAndroid(sanity, texto)` e `newPendencias(laudo)`.
Cada diferença é adjudicada numa tabela: *preservada · unificada por duplicidade
· removida de propósito · nova*.

Portões mínimos: 100 % de preservação de placeholders e de issues críticos; zero
sugestão aplicada ao trecho errado; zero substituição sem evidência; IDs
estáveis entre execuções iguais.

Detalhe operacional: o que o iOS mostrou **nunca foi persistido**. Para ter a
baseline dele é preciso reexecutar uma cópia congelada do `SanityChecker` sobre
o corpus.

---

## 4. Decisões que dependem do Luiz

**Respondidas em 10/08.**

| # | Pergunta | Decisão |
|---|---|---|
| **D1** | Na Sala, o auxiliar resolve a pendência ou só vê? | **só vê.** Aceitar sugestão é ato clínico — quem assina é o médico. O auxiliar enxerga e pode avisar; o botão de aceitar existe só no app do médico |
| **D2** | Pendência dentro do texto ou em bloco separado? | **dentro do texto**, como pedido. O risco é coberto no botão Copiar (§2.3), não removendo a linha da tela |
| **D4** | Só as determinísticas viram texto, ou esperar a IA antes do `done`? | **só as determinísticas.** Sem latência nova e sem texto mutante; as de IA seguem no card do app, como hoje. Custo aceito: pendência de IA não chega à Sala na v1 |
| **D3** | Pendência crítica bloqueia a cópia? | **só avisa.** Às vezes o médico sabe que está certo; e atrito repetido vira clique automático. O aviso já resolve o problema relatado — deixar passar por não ver |

---

## 5. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Sugestão errada aceita por reflexo — pior que não sugerir | só fonte determinística na v1; `origem` sempre visível; aceitar é reversível |
| R2 | Pendência vaza para o prontuário via Sala | o botão Copiar limpa e avisa (§2.3). **Atenção:** o strip deixa de ser do servidor e passa a ser do cliente — se um caminho de cópia for esquecido, o vazamento volta. Inventariar TODOS os caminhos de cópia antes do passo 5 |
| R3 | Âncora textual não encontra a frase (texto editado no meio) | `ocorrencia` + degradar para "pendência sem âncora", nunca destacar o trecho errado |
| R4 | Metade dos marcadores depende de o LLM lembrar (§1.2) | migrar para guards determinísticos onde der; medir a taxa de esquecimento antes |
| R5 | Três clientes divergindo de novo | a lista é uma só; o cliente não recalcula nada |
| R6 | `/api/sala/report` já mostra `[REVISAR]` cru hoje | corrigir junto, independentemente do resto |
| R7 | **Pendência obsoleta / lost update** — correção calculada sobre uma revisão aplicada a outra; ou a Sala sobrescrevendo a edição do médico (hoje o update é last-write-wins, sem versão) | revisão + hash, compare-and-swap, aceite idempotente, `stale` após qualquer edição. Aceitar deixa de ser PATCH de texto inteiro e vira comando com `expected_revision` |
| R8 | **`structured_output` tomado como verdade** — a extração é LLM e erra campo, unidade, lateralidade | exigir `evidencia`: ou o valor aparece no ditado, ou vem de cálculo determinístico |
| R9 | **Sugestões sobrepostas** — A troca a frase toda, B troca só a unidade dentro dela; aceitar uma destrói o alvo da outra, e a ordem muda o resultado | detectar sobreposição na produção e agrupar em conflito; aceitar uma invalida as demais do grupo. Na v1, simplesmente não emitir sugestões que se sobreponham |
