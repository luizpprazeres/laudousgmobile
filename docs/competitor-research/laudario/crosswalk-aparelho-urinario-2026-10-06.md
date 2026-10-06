# Cruzamento Laudário × LaudoUSG — Aparelho Urinário e módulo renal compartilhado

Data: 06/10/2026. A observação usou valores sintéticos e comparou o painel renal em Aparelho Urinário, Abdome Total e Doppler Aortorrenal. Todos os cenários foram restaurados.

## Resultado

O LaudoUSG já reutilizava `createSharedKidneyModule` em `ABDOMEN_TOTAL`, `VIAS_URINARIAS` e `DOPPLER_RENAL`. Portanto, a principal decisão arquitetural pedida — as mesmas opções renais nos exames relacionados — já estava correta. A lacuna confirmada era de cobertura: o contrato compartilhado terminava na hidronefrose e não estruturava o ureter ipsilateral.

Esta rodada acrescentou ao módulo compartilhado dilatação ureteral, extensão, calibre máximo, cálculo, localização, medida e estado do artefato de cintilação. Os três adapters entregam o mesmo objeto e os três renderers produzem o mesmo achado clínico. Em Vias Urinárias, o antigo painel livre “Ureteres” foi removido da interface para não duplicar o preenchimento; payloads antigos continuam aceitos somente como compatibilidade.

Os complementos funcionais no Doppler Aortorrenal definiram cinco variantes com comportamento claro. Coluna de Bertin proeminente, lobulações fetais persistentes, defeito juncional parenquimatoso, pelve extrarrenal e duplicidade do sistema coletor agora pertencem ao mesmo contrato renal compartilhado. Todas preservam lateralidade, entram no corpo e retiram a conclusão de rim normal. A pelve extrarrenal não carrega uma negativa automática de dilatação, evitando contradição quando outro achado coexistir. Lobulações e defeito juncional podem coexistir e não exigem medida.

## Segurança de preenchimento

O concorrente publicou um cisto simples assim que o item foi adicionado, mesmo sem medidas. Um segundo item vazio também entrou no corpo e na opinião. O LaudoUSG agora bloqueia o laudo quando cálculo renal, cisto simples, cisto complexo, nódulo ou angiomiolipoma estiver marcado sem medida e localização. Cálculo ureteral exige localização e medida; dilatação ureteral exige extensão. Subcampos ocultos continuam ignorados depois que a opção é desmarcada.

A localização deixou de nascer silenciosamente como polo superior. O primeiro valor passa a ser “Selecione”, para que a topografia publicada seja uma escolha explícita do médico. A medida continua aceitando milímetros ou centímetros e é normalizada no adapter sem trocar o valor informado no texto.

## Coleções de achados repetíveis

Cálculos renais e cistos simples agora usam coleções individualizadas no formulário Web. Cada item pode ser adicionado ou removido sem abrir caixas fixas vazias, preserva medida e localização próprias e chega como um elemento separado ao contrato já aceito pelo renderer. O limite defensivo é de 20 itens de cada tipo por rim. “Cistos simples múltiplos, sem individualização” permanece como opção agregada quando não há necessidade de medir cada lesão. Rascunhos antigos com o achado único continuam legíveis e editáveis no mesmo painel.

## O que permanece parcial

As variantes continuam parciais. Situação baixa já existia; cinco variantes foram estruturadas nas duas rodadas complementares. Ectopia com topografia livre e rim em ferradura permanecem candidatos porque ainda precisam de comportamento funcional observado e decisão sobre topografia, corpo, conclusão e possíveis medidas.

## Provas executadas

O teste `shared-urinary-organs-ponta-a-ponta.manual.ts` cobre a mesma obstrução ureteral, as cinco variantes anatômicas e coleções com três cálculos e três cistos individualizados em Abdome Total, Vias Urinárias e Doppler Renal. Ele confirma lateralidade, coexistência, ordem, medidas próprias, ausência de normalidade contraditória, remoção da aba ureteral redundante e bloqueio de itens incompletos ou identificadores inválidos. Os typechecks de Web e API passaram. A redação implementada foi criada para o LaudoUSG; nenhum modelo do concorrente foi copiado.

Os casos funcionais estão em [cases/aparelho-urinario-2026-10-06.md](cases/aparelho-urinario-2026-10-06.md), [cases/variantes-renais-doppler-aortorrenal-2026-10-06.md](cases/variantes-renais-doppler-aortorrenal-2026-10-06.md) e [cases/lobulacoes-defeito-juncional-doppler-aortorrenal-2026-10-06.md](cases/lobulacoes-defeito-juncional-doppler-aortorrenal-2026-10-06.md).
