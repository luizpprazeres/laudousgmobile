# Aprovações do Dr. Luiz — golden cases (rolling)

## DOPPLER_CAROTIDAS — ✅ APROVADO (23/07)
Estilo e conteúdo aprovados integralmente. Único ajuste: **formato da velocimetria**.
- Cada artéria: linha de rótulo (com toda a caracterização: paredes, médio-intimal, tipo de fluxo, turbulência etc.) terminada em **":"**.
- Linha seguinte com as medidas no padrão: **`Pico sistólico de X cm/s | Velocidade diastólica final de Y cm/s | IR de Z.`**
- "IR" abreviado (não "índice de resistência") NESTA linha de medidas.
- Razão ACI/ACC entra na mesma linha das medidas quando presente (`… | IR de 0,65 | Razão ACI/ACC de 2,3.`); quando não há IR informado (estenose crítica), a razão fecha a linha.
- Linhas SEM velocidade (bulbo carotídeo) permanecem como frase descritiva única.
- **Ação de writer:** este é o few-shot canônico da variante carótidas. O prompt do writer de DOPPLER_CAROTIDAS deve reproduzir esse layout de duas linhas por artéria.

## TODAS as 9 categorias — ✅ APROVADAS (23/07)
Luiz: "as outras categorias eu já aprovei também" + carótidas aprovado. Todas viram few-shots/writer.

## Decisões transversais — RESOLVIDAS (23/07)
1. Conclusão item único → SEM número (estilo-casa vence).
2. Adjetivo ecogênico → ecoico (feito: golden cases + 27 snippets).
3. "compatível com X" fora do corpo → limpar snippets regra/ (só frases de corpo; NÃO tocar conclusao/, excecao/ de conclusão, nem instruções "NÃO escrever compatível com").
4. Título: vascular puro = "ULTRASSONOGRAFIA DOPPLER …" (sem COM); órgão+Doppler complementar = "… COM DOPPLER COLORIDO" (ex.: bolsa escrotal). Codificado em estilo-casa §8b.
5. COMENTÁRIOS: manter frequências canônicas por categoria.
