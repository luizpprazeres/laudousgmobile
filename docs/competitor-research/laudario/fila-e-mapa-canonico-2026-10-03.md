# Fila do estudo e mapa canônico

Atualizado em 03/10/2026. A fila considera impacto clínico, uso provável, diferença de cobertura e risco de inferência automática. Cada rodada continua limitada a um exame e até três cenários sintéticos.

## Cobertura

Foram concluídas rodadas funcionais de 15 dos 84 modelos-base do catálogo, aproximadamente 17,9%. Isso representa 15 das 99 entradas totais, aproximadamente 15,2%. Nenhuma das 15 combinações foi estudada. Ultrassonografia de tórax foi apenas procurada e confirmada como ausente no catálogo observado; por isso não entra na contagem dos 84 modelos-base.

## Próximas prioridades

| Ordem | Exame | Motivo | Próxima prova mínima |
| --- | --- | --- | --- |
| 1 | Ecocardiografia fetal | Categoria clínica distinta e ausente | normal; alteração estrutural; dado incompleto |
| 2 | Perfil biofísico fetal | Relevante na rotina obstétrica e ausente | escore completo; componente alterado; componente não avaliado |
| 3 | Bolsa testicular com Doppler | Categoria genérica existe, mas falta fluxo vascular estruturado | normal; torção suspeita; varicocele/refluxo |
| 4 | Histerossonografia com infusão salina | Exame distinto e ausente | cavidade normal; pólipo; exame incompleto |
| 5 | Histerossonossalpingografia / HyCoSy | Exame distinto e ausente | permeabilidade; obstrução unilateral; limitação |
| 6 | Transfontanelar | Writer exposto sem contrato determinístico | normal; hemorragia; medida incompleta |
| 7 | Doppler de transplante renal | Ausente; material preliminar está em quarentena | inventário e fontes antes de qualquer cenário |
| 8 | Doppler de aorta e artérias ilíacas | Ausente | normal; aneurisma; estenose/oclusão |
| 9 | Doppler de artérias temporais | Ausente e clinicamente sensível | normal; halo; dado unilateral incompleto |
| 10 | Doppler de artérias mesentéricas | Ausente | normal; estenose; preparo/limitação |

Depois entram Aparelho Urinário com Doppler, variantes gemelares após os modelos singleton equivalentes e o primeiro exame combinado. O primeiro combinado deve ser escolhido apenas depois de comparar o contrato de composição existente com o comportamento real da combinação concorrente.

## Mapa de nomes

| Nome observado no Laudário | Nome canônico LaudoUSG | Código LaudoUSG | Regra |
| --- | --- | --- | --- |
| Doppler Aortorrenal | Doppler renal | `DOPPLER_RENAL` | não criar categoria duplicada |
| Transfontanelar | Transfontanelar | `TRANSFONTANELA` | corrigir somente rótulo; preservar código |
| Próstata Abdominal | Próstata suprapúbica | `PROSTATA_SUPRAPUBICA` | tratar como equivalência de via, não como novo exame |
| Doppler de Fístula Arteriovenosa (FAV) | Doppler de fístula AV | `DOPPLER_FISTULA_AV` | mesma categoria |
| Doppler Aortorrenal / Doppler de Transplante Renal | Doppler renal / Doppler de transplante renal | códigos distintos | transplante não é variante implícita do modelo nativo |

Este mapa serve para comparação e roteamento. Os nomes do concorrente não serão copiados para a redação clínica nem usados para inferir equivalência sem conferir o escopo.

O índice legível por máquina está em [status-estudo-2026-10-03.json](status-estudo-2026-10-03.json).
