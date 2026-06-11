# DET-2 — Ondas pequenas (categorias de baixo volume) — CONCLUÍDO

> Executado em 2026-06-11 contra o DB mobile (`yldtkqrsbgcnwlydrrot`).
> Categorias: DOPPLER_RENAL, DOPPLER_VENOSO_MMII, DOPPLER_VENOSO_MMII_MEDIDAS,
> VIAS_URINARIAS, ESCROTAL. Decisão de fonte canônica: **MESCLAR** (curadoria
> mobile validada no lab prevalece em conflito; semear da fonte só o complementar).

## Resultado

`pnpm diff:bundle <cat>` → **drift=0 gap=0** para as 5 + ABDOMEN_TOTAL.
Golden local (flag ligada): 6/6 PASS, prompt caching ~99%.

## Por categoria

### DOPPLER_RENAL (7 blocos — mobile prevalece integralmente)
Biblioteca curada no lab (protocolo JVB 2005, critérios de estenose, nefroesclerose)
é mais rica que a fonte viva. **Nada semeado, nada arquivado.** Toda a seção da
fonte entrou na allowlist como "curadoria mobile prevalece". Modelo curado usa
cabeçalho próprio `ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS`
(sem COMENTÁRIOS/ASPECTOS) — golden ajustado a isso.

### DOPPLER_VENOSO_MMII (8 → 11 blocos)
2 modelos conflitantes: `template-padrao` (protocolo COMPLETO) × `protocolo-tvp-only`
(tag `protocolo-restrito`). **Seletor de variante** adicionado ao `bundleLoader.ts`
(`DOPPLER_VENOSO_MMII`): gatilho = pedido explícito de exame p/ TVP
(`investigar/suspeita/afastar TVP`, `d-dímero`, `Wells`, `urgência venosa`),
negação = "não é exame de TVP". Default (sem gatilho) = protocolo completo.
Seed: 3 blocos da fonte (regra lateralidade/escopo, frases de descrição normal,
achados descritivos semióticos).

### DOPPLER_VENOSO_MMII_MEDIDAS (4 → 7 blocos)
Categoria de cartografia. Seed: 3 blocos da fonte (regra estrutura/ordem/medidas,
frase modelo normal, regra achados descritivos/cartografia).

### VIAS_URINARIAS (8 → 10 blocos)
Modelo sincronizado com a fonte (placeholders `X.X` no lugar de exemplos
hardcoded `300.0 ml`/`0.2 ml`). Seed: 2 regras (função/regras-gerais/unidades +
patologias-variantes: cisto, litíase, hidronefrose, DRC, pielonefrite, bexiga).

### ESCROTAL (7 → 10 blocos — **não tinha modelo!**)
Categoria estava sem nenhum `kind=modelo` (gate `BUNDLE_NO_TEMPLATE` bloquearia).
Seed: modelo-base normal + regra função/regras-gerais + regra como-descrever-alterações
(varicocele, hidrocele, massa, microlitíase), tudo verbatim da fonte.

## Riscos / notas
- DOPPLER_VENOSO_MMII_MEDIDAS e DOPPLER_VENOSO_MMII compartilham vocabulário —
  são categorias separadas no picker, seletor de variante só atua na primeira.
- ESCROTAL e VIAS_URINARIAS têm 3 estilos (sem OBJETIVO) — seed feito p/ os 3.
- Allowlist do `diff:bundle` cresceu p/ 60 entradas (drift deliberado da curadoria
  mobile rica vs fonte enxuta). Cada entrada tem `reason` rastreável.
