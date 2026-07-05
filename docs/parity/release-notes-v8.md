# Release notes — AAB v8 (interno; v7 foi supersedido antes de subir)

## Para o Play Console (pt-BR, ≤500 chars, SEM tags de idioma)

Novidades desta versão:
• Cancele o ditado a qualquer momento (X ao lado do microfone) — o áudio fica salvo
• Ditado mais confiável: o áudio fica salvo se a internet cair — toque em "Tentar novamente" sem regravar nada
• Aviso imediato se o microfone não estiver captando sua voz
• 9 novas calculadoras: ducto venoso, pré-eclâmpsia, AFC, BI-RADS, TI-RADS e volumes (próstata, tireoide, útero, resíduo)
• Atalho "Novo laudo" ao segurar o ícone do app
• Ícone temático (Material You) e melhorias visuais

## Interno (o que entrou desde o v6 / build 3097d525)

- beceb78 cancelar ditado (X no composer, UX Dex2) + uploadAudio abortável; backend: filtro anti-alucinação Amara.org + prompt estilo-correto + temperature 0 + TRANSCRIBE_MODEL env-gated (deployado na main a0b78be)

- c6d3adc ditado robusto (áudio recuperável + retry + aviso mic mudo + permissão sem re-pedir)
- 5bfb1c3 +9 calculadoras (14/14 paridade iOS)
- 3f3edb9 themed icon + expo-quick-actions 3.0.1 + audio focus DoNotMix
- 9d611e1 expiração 48h do áudio pendente
- fix truncamento Preferências (commit anterior ao sprint)
- 9872e2b doc diferenciais Android

## Checklist pré-submit

- [x] Build debug local compilou com expo-quick-actions (validação nativa)
- [x] Dex1 GO no review do sprint (+ Dex2 GO no UX de cancelamento)
- [x] v8 = build 66a12a4c (v7 4dd9e299 supersedido)
- [x] Smoke no device 05/07: retry com queda real de Wi-Fi, aviso mic mudo, TI-RADS TR4 + inserção, shortcut Dyn no dumpsys, Preferências sem truncamento, X cancelar (gravação c/ Alert + transcrição → card)
