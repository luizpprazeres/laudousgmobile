# Ativação clínica — Doppler hepático

Data: 05/10/2026

## Decisão aplicada

O Doppler hepático passa a ter categoria própria (`DOPPLER_HEPATICO`) no contrato compartilhado. A implementação usa o núcleo vascular já empregado pelo Abdome total com Doppler, preservando a compatibilidade do exame abdominal e sem duplicar as regras de veia porta, vasos opcionais, direção fisiológica do fluxo e confirmação das alterações vasculares.

A redação normal segue o modelo aprovado em 02/10/2026. A veia porta é obrigatória. Veias hepáticas, veia esplênica, veia mesentérica superior e artéria hepática comum só aparecem quando marcadas como efetivamente avaliadas.

## Dados estruturados do escopo aprovado

- Veia porta: perviedade, calibre, velocidade e direção do fluxo.
- Veias hepáticas: perviedade, calibre, velocidade, direção e padrão espectral, quando avaliadas.
- Veia esplênica e veia mesentérica superior: perviedade, calibre, velocidade e direção, quando avaliadas.
- Artéria hepática comum: perviedade, calibre, velocidade de pico sistólico, velocidade diastólica final, índice de resistência, direção e padrão espectral, quando avaliada.
- Situação vascular: ausente, suspeita ou confirmada, com tipo, evidência e confirmação médica nas alterações.

Os valores são preservados como informados. O contrato não aplica limiares próprios para transformar calibre, velocidade ou índice de resistência em diagnóstico.

## Gates fail-closed

O estado inicial não presume normalidade: perviedade e situação vascular começam como não avaliadas. A conclusão normal exige revisão médica global e confirmação explícita de coerência entre medidas, fluxos e contexto do exame.

Vaso opcional marcado como avaliado exige os dados do seu módulo. Fluxo de direção não fisiológica, fluxo ausente, trombose, perviedade não avaliada ou padrão espectral alterado não podem coexistir com conclusão normal. Velocidade zero só é aceita com fluxo ausente e alteração vascular registrada. Hipertensão portal, trombose portal ou outra alteração exigem evidência textual e confirmação médica.

Campos desconhecidos são rejeitados pelo contrato estrito. Dados estruturados incompletos bloqueiam o renderer e não devem cair no writer livre.

## Fora do contrato nesta ativação

Transplante hepático, TIPS, anastomoses, índice de congestão, transformação cavernomatosa, colaterais detalhadas, trombo tumoral, Budd-Chiari e classificações automáticas por limiar permanecem fora do contrato. Esses módulos dependem de aprovação clínica específica antes de qualquer ativação.

## Validação sintética

Os testes cobrem estado inicial incompleto, modelo normal mínimo, modelo normal com todos os vasos opcionais, confirmação explícita de normalidade, trombose portal confirmada com velocidade zero e fluxo ausente, incompatibilidades de perviedade/fluxo/padrão, artéria hepática incompleta, rejeição de campos de TIPS/transplante, renderer genérico e renderer dedicado.

Na implementação do pacote compartilhado passaram o typecheck, 9 testes sintéticos novos, a matriz clínica existente de modelos estruturados e os 36 testes do contrato hepático quantitativo. O teste histórico que exigia ausência de qualquer categoria hepática precisa ser atualizado junto da ativação, porque sua premissa foi substituída por esta aprovação.
