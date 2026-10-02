# Laudário — Obstétrico de primeiro trimestre

Observado em 02/10/2026, com dados exclusivamente sintéticos. Os campos foram limpos, o texto normal com placeholders foi confirmado novamente e o catálogo foi reaberto ao final.

## Estrutura

Abas vistas: Reports, Dados do Paciente, Técnica, Indicação, DUM/IG/DPP, Útero, Miométrio, Colo Uterino, Ovários, Saco Gestacional, Embrião/Feto, Marcadores, Vesícula Vitelina, Viabilidade Gestacional, Achados Morfológicos, Pré-Eclâmpsia, Exames Comparativos, Achados Adicionais e Recomendações.

A datação aceita DUM, idade gestacional informada, DPP, fertilização in vitro e correção por exame anterior. O módulo embrionário liga CCN, idade gestacional, DPP, frequência cardíaca e movimentação. O módulo de marcadores reúne TN, osso nasal, tricúspide, ducto venoso, fatores maternos, risco de trissomias e gráficos opcionais.

## Cenário 1 — datação e vitalidade

**Entrada:** CCN de 45 mm e frequência cardíaca de 160 bpm.

**Observado:** o sistema calculou idade gestacional de 11 semanas e 1 dia, DPP em 22/04/2027 e descreveu frequência cardíaca dentro da faixa de referência exibida. A conclusão registrou gestação tópica única com feto vivo e repetiu a idade gestacional derivada do CCN.

**Implicação:** uma única medida atualiza biometria, datação, DPP, corpo e conclusão. A data do exame faz parte do cálculo e precisa permanecer explícita no contrato.

## Cenário 2 — ausência de atividade cardíaca

**Entrada:** manutenção do CCN de 45 mm e seleção de ausência de atividade cardíaca.

**Observado:** o texto relacionou a ausência de atividade ao limiar de CCN maior ou igual a 7 mm, descreveu a confirmação nos modos de imagem e concluiu inviabilidade/óbito. Datação e DPP permaneceram presentes.

**Implicação:** o estado não é apenas um rótulo de vitalidade; depende de biometria suficiente e produz mudanças coordenadas no corpo e na conclusão. Casos abaixo do limiar precisam ser testados separadamente antes de assumir a mesma regra.

## Cenário 3 — rastreio sintético de trissomias

**Entrada:** CCN de 45 mm, FCF de 160 bpm, TN de 1,5 mm, osso nasal presente, regurgitação tricúspide ausente, ducto venoso normal, idade materna sintética de 36 anos, peso de 70 kg e etnia branca.

**Observado:** a TN foi posicionada no percentil 83. O cálculo classificou o risco como baixo, com T21 de 1:1800 e T13/18 de 1:1200 no cenário sintético. A interface informou que idade materna, TN, osso nasal e tricúspide participaram do cálculo. O ducto venoso qualitativo não foi usado: seria necessário informar o índice de pulsatilidade.

Os marcadores descritivos entraram no corpo e a classificação qualitativa de baixo risco entrou na conclusão. A tabela com riscos basal e corrigido só apareceu após marcar a opção de informar os dados no laudo. Essa decisão também acrescentou fatores utilizados e referência da fonte.

**Implicação:** descrição, cálculo, interpretação qualitativa e publicação dos números são estados distintos. O médico deve confirmar a inclusão dos valores; um marcador descrito no laudo não pode ser apresentado como fator do cálculo quando o algoritmo exige outra medida.

## Restauração

TN, fatores maternos, CCN e FCF foram removidos, os seletores voltaram ao estado não avaliado e a opção de incluir números foi desligada. Ao reabrir o exame, o estado normal com campos vazios foi confirmado. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

## Próximas sondagens

Testar CCN abaixo do limiar com ausência de atividade cardíaca, DUM discordante, FIV, TN elevada, osso nasal ausente, ducto venoso com IP e risco acima do corte. O cruzamento técnico deve confirmar fórmulas, fontes, campos obrigatórios e paridade entre Web, iOS e Android antes de declarar qualquer lacuna.

O cruzamento técnico inicial está em [crosswalk-obstetrico-1t-2026-10-02.md](../crosswalk-obstetrico-1t-2026-10-02.md).
