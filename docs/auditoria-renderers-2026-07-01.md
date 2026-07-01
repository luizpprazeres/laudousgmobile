# Auditoria dos 13 renderers ativos — gaps rankeados (2026-07-01)

> Método: 3 agentes cruzaram o corpus de correções (`aprendizado-correcoes-luiz.md`,
> 226 laudos corrigidos) com o código atual. Gaps VERIFICADOS no código + revisão dex1.
> Fonte da verdade do que está ativo = Vercel `RENDERER_CATEGORIES` (13 renderers).

## Ranking de gaps (severidade clínica × volume) — ordem de ataque (dex1)

| # | Gap | Sev | Evidência | Fix |
|---|---|---|---|---|
| 1 | **Golf ball / foco ecogênico intracardíaco** — sem snippet | 🔴 | grep vazio em `renderer/` (VERIF) | Guard: detecta foco+ventrículo → injeta corpo + conclusão + recomendação eco fetal 28s. Vale p/ OBSTETRICA/DOPPLER/MORFOLOGICO. Frases canônicas no corpus §2. |
| 2 | **Colo transvaginal** — bloco não gerado; `colo_mm` fora do schema | 🔴 | sanity só valida; caso real 6e6f3dbb (seção dropada) | Add `colo_distancia_mm` ao schema + renderizar bloco "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL" (6.5MHz + OI fechado + distância placenta-OI). |
| 3 | **MAMA BI-RADS** — sanity alerta, não auto-corrige (4A→3 / omitido) | 🟠 | `deterministicSanity/mamaria.ts` (alegado) | Guard conservador no renderer + golden dos 2 casos reais (88543eea, 3553d87e). |
| 4 | **TIREOIDE pico `____`** — emite placeholder quando pico null | 🟡 | `TIREOIDE.ts:540-553` (VERIF) | Omitir a linha de pico quando o valor é null (não "____"). |
| 5 | **[REVISAR] inline** não suprimido antes da entrega | 🟡 | measureSanity insere; nada remove (alegado) | Mover p/ sanity/audit issue (não imprimir no laudo final). |
| 6 | **PELVE dedup de conclusão** — só dedup do líquido-livre | 🟡 | `PELVE_FEMININA.ts:647` (VERIF parcial) | Dedup geral de itens de conclusão (≥~70% similaridade), preservando ordem. |
| 7 | **MSK passthrough** — renderer regenera laudo pré-formatado colado | 🟠 **LIVE** | `MUSCULOESQUELETICO.ts` regenera; MSK_V2 ATIVO em prod | Modo híbrido: se input já parece laudo completo (TÍTULO/COMENTÁRIOS/ASPECTOS/CONCLUSÃO) → passthrough byte-quase-idêntico; ditado curto → regenerar + biblioteca. Rota explícita ANTES do renderer. |
| 8 | **Fallback genérico** p/ categoria sem renderer (bloqueia) | ⚪ | `route.ts` BUNDLE_EMPTY (VERIF) | Baixa urgência (os 13 com volume já têm renderer). Manter bloqueio por ora. |

## Eixos BEM implementados (DONE — não mexer)
- Obstétrico: IG Domingos, líquido fiel (MBV/ILA), percentis Doppler, peso PIG/GIG, guards de
  vitalidade/gemelar-alucinado/incisura/BCF/gemelar-dropado.
- PELVE: menopausa automática, anti-líquido-livre-alucinado.
- MAMA: rodapé BI-RADS fora da numeração, linfonodos axilares item.
- TIREOIDE: linfonodos anti-alucinação, istmo (ASR_CLINICAL), volume normal.
- Cross-cutting: parser de comandos (fase 1+2), numeração de conclusão, bexiga normal,
  próstata template, sanitização ASR, supressão de placeholder em conclusão vazia.

## Observações
- **MSK passthrough é risco LIVE** (V2 ativo em prod), não dormente — subir prioridade do #7.
- TIREOIDE "alteração ecotextural omitida" = problema de EXTRAÇÃO (prompt), não renderer.
- Corpus é de 2026-06-29; muita coisa do checklist antigo já foi implementada (IG, Doppler,
  líquido, menopausa, comandos) — este doc é o estado REAL pós-implementações.
