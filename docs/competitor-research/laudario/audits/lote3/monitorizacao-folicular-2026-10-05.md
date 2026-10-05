# Pélvico transvaginal — monitorização folicular: execução sintética e requisitos

- Data: 05/10/2026. Base: `06c88cd` (a main está em `407362d`, que só muda arte do seletor; nada de pelve).
- Laudário: **não observado** (sem navegador). Só existe no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 10, grupo `ginecologia`: “Pélvico Transvaginal - Monitorização Folicular”). Nenhuma frase do concorrente foi vista ou copiada.
- Probe: `audits/probes/probe-monitorizacao-folicular-2026-10-05.ts`. O caminho é o real da Web: `initialExamState` → `adaptarPelve` / `adaptarPelveTransvaginal` → `renderizarSelecao("PELVE_FEMININA", "CLASSICO_COMPLETO")`.
- Vizinhos já estudados (não reestudados aqui): `audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md` (P1–P5) e `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §1. A §1.1 de lá deixou a monitorização “como variante própria, a estudar depois”. Este documento é esse estudo.

## 1. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web — PELVE_FEMININA | controle `Finalidade = Monitorização folicular` (`apps/web/src/lib/deterministic/organs/pelveFeminina.ts:371`). Força via TV (`:33`) e o título. Por ovário há um campo de texto livre `Folículos (mm)` (`:294`), visível em qualquer finalidade. Adaptador `numeros()` (`apps/web/src/lib/catalog/pelveParaCatalogo.ts:91`), sem portão. | **parcial** (texto livre, sem portão) |
| Web — PELVICO_TRANSVAGINAL | o mesmo controle Finalidade é herdado (`organs/pelvicoTransvaginal.ts`, filtra só `via`). O portão `adaptarPelveTransvaginal` cobra útero, endométrio e ovários, mas **não** cobra folículos. | **parcial** (com portão de completude, folículos fora dele) |
| API ditado | `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts`: `modo` + `foliculos_mm` (`:81`, `:86`), corpo `:803`, item de conclusão `monitorizacaoConclusao` `:567`. `RENDERER_CATEGORIES` vazio por padrão (`env.ts:74`) → no ditado vale o writer | **estruturado dormente** |
| Writer / conhecimento | `prompts/contracts/PELVE_FEMININA.ts` não tem regra de monitorização. `packages/knowledge/snippets/PELVE_FEMININA/` também não. | **ausente** |
| Android/RN | card genérico `PELVE_FEMININA` (`apps/mobile/src/ui/tokens.ts:157`), por ditado | **genérico** |
| iOS | `Category.swift:13` genérico. Há uma calculadora de contagem de folículos antrais (`Services/AFCCalculator.swift`, folha em `PlusSheet.swift:103`) que soma D+E e classifica a reserva ovariana. Ela não registra diâmetros, folículo dominante ou série de exames. | **genérico** + calculadora AFC (vizinha, não é monitorização) |
| shared | sem modelo clínico de pelve nem de folículo | **ausente** |

## 2. Inventário Web (o que o médico tem hoje)

| Campo | Opções / tipo | Padrão |
| --- | --- | --- |
| Finalidade | rotina / com Doppler / monitorização folicular / pós-abortamento | rotina |
| Menopausa | checkbox | desmarcado (não conflita com a monitorização) |
| Útero, endométrio, ovários D/E | os módulos da pelve (medidas em texto, `volume_classe=normal`, `frase=padrao`, `visualizado=sim`) | ver P1 da execução de 05/10 |
| Folículos (mm), por ovário | texto livre; o adaptador extrai **todo número** encontrado | vazio |

Não existem campos para: dia do ciclo ou DUM, ciclo natural ou estimulado (e medicação), data e número do exame na série, diâmetros por folículo, padrão endometrial (trilaminar, homogêneo/hiperecogênico), sinais de ovulação estruturados (corpo lúteo, colapso do dominante, líquido), exame anterior para comparar e contagem de antrais.

## 3. Provas (dados sintéticos)

| Cenário | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| M1 estado inicial (PELVE_FEMININA) | Finalidade = monitorização, mais nada | todas as medidas `____`, ovários “com imagens anecoicas” | útero normal, endométrio normal “para a fase do ciclo”, ovários normais “contendo folículos”, “monitorização sem medidas informadas” | nenhuma | **defeito confirmado (P1)**: normalidade completa e laudo emitido sem um folículo medido |
| M1b estado inicial (PELVICO_TRANSVAGINAL) | idem | — | — | 4 bloqueios (útero, endométrio, OD, OE) | correto quanto às medidas. O portão **não** exige folículo na finalidade de monitorização |
| M2 ciclo basal | OD “4, 5, 6, 7, 5”, OE “5, 6, 4” | lista de folículos por ovário | “ovários normais contendo folículos” + item com a lista completa em mm | nenhuma | **observado no LaudoUSG**: lateralidade correta. Não há contagem, dia do ciclo ou leitura de basal; a conclusão só repete números |
| M3 dominante unilateral “18 x 16” | OD “18 x 16, 10, 9” | “folículos medindo 18, 16, 10, 9 mm” | idem na conclusão; OE intacto | nenhuma | **defeito confirmado (P0)**: os dois diâmetros de **um** folículo viram **dois** folículos. Não há média nem identificação do dominante |
| M3b unidade | OD “1,8 cm” | “folículos medindo 1,8 mm” | “ovário direito: 1,8 mm” | nenhuma | **defeito confirmado (P0)**: cm vira mm em silêncio (fator 10) |
| M4 ovulação | OD com achado “funcional” 2,0 × 1,8 × 1,6 cm; o campo de folículos ainda tem “19”; líquido livre | corpo do OD mostra só a coleção funcional, **o 19 mm some** | OD com “coleção provavelmente funcional” + “monitorização — OD: 19 mm” + líquido livre | nenhuma | **defeito confirmado (P1)**: a conclusão cita um folículo que o corpo não descreve. Corpo lúteo não existe como tipo; ovulação não é inferida nem nomeada |
| M5 incompleto | OD `visualizado = não` com “15” no campo | “ovário direito não visualizado” | “OD não visualizado” **e** “monitorização — OD: 15 mm” | nenhuma, nos **dois** adaptadores | **defeito confirmado (P0)**: contradição no mesmo lado. O portão TV só olha medidas e achado do ovário não visualizado |
| M6 remoção | OE “17, 11” → apagado; depois Finalidade volta a rotina com o campo cheio | apagado: volta ao normal sem sobra. Rotina: o corpo mantém “folículos medindo 17, 11 mm” | rotina: sem item de monitorização | nenhuma | apagar não deixa sobra (**observado**). Em rotina o campo continua visível e entra no corpo (**candidato a lacuna P2**: campo fora de contexto) |
| M7 contradição | Menopausa + dominante 18 mm no OD | folículo de 18 mm | endométrio “normal para a menopausa” e monitorização com 18 mm | só o bloqueio de endométrio > 0,5 cm (regra existente) | **candidato a lacuna (P2)**: nenhum aviso para menopausa com folículo em crescimento |

Série de exames (dia 1, dia 2…): **impossível hoje**. Não há campo de data/ordem nem referência a exame anterior, e `observacoes_corpo` sai sempre `null` do adaptador (`pelveParaCatalogo.ts:290`). Cada exame é um laudo isolado.

## 4. Lacunas do Web (e paridade)

1. **P0 — diâmetros fundidos em contagem** (M3): texto livre sem estrutura por folículo. Mínimo: lista repetível por ovário, cada item com 2 (ou 3) diâmetros em mm. Média calculada.
2. **P0 — unidade silenciosa** (M3b): mm fixo, sem aceitar nem converter cm; faixa plausível validada.
3. **P0 — folículo em ovário não visualizado** (M5): bloqueio por lado.
4. **P1 — sem portão próprio** (M1/M1b): a finalidade “monitorização” emite laudo sem nenhum folículo e com ovários “contendo folículos” presumidos.
5. **P1 — corpo × conclusão** (M4): todo número citado na conclusão precisa estar no corpo do mesmo lado.
6. **P1 — contexto do ciclo ausente**: dia do ciclo, ciclo natural ou estimulado, número do exame. Sem isso “endométrio normal para a fase do ciclo” não tem base.
7. **P1 — padrão endometrial**: a monitorização precisa de espessura **e** padrão. Hoje só há homogêneo/heterogêneo.
8. **P1 — sinais de ovulação**: corpo lúteo, desaparecimento ou redução do dominante, líquido no fundo de saco, como achados tipados e ligados ao exame anterior.
9. **P2 — comparativo longitudinal**: tabela de evolução (data × maior folículo por lado × endométrio).
10. **Paridade**: ditado sem regra no writer; iOS/RN genéricos; a calculadora AFC do iOS não conversa com o laudo estruturado.

## 5. Decisão de modelagem

**(a) Contrato próprio, `MONITORIZACAO_FOLICULAR` (proposta).** Não é variante do pélvico. Justificativa:
- A unidade de informação é o **folículo** (lista repetível, diâmetros, média) e a **série**, coisas que o contrato da pelve não tem. Enxertá-las no `PELVE_FEMININA` repetiria o defeito do texto livre.
- A conclusão tem outra semântica: descreve resposta folicular e estado ovulatório, não “pelve dentro dos limites da normalidade”.
- O mesmo exame se repete na mesma paciente em dias próximos. O comparativo precisa de identidade de série, que nenhum contrato atual tem.

Reuso obrigatório (sem segundo motor): os tipos de útero, ovário (lado, visualizado, medidas → volume) e achados anexiais vêm do contrato da pelve em `packages/shared`. A via é fixa TV. Achado incidental (mioma, cisto, endometrioma) usa a mesma biblioteca da pelve. Depois da migração, a opção `monitorizacao_folicular` sai da Finalidade da pelve ou passa a abrir este card (decisão de produto).

## 6. Requisitos originais

### 6.1 Modelo normal (não há “normal” sem dado)

| Estrutura | Dado mínimo | Corpo (intenção) | Conclusão (intenção) |
| --- | --- | --- | --- |
| Contexto | dia do ciclo **ou** “não informado” explícito; tipo de ciclo (natural / estimulado / não informado); nº do exame na série | linha de contexto | entra na frase de resposta folicular |
| Útero | 3 medidas **ou** “avaliação sumária” marcada | posição e medidas, ou só aspecto | sem item, salvo achado |
| Endométrio | espessura (mm ou cm, canônico cm) + padrão | espessura e padrão | espessura e padrão compatíveis com o contexto informado, só com dia do ciclo; sem ele, descritivo |
| Ovário por lado | visualizado + (lista de folículos **ou** “sem folículos ≥ limiar de registro” marcado) | número de folículos e diâmetros médios, maior primeiro | resposta por lado: maior folículo (média) e contagem acima dos limiares escolhidos |
| Fundo de saco | estado marcado (sem líquido / líquido com quantidade) | presença ou ausência | só se houver líquido |

### 6.2 Formulário Web

**Seção Contexto**: `dia_ciclo` (inteiro 1–60, opcional mas com escolha explícita “não informado”); `tipo_ciclo` (natural / estimulado / não informado; se estimulado, `medicacao` texto curto opcional); `exame_ordem` (inteiro ≥ 1, padrão 1); `data_exame` (data, padrão hoje); `exame_anterior` (seleção de laudo anterior da mesma paciente, opcional).
**Seção Útero**: posição; medidas L×AP×T cm (0,5–15); `avaliacao_sumaria` (checkbox, dispensa as medidas e muda o corpo para aspecto sem medidas).
**Seção Endométrio**: `espessura` (cm 0,1–3,0; aceitar “mm” e converter, mostrando o valor convertido); `padrao` (trilaminar / homogêneo hiperecogênico / heterogêneo / não caracterizado); **sem pré-seleção**.
**Seção Ovário D e E** (componente único parametrizado por lado): `visualizado` (sim / não; se não, `motivo`: técnica, gases, ooforectomia, outro); `folículos` = tabela repetível: `d1_mm` e `d2_mm` (2–40 mm; `d3_mm` opcional) → `media_mm` derivada = média dos diâmetros informados, 1 casa; `sem_foliculos_mensuraveis` (checkbox exclusivo com a tabela); `contagem_antrais` (inteiro, opcional, só se o dia do ciclo ≤ 5 ou se o médico marcar “basal”); `achado` (biblioteca da pelve + `corpo_luteo` com medidas e, se houver Doppler, vascularização periférica).
**Seção Pelve**: `liquido_livre` (ausente / pequeno / moderado / acentuado), sem padrão.
**Derivados (shared, com versão)**: média por folículo; maior folículo por lado; contagem por faixa (limiares **candidatos** e configuráveis: ≥ 10, ≥ 14, ≥ 17/18 mm, fonte provável: protocolos de reprodução assistida e consenso ESHRE sobre monitorização; a validar); contagem de antrais total D+E (reuso da regra do `AFCCalculator.swift`, cujos cortes ficam **candidatos** até revisão); delta contra o exame anterior (mm/dia do maior folículo por lado).
**Pendências bloqueantes**: ovário visualizado sem tabela e sem “sem folículos mensuráveis”; folículo com um diâmetro só; diâmetro fora de 2–40 mm; ovário não visualizado com folículos; endométrio sem padrão; `d1/d2` com razão > 2 (aviso, não bloqueio: possível cisto ou folículo colapsado); corpo lúteo e folículo ≥ 17 mm no mesmo ovário sem confirmação.
**Avisos**: menopausa/terapia hormonal no contexto com folículo ≥ 10 mm; folículo > 30 mm (sugerir cisto folicular); diferença > 30% entre a média calculada e um valor colado; exame de ordem > 1 sem exame anterior vinculado.

### 6.3 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `foliculo_dominante` | lado + d1,d2 → média ≥ limiar candidato | folículo dominante no lado, média e diâmetros | folículo dominante no ovário do lado, com a média | lado obrigatório; derivado, nunca digitado |
| `resposta_multifolicular` | contagem ≥ limiar por lado | contagem por faixa | resposta multifolicular, com contagens | só em ciclo estimulado ou com confirmação |
| `sinais_ovulacao` | exame anterior com dominante + hoje: redução/ausência, ou corpo lúteo, ou líquido novo | descreve cada sinal observado | sinais sugestivos de ovulação recente | exige **confirmação médica**; nunca inferido de um exame isolado sem marcação |
| `corpo_luteo` | lado + medidas | estrutura de paredes espessas no lado | corpo lúteo no lado | não pode coexistir com “folículo dominante intacto” no mesmo lado sem confirmação |
| `cisto_folicular_persistente` | folículo > 25–30 mm (candidato) ou persistência em 2 exames | cisto de aspecto folicular | formação cística provavelmente funcional | aviso, não diagnóstico automático |
| `endometrio_padrao` | espessura + padrão + dia do ciclo | espessura e padrão | compatibilidade com a fase só com dia do ciclo | sem dia, só descritivo |
| `antrais_basal` | contagem D/E | contagem por lado | contagem total, sem rótulo de reserva sem confirmação | cortes candidatos |

### 6.4 Prompt mobile (extrator)

Extrair: dia do ciclo, tipo de ciclo e medicação, ordem do exame; para cada folículo, lado e **todos os diâmetros ditados agrupados no mesmo folículo** (“dezoito por dezesseis” é um folículo), com unidade original preservada; endométrio (espessura + padrão); corpo lúteo, líquido e não visualização por lado. Nunca presumir: ovulação, dominância (calculada no código), lado (sem lado, o folículo vai para pendência), dia do ciclo, “ovários normais contendo folículos” quando nada foi ditado.

### 6.5 Casos de aceitação sintéticos

1. Estado inicial → bloqueia; nenhum texto “normal” ou “contendo folículos”.
2. OD 18 × 16 mm + 10 × 9 mm, OE sem folículos mensuráveis → dominante OD com média 17,0 mm; 2 folículos no OD; OE descrito sem folículos mensuráveis; OE não ganha dominante.
3. OD “1,8 cm” → converte para 18 mm e mostra a conversão, ou recusa; nunca grava 1,8 mm.
4. OD não visualizado com folículo → bloqueio por lado.
5. Exame 2 com vínculo ao exame 1 (OD 14 → 18 mm em 2 dias) → evolução 2 mm/dia na tabela; nada de ovulação.
6. Exame 3: OD sem dominante, corpo lúteo 2,0 cm, líquido pequeno, médico confirma → sinais sugestivos de ovulação; sem confirmação → só descritivo.
7. Folículo listado e depois removido → some do corpo, da conclusão e da tabela de evolução.
8. Ciclo basal (dia 3), antrais D 6 / E 5 → contagem total 11; nenhuma classe de reserva sem confirmação.
9. Menopausa no contexto + folículo de 15 mm → aviso exibido; laudo só depois de ciência.
10. Finalidade da pelve em rotina com folículos preenchidos → campo oculto e ignorado (hoje entra no corpo).

## 7. Perguntas para a rodada no concorrente

- Folículos entram como tabela por ovário? Pedem um, dois ou três diâmetros? A média é calculada?
- Existe a noção de série (dia 1, dia 2…) com comparação automática ou com exame anterior anexado?
- Pedem dia do ciclo ou tipo de estímulo? O padrão endometrial é campo próprio?
- Como o laudo nomeia ovulação ou corpo lúteo: só com marcação do médico?
- O que sai com o formulário vazio?

## 8. Ordem de implementação sugerida

1. **P0, já no Web atual**: `numeros()` → parser que agrupa “a x b” como um folículo e recusa “cm”; bloqueio de folículo em ovário não visualizado nos dois adaptadores; portão “monitorização exige folículos ou ‘sem folículos mensuráveis’ por lado”. São correções pequenas e independentes do contrato novo.
2. **P1**: contrato `MONITORIZACAO_FOLICULAR` no shared (reusando tipos da pelve), com derivados versionados e testes dos casos 1–8.
3. **P1**: card Web próprio, com tabela repetível por ovário e componente único por lado; regra corpo ↔ conclusão.
4. **P2**: série/comparativo (vínculo ao exame anterior, tabela de evolução).
5. **P2**: extrator do ditado + regra no writer; iOS/RN depois do contrato; ligar a calculadora AFC ao campo `contagem_antrais`.
