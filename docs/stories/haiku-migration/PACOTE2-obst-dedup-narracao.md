# PACOTE2 — W1 (base feat/haiku-migration 247352cd)

Branch: `git switch -c fix/obst-ig-dedup-narracao feat/haiku-migration`. Nada de push/deploy/env/banco.

1. **IG da US precoce sem data que some** (a3ea0fea, 8/8). Regra da casa: nada ditado some. Veja nos finais do Luiz como ele
   escreve quando a 1ª US vem sem data e siga a política de datação aprovada na W5 (prioridade 1ª US →
   ", corrigida pela ultrassonografia precoce."). Se a frase exigir data, escreva sem a data e sem inventar; documente a escolha.
2. **Item normal repetido na conclusão do 2º trimestre** (itens_conclusao_livres duplicando item fixo): deduplicar de forma
   determinística, com teste.
3. **Guard de narração antes do título** (rebancada da W10b, 1/38 no abdome; exemplo em
   `docs/stories/haiku-migration/rebench-final.md` ou `tmp-review/haiku-migration/status/REBENCH.md`): tirar texto que não é
   laudo antes da primeira linha de título, só quando inequívoco, com testes negativos.

Bancada Haiku nos casos afetados (BENCH_MODEL explícito); obstétrica 46 e morfológico 23 sem piora.
No status, a linha `PACOTE2: pronto` ao terminar.
