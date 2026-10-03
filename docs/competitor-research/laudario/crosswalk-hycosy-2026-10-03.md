# Cruzamento Laudário × LaudoUSG — Histerossonossalpingografia / HyCoSy

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi buscado no monorepo e no cliente iOS.

## Resultado

HyCoSy é um gap confirmado nas três plataformas. Não há categoria, contrato, renderer, modelo normal, controles, testes ou corpus clínico específico. Documentos de planejamento anteriores já listavam o exame como pendente, mas não constituem implementação.

| Camada | Estado atual |
| --- | --- |
| Web | categoria e fluxo ausentes |
| Android/RN | categoria e fluxo ausentes |
| iOS | categoria e fluxo ausentes |
| API | contrato, renderer, auditor e corpus ausentes |
| Banco | código de categoria ausente no seed atual |
| Sala | sem representação estruturada das tubas, dispersão ou limitação |
| Produção | nenhuma ativação proposta neste lote |

## Contrato dormente proposto

O código candidato é `HYCOSY`, com rótulo normal “Histerossonossalpingografia / HyCoSy”. O contrato deve guardar técnica, cateter, agente de contraste, preparo, volumes, modalidades, condições técnicas, canal cervical, cavidade uterina e dois objetos tubários independentes.

Cada tuba deve registrar estado `pérvia`, `perviedade parcial`, `obstrução proximal`, `obstrução distal`, `espasmo`, `não avaliada` ou `indeterminada`; velocidade e resistência; segmento; dispersão peritoneal; distribuição periovariana; Sinal de Cotte derivado; morfologia e limitações. O servidor deve recalcular os derivados e bloquear combinações incompatíveis entre progressão, dispersão, Cotte e conclusão.

## Segurança clínica

Espasmo não equivale a obstrução, e indeterminação não equivale a normalidade. Quando a distinção for limitada, o renderer deve evitar diagnóstico fechado e explicitar o escopo não resolvido. O lado contralateral pode permanecer conclusivo se foi adequadamente avaliado.

A conclusão de obstrução precisa de localização e confirmação médica. Recomendações e eventual reestudo devem permanecer fora do laudo até escolha explícita. Nenhum agente de contraste, concentração ou volume pode ser presumido silenciosamente.

## Primeira versão segura

A primeira entrega deve cobrir perviedade bilateral, obstrução proximal e distal unilateral, perviedade parcial, espasmo, lado não avaliado, limitação global e cavidade uterina associada. A ativação exige revisão clínica, fontes próprias, goldens sintéticos, paridade Web/iOS/Android/Sala e auditoria fail-closed de lateralidade e derivados.

O caso funcional está em [cases/hycosy-2026-10-03.md](cases/hycosy-2026-10-03.md).
