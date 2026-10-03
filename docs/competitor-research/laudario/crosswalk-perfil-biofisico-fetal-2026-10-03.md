# Cruzamento Laudário × LaudoUSG — Perfil biofísico fetal

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi buscado no monorepo e no cliente iOS.

## Resultado

Perfil biofísico fetal é um gap confirmado nas três plataformas. O LaudoUSG já descreve movimentos fetais e líquido amniótico em categorias obstétricas, mas não possui um contrato que reúna cardiotocografia, movimentos respiratórios, tônus, movimentos corporais e líquido em um escore com denominador variável.

| Camada | Estado atual |
| --- | --- |
| Web | categoria e calculadora ausentes |
| Android/RN | categoria e calculadora ausentes |
| iOS | categoria e calculadora ausentes |
| API | contrato, cálculo e renderer específicos ausentes |
| Banco | código de categoria ausente no seed atual |
| Sala | sem representação estruturada do escore e dos componentes |
| Produção | nenhuma ativação proposta neste lote |

## Regras extraídas do comportamento

Um componente não avaliado não equivale a zero patológico. O denominador deve considerar somente componentes válidos, enquanto o laudo precisa indicar explicitamente o que não foi realizado. O número final não substitui a lista de componentes. Recomendações são sugestões separadas e só entram após confirmação.

O cenário 8/10 mostrou que a interpretação não pode ser inferida apenas pela presença de um item zerado. O cenário 6/8 mostrou que um achado crítico como líquido reduzido precisa aparecer na conclusão independentemente do total agregado.

## Categoria e contrato propostos

O código candidato é `PERFIL_BIOFISICO_FETAL`, sujeito à aprovação antes de entrar nos clientes ou no banco. O contrato mínimo deve guardar técnica e limitações; cardiotocografia; movimentos respiratórios; tônus; movimentos fetais; líquido amniótico; tipo e valor da medida de líquido; pontuação por componente; numerador e denominador derivados; interpretação confirmada; recomendações opt-in.

Cada componente deve usar um estado explícito, sem defaults clínicos invisíveis. A pontuação é calculada no contrato compartilhado, e os três clientes apenas apresentam e editam os mesmos fatos. O servidor deve recalcular e rejeitar numerador ou denominador incompatível com os componentes.

## Primeira versão segura

A primeira entrega deve começar dormente e cobrir 8/8 sem cardiotocografia, 10/10 com cardiotocografia, componente ultrassonográfico alterado, líquido reduzido e componente não avaliado. A redação será original no estilo Domingos. A ativação exige aprovação clínica, goldens sintéticos, paridade Web/iOS/Android/Sala e validação de unidade para ILA e maior bolsão.

O caso funcional está em [cases/perfil-biofisico-fetal-2026-10-03.md](cases/perfil-biofisico-fetal-2026-10-03.md).
