# Cruzamento Laudário × LaudoUSG — Pélvico Transvaginal

Data: 06/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi comparado com o preflight técnico e a prova sintética de 05/10. Nenhum dado clínico real foi usado.

## Síntese

O LaudoUSG já possui `PELVE_FEMININA` nas três plataformas, com formulário estruturado na Web e geração baseada em ditado nos clientes móveis. A cobertura anatômica principal existe, mas o estudo funcional confirmou problemas já previstos no preflight: normalidade sem dados mínimos, estado hormonal divergente, descritores predefinidos que podem virar fatos e Doppler pélvico incompleto.

| Cenário | Laudário observado | LaudoUSG atual | Classificação |
| --- | --- | --- | --- |
| Estado inicial sem medidas | publica normalidade completa | pode concluir normalidade endometrial e ovariana com dados ausentes | risco confirmado nos dois produtos |
| Menopausa + endométrio 12 mm | só muda a conclusão após selecionar padrão espessado | a conclusão pode manter normalidade da menopausa sem confrontar a medida | gap confirmado no contrato atual |
| Mioma posterior medido | calcula volume, mas publica descritores predefinidos | localização tem default e pode chegar à conclusão sem confirmação | gap confirmado de proveniência |
| Ovário direito não caracterizado | remove o ovário do corpo, mantém anexo livre e normalidade global | suporta não visualização, mas não preserva motivo estruturado | cobertura parcial e regra de coerência ausente |
| Variante com Doppler | tem campos uterinos bilaterais, mas afirma normalidade sem números | modo Doppler altera principalmente técnica e vascularização de lesões | gap funcional confirmado |

## Normalidade e dados mínimos

O concorrente usa defaults extensos: a abertura do modelo já equivale a exame normal. No LaudoUSG, o renderer também aceita ausência de medidas e pode produzir frases de normalidade para endométrio e ovários. A prova funcional transforma a preocupação do preflight em requisito prioritário.

**Requisito proposto:** cada estrutura deve começar como não confirmada. A conclusão global normal só fica disponível após confirmação mínima de útero, endométrio, ovários e fundo de saco, respeitando estruturas não caracterizadas e cirurgicamente ausentes. Campos vazios não podem gerar placeholders nem normalidade.

## Endométrio e estado hormonal

No Laudário, informar 12 mm não foi suficiente para retirar a normalidade; foi preciso escolher um padrão alterado. No LaudoUSG, menopausa pode acionar texto de normalidade sem uma decisão derivada da espessura, e Web e ditado não compartilham uma única regra hormonal.

**Gap confirmado:** medida endometrial, estado hormonal e conclusão não formam uma regra determinística única.

**Requisito proposto:** criar `status_hormonal` compartilhado e separar dado medido, alerta de referência e diagnóstico confirmado. Uma medida fora da referência aprovada deve bloquear frase de normalidade e pedir decisão médica, sem gerar diagnóstico ou recomendação automaticamente.

## Miomas e proveniência dos descritores

O concorrente ativou heterogeneidade, aspecto hipoecoico e relação subserosa ao criar o mioma. No LaudoUSG, a localização inicial também possui default que pode chegar ao texto final. Em ambos, um valor inicial de interface pode ser confundido com observação clínica.

**Gap confirmado:** o produto não preserva de forma inequívoca se cada descritor foi informado, derivado ou apenas preselecionado.

**Requisito proposto:** iniciar localização e classificação como não informadas; calcular apenas valores matemáticos, como volume; exigir confirmação para FIGO, relação com o útero, ecogenicidade e vascularização. Corpo e conclusão devem derivar da mesma lista de miomas.

## Ovário não caracterizado e anexos

O Laudário permitiu publicar região anexial direita livre e conclusão global normal mesmo sem caracterizar o ovário direito. O LaudoUSG tem estado de não visualização, mas não estrutura adequadamente o motivo e os antecedentes cirúrgicos por lado.

**Gap confirmado:** falta uma regra que propague limitação de uma estrutura para negativas dependentes e para a conclusão global.

**Requisito proposto:** representar `caracterizacao`, `motivo` e `estado_cirurgico` por lado. Quando o ovário não for caracterizado, omitir normalidade ovariana e bloquear negativas que dependam da mesma janela, preservando o lado contralateral.

## Recomendações

O concorrente separa três estados: sugestão, seleção do item e publicação do bloco. No cenário endometrial, a recomendação sugerida não entrou no laudo enquanto o bloco mestre ficou desligado.

**Requisito proposto:** adotar no LaudoUSG `sugerida`, `confirmada` e `publicada` como estados diferentes. A sugestão pode nascer de uma regra aprovada, mas o texto clínico só entra após confirmação médica explícita.

## Doppler pélvico

O modelo concorrente tem aba própria e campos bilaterais para artérias uterinas. O LaudoUSG tem apenas um modo que altera técnica e permite vascularização de lesões, sem contrato hemodinâmico pélvico. Nenhum dos dois comportamentos observados justifica afirmar normalidade Doppler sem confirmação.

**Gap confirmado:** falta contrato estruturado para `realizado`, estruturas avaliadas, índices por lado e conclusão limitada ao escopo efetivamente estudado.

**Requisito proposto:** manter esse contrato dormente até revisão médica. O primeiro recorte deve distinguir Doppler não realizado, realizado sem alteração e alterado; campos uterinos ou ovarianos só entram após definição clínica de indicação, unidades, limites e efeito na conclusão.

## Ordem sugerida de implementação

Primeiro corrigir a falsa normalidade e os campos predefinidos no contrato atual. Depois unificar estado hormonal e motivo de não caracterização entre Web, API e mobile. Em seguida separar recomendações sugeridas de publicadas. O contrato Doppler deve ficar por último, dormente, até aprovação clínica.

## Testes de aceite propostos

O conjunto mínimo deve provar: formulário recém-aberto sem conclusão normal; menopausa com 12 mm sem frase de normalidade; mioma sem localização ou FIGO não preenchidos; ovário direito não caracterizado retirando a normalidade global e preservando o esquerdo; recomendação sugerida fora do laudo; modo Doppler sem dados não afirmando fluxo normal.

## Evidências relacionadas

O caso funcional está em [cases/pelvico-transvaginal-2026-10-06.md](cases/pelvico-transvaginal-2026-10-06.md). O estado do código e as linhas de evidência estão em [audits/preflight-pelvico-transvaginal-2026-10-05.md](audits/preflight-pelvico-transvaginal-2026-10-05.md) e [audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md](audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md).
