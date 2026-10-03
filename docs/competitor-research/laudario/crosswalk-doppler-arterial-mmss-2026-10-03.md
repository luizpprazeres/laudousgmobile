# Cruzamento Laudário × LaudoUSG — Doppler Arterial de Membro Superior

Data: 03/10/2026. O concorrente foi observado com achados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura do contrato compartilhado, renderizadores, formulários e testes existentes.

## Síntese

O LaudoUSG já implementou lateralidade unilateral ou bilateral, vaso afetado, velocidades de pico sistólico, percentual condicionado a dados suficientes e confirmação médica, padrão distal obrigatório em estenose ou oclusão e módulo de desfiladeiro torácico. O contrato e o renderer compartilhados sustentam Web e Android/RN; o iOS possui uma implementação equivalente própria. O gate de produção dos cinco modelos continua desligado.

| Cenário | Laudário observado | LaudoUSG atual |
| --- | --- | --- |
| Normal unilateral | Texto por subclávia, axilar, braquial, radial, ulnar e arcos palmares | Texto resumido por membro |
| Estenose | VPS pré e pós-lesão, razão automática e faixa de gravidade | Vaso, uma ou mais VPS e percentual manual confirmado |
| Oclusão | Opções crônica e embólica; colaterais | Estado de oclusão, vaso, VPS e padrão distal obrigatório |
| Revascularização | Stent e bypass com tipo, segmentos, material e complicações | Não estruturada |
| Desfiladeiro torácico | Apenas indicação no modelo testado | Módulo com manobras, posições, resultado e confirmação |
| Bilateral | Não testado nesta rodada | Um contrato com lados direito e esquerdo independentes |

## Proteções já existentes no LaudoUSG

O contrato bloqueia lado solicitado não examinado, alteração sem vaso e VPS, estenose ou oclusão sem padrão distal, percentual sem dados suficientes, percentual sem confirmação médica e módulo de desfiladeiro sem manobras, posições, resultado e confirmação. O renderer só inclui o percentual após o contrato aceitar essas condições.

O Laudário permitiu selecionar estenose grave antes de preencher as velocidades e gerou um texto com lacunas. O LaudoUSG já evita essa liberação incompleta. Também modela desfiladeiro de forma estruturada, enquanto a interface concorrente testada apenas registra a indicação.

## Lacunas confirmadas

O contrato compartilhado guarda velocidades em um mapa por vaso, mas não distingue VPS pré-lesão de VPS na lesão ou pós-lesão e não calcula razão. Assim, o dado que sustenta uma classificação pode virar apenas uma lista de velocidades sem relação explícita com o ponto de medida.

**Gap confirmado:** faltam posições de medida tipadas e razão derivada para estenose. A versão seguinte deve representar ao menos velocidade de referência, velocidade na lesão e razão calculada, preservando o percentual como dado separado e confirmado pelo médico.

Os formulários não têm paridade. O iOS expõe um bloco adicional com VPS de subclávia, axilar, braquial, radial e ulnar. Web e Android/RN mostram somente a VPS do vaso afetado. Todos serializam o mesmo mapa, mas o médico não consegue preencher o mesmo conjunto de dados nas três plataformas.

**Gap confirmado:** Web, Android/RN e iOS não oferecem a mesma superfície de velocidades. A ativação simultânea aprovada exige o mesmo conjunto mínimo de vasos e posições nos três clientes.

Revascularização não existe no contrato atual. O concorrente oferece stent e bypass com estado, segmentos, material e complicações. Esse item ainda não fazia parte dos requisitos mínimos aprovados pelo Luiz, portanto é uma lacuna de cobertura comparativa, não um requisito clínico aprovado para o primeiro lançamento.

O campo de padrão distal é texto livre e obrigatório, mas não se relaciona formalmente ao vaso afetado. Ele não impede registrar uma oclusão proximal e, ao mesmo tempo, um padrão distal incompatível.

**Candidato a melhoria clínica:** tipar o padrão distal por território e permitir registrar amortecimento e reenchimento. Antes de transformar isso em bloqueio, é necessária revisão clínica para não impor uma relação hemodinâmica rígida em cenários com colaterais, exames incompletos ou variantes.

## Paridade por cliente

| Camada | Estado observado |
| --- | --- |
| Contrato compartilhado | Possui bilateralidade, mapa de VPS, percentual protegido, padrão distal e desfiladeiro |
| Renderer compartilhado | Produz corpo e conclusão por lado; lista as VPS sem papel pré/pós-lesão |
| Web | Possui uma VPS para o vaso afetado e módulo de desfiladeiro |
| Android/RN | Possui uma VPS para o vaso afetado e módulo de desfiladeiro |
| iOS | Possui VPS do vaso afetado e painel adicional com cinco vasos; módulo de desfiladeiro |
| API | Rota e renderer existem, mas permanecem sob gate conjunto |

## Próxima decisão de implementação

Antes de ligar o modelo, o contrato deve ganhar medidas arteriais com papel explícito, o renderer deve calcular a razão sem inferir um percentual, e Web, Android/RN e iOS devem expor a mesma superfície. O módulo de desfiladeiro pode ser preservado como está. Revascularização deve entrar em uma decisão clínica separada para não ampliar o primeiro lançamento sem aprovação.

O próximo modelo do estudo será Ultrassonografia de Tórax.
