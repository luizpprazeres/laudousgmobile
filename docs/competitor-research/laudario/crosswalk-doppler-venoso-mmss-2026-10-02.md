# Cruzamento Laudário × LaudoUSG — Doppler Venoso de Membro Superior

Data: 02/10/2026. O concorrente foi observado com achados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura do contrato, renderizadores, formulários e testes existentes.

## Síntese

O LaudoUSG já implementou um contrato compartilhado para Doppler venoso de membro superior com unilateralidade ou bilateralidade, indicação selecionável, jugular interna opcional, sistemas profundo e superficial, refluxo documentado, cateter, fase trombótica confirmada e revisão médica obrigatória. Web, Android/RN e iOS possuem formulários equivalentes, mas o gate de produção permanece desligado.

| Cenário | Laudário observado | LaudoUSG atual |
| --- | --- | --- |
| Normal unilateral | Veias descritas individualmente | Territórios profundo e superficial resumidos |
| Bilateral | Não testado nesta rodada | Um contrato com lados independentes |
| Cateter sem complicação | Tipo, veia e estado adequado | Presença, segmento e relação; sem tipo do dispositivo |
| Trombose ligada ao cateter | Corpo alterado, conclusão permaneceu normal | Relação e segmento obrigatórios; conclusão depende do território marcado como trombose |
| Trombose superficial basílica | Critérios e extensão no corpo | Apenas território superficial e fase |
| TVP axilar oclusiva | Critérios no corpo | Apenas território profundo, fase e cateter opcional |

## O que já está melhor protegido no LaudoUSG

O contrato bloqueia lado solicitado não examinado, exame sem território avaliado, refluxo declarado sem teste, fase temporal sem trombose, fase aguda/subaguda/crônica sem confirmação médica e cateter sem segmento ou relação. A revisão médica também é obrigatória antes da liberação.

A bilateralidade é nativa no mesmo objeto, conforme a decisão clínica do projeto. A fase só entra quando sustentada e confirmada; a jugular interna permanece opcional. Os três clientes usam o mesmo vocabulário clínico básico.

## Lacunas confirmadas

O contrato atual reduz todo o sistema profundo e superficial a um estado por território. Não registra subclávia, axilar, braquiais, radiais, ulnares, cefálica, basílica e mediana cubital separadamente. Por isso, “sistema profundo com trombose” pode produzir conclusão positiva sem segmento, compressibilidade, material intraluminal, fluxo ou extensão.

O bloco de cateter não registra tipo de dispositivo nem distingue cateter adequadamente posicionado de trombo pericanular, manga de fibrina e trombose da veia hospedeira. Ele também não vincula obrigatoriamente a relação do cateter ao território marcado como trombosado.

**Gap confirmado:** faltam achados por segmento e critérios estruturados mínimos para TVP e trombose superficial. O gate atual protege fase e completude do cateter, mas não comprova o diagnóstico trombótico.

**Gap confirmado:** falta modelar o dispositivo como entidade com tipo, veia hospedeira e estado próprio, mantendo corpo, estado vascular e conclusão derivados da mesma fonte.

## Requisito original proposto

Cada lado deve conter uma lista de segmentos avaliados, cada um com estado de avaliação, perviedade, compressibilidade, material intraluminal, fluxo, extensão e relação com dispositivo quando aplicável. Trombose profunda ou superficial só pode ser concluída quando o conjunto mínimo definido estiver preenchido e confirmado pelo médico. O dispositivo deve registrar tipo, segmento, posição/estado e relação do trombo sem transformar achado isolado em conclusão contraditória.

O próximo lote deve estudar Doppler Arterial de Membro Superior. Depois, um caso de fronteira deve verificar no LaudoUSG se trombose territorial sem critérios continua passando pelo validador, antes de ampliar o contrato.
