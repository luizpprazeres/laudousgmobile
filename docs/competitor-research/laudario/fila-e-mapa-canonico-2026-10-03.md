# Fila do estudo e mapa canônico

Atualizado em 03/10/2026. A fila considera impacto clínico, uso provável, diferença de cobertura e risco de inferência automática. Cada rodada continua limitada a um exame e até três cenários sintéticos.

## Cobertura

Foram concluídas rodadas funcionais de 18 dos 84 modelos-base do catálogo, aproximadamente 21,4%. Isso representa 18 das 99 entradas totais, aproximadamente 18,2%. Nenhuma das 15 combinações foi estudada. Ultrassonografia de tórax foi apenas procurada e confirmada como ausente no catálogo observado; por isso não entra na contagem dos 84 modelos-base.

## Próximas prioridades

| Ordem | Exame | Motivo | Próxima prova mínima |
| --- | --- | --- | --- |
| 1 | Histerossonografia com infusão salina | Exame distinto e ausente | cavidade normal; pólipo; exame incompleto |
| 2 | Histerossonossalpingografia / HyCoSy | Exame distinto e ausente | permeabilidade; obstrução unilateral; limitação |
| 3 | Transfontanelar | Writer exposto sem contrato determinístico | normal; hemorragia; medida incompleta |
| 4 | Doppler de transplante renal | Ausente; material preliminar está em quarentena | inventário e fontes antes de qualquer cenário |
| 5 | Doppler de aorta e artérias ilíacas | Ausente | normal; aneurisma; estenose/oclusão |
| 6 | Doppler de artérias temporais | Ausente e clinicamente sensível | normal; halo; dado unilateral incompleto |
| 7 | Doppler de artérias mesentéricas | Ausente | normal; estenose; preparo/limitação |
| 8 | Aparelho urinário com Doppler | Confirmar se deve compor o contrato renal ou ser categoria própria | normal; alteração unilateral; escopo incompleto |
| 9 | Ecocardiografia fetal gemelar | Reutilizar contrato por feto; não duplicar regras clínicas | dois fetos normais; alteração em um feto; limitação por feto |
| 10 | Primeiro exame combinado | Validar composição sem duplicar contratos | combinação normal; achado em um componente; conflito entre componentes |

Depois entram Aparelho Urinário com Doppler, variantes gemelares após os modelos singleton equivalentes e o primeiro exame combinado. O primeiro combinado deve ser escolhido apenas depois de comparar o contrato de composição existente com o comportamento real da combinação concorrente.

## Mapa de nomes

| Nome observado no Laudário | Nome canônico LaudoUSG | Código LaudoUSG | Regra |
| --- | --- | --- | --- |
| Doppler Aortorrenal | Doppler renal | `DOPPLER_RENAL` | não criar categoria duplicada |
| Ecocardiografia Fetal | Ecocardiografia fetal | `ECOCARDIOGRAFIA_FETAL` proposto | categoria nova; não tratar como variante implícita de Obstétrica |
| Perfil Biofísico Fetal | Perfil biofísico fetal | `PERFIL_BIOFISICO_FETAL` proposto | categoria nova com denominador derivado dos componentes avaliados |
| Bolsa Testicular com Doppler | Escrotal | `ESCROTAL` | ampliar o contrato existente; não criar categoria Doppler duplicada |
| Transfontanelar | Transfontanelar | `TRANSFONTANELA` | corrigir somente rótulo; preservar código |
| Próstata Abdominal | Próstata suprapúbica | `PROSTATA_SUPRAPUBICA` | tratar como equivalência de via, não como novo exame |
| Doppler de Fístula Arteriovenosa (FAV) | Doppler de fístula AV | `DOPPLER_FISTULA_AV` | mesma categoria |
| Doppler Aortorrenal / Doppler de Transplante Renal | Doppler renal / Doppler de transplante renal | códigos distintos | transplante não é variante implícita do modelo nativo |

Este mapa serve para comparação e roteamento. Os nomes do concorrente não serão copiados para a redação clínica nem usados para inferir equivalência sem conferir o escopo.

O índice legível por máquina está em [status-estudo-2026-10-03.json](status-estudo-2026-10-03.json).
