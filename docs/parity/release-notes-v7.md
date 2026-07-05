# Release notes — AAB v7 (interno)

## Para o Play Console (pt-BR, ≤500 chars, SEM tags de idioma)

Novidades desta versão:
• Ditado mais confiável: o áudio fica salvo se a internet cair — toque em "Tentar novamente" sem regravar nada
• Aviso imediato se o microfone não estiver captando sua voz
• 9 novas calculadoras: ducto venoso, pré-eclâmpsia, AFC, BI-RADS, TI-RADS e volumes (próstata, tireoide, útero, resíduo)
• Atalho "Novo laudo" ao segurar o ícone do app
• Ícone temático (Material You) e melhorias visuais

## Interno (o que entrou desde o v6 / build 3097d525)

- c6d3adc ditado robusto (áudio recuperável + retry + aviso mic mudo + permissão sem re-pedir)
- 5bfb1c3 +9 calculadoras (14/14 paridade iOS)
- 3f3edb9 themed icon + expo-quick-actions 3.0.1 + audio focus DoNotMix
- 9d611e1 expiração 48h do áudio pendente
- fix truncamento Preferências (commit anterior ao sprint)
- 9872e2b doc diferenciais Android

## Checklist pré-submit

- [ ] Build debug local compilou com expo-quick-actions (validação nativa)
- [ ] Dex1 GO no review do sprint
- [ ] `eas build -p android --profile production` (autoIncrement cuida do versionCode)
- [ ] Smoke no device: retry do ditado (modo avião no meio), calculadora nova insere bloco, shortcut long-press
