# Cruzamento Laudário × LaudoUSG — Quadril Infantil

Data: 03/10/2026. O concorrente foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura do contrato, cálculo determinístico, renderizadores e formulários das três plataformas.

## Síntese

O LaudoUSG só sugere uma classificação de Graf quando idade, corte padrão, alfa, beta, teto ósseo, teto cartilaginoso, posição da cabeça femoral e posição do labrum estão completos. A sugestão ainda exige confirmação médica. Corte inadequado bloqueia a classificação; idade acima de seis meses gera alerta sem impedir o exame; cobertura é opcional; recomendação só entra após confirmação.

O Laudário oferece mais descritores visíveis por lado, incluindo margem óssea, configuração da cartilagem e pistonagem. Porém, o estado inicial classifica Ia sem idade e sem ângulos numéricos. No lado alterado, alfa e idade determinaram a classe observada, enquanto mudanças de beta e posição da cartilagem não alteraram a opinião no cenário IIc.

| Regra | Laudário observado | LaudoUSG atual |
| --- | --- | --- |
| Idade | Exigida para separar IIa/IIb quando alfa está entre 50° e 59° | Obrigatória para qualquer classificação |
| Alfa | Pode ser faixa preselecionada ou valor numérico | Valor numérico obrigatório |
| Beta | Faixa ou valor; não mudou a classe nos cenários testados | Valor numérico obrigatório e usado para IIc/D |
| Morfologia | Vários presets visíveis; integração parcial nos casos testados | Teto ósseo, teto cartilaginoso, cabeça e labrum obrigatórios |
| Corte padrão | Qualidade técnica geral no texto | Campo explícito; inadequação bloqueia Graf |
| Confirmação | Não foi observada confirmação separada da classe | Confirmação médica obrigatória |
| Cobertura | Opcional | Opcional |
| Recomendação | Aba própria, não testada nesta rodada | Texto não vinculante com confirmação |

## Vantagens já protegidas no LaudoUSG

O contrato falha fechado quando os dados estão incompletos. Ele distingue IIa e IIb por idade, usa beta e morfologia para separar IIc de D e usa a posição do labrum nos tipos III e IV. A classificação informada deve coincidir com o cálculo determinístico e ser confirmada pelo médico.

Isso evita o principal risco observado no concorrente: uma classificação normal derivada de presets, mesmo sem medidas numéricas registradas. A regra também atende às decisões clínicas já aprovadas pelo Luiz.

## Lacuna confirmada e corrigida no LaudoUSG

A posição do labrum é obrigatória para a classificação e aparece nos formulários, mas não entra no texto produzido pelo renderer compartilhado. O mesmo ocorre no renderer próprio do iOS. Assim, um dado usado para diferenciar Graf III de IV pode influenciar a conclusão sem aparecer nos achados.

**Gap confirmado:** corpo e classificação não tinham rastreabilidade completa. A correção desta rodada acrescentou a posição do labrum ao bloco de cada quadril no renderer compartilhado e no renderer iOS, mantendo redação equivalente nas plataformas. Um teste de regressão agora exige que o achado permaneça no texto.

## Cobertura comparativa ainda não aprovada

Margem óssea lateral e manobra de pistonagem estão disponíveis no concorrente, mas não pertencem ao contrato atual do LaudoUSG. São candidatos para revisão clínica futura, não lacunas obrigatórias do primeiro lançamento. A inclusão deve depender de utilidade prática e de como esses achados interferem na classificação ou na conduta.

Antes de ativar o modelo, ainda é necessário concluir os gates amplos e a revisão clínica final; a omissão do labrum já não permanece como bloqueio conhecido.
