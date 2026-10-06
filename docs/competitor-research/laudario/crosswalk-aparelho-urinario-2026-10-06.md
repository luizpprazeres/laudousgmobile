# Cruzamento Laudário × LaudoUSG — Aparelho Urinário e módulo renal compartilhado

Data: 06/10/2026. A observação usou valores sintéticos e comparou o painel renal em Aparelho Urinário, Abdome Total e Doppler Aortorrenal. Todos os cenários foram restaurados.

## Resultado

O LaudoUSG já reutilizava `createSharedKidneyModule` em `ABDOMEN_TOTAL`, `VIAS_URINARIAS` e `DOPPLER_RENAL`. Portanto, a principal decisão arquitetural pedida — as mesmas opções renais nos exames relacionados — já estava correta. A lacuna confirmada era de cobertura: o contrato compartilhado terminava na hidronefrose e não estruturava o ureter ipsilateral.

Esta rodada acrescentou ao módulo compartilhado dilatação ureteral, extensão, calibre máximo, cálculo, localização, medida e estado do artefato de cintilação. Os três adapters entregam o mesmo objeto e os três renderers produzem o mesmo achado clínico. Em Vias Urinárias, o antigo painel livre “Ureteres” foi removido da interface para não duplicar o preenchimento; payloads antigos continuam aceitos somente como compatibilidade.

O complemento funcional no Doppler Aortorrenal definiu três variantes com comportamento claro. Coluna de Bertin proeminente, pelve extrarrenal e duplicidade do sistema coletor agora pertencem ao mesmo contrato renal compartilhado. As três preservam lateralidade, entram no corpo e retiram a conclusão de rim normal; a duplicidade recebe conclusão própria. A pelve extrarrenal não carrega uma negativa automática de dilatação, evitando contradição quando outro achado coexistir.

## Segurança de preenchimento

O concorrente publicou um cisto simples assim que o item foi adicionado, mesmo sem medidas. Um segundo item vazio também entrou no corpo e na opinião. O LaudoUSG agora bloqueia o laudo quando cálculo renal, cisto simples, cisto complexo, nódulo ou angiomiolipoma estiver marcado sem medida e localização. Cálculo ureteral exige localização e medida; dilatação ureteral exige extensão. Subcampos ocultos continuam ignorados depois que a opção é desmarcada.

A localização deixou de nascer silenciosamente como polo superior. O primeiro valor passa a ser “Selecione”, para que a topografia publicada seja uma escolha explícita do médico. A medida continua aceitando milímetros ou centímetros e é normalizada no adapter sem trocar o valor informado no texto.

## O que permanece parcial

O motor declarativo atual trabalha com checklists de ocorrência única. Ele ainda não representa dois cálculos distintos, dois cistos simples com medidas próprias ou uma lista mista de lesões do mesmo tipo. “Cistos múltiplos” existe como achado agregado, mas não preserva a identidade de cada lesão. Isso é uma lacuna estrutural confirmada e deve ser resolvida com uma coleção de achados, não com novas caixas fixas.

As variantes continuam parciais. Situação baixa já existia; coluna de Bertin, pelve extrarrenal e duplicidade do sistema coletor foram estruturadas nesta rodada. Ectopia com topografia livre, rim em ferradura, lobulação fetal e defeito juncional permanecem candidatos porque ainda precisam de comportamento funcional observado e decisão sobre corpo, conclusão, medida ou confirmação.

## Provas executadas

O teste `shared-urinary-organs-ponta-a-ponta.manual.ts` cobre a mesma obstrução ureteral e as três variantes anatômicas em Abdome Total, Vias Urinárias e Doppler Renal. Ele confirma lateralidade, ausência de normalidade contraditória, remoção da aba ureteral redundante e bloqueio de lesões incompletas. Os typechecks de Web e API passaram. A redação implementada foi criada para o LaudoUSG; nenhum modelo do concorrente foi copiado.

Os casos funcionais estão em [cases/aparelho-urinario-2026-10-06.md](cases/aparelho-urinario-2026-10-06.md) e [cases/variantes-renais-doppler-aortorrenal-2026-10-06.md](cases/variantes-renais-doppler-aortorrenal-2026-10-06.md).
