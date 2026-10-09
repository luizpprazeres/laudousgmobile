/**
 * Contrato da categoria MAMARIA — derivado do LaudoUSG original, com regras W7
 * (lib/categoryDefaults.ts:3183-3411).
 *
 * Fonte: _extraction/from-laudousg-original/03-models-by-category/MAMARIA.md
 *        _extraction/from-laudousg-original/05-phrases-and-conclusions/MAMAS-birads.md
 *
 * Regras críticas (lembrete):
 *  - Margens de nódulos: SEMPRE "circunscritas" (NUNCA "regulares")
 *  - BI-RADS: apenas no item com classificação mais alta (5 > 4 > 3 > 0 > 2 > 1)
 *  - Axilas não mencionadas → omitir título/corpo/conclusão (título dinâmico)
 *  - BI-RADS de lesões só se informado; exame normal recebe Categoria BI-RADS® 1
 *  - Medidas inválidas → preservar com [?], NÃO inventar
 */

export const MAMARIA_CONTRACT = `PROTOCOLO OBRIGATÓRIO DE GERAÇÃO DE LAUDO

REGRA PRIORITÁRIA DE ESCOPO — PREVALECE SOBRE MODELOS E EXEMPLOS:
Apenas o DITADO ou a SOLICITAÇÃO do médico pode incluir axilas. Menções às axilas em modelos, exemplos ou frases da biblioteca NÃO contam como solicitação.
Se o ditado for apenas "Normal", ou não mencionar/solicitar axilas, o título é ULTRASSONOGRAFIA DAS MAMAS. Remova do modelo toda descrição e conclusão axilar, inclusive frases de axilas não avaliadas.
Nesse exame normal somente das mamas, concluir: Mamas ecograficamente normais (Categoria BI-RADS® 1).

Sua tarefa é apenas PREENCHER um modelo fixo de laudo.
Não reescreva o modelo.
Não resuma.
Não reorganize.
Não embeleze.
Não use sinônimos para frases-base.
Não use bullets.
Não escreva texto corrido fora do modelo.
Não explique nada.
A saída deve conter SOMENTE o laudo final.

SE A RESPOSTA NÃO SEGUIR EXATAMENTE O FORMATO ABAIXO, ELA ESTÁ ERRADA.

ERROS PROIBIDOS
É proibido:
remover o título em caixa alta
remover os cabeçalhos COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM OBSERVADOS / CONCLUSÃO
trocar 06 fotos por outro número
transformar o laudo em texto corrido
usar traços, bullets ou listas fora da conclusão
trocar frases-base por paráfrases
inferir BI-RADS de lesões sem que o usuário informe; a exceção é o exame normal, que recebe (Categoria BI-RADS® 1)
inventar medidas, horários, quadrantes, distâncias, datas ou correlações
escrever "compatível com cisto simples" no corpo do laudo sem solicitação explícita
trocar "linfonodos axilares normais" por outra frase
trocar "Mamas com ecotextura de fundo com aspecto heterogêneo" por outra frase, salvo ordem explícita
trocar "imagem anecoica" por "cisto" no corpo do laudo, salvo ordem explícita
omitir ou silenciar descritores fornecidos pelo médico (ex: "coalescentes", "heterogêneas", "com reforço acústico posterior")
publicar medida que contenha caractere inválido sem sinalizá-la com [?]

TÍTULO DINÂMICO
Somente se as axilas foram ditadas ou solicitadas junto das mamas: ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES
Se o médico omite axilas, diz "sem axilas", "só mamas", "remover axilas" ou pede título sem regiões axilares: ULTRASSONOGRAFIA DAS MAMAS
O título deve refletir exatamente o escopo do exame. Sem menção ou solicitação de axilas, usar somente MAMAS; omitir toda descrição e conclusão axilar.

ESTRUTURA FIXA E IMUTÁVEL

[TÍTULO DINÂMICO conforme regra acima]

COMENTÁRIOS:
[COMENTÁRIOS EXATOS]

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
[TEXTO DE FUNDO]
[ACHADOS]
[TEXTO AXILAR]

CONCLUSÃO:
[ITENS DA CONCLUSÃO]

[RODAPÉ FIXO]

COMENTÁRIOS PADRÃO
Usar exatamente este texto, salvo caso especial abaixo:

Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas.
A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

TEXTO DE FUNDO PADRÃO
Usar exatamente:
Mamas com ecotextura de fundo com aspecto heterogêneo.

TEXTO AXILAR PADRÃO
Se as axilas foram avaliadas e estão normais, usar exatamente:
Imagens ovais, com a periferia hipoecoica e o centro hiperecoico nas axilas.

Se as axilas não foram mencionadas ou solicitadas, omitir completamente este trecho. Só registrar limitação da avaliação axilar se explicitamente ditada.

CONCLUSÃO AXILAR PADRÃO
Se as axilas foram avaliadas e estão normais, usar exatamente:
Linfonodos axilares normais.

Se as axilas não foram mencionadas ou solicitadas, omitir completamente o item axilar.

REGRAS DE CONCLUSÃO
Exame mamário normal: Mamas ecograficamente normais (Categoria BI-RADS® 1).
Preserve multiplicidade e referência da medida: "imagens ... a maior medindo" não vira imagem única nem medida de cada imagem.
Cada grupo de achados deve virar um item próprio.
Não juntar achados diferentes na mesma frase, exceto quando o usuário pedir explicitamente.

TERMINOLOGIA DE LOCALIZAÇÃO
Usar somente estas expressões, sem trocar por sinônimos:
quadrante superolateral
quadrante superomedial
quadrante inferolateral
quadrante inferomedial
união dos quadrantes laterais
união dos quadrantes mediais
união dos quadrantes superiores
união dos quadrantes inferiores

HORÁRIO
Escrever sempre exatamente neste formato:
às "08 horas"
às "03 horas"
às "10 horas"

MEDIDAS INVÁLIDAS
Se uma medida contiver caractere inválido ou ilegível, mantê-la exatamente como fornecida seguida de [?]. Nunca substituir por valor inventado. Nunca omitir a medida.

RODAPÉ FIXO
Usar exatamente:
Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).

REGRAS FINAIS DE EXECUÇÃO
Preencha apenas com os dados fornecidos.
Se um campo não for informado, não invente.
Não faça interpretação adicional.
Não reescreva frases fixas.
Não mude a estrutura.
Não produza explicações.
Entregue somente o laudo final.`;

/**
 * Modelo-base MAMARIA (caso normal, somente mamas) — sintetizado das
 * frases canônicas de lib/categoryDefaults.ts:3183-3411. Estrutura fixa do
 * protocolo: TÍTULO + COMENTÁRIOS + OS SEGUINTES ASPECTOS + CONCLUSÃO +
 * RODAPÉ BI-RADS.
 *
 * Título dinâmico: usar "ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES" quando
 * axilas avaliadas; substituir por "ULTRASSONOGRAFIA DAS MAMAS" quando médico
 * mencionar somente mamas ou não mencionar axilas.
 */
export const MAMARIA_MODELO_BASE = `ULTRASSONOGRAFIA DAS MAMAS

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas.
A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Mamas com ecotextura de fundo com aspecto heterogêneo.
Não há sinais evidentes de imagem nodular sólida, cística ou complexa.

CONCLUSÃO:
Mamas ecograficamente normais (Categoria BI-RADS® 1).

Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).`;

export const MAMARIA_MODELO_OBJETIVO = `ULTRASSONOGRAFIA DAS MAMAS

TÉCNICA:
Exame realizado com transdutor de 12 MHz.

ACHADOS:
Composição mamária: [tipo informado].

Mama direita apresentando os seguintes achados:
1- [natureza, localização, medida]. [BI-RADS se informado].
2- [se houver outro achado no mesmo lado].

Mama esquerda apresentando os seguintes achados:
1- [natureza, localização, medida]. [BI-RADS se informado].
2- [se houver outro achado no mesmo lado].


IMPRESSÃO:
1- [conclusão principal].
2- [se houver outro diagnóstico ou categoria relevante].`;
