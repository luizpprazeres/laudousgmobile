# Comparacao PE local

Pedido: coordenador retoma tarefas sem depender do Spark.

## Aceite
- [x] Reproduzir caso-base e matriz local sem alterar formulas.
- [x] Distinguir evidencia FMF do usuario e execucao local.
- [x] Nao inventar numero de afericoes nem forcar concordancia.

## Arquivos
- apps/web/tests/peComparison20260914.manual.ts
- docs/stories/2026-09-14-pe-comparacao-local.md
- docs/reviews/pe-local-matrix-2026-09-14.json

## Resultado
28 execucoes locais com risco finito no dominio e base repetida estavel.
Base 1:285; MoMs 1.052786519734484 e 0.9232501950109783.
FMF 1:290 fornecido pelo usuario, nao reproduzido pela automacao.
Nao ha causa demonstrada para a divergencia. Sensibilidade a IP 1.49 nao
explica uma entrada confirmada de 1.50. Convencao de idade externa pendente.
Afericoes nao informadas na matriz: nao atribuir 4 afericoes a PAM manual.
Sem mudanca no motor ou validacao clinica inferida dos testes locais.
Lint bloqueado pela configuracao preexistente; npm test executa zero tarefas.

## Limites
Motor preservado. Casos locais nao equivalem a comparacao externa.
Cadastro FMF nao alterado. Nenhuma acao em producao.
