# DET-2 — Saneamento das categorias menores (ondas executadas direto)

> 2026-06-11. Categorias: DOPPLER_RENAL, DOPPLER_VENOSO_MMII, DOPPLER_VENOSO_MMII_MEDIDAS,
> VIAS_URINARIAS, ESCROTAL. Política aprovada pelo Luiz: **MESCLAR** — biblioteca mobile
> validada no lab prevalece em conflito; da fonte viva semeia-se só o complementar;
> `pnpm diff:bundle` continua acusando drift novo (allowlist em `scripts/diff-allowlist.json`).
> Estado final: `diff:bundle` ✅ drift=0 gap=0 nas 6 categorias migradas até aqui.

## DOPPLER_RENAL — biblioteca 100% nativa do mobile

7 blocos (protocolo JVB 2005, RAR, tardus-parvus, nefroesclerose) sem origem na fonte viva —
curadoria do lab prevalece. Nada semeado: a seção da fonte (modelo 4,0 MHz, DOPPLERVELOCIMETRIA)
é uma máscara alternativa antiga; FUNÇÃO/COMENTÁRIOS/CONCLUSÃO conflitam com a curadoria.
Sem variantes de modelo (1 modelo). Allowlist: 7 blockTitles + 9 fragmentPrefixes.

## DOPPLER_VENOSO_MMII — mescla

- Mantidos os 8 blocos mobile (templates COMPLETO + TVP-only, critérios SVS/AVF 2023, conclusões por cenário).
- **Semeado da fonte** (verbatim): `regra-lateralidade-e-escopo` (p90 — **laudos SEMPRE unilaterais;
  bilateral = 2 laudos**; categoria SEM medidas; ordem anatômica), `frase-descricao-normal` (p85),
  `frase-achados-descritivos` (p80 — safena/perfurantes/tributárias/varicosidades/trombose + CEAP/Villalta).
- NÃO semeados (conflito com curadoria): COMENTÁRIOS fixos eletivo/urgência e CONCLUSÕES da fonte
  (mobile tem equivalentes com critérios mais ricos).
- **Seletor de variante** (`bundleLoader.ts`): tag `protocolo-restrito`; gatilho = pedido explícito de
  exame p/ TVP (investigar/suspeita/afastar/descartar/protocolo/urgência venosa/d-dímero/Wells);
  achado negativo ("sem sinais de trombose") NÃO dispara.

## DOPPLER_VENOSO_MMII_MEDIDAS — mescla

- Mantidos os 4 blocos mobile (calibres da safena por 8 pontos, perfurantes nomeadas, conclusão mapeamento).
- **Semeado**: `regra-estrutura-e-ordem` (p90 — estrutura com seção MEDIDAS, lateralidade unilateral,
  ordem anatômica, "Medidas não informadas."), `frase-modelo-normal` (p85), `regra-cartografia` (p75 —
  achados descritivos + requisitos p/ cartografia automática).
- 1 modelo só — sem seletor.

## VIAS_URINARIAS — mescla + correção de segurança

- **Modelo sincronizado com a fonte**: o modelo do DB tinha valores de EXEMPLO hardcoded
  ("Volume pré-miccional de 300.0 ml", "Resíduo pós-miccional de 0.2 ml") — risco de o writer
  copiá-los quando o médico não dita. Agora placeholders `X.X` + cláusula "Se informado pelo
  médico acrescentar" (verbatim fonte).
- **Semeado**: `regra-funcao-e-regras-gerais` (p99 — estilo Dr. Domingos, conversão automática de
  ditado, unidades obrigatórias cm/mm/mL/cm³, "A IA NÃO DEVE"), `regra-patologias-variantes` (p80 —
  cisto, litíase, litíase JUP, hidronefrose, DRC, pielonefrite, bexiga espessada, bexigoma).
- Mantidos os 7 blocos mobile (numeração, fechamento, exame normal, recomendação clínica, exceção
  cístico complexo, frases).
- ⚠️ Inconsistência menor registrada: fonte usa cm³ p/ resíduo; bloco mobile `conclusao-exame-sem-
  alteracoes` exemplifica em mL. Sem ação — o Luiz decide no lab se quiser unificar.

## ESCROTAL — gap estrutural corrigido

- Tinha 7 blocos mobile mas **NENHUM kind=modelo** (flag bloquearia com BUNDLE_NO_TEMPLATE).
- **Semeado da fonte (verbatim)**: `modelo-template-padrao` (p100), `regra-funcao-e-regras-gerais`
  (p99), `regra-como-descrever-alteracoes` (p80 — varicocele/hidrocele/massa/microlitíase).
- Mantidos os 7 mobile (torção urgente p98, numeração, fechamento, recomendação, criptorquidia).
- Nota: blocos semeados ficam sem embedding (o bundle não usa); se houver rollback pro RAG,
  esses blocos não são recuperáveis por vetor — aceito, pois o rollback dessas categorias volta
  ao estado anterior (sem modelo no RAG, como sempre foi).

## Pendências