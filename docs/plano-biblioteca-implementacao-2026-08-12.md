# Plano de implementação — Biblioteca 100% funcional e personalizável

**Data:** 2026-08-12
**Status:** v2 — reescrito após revisão do Dex, que achou o bug real e derrubou 7 afirmações da v1.
**Doc irmão:** `docs/slots-tipados-biblioteca-design-2026-08-12.md` (engenharia reversa da VX + análise arquitetural)

---

## 0. O bug do "não salva" — ENCONTRADO, e é pior que parecia

### 0.1 Não é o que eu supus

A v1 apostava em "a frase perdeu um placeholder obrigatório → 422". **Errado.** A variante `normal` da placenta é apenas:

```ts
// OBSTETRICA.classico.ts:290
"\nPlacenta de aspecto normal."
```

Sem placeholder nenhum. Retirar `{placenta_local}` não explica um 422 — não há o que retirar.

### 0.2 O defeito real: os clientes ignoram a versão publicada

Ao publicar, o servidor **zera o rascunho** e move as operações para `publicado` (confirmado em `store.manual.ts:125`). Mas as duas telas recarregam **somente** `rascunho.operations`:

| Cliente | Linha |
|---|---|
| Android/RN | `apps/mobile/src/features/biblioteca/ModeloEditor.tsx:72` |
| iOS | `LaudoUSG/Features/Library/LibraryView.swift:646` |

**Consequência imediata:** a frase personalizada **volta a aparecer como padrão logo depois de publicar** — exatamente o "alterei e não salvou".

**Consequência grave:** a próxima edição começa com a lista **vazia**. Publicar de novo grava só a alteração nova e **apaga em silêncio todas as personalizações anteriores.** Isto é perda de dados, não cosmético.

**Correção:** carregar `rascunho.operations ?? publicado.operations ?? []`, mantendo *"existe rascunho"* como informação **separada** — hoje isso é inferido de `ops.length > 0`, o que deixa de valer.

### 0.3 A segunda camada — a frase da placenta é **estruturalmente inalcançável**

O slot `placenta` tem duas variantes:

```ts
{ id: "descrita", quando: placentaAlterada(...), montar: placentaTexto(...), personalizavel: false }
{ id: "normal",   frase: "\nPlacenta de aspecto normal." }
```

`placentaAlterada()` é **true sempre que houver qualquer dado** — localização **ou** ecotextura **ou** grau — ou gestação gemelar.

**Na prática o médico sempre dita a localização.** Logo, em laudo real **sempre** vence a variante `descrita` — que é `personalizavel: false`.

> **Consequência:** a única frase de placenta que o médico consegue editar (`normal`) é a que quase nunca aparece nos laudos dele. **Mesmo depois de corrigir o §0.2, a edição da placenta continuaria sem efeito.**

#### O conteúdo clínico já está certo

O Luiz apontou que a frase deveria ser *"Placenta de localização {localizacao}, com ecotextura {ecotextura}"*, com a ecotextura variando conforme a fase da gestação. **É exatamente o que o motor já produz:**

```ts
// placentaTexto()
frase += ` de localização ${f.placenta_localizacao}`;
frase += `, com ecotextura ${eco}`;

// placentaEco()
return g === "0" ? "homogênea" : "heterogênea, de acordo com a fase da gestação";
```

O texto correto **existe** — no ramo que o médico não alcança. O texto que ele alcança (`"Placenta de aspecto normal."`) é um *fallback* para "nada foi dito sobre a placenta", e é por isso que parece errado.

#### O que fazer

Não é reescrever a variante `normal`. É **tornar `descrita` personalizável como template com placeholders obrigatórios**:

```
"Placenta de localização {placenta_localizacao}, com ecotextura {placenta_ecotextura}."
                          ↑ obrigatório              ↑ obrigatório
```

O médico reescreve a redação; os dados continuam sendo inseridos pelo motor e validados no salvamento. É o modelo de slots do doc irmão (§5, §6) — e é o que a VX faz sem validar.

> `personalizavel: false` veio da "crítica C3": a frase é **montada** pelo motor a partir de partes, e texto livre quebraria a inserção dos dados. O template com placeholders obrigatórios resolve exatamente isso — **é a razão de o modelo existir.**

**b) Os clientes fixam `CLASSICO_COMPLETO`** e não leem o estilo real do médico (`personalizacao.ts:52`, `ModelCustomizationService.swift:229`).
O risco não é 404 (como a v1 dizia) — é **salvar no clássico enquanto os laudos são gerados em outro estilo**, e nada mudar, sem erro algum.

### 0.4 O que já funciona

O `erros[]` do 422 **é exibido** nos dois clientes (`ModeloEditor.tsx:172`, `LibraryView.swift:678`).

Mas erros de rede/500 ocorridos **depois** de a tela carregar ficam **invisíveis**: ambos guardam `erro` e só o mostram quando `estado == nil` (`ModeloEditor.tsx:230`, `LibraryView.swift:107`).

---

## 1. Estado real (verificado, 12/08)

| Peça | Estado |
|---|---|
| Rotas `GET`/`PUT`/`DELETE` + `/publish` + `/restore` | ⚠️ existem, mas **PUT e publish disputam a mesma linha** (§3) |
| Store draft/published/archived, histórico, rollback | ✅ |
| Validação de operações antes de gravar (422 + `erros[]`) | ✅ |
| Carregamento no cliente após publicar | ❌ **bug com perda de dados** (§0.2) |
| Concorrência | ❌ sem revisão atômica; corrida PUT↔publish |
| `personalizacao_ativa` no GET | ⚠️ olha só as duas flags globais (`route.ts:154`) — não diz se o laudo caiu no renderer antigo nem se a variante personalizada foi escolhida |
| **Catálogos** | ⚠️ **só `OBSTETRICA/CLASSICO_COMPLETO`** |
| **Flags `MODEL_CATALOG_*`** | ❌ vazias → nenhum laudo muda |
| Biblioteca na web | ❌ ainda "em breve" (`apps/web/src/components/laudar/LaudarRail.tsx:26`) |

---

## Fase 1 — Consertar o ciclo de edição *(prioridade absoluta)*

1. ~~**Carregar `rascunho ?? publicado ?? []`** nos dois clientes~~ — ✅ **FEITO 13/08**

   | Cliente | Arquivo | Mudanças |
   |---|---|---|
   | Android/RN | `ModeloEditor.tsx` | carga (`rascunho ?? publicado`), `temRascunho = estado?.rascunho != null`, restauro após recusa |
   | iOS | `LibraryView.swift` | idem |

   Validação: `tsc --noEmit` do app RN limpo · `xcodebuild` do iOS **BUILD SUCCEEDED**, zero erros.

   **O que isso conserta:** publicar deixava a tela voltar ao modelo padrão ("não salvou") e a edição seguinte partia de lista vazia — publicar de novo **apagava em silêncio** tudo que já estava publicado. Agora a edição seguinte parte das operações publicadas e as preserva.

   > Falta o teste de regressão: hoje nada impede a volta do bug. Ver Fase 1 item 6.
2. **Mostrar em que situação cada frase vale** — a variante `normal` da placenta não cobre placenta descrita nem gemelar.
3. **Ler o estilo real do médico** em vez de fixar `CLASSICO_COMPLETO`; avisar quando ele laudar num estilo sem catálogo.
4. **Tornar visíveis os erros pós-carga** (rede/500) — hoje só aparecem com `estado == nil`.
5. **Recusa acionável:** além do motivo, oferecer o conserto.
6. **Teste de regressão do ciclo publicar→recarregar→editar** — hoje nada impede a volta da perda de dados. O contrato app↔API (`contrato-biblioteca.manual.ts`) cobre o schema, não o ciclo. E não cobre o iOS (importa só o schema RN).

**Gate:** o Luiz personaliza a placenta, publica, sai, volta — e a alteração dele continua lá.

---

## Fase 2 — Concorrência atômica em todo o ciclo

> A v1 propunha "cliente manda a versão do rascunho, backend responde 409". **Não funciona com o que existe hoje.**

- `versao` **não muda** a cada salvamento — o teste exige que permaneça igual (`store.manual.ts:92`).
- `updatedAt` **não é atualizado** no UPDATE: só tem `defaultNow()` no schema (`reportModelCustomizations.ts:94`) e o save não atribui nova data (`store.ts:232`).

**Correção:** coluna de **revisão mutável (ou ETag)** + update atômico:

```sql
WHERE id = ? AND status = 'draft' AND revision = ?   -- incrementa revision
-- zero linhas afetadas → 409
```

**E há uma corrida mais grave.** `publicar()` lê o rascunho, valida, arquiva o publicado e promove **apenas pelo ID** (`store.ts:310`). Um `PUT` concorrente pode alterar essa linha **entre a leitura e a promoção** — o servidor publica **conteúdo diferente do que o médico confirmou**. Na ordem inversa, o `PUT` atualiza uma linha que já virou `published`.

**A proteção precisa cobrir os cinco caminhos:** `PUT`, `publicar`, `descartar`, `restaurar`, `desligar`. O publish recebe `draftId + revision` e faz compare-and-swap **na mesma transação**.

> Isto é garantia de backend **mesmo com um único cliente** — o mesmo médico com dois aparelhos, duas janelas, ou um retry já basta para corromper.

---

## Fase 3 — Equivalência real via shadow rendering *(em paralelo)*

### O gate certo não é "100 laudos"

Cem laudos normais parecidos não protegem melhor que trinta variados. O gate é:

1. **Zero divergência byte a byte** em todos os casos elegíveis, sem exceção
2. **Cobertura explícita dos ramos clínicos** — ramo com zero casos = **não validado**
3. "100 consecutivos elegíveis" apenas como **piso operacional**

Ramos obstétricos obrigatórios: inicial / padrão / gemelar · placenta normal / descrita · líquido normal / ILA / MBV / alterado · Grannum · conclusão flexível · biometria reconciliada · valores ausentes.

### LGPD — o harness atual é um problema

`equivalencia-real.manual.ts` acessa `raw_input` e **imprime até 120 caracteres do laudo divergente no terminal** (`:94`, `:194`). Pode expor nome ou dado clínico, apesar do comentário afirmar o contrário.

**Forma correta — shadow rendering dentro do backend:** o mesmo achado alimenta o renderer antigo e o catálogo; grava-se **apenas** igualdade, hashes, vetor dos ramos exercitados e posição da primeira diferença. Nada de texto.

### O catálogo não cobre todos os obstétricos

Objetivo, golf ball e `OBST_IG_SANITY` continuam no motor antigo (`pipeline/renderer.ts:542`). A flag não é um interruptor único.

---

## Fase 4 — Ativar em canário

1. Canário **por usuário** (começando pelo Luiz), não flag global
2. `MODEL_CATALOG_CATEGORIES=OBSTETRICA` — troca o motor de renderização
3. Observar pelo boletim diário
4. `MODEL_CUSTOMIZATION_CATEGORIES=OBSTETRICA` — aplica o overlay

> **Correção da v1:** eu disse que o overlay é "risco baixo". É verdade só para **raio de impacto**. Clinicamente o médico pode inserir **texto livre** na conclusão e após slots — isso **não** é risco baixo.

---

## Fase 5 — Catálogos das demais categorias

### Não é mecânico — a v1 estava errada

Só a **comparação final** é verificável. O porte em si é redesenho:

- O catálogo obstétrico **mantém bastante código**: inventário manual de variáveis derivadas, formatação, condicionais, ordem dinâmica e funções `montar` (`OBSTETRICA.classico.ts:113`). Não foi "extrair frases para dados" — foi **redesenhar a fronteira entre frase, cálculo e variante**.
- **Tireoide:** listas repetidas de nódulos, cálculo e override de escore, TI-RADS, preferências por conta, Doppler, dois estilos (`TIREOIDE.ts:385`).
- **Pelve:** vias diferentes, miomas em quantidade variável, ovários repetidos, texto livre, pós-processamento anterior ao renderer (`PELVE_FEMININA.ts:511`, `pipeline/renderer.ts:607`).

Decidir **identidade dos slots repetidos** e **quais variantes podem ser personalizadas** não é mecânico.

### Ordem — DECIDIDA pelo Luiz (13/08)

```
OBSTETRICA (ativar) → PELVE_FEMININA → DOPPLER_OBSTETRICO → MORFOLOGICO
                    → MUSCULOESQUELETICO → MAMARIA → …
```

`PELVE_FEMININA` coincide com a recomendação do Dex: entrega mais valor que as categorias "fáceis" e tem menos risco de classificação clínica.

> **Ressalva registrada.** O Dex classificou `DOPPLER_OBSTETRICO` e `MORFOLOGICO` como **alto risco clínico** (muita lógica fetal) e recomendaria deixá-las para depois. O Luiz optou por 3ª e 4ª — decisão dele, e faz sentido comercial. Mitigação: para essas duas, **exigir gate mais duro** — cobertura de ramo obrigatória antes de qualquer canário, e canário mais longo.

### O inventário de variáveis é parte de cada port

> Correção do Dex à v1: o inventário **não é uma fase posterior**. Cada port entrega catálogo + inventário curado da categoria, juntos. Separá-los produziria catálogo sem contrato de placeholder — o defeito da VX.

Por categoria, o inventário precisa de: nome · tipo · unidade · origem · formatação · opcionalidade · repetição · contexto clínico.

O `findingsSchema` gera a **lista inicial**, nunca o contrato: `{peso_medio}`, `{divergencia_pct}`, `{dorso_sufixo}`, `{fetos_descricao}` e `{liquido_classe_cap}` **não são campos do schema** — são derivados à mão (`OBSTETRICA.classico.ts:122`).

> **Correções da v1:** são **15 categorias programáticas** (`extraction.ts:115`), não 13. "Todas as combinações" é impossível com arrays, texto livre e números contínuos — o correto é **matriz de partições clínicas e propriedades**. E a afirmação de que TIREOIDE/MAMARIA "têm volume alto" precisa ser conferida contra os dados reais antes de virar critério.

---

## PC ou celular?

**Os dois — mas a justificativa da v1 estava errada.**

> A v1 dizia "não existe risco de divergência entre plataformas". **Refutado pelo próprio código:** o teste de contrato importa só o schema do app RN (`contrato-biblioteca.manual.ts:13`) — **não testa o `Codable` nem o comportamento do iOS**. Tanto que o bug da §0.2 existe **duplicado** nos dois clientes.

E a Fase 2 não é pré-requisito "para liberar PC+celular": é pré-requisito para **escrita segura**, ponto. Um médico com dois aparelhos já basta.

**Recomendação de rollout:**

| Etapa | Escrita permitida |
|---|---|
| Canário | **só iOS do Luiz** — é onde o fluxo já foi testado, e reduz variáveis |
| Depois do lock otimista + teste de contrato cobrindo Swift | Android |
| Depois | PC (hoje a Biblioteca está "em breve" na web) |

**Não restringir permanentemente.** O argumento de produto continua válido: o atrito acontece no celular, com o paciente na sala — e a VX, sendo PC-only, não alcança esse momento.

---

## Sequência

| # | Fase | Por quê |
|---|---|---|
| **1** | §1 — carregamento `rascunho ?? publicado`, erros visíveis, estilo real | **para a perda de dados** |
| **2** | **§0.3 — tornar `descrita` personalizável como template com placeholders** | sem isso a placenta continua inalcançável |
| 3 | §2 — concorrência atômica nos 5 caminhos | escrita segura |
| 4 | §3 — shadow rendering *(em paralelo desde já)* | evidência + fecha o risco LGPD |
| 5 | §1 (resto) — sinalização de estado | verificabilidade |
| 6 | §4 — ativar OBSTÉTRICA em canário **no iOS do Luiz** | vira produto |
| 7 | §4 — liberar Android, depois PC | — |
| 8 | §5 — portar `PELVE_FEMININA` (+ inventário junto) | expansão |

---

## Decisões tomadas (Luiz, 13/08)

| # | Decisão |
|---|---|
| 1 | **Ordem:** PELVE_FEMININA → DOPPLER_OBSTETRICO → MORFOLOGICO → MUSCULOESQUELETICO → MAMARIA → … |
| 2 | **Canário só no iOS**, antes de Android e PC |
| 3 | **Shadow rendering priorizado** — substitui o harness que imprime laudo no terminal |
| 4 | **Estilo OBJETIVO** fica para depois |

### Ainda em aberto

- **Gate reforçado** para DOPPLER_OBSTETRICO e MORFOLOGICO, dado o risco clínico apontado pelo Dex.

---

# Anexo A — Desenho da frase da placenta

Serve de **modelo para toda frase montada por função** (`montar()`), que é o caso difícil de tornar personalizável.

## A.1 Regras clínicas (Luiz, 13/08)

1. **Sequência:** localização → ecotextura
2. **Localização:** anterior · posterior · fúndica · e as combinações com lateralidade ("posterior e lateral esquerda", "anterior e lateral direita", …)
3. **Ecotextura:** homogênea | heterogênea
4. Na **heterogênea**, pode acrescentar a classificação de Grannum et al. entre parênteses
5. **Não ditado → fica o placeholder.** Sem inventar e **sem omitir a frase**

## A.2 A consequência de maior impacto: a variante `normal` deixa de existir

Hoje, nada ditado → `placentaAlterada()` = false → **"Placenta de aspecto normal."**

Isso **afirma normalidade sem achado** — exatamente a classe de erro que o projeto combate. Pela regra 5, some: existe **sempre** uma frase de placenta, com `____` no que faltar.

> **Mudança de comportamento em todo laudo obstétrico sem placenta ditada.** No gate de equivalência isso vai divergir **de propósito** — precisa entrar como divergência **esperada e catalogada**, não como falha.

### Raio de impacto medido (Dex, consulta agregada — 60 dias)

| | |
|---|---|
| Laudos obstétricos pelo renderer | **303** |
| Sem menção reconhecível a placenta no ditado | **90 (29,7%)** — teto aproximado |
| Saída com *"Placenta de aspecto normal."* | **4** |
| Registros com `structured_output` utilizável | **9** (2 sem localização/ecotextura/grau) |

> A amostra estruturada é **insuficiente** para decisão definitiva. Os 29,7% são teto: pode haver transcrição consolidada, erro de ASR, ou dado extraído por outro contexto.

### ⚠️ Conflito com contrato vigente

A regra "sempre emitir localização e ecotextura, com lacuna" **contradiz duas regras em produção**:

- `prompts/global.ts:56` — manda **omitir** subcláusulas qualitativas ausentes
- `prompts/contracts/OBSTETRICA.ts:86` — **proíbe placeholder** especificamente na placenta

**Isto é mudança clínica transversal, não personalização.** Mudar o contrato é decisão à parte, e precisa ser explícita.

## A.3 Três opções

### Opção 1 — Template único
```
Placenta de localização {localizacao}, com ecotextura {ecotextura}{grannum}.
```
✅ uma só frase · ❌ `{grannum}` carrega lógica escondida (só vale com heterogênea) · ❌ gemelar não cabe

### Opção 2 — Variante por classe clínica ⭐ **escolhida, desenho corrigido pelo Dex**

**Minha primeira versão tinha quatro defeitos** — registrados porque explicam a forma final:

| Defeito | Por quê |
|---|---|
| Condições sobrepostas | `pickVariant()` pega a **primeira** verdadeira (`engine.ts:55`). "Gemelar **e** heterogênea" casava com duas variantes — a **ordem do array** decidia em silêncio |
| Caso faltando | "feto único, ecotextura **não ditada**" não existia. Cair em `homogenea` **inventaria o achado** |
| Placeholders no lugar errado | `placeholdersObrigatorios` pertence ao **slot**, não à variante (`types.ts:52`), mas cada variante exige campos diferentes. O validador aplica a mesma lista a todas (`engine.ts:280`) |
| UI não alcança | Os clientes exibem **só a variante padrão** (`ModeloEditor.tsx:91`, `LibraryView.swift:56`) e salvam `replace_phrase` **sem `variant`**. Só o fallback seria personalizável |

**Conjunto corrigido — predicados mutuamente exclusivos:**

```
gemelar_multipla  → numero_fetos >= 2 && placenta_quantidade >= 2
                    "{contagem} placentas, {localizacoes}, com ecotextura {ecotextura}{grannum}."

gemelar_unica     → numero_fetos >= 2 && placenta_quantidade === 1
                    "Placenta única, de localização {localizacao}, com ecotextura {ecotextura}{grannum}."

unica_heterogenea → feto único && classe heterogênea
                    "Placenta de localização {localizacao}{clausula_relacao},
                     com ecotextura heterogênea, de acordo com a fase da gestação{grannum}."

unica_padrao      → fallback de feto único
                    "Placenta de localização {localizacao}{clausula_relacao},
                     com ecotextura {ecotextura}{grannum}."
                    ({ecotextura} rende tanto "homogênea" quanto ____)
```

`{clausula_relacao}` é a relação com o orifício interno — ver §A.5.3. Vazia quando não há achado.

> ### Três pré-requisitos — sem eles as variantes são **ilusão de personalização**
>
> 1. o catálogo aceitar `placeholdersObrigatorios` **por variante**
> 2. o engine **falhar** se duas condições casarem (hoje escolhe em silêncio)
> 3. as telas **listarem variantes** e enviarem `variant` no `replace_phrase`

### Opção 3 — Segmentos nomeados reordenáveis
```
[ "Placenta"                         sempre                ]
[ " de localização {localizacao}"    sempre                ]
[ ", com ecotextura {ecotextura}"    sempre                ]
[ " (grau {grau} de Grannum et al.)" se heterogênea + grau ]
```
✅ mapeia 1:1 no `montar()` atual → migração mais mecânica
❌ exige UI nova (lista de segmentos); hoje a Biblioteca edita **uma frase por vez**

## A.3-bis Gemelar: uma OU mais placentas *(Luiz, 13/08)*

Exemplos dados:

> "Placenta **única**, de localização anterior, com ecotextura homogênea."
> "**Duas placentas**, uma de localização anterior e outra posterior, com ecotextura homogênea."

Três consequências:

**1. "Placenta única" mantém a mesma forma da gestação única** — muda só o prefixo. Por isso `gemelar_unica` é variante separada, não um caso de `gemelar_multipla`.

**2. A localização passa a ser POR PLACENTA.** *"uma de localização anterior e outra posterior"* — são dois valores. Hoje o schema tem **um** `placenta_localizacao: string`.

> ⚠️ **Isto exige mudança no `findingsSchema` e no prompt de extração**, não só no catálogo. É a **cardinalidade** que o Dex apontou como não-mecânica (§8.4 do doc irmão).

**Superfície real (Dex):** não é migração de banco, mas é mudança média e larga —
Zod + JSON Schema manual (`OBSTETRICA.ts:121`) · prompt de extração (`:232`) · renderer antigo, catálogo, amostras e testes (**17 arquivos** usam `placenta_localizacao`) · **Doppler Obstétrico, que herda o schema** (`DOPPLER_OBSTETRICO.ts:48`) · replays antigos, cujo `structured_output` gravado não terá o campo novo.

**Caminho recomendado — aditivo, não substitutivo:**

```ts
placenta_localizacoes: string[] | null   // novo
placenta_localizacao:  string  | null    // mantido como fallback na transição
```

Substituir o campo antigo de imediato aumenta o risco sem necessidade. Dois campos fixos (`localizacao_1`, `localizacao_2`) seriam **piores**: não cobrem trigemelar e não resolvem identidade.

> **Atalho conhecido, se for preciso entregar antes:** manter a string como **fragmento pronto** (*"uma de localização anterior e outra posterior"*) — o renderer gemelar atual já a encaixa depois da quantidade (`OBSTETRICA.ts:403`), e resolveria a frase com uma mudança só de prompt. Mas não valida quantidade, identidade, ordem nem valores fechados — **não serve de molde arquitetural.**

**3. A ecotextura é compartilhada** nos exemplos ("com ecotextura homogênea", no singular, valendo para ambas). Manter assim até haver caso real de ecotexturas divergentes.

### Como `{localizacoes}` renderiza

`{localizacoes}` é **variável derivada** — junta a lista numa expressão em português:

| Placentas | Renderiza |
|---|---|
| 2 | `uma de localização anterior e outra posterior` |
| 3+ | `uma de localização anterior, outra posterior e outra fúndica` |

> **Limite conhecido:** o médico edita a frase **em volta** de `{localizacoes}`, mas não a junção interna ("uma… e outra…"). Personalizar item a item exige identidade de instância — **v2**.

**O precedente `{fetos_descricao}` é real** — está no vocabulário do catálogo (`OBSTETRICA.classico.ts:113`), montado a partir de `fetos[]` com rótulo, posição, apresentação e dorso, e unido numa string (`:122`). Tecnicamente `{localizacoes}` pode funcionar igual.

> **Mas a diferença importa (Dex):** `fetos[]` **já tem cardinalidade e identidade**; as placentas não. Sem lista estruturada, `{localizacoes}` seria só outro nome para a string livre de hoje.

O formatador ainda precisa tratar quatro casos de borda:

| Caso | |
|---|---|
| Quantidade incompatível | `placenta_quantidade` = 2 mas só uma localização |
| Localização ausente em **apenas uma** placenta | onde entra o `____` |
| Localizações **iguais** | "duas anteriores"? "ambas anteriores"? |
| Três ou mais | a junção "uma…, outra… e outra…" |

## A.4 Placeholders e política de ausência

**Por variante** — não há lista única (é o pré-requisito 1 da §A.3):

| Placeholder | Em quais variantes | Obrigatório | Sem dado |
|---|---|---|---|
| `{localizacao}` | `unica_*`, `gemelar_unica` | sim | `____` |
| `{localizacoes}` | `gemelar_multipla` | sim | `____` |
| `{contagem}` | `gemelar_multipla` | sim | — (vem de `placenta_quantidade`) |
| `{ecotextura}` | `unica_padrao`, `gemelar_*` | sim | `____` |
| `{grannum}` | todas | **não** | some |

> **Correção:** a versão anterior desta tabela esquecia `{contagem}` e `{localizacoes}`.
>
> **E `{grannum}` não é "só onde faz sentido"** como eu havia dito: as variantes gemelares o usam mesmo com ecotextura homogênea, e o renderer atual permite o parentético para **qualquer** grau com a flag ligada (`OBSTETRICA.ts:307`). Restringi-lo à heterogênea é **outra mudança clínica deliberada** — precisa ser decidida, não assumida.

`____` **já é a convenção do repo** (`TIREOIDE.ts:285`, `:293`). `[REVISAR: …]` é outra coisa — incoerência detectada, não lacuna. Não criar uma terceira.

> **Vocabulário de localização ainda não é validável.** `placenta_localizacao` é `z.string()` — **não é enum**. Enquanto for string livre, o extrator pode escrever qualquer coisa e nada valida. Fechar o vocabulário é pré-requisito para validação determinística e para a telemetria de quase-acerto — e depende da decisão sobre prévia (§A.5.3).

`{grannum}` é o único opcional: ausência de Grannum não é dado faltando, é ausência de classificação.

## A.5 Decisões do Luiz (13/08)

### 1. `____` pode ser salvo — sem bloqueio

O laudo finaliza normalmente com lacuna. Mesmo comportamento do TIREOIDE hoje (`TIREOIDE.ts:285`). Nenhum gate na finalização.

> **Formulação correta (Dex):** *"a nova frase placentária no corpo do renderer clássico não será filtrada e chegará à Sala"*.
>
> ~~"O `____` nunca é removido em nenhum ponto do pipeline"~~ — **falso globalmente**. Há exceções:
> - o **estilo objetivo** pelo writer remove qualquer linha contendo `____` (`generate/route.ts:114`)
> - itens vazios de conclusão são removidos (`emptyConclusionItemsGuard.ts:23`)
> - Doppler e DUM têm filtros próprios
>
> E "chega ao paciente" depende de a auxiliar copiar/entregar — **não há envio automático** nessa rota.
>
> Consistente com o resto do produto: as frases prontas da Sala já usam `____` (`sala/[token]/phrases/route.ts:34`).

### 1-bis. A "política de ausência por slot" já existe — espalhada

Descoberta ao verificar o item acima: o repo **já aplica três políticas diferentes** para dado faltante, cada uma num guard próprio:

| Política | Onde | Comportamento |
|---|---|---|
| `marcar_lacuna` | `volumeGuard.ts:13` | *"remove qualquer volume que o LLM inventou → vira placeholder `____`"* |
| `omitir_linha` | `dopplerOverlay.ts:338` | *"Remove linhas de vaso em branco (`Artéria X: IP ____.`) — vaso não medido"* |
| `omitir_item` | `dumFormatGuard.ts:43` | remove o item de conclusão cujo conteúdo é *"Gestação em torno de ____"* |

Três políticas já existem, ad hoc, sem contrato e sem lugar único. A escolha do Luiz para a placenta (`marcar_lacuna`) coincide com a do `volumeGuard`; Doppler e DUM usam a oposta — e é legítimo que slots diferentes tenham políticas diferentes.

> ~~"Isto valida o desenho"~~ — **exagero (Dex).** Provam que **existem** políticas diferentes, mas o tipo `Slot` **não tem campo de política de ausência** hoje (`types.ts:52`). É trabalho a fazer, não confirmação de que já está feito.

### 2. Placenta em gestação inicial: **opcional** *(Luiz, 13/08)*

| Contexto | Regra |
|---|---|
| Gestação inicial | placenta **opcional** — só entra se ditada |
| Demais | placenta **obrigatória** — sempre a frase, com `____` no que faltar |

Hoje o slot `placenta` **não está** na ordem de gestação inicial (`OBSTETRICA.classico.ts:211`), então "opcional" exige adicioná-lo como **condicional**. O tipo `Slot` já tem `condicional: boolean` — é o mecanismo certo.

> Isso também corrige o erro da §A.2: retirar a variante `normal` **não** produz "sempre uma frase". Produz "sempre uma frase **fora da gestação inicial**".

### 3. Placenta prévia — **RESOLVIDO: dois eixos** *(Luiz, 13/08)*

O Luiz confirmou o argumento do Dex e deu a forma exata:

> **Conclusão:** *"Placenta posterior, de inserção baixa."*
> **Corpo:** *"Placenta de localização posterior, **estendendo ao segmento uterino inferior**, com ecotextura homogênea."*

São **dois eixos independentes**, e cada um renderiza num lugar diferente:

| Eixo | Campo | Vocabulário | Onde aparece |
|---|---|---|---|
| **Topografia** | `placenta_localizacao` | anterior · posterior · fúndica · combinações com lateralidade | corpo **e** conclusão |
| **Relação com o orifício interno** | `placenta_relacao_orificio` *(novo)* | ausente · inserção baixa · marginal · prévia | **cláusula no meio** do corpo + **item de conclusão** |

#### Os três casos reais (Luiz, 14/08)

**1 · Inserção baixa**
> **Corpo:** "Placenta de localização posterior, **com ecotextura homogênea**, estendendo-se ao segmento uterino inferior. **Sua borda inferior dista cerca de 12 mm do orifício interno do colo uterino, sem recobri-lo.**"
> **Conclusão:** "Placenta de inserção baixa."

**2 · Borda alcançando o orifício, sem recobrimento**
> **Corpo:** "Placenta de localização anterior, estendendo-se inferiormente e margeando o orifício interno do colo uterino, sem evidência de recobrimento."
> **Conclusão (descritiva, preferencial):** "Placenta de localização baixa, cuja borda inferior alcança o orifício interno do colo uterino, sem recobri-lo."
> **Conclusão (tradicional):** "Placenta prévia marginal."

**3 · Recobrindo amplamente o orifício**
> **Corpo:** "Placenta de localização anterior, estendendo-se ao segmento uterino inferior e recobrindo amplamente o orifício interno do colo uterino."
> **Conclusão:** "Placenta prévia."

#### O que isso muda no desenho

**A relação com o orifício é VARIANTE, não cláusula.** A redação difere estruturalmente entre os três casos — *"estendendo-se ao segmento uterino inferior"* vs. *"estendendo-se inferiormente **e margeando** o orifício…"* vs. *"estendendo-se ao segmento uterino inferior **e recobrindo amplamente**…"*. Não é um trecho intercambiável; é outra frase.

Isso **encaixa melhor** no modelo de variantes por classe clínica que já escolhemos.

**Fatos novos identificados:**

| Fato | Observação |
|---|---|
| `placenta_distancia_orificio_mm` | **campo novo** — "dista cerca de **12 mm**" (só no caso 1) |
| Segunda frase | o caso 1 tem **duas** frases; os casos 2 e 3, uma |
| Duas formas de conclusão no caso 2 | descritiva **preferencial** × tradicional — é **preferência de estilo do médico**, exatamente o que a Biblioteca deve permitir escolher |

#### ESPECIFICAÇÃO CONSOLIDADA *(Luiz, 14/08)*

> ### ✅ Passo 1 implementado — 14/08
>
> Os dois campos novos entraram no `ObstetricaFindingsSchema` (Zod), no `OBSTETRICA_JSON_SCHEMA` e na lista `required` (strict mode exige todos os campos).
>
> **Risco zero em produção, por construção:** o prompt de extração **ainda não pede** os campos → nunca são populados; e o renderer clássico **não os lê**. Nada muda em nenhum laudo.
>
> | Verificação | Resultado |
> |---|---|
> | `pnpm -F api typecheck` | limpo |
> | `catalog-equivalence` | **4320/4320 byte-a-byte idênticas** |
> | `catalog-guarantees` | 65 passaram, 0 falharam |
> | `camada-flexivel` | 20 ok, 0 falhas |
> | `biometria-fetal-det` | 44 ok, 0 falhas |
> | `ig-renderer` | 11 passaram, 0 falharam |
>
> Onze fixtures precisaram dos campos novos — confirmando a "superfície larga" que o Dex apontou (17 arquivos usam `placenta_localizacao`).
>
> ### ✅ Passo 2 implementado — 14/08: as variantes no catálogo
>
> Três variantes novas em `OBSTETRICA.classico.ts`, **antes** de `descrita` (o `pickVariant` pega a primeira verdadeira, e `placentaAlterada()` também seria true — os predicados exigem `placenta_relacao_orificio`, então não há sobreposição):
>
> `insercao_baixa` · `marginal` · `previa` — cada uma com `montar` + `montarConclusao`.
>
> **Todas `personalizavel: false`, e isso é doutrina da casa, não limitação.** O tipo `SlotVariant` diz: *"uma frase personalizada de normalidade jamais pode mascarar um achado patológico"* (crítica C3). Prévia **é** achado patológico → quem escreve é o motor.
>
> > **Isso reenquadra o pedido original do Luiz.** O que ele precisa personalizar é a placenta **normal** (`descrita` — localização + ecotextura), que hoje é `personalizavel: false` porque `placentaAlterada()` significa *"tem dado"*, não *"é patológico"*. **O nome mente, e o `personalizavel: false` está preso à condição errada.** Separar `descrita` em normal-descrita (personalizável) × patológica (motor) é o próximo passo, e agora tem base: as variantes patológicas já existem.
>
> **Teste novo:** `__tests__/placenta-relacao-orificio.manual.ts` — os três laudos reais do Luiz como fonte da verdade, **16 ok / 0 falhas**, incluindo não-regressão (sem relação ditada, o texto antigo sai idêntico).
>
> | Verificação | Resultado |
> |---|---|
> | `typecheck` | limpo |
> | `catalog-equivalence` | **4320/4320 byte-a-byte** |
> | `catalog-guarantees` | 65 / 0 |
> | `placenta-relacao-orificio` *(novo)* | **16 / 0** |
>
> **Falta para ativar em produção:** (a) regras no prompt de extração · (b) portar ao renderer clássico **ou** subir a flag do catálogo. Ambos são decisão explícita — nada muda em laudo nenhum até lá.

**Fatos extraídos** — os dois últimos são novos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| `placenta_localizacao` | topografia (enum) | sim |
| `placenta_ecotextura` | homogênea \| heterogênea | sim — **entra em todos os casos**, inclusive marginal e prévia |
| `placenta_relacao_orificio` | ausente \| inserção baixa \| marginal \| prévia | **novo**, opcional |
| `placenta_distancia_orificio_mm` | número | **novo**, **opcional** — só quando está muito claro, ou houve transvaginal complementar |

**Corpo — uma variante por classe de relação:**

```
sem_relacao     "Placenta de localização {loc}, com ecotextura {eco}{grannum}."

insercao_baixa  "Placenta de localização {loc}, com ecotextura {eco}{grannum},
                 estendendo-se ao segmento uterino inferior."
                 [+ 2ª frase, SÓ se houver distância:]
                 "Sua borda inferior dista cerca de {dist_mm} mm do orifício interno
                  do colo uterino, sem recobri-lo."

marginal        "Placenta de localização {loc}, com ecotextura {eco}{grannum},
                 estendendo-se inferiormente e margeando o orifício interno do colo
                 uterino, sem evidência de recobrimento."

previa          "Placenta de localização {loc}, com ecotextura {eco}{grannum},
                 estendendo-se ao segmento uterino inferior e recobrindo amplamente
                 o orifício interno do colo uterino."
```

**Conclusão — item SÓ quando há relação, e SEM topografia:**

| Relação | Conclusão padrão |
|---|---|
| ausente | *(nenhum item)* |
| inserção baixa | "Placenta de inserção baixa." |
| marginal | **"Placenta prévia marginal."** ← padrão escolhido |
| prévia | "Placenta prévia." |

> **Variante de conclusão escolhível na Biblioteca** — no caso marginal existe a forma descritiva alternativa:
> *"Placenta de localização baixa, cuja borda inferior alcança o orifício interno do colo uterino, sem recobri-lo."*
> É preferência de estilo do médico. Primeiro caso concreto de **variante de conclusão personalizável**, e um bom argumento de venda: a VX não tem isso.

> **Pendência menor:** a ordem `ecotextura` × `cláusula de extensão` ficou sem resposta. Adotada a forma do **caso 1 de 14/08** (ecotextura antes), por ser texto de laudo real. Trivial de inverter se estiver errado.

---

<details>
<summary>Histórico: as duas contradições que geraram esta consolidação</summary>

#### ⚠️ Duas contradições a resolver com o Luiz

**a) Ordem de ecotextura × cláusula de extensão**

| Fonte | Ordem |
|---|---|
| Mensagem de 13/08 | `localização → `**`cláusula`**` → ecotextura` — *"Placenta de localização posterior, estendendo ao segmento uterino inferior, com ecotextura homogênea"* |
| Caso 1 de 14/08 | `localização → `**`ecotextura`**` → cláusula` — *"Placenta de localização posterior, com ecotextura homogênea, estendendo-se ao segmento uterino inferior"* |

**b) A conclusão leva a topografia?**

| Fonte | Forma |
|---|---|
| Mensagem de 13/08 | *"Placenta **posterior**, de inserção baixa."* |
| Caso 1 de 14/08 | *"Placenta de inserção baixa."* — **sem topografia** |

**c) Ecotextura nos casos 2 e 3** — ausente nos exemplos. É porque não foi ditada, ou porque não entra quando há prévia?

**Resolvido:** (a) adotada a forma do caso 1 · (b) conclusão **sem** topografia · (c) ecotextura **entra sempre**, só não foi ditada nos exemplos.

</details>

> **Comportamento preservado:** sem achado de relação, a placenta **continua fora da conclusão** — que é o que o teste do Writer V2 garante hoje (`writerV2/__tests__/assemble.manual.ts:336`). O item crítico só nasce quando existe o achado, e é **computado, não personalizável** — nunca de regex sobre string livre.

#### Consequências

- `placenta_localizacao` **pode** virar enum fechado agora (topografia é vocabulário finito) → validação determinística + telemetria de quase-acerto
- `placenta_relacao_orificio` é campo **aditivo**, opcional, sem quebrar replays antigos
- o slot da placenta passa a usar `montarConclusao` — que o engine já suporta (`engine.ts:65`)

---

<details>
<summary>Histórico: por que a decisão anterior (prévia como valor de localização) foi revista</summary>

**Correção factual:** meu grep falhou. **Existe** tratamento hoje:

| Onde | O quê |
|---|---|
| `OBSTETRICA.samples.ts:91` | cenário "Placenta prévia" na Biblioteca |
| `catalog-guarantees.manual.ts:130` | teste garantindo que a personalização não apague a palavra "prévia" |
| `CERVICOMETRIA.ts:216` | tratamento de ausência de sinais de prévia, por regras próprias daquela categoria |
| `writerV2/__tests__/assemble.manual.ts:336` | teste explícito de que placenta descrita fica **fora** da conclusão |

O que **não** existe é conclusão positiva no obstétrico.

**Argumento do Dex contra a decisão:**

> *"Anterior/posterior/fúndica" é **topografia**; "prévia/marginal/baixa inserção" é **relação com o orifício interno**. Misturar as duas dimensões torna impossível expressar "placenta posterior baixa".*

É o mesmo erro de eixos ortogonais do líquido amniótico (§7 do doc irmão).

**Resolvido acima:** o Luiz confirmou e deu a forma — *"Placenta posterior, de inserção baixa"*. Dois campos.

</details>

### 4. Opção 2 confirmada — mas o desenho mudou (§A.3)
