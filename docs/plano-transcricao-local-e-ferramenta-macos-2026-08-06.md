# Transcrição local — ferramenta macOS própria + ASR on-device nos apps

**Data:** 2026-08-06
**Documento anterior:** `docs/brainstorm-transcricao-ao-vivo-2026-08-02.md` (auditoria do
sistema atual, benchmark n=18, comparativo de motores de nuvem). **Este doc não repete
aquele** — assume-o lido e vai adiante em duas frentes novas.

> **Este documento é autocontido de propósito.** A ideia é que ele possa ser copiado para
> uma pasta nova e servir de ponto de partida de um projeto do zero, sem precisar do resto
> do repositório do LaudoUSG.

---

## 0. As três conclusões

1. **A ferramenta de ditado do Mac não precisa ser escrita do zero.** O
   [VoiceInk](https://github.com/Beingpax/VoiceInk) já é *exatamente* o que foi descrito:
   Swift nativo, 100% local, perfis por aplicativo, dicionário customizado. A decisão real
   não é técnica, é de **licença** (GPLv3) — ver §1.3.
2. **ASR on-device ao vivo em pt-BR existe pronto hoje — mas sem glossário.** O modelo certo
   (Nemotron 3.5 streaming) roda no iOS e no Android desde junho/2026. O que ele **não** faz
   é aceitar biasing: o decoder online dele é *greedy-only*, e no sherpa-onnx hotwords
   exigem `modified_beam_search` (§2.2.1). Como o glossário é o que leva vocês de 68% a 84%
   de acerto de termo, o ganho real do on-device continua sendo **offline e privacidade**,
   não precisão. A boa notícia: o que falta é um port de C++ **identificável e finito**,
   não pesquisa.
3. **Eu estava parcialmente errado sobre o Apple Watch.** O que você viu é real e é uma API
   pública desde sempre — só não é um motor de ASR de terceiros. Ver §2.5.

---

# PARTE I — Ferramenta macOS nativa de ditado

## 1.1 O objetivo

Um "Wispr Flow próprio": ditado global no Mac, atalho de teclado, 100% local, gratuito,
com **perfis por contexto** (ditar laudo ≠ escrever prompt ≠ responder e-mail) e com o
**vocabulário médico do LaudoUSG** embutido.

## 1.2 Por que o VoiceInk é a base certa

| Requisito | VoiceInk | Handy |
|---|---|---|
| Swift nativo macOS | ✅ | ❌ (Tauri: Rust + React + WebView) |
| Motores locais | whisper.cpp **+ Parakeet via FluidAudio** | whisper.cpp + Parakeet V3 |
| **Perfis por app** ("Power Mode") | ✅ detecta o app em foco e troca config | parcial |
| **Dicionário customizado** | ✅ termos + substituições | via extensão Raycast |
| Pós-processamento por LLM | ✅ | — |
| Licença | **GPLv3** ⚠️ | **MIT** ✅ |
| macOS mínimo | 14.4 | — |
| Maturidade | 5.8k ★ · 1.596 commits | 28.9k ★ · 783 commits |

O **Power Mode** do VoiceInk é literalmente o "direcionado a diversos usos conforme
necessário": ele detecta em qual aplicativo você está e aplica prompt, dicionário e
pós-processamento diferentes por contexto.

**O Handy é mais popular, mas é a base errada aqui** — é Tauri, ou seja, WebView. Se o
objetivo declarado é *Swift nativo macOS*, o VoiceInk já é isso e o Handy nunca será.

## 1.3 A armadilha da licença — leia antes de forkar

**VoiceInk é GPLv3.** Consequência prática:

- **Uso pessoal, sem distribuir:** GPL não te obriga a nada. Pode forkar, modificar e usar
  para sempre sem publicar uma linha.
- **Distribuir para qualquer pessoa** (mesmo de graça, mesmo para um colega): você é
  obrigado a publicar o código-fonte do seu fork sob GPLv3.
- **Comercializar fechado ou embutir no LaudoUSG:** **impossível** sem reescrever.

**Handy é MIT** — sem nenhuma dessas amarras, e o próprio README declara a intenção de ser
"o mais forkável possível".

### A decisão, em três caminhos

| Caminho | Quando faz sentido | Custo |
|---|---|---|
| **A. Usar o VoiceInk como está** | Ferramenta pessoal. É o caminho padrão. | Zero |
| **B. Forkar o VoiceInk** | Pessoal, mas você quer o corretor médico embutido | Dias · GPL te prende se um dia distribuir |
| **C. App Swift novo, VoiceInk como referência de arquitetura** | Se algum dia isso puder virar produto ou entrar no LaudoUSG | Semanas · liberdade total |

> **Recomendação:** comece por **A**. Use por uma semana antes de escrever qualquer código.
> Metade das features que você imagina querer, o VoiceInk já tem; e a outra metade você só
> descobre usando. Se depois disso o incômodo persistir, vá para **C** — não para **B**,
> porque B te dá o trabalho de um fork com a limitação jurídica de um refém.

## 1.4 O que o VoiceInk ensina (a arquitetura que qualquer versão sua vai precisar)

Independentemente do caminho, um app de ditado global no macOS tem estas peças. Vale mapear
agora porque **é aqui que mora o trabalho real** — o ASR em si é a parte fácil:

1. **Hotkey global** — `CGEvent` tap ou `NSEvent.addGlobalMonitorForEvents`. Exige
   permissão de Acessibilidade.
2. **Captura de áudio** — `AVAudioEngine`, converter para 16 kHz mono `linear16`.
   *Isto vocês já resolveram no `DeepgramLiveService.swift` — o código é reaproveitável.*
3. **VAD** — para não transcrever silêncio (é onde o Whisper alucina).
4. **Motor de ASR** — whisper.cpp (GGUF) ou Parakeet via
   [FluidAudio](https://github.com/FluidInference/FluidAudio) (CoreML/ANE, Apache-2.0).
5. **Pós-processamento** — ← **o diferencial de vocês, ver §1.5**
6. **Injeção de texto** — colar no app em foco. Na prática: escrever no pasteboard e
   sintetizar ⌘V, porque digitação sintética caractere a caractere é lenta e frágil.
7. **Detecção do app em foco** — `NSWorkspace.shared.frontmostApplication` → seleciona o
   perfil. É o Power Mode inteiro, em uma linha.

## 1.5 O diferencial que só vocês podem construir

Nenhum app de prateleira sabe que "hipoicoico" não existe em português. Vocês sabem, e a
tabela já está escrita e testada:

- `apps/api/src/server/asr/medicalTermCorrector.ts` — 20+ correções sistemáticas
- `apps/api/src/server/asr/medicalGlossary.ts` — glossário por categoria de exame
- `apps/api/src/server/asr/dateNormalizer.ts` — datas faladas → `dd/mm/aaaa`
- `apps/api/src/server/asr/languageNumberNormalizer.ts` — numerais e ordinais

Essa camada foi escrita desde o início para ser **independente do motor** — vale para o
Deepgram hoje, para o `SpeechTranscriber` amanhã e para o whisper.cpp no Mac.

> **Sugestão de arquitetura:** extrair a tabela de correções para um **JSON compartilhado**
> (`asr-corrections.json`), lido tanto pelo TypeScript do backend quanto pelo Swift do app
> de Mac. Uma tabela, dois consumidores, zero divergência. Hoje a tabela é código TS com
> `RegExp` — a migração é mecânica e vale a pena antes de existir um segundo consumidor.

## 1.6 O bônus estratégico: isso vira o laboratório de ASR

O doc de 02/08 termina dizendo que falta um **protocolo de decisão** — corpus real, métricas
específicas (lateralidade, NER, acrônimo, TER), bake-off entre motores.

**Este app é esse laboratório.** Você dita uma vez, ele roda dois motores em paralelo e
mostra lado a lado. Uso pessoal e harness de avaliação no mesmo binário. É o argumento mais
forte para construí-lo — mais forte que a conveniência do ditado.

## 1.7 Fases sugeridas (caminho C)

| Fase | Entrega | Esforço |
|---|---|---|
| **0** | Usar o VoiceInk puro por 1 semana. Anotar o que falta. | — |
| **1** | App Swift mínimo: hotkey → grava → whisper.cpp → cola. Sem UI. | Dias |
| **2** | Camada de pós-processamento com o `medicalTermCorrector` portado. | Dias |
| **3** | Perfis por app (`frontmostApplication` → config). | Dias |
| **4** | Segundo motor (Parakeet/FluidAudio) + modo comparação lado a lado. | 1 semana |
| **5** | Refinos: menu bar, indicador visual, histórico. | Contínuo |

---

# PARTE II — ASR on-device ao vivo nos apps (iOS / Android)

## 2.1 O ponto que decide tudo: Whisper não é arquitetura de streaming

Whisper é encoder-decoder com **janela fixa de 30 s**. Não foi desenhado para emitir palavra
a palavra. Todo projeto "whisper real time" faz janela deslizante + re-transcrição, com três
consequências estruturais:

- latência de segundos, não de centenas de milissegundos;
- **o texto muda retroativamente** na tela — para ditado, é péssimo: você lê e o que leu se reescreve;
- alucinação em silêncio (o modo de falha assinatura do Whisper).

A arquitetura correta para ditado ao vivo é **transducer** (RNNT/TDT) com *cache-aware
streaming*: emite e não volta atrás. É o que o Deepgram nova-3 é por dentro, e é por isso
que ele "parece vivo".

> **Consequência prática:** faster-whisper, Scriberr, whisper_real_time e o "Live Mode" do
> TranscriptionSuite estão todos do lado errado dessa linha. Servem para batch (trilha B),
> não para a trilha ao vivo.

## 2.2 O que existe pronto — o mapa

| Opção | Plataforma | Streaming real | pt-BR | Biasing | Veredito |
|---|---|---|---|---|---|
| **Apple `SpeechTranscriber`** (iOS 26+) | iOS/macOS | ✅ | ✅ | ❌ | **Já integrado no app de vocês** — ver §2.3 |
| **`SFSpeechRecognizer`** (legado) | iOS 10+ | ✅ | ✅ | ✅ `contextualStrings` + `SFSpeechLanguageModel` | Menos preciso, mas é o único on-device Apple **com glossário** |
| [**FluidAudio**](https://github.com/FluidInference/FluidAudio) + Parakeet TDT v3 | iOS/macOS (CoreML/ANE) | ⚠️ streaming só EN (`Parakeet EOU 120m`) | ✅ (batch) | ❌ | Apache-2.0. Batch excelente (~190× RTF no M4 Pro) |
| [**sherpa-onnx**](https://github.com/k2-fsa/sherpa-onnx) | **iOS + Android + 9 outras** | ✅ (Zipformer/transducer) | via modelo | limitado | **A opção multiplataforma.** Tem APK de demo real-time |
| [**react-native-sherpa-onnx**](https://github.com/XDcobra/react-native-sherpa-onnx) | iOS 13+ / Android 24+ | ✅ | via modelo | limitado | TurboModule, MIT. **Caminho direto para o app Android RN de vocês** |
| [**Nemotron-3.5-ASR-streaming-0.6b**](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b) | modelo, não runtime | ✅ chunks 80 ms–1120 ms | ✅ **pt-BR, WER 5,48%** | ❌ **greedy-only, ver §2.2.1** | **O modelo tecnicamente certo.** Licença OpenMDW-1.1 (comercial OK) |
| [**Picovoice Cheetah**](https://picovoice.ai/docs/cheetah/) | iOS/Android | ✅ | ✅ | ⚠️ vocabulário **compilado** em outro modelo, não lista dinâmica | Comercial/proprietário. Único pronto que junta streaming + pt-BR + vocabulário |
| **`SFSpeechRecognizer`** com `requiresOnDeviceRecognition` | iOS | ✅ | ✅ | ⚠️ `contextualStrings` — **conflito não resolvido, ver §2.2.2** | Vale um teste de 1 dia no aparelho |
| **Android 13+ `createOnDeviceSpeechRecognizer()`** | Android | ✅ | ✅ | ⚠️ `EXTRA_BIASING_STRINGS` — **a doc avisa que o reconhecedor pode ignorar** | Experimento, não fundação |
| [**Vosk**](https://alphacephei.com/vosk/models) | iOS/Android | ✅ | ⚠️ WER **32,6%** (Common Voice) / **68,9%** (CORAA) | gramática em runtime (restringe, não faz boosting suave) | **Descartar** sem LM médico próprio |
| **whisper.rn / WhisperKit** | iOS/Android | ❌ (ver §2.1) | ✅ | `initial_prompt` | Só para batch |

### 2.2.1 O achado que decide o caminho: o Nemotron roda, mas não aceita hotwords

> **Correção de uma versão anterior deste doc**, que dizia que a variante multilíngue do
> Nemotron ainda não existia no sherpa-onnx. Existe. Mas a conclusão prática não mudou —
> mudou o motivo, e o motivo novo é muito mais específico e acionável.

Duas verdades que precisam ser lidas juntas:

1. **A issue #3664 foi fechada.** O
   [PR #3671](https://github.com/k2-fsa/sherpa-onnx/pull/3671) foi mergeado em **12/06/2026**
   e adicionou o `prompt_index`, o mapa de idiomas no metadata do ONNX e seleção de idioma
   **por stream** (`SherpaOnnxOnlineStreamSetOption(stream, "language", "pt")`). Há pacotes
   INT8 prontos para chunks de 80 / 160 / 560 / 1120 ms, com bindings C, C++, Swift e Flutter.
   **O modelo roda em pt-BR, hoje, no iOS e no Android.**
2. **Mas ele não consegue usar hotwords.** O mecanismo de biasing do sherpa-onnx é um
   **grafo contextual Aho–Corasick**, e a documentação é explícita: *"you have to change the
   decoding method to `modified_beam_search` to use hotwords. The default decoding method
   `greedy_search` does not support hotwords."* E o decoder online do NeMo/Nemotron —
   `online-recognizer-transducer-nemo-impl.h` — **só implementa `greedy_search`**. O próprio
   PR #3671 mexe no `online-transducer-greedy-search-nemo-decoder`.

O [PR #3077](https://github.com/k2-fsa/sherpa-onnx/pull/3077) adicionou `modified_beam_search`
+ hotwords para modelos NeMo/TDT **offline** (inclusive Parakeet). **Não** tocou no decoder
online do Nemotron.

**"Expõe `hotwordsFile`" ≠ "hotwords funcionam".** O
[react-native-sherpa-onnx](https://github.com/XDcobra/react-native-sherpa-onnx) expõe
`hotwordsFile` (inclusive por stream) em `src/stt/index.ts:107`, mas está **pinado no
sherpa-onnx 1.12.35** — precisa de bump do binário nativo para pegar o Nemotron multilíngue,
e mesmo depois disso a limitação greedy-only continua de pé.

> **Consequência:** o trabalho que destrava o glossário on-device é **identificável e
> limitado** — portar `modified_beam_search` + `ContextGraph` para o decoder online do NeMo.
> Não é pesquisa, é engenharia de C++ num arquivo conhecido. Não é pequeno, mas é finito.
> Só não vale começar por aí: primeiro medir se o Nemotron sem biasing já ganha do Deepgram
> nos termos críticos. Se não ganhar, o fork não salva.

### 2.2.2 Conflito em aberto: `contextualStrings` on-device no iOS

O doc de 02/08 afirma que `contextualStrings` **não funciona** com
`requiresOnDeviceRecognition = true`. Uma revisão independente aponta o contrário, citando a
[sessão de customização on-device da WWDC23](https://developer.apple.com/videos/play/wwdc2023/10101/).

**Não resolvi essa contradição** — e ela importa, porque se `contextualStrings` funcionar
on-device em pt-BR, o `SFSpeechRecognizer` vira o único caminho on-device com glossário que
não exige forkar C++. **É um teste de um dia no aparelho** e deve ser feito antes de
qualquer decisão maior.

### 2.2.3 Disco e RAM — o custo real

| | Tamanho |
|---|---|
| Pacote ONNX INT8 oficial | **~650 MB** (encoder 627 · decoder 14 · joiner 9) |
| [Port CoreML INT8](https://huggingface.co/aufklarer/Nemotron-3.5-ASR-Streaming-0.6B-CoreML-INT8) | **612 MB** |
| RSS medido (M5 Pro, CoreML) | **1.046 MB** após carregar · **1.238 MB** de pico |

Para celular, reservar **1,0–1,5 GB de RAM real**. Isso significa:

- **viável** como *download opcional* em aparelhos de 6–8 GB de RAM;
- **não embutir** no pacote principal do app;
- em iPhones de 4 GB e Androids de 4–6 GB, risco alto de *jetsam*/OOM, lentidão e thermal
  throttling;
- no Android, **não presumir** que NNAPI/QNN vai acelerar o grafo inteiro — testar CPU,
  latência sustentada por 20 min e temperatura em aparelho real.

> A medição de RAM em Android mid-range **não existe publicamente**. O intervalo acima é
> estimativa derivada do CoreML, não dado confirmado.

## 2.3 O que **já existe** no código de vocês (e ninguém ligou)

Isto foi a descoberta mais útil da investigação. No repo Swift, branch
`feat/hard-mode-toggle`, **não commitado**:

```
?? LaudoUSG/Services/AppleSpeechLiveService.swift    ← SpeechTranscriber on-device
?? LaudoUSG/Services/LiveMicEngine.swift             ← protocolo que abstrai o motor
?? LaudoUSG/Models/AppExperiments.swift
 M LaudoUSG/Features/Generate/GenerateViewModel.swift
```

E em `GenerateViewModel.swift`:

```swift
/// EXPERIMENTO: a categoria TESTE dita pelo `SpeechTranscriber` da Apple
/// (on-device, sem rede, sem keyterms). Todas as outras seguem no Deepgram.
private func engine(for category: ReportCategory) -> any LiveMicEngine {
    deepgram.categoryCode = category.rawValue   // ← o fix A1, também já feito
    guard category == .teste else { return deepgram }
    if #available(iOS 26.0, *) { ... return onDeviceEngine ?? deepgram }
    return deepgram
}
```

**Ou seja: o experimento on-device está construído, com fallback seguro, isolado na
categoria TESTE.** Falta commitar, buildar e rodar. Não falta código.

### Por que faltou espaço — e como resolver

O `SpeechTranscriber` **não embute o modelo no app**. Ele baixa via `AssetInventory`, e os
modelos são **assets compartilhados do sistema**. A documentação da Apple é explícita em
dois pontos que explicam exatamente o seu sintoma:

- há um **limite de locales alocados simultaneamente** — estourou, precisa
  `deallocate` de outro antes;
- **o sistema apaga os modelos quando o disco fica cheio** — e a falha aparece como
  `"asset not found after attempted download"`, que não parece erro de espaço.

**Como destravar:**
1. Liberar espaço no iPhone (é literalmente o pré-requisito).
2. Chamar `AssetInventory.assetInstallationRequest(supporting:)` → `downloadAndInstall()`
   **antes** de iniciar a sessão, com UI de progresso — não no meio da gravação.
3. Tratar o erro de asset ausente caindo no Deepgram silenciosamente (o `?? deepgram`
   já faz isso).
4. Bônus: se o iOS já baixou pt-BR para o ditado do sistema, o asset é **compartilhado** e
   sai de graça.

## 2.4 O trade-off honesto do on-device

**O que se ganha:** offline total (clínica com Wi-Fi ruim não trava o ditado), latência ~0,
custo marginal zero, superfície LGPD do áudio eliminada, independência de vendor.

**O que se perde:** o benchmark de 03/08 mediu Deepgram em **68% sem keyterms → 77% com →
84% com glossário focado**. O `SpeechTranscriber` **não aceita glossário** — e no teste de
02/08 fez **0/8** nos termos de jargão contra 5/8 do Deepgram.

> **A conclusão:** o on-device de prateleira, hoje, é **pior no jargão** — que é justamente
> o que dói. Ele não é substituto do Deepgram. É a **trilha ao vivo** (feedback visual) de
> uma arquitetura de duas trilhas, onde a trilha B — batch, no stop, com biasing forte — é
> quem entrega a verdade para o laudo. É a fase F3 do roadmap de 02/08, e a ordem importa:
> F1 (segunda passada) antes de F3 (on-device ao vivo).

## 2.4.1 Armadilhas clínicas do biasing (o contraponto que faltava)

Estas vieram de uma revisão adversarial e **atacam o método deste projeto**, não só as
opções técnicas. Ficam registradas porque são as mais fáceis de ignorar:

1. **Boosting cria falso positivo, e o falso positivo aqui é clínico.** Medir *hotword
   recall* e esquecer a taxa de falso positivo é o erro clássico. Forçar "direita",
   "esquerda" ou "TI-RADS 5" pode transformar **ruído acústico em erro clínico confiante** —
   que é pior que a omissão, porque não parece erro.
2. **O número "94% com corretor" pode estar escondendo dano.** Ele mede o ganho, não o
   estrago. Medir separado: (a) acerto bruto do motor, (b) ganho do corretor, (c)
   **quantos termos já corretos o corretor quebrou**. Hoje a suíte tem uma lista de
   "não pode estragar" escolhida a dedo — isso protege contra regressão conhecida, mas
   **não é uma taxa medida sobre corpus**.
3. **Nunca persistir parcial de streaming como texto definitivo.** RNNT revisa hipóteses:
   lateralidade e números podem mudar até o endpoint. O que aparece na tela ao vivo não é
   o que deve ir para o laudo.
4. **18 áudios sintéticos de uma voz não são GO clínico.** Servem para comparação
   controlada. Faltam: áudio real durante exame, ruído do aparelho, máscara, microfones
   diferentes, Bluetooth, fala acelerada, sotaques e a auxiliar falando por cima.

## 2.4.2 O próximo teste, definido

Rodar o **Nemotron ONNX oficial com `language=pt-BR`**, chunks de **560 ms e 1120 ms**,
contra **Deepgram** e **Picovoice Cheetah**, no mesmo conjunto, medindo os eixos clínicos
(lateralidade · números · acrônimos · jargão) — não WER global.

**Só se o Nemotron vencer nos termos críticos** é que faz sentido avaliar o fork do decoder
NeMo online para adicionar `modified_beam_search` + `ContextGraph` (§2.2.1). Hoje esse
caminho de hotwords não vem pronto, e começar por ele seria pagar antes de saber se compra.

## 2.5 Apple Watch — a correção

**Eu disse que o Watch não transcreve. Estava parcialmente errado.** O que você viu é real:

- watchOS tem **ditado de sistema** acessível a qualquer app de terceiros, via
  `presentTextInputController(withSuggestions:allowedInputMode:completion:)` (WatchKit) ou
  `TextField` no SwiftUI. O usuário fala, o app recebe uma `String`. É API pública e antiga.
- A partir do **Apple Watch Series 9 (chip S9)**, parte disso roda **on-device** — a Apple
  anunciou Siri offline e **+25% de precisão de ditado** vs. Series 8.
- Então "transcrever na tela do Watch para mandar comando ao Mac" é exatamente isso: ditado
  de sistema + envio da string. Nada exótico.

**O que continua verdadeiro e não muda:**

- `SpeechTranscriber` / `SFSpeechRecognizer` **não existem no watchOS**. Você não controla o
  motor, não recebe áudio, não faz streaming e **não injeta glossário**.
- Um transducer de 0.6 B não cabe no orçamento de RAM/ANE/bateria do relógio.

**A consequência prática é boa:** para **comando** ("próxima categoria", "marcar achado",
"gerar laudo"), o ditado de sistema do Watch é **suficiente e grátis** — vocabulário
pequeno, fechado e sem jargão. Para **ditar o laudo**, continua fora de questão. Isso
reforça o W1 do doc anterior (Watch como controle remoto), agora com uma capacidade a mais
do que eu havia creditado: **comando por voz, não só por toque.**

## 2.6 Os 5 repositórios pesquisados — veredito

| Repo | Veredito |
|---|---|
| [Echo-Chamber](https://github.com/obsidian-ridge-labs/Echo-Chamber) | **0 ★, 2 commits — não há código utilizável.** É a vitrine de um app pago. Vale como prova de que a arquitetura (Parakeet TDT v3 + WhisperKit fallback, on-device) já está em produção comercial |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Maduro, MIT, ~4× mais rápido, INT8, VAD Silero, `initial_prompt`/`hotwords`. **Python de servidor** — não vai para dentro de app mobile. Candidato legítimo para a trilha B batch |
| [TranscriptionSuite](https://github.com/homelab-00/TranscriptionSuite) | GPLv3. Electron + Python + Docker = peso morto para ditado no Mac. Bom **catálogo** de backends, base ruim |
| [whisper_real_time](https://github.com/davabase/whisper_real_time) | Demo educacional: 2.9k ★ mas **16 commits**, sem VAD. **Não usar.** Vale como ilustração do §2.1 |
| [Scriberr](https://github.com/rishikanthc/Scriberr) | MIT, bem-feito, mas **batch** e desenvolvimento pausado. Resolve um problema que vocês não têm |

**O padrão:** os 5 são *Whisper/Parakeet batch em desktop*. Nenhum ataca streaming + mobile +
pt-BR + jargão médico. Bom para mapear o terreno; a resposta não está neles.

---

# PARTE III — O que foi feito no backend em 06/08

Três correções determinísticas, com teste, todas em `apps/api/src/server/asr/`:

### 1. Data em forma mista (`dateNormalizer.ts`)

O `"25 do 02 de 2026"` passava intacto. O normalizador só cobria a forma por extenso
(`"vinte e cinco de fevereiro de..."`) e a forma `"barra"`. A forma mista é o que o Deepgram
devolve quando o `numerals=true` já converteu dia e mês em dígitos e só a preposição
sobreviveu. Não é ambígua → agora reconstrói de verdade.

```
"DUM 25 do 02 de 2026"  →  "DUM 25/02/2026"
"DUM 31 do 02 de 2026"  →  "DUM 31 do 02 de 2026 [REVISAR]"   (data impossível: nunca inventa)
"Data 2 do 3 de 2020 e 6" → "... [REVISAR]"                    (garble: regra antiga preservada)
```

### 2. `bolsão` (`medicalTermCorrector.ts` + `medicalGlossary.ts`)

Dois erros empilhados na mesma frase:

```
"1 maior boçao vertical de 4,2 cm"  →  "o maior bolsão vertical de 4,2 cm"
```

- **grafia:** `boçao|boção|bolção|bolçao|bolsao` → `bolsão`. Nenhuma dessas existe em
  português; `bolsa` (amniótica) não casa, porque o limite de palavra exige o `-ão`.
- **artigo:** o Deepgram ouve "o maior" como "um maior" e o `numerals=true` converte para
  "1 maior". Regra restrita a `1 (maior|menor) bolsão` **de propósito** — "o"/"a" têm
  gênero, e adivinhar errado estraga a frase.
- **glossário:** `"maior bolsão vertical"` entrou nos keyterms obstétricos. Estava fora,
  apesar de ser a medida que **decide oligo/polidrâmnio**. OBSTETRICA: 38 → 39 termos.

### 3. `?category=` no `/api/deepgram/token` — **já estava feito**

O backend sempre leu `?category=`. O app iOS também já monta a query e o
`GenerateViewModel` já atribui `deepgram.categoryCode` antes do prewarm. **O achado A1 do
doc de 02/08 está resolvido no código** — mas está *não commitado* no repo Swift, branch
`feat/hard-mode-toggle`, junto com o experimento on-device da §2.3.

> **Portanto o pendente aqui não é código, é entrega:** commitar, buildar e instalar.
> Enquanto isso não acontece, produção continua mandando os 110 termos indiferenciados.

**Validação:** `medicalGlossary`, `medicalTermCorrector` e `transcriptNormalizer` (26/26)
passam; `pnpm -F api typecheck` limpo.

---

## Referências

**Ferramenta macOS:** [VoiceInk](https://github.com/Beingpax/VoiceInk) (GPLv3) ·
[Handy](https://github.com/cjpais/Handy) (MIT) ·
[FluidAudio](https://github.com/FluidInference/FluidAudio) (Apache-2.0)

**On-device mobile:** [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) ·
[hotwords / ContextGraph](https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html) ·
[PR #3671 — Nemotron multilíngue](https://github.com/k2-fsa/sherpa-onnx/pull/3671) ·
[PR #3077 — beam search + hotwords NeMo offline](https://github.com/k2-fsa/sherpa-onnx/pull/3077) ·
[guia Nemotron streaming](https://k2-fsa.github.io/sherpa/onnx/nemo/nemotron-streaming.html) ·
[react-native-sherpa-onnx](https://github.com/XDcobra/react-native-sherpa-onnx) ·
[Parakeet TDT v3 CoreML](https://huggingface.co/FluidInference/parakeet-tdt-0.6b-v3-coreml) ·
[Nemotron-3.5-ASR-streaming-0.6b](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b) ·
[port CoreML INT8](https://huggingface.co/aufklarer/Nemotron-3.5-ASR-Streaming-0.6B-CoreML-INT8) ·
[Picovoice Cheetah](https://picovoice.ai/docs/cheetah/) ·
[Vosk models](https://alphacephei.com/vosk/models)

**Revisão adversarial:** consulta ao Codex via MedMaestri em 06/08 (6m33s) — leitura do
código-fonte do `sherpa-onnx` e do `react-native-sherpa-onnx`. As duas afirmações que
derrubaram a versão anterior deste doc (PR #3671 mergeado · hotwords exigem
`modified_beam_search`) foram **verificadas de forma independente** antes de entrar aqui.

**Apple:** [SpeechAnalyzer — WWDC25 277](https://developer.apple.com/videos/play/wwdc2025/277/) ·
[guia SpeechAnalyzer](https://antongubarenko.substack.com/p/ios-26-speechanalyzer-guide) ·
[AssetInventory e assets pré-instalados](https://developer.apple.com/forums/thread/788581) ·
[erro "asset not found after attempted download"](https://developer.apple.com/forums/thread/797835) ·
[Apple Watch Series 9 — Neural Engine e ditado](https://www.apple.com/newsroom/2023/09/apple-introduces-the-advanced-new-apple-watch-series-9/)

**Batch / referência:** [faster-whisper](https://github.com/SYSTRAN/faster-whisper) ·
[Scriberr](https://github.com/rishikanthc/Scriberr) ·
[TranscriptionSuite](https://github.com/homelab-00/TranscriptionSuite) ·
[whisper_real_time](https://github.com/davabase/whisper_real_time) ·
[Echo-Chamber](https://github.com/obsidian-ridge-labs/Echo-Chamber)
