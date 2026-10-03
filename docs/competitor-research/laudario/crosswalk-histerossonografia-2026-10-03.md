# Cruzamento Laudário × LaudoUSG — Histerossonografia com infusão salina

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi buscado no monorepo e no cliente iOS.

## Resultado

Histerossonografia com infusão salina é um gap confirmado nas três plataformas. O LaudoUSG possui componentes reaproveitáveis em `PELVE_FEMININA`, incluindo pólipo endometrial, sinéquia, istmocele, medidas, vascularização e conclusão ginecológica. Isso não equivale ao procedimento: faltam técnica de cateterização, solução e volume infundido, distensão da cavidade, intercorrências, tolerância, escopo avaliado e regras que suspendam normalidade quando o exame é incompleto.

| Camada | Estado atual |
| --- | --- |
| Web | sem categoria própria; formulário de pelve cobre apenas parte dos achados anatômicos |
| Android/RN | sem categoria ou fluxo do procedimento |
| iOS | sem categoria ou fluxo do procedimento |
| API | sem contrato, renderer, auditor e modelo normal de histerossonografia |
| Banco | código de categoria ausente no seed atual |
| Sala | sem apresentação da técnica, qualidade e escopo do procedimento como dados estruturados |
| Produção | nenhuma ativação proposta neste lote |

## Limite da reutilização de Pelve feminina

O renderer de `PELVE_FEMININA` já sabe descrever pólipo, sinéquia e istmocele. Esses subtipos anatômicos podem ser compartilhados, desde que a identidade e as medidas das lesões sejam preservadas. O título, a técnica, a lógica de distensão e a conclusão da histerossonografia precisam de contrato próprio; forçar o exame para `PELVE_FEMININA` perderia o que foi realmente realizado.

O código candidato é `HISTEROSSONOGRAFIA`, sujeito à aprovação clínica. Ele deve ser uma categoria própria que referencia tipos compartilhados de lesão endometrial, em vez de duplicar toda a pelve ou tratar o procedimento como simples variação de título.

## Gates mínimos

Marcar “pólipo” sem individualizar pelo menos topografia e medidas não deve liberar conclusão positiva. A publicação pode ficar em estado pendente ou usar descrição estritamente indeterminada após confirmação médica. Distensão inadequada deve remover normalidade dependente da cavidade completamente avaliada. Campos omitidos não podem virar defaults clínicos invisíveis.

O contrato deve manter técnica, cateter, contraste, volume, modo 2D/3D, condições técnicas, canal cervical, grau de distensão, segmentos avaliados, lesões individualizadas, intercorrências, conclusão confirmada e recomendações opt-in. O servidor deve validar exclusões e rejeitar normalidade incompatível com limitação relevante.

## Primeira versão segura

A primeira entrega deve permanecer dormente e cobrir cavidade normal adequadamente distendida, pólipo individualizado, mioma submucoso, sinéquia, istmocele, malformação, falha parcial de distensão e exame interrompido. A ativação exige goldens sintéticos, revisão clínica da redação, paridade Web/iOS/Android/Sala e comprovação de que o writer não publica lesão sem dados mínimos.

O caso funcional está em [cases/histerossonografia-2026-10-03.md](cases/histerossonografia-2026-10-03.md).
