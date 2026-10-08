# Cruzamento Laudário × LaudoUSG — Monitorização folicular

Data: 07/10/2026. O lado do Laudário vem de `cases/monitorizacao-folicular-2026-10-07.md`, relato de um operador autorizado no Chrome com dados sintéticos e modelo restaurado no fim. O lado do LaudoUSG foi conferido no código da `main` em `0d77ac2` e do iOS em `bce4604`, mais uma prova sintética só de leitura com o caminho real da Web: `initialExamState(monitorizacaoFolicular)` → `adaptarPelvePreset` → `renderizarSelecao("PELVE_FEMININA","CLASSICO_COMPLETO")`. Nenhum código clínico, teste, índice ou commit foi alterado. As referências anteriores são `audits/lote3/monitorizacao-folicular-2026-10-05.md`, base `06c88cd`, e o preflight `/tmp/laudario-monitorizacao-preflight.md`.

Rótulos usados: **observado** (UI do concorrente ou execução no LaudoUSG), **inferido**, **candidato a lacuna**, **gap confirmado**. Gap confirmado exige ausência em Web, RN, iOS e shared.

## Síntese

Desde 05/10, o LaudoUSG ganhou um card Web próprio (`0a0611a`) e um parser estrito (`426b838`). Os P0 de laudo emitido em silêncio, ou seja, estado vazio, par de eixos lido como dois folículos, cm virando mm e folículo em ovário não visualizado, passaram a **bloquear**. Ainda falta o que o Laudário já tem: **um folículo com dois diâmetros e média derivada**, uma **distribuição por faixa de tamanho** e uma **conclusão que resume cada lado pelo maior folículo**. Do nosso lado restam três defeitos próprios: valores sem faixa plausível, divergência entre corpo e conclusão quando há achado ovariano, e o campo de folículos ativo fora da monitorização.

| Cenário | Laudário (observado) | LaudoUSG atual (observado na prova) | Classificação |
| --- | --- | --- | --- |
| Estado inicial | módulo desligado; pélvico com conclusão normal genérica | o card bloqueia: exige folículos, útero, endométrio e ovários | o LaudoUSG é **mais seguro**; não reproduzir o concorrente |
| Módulo ligado, zero folículos | publica contagem zero por ovário, tabela vazia e conclusão genérica | bloqueia: exige diâmetros em pelo menos um ovário; não existe o estado explícito “sem folículos mensuráveis” | **gap confirmado** do estado explícito; o comportamento do concorrente **não deve ser reproduzido** |
| 2 × 18 mm no OD | duas linhas, coluna 18 = 2, conclusão pelo maior | `18; 18` vira a lista `18, 18 mm` no corpo; a conclusão repete todos os valores; não há contagem, faixa nem “maior” | **gap confirmado** (derivados) |
| 20 × 16 mm | uma linha com média recalculada para 18 mm | `20 x 16` **bloqueia** (“não use pares de eixos”); não existe modo de registrar dois diâmetros | P0 contido; **gap confirmado** de modelagem por folículo |
| 12 mm no OE | coluna 12 preenchida; conclusão resume cada lado | lateralidade correta; a conclusão lista os valores por lado | parcial |
| Observação livre | entra no corpo com pontuação duplicada | o card não tem campo livre de monitorização; `observacoes_corpo` sai `null` do adaptador | o defeito do concorrente fica como lição; o campo livre é **candidato a lacuna** (P3) |
| Restauração | volta ao estado inicial | apagar o campo não deixa resíduo (`pelvePresets.manual.ts:176`) | equivalente |

## Estado por plataforma

| Plataforma | Evidência | Classificação |
| --- | --- | --- |
| Web — card `MONITORIZACAO_FOLICULAR` | `apps/web/src/lib/deterministic/organs/pelvePresets.ts` (`PELVE_PRESETS`, `derivado`, filtra os controles `modo_pelve` e `menopausa`); `apps/web/src/lib/catalog/migradas.ts:77` mapeia para `PELVE_FEMININA`; aparece no grupo em `apps/web/src/components/laudar/categoryGroups.ts:39`. Portão de folículos em `apps/web/src/lib/catalog/pelveParaCatalogo.ts:224`; parser estrito `foliculosEstritos` em `:108`; bloqueio de folículo em ovário não visualizado em `:142-153`; entrada `adaptarPelvePreset` em `:544`, que chama `adaptarPelveUnificada` em `:576`. Testes em `apps/web/tests/pelvePresets.manual.ts:97-178` | **parcial com portão**: o renderer canônico está ativo, mas o folículo é um único número em texto livre |
| Web — Pelve feminina, Finalidade = monitorização | `apps/web/src/lib/deterministic/organs/pelveFeminina.ts:418` (opção) e `:34` (força a via TV); campo `foliculos_mm` em `:335`, visível em qualquer finalidade | parcial, mesmo motor |
| API — renderer e extrator | `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts`: `foliculos_mm` em `:82`, `modo` em `:87`, regra do extrator em `:375` (só “diâmetros em mm”). Corpo do ovário em `ovarioCorpo` (`:819`): retorna antes dos folículos quando há achado (`:826-835`); o mesmo ocorre na segunda variante em `:1248-1256`. Conclusão em `monitorizacaoConclusao` (`:577`). Gate `RENDERER_CATEGORIES` com padrão vazio (`apps/api/src/server/env.ts:74`); o valor em produção **não foi consultado** | estruturado, ativo pela Web; ditado conforme o ambiente (não verificado) |
| Writer e conhecimento | `apps/api/src/server/prompts/contracts/PELVE_FEMININA.ts` e `packages/knowledge/snippets/PELVE_FEMININA/` sem regra de monitorização. Os normais afirmam “contendo folículos” (`:58`, `:97`, `:118`) | **ausente** |
| Android/RN | só o card genérico `PELVE_FEMININA` (`apps/mobile/src/ui/tokens.ts:157`); `isClinicalModelCode` em `apps/mobile/app/generate.tsx:123`; nenhuma ocorrência de `monitoriz` ou `folicul` em `apps/mobile/src` e `apps/mobile/app` | **genérico** |
| iOS | `LaudoUSG/Models/Category.swift:13` traz só `pelveFeminina`; `LaudoUSG/Services/AFCCalculator.swift` faz contagem de antrais desligada do laudo | **genérico** + calculadora vizinha |
| shared | só o rótulo em `packages/shared/src/categoryPresentation.ts:32` | **ausente** (sem contrato clínico) |

**Fonte de verdade:** na Web, corpo e conclusão saem do mesmo renderer. A conclusão da monitorização, porém, é montada por uma função separada, que não confere o corpo; daí a divergência M4, descrita abaixo. No mobile, a entrada é só o writer, sem regra para esta categoria. A Sala e os esquemas visuais não se aplicam. Hoje, Web e ditado **não compartilham** uma definição de folículo.

## Resultados da prova sintética no LaudoUSG (07/10)

| Caso | Entrada | Resultado | Classificação |
| --- | --- | --- | --- |
| M1 | card vazio | 5 bloqueios | corrigido desde 05/10 |
| M3 / M3b | `18 x 16; 10; 9` / `1,8 cm` | bloqueia (lista ilegível) | P0 contido |
| M3c | `1,8`, sem unidade | publica “1,8 mm” no corpo e na conclusão | **defeito confirmado P0 residual**: falta faixa plausível |
| M3d | `18,16`, sem espaço | publica um folículo de 18,16 mm | **defeito confirmado P1**: separador ambíguo |
| M3e | `45; 0,5` | publica os dois valores | **defeito confirmado P1**: sem faixa 2–40 mm |
| M4 | OD com achado funcional + folículo 19 + líquido | o corpo do OD descreve só a coleção; a conclusão cita “OD: 19 mm” | **defeito confirmado P1**: a conclusão cita o que o corpo não descreve |
| M5 | OD não visualizado + folículo 15 | bloqueia | corrigido |
| M6 | Pelve em rotina com folículos 17; 11 | o corpo publica os folículos | **defeito confirmado P2**: campo fora de contexto |
| M2 | basal `4; 5; 6; 7; 5` / `5; 6; 4` | a conclusão chama o endométrio de “normal para a fase do ciclo” sem que haja campo de dia do ciclo | **gap confirmado P1** (contexto do ciclo) |

## Lacunas confirmadas (Web, RN, iOS e shared)

1. **Folículo com dois diâmetros e média derivada.** O Laudário tem (observado). No LaudoUSG não existe em nenhuma plataforma; a Web bloqueia o par de eixos.
2. **Distribuição por faixa de tamanho**, uma tabela por lado. O Laudário tem; no LaudoUSG está ausente.
3. **Conclusão resumida pelo maior folículo de cada lado.** O Laudário tem. O LaudoUSG lista todos os valores (`PELVE_FEMININA.ts:577`).
4. **Inclusão rápida quantidade × medida.** O Laudário tem; no LaudoUSG está ausente. É conveniência de entrada, não de conteúdo.
5. **Estado explícito “sem folículos mensuráveis” por lado.** Os dois produtos falham: o Laudário imprime zero sem confirmação, e o LaudoUSG só bloqueia.
6. **Contexto do ciclo, série e comparativo, corpo lúteo e sinais de ovulação.** Ausentes no LaudoUSG. **Não observados** no Laudário: o operador não relatou esses campos. Não servem como evidência de cobertura do concorrente; continuam sendo requisitos de 05/10.
7. **Regra de monitorização no writer e entrada específica no RN e no iOS.** Ausentes.

## Comportamento útil do concorrente

- O folículo é a unidade de informação: uma linha com dois eixos e média calculada pelo sistema. Confirma a decisão (a) de 05/10, que pede uma lista repetível por ovário.
- A conclusão muda conforme o resultado: sai do texto genérico quando há folículo medido e resume cada lado pelo maior.
- A inclusão rápida gera linhas editáveis, sem um “total” solto e desconectado das linhas.
- Os lados são independentes: incluir no OE não altera o OD.

## Comportamento que não deve ser reproduzido

- **Zero impresso sem confirmação.** Ligar o módulo vazio publica “zero folículos” por ovário. No LaudoUSG, vazio deve continuar bloqueando, e “sem folículos mensuráveis” só pode sair de uma marcação explícita por lado.
- **Conclusão genérica com o módulo ligado e sem resultado.** A monitorização ligada precisa produzir uma conclusão de monitorização ou bloquear.
- **Normalidade presumida no estado inicial.** É o mesmo risco já confirmado no pélvico (`crosswalk-pelvico-transvaginal-2026-10-06.md`).
- **Texto livre colado sem normalização**, que gera a pontuação duplicada.
- **Redação**: nenhuma frase do concorrente deve ser reaproveitada. A redação do LaudoUSG é original, no estilo Domingos.

## Contrato mínimo proposto (shared, versionado; reforça §5–6 de 05/10)

```
MONITORIZACAO_FOLICULAR v1   (reusa útero, endométrio, ovário e achados anexiais da pelve)
contexto: dia_ciclo (1–60 | "nao_informado"), tipo_ciclo (natural|estimulado|nao_informado), exame_ordem (≥1)
ovario[lado ∈ D,E]:
  visualizado: sim | nao(+motivo)
  estado_foliculos: lista | sem_mensuraveis | nao_avaliado      # vazio ≠ zero
  foliculos[]: { id, d1_mm, d2_mm, d3_mm? }                      # 2–40 mm; aceita cm com conversão exibida
derivados (código, nunca digitados):
  media_mm = média dos diâmetros (1 casa)
  maior_por_lado = max(media_mm)
  faixas_por_lado = contagem por faixa (limites CANDIDATOS, versionados, a validar)
regras:
  conclusao.cita(x) ⇒ corpo.descreve(x) no mesmo lado
  visualizado=nao ⇒ foliculos=[] (bloqueio)
  monitorização ligada ⇒ cada ovário visualizado tem estado_foliculos ≠ nao_avaliado
```

## Provas necessárias antes de ativar

1. Vazio bloqueia; nada de “zero” ou de normalidade presumida.
2. 20 × 16 mm vira um folículo com média 18,0 mm, que é o maior do lado.
3. 2 × 18 mm pela inclusão rápida gera duas linhas, contagem 2 e o maior igual a 18,0.
4. `1,8` sem unidade, ou um valor fora de 2–40 mm, bloqueia ou pede confirmação. `1,8 cm` converte e mostra 18 mm.
5. Achado ovariano mais folículo no mesmo lado: o corpo descreve os dois. A conclusão não cita nada que o corpo não traga.
6. “Sem mensuráveis” no OE: o corpo diz isso de forma explícita, e o OE não recebe “maior folículo”.
7. Remover um folículo atualiza linhas, faixas, maior e conclusão sem resíduo.
8. Finalidade fora de monitorização: o campo de folículos fica oculto e ignorado.
9. Paridade: o mesmo estado clínico gera o mesmo texto vindo do formulário Web e do ditado (extrator) no RN e no iOS.

## Melhorias sugeridas ao LaudoUSG

| # | Controle ou dado | Efeito no corpo e na conclusão | Salvaguardas | Web | Prompt mobile | Prioridade | Evidência e pendência | Tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Faixa plausível no `foliculosEstritos` (2–40 mm) e aviso para valor < 4 com decimal (provável cm) | impede “1,8 mm” e “45 mm” sem revisão | bloqueio, com mensagem que mostra o valor | correção no parser atual (`pelveParaCatalogo.ts:108`) | o extrator preserva a unidade ditada | **P0** | prova M3c/M3e. Os limites precisam de revisão médica | corrige **defeito confirmado** |
| 2 | Corpo × conclusão: `ovarioCorpo` descreve folículos mesmo quando há achado, ou a conclusão cita só o que o corpo cita | elimina a divergência M4 | teste “cada número da conclusão está no corpo do mesmo lado” | renderer canônico (`PELVE_FEMININA.ts:826-835` e `:1248-1256`) | — | **P1** | prova M4. Vale também para `PELVE_FEMININA` e `PELVICO_TRANSVAGINAL` | corrige **defeito confirmado** |
| 3 | Linha por folículo com `d1`, `d2` e `d3` opcional, mais média derivada | corpo: folículos por lado, maior primeiro, com média e eixos. Conclusão: maior folículo por lado | a média nunca é digitada; um eixo isolado gera pendência; razão d1/d2 > 2 gera aviso | tabela repetível por ovário, num componente único parametrizado por lado | agrupar “X por Y” como **um** folículo, com lado obrigatório | **P1** | Laudário observado (C3). Contrato novo em shared | **gap confirmado** |
| 4 | Conclusão pelo maior de cada lado, em vez da lista completa | conclusão curta e comparável entre exames | o lado sem folículo não recebe “maior” | derivado exibido no card | o extrator não calcula; o código calcula | **P1** | Laudário observado (C2/C3). Redação original pendente de revisão médica | **gap confirmado** |
| 5 | Estado “sem folículos mensuráveis” por lado, exclusivo com a lista | o corpo declara a ausência só quando marcada; a conclusão não fica genérica | vazio ≠ zero; vazio continua bloqueando | checkbox por ovário | ditar “sem folículos mensuráveis” gera o estado; o silêncio vira pendência | **P1** | contraexemplo do Laudário (C1) | **gap confirmado** |
| 6 | Distribuição por faixa de tamanho | corpo: tabela ou lista de contagem por faixa. Conclusão: só se a revisão médica aprovar | limites **candidatos**, versionados e configuráveis | tabela derivada somente leitura | — (derivada) | **P2** | Laudário observado; os limites não foram relatados | **gap confirmado**; os limites dependem de revisão médica |
| 7 | Inclusão rápida quantidade × mm | cria N linhas iguais e editáveis | as linhas criadas continuam editáveis e removíveis | atalho acima da tabela | “três folículos de 12” gera 3 linhas | **P2** | Laudário observado (C2) | melhoria de UX |
| 8 | Contexto do ciclo (dia e tipo) | condiciona a frase “compatível com a fase”; sem contexto, o texto é só descritivo | sem dia do ciclo, nenhum juízo de fase | seção Contexto | extrair o dia ou deixar “não informado” | **P1** | prova M2. **Não observado** no Laudário | **gap confirmado** no LaudoUSG; cobertura do concorrente desconhecida |
| 9 | Ocultar e ignorar `foliculos_mm` fora da monitorização | a rotina deixa de publicar folículos soltos | — | `pelveFeminina.ts:335` condicionado à finalidade | — | **P2** | prova M6 | corrige **defeito confirmado** |
| 10 | Observação livre normalizada, se for criada | evita pontuação duplicada e texto solto | trim e ponto final único | campo opcional | — | **P3** | defeito do Laudário (C3) | candidato a lacuna |

**Para o orquestrador:** os itens 2 e 9 afetam também `PELVE_FEMININA`, `PELVICO_TRANSVAGINAL` e os atalhos com Doppler, porque o motor é o mesmo. O padrão “linha com dois eixos e média derivada” serve para qualquer lista repetível de lesões, como miomas e linfonodos.

## Ficha de insumo para a síntese clínica

- **Estruturas:** contexto do ciclo; útero; endométrio (espessura + padrão); ovário D e E (visualização, lista de folículos ou sem mensuráveis, achado); líquido no fundo de saco.
- **Estados selecionáveis:** monitorização (fixa no card); por ovário: lista, sem mensuráveis ou não avaliado; visualizado: sim ou não (+ motivo).
- **Alterações vistas no concorrente:** contagem por lado, linhas individuais, faixas, maior folículo por lado.
- **Medidas e unidades:** diâmetros em mm (2–40, candidato); média com 1 casa; cm só com conversão exibida.
- **Dependências:** média ← eixos; maior ← médias do lado; faixas ← médias (inferido no concorrente); conclusão ← maior por lado; ovário não visualizado ⇒ sem folículos.
- **Corpo:** contagem e folículos por lado (maior primeiro, média e eixos); estado explícito sem mensuráveis; endométrio; líquido.
- **Conclusão:** maior folículo por lado; endométrio descritivo, ou compatível com a fase só quando houver dia do ciclo; achados incidentais pela biblioteca da pelve.
- **Riscos que exigem confirmação médica:** limites das faixas; rótulos de dominância ou maturidade; ovulação ou corpo lúteo (nunca inferidos de um exame isolado); leitura de reserva a partir dos antrais; redação final de todas as frases.

## Evidências relacionadas

- `cases/monitorizacao-folicular-2026-10-07.md` (observação do concorrente)
- `audits/lote3/monitorizacao-folicular-2026-10-05.md` (requisitos e decisão de contrato próprio)
- `crosswalk-pelvico-transvaginal-2026-10-06.md` (normalidade presumida e ovário não caracterizado no pélvico)
- `/tmp/laudario-monitorizacao-preflight.md` (prova de 07/10 e roteiro da UI)
