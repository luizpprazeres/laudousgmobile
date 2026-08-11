# Release notes — AAB v9 (sprint 1 pós-v8)

## Para o Play Console (pt-BR, ≤500 chars, SEM tags de idioma)

Novidades desta versão:
• Compartilhe imagens do WhatsApp ou da galeria direto para o LaudoUSG — a análise de biometria abre na hora
• Cancele o ditado a qualquer momento (X ao lado do microfone) — o áudio fica salvo
• Transcrição mais precisa e sem frases estranhas em pausas longas
• App menor e mais rápido para baixar
• Compatível com os gestos de tela cheia dos Android mais novos

## Interno (desde o v8 / build 66a12a4c)

- beceb78 cancelar ditado (X no composer, UX Dex2) + uploadAudio abortável
- 3e4da61 fix eco do prompt Whisper + "Transcrevendo seu áudio…" sem marca
- 2826966 B4 share intent (expo-share-intent 3.2.3 exato + expo-file-system) — VALIDADO no device via Galeria
- C7 edge-to-edge (react-native-edge-to-edge 1.6.2 exato + SystemBars no _layout) — validar no emulador A15
- C8 R8/proguard + shrinkResources via expo-build-properties (APK release 78,7MB; mapping embutido no AAB → some o aviso amarelo do Play)
- Backend (já em prod, independe do app): filtro anti-alucinação + eco + TRANSCRIBE_MODEL=gpt-4o-mini-transcribe ATIVO

## Checklist pré-submit v9

- [ ] Emulador A15: auditoria visual edge-to-edge (login, generate light+dark, gravação, sheets, histórico, preferências)
- [ ] Release R8 smoke: login → ditado → laudo → calculadora (crash de minificação aparece aqui)
- [ ] Commits C7+C8 + eas build production
- [ ] Subir no Play (autoIncrement → versionCode 6)
