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

```ts
type Pendencia = {
  id: string;                 // estável — permite "já resolvi esta"
  tipo: "falta" | "sugestao";
  ancora: { trecho: string; ocorrencia: number };
  mensagem: string;           // "faltou a medida do fêmur"
  substituirPor?: string;     // só em "sugestao"
  origem: string;             // qual guard produziu — auditável
  severidade: "critical" | "warning";
};
```

As cores ficam como o pedido:

| tipo | como aparece | o que o médico faz |
|---|---|---|
| `falta` | **roxo** — placeholder, item ausente | preenche |
| `sugestao` | frase **riscada** + substituta em **verde** | **um botão**: aceita ou recusa |

Aceitar é uma operação determinística: trocar `ancora` por `substituirPor`.
Registrável, reversível e auditável — e é a mesma mecânica das operações do
catálogo, então a máquina já existe.

**Limitação da âncora [F]:** `trecho_laudo` é texto literal, não posição. Achar
a frase exige `indexOf`, sem garantia de unicidade — daí o campo `ocorrencia`.
Quando o laudo for `ReportDoc` (frente A), a âncora passa a ser o `slotId`, que
não tem esse problema.

### 2.2 De onde a sugestão pode vir

Três fontes, em ordem de risco:

| Fonte | Exemplo | Risco | v1? |
|---|---|---|---|
| **a. Guard que já sabe a resposta** | nível Robbins; conversão cm→mm; magnitude fora de faixa | baixo — é cálculo | **sim** |
| **b. O `structured_output`** | o laudo tem `____` no fêmur e a extração tem `femur: 3.4` | baixo — o dado foi ditado | **sim** |
| **c. LLM reescrevendo** | pedir ao modelo a frase corrigida | alto — inventa | **não** |

A fonte (b) só se tornou possível em 10/08: até então a extração do renderer não
era gravada. Foi o `onFindings` desta semana que a destravou.

**Regra para a v1: sugerir só quando o sistema TEM a resposta, nunca quando ele
acha.** Onde não há resposta, é `falta` roxo — que é honesto.

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

Consequência técnica: o strip do `latest/route.ts:83` **sai do servidor e vai
para o botão de copiar**. O texto entregue à Sala passa a conter as linhas; a
limpeza acontece no momento da cópia, nos dois lugares que copiam
(`copyReportToClipboard`, `page.tsx:1596`, e o fluxo de anotações).

---

## 3. Sequência de implementação

Incrementos pequenos, cada um verificável e reversível sozinho.

| Passo | O que muda | Visível? | Reversível por |
|---|---|---|---|
| **1** | Backend emite e persiste `pendencias[]`, ao lado do que já emite | não | não emitir |
| **2** | iOS passa a consumir o backend em vez do `SanityChecker` local | corrige divergência | flag |
| **3** | Cor padronizada nos apps: roxo = falta | sim | flag |
| **4** | **Uma** sugestão determinística, com botão aceitar | sim | flag |
| **5** | Sala: linhas `REVISAR:` no texto + limpeza no botão Copiar | sim | flag |
| **6** | Ampliar as sugestões conforme o passo 4 medir | sim | por caso |

O passo 1 não muda nada para ninguém: serve para comparar a lista nova com o
que os clientes mostram hoje, e provar equivalência antes de trocar.

O passo 4 é o coração. Candidato mais seguro: **placeholder `____` cujo valor
está no `structured_output`** — o dado foi ditado, foi extraído, e só não foi
renderizado. A sugestão é o próprio valor. Um caso só, medido antes de ampliar.

---

## 4. Decisões que dependem do Luiz

**Respondidas em 10/08.**

| # | Pergunta | Decisão |
|---|---|---|
| **D1** | Na Sala, o auxiliar resolve a pendência ou só vê? | **só vê.** Aceitar sugestão é ato clínico — quem assina é o médico. O auxiliar enxerga e pode avisar; o botão de aceitar existe só no app do médico |
| **D2** | Pendência dentro do texto ou em bloco separado? | **dentro do texto**, como pedido. O risco é coberto no botão Copiar (§2.3), não removendo a linha da tela |
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
