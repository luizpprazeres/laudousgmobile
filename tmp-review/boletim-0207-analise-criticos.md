# Análise dos 3 críticos do boletim 02/07 (generated × final, DB mobile)

> Sessão autônoma 03/07. Correções do Luiz = especificação.

## 62f15728 — OBSTETRICA (renderer, AINDA VIVO em prod) 🔴
- **Raw:** bloco "Biometria fetal:" da CALCULADORA iOS (formato de máquina): `DBP: 7.46 cm / CC: 28.13 cm / CA: 25.07 cm / CF: 5.76 cm / Peso: 1451 g / IG pela DUM: 29s6d / IG pela biometria: 29s5d`.
- **Bug:** conversão cm→mm é feita pelo LLM da extração (prompt OBSTETRICA.ts:192). DBP converteu certo (74,6mm); CC/CA/CF saíram com o valor de cm rotulado mm (28,1/25,1/5,8mm) — multiplicação não-determinística.
- **Guard furou:** measureSanity pegou CC (bounds 30-410) e CA (30-430) mas CF 5,8 passa em [3,100] (plausível em IG inicial). Sem IG-awareness, bound estático não pega.
- **Garble ASR:** "maior **vertical média** de 3.9" (= maior bolsão vertical) → saiu "ILA de 3,9 cm" (rótulo errado; ILA 3,9 seria oligoâmnio!). Regra líquido-fiel não casou com o garble.
- **Correção do Luiz:** 281,3/250,7/57,6 mm + "O maior bolsão vertical mede 3,9 cm" (corpo). (Conclusão dele manteve "ILA de 3,9" — provável descuido, corpo é a referência.)
- **Fix planejado (task 8):** (a) parser determinístico do bloco da calculadora (pre-seed/override dos campos — mata a classe inteira do bug); (b) guard unit-echo: cm explícito no raw + valor extraído ≈ valor cm (não ×10) → corrigir/sinalizar deterministicamente; (c) garble "vertical média"→"bolsão vertical" no ASR_CLINICAL (escopo obstétrico); (d) plausibilidade por IG usando as tabelas da calculadora do app (fonte canônica do projeto, não inventar).

## 63a92f8e — PELVE_FEMININA (PRÉ-writer: gerado 14:12 UTC, PELVE writer mergeou 16:56 UTC, ativou 03/07)
- **Bug (renderer antigo):** comando "Adicione imagem hiperecoica linear..." vazou 2× (cru + versão limpa duplicada); achado não foi pra conclusão.
- **Correção do Luiz:** UMA linha no corpo, posicionada após endométrio: "Imagem hiperecoica linear **na cavidade endometrial**, medindo 3,2 cm no seu maior eixo, distando 0,1 cm da extremidade superior à região fúndica." + conclusão item 5: "**Dispositivo intrauterino (D.I.U.) normoposicionado.**" (inferência clínica: linear hiperecoica na cavidade = DIU).
- **Ação (task 9):** rodar o ditado no PELVE_WRITER atual → golden. Se não inferir DIU → few-shot com este caso real.

## 6afe8f78 — MSK (PRÉ-writer: gerado 02:24 UTC, MSK_WRITER mergeou 06:26 UTC)
- **Bug (renderer antigo):** Baker (joelho) vazou pro laudo do OMBRO; "Subacromial, subdeltoidea." ecoado cru; "Imagem aquática" (garble de anecoica) ecoado; "2.4 centímetros" por extenso; meta-comando ("raciocine a localização") não executado.
- **Sem final_output** (não corrigido) mas feedback negativo do dia.
- **Ação (task 9):** rodar no MSK_WRITER atual → golden multi-segmento (Baker só no joelho, fossa poplítea; anecoica; "2,4 cm"; comando executado).

## RESULTADO SMOKE (03/07) — os 3 críticos endereçados
Ver `tmp-review/smoke-boletim-0207-writers-2026-07-03.txt` (LLM real, gpt-4.1):
- **62f15728 OBST:** fix determinístico mergeado (flag OBST_BIOMETRIA_DET, `defda66`). Aguarda ativação.
- **63a92f8e PELVE:** PELVE_WRITER (piloto ATIVO) → 5/5. Não vaza "Adicione"; achado 1× ancorado na cavidade endometrial; DIU inferido na conclusão. IDÊNTICO à correção do Luiz.
- **6afe8f78 MSK:** MSK_WRITER (LIVE) → 8/8. Ombro e joelho separados; Baker só no joelho (fossa poplítea); sem garble "aquática"/"ibos"; meta-comando "raciocine a localização" executado; 2,4 cm preservado.
> Ou seja: o boletim mediu o RENDERER ANTIGO. PELVE/MSK já foram migrados p/ writer DEPOIS desses laudos (MSK_WRITER 06:26 UTC > caso 02:24; PELVE_WRITER 03/07 > caso 14:12). Os writers resolvem nativamente. Só o OBST precisava de fix novo.

## 9cc8e1d0 — PELVE (bônus, não era DIU)
- Garble de medida: "7.1 por 3.65 0" era "7,1 x 3,6 x 5,0 cm" (saiu "3,65 x 0" + [REVISAR]).
- **Volume implausível:** ditado 0,4 cm³ p/ ovário 1,9×1,4×1,7 → Luiz corrigiu p/ 2,4 = volume elipsoide calculado (0,523×d1×d2×d3).
- **Guard candidato (barato):** conferir volume ditado × elipsoide das dimensões; divergência grande → [REVISAR] ou usar o calculado. (task 10)
