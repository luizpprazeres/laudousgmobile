# Decisões — App Android (DECIDIDAS pelo Luiz 04/07)

> As decisões-norte foram tomadas. Registro abaixo. Novas dúvidas que surgirem na sessão
> dedicada vão para o fim deste arquivo.

## ✅ D1 — Estratégia: PARIDADE TOTAL, mas Whisper fica no Android (DECIDIDO)
- **Decisão do Luiz:** buscar **paridade total** com o iOS (design, features, fluxos), **COM
  UMA EXCEÇÃO deliberada: manter a transcrição por Whisper batch no Android** (o iOS fica com
  Deepgram Live). Motivo: rodar um **A/B de produto na prática** — comparar Whisper (Android)
  × Deepgram (iOS) com usuários reais e ver o que preferem, antes de investir na voz ao vivo.
- **Consequência (importante):** o **Deepgram Live SAI do escopo Android** — era o item de
  MAIOR RISCO técnico (PCM ao vivo, SPIKE de gate). Isso **remove o maior risco** e acelera.
  A waveform pode continuar a atual; a UX de gravação segue o padrão Whisper (gravar→transcrever).
- **Escopo real:** todo o resto da paridade (dark mode universal, edição inline, onboarding,
  disclaimer gate, feedback, history busca/filtro, calculadoras completas, consultor IA,
  análise de imagem, settings, paywall, categorias dinâmicas) **entra**. Voz ao vivo **não**.

## ✅ D2 — Conta Google Play: categoria "PRODUTIVIDADE" (DECIDIDO)
- **Decisão do Luiz:** publicar como **"Produtividade"** (ferramenta de redação de laudos para
  médicos — não app de saúde do consumidor), com a conta **Individual** atual. Não migrar para
  CNPJ/Organization agora.
- **Implicações a tratar na sessão:** disclaimer médico explícito; posicionar copy da store como
  ferramenta profissional de produtividade (não diagnóstico); **não** usar Health Connect;
  Data Safety honesto. **Risco assumido:** o Google pode reclassificar como Medical na triagem —
  se acontecer, o plano B é migrar para Organization (CNPJ). Documentar isso como risco vivo.

## D3 — Escopo visual: dark mode universal É paridade (não opcional)
- Como o alvo é paridade total, **dark mode universal + polish** entram no escopo (não ficam
  "pós-MVP"). Ordem: baixo risco e alto impacto → fazer cedo, em paralelo às features.

---
## Dúvidas novas (preencher na sessão dedicada)
- (nenhuma ainda)
