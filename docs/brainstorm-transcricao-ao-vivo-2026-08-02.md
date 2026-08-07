# Brainstorming comparativo — transcrição ao vivo (ASR) do LaudoUSG

**Data:** 2026-08-02 · **Escopo:** app iOS Swift (`~/laudousg-swift`) + backend (`apps/api`) + Apple Watch
**Premissa do pedido:** priorizar **eficiência/qualidade**, não custo.

---

## 0. TL;DR — as três conclusões que importam

1. **O maior ganho disponível não é trocar de motor — é parar de usar o transcript do
   streaming como entrada do laudo.** Hoje um único motor precisa ser simultaneamente
   rápido (UX ao vivo) e exato (clínico). São objetivos opostos. Separar em duas trilhas
   (ao vivo = feedback; no stop = verdade) desbloqueia qualidade sem risco de UX.
2. **Antes de trocar o modelo, arrume o sinal.** Nenhum ASR recupera informação que o
   microfone não capturou. `bluetoothHighQualityRecording` (iOS 26) + AirPods como mic
   provavelmente vale mais que qualquer troca de vendor — o médico está com as mãos no
   transdutor e o iPhone a 1 m de distância.
3. **O Apple Watch não transcreve.** `SpeechTranscriber` não existe no watchOS. O Watch é
   superfície de **captura e comando**, nunca de processamento. O que o usuário externo viu
   (provavelmente o app do Granola, lançado em 28/07/2026) grava no pulso e sincroniza o
   áudio para o iPhone processar.

---

## 1. O que existe hoje (auditado no código)

### iOS — `DeepgramLiveService.swift`

`AVAudioEngine` → converte para `linear16 / 16 kHz / mono` → WebSocket **direto** para
`wss://api.deepgram.com/v1/listen`.

| Parâmetro | Valor |
|---|---|
| `model` | `nova-3` (env `DEEPGRAM_MODEL`) |
| `language` | `pt-BR` (env `DEEPGRAM_LANGUAGE`) |
| `interim_results` | `true` (parciais ao vivo) |
| `smart_format` / `punctuate` / `numerals` | `true` |
| `endpointing` | `300 ms` |
| `keyterm` | 1 query item por termo, vindo do backend |
| `AVAudioSession` | `.record` + `.measurement` + `.duckOthers` |

A engenharia de robustez está **madura** e é um ativo real: pré-aquecimento de token,
auto-reconexão (4 tentativas, com reset de orçamento só após 8 s de estabilidade), fallback
que reconecta sem keyterms quando a conexão com eles falha, dedupe de frase final,
fila de envio com drop acima de 64 buffers, tratamento de interrupção e route change.
**Isso não deve ser jogado fora numa troca de vendor** — é o custo escondido de migrar.

### Backend

- **`/api/deepgram/token`** — emite o token. Em produção está com
  `DEEPGRAM_SKIP_GRANT=true` + `DEEPGRAM_ALLOW_DIRECT_KEY=true`, ou seja, **a API key do
  Deepgram é entregue ao cliente**. O próprio comentário no código marca isso como
  "⚠️ NÃO É SEGURO PRA PRODUÇÃO".
- **`/api/transcribe`** — batch, `whisper-1` (env-gated para `gpt-4o-mini-transcribe`),
  com o glossário injetado como *prompt de estilo* + `stripPromptEcho()` +
  `normalizeAsrTranscript()`. Usado pelo Watch e como fallback.
- **`medicalGlossary.ts`** — 110 termos / 138 palavras no total, com narrowing por
  categoria já implementado (50–62 termos por categoria).

### Watch — já existe scaffold (`LaudoUSG-watch/LaudoUSGWatch/`)

`AudioRecorder` grava **AAC 16 kHz mono a 32 kbps** em arquivo → `TranscribeService` faz
upload para `/api/transcribe` → Whisper em batch. **Não é ao vivo.**

### Achados concretos do código (acionáveis hoje)

| # | Achado | Impacto |
|---|---|---|
| **A1** | O iOS chama `POST /api/deepgram/token` **sem `?category=`**. O backend então cai no `return ALL_MEDICAL_ASR_KEYTERMS` — 110 termos / 138 palavras — em vez dos 50–62 termos da categoria. | O narrowing por categoria existe e **nunca é usado**. Perde-se foco do biasing. |
| **A2** | ~~O teto de 500 tokens está sendo estourado.~~ **MEDIDO em 02/08 — hipótese própria derrubada.** Os keyterms funcionam em pt-BR, mas o efeito é **instável e não-monotônico** com o tamanho da lista. Ver §1.1. → **REABERTA em 06/08: o teto é REAL e virou o limite ativo. Ver §1.3.** | O problema é **relevância, não só tamanho**: 110 termos indiferenciados diluem o boost. |
| **A3** | ~~Snapshot antigo do nova-3 sem keyterm multilíngue.~~ **Descartado:** produção resolve `general-nova-3` versão `2026-05-11.12084`, que aceita keyterm em pt-BR (comprovado — com 4 termos o boost funciona). | Não é a causa. |
| **A4** | API key do Deepgram trafega para o cliente. | Risco de segurança/LGPD já sinalizado no próprio código. |
| **A5** | Watch grava a 32 kbps AAC. | Bitrate baixo para jargão médico; consoantes fricativas (que separam "hipo" de "hiper") são as primeiras a morrer na compressão. |

### 1.1 Medição de 02/08 — mesmo áudio, motores e configurações diferentes

Frase de teste sintetizada com TTS pt-BR (`say -v Luciana`), 25 s, contendo 8 termos de
jargão, 3 medidas e 1 acrônimo classificatório. **Ver a ressalva metodológica no fim.**

Referência: *"Tireoide tópica, com nódulo sólido **hipoecoico** …, medindo **dois vírgula três**
por **um vírgula oito** centímetros …, classificado como **TI-RADS quatro**. **Fígado** com
**esteatose** hepática leve. Vesícula biliar com **colelitíase**. **Rim** esquerdo com **cisto**
cortical **anecoico** de **um vírgula cinco** centímetros."*

| Termo | Apple `SpeechTranscriber` (on-device) | Deepgram nova-3 (produção) |
|---|---|---|
| hipoecoico | ❌ "e picoico" | ⚠️ "hipoicoico" → ✅ **com 4 keyterms** |
| esteatose | ❌ "estiaatose" | ✅ |
| colelitíase | ❌ "coleíase" | ✅ |
| anecoico | ❌ "anecico" | ✅ |
| cisto | ❌ "consisto" | ✅ |
| Rim | ❌ "rin" | ✅ |
| Fígado | ❌ "Fado" | ⚠️ "figado" (sem acento) |
| TI-RADS quatro | ❌ "TRA DS4" | ❌ "TRADS 4" |
| Lateralidade | ✅ | ✅ |
| Medidas | ⚠️ inconsistente ("2 vírgula três" e "1,5") | ⚠️ ponto decimal ("2.3", "1.5") — em pt-BR é vírgula |

**Placar de jargão: Apple 0/8 · Deepgram 5/8** (6/8 com keyterms enxutos).

> O Deepgram entendeu os termos que a Apple destruiu **no mesmo arquivo** — ou seja, a
> pronúncia sintética não é a explicação dos erros da Apple. Isso valida a comparação.

**Sobre os keyterms (o achado mais acionável):**

| Lista enviada | `hipoecoico` saiu certo? |
|---|---|
| 4 termos | ✅ |
| 50 termos (67 palavras) | ✅ |
| 55 · 60 · 65 termos | ❌ |
| 70 termos (93 palavras) | ✅ |
| 80 · 110 termos *(= produção hoje)* | ❌ |

O comportamento **não é monotônico**, então não é um teto sendo estourado silenciosamente —
é o boost sendo **diluído** por termos irrelevantes competindo no mesmo decode. A API não
emite nenhum warning. Conclusão prática: **listas curtas e relevantes valem mais que listas
grandes**, e o `?category=` sozinho (A1) não resolve — o glossário precisa ser enxugado e
priorizado por exame.

> ⚠️ **Ressalva:** n = 1 frase, áudio sintético. Isto é fumaça, não benchmark. Serve para
> ordenar hipóteses e mostrar que o efeito dos keyterms merece medição séria com áudio real
> — não para fechar número nenhum.

### 1.2 Benchmark de 03/08 — n=18, e a correção de duas conclusões minhas

Harness em `scratchpad/bench.py`: 6 ditados (tireoide, abdome, venoso, obstétrico, MSK,
mama), 3 condições cada (normal, rápido, **com ruído de sala a ~12 dB SNR**), 159 termos
avaliados. Métrica = **o termo saiu certo**, não WER.

**Duas coisas que eu afirmei em 02/08 e que a medição derrubou:**

1. *"Os keyterms não estão fazendo nada."* **Falso.** Com n=18 eles levam 68% → 77%. O
   teste de uma frase só me enganou.
2. *"O comportamento não-monotônico prova diluição por teto."* Era **ruído de n=1**. A
   diluição existe, mas é por **irrelevância**, não por estouro de limite.

| Configuração | Acerto de termo | + corretor determinístico |
|---|---|---|
| Sem keyterms | 68 % | 81 % |
| **110 termos — produção hoje** | **77 %** | 91 % |
| Por categoria (só passar `?category=`) | 78 % | 93 % |
| **Glossário focado (novo)** | 84 % | **94 %** |

**O que estava errado no glossário:** `medicalAsrKeytermsForCategory` injetava o bloco
obstétrico inteiro em **toda** categoria — um exame de tireoide carregava "Hadlock",
"Grannum", "oligoâmnio", "ducto venoso". E as categorias obstétricas nem existiam em
`CATEGORY_GROUPS`, então caíam no fallback de 110 termos. Depois: TIREOIDE 50 → 30 termos,
OBSTETRICA 110 → 38.

**O maior lever isolado é o corretor, não o glossário.** As falhas restantes são
sistemáticas e sempre iguais:

| Ditado | Sai como |
|---|---|
| hipoecoico · isoecoico | hipo**i**coico · iso**i**coico |
| BI-RADS · TI-RADS | birads · trads |
| Hadlock · Grannum · Hashimoto | adlock · granum · diacimoto |
| safena magna · retroareolar | saf**ei**na magna · retroar**i**olar |
| tendinopatia · amniótico · colelitíase | dinopatia · aniótico · coleíase |

Erro sistemático se conserta com **tabela**, não com mais biasing — e tabela é auditável,
testável e **independente do motor** (vale para o Deepgram hoje e para o `SpeechTranscriber`
amanhã). Implementado em `server/asr/medicalTermCorrector.ts`, plugado no
`normalizeAsrTranscript`, com teste que garante que texto já correto e termos legítimos
parecidos (`miométrio`, `colestase`) **não** são tocados.

> ⚠️ Continua sendo áudio sintético de uma única voz. Mede *fidelidade de termo em fala
> limpa e em ruído sintético* — não substitui o corpus real de ditados.

### 1.3 Achado de 06/08 — o teto de 500 tokens é real, e falha em silêncio

Ao promover o harness para `scripts/asr-bench/` e rodá-lo de novo, a config com o glossário
completo devolveu **0/159**. Não era diluição — eram **18 HTTP 400**, com a mensagem literal
da API:

```
Keyterm limit exceeded. The maximum number of tokens across all keyterms is 500.
```

**Isto reabre parcialmente o A2.** O que foi corretamente descartado em 02/08 foi o teto como
explicação do comportamento **não-monotônico** em listas de 55–70 termos — pequenas demais
para estourar nada. Mas o teto existe, e com o glossário crescendo ele virou o **limite
ativo**. Medido contra a API em 06/08 com este vocabulário: **137 palavras passam, 138 dão
400.** O limite real é em tokens de subpalavra; palavras são só um proxy.

**Por que isso é o pior tipo de bug:** o cliente iOS tem um fallback que reconecta **sem**
keyterms quando a conexão com eles falha — engenharia defensiva boa, que aqui vira máscara.
Estourar o teto não quebra nada visível: o ditado apenas despenca de ~85% para ~66% de
acerto de termo, sem erro em lugar nenhum.

**Como foi descoberto:** adicionar `"maior bolsão vertical"` (3 palavras) ao glossário levou
o fallback `ALL` de 135 para 138 palavras e passou a produzir 400 em toda requisição. O termo
foi encurtado para `"bolsão"` e o limite virou `KEYTERM_WORD_BUDGET` em `medicalGlossary.ts`,
com teste. **A folga hoje é de 1 palavra** — o `ALL` vive na beira do precipício.

**Consequência para o roadmap:** isto aumenta a urgência do A1. Enquanto o cliente não mandar
`?category=` sempre, é o `ALL` que vai para o ar — a maior e menos relevante das listas, e a
única que chega perto do teto. As listas focadas usam 32–51 palavras, com folga confortável.

| Config | Termos | Palavras | Deepgram |
|---|---|---|---|
| `ALL` (fallback de hoje) | 115 | **136** | ✅ (folga de 1) |
| TIREOIDE · MAMARIA | 30 | 32 | ✅ |
| OBSTETRICA | 39 | 47 | ✅ |
| MUSCULOESQUELETICO_V2 | 41 | 51 | ✅ |

---

## 2. Os eixos que importam (WER global é a métrica errada)

Para laudo, um erro **não vale o mesmo que outro**. Ordem de gravidade:

1. **Lateralidade** — "direita" ↔ "esquerda" é erro clínico grave.
2. **Números e unidades** — "2,3 × 1,8 cm" é o corpo do laudo. Já existe dívida conhecida
   aqui (o trabalho de numerais/ordinais do ASR, commit `c46676e`).
3. **Acrônimos classificatórios** — BI-RADS / TI-RADS / O-RADS / FIGO / Bosniak. O modo de
   falha clássico é virar "abirads".
4. **Jargão** — hipoecoico vs. hiperecoico vs. isoecoico; anecoico; ecogenicidade.
5. **Palavra comum** — o resto. É o que o WER mede, e é o que menos importa.

Os demais eixos de decisão: latência percebida, robustez a ruído (aparelho de US ligado,
ar-condicionado, gel), offline/privacidade (LGPD), e controlabilidade (biasing/prompt).

---

## 3. Comparativo dos motores

> ⚠️ **Aviso de honestidade metodológica:** quase todo número público de WER abaixo é
> (a) em **inglês**, (b) em áudio limpo genérico, e (c) publicado por vendor ou blog. Não
> existe benchmark público de **pt-BR médico**. Os números servem para ordenar candidatos
> para teste — **não** para escolher sem teste.

### 3.1 On-device Apple

| | `SpeechTranscriber` (SpeechAnalyzer) | `DictationTranscriber` | `SFSpeechRecognizer` (legado) |
|---|---|---|---|
| Introduzido | iOS/macOS **26** | iOS/macOS 26 | iOS 10 |
| pt-BR | ✅ `pt_BR` está nos 34 locales | ✅ | ✅ |
| WER (EN, medido por terceiros) | **2,12 %** limpo / **4,56 %** ruidoso | ~equivalente ao SFSpeech | **9,02 %** limpo / **16,25 %** ruidoso |
| Velocidade | ~3× Whisper Small | — | — |
| Biasing de vocabulário | ❌ **`contextualStrings` NÃO funciona aqui** | ✅ `AnalysisContext.contextualStrings` | ✅ `contextualStrings` (~100 frases) + **`SFSpeechLanguageModel`** (LM customizado, iOS 17+) |
| Áudio longo | ✅ desenhado para isso | ❌ enunciados curtos | ⚠️ limite prático ~1 min por request |
| watchOS | ❌ **não disponível** | ❌ | ❌ |
| Rede | ❌ nenhuma (100 % on-device) | ❌ nenhuma | ⚠️ `contextualStrings` **não funciona** com `requiresOnDeviceRecognition = true` |

**Esse é o sistema que o BRIX ADE usa** (o dono citou `SFSpeechRecognizer`). Observação
importante: `SFSpeechRecognizer` é a API **legada**. O ganho de ~75 % de WER veio da
reescrita que a Apple entregou em 2025 como `SpeechAnalyzer`/`SpeechTranscriber`. Se o BRIX
está em `SFSpeechRecognizer`, ele está na geração anterior — o que é comum, porque a nova
API perdeu o vocabulário customizado.

**O trade-off cruel para o caso de vocês:** o motor **mais preciso** da Apple é o que
**não** aceita glossário; o que aceita glossário é o **menos** preciso. Não dá para ter os
dois numa única passada. (Caminho intermediário: `SFSpeechLanguageModel` permite treinar um
LM a partir de *templates* — ex.: `"nódulo <ecogenicidade> medindo <n> vírgula <n>
centímetros"` — o que ataca justamente números e jargão. É trabalhoso e pouco documentado,
mas é a única forma de biasing on-device forte que a Apple oferece.)

### 3.2 Nuvem — streaming

| Motor | pt-BR | Biasing | Latência | Nota |
|---|---|---|---|---|
| **Deepgram Nova-3** *(atual)* | ✅ | Keyterms, **teto 500 tokens** | sub-300 ms | O que vocês já têm, com robustez madura em volta |
| **Deepgram Flux Multilingual** | ✅ (10 idiomas, GA 29/04/2026) | Keyterms | fim-de-turno < 400 ms | Desenhado para **agentes de voz** (turn-taking), não ditado longo — provável má escolha aqui |
| **ElevenLabs Scribe v2 Realtime** | ✅ (90+ idiomas) | Keyterms **até 1 000 termos** | **< 150 ms** | Menor WER entre os de baixa latência no FLEURS (30 idiomas) — o mais forte candidato multilíngue |
| **AssemblyAI Universal-3.5 Pro RT** | ✅ **pt-BR como idioma core**, com distinção pt-BR/pt-PT | `keyterms_prompt` **1 000 termos, sem custo extra** | 3 modos configuráveis | O teto de keyterms 10× maior que o Deepgram resolve A2 de forma limpa |
| **Speechmatics Ursa 2** | ✅ (55 idiomas, −18 % WER vs. Ursa 1) | ✅ | sub-1 s | Reputação específica em **números e nomes próprios** — exatamente o eixo #2 de vocês |
| **Soniox v5** | ✅ | `context.terms` | finais em ~249 ms (mediano) | Finais rápidos e estáveis — bom para legenda ao vivo |
| **OpenAI GPT-Transcribe / Realtime** | ✅ | **`prompt` livre + `keywords`** | via Realtime API | O `prompt` em linguagem natural é a forma mais expressiva de biasing do mercado |

### 3.3 On-device não-Apple

| Motor | pt-BR | Nota |
|---|---|---|
| **Parakeet TDT v3 (CoreML)** | ✅ (25 idiomas europeus, detecção automática) | Roda na Neural Engine; há variante **Parakeet-EOU-120M** streaming, ~232 MB, tempo real em celular |
| **WhisperKit** | ✅ | Whisper on-device em Swift; mais lento que Parakeet, mais maduro |

Valor estratégico: **offline total**. Numa clínica com Wi-Fi ruim, o ditado não morre. E
elimina a superfície LGPD do áudio saindo do device.

---

## 4. A arquitetura recomendada — duas trilhas

> **O transcript do streaming não precisa ser o input do laudo.**

Hoje ele é. Isso amarra tudo. Proposta:

```
                    ┌─────────────────────────────────────────┐
   microfone ──┬───▶│ TRILHA A — ao vivo (feedback visual)     │
                │    │ on-device, latência ~0, offline, grátis │
                │    └─────────────────────────────────────────┘
                │
                └───▶ buffer local do áudio completo
                            │
                            │  (no stop)
                            ▼
                     ┌────────────────────────────────────────┐
                     │ TRILHA B — a verdade                   │
                     │ batch, motor mais forte,               │
                     │ keyterms POR CATEGORIA + prompt         │
                     └────────────────────────────────────────┘
                            │
                            ▼
                     structurer → validador → RAG → writer
```

**Por que isso ganha:**

- **Desacopla os objetivos.** A trilha A só precisa parecer viva; a B só precisa acertar.
- **O custo de latência é zero na prática.** A geração do laudo já leva segundos. Uma
  segunda passada de 2–4 s desaparece dentro de um tempo de espera que já existe.
- **Permite A/B silencioso.** Rodar 2 motores na trilha B e comparar contra o
  `final_output` — vocês já têm a infraestrutura de boletim exatamente para isso.
- **Troca de vendor vira decisão reversível.** Mudar a trilha B não toca em UX nenhuma.
- **Resiliência.** Sem rede, a trilha A continua funcionando e a B enfileira.
- **Abre a porta para reconciliação.** Com o áudio completo em mãos, dá para rodar dois
  motores e usar um reconciliador **determinístico** — que só arbitra números, lateralidade
  e termos do glossário. Mantém a doutrina "sanity check nunca usa LLM".

**Versão barata (1 sprint):** manter o Deepgram no streaming exatamente como está e só
**adicionar** a segunda passada. Nenhum risco de regressão de UX.

---

## 5. Apple Watch — o que dá e o que não dá

**Fato duro:** `SpeechTranscriber` **não está disponível no watchOS**. O Watch captura; o
processamento acontece no iPhone ou na nuvem. O app do Granola para Apple Watch (lançado em
**28/07/2026** — quase certamente o que o usuário externo estava usando) faz exatamente
isso: grava no pulso, sincroniza o áudio para o iPhone, o iPhone processa.

**Por que faz mais sentido aqui do que em reuniões:** o ultrassonografista está com as duas
mãos ocupadas — transdutor numa, painel do aparelho na outra. O iPhone está longe, fora do
campo limpo. O pulso é a única superfície de controle que sobra.

| | Desenho | Esforço | Ganho | Risco |
|---|---|---|---|---|
| **W1** | **Watch como controle remoto.** iPhone/iPad continua sendo mic e cérebro. O Watch faz start/stop, "marcar achado", "próxima categoria", com confirmação háptica. | Baixo (WatchConnectivity já existe no projeto) | **Alto** — resolve o problema real (mãos ocupadas) sem tocar em ASR | Baixo |
| **W2** | **Watch como microfone remoto ao vivo.** PCM do Watch → iPhone via `WCSession` → iPhone faz o streaming. O pulso está mais perto da boca que o iPhone. | Alto | Médio | `WCSession` não foi feito para streaming contínuo; bateria; latência instável |
| **W3** | **Watch autônomo offline-first.** Grava local, sincroniza no fim (modelo Granola). | Médio | Médio | Sem feedback ao vivo; qualidade de mic do Watch |

**Ressalva honesta:** o microfone do Apple Watch é pior que o do iPhone e muito pior que o
de AirPods. Para jargão médico, isso importa. **W1 é o melhor retorno por esforço** — e o
scaffold de Watch já existe no repo.

---

## 6. O candidato que ninguém pediu e provavelmente ganha: AirPods

iOS 26 adicionou `AVAudioSession.CategoryOptions.bluetoothHighQualityRecording` — captura
Bluetooth em alta taxa de amostragem, com tuning que a Apple descreve como equivalente a um
microfone de lapela. Some a isso o controle hands-free pelo *stem* (AirPods Pro 2 / AirPods 4).

Mic a ~15 cm da boca em vez de ~1 m, com cancelamento de ruído do próprio hardware,
num ambiente com aparelho de US ligado. **O ganho de SNR provavelmente supera qualquer troca
de modelo** — e custa uma linha de configuração de sessão de áudio.

---

## 7. Como decidir (o protocolo que falta)

Sem isso, tudo acima é opinião informada. Proposta:

- **Corpus:** 30–50 ditados reais anonimizados, cobrindo as categorias principais e **dois
  ambientes** (sala silenciosa / sala com aparelho ligado). Vocês já têm corpus e boletins.
- **Métricas específicas, não WER global:**

| Métrica | O que mede | Por que |
|---|---|---|
| **Erro de lateralidade** | direita/esquerda | erro clínico grave |
| **NER** (number error rate) | medidas e unidades | é o corpo do laudo |
| **Acurácia de acrônimo** | BI-RADS / TI-RADS / O-RADS / FIGO | o modo de falha "abirads" |
| **TER** (term error rate) | os 110 termos do glossário | jargão |
| WER global | tudo | só como controle |

- **Casa com o que já existe:** a semântica `generated_output` (IA) vs. `final_output`
  (correção do médico) é exatamente o sinal necessário. O boletim diário vira o harness de
  avaliação de ASR sem infraestrutura nova.

---

## 8. Roadmap sugerido (ordenado por retorno ÷ esforço)

| Fase | O quê | Esforço |
|---|---|---|
| **F0** | Passar `?category=` no `/api/deepgram/token` (A1); medir o token count real dos keyterms e confirmar o snapshot do `nova-3` (A2/A3); fechar a API key direta (A4); ligar `bluetoothHighQualityRecording`; montar o eval set. | Dias |
| **F1** | Segunda passada em batch (dual-track), **mantendo** o streaming atual intacto. | 1 sprint |
| **F2** | Bake-off na trilha B com o eval set: Deepgram Nova-3 · ElevenLabs Scribe v2 · AssemblyAI Universal-3.5 Pro · Speechmatics Ursa 2 · GPT-Transcribe. | 1 sprint |
| **F3** | Trilha ao vivo on-device (`SpeechTranscriber`, iOS 26+) com fallback para Deepgram em iOS anterior. Mata latência e reduz superfície LGPD. | 1–2 sprints |
| **F4** | Watch **W1** (controle remoto). Reavaliar W2 depois. | 1 sprint |
| **F5** | Reconciliação/consenso de 2 motores + biasing forte na trilha B. | Contínuo |

---

## 9. Contrapontos (o que pode derrubar cada ideia)

- **`SpeechTranscriber` exige iOS 26+.** Qual é a distribuição real de versão na base de
  vocês? Sem isso, F3 vira feature de minoria e exige manter dois caminhos para sempre.
- **`SpeechTranscriber` não aceita glossário.** Num app cujo vocabulário é 100 % jargão,
  isso é uma limitação séria — mitigada pela trilha B (que carrega o biasing), mas real.
- **Trocar o vendor de streaming tem custo escondido alto.** A reconexão, o fallback de
  keyterms e o dedupe de vocês são maduros e foram pagos com dor. Refazer isso em outro
  vendor por um ganho de WER não medido é mau negócio — **é justamente por isso que a
  segunda passada é o movimento mais inteligente**: ganho de qualidade, risco zero de UX.
- **Números de WER públicos são em inglês.** Repetindo: nada aqui substitui medir em
  pt-BR médico com o corpus real.

---

## Fontes principais

- Apple — [`SpeechTranscriber`](https://developer.apple.com/documentation/speech/speechtranscriber) ·
  [WWDC25 277](https://developer.apple.com/videos/play/wwdc2025/277/) ·
  [WWDC25 251 (áudio/AirPods)](https://developer.apple.com/videos/play/wwdc2025/251/) ·
  [forum: `AnalysisContext`](https://developer.apple.com/forums/thread/811083)
- [SpeechAnalyzer vs SFSpeechRecognizer](https://blakecrosley.com/blog/speech-framework-vs-sfspeechrecognizer) ·
  [guia iOS 26](https://antongubarenko.substack.com/p/ios-26-speechanalyzer-guide)
- Deepgram — [Keyterm Prompting](https://developers.deepgram.com/docs/keyterm) ·
  [Nova-3 multilíngue + keyterms](https://deepgram.com/learn/deepgram-expands-nova-3-with-10-new-languages-and-multilingual-keyterm-prompting) ·
  [Flux Multilingual](https://deepgram.com/learn/deepgram-launches-flux-multilingual-press-release)
- [AA-WER Streaming benchmark](https://artificialanalysis.ai/articles/new-streaming-speech-to-text-benchmark-aa-wer-streaming) ·
  [Coval — STT independente](https://www.coval.ai/blog/best-speech-to-text-providers-in-2026-independent-benchmarks-and-how-to-choose/)
- [Granola no Apple Watch (9to5Mac, 28/07/2026)](https://9to5mac.com/2026/07/28/granola-meeting-notepad-comes-to-watchos-as-apple-watch-becomes-an-ai-device/)
- [Parakeet TDT v3 CoreML](https://huggingface.co/FluidInference/parakeet-tdt-0.6b-v3-coreml)
- [Laudos.AI — jargão radiológico pt-BR](https://www.laudos.ai/blog/transcricao-ptbr-jargao-radiologico) *(concorrente direto; leitura útil)*
