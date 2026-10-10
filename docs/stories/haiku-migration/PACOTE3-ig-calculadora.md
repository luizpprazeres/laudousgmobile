# PACOTE3 — W1 (base feat/haiku-migration cf299d23)

Branch: `git switch -c fix/ig-calculadora feat/haiku-migration`. Nada de push/deploy/env/banco.

1. **e1f15cab / e5dfd891: 1ª US COM data + linha da calculadora** → o motor projeta a IG a partir da data e diverge da calculadora
   (e5dfd891: "Hoje com 20s2d" [REVISAR] × 26s2d no final do Luiz). Uma diferença de 6 semanas não é divergência clínica plausível:
   antes de tratar como decisão, investigue se é defeito (parse da data dd/mm × mm/dd, ano, data do exame usada como "hoje",
   IG da 1ª US lida em dias × semanas). Se for defeito, corrija com teste. Se a projeção estiver certa e a calculadora divergir
   de verdade, NÃO decida: registre os dois casos no status como decisão do Luiz (qual vence).
2. **ig-renderer.manual.ts**: as 5 falhas esperam a frase anterior à política aprovada na W5. Atualize as expectativas para a
   política W5 (sem mudar o renderer) e confirme que nenhuma outra expectativa caiu.

Obstétrica 46 e morfológico 23 sem piora (Haiku, BENCH_MODEL explícito). No status, a linha `PACOTE3: pronto`.
