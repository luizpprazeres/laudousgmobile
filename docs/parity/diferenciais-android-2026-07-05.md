# Diferenciais Android — pesquisa + status (05/07/2026)

Pesquisa verificada em fontes oficiais (agente ultrathink 05/07). Contexto:
Expo 52 / RN 0.76.9 / targetSdk 35. Público = médico ultrassonografista
entre pacientes (1 gesto > 3 taps; sobriedade > firula).

## Feito nesta sessão (AAB v7)

| Item | Como | Commit |
|------|------|--------|
| Themed icon (Material You, A13+) | `adaptiveIcon.monochromeImage` (PNG branco+alpha gerado do foreground) | 3f3edb9 |
| App Shortcut "Novo laudo" | expo-quick-actions **3.0.1 exato** (SDK 52) + `useQuickActionRouting()` no `_layout` → `/generate`. Dinâmico: aparece após o 1º boot | 3f3edb9 |
| Audio focus DoNotMix | `setAudioModeAsync` no `startRecording` (antes era iOS-only): pausa Spotify/YouTube ao gravar, devolve ao parar | 3f3edb9 |
| Ditado robusto | Áudio pendente recuperável + retry + aviso mic mudo + permissão sem re-pedir (ver commit) | c6d3adc |

## P0 pós-lançamento — edge-to-edge (é DÍVIDA, não feature)

targetSdk 35 **enforça** edge-to-edge em devices Android 15+: o app já pode
estar com botões sob a gesture bar hoje. O opt-out morre no targetSdk 36.
Não ligado agora por risco pré-AAB sem device A15 para validar.

Receita (fazer tela a tela, com emulador Android 15):
1. `"android": { "edgeToEdgeEnabled": true }` no app.json (SDK 52 já suporta; usa react-native-edge-to-edge/zoontek).
2. Trocar expo-status-bar/expo-navigation-bar pelo componente `SystemBars` da lib (os pacotes Expo no 52 usam APIs deprecated).
3. Auditar `SafeAreaView` (sempre o da react-native-safe-area-context; `edges={['bottom']}` onde tem header).
4. Teclado: `react-native-keyboard-controller` nas telas de input (KeyboardAvoidingView buga com edge-to-edge).

## Backlog ranqueado (validado, com pegadinhas)

1. **Share target WhatsApp→análise de imagem** (M, maior ROI de produto): `expo-share-intent` v3.x. Pegadinhas: exige expo-linking + patch-package; issues #189/#171 de conflito com expo-router — usar `ShareIntentProvider` + `+native-intent`; testar WhatsApp/galeria de verdade; não funciona no Expo Go.
2. **Quick Settings Tile "Ditar laudo"** (M): sem lib RN viva → módulo Expo Modules próprio (TileService Kotlin ~150 linhas). targetSdk 34+: `startActivityAndCollapse(PendingIntent)` obrigatório. Mic em background NÃO funciona (A9+) — tile abre o app em foreground, que é o desejado. `requestAddTileService()` (API 33+) mostra prompt de adicionar.
3. **Pausar/retomar gravação + preview estilo WhatsApp** (S–M, puro JS/UI).
4. **AudioSource VOICE_RECOGNITION** (S–M, ganho provável de acurácia ASR): expo-av não expõe; expo-audio só no SDK 54+. No 52 = patch-package de 1 linha. Melhor: junto do upgrade SDK 54.
5. **Notificação "Laudo pronto" + App Links verificados** (S): channels granulares; pedir POST_NOTIFICATIONS em contexto (após 1º laudo), nunca no onboarding. App Links: SHA-256 do **Play App Signing** (não o upload key) no assetlinks.json; testar `adb shell pm verify-app-links`.
6. **FGS microphone (gravar com tela apagada)** (M): Notifee registerForegroundService + `foregroundServiceType="microphone"`; Play exige justificativa.
7. **Mic de headset Bluetooth** (M–L): `setCommunicationDevice()` A12+ via módulo nativo; latência SCO 1–2s.
8. **Widget** (M–L): react-native-android-widget; App Shortcut já entrega 80% do valor.

## NÃO fazer (verificado)

- **Predictive back**: RN 0.76 não suporta (`OnBackInvokedCallback` só no RN 0.81+). Ligar hoje = botão voltar FECHA o app. Manter `enableOnBackInvokedCallback=false` até SDK 54+.
- **Google Assistant App Actions**: Assistant morre ~mar/2026 em favor do Gemini; App Actions zumbi desde 2023. O shortcut do item feito cobre o caso.
- **Splash animado / transição custom**: não existe no router v4/SDK 52; app sóbrio não precisa.

## Micro-interações (colinha para quando sobrar tempo)

- Ripple: `android_ripple={{ color: 'rgba(0,0,0,0.08)', foreground: true }}`; `borderless` só em ícones circulares E com `radius` (issue RN #48552: pode comer o background — workaround `overflow:'hidden'` no pai).
- Stack: `animation: 'fade_from_bottom'` global fica "certo" no Android.
- Haptics: preferir `Haptics.performAndroidHapticsAsync()` (respeita config do usuário) — `Confirm` no laudo pronto, `Reject` em falha, e nada mais.
- Timing M3: micro 100–200ms `cubic-bezier(0.2,0,0,1)`; saídas mais rápidas que entradas.
