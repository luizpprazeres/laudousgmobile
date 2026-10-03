# Cruzamento Laudário × LaudoUSG — Doppler Arterial de Membro Inferior

Data: 03/10/2026. O concorrente foi observado com achados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura da categoria, base de conhecimento, rotas do writer e presença de contratos e formulários nas três plataformas.

## Síntese

O LaudoUSG já disponibiliza Doppler arterial de membros inferiores no seletor e possui uma base clínica útil para geração por writer: segmentos mínimos, VPS, padrão espectral, ITB, critérios hemodinâmicos e proteções contra inferir claudicação ou isquemia crônica ameaçadora sem clínica explícita. Porém, não existe contrato compartilhado nem formulário determinístico específico para o exame. Web, Android/RN e iOS expõem a categoria, mas recebem achados por texto e dependem da geração para organizar os fatos.

O Laudário está à frente na superfície estruturada por vaso, sobretudo em medidas relacionadas à lesão, aneurisma e revascularização. O LaudoUSG tem regras clínicas mais cautelosas em pontos como ITB, padrão bifásico e distinção entre gravidade hemodinâmica e síndrome clínica.

| Cenário | Laudário observado | LaudoUSG atual |
| --- | --- | --- |
| Exame normal | Blocos predefinidos por vaso | Writer orientado por template e snippets |
| Estenose | Velocidade de referência, velocidade na lesão e razão automática | Writer pode preservar valores ditados, sem campos tipados nem razão determinística |
| Oclusão | Mecanismo/cronicidade selecionados e colaterais | Regras de redação e segurança, sem contrato por território |
| Aneurisma | Dois diâmetros, luz efetiva e trombo mural | Sem bloco estruturado específico |
| ITB | Não explorado nesta rodada | Fórmula e faixas presentes na base de conhecimento, sem calculadora integrada ao formulário do exame |
| Revascularização | Stent e bypass com propriedades próprias | Sem contrato estruturado |

## Cobertura real no LaudoUSG

`DOPPLER_ARTERIAL_MMII` está registrado na apresentação compartilhada, no catálogo Web, no seletor Android/RN e no enum iOS. Na Web, a categoria pertence ao caminho de writer. Não foi encontrado contrato correspondente em `packages/shared/src/clinicalModels`, workspace clínico no Web ou Android/RN, nem modelo clínico Swift para o exame.

A base em `packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII` já define os principais segmentos, a fórmula correta do ITB e critérios de segurança. Também separa achado hemodinâmico de claudicação e isquemia crônica ameaçadora, evitando transformar Doppler isolado em diagnóstico clínico. Isso é conteúdo ativo de apoio ao writer, não armazenamento estruturado dos fatos.

## Lacunas confirmadas

**Gap confirmado — contrato por território:** faltam estruturas tipadas para lado, segmento, estado, mecanismo, cronicidade confirmada, placa, padrão espectral, VPS e padrão distal. A ausência vale para o contrato compartilhado, Web, Android/RN e implementação iOS própria.

**Gap confirmado — medidas da estenose:** não há campos determinísticos para velocidade de referência e velocidade na lesão, nem cálculo automático da razão. Um contrato novo deve calcular a razão sem inventar percentual e bloquear classificação incompatível até confirmação médica.

**Gap confirmado — aneurisma:** não há bloco que preserve diâmetros anteroposterior e transversal, luz efetiva, trombo mural e território. Esses dados podem aparecer no texto gerado, mas não ficam disponíveis para validação clínica determinística.

**Gap confirmado — revascularização:** stent e bypass não são representados com origem, destino, material, perviedade, velocidades e complicações. A interface concorrente demonstra a utilidade do recurso, mas seu comportamento textual ainda precisa de uma rodada própria antes de especificarmos todos os campos.

**Gap confirmado — ITB na experiência do exame:** fórmula e interpretação existem na base de conhecimento, mas não há entrada estruturada de pressões braquiais e do tornozelo com cálculo por lado. O produto não consegue auditar, recalcular ou distinguir valor medido de valor inferido pelo writer.

## Proteções que devem ser preservadas

O contrato futuro não deve classificar claudicação, Rutherford, Fontaine ou isquemia crônica ameaçadora somente a partir do ITB ou do padrão Doppler. Deve manter a distinção entre gravidade hemodinâmica e quadro clínico, tratar ITB acima de 1,40 como inconclusivo por incompressibilidade e não tornar um padrão bifásico isolado automaticamente patológico.

A classificação de estenose deve derivar das medidas conforme uma regra clínica aprovada, exibir a razão calculada e exigir confirmação quando houver percentual ou faixa. O caso observado no concorrente, com razão 4,0 e faixa selecionada de 50 a 75%, mostra por que cálculo e rótulo não podem divergir silenciosamente.

## Proposta para aprovação clínica

O próximo passo não é ativar o modelo diretamente. Primeiro, deve ser apresentado um contrato v1 com:

1. lateralidade e lista explícita de segmentos avaliados;
2. estado por segmento, placa, padrão espectral e VPS;
3. velocidade de referência, velocidade na lesão e razão calculada;
4. oclusão com mecanismo, cronicidade somente quando confirmada, colaterais e padrão distal;
5. aneurisma com dois diâmetros, luz efetiva e trombo mural;
6. pressões braquiais e do tornozelo, ITB calculado por lado e estado de incompressibilidade;
7. stent e bypass como módulo opcional separado;
8. bloqueios que separem dados hemodinâmicos de diagnósticos dependentes da clínica.

Após aprovação, o mesmo contrato deve alimentar Web e Android/RN, com implementação equivalente no iOS, casos sintéticos normais e alterados e gate desligado até a revisão do texto final.

O próximo exame prioritário do estudo é Doppler de Fístula Arteriovenosa, por ser uma categoria já exposta no LaudoUSG e com potencial semelhante de campos objetivos e cálculos.
