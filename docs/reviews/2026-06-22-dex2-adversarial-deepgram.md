# Review adversarial — paridade RN Android vs Swift iOS: voz Deepgram live

Resumo cético: portar a VOZ do Swift para RN é viável, mas não é “trocar uma função de gravação”. O caminho atual RN (`expo-av`) só grava arquivo m4a e faz upload batch para Whisper; ele não entrega PCM em tempo real. Para chegar perto do Swift, o app Android precisa de uma camada nativa de captura PCM ou migrar para uma API Expo mais nova que exponha stream PCM. Isso muda o risco do projeto: deixa de ser tarefa JS/Expo simples e vira tarefa de áudio nativo + WebSocket + validação em device Android real.

## Evidência local

Swift referência:

- `Services/DeepgramLiveService.swift:35` descreve streaming ao vivo com Deepgram.
- `Services/DeepgramLiveService.swift:77` define alvo `pcmFormatInt16`, `sampleRate: 16000`, `channels: 1`.
- `Services/DeepgramLiveService.swift:199` conecta em `wss://api.deepgram.com/v1/listen`.
- `Services/DeepgramLiveService.swift:204` envia `encoding=linear16`, `sample_rate=16000`, `channels=1`.
- `Services/DeepgramLiveService.swift:360` instala tap no `AVAudioEngine`.
- `Services/DeepgramLiveService.swift:371` converte cada buffer para linear16/16kHz e `connection.send(Data(...))` em `Services/DeepgramLiveService.swift:402`.
- `Services/DeepgramLiveService.swift:276` a `Services/DeepgramLiveService.swift:335` implementa fallback/reconexão, mantendo texto final e descartando parcial.

RN atual:

- `apps/mobile/src/features/generate/transcribe.ts:29` usa `Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)`.
- `apps/mobile/src/features/generate/transcribe.ts:56` para a gravação e pega `recording.getURI()`.
- `apps/mobile/src/features/generate/transcribe.ts:73` monta `FormData` com `recording.m4a` / `audio/m4a`.
- `apps/mobile/src/features/generate/transcribe.ts:84` chama `POST /api/transcribe`.
- `apps/mobile/app/generate.tsx:150` confirma o UX atual: ao parar gravação, faz upload batch, espera transcript e só então preenche achados.
- `apps/mobile/package.json:23` usa Expo `~52.0.20`, `expo-av ~15.0.1`, RN `0.76.9`.
- `apps/mobile/app.json:33` hoje só declara `RECORD_AUDIO`.
- `apps/mobile/eas.json:25` já tem produção Android com `app-bundle`; não há pasta `apps/mobile/android`, então EAS/prebuild é o caminho natural.

## Viabilidade real de PCM streaming em RN

### Caminho 0 — continuar com `expo-av`

Não fecha paridade. O `expo-av` atual do app é file-based: grava, para, gera URI e faz upload. Não há API usada no app para receber buffers PCM do microfone em tempo real. Além disso, `expo-av` está em trajetória de depreciação/substituição por `expo-audio` nas versões recentes da Expo, então apostar nele para live PCM é tecnicamente fraco.

Conclusão: inviável para paridade Deepgram live.

### Caminho 1 — migrar para `expo-audio` com `useAudioStream`

A documentação atual da Expo já lista `useAudioStream(options)` como hook que cria stream nativo para captura PCM em tempo real do microfone e exige permissão de microfone. Isso torna o caminho Expo “mais oficial” do que libs comunitárias, mas há uma pegadinha grande: o app está em Expo SDK 52 e usa `expo-av`, enquanto a documentação atual mostra `expo-audio` em versão bem mais nova. Não dá para assumir que isso encaixa sem upgrade de SDK, troca de API e teste em Android real.

Risco real: pode ser o melhor caminho futuro, mas não é um patch pequeno. É migração de stack de áudio, e precisa provar que entrega `Int16`, mono, taxa estável 16 kHz ou que permite conversão confiável antes do envio.

### Caminho 2 — `react-native-live-audio-stream` / `react-native-audio-pcm-stream`

Essa família de libs faz exatamente o tipo de coisa necessária: usa `AudioRecord` no Android, emite chunks PCM em base64, aceita `sampleRate`, `channels`, `bitsPerSample`, `audioSource`, `bufferSize`. A documentação do fork `react-native-audio-pcm-stream` mostra `sampleRate`, `channels: 1`, `bitsPerSample: 16`, `audioSource`, e evento `data` com base64.

O problema: é biblioteca nativa comunitária, com surface antigo, API por bridge JS e manutenção/compatibilidade incertas. Para Deepgram, chunks base64 precisam virar bytes binários (`ArrayBuffer`/`Buffer`) antes de `WebSocket.send`; se mandar string base64, Deepgram não vai interpretar como raw linear16. Também precisa confirmar se 16000 Hz é realmente honrado pelo Android ou se o device entrega 44.1/48 kHz e a lib só faz uma configuração que o hardware ignora.

Conclusão: viável para protótipo e talvez produção, mas com risco de manutenção e performance. Eu não venderia como “paridade garantida” sem PoC em aparelhos Android reais.

### Caminho 3 — `@dr.pogodin/react-native-audio`

A lib se apresenta como biblioteca RN para stream de entrada de áudio em Android/iOS/macOS e é mais recente/ativa que várias alternativas antigas. O pacote declara peer dependency em `react-native-permissions`; isso implica permissão nativa extra e possível config plugin/prebuild. É mais promissora que `react-native-live-audio-stream` se o objetivo é manter algo em produção, mas ainda precisa validar compatibilidade com RN 0.76/Expo 52 e o formato exato que ela entrega.

Conclusão: candidato sério, mas não é drop-in. Precisa dev client/prebuild, permissões nativas e prova de formato/latência.

## Implicação Expo/EAS

Qualquer lib nativa fora do Expo SDK não roda no Expo Go. A documentação da Expo é clara: para adicionar novas bibliotecas nativas ou alterar config nativa, precisa development build; com development builds, instala a lib e cria novo build local ou via EAS. Como este app não tem `apps/mobile/android` e já usa `eas.json` com `production.android.buildType=app-bundle`, o fluxo provável é:

1. instalar lib nativa de áudio;
2. adicionar/configurar plugin nativo se existir, ou rodar `expo prebuild --platform android` para gerar `android/`;
3. criar development build Android para testar;
4. validar em device real;
5. só depois EAS production AAB.

Ponto subestimado: cada mudança nativa quebra o ciclo rápido do Expo Go. O time passa a depender de dev-client/EAS/local prebuild para testar microfone/PCM.

## Onde vai quebrar no Android

### P0/P1 — Formato real não bate com o que Deepgram espera

Deepgram exige que raw audio informe `encoding` e `sample_rate`; para raw `linear16`, o conteúdo enviado precisa ser PCM headerless coerente com esses parâmetros. O Swift garante isso com `AVAudioConverter` para `linear16/16000/mono` antes de enviar (`DeepgramLiveService.swift:371`). No RN Android, muitas libs expõem “PCM” mas podem entregar taxa real diferente, endian diferente, estéreo, float, ou chunks base64. Se o app abrir `wss://...encoding=linear16&sample_rate=16000&channels=1` e mandar 48 kHz, estéreo ou base64 textual, o resultado será transcript ruim, latência estranha ou silêncio.

### P1 — 16 kHz nem sempre é nativo no Android

Android costuma capturar melhor em 44.1/48 kHz em vários devices. Pedir `sampleRate: 16000` no `AudioRecord` pode funcionar em alguns aparelhos e falhar/ser remapeado em outros. Se a lib não fizer resampling real, você precisa implementar resampler nativo ou aceitar mandar 48 kHz para Deepgram com `sample_rate=48000`. O plano otimista costuma copiar o Swift `16000` sem testar hardware.

### P1 — Bridge JS pode virar gargalo

Enviar PCM em base64 do módulo nativo para JS a cada 20-100 ms, decodificar para bytes e mandar no WebSocket pode criar GC, jitter e perda de chunk em celulares medianos. O Swift evita bloquear thread de áudio com `WSConnection` e fila dedicada (`DeepgramLiveService.swift:14`, `DeepgramLiveService.swift:19`). No RN, se tudo passar pelo JS thread junto com render/UI, a transcrição pode degradar quando a UI anima, quando o app está carregado ou quando o usuário alterna telas.

### P1 — WebSocket no JS não é igual a `URLSessionWebSocketTask`

O Swift tem receive loop amarrado ao task atual, ignora conexão antiga, limita fila e faz reconexão (`DeepgramLiveService.swift:235`, `DeepgramLiveService.swift:276`). Um port ingênuo em RN costuma abrir `new WebSocket`, mandar chunks e pronto. Quando a rede cai, quando muda Wi-Fi/4G, quando o Android suspende o app ou quando Deepgram fecha o socket, você precisa preservar `finalText`, descartar `interimText`, reabrir token/socket e não duplicar final. Isso é parte da feature, não detalhe.

### P1 — Permissões e foreground/background

`RECORD_AUDIO` está em `app.json:33`, mas live recording prolongado no Android pode exigir comportamento mais cuidadoso em background, interrupções de chamada, troca de rota Bluetooth/headset e foco de áudio. O Swift registra interrupções/route change (`DeepgramLiveService.swift:418`). O RN atual não trata chamadas, Bluetooth desconectado, app background, Doze, foreground service ou notificação persistente. Se o médico ditar e bloquear a tela ou alternar app, o comportamento Android pode parar/cortar áudio.

### P1 — Token Deepgram e segurança

Swift busca token no backend antes de conectar (`DeepgramLiveService.swift:192`) e suporta pré-aquecimento (`DeepgramLiveService.swift:102`). O RN ainda não tem `/api/deepgram/token` no fluxo de voz; se alguém colocar chave Deepgram no bundle mobile, vira vazamento. Tem que portar token temporário ou proxy controlado antes do WebSocket direto.

### P2 — Audio source e cancelamento de ruído

Libs Android frequentemente usam `VOICE_RECOGNITION`, `MIC`, `VOICE_COMMUNICATION` etc. Isso altera AGC, noise suppression, eco e qualidade de termos médicos. O Swift usa `.record` + `.measurement` (`DeepgramLiveService.swift:340`), que é uma escolha específica para evitar processamento indesejado. Em Android, escolher errado pode “melhorar voz” e piorar medidas/termos técnicos.

### P2 — Buffer size, endpointing e latência

O Swift usa tap buffer 2048 frames (`DeepgramLiveService.swift:360`) e Deepgram `endpointing=300` (`DeepgramLiveService.swift:211`). No Android, `bufferSize` muito pequeno aumenta overhead; muito grande aumenta latência. O plano otimista raramente mede tempo mic→interim→final.

## O que um plano otimista vai subestimar

P0 — “Expo suporta áudio, então dá para fazer em JS.” Não com o stack atual. `expo-av` grava arquivo; live PCM precisa `expo-audio` novo ou módulo nativo.

P0 — “É só mandar m4a pelo WebSocket.” Errado para paridade Swift. O Swift manda raw PCM linear16. Se for enviar containerizado, a URL/parâmetros Deepgram mudam; se for raw, os bytes têm que bater exatamente.

P1 — “A lib já tem sampleRate 16000.” Pedir 16000 não prova que o Android entregou 16000. Precisa gravar bytes de teste, validar com `ffprobe`/Deepgram mock ou salvar raw + reproduzir/inspecionar.

P1 — “WebSocket reconecta sozinho.” Não reconecta com semântica clínica. Precisa manter texto final, apagar parcial, evitar duplicação e lidar com token/keyterms, como Swift já faz.

P1 — “Dev client é detalhe.” Não é. Uma lib nativa muda o ciclo de desenvolvimento, exige prebuild/EAS dev build e pode quebrar CI/build Android.

P1 — “Se funciona no meu celular, funciona na Play Store.” Áudio Android varia muito por fabricante, taxa suportada, política de bateria, Bluetooth e permissões. Precisa matriz mínima de devices.

P2 — “Live é só UX melhor.” Live muda fluxo de produto: interim text, botão parar, estado reconectando, erro parcial preservado, fallback para batch Whisper, telemetria de latência e suporte.

## Severidade dos riscos

P0 — Sem API PCM real no stack atual (`expo-av`): bloqueia paridade de voz live. Arquivos: `apps/mobile/src/features/generate/transcribe.ts:29`, `apps/mobile/src/features/generate/transcribe.ts:56`.

P0 — Enviar formato errado para Deepgram: pode parecer conectado mas produzir transcript ruim ou vazio. Referência correta: `DeepgramLiveService.swift:204`, `DeepgramLiveService.swift:371`.

P1 — Dependência nativa exige dev client/prebuild/EAS: impacta build, teste e manutenção. Evidência local: `apps/mobile/eas.json:25`, ausência de `apps/mobile/android`, dependências atuais em `apps/mobile/package.json:23`.

P1 — Android sample rate/resampling: risco de qualidade e estabilidade por device. Precisa prova de áudio real antes de decidir 16 kHz vs 48 kHz.

P1 — Jitter/perda via JS bridge: risco de latência e cortes se chunks PCM passarem por JS em alta frequência.

P1 — Reconexão incompleta: Swift tem lógica substancial em `DeepgramLiveService.swift:276`; port ingênuo perde texto ou duplica frases.

P1 — Background/interrupções/Bluetooth: Swift observa interrupções em `DeepgramLiveService.swift:418`; RN atual não tem equivalente.

P2 — Keyterms: Swift tem fallback sem keyterms (`DeepgramLiveService.swift:281`). Port otimista pode quebrar em handshake/URL longa e culpar microfone.

P2 — Migração futura de Expo áudio: `expo-av` está legado; se mexer agora, talvez valha avaliar `expo-audio` antes de instalar lib comunitária antiga.

## Recomendação objetiva

Não começar portando UI. Começar com uma Spike técnica Android-only de 1 a 2 dias:

1. Escolher uma opção de captura PCM: `expo-audio useAudioStream` se for aceitável subir SDK/stack; se não, testar `@dr.pogodin/react-native-audio`; `react-native-live-audio-stream` só como caminho rápido/mais arriscado.
2. Gerar dev build Android, não Expo Go.
3. Capturar 10 segundos de áudio e salvar raw local com metadados reais: sample rate, canais, bits, endian.
4. Enviar para Deepgram mock/real com `encoding=linear16`, `sample_rate` real e `channels=1`.
5. Medir latência e perda em pelo menos 3 aparelhos Android, incluindo um intermediário.
6. Só depois portar a UX Swift: interim/final, reconectando, fallback de keyterms, preservar texto parcial, botão parar e fallback batch Whisper.

Se a Spike não provar PCM estável, o plano certo para Play Store é manter Whisper batch no MVP Android e marcar Deepgram live como fase técnica separada. Fingir paridade agora provavelmente gera uma feature “demo funciona, plantão quebra”.

## Fontes externas usadas

- Expo `expo-audio`: documentação atual lista `useAudioStream(options)` para captura PCM em tempo real do microfone e `AudioStream` como stream nativo PCM.
- Expo development builds/custom native code: documentação diz que novas libs nativas exigem development build; Expo Go só inclui nativos presentes no SDK.
- `react-native-audio-pcm-stream`/`react-native-live-audio-stream`: README descreve chunks PCM em base64, `sampleRate`, `channels`, `bitsPerSample`, `audioSource` e permissão Android `RECORD_AUDIO`.
- Deepgram: documentação de streaming raw exige informar `encoding` e `sample_rate`; para raw audio, Deepgram não tem header para inferir formato.
