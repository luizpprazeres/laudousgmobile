# Síntese do lote 2 — oito categorias, provas sintéticas no LaudoUSG

Data: 05/10/2026. Base: `main` em `01155d0`, lida e executada sem edição. Artefatos só no worktree `docs/laudario-preflights-2026-10-05`.

**Laudário: não observado.** O navegador continuou indisponível. Do concorrente, só se sabe que as oito categorias existem no catálogo. Cada arquivo do lote traz uma seção de perguntas para a rodada com navegador. Nenhuma frase do concorrente foi usada, e os requisitos são originais.

Todos os defeitos abaixo foram **provados por execução** do caminho Web real (formulário → adaptador → renderer do catálogo, ou compositor local nos MVPs). Os scripts estão em `audits/probes/`; reconferi por reexecução carótidas, cervicometria e nefrectomia.

## Arquivos

| Categoria | Código | Relatório | Web | Android/RN | iOS | API ditado |
| --- | --- | --- | --- | --- | --- | --- |
| Doppler de carótidas e vertebrais | `DOPPLER_CAROTIDAS` | `audits/lote2/doppler-carotidas-vertebrais-2026-10-05.md` | estruturado ativo | genérico | genérico | renderer dormente → writer |
| Doppler de artérias temporais | `DOPPLER_ARTERIAS_TEMPORAIS` | `audits/lote2/doppler-arterias-temporais-2026-10-05.md` | **MVP novo**, estruturado ativo | ausente | ausente | ausente |
| Doppler de artérias mesentéricas | `DOPPLER_MESENTERICO` | `audits/lote2/doppler-arterias-mesentericas-2026-10-05.md` | **MVP novo**, estruturado ativo | ausente | ausente | ausente; roteia para abdome |
| Aparelho urinário | `VIAS_URINARIAS` | `audits/lote2/aparelho-urinario-2026-10-05.md` | estruturado ativo | genérico | genérico | renderer dormente → writer |
| Abdome superior | `ABDOMEN_SUPERIOR` | `audits/lote2/abdome-superior-2026-10-05.md` | estruturado ativo | genérico | genérico | renderer dormente → writer |
| Cervical / linfonodos | `CERVICAL` | `audits/lote2/cervical-linfonodos-2026-10-05.md` | estruturado mínimo | genérico | genérico | renderer dormente → writer |
| Morfológico 2º trimestre | `MORFOLOGICO` | `audits/lote2/morfologico-2-trimestre-2026-10-05.md` | estruturado ativo (4 sistemas) | genérico | genérico | renderer dormente → writer |
| Cervicometria | `CERVICOMETRIA` | `audits/lote2/cervicometria-2026-10-05.md` | estruturado ativo | genérico | genérico | renderer dormente → writer |

Com o lote 1 de hoje (pélvico e obstétrico), dez categorias têm prova sintética. A contagem de estudo funcional do concorrente segue em 23/84.

## Defeitos P0 provados

| # | Categoria | Entrada sintética | Saída atual | Correção mínima |
| --- | --- | --- | --- | --- |
| 1 | Carótidas | placa na ACI direita com 70% de estenose; classificação mantida no padrão “normal” | conclusão: estudo dentro da normalidade | conclusão derivada dos achados por lado; classificação “normal” com achado vira pendência |
| 2 | Carótidas | vertebral esquerda retrógrada | conclusão normal | idem |
| 3 | Carótidas | classificação 50–69% ou oclusão sem lado | conclusão sem vaso e sem lado, com espaço antes do ponto | lado e vaso obrigatórios na classificação |
| 4 | Carótidas | formulário intocado | laudo normal completo, sem pendência | sem “Normal” e “Anterógrado” pré-marcados |
| 5 | Cervical | linfonodo atípico que deveria ser à direita | sem lado em nenhuma camada; “demais níveis” normaliza o outro lado | lado obrigatório e estado por lado |
| 6 | Cervical | linfonodo redondo, sem hilo, com vascularização periférica, sem marcar “suspeito” | conclusão de aspecto reacional | a conclusão não pode contradizer os descritores; sem confirmação, só descreve |
| 7 | Cervical | só clicar “Alterado” | nível III, forma oval, hilo presente, sem fluxo e título “com Doppler”, todos presumidos | nenhum descritor pré-preenchido; título Doppler só com Doppler realizado |
| 8 | Abdome superior | qualquer caso | aorta e veia cava descritas como normais sem controle na tela | estrutura com estado próprio ou fora do escopo |
| 9 | Abdome superior | cálculo vesicular sem medida | “cálculo móvel” sem confirmação e sem pendência | mobilidade só se marcada; medida exigida |
| 10 | Aparelho urinário | rim direito em nefrectomia | corpo afirma rim direito habitual e logo depois nefrectomia; o rim some da conclusão | estado `ausente (cirurgia) / não visualizado` por rim |
| 11 | Morfológico | formulário intocado | conclusão de morfologia sem alteração; cordão com três vasos afirmado com o campo em “não informar” | nenhuma normalidade sem marcação; cordão respeita o campo |
| 12 | Morfológico | achado fora dos 4 sistemas (pé torto, foco ecogênico) | entra no corpo pelo texto livre, sem item de conclusão | achado tipado com item de conclusão ou dispensa explícita |
| 13 | Morfológico | coração com avaliação limitada | “quatro câmaras” afirmado ao lado da limitação | estado limitado por estrutura apaga as afirmações normais dela |
| 14 | Cervicometria | “5” digitado (5 mm) | 5,0 cm e colo normal | unidade explícita no campo e faixa plausível bloqueante |
| 15 | Mesentérico | ditado com código `..._ABDOMINAL_MESENTERICO` | normalizado para Abdome total com Doppler, sem campos de TC/AMS/AMI | regra de família própria quando a categoria existir na API; até lá, pendência |

O lote 1 acrescenta três P0: endométrio sem normalidade presumida, mioma junto da adenomiose e MBV gemelar (`audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md`).

## Padrões transversais

1. **Normalidade pré-marcada.** Em carótidas, abdome superior, aparelho urinário, morfológico e cervical, o formulário intocado publica um laudo normal completo, sem pendência. Os MVPs novos (temporais, mesentérico, aorta e ilíacas) já resolvem isso com estados por segmento e bloqueio em branco. Esse é o padrão a levar às categorias migradas.
2. **Conclusão desacoplada do corpo.** Achado no corpo com conclusão normal (carótidas, morfológico) e item de conclusão sem base no corpo (resíduo vesical, dilatação ureteral sem texto, mioma do lote 1). Um validador único de coerência resolve a família inteira.
3. **Lateralidade ausente ou perdida.** Cervical não tem lado. Carótidas aceita classificação sem lado. A dilatação ureteral não tem controle de lado. A assimetria dos ossos longos no morfológico não é representável.
4. **Unidade e plausibilidade.** Cervicometria (mm × cm), placenta–orifício interno em duas unidades, EMI de 8 mm aceita, VPS de 1,4 cm/s aceita no mesentérico. É preciso uma faixa plausível por campo, com bloqueio, e não só a correção acima de um teto.
5. **Valores pré-selecionados viram fatos.** Localização do cálculo renal (“polo superior”), nível III e hilo do linfonodo, “intramural” do mioma (lote 1), “fluxo detectável” em ramo limitado de temporais ou em vaso limitado do mesentérico.
6. **Ditado sem estrutura.** Com `RENDERER_CATEGORIES` vazio, todas as categorias migradas vão para o writer no mobile. Os MVPs novos não existem no ditado, no Android/RN nem no iOS. Os snippets divergem do renderer em abdome superior, cervical e obstétrico.

## Requisitos comuns a todas as categorias (originais)

Cada relatório do lote traz modelo normal, biblioteca de alterações, formulário Web e extrator mobile próprios. Os princípios abaixo valem para todos e reforçam os da seção 0 de `requisitos-pelve-obstetrico-2026-10-05.md`:

- **Estado por estrutura:** `não avaliado`, `normal`, `alterado` e `limitado` com motivo; `ausente` (cirurgia ou agenesia) onde a anatomia permitir. Nenhum valor nasce marcado como normal.
- **Normal com dado mínimo:** cada frase normal declara os campos de que depende; sem eles, pendência visível.
- **Coerência obrigatória:** validador compartilhado corpo ↔ conclusão, igual para renderer, compositor local e auditoria do writer.
- **Lateralidade obrigatória** em toda estrutura par e em todo achado lateralizável. A estrutura do lado não avaliado não é descrita.
- **Unidade explícita no rótulo do campo e faixa plausível bloqueante:** colo e placenta–orifício interno em mm, espessura médio-intimal em mm, velocidades em cm/s, órgãos em cm.
- **Descritor só por ação:** nada pré-selecionado entra no texto. Opções vazias significam “não informado”.
- **Classificação e diagnóstico com dados mínimos e confirmação,** como já fazem os MVPs de temporais e mesentérico.

## Ordem de implementação proposta

| Etapa | Escopo | Por quê | Esforço |
| --- | --- | --- | --- |
| 1 | **Validador de coerência corpo ↔ conclusão** no shared, aplicado ao renderer do catálogo e aos compositores locais | fecha os P0 1, 2, 12 e os do lote 1 de uma vez | médio |
| 2 | **Carótidas:** remover “Normal” e “Anterógrado” pré-marcados, conclusão derivada por lado, classificação com lado e vaso obrigatórios, limpeza ao remover a placa, EMI plausível | P0 de alto uso e com risco clínico direto | pequeno a médio |
| 3 | **Cervicometria e placenta:** unidade única em mm com faixa plausível, campo placenta–orifício interno compartilhado com o obstétrico, IG como entrada do cálculo | erro de escala silencioso, correção barata | pequeno |
| 4 | **Cervical:** lado, estado por lado e por nível, linfonodos em lista, sem descritores pré-preenchidos, Doppler só quando realizado | P0 de lateralidade e presunção | médio |
| 5 | **Aparelho urinário e abdome superior:** rim `ausente / não visualizado`, cálculo sem localização pré-marcada e com medida, aorta e cava com estado, vesícula `não visualizada` separada de `ausente`, jejum na técnica | P0 de falsa normalidade em exames de alto volume | médio |
| 6 | **Morfológico:** anatomia por estrutura (não por sistema), achados tipados com item de conclusão, avaliação limitada por estrutura, ossos longos por lado | maior lacuna estrutural; compõe com o contrato obstétrico do lote 1 | grande |
| 7 | **MVPs vasculares novos:** temporais (ramo limitado sem herdar normalidade; espessura com faixa mínima para contar como marcador) e mesentérico (motivo de não avaliado, fase pós-prandial com medidas, VPS plausível, aviso de lesão < basal) | ajustes P1 em MVPs que já seguem o padrão certo | pequeno |
| 8 | **Ditado e paridade:** códigos novos (`DOPPLER_ARTERIAS_TEMPORAIS`, `DOPPLER_MESENTERICO`, `DOPPLER_AORTA_ILIACAS`, `DOPPLER_TRANSPLANTE_RENAL`) no seed, na normalização da API e nos seletores Android/RN e iOS; decidir o gate `RENDERER_CATEGORIES` ou um extrator por contrato | o mobile não vê o que a Web já tem | grande |
| 9 | **Rodada funcional no Laudário** das dez categorias com prova sintética, para fechar as perguntas pendentes | comparação real; não bloqueia as etapas 1–7 | por exame |

As etapas 1 a 5 podem seguir sem esperar o concorrente nem a revisão médica de frases, porque removem afirmações sem dado e não criam conteúdo clínico novo. As etapas 6 e 8 e os limiares candidatos dependem da revisão do Luiz.

## Próximo lote sugerido

Tireoide com Doppler, que tem um indício de linfonodos “preservados” pré-marcados (`apps/web/src/lib/deterministic/organs/tireoide.ts:195-196`); Doppler obstétrico; próstata suprapúbica e transretal; partes moles; mamas com Doppler; monitorização folicular.
