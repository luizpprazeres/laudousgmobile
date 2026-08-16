# Catálogo de patologias OBSTETRICA — especificação clínica aprovada

**Data:** 2026-08-16
**Fonte:** decisões do Dr. Luiz sobre `catalogo-patologias-obstetrica-proposta-2026-08-14.md`
**Status:** 27 itens decididos — 3 aprovados como estavam, 24 com redação do médico

> **O texto clínico deste documento é do Dr. Luiz.** Onde eu tiver reformulado, é erro meu — a redação dele é a fonte da verdade.

---

## 0. O que as respostas revelaram

A maior parte do valor não está nas frases: está nos **requisitos estruturais** que elas expõem. Treze deles, e vários o catálogo ainda não sabe expressar.

| # | Requisito | Onde apareceu |
|---|---|---|
| **R1** | Variante selecionada por **faixa de IG** | `bcf` (1T × 3T) · `pielectasia` (<32 × ≥32 sem) |
| **R2** | **Palavra computada da IG** | "embrião" (<10 sem) × "feto" (≥10 sem) |
| **R3** | Política de ausência **afirmativa** | `movimentos_fetais` — não dito ⇒ afirma normalidade |
| **R4** | Condição **cross-slot** | estômago não visualizado **+** polidrâmnio |
| **R5** | Seleção por **percentil calculado** | CIR ≤3 · PIG 3–10 · GIG >95 |
| **R6** | Variante que muda **só a conclusão** | líquido — o corpo é o mesmo do normal |
| **R7** | **Lateralidade + medida por lado** | pielectasia · ovários |
| **R8** | Frase **opcional, a critério do usuário** | divergência IG × DUM |
| **R9** | Onde propus **uma** variante, são **várias** | fossa posterior (3) · ascite/derrame/hidropsia (3) · saco gestacional (2) |
| **R10** | **Conduta** como componente reutilizável | *"Convém, a critério clínico, …"* em quase toda conclusão |
| **R11** | Classificação **O-RADS** | ovários |
| **R12** | **Posição específica** no corpo | pielectasia entra após a frase do estômago e da bexiga |
| **R13** | Normal que **não** vai à conclusão | cordão umbilical |

### O que já é suportado × o que falta

| | |
|---|---|
| ✅ **Já dá** | R1, R4, R5 — `quando(ctx)` enxerga o `findings` inteiro; R6 e R13 — `montarConclusao` é independente do corpo; R2 — a IG já é calculada |
| ⚠️ **Falta** | R3 (política de ausência não existe no tipo `Slot`) · R7 (cardinalidade por lado) · R8 (frase opcional não é variante) · R10 (conduta é texto repetido) · R12 (ordem é por slot, não intra-slot) |

> **R6 confirma o desenho.** O líquido tem **corpo igual ao normal** e só a conclusão muda — exatamente os eixos ortogonais que o Codex defendeu (§9.1 do doc de design): `método` (ILA/MBV) governa o corpo, `classe` (normal/reduzida/aumentada) governa a conclusão. A modelagem atual, que trata `normal|ila|mbv|alterado` como alternativas exclusivas, **está errada e agora tem prova clínica**.

---

## 1 · `bcf` — batimentos cardíacos

**Bradicardia e taquicardia: aprovadas como propostas.**

### Ausência — depende do trimestre *(R1 + R2)*

| Contexto | Corpo | Conclusão |
|---|---|---|
| **3º trimestre** | *(a proposta original)* | **Óbito fetal.** |
| **1º trimestre** | Batimentos cardíacos fetais não visualizados pelo modo B ou pelo modo Doppler. | **Embrião / Feto sem vitalidade.** |

> **"Feto é acima de 10 semanas, e embrião abaixo disso"** — a palavra é **computada da IG**, não ditada. O sistema já calcula a IG, então é determinístico.

❓ **Pendente:** o corte 1T × 3T da *frase do corpo* é o mesmo 10 semanas, ou é o fim do 1º trimestre (13s6d)? São dois cortes diferentes no mesmo item.

---

## 2 · `movimentos_fetais` *(R3)*

**Reduzidos: aprovada.**

### Ausentes — política de ausência **invertida**

> *"Essa frase entra apenas se o usuário falar ou marcar essa opção. Caso contrário, mesmo se não disser nada, é para colocar que tem movimentos sim por padrão."*

Não dito ⇒ **afirma normalidade** (*"Os movimentos fetais são ativos."*, que já é o texto atual).

> **É o oposto da placenta**, onde não dito ⇒ `____`. E está clinicamente certo: movimentos são observados durante todo o exame; silêncio significa presença.
>
> **Prova que a política de ausência é por slot** — a terceira política (`usar_padrao`) que o design previu, agora com caso real.

---

## 3 · `anatomia_cranio`

**Ventriculomegalia: aprovada.**

### Cisto de plexo coroide
- **Corpo:** Imagem anecoica, de contornos regulares, medindo `{medida}`, situada no plexo coroide `{lateralidade}`.
- **Conclusão:** Cisto de plexo coroide `{lateralidade}`.

### Fossa posterior — **são três entidades** *(R9)*

**Megacisterna magna**
- **Corpo:** Cisterna magna aumentada, medindo `{medida}` mm, com hemisférios cerebelares e vermis apresentando morfologia preservada.
- **Conclusão:** Aumento da cisterna magna. O diagnóstico mais provável é megacisterna magna. Convém, a critério clínico, realizar neurossonografia fetal, com objetivo de acompanhar a evolução.

**Cisto da bolsa de Blake**
- **Corpo:** Imagem anecoica na fossa posterior, em continuidade com o quarto ventrículo, associada a discreta rotação superior do vermis, que apresenta dimensões e morfologia preservadas.
- **Conclusão:** Achados sugestivos de cisto da bolsa de Blake. Convém, a critério clínico, realizar neurossonografia fetal, com objetivo de acompanhar a evolução.

**Dandy-Walker**
- **Corpo:** Aumento da fossa posterior, associado a comunicação do quarto ventrículo com a cisterna magna, rotação superior e alteração morfológica do vermis cerebelar.
- **Conclusão:** Achados ultrassonográficos que levantam a possibilidade de malformação da fossa posterior. O diagnóstico mais provável é malformação de Dandy-Walker. Convém, a critério clínico, realizar neurossonografia fetal, com objetivo de acompanhar a evolução.

### Cavum do septo pelúcido
- **Corpo:** Não foi visualizado o cavum do septo pelúcido nos planos ultrassonográficos obtidos.
- **Conclusão:** Não visualização do cavum do septo pelúcido. Convém, a critério clínico, realizar neurossonografia fetal, com objetivo de acompanhar a evolução.

---

## 4 · `anatomia_visceras`

### ⚠️ Golf ball — **CONFLITO COM PRODUÇÃO**

| | Em produção hoje (`golfBall.ts`) | Redação de 16/08 |
|---|---|---|
| Unidade | `{N}` **cm** no seu maior eixo | aproximadamente `x` **mm** |
| Lado na conclusão | *"no ventrículo `{lado}`"* | **omitido** |
| Prazo | ecocardiografia fetal **em torno de 28 semanas** | ecocardiograma fetal **entre 24–28 semanas** |
| Termo | ecocardiografi**a** | ecocardiogram**a** |
| Grafia | `(Golf Ball)` | `("golf ball")` |

O arquivo em produção diz: *"Frases canônicas EXATAS do Dr. Luiz (corpus `aprendizado-correcoes-luiz.md` §2)"*.

❓ **Não vou mexer sem confirmação.** A versão em produção foi validada contra corpus; a de agora foi escrita de memória. **Qual vale?** A de mm/24–28 é uma mudança clínica real, não formatação.

### Pielectasia *(R1 + R7 + R12)*
- **Corpo** — *após a frase do estômago e da bexiga:* A pelve renal direita mede `x` mm e a esquerda mede `x` mm.
- **Conclusão < 32 semanas:** Pequena distensão na pelve renal direita/esquerda/bilateralmente (pielectasia). Convém, a critério clínico, reavaliar ultrassonograficamente no prazo de **4 semanas**, com objetivo de acompanhar a evolução.
- **Conclusão ≥ 32 semanas:** …reavaliar ultrassonograficamente no **pós-natal (no prazo de 1 a 3 meses)**, com objetivo de acompanhar a evolução.

### Estômago não visualizado *(R4 — condição composta)*

Só vale **com polidrâmnio associado**:
- **Corpo:** O estômago fetal não foi visualizado durante o período de observação, apesar do estudo dirigido em diferentes momentos da avaliação.
- **Conclusão:** Persistente ausência de visualização do estômago fetal, associada a aumento do líquido amniótico. O conjunto dos achados levanta a possibilidade de alteração do trato digestivo alto (atresia esofágica), e por isso recomendamos avaliação morfológica dirigida.

❓ E **sem** polidrâmnio — o estômago não visualizado gera alguma frase, ou não entra?

### Bexiga não visualizada
- **Corpo:** A bexiga fetal não foi visualizada durante o período de observação do exame atual (aprox. 15 minutos).
- **Conclusão:** Bexiga fetal não visualizada no presente exame, com líquido amniótico de quantidade normal e rins identificados bilateralmente. Convém, a critério clínico, acompanhamento ultrassonográfico evolutivo.

❓ A conclusão **afirma** líquido normal e rins identificados. Isso deve ser **verificado** contra os outros slots, ou é texto fixo? Se for fixo, pode afirmar algo falso.

### Intestino hiperecogênico
- **Corpo:** Alças intestinais fetais apresentando aumento difuso da ecogenicidade, semelhante à ecogenicidade das estruturas ósseas.
- **Conclusão:** Hiperecogenicidade intestinal fetal, de aspecto inespecífico. Convém, a critério clínico, realizar estudo morfológico dirigido e acompanhamento ultrassonográfico evolutivo.

### Ascite / derrame / hidropsia — **três entidades** *(R9)*

**Ascite**
- **Corpo:** Moderada quantidade de líquido anecoico na cavidade abdominal fetal, circundando parcialmente as vísceras.
- **Conclusão:** Ascite fetal.

**Derrame pleural**
- **Corpo:** Coleção líquida anecoica no espaço pleural direito/esquerdo, medindo até `X.X` mm de espessura.
- **Conclusão:** Derrame pleural fetal à direita/esquerda/bilateral.

**Hidropsia**
- **Corpo:** Moderada quantidade de líquido livre na cavidade abdominal, associado a derrame pleural bilateral e edema do tecido celular subcutâneo fetal.
- **Conclusão:** Sinais ultrassonográficos de hidropisia fetal.

---

## 5 · Biometria *(R5 — 100% determinístico)*

### CIR × PIG

> *"CIR percentil ≤ 3 e PIG entre 3 e 10, mas ambos exigem acompanhamento com Doppler."*

Conduta comum: **Convém, a critério clínico, realizar nova ultrassonografia com Doppler colorido, com objetivo de acompanhar a evolução.**

### GIG
> Percentil > 95 ⇒ conclusão: `x)` **Peso fetal acima do percentil 95 (grande para a idade gestacional — G.I.G.).**

### Divergência IG × DUM *(R8 — opcional)*
> Frase **opcional, a critério do usuário**, para acrescentar na conclusão:
> **A idade gestacional calculada pela biometria atual diverge da idade gestacional calculada pela data da última menstruação.**

Não é variante automática — é frase que o médico escolhe acrescentar.

❓ CIR e PIG têm **redação de conclusão distinta**, ou só a faixa muda e o texto é o mesmo?

---

## 6 · `liquido_amniotico` *(R6 — a prova dos eixos ortogonais)*

- **Corpo:** Índice do líquido amniótico de `x` cm. **/** O maior bolsão vertical mede `x` cm.
- **Conclusão reduzida:** Líquido amniótico de quantidade reduzida (ILA/MBV = `x` cm).
- **Conclusão aumentada:** Líquido amniótico de quantidade aumentada (ILA/MBV = `x` cm).

> **O corpo é idêntico ao caso normal.** Só a conclusão muda. Confirma que `método` e `classe` são eixos independentes — e que o `liquido_tipo: normal|ila|mbv|alterado` de hoje mistura os dois.

---

## 7 · `placenta` — achados agudos

**Descolamento**
- **Corpo:** Imagem hipoecoica e heterogênea, medindo `{medidas}`, situada entre a placenta e o miométrio, sem vascularização.
- **Conclusão:** Coleção retroplacentária, que tem como diagnóstico mais provável descolamento placentário.

**Acretismo (PAS)**
- **Corpo:** Placenta apresentando perda focal da zona hipoecoica retroplacentária e acentuado adelgaçamento do miométrio subjacente. Ademais, imagens anecoicas intraplacentárias, irregulares, algumas apresentando fluxo turbulento ao estudo Doppler, associadas a aumento da vascularização na interface uterovesical.
- **Conclusão:** Achados ultrassonográficos que aumentam a suspeição para espectro de acretismo placentário (PAS). Convém, a critério clínico, avaliação dirigida em serviço de alto risco e controle ultrassonográfico.

**Lagos venosos**
- **Corpo:** Placenta apresentando imagens anecoicas intraparenquimatosas, bem delimitadas, de contornos regulares, algumas demonstrando fluxo de baixa velocidade ao estudo Doppler.
- **Conclusão:** Lagos venosos placentários.

---

## 8 · `cordao_umbilical` — slot novo *(R13)*

| Variante | Corpo | Conclusão |
|---|---|---|
| normal | O cordão umbilical tem aspecto normal, com duas artérias e uma veia. | **não menciona** |
| artéria única | O cordão umbilical tem dois vasos, sendo uma artéria e uma veia. | Artéria umbilical única. |

---

## 9 · Anexos e 1º trimestre

### Ovários *(R7 + R11)*

**Cisto simples / funcional**
- **Corpo:** Ovário direito medindo `y,y x y,y x y,y` cm, apresentando imagem anecoica, de paredes finas e regulares, sem septações, medindo `x` cm no seu maior eixo, sem componente sólido.
- **Conclusão ≤ 3 cm:** `x)` Ovário direito de volume normal/aumentado (`y,y` cm³), apresentando **coleção líquida provavelmente funcional** (O-RADS 2).
- **Conclusão ≥ 3 cm:** `x)` Ovário direito de volume normal/aumentado (`y,y` cm³), apresentando **cisto simples** (O-RADS 2).

❓ **Sobreposição:** "≤ 3 cm" e "≥ 3 cm" colidem em **exatamente 3 cm**. Qual vale nos 3,0?

**Endometrioma**
- **Corpo:** Ovário esquerdo medindo `y,y x y,y x y,y` cm, apresentando imagem de baixa ecogenicidade, com margens regulares e conteúdo com aspecto em "vidro fosco", sem vascularização, medindo `X.X x X.X x X.X` cm.
- **Conclusão:** `x)` Ovário esquerdo de volume normal/aumentado (`y,y` cm³), apresentando imagem de baixa ecogenicidade que tem como diagnóstico mais provável **endometrioma** (O-RADS US 2).

> O volume em cm³ já é calculado pela fórmula do elipsoide na PELVE (`L × AP × T × 0,523`). Reaproveitar.

### Vesícula vitelina
- **Corpo:** Vesícula vitelina de dimensões aumentadas, medindo `X.X` mm no seu maior eixo.
- **Conclusão:** Vesícula vitelina de dimensões aumentadas (hidrópica), achado associado a maior risco de desfecho desfavorável da gestação. Convém acompanhamento ultrassonográfico evolutivo.

### Saco gestacional — **duas entidades** *(R9)*

**Hematoma perigestacional**
- **Corpo:** Imagem hipoecoica alongada, medindo `X.X x X.X x X.X` cm, situada adjacente à direita/esquerda do saco gestacional.
- **Conclusão:** `x)` Imagem hipoecoica adjacente ao saco gestacional. O diagnóstico mais provável é pequeno hematoma perigestacional (<15% do tamanho do saco…

❓ **A frase está truncada** no envio — falta o fecho depois de *"do tamanho do saco"*.

**Gestação inviável / anembrionada**
- **Corpo:** Saco gestacional medindo `X.X` mm de diâmetro médio, sem visualização de embrião.
- **Conclusão:** Ausência de embrião em saco gestacional com diâmetro médio (DSM) de `xx,x` mm, permitindo preencher critérios ultrassonográficos de inviabilidade gestacional.

> O DSM **já é calculado** (`calcDsm` no catálogo). O limiar de inviabilidade (≥25 mm pelos critérios usuais) pode selecionar a variante — ❓ confirmar o valor que você usa.

---

## 10 · O padrão transversal: a conduta *(R10)*

Quase toda conclusão termina com **"Convém, a critério clínico, …"** — a assinatura da casa, já registrada em `docs/estilo-casa-regras-gerais.md`.

Vale extrair como **componente**, com o prazo/exame como parâmetro:

| Achado | Conduta |
|---|---|
| fossa posterior, cavum | neurossonografia fetal |
| golf ball | ecocardiograma fetal, 24–28 sem *(❓ ver conflito)* |
| pielectasia | reavaliação — 4 semanas **ou** pós-natal, por IG |
| PIG / CIR | nova USG com Doppler colorido |
| acretismo | serviço de alto risco + controle |

Assim a conduta é **uma só** frase-molde, personalizável na Biblioteca de uma vez, em vez de repetida em 12 variantes.

---

## 11 · Perguntas em aberto

| # | Pergunta |
|---|---|
| **Q1** | **Golf ball:** vale a versão em produção (cm, 28 sem, com lado) ou a de 16/08 (mm, 24–28 sem, sem lado)? |
| **Q2** | **`bcf` ausente:** o corte 1T × 3T é o mesmo 10 semanas do embrião/feto, ou 13s6d? |
| **Q3** | **Estômago:** sem polidrâmnio, gera frase ou não entra? |
| **Q4** | **Bexiga:** a conclusão afirma líquido normal e rins identificados — verificar contra os outros slots, ou texto fixo? |
| **Q5** | **CIR × PIG:** a redação da conclusão é a mesma, mudando só a faixa? |
| **Q6** | **Ovários:** exatamente 3,0 cm cai em qual? |
| **Q7** | **Hematoma perigestacional:** o fecho da frase após "<15% do tamanho do saco" |
| **Q8** | **Saco gestacional:** qual DSM define inviabilidade? |

---

## 11-bis · Revisão do Codex (16/08) — 5 bloqueadores, e o gate de teste

### ⚠️ O que eu errei

**#5 · Risco em produção.** Eu disse *"risco zero por construção"* e estava errado: adicionei os 8 campos ao `OBSTETRICA_JSON_SCHEMA`, o contrato **vivo** da extração em modo strict — obrigando o LLM a emitir campos que o prompt não menciona, em toda geração obstétrica. E o `DOPPLER_OBSTETRICO` herda o schema (**57/63 Dopplers em 30d rodaram no renderer**).

> **Revertido:** campos fora do JSON Schema vivo (`required` de 38 → 30) e Zod com `.default(null)`, para que resposta sem eles faça parse normal. Provado com o payload de produção.

**#3 · Eixos colapsados — o mesmo erro, pela quarta vez, e desta vez fui eu.** Pus `descolamento`/`acretismo`/`lagos_venosos` como variantes do **mesmo slot** que a descrição e a relação. Como `pickVariant` pega a primeira verdadeira, *acretismo + prévia + anterior* → **só o acretismo saía**.

> **Corrigido:** `placenta_achado` virou **slot próprio**, condicional, logo após `placenta`. Clinicamente é frase à parte mesmo — a redação dos três agudos é sentença completa que não substitui a descrição.

### O gate: matriz de invariantes

**#10 · A matriz de 4320 fixa todos os campos novos em `null`** — não testa nada do código novo. O verde que eu vinha reportando não cobria o que eu escrevi.

Criado `__tests__/catalogo-patologias-matriz.manual.ts` — **43 invariantes**, escrito para **falhar** nos defeitos conhecidos:

| Grupo | Afirma |
|---|---|
| Cobertura | toda variante com `exemplo` é alcançável *(pega variante sombreada)* |
| Eixos | ditar dois eixos independentes não faz um sumir |
| Coerência | o laudo não se contradiz |
| Gemelar | achado por feto não vira global |
| Não-regressão | sem achado ditado, nada aparece |

> **A distinção importa:** a equivalência prova que **não quebrei o que existia**; a matriz prova que **o que escrevi funciona**. São gates diferentes.

**Placar:** 9/43 violados → **5/43** após separar os eixos da placenta.

### Bloqueadores restantes

| # | O quê |
|---|---|
| **#4** | óbito fetal coexiste com *"movimentos fetais são ativos"*; `bcf_alteracao` é global e **ignorado no gemelar**; crânio e cordão idem |
| **#1** | fix embrião/feto incompleto — writer fallback, Writer V2 e atalhos iOS/Android ainda usam 13s6d; o fallback sem IG recria o bug |
| **#6** | faltam validações cruzadas (bradi/taqui com BCF null, óbito com BCF numérico) |
| **#8** | catálogo foi 33→51 variantes e continua `versao: 1` — personalizações antigas não marcam `baseDesatualizado` |
| **#9** | prévia de bradi e taqui mostra 142 bpm nas duas (merge raso do `exemplo`) |
| **#7** | cordão não entra nas ordens inicial/gemelar; variante `normal` ficou editável |

### Confirmado pelos dados (30 dias)

OBSTETRICA: **124 gerações — 117 no renderer, 0 no catálogo, 0 no Writer V2.** O vivo é `renderer/categories`, com o writer comum em fallback.

---

## 12 · ✅ IMPLEMENTADO — 16/08

### Bug de produção corrigido: embrião × feto

`gestacao_inicial` (≤13s6d) decidia **duas** coisas: o modelo do laudo **e** a palavra. A palavra usa **10 semanas**.

```ts
export function ehEmbriao(f: ObstetricaFindings): boolean {
  if (f.ig_semanas === null) return f.gestacao_inicial;  // sem IG: comportamento antigo
  return f.ig_semanas < 10;
}
```

Corrigido nos **dois** motores (renderer clássico + catálogo). Janela do defeito: **10s0d–13s6d**. `embriao-feto-10-semanas.manual.ts` — **17 ok**.

### Catálogo: 33 → 51 variantes

| Slot | Variantes novas |
|---|---|
| `bcf` | `ausente_inicial` *(embrião/feto por IG)* · `ausente` · `bradicardia` · `taquicardia` |
| `movimentos_fetais` | `ausentes` · `reduzidos` — com **política afirmativa** (não dito ⇒ ativos) |
| `anatomia_cranio` | ventriculomegalia · cisto de plexo · megacisterna · Blake · Dandy-Walker · cavum |
| `placenta` | descolamento · acretismo · lagos venosos |
| **`cordao_umbilical`** | **slot novo** — normal *(sem conclusão)* · artéria única |

Campos novos: `bcf_alteracao` · `movimentos_fetais` · `cranio_achado` · `cranio_medida_mm` · `cranio_lateralidade` · `placenta_achado` · `placenta_achado_medidas` · `cordao_vasos`.

Todas `personalizavel: false` (crítica C3) e **todas com `exemplo`** — aparecem na lista de revisão e na Biblioteca.

### O cordão teve de virar condicional

Como slot incondicional, **todo** laudo ganharia *"O cordão umbilical tem aspecto normal…"*. A equivalência pegou na hora. Virou `incluirSe: cordao_vasos !== null`.

> Afirmar "três vasos" sem ter avaliado é o mesmo defeito da técnica/via. ❓ **Confirmar com o Luiz:** o cordão normal deve aparecer sempre, ou só quando avaliado?

### Verificação

| | |
|---|---|
| `catalog-equivalence` | **4320/4320 byte-a-byte** |
| `embriao-feto-10-semanas` *(novo)* | 17 / 0 |
| `placenta-relacao-orificio` · `catalog-guarantees` · `camada-flexivel` · `biometria-fetal-det` · `ig-renderer` · `obstetrica` · `doppler-obstetrico-golden` | **229 testes, 0 falhas** |

---

### ⚠️ NÃO implementado de propósito: biometria e líquido

Ao investigar, descobri que as **specs do Writer V2** (`writerV2/specs/OBSTETRICA.json`) já contêm:

- **Biometria completa**: percentil ≤3 (+ Gratacós estágio I + conduta), 3–10 **com** e **sem** menção a restrição, >95 (GIG) — mais nuançado que a descrição de 16/08
- **Líquido com limiares e bloqueios**: ILA <8 reduzido (bloqueio <6) · 8–24 normal · >24 aumentado (bloqueio >26) · MBV <2 / 2–8 / >8

O Luiz estava certo — *"essa parte já está bem configurada"*. **Implementar de novo criaria uma terceira redação do mesmo achado.**

> **Dívida técnica descoberta:** existem **três** lugares com frase clínica — `renderer/categories` (vivo), `renderer/catalog` (dormente), `writerV2/specs` (dormente). Reconciliar é frente própria.

---

## 13 · Ainda não implementado

`anatomia_visceras` (pielectasia, estômago, bexiga, intestino, ascite/derrame/hidropsia) · `vesicula_vitelina` hidrópica · `ovarios` (cisto, endometrioma, O-RADS) · `saco_gestacional` (hematoma, anembrionada).

A pielectasia depende de **cardinalidade por lado** (R7) — mesma pendência das placentas gemelares.

---

## 14 · O que dá para implementar já

Sem depender de nenhuma resposta acima:

1. `cordao_umbilical` — slot novo, duas variantes, texto completo
2. `bcf` bradicardia / taquicardia — aprovadas *(falta só a faixa)*
3. `anatomia_cranio` — cisto de plexo, megacisterna, Blake, Dandy-Walker, cavum
4. `anatomia_visceras` — intestino hiperecogênico, ascite, derrame, hidropsia
5. `placenta` — descolamento, acretismo, lagos venosos
6. `vesicula_vitelina` — hidrópica
7. `movimentos_fetais` reduzidos

**Bloqueados por pergunta:** golf ball (Q1) · bcf ausente (Q2) · estômago (Q3) · bexiga (Q4) · biometria (Q5) · ovários (Q6) · saco gestacional (Q7, Q8) · pielectasia (depende de R7 — cardinalidade por lado).
