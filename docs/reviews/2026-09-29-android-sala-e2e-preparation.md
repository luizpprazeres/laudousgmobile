# Android → Sala: preparação E2E em 29/09/2026

README, AGENTS do diretório pai e handoff Android lidos. Nenhum paciente ou token de sessão existente acessado. Nenhuma alteração de autenticação/política de produção.

Build nativo debug ARM64 atual passou: 45s, 618 tarefas (62 executadas). APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, 86 MB. JDK utilizado: `/Users/luizprazeres/.gradle/jdks/eclipse_adoptium-17-aarch64-os_x.2/jdk-17.0.19+10/Contents/Home`. JDK25 do Android Studio falhou ao resolver plugin Gradle; JDK17 resolveu sem alteração de fonte/configuração.

Comando: `JAVA_HOME=<JDK17> ANDROID_HOME=/Users/luizprazeres/Library/Android/sdk ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`, no diretório `apps/mobile/android`. Log `/tmp/sala-android-build.log`.

Typecheck RN e teste `apps/mobile/src/features/sala/__tests__/reviewContract.manual.ts` passaram. Três referências de texto em SalaPairingSheet foram atualizadas ao domínio .com.br a pedido do root. APK debug precisa Metro para carregar o JavaScript atual: build nativo sozinho não comprova fluxo funcional.

`adb devices -l`: nenhum dispositivo. `emulator -list-avds`: nenhum AVD. A pasta da imagem Android35/GoogleAPIs/ARM64 existente continha apenas `.installer`, sem imagem utilizável; avdmanager rejeitou pacote. SDKManager iniciado para baixar imagem correta, sem sucesso confirmado ainda. Log `/tmp/sala-sdkimage.log`. Nenhuma instância de emulador ou Metro foi iniciada nesta etapa.

Conta sintética oficial aguardando informação do usuário solicitada pelo root. Não reutilizar contas históricas ambíguas. Após imagem/AVD: instalar APK, iniciar Metro dedicado, login normal na conta sintética, produzir laudo fictício, abrir Sala nova, observar pending, liberar pelo app, verificar reviewed, editar, observar pending novamente, liberar, conferir texto idêntico e redirect legado preservando código. Não registrar token/código em relatório público nem usar dados reais.

Estado: preparação/build confirmados; E2E autenticado NÃO executado. Bloqueios precisos: runtime Android sem imagem instalada + credencial de conta sintética oficial pendente.

## Atualização de preparo

Imagem Android35 GoogleAPIs ARM64 completou download oficial (1.778.933.980 bytes; instalada 3,8 GB). AVD `LaudoUSG_Sala_QA` criado; boot confirmado sys.boot_completed=1; APK atual instalado com sucesso em emulator-5554. Metro porta8085 responde packager-status:running (PID59032). AVD visível PID62260 após encerramento limpo do headless.

App iniciou, mas mostrou ausência do bundle; menu de desenvolvimento chegou a Change Bundle Location. Login Android NÃO está pronto. Qt/qemu não aparece no inventário CUA e getApp(nome/caminho) retorna Invalid app. Alternativa Android Studio abriu projeto, porém cliques de Search Everywhere e atalho não produziram alteração verificável na UI; chamadas eventuais noWindowsAvailable. Tentativas interrompidas conforme root para não disputar foco usuário; AVD, Metro e Studio mantidos. Nenhuma senha ou token de auth lido. Login iOS/GitHub ficam sob handoff do root; retomar Android com foco compartilhado.

## Correção do erro de bundle

Em nova rodada, Metro estava saudável mas sem pedidos JS. APK debug padrão não empacotava JS; app mostrava fallback de bundle inexistente. Gerado APK debug autocontido via init Gradle temporário `/tmp/sala-bundled-debug.gradle` definindo react.debuggableVariants=[] somente para esta build. Nenhuma configuração versionada alterada. Task createBundleDebugJsAndAssets executou; build PASS em 1m15s (619 tarefas). APK contém assets/index.android.bundle de 3.635.624 bytes e instalação adb retornou Success. Log `/tmp/sala-android-bundled-build.log`. Validação UI aguarda liberação de foco pela frente iOS; ainda não afirmar login/E2E confirmado.

## Entrada de teclado

Usuário confirmou abertura do app após APK autocontido, mas não conseguia digitar email. Configuração do AVD tinha `hw.keyboard=no`; corrigida para `yes` e AVD reiniciado preservando dados (PID70728). Login RN usa campos editable={!busy}; nenhuma alteração de produto foi feita. CUA segue sem acesso operacional à janela Qt e retorna noWindowsAvailable para coordenadas no Studio, logo digitação ainda depende de confirmação visual/usuário. Não foi preenchida senha nem lido authstorage.

## Gate final automático

Após o usuário confirmar que a interação no Android ficou normal, o typecheck RN e o teste manual do contrato de revisão passaram novamente. Um novo `:app:assembleDebug` terminou e atualizou o APK em 29/09/2026 às 13:14; o emulador `emulator-5554` permaneceu conectado com `com.laudousg.LaudoUSG/.MainActivity` em primeiro plano. A confirmação do usuário resolve o problema de entrada/login, mas não documenta por si só o percurso clínico completo de gerar, revisar, editar e revisar novamente; esse E2E continua pendente.
