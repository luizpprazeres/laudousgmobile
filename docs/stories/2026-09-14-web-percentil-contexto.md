# Percentil manual invalidado ao mudar peso ou IG

Status: implementada e verificada localmente pelo coordenador. Sem deploy.

Contexto: a story 2026-09-14-web-percentil-pendencias fez percentil vazio/inválido
bloquear a montagem. Faltava o caso de um percentil válido, digitado para um peso
e uma IG, continuar sendo usado em silêncio depois que o médico (ou o companion)
altera esses valores.

## Contrato lido

- Chaves reais: `biometria.peso`, `ig.bio_sem`, `ig.bio_dias` e
  `crescimento_fetal["avaliar.sim.percentil"]` (OBST, MORFO e Doppler combinado).
- `fetalGrowthDaTela` bloqueia percentil vazio com `avaliar=sim`; basta limpar o campo.
- Companion (`applyCompanionStructured`) só grava percentil em OBST/MORFO, quando
  `data.percentile` contém dígito; no Doppler obstétrico nunca grava.

## Aceite

- [x] Mudança semântica de peso, semanas ou dias limpa somente o percentil,
      mantendo `avaliar`, fonte, confirmações e demais seções.
- [x] Mesma grandeza com vírgula/ponto ou espaços não invalida.
- [x] Campo não relacionado (DBP, referência, fonte, Doppler) não invalida.
- [x] Sem percentil preenchido: estado devolvido sem cópia.
- [x] Atualização que traz percentil novo (ou companion que reenvia percentil)
      preserva o valor recebido.
- [x] OBST, MORFO e Doppler combinado herdam o bloqueio; Doppler isolado segue
      sem pendência de crescimento; reset agrupado inalterado.
- [x] Helper puro e imutável.

## Ownership

- apps/web/src/components/laudar/LaudarWebExperience.tsx
- apps/web/src/components/laudar/fetalGrowthContext.ts (novo)
- apps/web/tests/fetalGrowthContext.manual.ts (novo)
- docs/stories/2026-09-14-web-percentil-contexto.md

Sem alterar adaptadores, fórmulas, catálogo, shared, API, mobile, prompts ou produção.

## Limites

- A datação de referência (DUM/US precoce) não invalida: o percentil é informado
  para a biometria atual (`bio_sem`/`bio_dias`), que é a âncora da tela.
- Rascunho de texto editado à mão não é tocado; o laudo gerado passa a exibir o
  aviso de pendência existente.

## Evidências

Coordenador executou 74 casos do helper, typecheck (8 pacotes), build web e
git diff --check com sucesso. Playwright passou incluindo mudanca de peso,
formato numerico equivalente e campo DBP nao relacionado, alem da suite
anterior de modos, rascunhos, impressao e falhas. Auth/save simulados.
Capturas: /var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-CB4xT1.
Teste adicional do coordenador: apps/web/tests/dopplerWeb.browser.manual.ts.
Lint permanece bloqueado por configuracao ESLint preexistente; npm test
executa zero tarefas, nao conta como teste positivo.
Implementacao delegada a Claude Code Opus; revisao e execucao pelo coordenador.
