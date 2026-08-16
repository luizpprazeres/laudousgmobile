# VX Wind por engenharia reversa — slots, edição e o delta real do LaudoUSG

**Data:** 2026-08-12
**Status:** v4 — reescrita após revisão adversarial do Dex, que derrubou afirmações centrais da v3.
**Origem:** engenharia reversa do bundle de produção da VX (`app.vx.med.br`, `index-Dox2SNez.js`), exploração da UI logada, **experimento instrumentado com microfone falso via CDP**, e duas rodadas de revisão do Dex contra o código real.

> **Histórico de erros deste doc** — v1: propôs enum de variante escolhido pelo LLM (perigoso, §7). v2: propôs slot como nó do TipTap (a Biblioteca é React Native). v3: afirmou "o trabalho é só ligar" e "960/960 contra laudos reais" — **ambos falsos** (§6.1, §5.6). Registrado de propósito: cada erro veio de assumir em vez de ler o código.

---

## 0. Conclusão de cabeçalho

**Três achados, e o terceiro invalida o plano da v3.**

1. **A VX não faz edição posicional — ela reescreve o documento inteiro** (§4). Isso explica por que ela acerta a posição sem esforço.
2. **O LaudoUSG tem as duas peças** — patch (`applyOperations`) e reescrita com guarda (`editReport`) — **mas nenhuma das duas resolve o problema hoje**, e não é questão de ligar flag.
3. **A causa real dos sintomas do Luiz não é "patch vs. reescrita".** É **dupla interpretação do mesmo comando** somada a **deduplicação lexical fraca** (§5.1). Trocar o motor de edição não conserta isso.

---

## 1. Como a VX faz — quatro camadas, só a última é LLM

### Camada 1 — ASR: Web Speech API do navegador

```js
new (window.SpeechRecognition ?? window.webkitSpeechRecognition)
  .interimResults = true · .lang = "pt-BR" · .continuous = true
```

Reconhecimento nativo do Chrome, local e em streaming. É por isso que o **ditado ao vivo** parece instantâneo: não há round-trip. Frágil: `SPEECH_API_FAILURE` + `RESTART_ATTEMPTS_MAX = 3`.

### Camada 2 — `editorFormatter.process()` — determinístico, no cliente

| Função | Transformação |
|---|---|
| `replaceWords` | `"ponto"`→`.` · `"vírgula"`→`,` · `"parágrafo"`→`<br/>` · `"dois pontos"`→`:` |
| dicionário do servidor | pares `{from,to}` de `GET speech-to-text/word-dictionary` |
| `processMeasures` | `"3 por 4 por 5"` → `"3 x 4 x 5"` |
| `processRomanLetters` | `"segmento 7"` → `"segmento VII"` · `"bosniak 2"` → `"Bosniak II"` |
| `processDate` | `"12 do 5 de 2026"` → `"12/5/2026"` |
| `processDash` / `putCommaDash` | `"L4 L5"`, `"L4 e L5"` → `"L4-L5"` |

**Peça mais valiosa:** o dicionário `{from,to}` vem do **backend**. Vocabulário médico entra sem deploy.

### Camada 3 — autotextos: fuzzy match determinístico

```js
TRIGGER_WORD = "autotexto" · TRIGGER_SIMILARITY_THRESHOLD = 0.70
SIMILARITY_THRESHOLD = 0.75 · MAX_WORDS_AFTER_TRIGGER = 6
```

Ver §9 — **não transfere.**

### Camada 4 — o LLM

`previousContent` = **HTML inteiro do editor**, com `{slots}` como texto literal, mais a transcrição já limpa.

---

## 2. O insight central da VX

**A tarefa do modelo não é escrever um laudo. É transformar um documento.**

95% da saída tem de ser cópia literal da entrada. Entropia perto de zero. É a diferença entre *"preencha esta lacuna"* e *"escreva uma redação"* — e explica por que o writer é imprevisível: pedimos redação.

| Trecho | Quem faz |
|---|---|
| `"dois ponto 4 centímetros"` → `"2.4 cm"` | Camadas 1+2 — determinístico |
| `"líquido amniótico medindo"` → `"O índice do líquido amniótico mede"` | Camada 4 — LLM |

---

## 3. Onde a VX é frágil — e onde é boa

1. **Slot sem tipo.** `{DBP}` e `{linha_liquido}` são a mesma coisa.
2. **Slot em texto cru dentro de HTML.** Observado em produção: `(+/- [peso}` — colchete no lugar de chave. Slot morto, nenhum aviso.
3. **Sem grounding por campo.**
4. **Sem cálculo.** `{percentil}` e `{IG}` saem do LLM.
5. **Corpo e conclusão desacoplados.** `{linha_liquido}` e `{linha_conclusao_liquido}` são preenchidos independentemente e **podem se contradizer**.
6. **Edição sem guarda de escopo** (§4.3).

### 3.1 O que eles fazem BEM: abstenção explícita

Descoberto por acidente no experimento. Com transcrição sem conteúdo clínico, o sistema **não inventou**:

> **ALERTA:** A [transcrição] recebida ("Registro de Capoeira Mestre Polêmico…") não contém informações clínicas, biométricas ou achados ultrassonográficos relevantes para um laudo obstétrico. Não há dados para atualização, correção ou complementação do laudo pré-preenchido. **O laudo permanece inalterado.**

O template voltou **intacto**. Existe caminho de abstenção no prompt deles — no nível do documento, não por slot.

---

## 4. Edição na VX — reescrita total, não patch

```js
// applyReportContentToEditor
ut.replaceWith(0, dt.doc.content.size, mt.content)
```

| | |
|---|---|
| **Entra** | HTML inteiro do laudo atual + transcrição do comando |
| **Sai** | HTML inteiro do laudo novo |
| **Aplica** | substituição total |

Confirmado pela saída literal deles: *"não há dados para **atualização, correção ou complementação** do laudo pré-preenchido"*.

### 4.1 O que a reescrita resolve

**"Entrou no lugar errado":** resolver âncora textual robusta é difícil. O modelo **vê** o documento — *"após a frase do estômago e da bexiga"* sai por leitura, não por busca fuzzy. **A VX não resolve o problema de âncora; ela o evita.**

### 4.2 O que a reescrita NÃO resolve

**Duplicação.** Reescrita total não impede o modelo de reproduzir um conteúdo **e** inserir o mesmo de novo. Ela remove a duplicação causada por *dupla aplicação de operação*, não a causada por *dupla instrução*.

### 4.3 O preço

O modelo pode alterar **silenciosamente** partes fora do pedido. A VX **não tem guarda nenhuma** — nem diff, nem validação de escopo.

---

## 5. Os sintomas históricos — RESOLVIDO, mantido como registro

> *"os elementos às vezes ou saíam repetidos ou entravam onde não deveriam"*

> **⚠️ Status (Luiz, 12/08): problema antigo, JÁ RESOLVIDO por outro caminho.** Esta seção fica como registro técnico de como a arquitetura de comandos podia falhar — **não é backlog**. Foi citado originalmente só para entender por que o concorrente não sofria do mesmo.

A v3 atribuiu isso ao caminho de patch. **Estava errado.** O Dex rastreou as causas reais:

### 5.1 "Saiu repetido" — dupla interpretação do mesmo comando

1. O comando **continua no ditado** enviado ao writer, porque `parseCommandsPregen` (`commandStripper.ts:38`) **não está conectado à rota**.
2. O writer pode **obedecer ao comando durante a redação**.
3. Depois `applyConfiguredCommands` interpreta **o mesmo ditado outra vez** e acrescenta o conteúdo.
4. As duas réguas de dedup são fracas:
   - guard legado: olha **só a conclusão**, sobreposição lexical de 60% (`commandGuard.ts:163`)
   - `applyOperations`: aceita **só igualdade ou substring** (`operations.ts:67`)

Uma paráfrase — *"controle ultrassonográfico semestral"* vs. *"acompanhamento por ultrassonografia em seis meses"* — **passa pelas duas e duplica**.

**Trocar patch por reescrita não conserta isso**, porque a causa é o comando ser interpretado duas vezes.

### 5.2 "Entrou onde não deveria" — substituição global

`replace_phrase` substitui **TODAS as ocorrências literais** (`operations.ts:49`). O próprio teste prova: *"dimensões normais"* troca **os dois lobos** da tireoide (`operations.manual.ts:30`).

`insert_before/after` usa só a **primeira** linha encontrada, e nem é emitido pelo `commandOperations` atual.

### 5.3 Correções factuais sobre qual código roda

- `/api/generate` chama `applyConfiguredCommands`, que só usa `applyCommandOperations → applyOperations` quando **`COMMAND_OPERATIONS=true`**; senão usa o `commandGuard` legado (`route.ts:1473`). A flag tem **default false** (`env.ts:81`) e está ausente do `.env` local. **Não dá para afirmar que o ramo de operações está em produção** sem checar o Vercel.
- `commandInterpreter.ts:139` **não** significa "entrou no lugar errado" — é o log de operações **descartadas** por falta de lastro/âncora (`:131`). E o interpretador **não tem call site na rota**; aparece só em testes.
- `referenciaDedupeGuard.ts` também **não tem call site** fora do teste.

> Sem os IDs dos laudos afetados não dá para atribuir os sintomas a um caminho específico. **Primeiro passo real: coletar os casos.**

---

## 6. `editReport` — o que ele é de verdade

`apps/api/src/server/pipeline/editReport.ts` faz reescrita total com prompt exigindo byte-identidade fora do alvo, `temperature: 0`, `max_tokens: 3500`, e devolve `{editedText, changedLines[], accepted, reason}`.

Servido por `/api/edit`, gated por `EDIT_INCREMENTAL != "true"` → 404.

### 6.1 O que a guarda garante — e o que NÃO garante

`validateEditScope` só verifica **quantidade de linhas** e **seção**:

```ts
if (changedLines.length === 0)              return "sem alteração";
if (changedLines.length > MAX_CHANGED_LINES) return "edição ampla — confirme";  // 3, GLOBAL
```

- `changedLines` é **diff global por linhas** (LCS, igualdade byte a byte, `editReport.ts:137` e `:171`). **Não é 3 por seção** — é 3 no total, inclusive com `target:"both"` (`:148`).
- **Não valida correspondência semântica** com o pedido. Uma alteração errada numa única linha dentro da seção certa **passa**.
- `target:"body"` considera **título, cabeçalhos iniciais e técnica** como área permitida, porque o mapa começa em `body` e só muda ao encontrar cabeçalhos (`editReport.ts:255`).

> **Correção da v3:** dizer que é "estritamente melhor que a VX" **não está provado**.

### 6.2 O bug de UX: "confirme" sem como confirmar

A mensagem diz *"edição ampla — confirme"*, mas:
- **não existe parâmetro de confirmação nem endpoint** para aceitar a proposta;
- em rejeição, `editedText` volta a ser o **texto-base**, não a proposta (`editReport.ts:58`).

**A proposta é descartada.** Não é só falso-negativo: **edição ampla é impossível por essa API.**

Comandos legítimos que estouram o limite de 3:
- *"corrija a lateralidade de direita para esquerda em todo o laudo"* — 4 linhas (descrição, topografia, Doppler, conclusão)
- atualizar três linhas de biometria **+** a conclusão correspondente

### 6.3 O bloqueio principal: concorrência

`/api/edit` carrega `finalOutput`, **espera a chamada ao modelo**, e depois atualiza por `reportId + userId` **sem conferir `updated_at`, versão ou hash do texto-base** (`reportsRepo.ts:147` e `:188`).

Se o médico — ou a Sala — editar nesse intervalo, **a resposta antiga sobrescreve o texto novo**, e ainda reconstrói `incremental_edits` sobre metadata velha.

### 6.4 Cobertura de teste

`__tests__/editReport.manual.ts`: 5 casos sintéticos (3 obstétricos, 1 Doppler, 1 pélvico). Verifica `accepted`, 1–3 linhas alteradas, regex e seção. **Só um caso confirma o desaparecimento da frase antiga** (`:41`).

**Não cobre:** rejeição por >3 linhas · alteração fora do alvo · `target:"both"` · ausência de mudança · títulos/cabeçalhos · laudo grande · truncamento (`max_tokens: 3500`) · concorrência · persistência · auth · abort · retry · comandos reais. E **não é determinístico** — chama a OpenAI ao vivo.

### 6.5 Trilha de auditoria — parcial

Só edições **aceitas** entram em `generation_metadata` (`route.ts:65`). Rejeições e falhas não são registradas. E a metadata sofre a mesma corrida do texto.

### 6.6 Antes de ligar `EDIT_INCREMENTAL`

**Não ligar globalmente.** Pode ter alto retorno como função de "Ajustar laudo", **mas não corrige os sintomas da §5**, que acontecem no `/api/generate`.

Exigências mínimas:
1. **Optimistic lock** (versão ou hash do texto-base)
2. Restrição a reports em estado editável
3. Captura de `finish_reason` (truncamento por `max_tokens`)
4. Tratamento de timeout/abort
5. **Fluxo real de confirmação** para edição acima do limite (§6.2)
6. **Piloto por usuário** — o gate atual é global, não por conta
7. Teste do cliente publicado para `accepted=false`, conflito e erro do modelo
8. Testes determinísticos de `diffChangedLines` e `validateEditScope` (funções puras — não precisam de LLM)

---

## 7. Convergir comando-durante-geração para `editReport`?

**Não converger os fluxos inteiros.** Reutilizar apenas o diff e parte das guardas.

Antes da geração **não existe laudo** para `editReport` transformar. É preciso primeiro **separar comando de achado clínico** — e o repo já desenhou isso: `parseCommandsPregen` devolve ditado limpo para gerar **e** operações para aplicar depois (`commandStripper.ts:38`). **A peça existe e não está conectada à rota.**

Separação proposta:
- **geração** — comando pré-extraído + operação tipada sobre o draft/`ReportDoc`
- **`/api/edit`** — laudo já salvo, intenção explícita, controle de concorrência
- **reescrita total** — fallback para comandos sem representação tipada, passando pelo mesmo diff-guard

> Substituir todo comando da geração por `editReport` **não resolve** a duplicação se o comando continuar entrando também no writer.

---

## 8. Latência — nossa e deles

### 8.1 VX, medida por experimento

Microfone falso via CDP, áudio de 9,75 s, template de 1181 chars.

| Fase | Tempo |
|---|---|
| stop → pedido da signed URL | 0,09 s |
| signed URL (com preflight CORS) | 0,51 s |
| **PUT → S3 `sa-east-1` (São Paulo)** | 0,89 s |
| `POST create-report-physician` | **8,66 s** |
| **Total: fim da fala → laudo no editor** | **10,46 s** |

Transporte = 1,5 s, graças a: áudio a **32 kbps**, upload **direto ao S3**, bucket em **São Paulo** (`vx-wind-saas-audio-transcription-prd.s3.sa-east-1`).

> **Correção:** não é Google Cloud Storage. É **AWS S3, sa-east-1**.

**Caveat:** o áudio sintético foi rejeitado pelo ASR deles, então os 8,66 s produziram uma **recusa curta**, não um laudo. É um **piso**.

### 8.2 LaudoUSG, dados reais de `generation_audit` (12/08/2026)

| Janela | n | mediana | P75 | P90 |
|---|---|---|---|---|
| Hoje (sucessos) | 26 | **8,24 s** | 14,73 s | 19,20 s |
| 7 dias | 64 | **7,40 s** | 9,48 s | 17,48 s |

`total_duration_ms` bruto hoje: mediana 10,39 s, P90 21,81 s — mas **inclui o sanity de IA que roda depois do `done`** (`generate/route.ts:1229` emite done, `:1266` roda o sanity). Os números acima usam `total_duration_ms − sanity_duration_ms`.

### 8.3 A comparação não é equivalente

Nosso cronômetro começa **depois** de a requisição chegar e a transcrição estar pronta (`generate/route.ts:224`). A VX mediu **fim da fala → editor**.

**Conclusão honesta: mesma ordem de grandeza, não dá para afirmar quem é mais rápido.** Para decidir por UX, falta medir *fim da fala → primeiro token* e *fim da fala → done* **no aparelho**.

### 8.4 ASR do servidor deles: evidência de Whisper

O ASR transformou o ditado em *"Registro de Capoeira Mestre Polêmico – Mestre Polêmico Capoeira Mestre Polêmico – Mestre Polêmico"*: texto fluente, sem relação com o áudio, **em loop de repetição** — assinatura clássica de alucinação do Whisper. Deepgram erra com palavras truncadas, não frases inventadas coerentes. **Evidência forte, não prova.**

---

## 9. Slots — o erro da v1 e o desenho correto

A v1 propunha: *o LLM devolve `variante: "ila"` como enum fechado.* **Perigoso.** O enum não elimina o erro — **converte erro semântico em texto canônico, fluente e difícil de perceber.**

O líquido amniótico é o pior caso, porque **confunde dois eixos ortogonais**:

```ts
// OBSTETRICA.ts:176
liquido_tipo: { enum: ["normal", "ila", "mbv", "alterado", null] }
```

`ila`/`mbv` = **método de medida**. `normal`/`alterado` = **estado clínico**. Dá para ter ILA medido **e** oligoâmnio. Como exclusivos, `ila` força conclusão de normalidade.

Incidente real: `asrClinical.ts:37` — *"laudo 62f15728: virou 'ILA de 3,9 cm' — rótulo errado; ILA 3,9 seria oligoâmnio"*. `amnioticFluidGuard.ts` existe porque confundir MBV com ILA gerava **falso oligoâmnio**.

### 9.1 Extrair fatos ortogonais; o motor escolhe

```jsonc
{ "metodo": "ila|mbv|subjetivo|unknown",
  "valor_cm": 3.9,
  "classe_declarada": "normal|reduzida|aumentada|unknown",
  "evidence_span_ids": ["s12","s13"] }
```

O engine calcula `classe_calculada`, confronta com `classe_declarada`, e **só então** escolhe a variante via `quando()` (`engine.ts:55` — o motor **já** funciona assim). A mudança é no **contrato de extração**.

### 9.2 Grounding por span ID, não por similaridade

Similaridade textual confirma **presença lexical, não vínculo semântico**.

1. Backend segmenta a transcrição com **IDs imutáveis**
2. LLM devolve `evidence_span_ids`, nunca texto livre
3. Antes de aceitar `valor_cm` com `metodo:"ila"`, exigir **na mesma janela** um termo compatível (ILA/AFI/índice) **e** o número
4. Paráfrase difícil → `unknown` ou `[REVISAR]`

### 9.3 Abstenção obrigatória

Todo campo aceita `unknown` / `not_mentioned` / `not_assessed`. **Enum sem escape apaga o inesperado em silêncio.** Política por slot: `omitir_linha` · `usar_padrao` · `marcar_revisar`.

### 9.4 Identidade de instância

Feto A/B, múltiplos nódulos, múltiplos miomas: `(slot, instância)`. O engine já trata instâncias no obstétrico (`rotuloFeto`); o contrato de extração e as operações de personalização não.

### 9.5 `ReportDoc` até o fim do pipeline

Hoje o renderer vira string cedo e o pós-processamento opera em texto — impossibilita validar slot a slot no fim e atribuir procedência.

### 9.6 Dicionário `{from,to}` servido pelo backend

Único item copiado direto da VX.

### 9.7 Telemetria de quase-acerto

`unknown` ou divergência declarada×calculada → logar `{span, campo, valor, motivo}`. Revela quais variantes faltam no catálogo.

---

## 10. O que o LaudoUSG já tem

| Peça | Onde |
|---|---|
| `Catalog<F>` / `Slot` / `SlotVariant` | `renderer/catalog/types.ts` |
| Variante por **predicado determinístico** | `renderer/catalog/engine.ts:55` |
| Equivalência **sintética** — 4.320 combinações | `renderer/__tests__/catalog-equivalence.manual.ts:171` |
| Equivalência contra **laudos reais** — **9/9** | `customization/equivalencia-real.manual.ts:90` |
| Personalização como **operações** | `personalizacao.schemas.ts` |
| Versionamento draft/published/archived + rollback | `schema/reportModelCustomizations.ts` |
| Separador comando↔achado (**não conectado**) | `pipeline/commandStripper.ts:38` |
| Reescrita com guarda parcial (**desligada**) | `pipeline/editReport.ts` + `api/edit/route.ts` |
| Camada do inusitado | `filterFreeBodyItems` / `FLEXIBLE_CONCLUSION` |
| Normalização de ASR clínica | `pipeline/asrClinical.ts`, `amnioticFluidGuard.ts` |

> **Correção da v3:** o doc dizia "960/960 contra laudos reais". Errado duas vezes — são **4.320 combinações sintéticas** num arquivo, e **9/9 reais** em outro.

---

## 11. A Camada 3 da VX não transfere

A VX precisa de autotexto porque **não tem renderer**. E `"autotexto duas IG"` é **linguagem de comando** — fricção, e o oposto do "fale naturalmente".

**No lugar:** seleção de variante por semântica — o gatilho é o conteúdo do ditado.

**Três coisas que valem salvar:** fuzzy match contra vocabulário fechado (limiares calibrados 0,70 / 0,75 / janela 6) · telemetria de quase-acerto (§9.7) · feedback visível de slots preenchidos e ausentes.

---

## 12. O que NÃO fazer

| Ideia morta | Por quê |
|---|---|
| Slot como nó do TipTap | A Biblioteca é **React Native**; edita uma frase por vez num `TextInput`. |
| `<span data-slot>` como fonte canônica | Inline vazio com atributo custom é removido por sanitização/colagem. **Canônico é o JSON com schema e versão.** |
| Slot como texto `{chave}` | É o defeito da VX (`[peso}` quebrado). |
| "Migração simples dos modelos" | Modelos são **deltas** sobre `baseCatalogId`/`baseVersao`. Exige rebase. |
| **"É só ligar `EDIT_INCREMENTAL`"** | §6.3 a §6.6. |

---

## 13. Sequência

> **O plano de execução vive em `docs/plano-biblioteca-implementacao-2026-08-12.md`.** Esta seção guarda só os itens técnicos que aquele plano referencia.

| # | Item | Referência |
|---|---|---|
| A | Testes determinísticos de `diffChangedLines`/`validateEditScope` | §6.4 — funções puras, sem LLM |
| B | Optimistic lock em `/api/edit` + fluxo real de confirmação | §6.2, §6.3 |
| C | Piloto de `EDIT_INCREMENTAL` **por usuário** | §6.6 — gate hoje é global |
| D | Contrato de extração com fatos ortogonais + `unknown` | §9.1 |
| E | Segmentação com IDs + validador termo↔valor↔janela | §9.2 |
| F | Dicionário `{from,to}` servido pelo backend | §9.6 |
| G | Instrumentar *fim da fala → done* no aparelho | §8.3 |

*(Os itens sobre duplicação de comando saíram da lista: §5 está resolvida.)*

---

## 14. Decisões pendentes do Luiz

1. **Ordem de expansão por categoria.** ABDOMEN_SUPERIOR / PROSTATA / CERVICOMETRIA são de menor risco mas volume quase nulo. TIREOIDE e MAMARIA têm melhor potencial, mas TI-RADS/BI-RADS tornam erro de variante mais perigoso. **Fácil primeiro ou retorno comercial primeiro?**
2. **Que evidência exigir para ligar o catálogo obstétrico?** As 4.320 sintéticas + 9/9 reais bastam, ou exige lote novo de ditados?
3. **Regra do conflito** — *o sistema controla a semântica, o médico controla a redação da variante selecionada.* Confirma?
4. **Tem os IDs dos laudos** onde viu duplicação ou posição errada? É o passo 1.

---

## 15. Anexo — evidências do bundle da VX

| Achado | Local |
|---|---|
| `editorFormatter` | offset ~3.106.000 |
| `processAutotexts` + constantes | ~3.097.000–3.103.600 |
| `useSpeechToText` (Web Speech API) | ~8.558.000 |
| `previousContent = editor.getHTML()` | ~8.622.000 |
| `replaceWith(0, size, content)` | `applyReportContentToEditor`, ~8.614.400 |
| WebSocket de notificação | `wss://api.vx.med.br/ws/notification?token=<JWT>` |
| Storage de áudio | `vx-wind-saas-audio-transcription-prd.s3.sa-east-1.amazonaws.com` |
| Template real observado | `{apresentação} {dorso} {BCF} {DBP} {CC} {CA} {CF} {peso} {percentil} {placenta_local} {placenta_textura} {linha_liquido} {IG} {linha_conclusao_liquido}` |

**Escopo.** Mecanismo, arquitetura, contratos observáveis no cliente e latência medida em uso normal de conta própria. **Não foram extraídos prompts proprietários da VX**, e nada aqui depende deles.

---

## 16. Detalhes de UI da VX que valem adotar

- **"Você saiu sem copiar o laudo → Recuperar"** — snapshot em localStorage.
- **"Conteúdo já iniciado → Manter e continuar / Apagar e escolher modelo"** antes de conectar outro dispositivo.
- **Rastro de origem no rodapé** — *"Laudo recebido da sessão móvel às 13:32."*
- **Salvar é opt-in** — padrão "Copiar laudo"; "Copiar e salvar" é ação separada.

*Descartado por decisão do Luiz: contador de créditos visível no header.*
