# API obstetrica Doppler: modo, bundle e contrato

## Estado atual: fail-closed plain (14/09)

Esta secao substitui a entrega com apenas warning descrita no historico abaixo.
Conflitos fortes em OBSTETRICA explicitamente simples agora sao RECUSADOS;
nao sao casos aprovados de fidelidade. Nada e reclassificado ou apagado.

- [x] Verificacao de entrada antes de lookups, structurer/writer e persistencia
  do rascunho, usando consolidated_transcript ?? raw_input, a mesma fonte da
  geracao (nao concatena texto antigo ja corrigido). Usa error SSE existente
  (PIPELINE_FAILURE + message), com orientacao escolher Obstetrica com Doppler
  ou revisar o ditado. Pode haver open/heartbeat, nunca token/done nessa recusa.
- [x] Detector forte contextual: pedido atual de complemento, dopplervelocimetria,
  indice numerico associado a vaso, RCP numerica ou fluxo alterado por vaso.
  Nao usa umbilical nem IP/IR soltos como bloqueio.
- [x] Tolerados nos testes: cordao umbilical 3 vasos, verbo ir, BCF/batimentos por
  modo Doppler, sem Doppler, nao realizado, historico/exame anterior, anatomia
  placentaria e indice nao informado. Historico seguido de dado atual conflitante
  e recusado. Detector e lexical conservador, nao compreensao clinica completa.
- [x] Tokens de OBSTETRICA explicita ficam retidos em memoria na rota, tanto
  renderer/writer como fallback. Checagem de saida ocorre antes de generated e
  da liberacao do texto; vazamento reconhecido gera error/descartado pelo catch
  existente. Somente texto aprovado e liberado em token unico seguido de done.
  Outras categorias mantem streaming. Writer V2 nao contorna a regra.
- [x] Politica longa de suprimir dados removida; prompt curto preserva modelo,
  achados/medidas/variacoes/negacoes e nao inventa complemento vascular.
- [x] 19 contextos aceitos, 12 conflitos recusados e 6 simulacoes com expressoes
  e loops reais da rota: zero token/done/generated nas recusas, inclusive fallback.
- [x] Fidelidade REAL separada: somente 2 chamadas novas gpt-5.4-mini/none,
  classico e objetivo, input verdadeiramente plain. Ambas preservaram variacao
  320 g, dilatacao renal esquerda 8 mm e negacao de dilatacao direita, alem de
  biometria/placenta/MBV. Evidencia tmp-review/obstetrica-legitimate-plain-live.json.

Compatibilidade lida: Android GenerateSSEEvent aceita code/message strings e seu
reducer conserva texto parcial no erro; iOS decodifica error e limpa texto parcial.
Por isso reter tokens era necessario, nao apenas sinalizar apos streaming.
Nao foi localizado consumidor SSE /api/generate no frontend web deste checkout;
web usa composicao propria. UI/e2e em dispositivo continuam com o coordenador.

Limites: testes sinteticos executam partes reais da rota, nao HTTP completo com
auth/DB. Nao ha prova em dispositivo. Retencao so vale para category_hint=OBSTETRICA;
chamadas diretas runWriterStream nao sao endpoint de entrega e continuam streaming.
Terminologia inesperada, referencias historicas misturadas no mesmo trecho ou
ASR podem escapar ou gerar falso positivo. O detector nao garante fidelidade de
todos os achados; as 2 amostras plain nao provam correcao dos defeitos anteriores.
Nao houve retry ate ficar verde, mudanca de modelo, DB/DML ou deploy.

Teste novo: apps/api/src/server/pipeline/__tests__/obstetricaPlainFailClosed.manual.ts.
O teste live existente agora roda por padrao somente os dois casos plain; matriz
antiga conflitante fica historica (LEGITIMATE_PLAIN=0), nao representa aceite atual.

Revisao Aristotle: corrigidos os tres itens obrigatorios. "Agora" separa dado
atual de historico; Doppler qualitativo com vaso nomeado bloqueia normal/alterado
e resistencia aumentada. As quatro frases reproduzidas foram testadas tanto na
entrada quanto na saida. Controle sem Doppler das arterias uterinas/nao realizado
tambem passa. Dois testes adicionais executam o seletor real da rota: consolidado
corrigido vence raw conflitante e consolidado conflitante vence raw simples.
PIPELINE_FAILURE permanece como codigo externo existente; mensagem amigavel
especifica e exibivel pelos clientes. Nenhuma nova chamada IA nessa revisao.

## Escopo e ownership

Autorizado por Luiz em 14/09/2026. Somente requestedExam.ts, generate/route.ts,
writer.ts, buildSystemMessage.ts, testes novos e esta story. Dirty de 13/09
preservado. Nenhuma edicao em DB, clientes, renderer categories ou deploy.
Coordenador cuida dos relatos, banco e contrato MORFOLOGICO; Heisenberg cuida
do adapter web. AGENTS.md e .aios-core/constitution.md nao existem neste checkout.

Base: ADR-0004, arquitetura convergida de 25/07, story Sprint 2 Doppler de
29/08 e story Doppler/App Store de 13/09. A decisao atual substitui o default
isolado da Sprint 2: entrada Doppler sem modo agora significa combinado.

## Checklist

- [x] Confirmar limites antes de editar e ler dirty dos arquivos compartilhados.
- [x] Resolver puro: DOPPLER_OBSTETRICO default combined; isolated so opt-in.
- [x] Preservar escolha OBSTETRICA e MORFOLOGICO contra palpite do structurer.
- [x] Combinado remapeado OBSTETRICA para renderer; writer recebe bundle Doppler.
- [x] Nao carregar bundle combinado para isolated; selecionar modelo em codigo.
- [x] Selecionar contrato isolado explicitamente sem modificar contracts/index.ts.
- [x] Combinado sem contrato OBSTETRICA sem Doppler nem modelo objetivo conflitante.
- [x] Impedir fallback combinado sem bundle quando o renderer falha.
- [x] Persistir modo resolvido tambem para cliente antigo.
- [x] Pedido adicional: reforco MORFOLOGICO ao final, apos globais/CoT, reutilizando
  contrato do coordenador; precedencia expressa para percentil e cervicometria.
- [x] 96 casos locais executam expressoes reais da rota, writer e prompt reais.
- [x] Testar flag standalone ativa, categoria enviada ao renderer, bloqueio de
  fallback sem bundle e exclusao de modelo combinado no isolado.
- [ ] Validacao clinica live apos patch, sob coordenacao externa.
- [x] Typecheck API repetido pelo coordenador apos corrigir teste: passou.
- [ ] Lint: bloqueado pelo assistente de configuracao ESLint preexistente.
- [ ] npm test: zero tarefas; nao conta como gate aprovado.

## Evidencia e limites

Comando local: `pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/pipeline/__tests__/obstetricDopplerFlow.manual.ts`.
Matriz: quatro categorias, tres modos, dois estilos, writer principal/fallback,
ditado cru/achados estruturados. Teste extrai AST da rota e executa as expressoes
de selecao e chamadas reais ao writer; banco e transporte OpenAI sao simulados.
Nao e teste HTTP completo, acesso live ao banco, extracao real nem validacao do
texto clinico gerado. O modelo sintetico tem marcador para detectar perda/troca.

Coordenador confirmou modelo combinado live nos quatro estilos, sem variant tags;
nao houve verificacao live por esta frente nem necessidade de DML.
Teste legado requestedExam.manual.ts atualizado pelo coordenador: sem modo
significa combinado conforme requisito atual.

Goldens existentes doppler-obstetrico-golden.manual.ts: 26 passaram, zero falhas.
diff --check passou. Nenhum deploy nem DML executado.

## File List

- apps/api/src/server/pipeline/requestedExam.ts
- apps/api/src/app/api/generate/route.ts
- apps/api/src/server/pipeline/writer.ts
- apps/api/src/server/prompts/buildSystemMessage.ts
- apps/api/src/server/pipeline/__tests__/obstetricDopplerFlow.manual.ts
- docs/stories/2026-09-14-api-obstetrica-doppler.md

## Fechamento plain no writer/fallback (14/09)

Status: implementacao local de escopo e observabilidade concluida; NO-GO para
afirmar fidelidade clinica suficiente apenas com prompt. Sem DB/DML/deploy.
As mudancas paralelas de MORFOLOGICO e seu renderer foram preservadas.

- [x] includeDoppler=false encaminhado pela rota aos dois writers somente com
  category_hint=OBSTETRICA; chamadas diretas sem parametro nao mudam.
- [x] Modelo original OBSTETRICA preservado integralmente; a referencia ao modo
  Doppler nos batimentos nao e apagada nem confundida com dopplervelocimetria.
- [x] Politica explicita restringe complemento, sem substituir achados vasculares
  por normalidade nem apagar o ditado, biometria, placenta ou outros achados.
- [x] Writer V2 experimental nao contorna essa politica para OBSTETRICA explicita.
- [x] Aviso de conflito de entrada emitido via SSE e integrado aos avisos
  persistidos/sanity. Detector observacional de vazamento na saida tambem avisa;
  nao remove frases, nao bloqueia a entrega e nao e detector clinico completo.
- [x] 16 comparacoes de prompt, ligacoes reais de argumentos principal/fallback,
  desvio V2 e avisos SSE/persistidos testados localmente.
- [x] 96 casos de conexao e 384 comparacoes de prompt passaram.
- [x] Fidelidade live completa: 18/18 em duas rodadas com a politica final (14/09, Claude). Historico: 13/18 (Codex), 6/18 no baseline reproduzido, 9/18 so com a politica reforcada, 18/18 + 17/18 + 18/18 apos a sanitizacao do ditado; a unica falha intermediaria (MBV convertido em ILA) virou regra explicita.

### Fechamento da fidelidade live — 14/09/2026 (Claude)

Causa raiz das falhas: a politica antiga pedia "preserve todos os achados" e
"nao acrescente Doppler" ao mesmo tempo, e o modelo (gpt-5.4-mini, o mesmo de
producao segundo generation_audit) resolvia o conflito transcrevendo os indices
ditados. Mudancas em `obstetricaPlainPolicy.ts` e `writer.ts`:

1. `stripDopplerClauses`: quando o escopo e obstetrica simples, o writer nao
   recebe as clausulas vasculares do ditado (raw, transcript e achados.texto).
   Segunda barreira; a rota continua recusando o ditado com Doppler antes.
2. Politica reforcada: medida com unidade, peso + variacao juntos, negacoes como
   frase propria, achado fora do modelo entra no corpo (nao so na conclusao),
   MBV nao vira ILA, conferencia item a item ao final.
3. Teste live parametrizado por PLAIN_MODEL/PLAIN_REASONING (padrao inalterado).

Evidencias (nao versionadas): apps/api/tmp-review/obstetrica-plain-writer-live-v3-run1.json
(18/18), -v3-run2.json (17/18), -v4-run1.json (18/18), obstetrica-legitimate-plain-live.json (2/2).
Offline: obstetricaPlainWriter (16 prompts + strip), obstetricaPlainDoppler (24),
obstetricaPlainFailClosed (19+12+6), obstetricDopplerFlow (96), requestedExam (11).

Live: gpt-5.4-mini, reasoning none, bundles OBSTETRICA validados lidos pelo loader
real, dados sinteticos, tres cenarios x dois estilos x tres entradas. As entradas
primary/fallback invocam o mesmo writer real com os respectivos argumentos;
nao foi um HTTP completo nem falha real do renderer. Os achados estruturados
do teste sao texto sintetico dentro de achados.texto, nao extracao LLM real.
Nenhum report foi criado. Configuracao de producao nao mudou.

Controle sem politica: 1/1 passou. Portanto esse controle nao reproduz o defeito
nem estabelece melhora causal. Matriz com politica: primeira checagem 9/18;
apos corrigir falsos positivos do teste (MBV valido e colo uterino nao vascular),
releitura dos MESMOS outputs, sem nova IA, resultou em 13/18. Nao houve escolha
de novas amostras ate conseguir verde.

Falhas: um classico perdeu a medida renal de 8 mm, mantendo so o diagnostico;
um objetivo reteve Doppler umbilical com diastole ausente no corpo e impressao;
um objetivo perdeu a variacao ponderal de 320 g; dois objetivos omitiram a
negacao de dilatacao das pelves renais. Detector de saida reconheceu o vazamento
vascular observado, sem apaga-lo. A falta de outros achados nao e corrigida pela
politica. Foram observados tambem placeholders/itens de conclusao nao incluidos
nos asserts principais; esses testes nao cobrem toda a fidelidade do modelo.

Evidencias locais sinteticas (nao versionadas):
tmp-review/obstetrica-plain-writer-control.json,
tmp-review/obstetrica-plain-writer-live.json,
tmp-review/obstetrica-plain-writer-recheck.json.

Comandos:
`pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/prompts/__tests__/obstetricaPlainWriter.manual.ts`
`pnpm exec tsx --env-file=.env --tsconfig apps/api/tsconfig.json apps/api/src/server/pipeline/__tests__/obstetrica-plain-writer-live.manual.ts`

Arquivos adicionais desta etapa:
apps/api/src/server/prompts/obstetricaPlainPolicy.ts,
apps/api/src/server/prompts/__tests__/obstetricaPlainWriter.manual.ts,
apps/api/src/server/pipeline/__tests__/obstetrica-plain-writer-live.manual.ts.
Tambem ajustados writer.ts, buildSystemMessage.ts, generate/route.ts e
obstetricDopplerFlow.manual.ts. Nao alterados renderer/extraction nesta etapa.
