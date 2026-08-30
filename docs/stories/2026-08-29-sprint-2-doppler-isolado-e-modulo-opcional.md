# Sprint 2 — Doppler obstétrico isolado e módulo Doppler opcional

## Objetivo

Separar o exame Doppler obstétrico puro do exame obstétrico completo com Doppler. A categoria `DOPPLER_OBSTETRICO` passa a produzir apenas a avaliação Doppler. Obstétrica e todos os Morfológicos passam a aceitar um módulo Doppler opcional, sem o usuário trocar de categoria.

## Comportamento esperado

- Doppler obstétrico isolado continua disponível como categoria própria na web e nos apps.
- Obstétrica + Doppler usa o modelo obstétrico da categoria atual e acrescenta técnica, achados Doppler e conclusões Doppler nos lugares correspondentes.
- Morfológico + Doppler faz a mesma composição sobre o trimestre selecionado, sem criar outra categoria.
- Sem ativar Doppler, Obstétrica e Morfológico permanecem byte-idênticos.
- Cervicometria e Doppler são complementos independentes e podem coexistir no mesmo exame.
- Web: a auxiliar ativa o complemento e preenche índices/medidas em uma seção própria.
- Mobile: o médico pode ditar o complemento; extração estruturada identifica os índices e o renderer compõe o texto.

## Modelo Clássico recebido para o Doppler isolado

### Comentários

Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

### Aspectos observados

- Índices de resistividade e pulsatilidade das artérias uterinas direita e esquerda.
- Índices de resistividade e pulsatilidade da artéria umbilical, com a observação da média de três medidas próxima à inserção placentária, ao abdome fetal e em alça livre.
- Índices de resistividade e pulsatilidade da artéria cerebral média.
- Índices de resistividade e pulsatilidade do ducto venoso.

### Conclusão normal

1) Índices de resistividade e pulsatilidade normais nas artérias uterinas, umbilical e cerebral média.
2) Ausência de sinais de incisuras.
3) Ausência de sinais de pré-centralização ou centralização.
4) Perfil hemodinâmico fetal normal, menor que 1,0.

## Decisões a fechar no início do sprint

- Confirmar o título definitivo do exame Doppler isolado.
- Confirmar se todos os vasos aceitam IR e IP opcionais independentemente, sem lacunas quando apenas um índice for informado.
- Confirmar a fórmula e o rótulo do “perfil hemodinâmico fetal menor que 1,0”, evitando inferir normalidade quando os dados necessários estiverem ausentes.
- Definir a redação Objetiva equivalente (`TÉCNICA / ACHADOS / IMPRESSÃO`) sem alterar as interpretações clínicas do Clássico.
- Mapear os dados históricos da categoria atual para não reinterpretar laudos antigos como Doppler isolado.

## Critérios de aceite

- [ ] Novo schema do Doppler isolado cobre IR/IP por vaso, incisuras, centralização e perfil hemodinâmico sem placeholders inventados.
- [ ] Modelos Clássico e Objetivo do Doppler isolado aparecem na Biblioteca.
- [ ] Obstétrica e os três Morfológicos aceitam Doppler opcional nos dois estilos.
- [ ] A ordem é estável: detalhe na técnica, bloco Doppler no fim dos achados e itens Doppler no fim da conclusão/impressão.
- [ ] Doppler e Cervicometria podem ser ativados juntos, com ordem clínica definida e sem duplicação.
- [ ] Web e mobile usam o mesmo contrato e o mesmo renderer.
- [ ] Migração preserva leitura e sincronização do histórico já existente.
- [ ] Goldens cobrem ausência parcial de índices, alterações hemodinâmicas, incisura, pré-centralização, centralização e dados insuficientes.

## Fora deste sprint atual

Esta story foi registrada durante o fechamento dos modelos objetivos e da cervicometria integrada. A implementação começa apenas depois do commit e dos gates desse trabalho.
