# Fila do estudo e mapa canônico

Atualizado em 07/10/2026. A fila considera impacto clínico, uso provável, diferença de cobertura e risco de inferência automática. Cada rodada continua limitada a um exame e até três cenários sintéticos.

## Cobertura

Foram concluídas rodadas funcionais de 30 dos 84 modelos-base do catálogo, aproximadamente 35,7%. Isso representa 30 das 99 entradas totais, aproximadamente 30,3%. Nenhuma das 15 combinações foi estudada. Ultrassonografia de tórax foi apenas procurada e confirmada como ausente no catálogo observado; por isso não entra na contagem dos 84 modelos-base.

## Próximas prioridades

Em 05/10, a falta de navegador limitou o trabalho a preflights e provas sintéticas do LaudoUSG. A observação foi retomada em 06/10 e as rodadas de Pélvico Transvaginal, Obstétrico 2º/3º Trimestre, Doppler de Carótidas e Vertebrais e Aparelho Urinário foram concluídas. A última incluiu comparação do mesmo painel em Abdome Total e Doppler Aortorrenal. Em 07/10, o Morfológico 2º trimestre recebeu uma sondagem parcial dos gráficos, e Monitorização Folicular, Doppler de Artérias Temporais e Doppler de Artérias Mesentéricas foram concluídos. Obstétrico Gemelar recebeu preflight de código, mas segue pendente de observação. As 19 provas sintéticas continuam indexadas separadamente em `status-estudo-2026-10-03.json` (`laudousg_synthetic_probes`) e nas sínteses em `synthesis/`.

### A. Rodada funcional no Laudário

Os cenários já estão definidos nos relatórios de cada exame. Basta executá-los e comparar.

| Ordem | Exame | Relatório com os cenários |
| --- | --- | --- |
| 1 | Morfológico 2º trimestre — cenários clínicos; gráficos já observados | `audits/lote2/morfologico-2-trimestre-2026-10-05.md` |
| 2 | Obstétrico gemelar 2º/3º trimestre | `audits/lote3/obstetrico-gemelar-2026-10-05.md` |

### B. Próximo lote de prova sintética (ainda sem relatório)

| Ordem | Exame | Motivo | Prova mínima |
| --- | --- | --- | --- |
| 1 | Aparelho urinário com Doppler | não há composição entre `VIAS_URINARIAS` e `DOPPLER_RENAL` | normal; alteração unilateral; escopo incompleto |
| 2 | Abdome superior com Doppler | não há variante; o ditado fica sem campos de Doppler | normal; trombose portal; Doppler não realizado |
| 3 | Pélvico transvaginal com Doppler | o modo Doppler só altera a técnica | normal; lesão vascularizada; Doppler não realizado |
| 4 | Obstétrico com Doppler (1º e 2º/3º trimestre) | fronteira com `DOPPLER_OBSTETRICO` | normal; umbilical alterada; incisura uterina |
| 5 | Musculoesquelético por articulação | o formulário Web existe, sem prova | normal; rotura lateralizada; lado não avaliado |
| 6 | Doppler venoso de membro inferior (TVP) e bilaterais | variantes do contrato venoso | TVP unilateral; bilateral assimétrico |
| 7 | Gemelares (eco fetal, morfológico) | dependem do contrato gemelar | dois fetos normais; alteração em um feto |
| 8 | Obstétrico 3D/4D e primeiro exame combinado | menor prioridade | — |

### C. Implementação a partir de estudo já concluído, sem reestudo

Histerossonossalpingografia (HyCoSy) e Pesquisa de endometriose ainda não têm caminho Web. Ecocardiografia fetal, Perfil biofísico fetal, Histerossonografia, Transplante renal, Aorta e ilíacas, Temporais, Mesentéricas, Mama masculina e Bolsa testicular com Doppler ganharam MVP Web em 05/10.

## Mapa de nomes

| Nome observado no Laudário | Nome canônico LaudoUSG | Código LaudoUSG | Regra |
| --- | --- | --- | --- |
| Doppler Aortorrenal | Doppler renal | `DOPPLER_RENAL` | não criar categoria duplicada |
| Doppler de Carótidas e Vertebrais | Doppler de carótidas e vertebrais | `DOPPLER_CAROTIDAS` | manter a categoria; ampliar o contrato por vaso e lado antes de ativar o renderer no mobile |
| Ecocardiografia Fetal | Ecocardiografia fetal | `ECOCARDIOGRAFIA_FETAL` proposto | categoria nova; não tratar como variante implícita de Obstétrica |
| Perfil Biofísico Fetal | Perfil biofísico fetal | `PERFIL_BIOFISICO_FETAL` proposto | categoria nova com denominador derivado dos componentes avaliados |
| Bolsa Testicular com Doppler | Escrotal | `ESCROTAL` | ampliar o contrato existente; não criar categoria Doppler duplicada |
| Histerossonografia com Infusão Salina | Histerossonografia | `HISTEROSSONOGRAFIA` proposto | categoria própria; compartilhar apenas tipos anatômicos com Pelve feminina |
| Histerossonossalpingografia | Histerossonossalpingografia / HyCoSy | `HYCOSY` proposto | categoria bilateral própria; não reduzir a Pelve feminina |
| Transfontanelar | Transfontanelar | `TRANSFONTANELA` | corrigir somente rótulo; preservar código |
| Doppler de Transplante Renal | Doppler de transplante renal | `DOPPLER_TRANSPLANTE_RENAL` proposto | categoria própria; não encaminhar para o modelo de rim nativo |
| Doppler de Aorta e Artérias Ilíacas | Doppler de aorta e artérias ilíacas | `DOPPLER_AORTA_ILIACAS` proposto | categoria própria; não reduzir a Abdome Total, Doppler renal ou arterial de membros inferiores |
| Próstata Abdominal | Próstata suprapúbica | `PROSTATA_SUPRAPUBICA` | tratar como equivalência de via, não como novo exame |
| Doppler de Fístula Arteriovenosa (FAV) | Doppler de fístula AV | `DOPPLER_FISTULA_AV` | mesma categoria |
| Doppler Aortorrenal / Doppler de Transplante Renal | Doppler renal / Doppler de transplante renal | códigos distintos | transplante não é variante implícita do modelo nativo |

Este mapa serve para comparação e roteamento. Os nomes do concorrente não serão copiados para a redação clínica nem usados para inferir equivalência sem conferir o escopo.

O índice legível por máquina está em [status-estudo-2026-10-03.json](status-estudo-2026-10-03.json).

### Acréscimos de 05/10/2026 (propostas, sem decisão)

| Nome observado no Laudário | Proposta LaudoUSG | Código | Regra |
| --- | --- | --- | --- |
| Pélvico Transvaginal - Monitorização Folicular | Monitorização folicular | `MONITORIZACAO_FOLICULAR` proposto | contrato próprio, com tipos de útero e ovário reaproveitados da pelve |
| Pélvico Abdominal | Pélvico transabdominal | `PELVICO_TRANSABDOMINAL` proposto | card derivado, com via fixa e mesmo renderer |
| Axilas | Axilas | `AXILAS` proposto | card derivado de `MAMARIA` com escopo fixo; linfonodo no contrato `LINFONODO_REGIONAL` |
| Mamas com Doppler / Mamas e Axilas com Doppler | Mamária com Doppler | `MAMARIA` | modo Doppler; não cria código |
| Obstétrico 2º/3º Trimestre - Gemelar | Obstétrico gemelar | `OBSTETRICA` | N fetos no mesmo contrato |
| Morfológico 1º / 3º Trimestre | Morfológico 1º / 3º trimestre | `MORFOLOGICO` | variante por trimestre |
| Tireoide com Doppler | Tireoide com Doppler | `TIREOIDE` | modo Doppler |
| Cervical com Doppler | Cervical com Doppler | `CERVICAL` | modo Doppler com campo explícito de Doppler realizado |
| Doppler de Artérias Temporais | Doppler de artérias temporais | `DOPPLER_ARTERIAS_TEMPORAIS` | MVP Web em 05/10 |
| Doppler de Artérias Mesentéricas | Doppler mesentérico | `DOPPLER_MESENTERICO` | MVP Web em 05/10 |
