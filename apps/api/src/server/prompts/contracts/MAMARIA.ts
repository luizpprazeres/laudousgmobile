/**
 * Contrato da categoria MAMARIA — VERBATIM do LaudoUSG original
 * (lib/categoryDefaults.ts:3183-3411).
 *
 * Fonte: _extraction/from-laudousg-original/03-models-by-category/MAMARIA.md
 *        _extraction/from-laudousg-original/05-phrases-and-conclusions/MAMAS-birads.md
 *
 * Regras críticas (lembrete):
 *  - Margens de nódulos: SEMPRE "circunscritas" (NUNCA "regulares")
 *  - BI-RADS: apenas no item com classificação mais alta (5 > 4 > 3 > 0 > 2 > 1)
 *  - Axilas não mencionadas → omitir título/corpo/conclusão (título dinâmico)
 *  - NUNCA inferir BI-RADS sem médico informar
 *  - Medidas inválidas → preservar com [?], NÃO inventar
 */

export const MAMARIA_CONTRACT = `PROTOCOLO OBRIGATÓRIO DE GERAÇÃO DE LAUDO

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
inferir BI-RADS sem que o usuário informe
inventar medidas, horários, quadrantes, distâncias, datas ou correlações
escrever "compatível com cisto simples" no corpo do laudo sem solicitação explícita
trocar "linfonodos axilares normais" por outra frase
trocar "Mamas com ecotextura de fundo com aspecto heterogêneo" por outra frase, salvo ordem explícita
trocar "imagem anecoica" por "cisto" no corpo do laudo, salvo ordem explícita
omitir ou silenciar descritores fornecidos pelo médico (ex: "coalescentes", "heterogêneas", "com reforço acústico posterior")
publicar medida que contenha caractere inválido sem sinalizá-la com [?]

TÍTULO DINÂMICO
Se as axilas foram avaliadas (ou o médico não menciona excluí-las): ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES
Se o médico omite axilas, diz "sem axilas", "só mamas", "remover axilas" ou pede título sem regiões axilares: ULTRASSONOGRAFIA DAS MAMAS
O título deve refletir exatamente o escopo do exame. Em caso de dúvida, usar o título com REGIÕES AXILARES.

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

Se as axilas não foram avaliadas, usar exatamente:
Regiões axilares não foram adequadamente avaliadas neste exame.

CONCLUSÃO AXILAR PADRÃO
Se as axilas foram avaliadas e estão normais, usar exatamente:
Linfonodos axilares normais.

Se as axilas não foram avaliadas, usar exatamente:
Avaliação linfonodal axilar não realizada neste exame.

REGRAS DE CONCLUSÃO
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

export const MAMARIA_BIRADS_BLOCK = `CLASSIFICAÇÃO BI-RADS — REGRAS CANÔNICAS:
- Este bloco é ativado somente quando há lesão mamária. Para a lesão descrita, inclua obrigatoriamente a categoria BI-RADS correspondente na CONCLUSÃO. Esta regra específica vence a proibição genérica de inferir BI-RADS quando a morfologia abaixo estiver explicitamente ditada.
- Imagem sólida com características benignas — forma oval ou redonda, margens circunscritas e maior eixo paralelo à pele, sem característica suspeita ditada — deve ser classificada como BI-RADS 3. Imagem cística simples/anecoica, sem componente sólido ou característica suspeita, deve ser classificada como BI-RADS 2.
- NÃO superestime para BI-RADS 4 ou 5 sem característica suspeita explicitamente ditada. Só use BI-RADS 4/5 quando o médico ditar o próprio grau ou característica suspeita, como margem espiculada/irregular, orientação não paralela à pele ou sombra acústica.
- NUNCA imprima no laudo marcador, comentário ou raciocínio interno, incluindo qualquer texto no formato "[REVISAR...]" ou equivalente.
- Preserve a MULTIPLICIDADE exatamente como ditada: uma imagem permanece singular; duas, múltiplas ou várias imagens permanecem no plural no corpo e na conclusão. Quando o médico ditar várias imagens e fornecer a medida apenas da maior, mantenha o achado no plural; medir somente a maior não autoriza reduzir o conjunto a uma imagem. Não funda achados distintos nem transforme "cistos simples" em "cisto simples".`;

/**
 * Modelo-base MAMARIA (caso normal, com axilas avaliadas) — sintetizado das
 * frases canônicas de lib/categoryDefaults.ts:3183-3411. Estrutura fixa do
 * protocolo: TÍTULO + COMENTÁRIOS + OS SEGUINTES ASPECTOS + CONCLUSÃO +
 * RODAPÉ BI-RADS.
 *
 * Título dinâmico: usar "ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES" quando
 * axilas avaliadas; substituir por "ULTRASSONOGRAFIA DAS MAMAS" quando médico
 * pedir título sem axilas.
 */
export const MAMARIA_MODELO_BASE = `ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas.
A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Mamas com ecotextura de fundo com aspecto heterogêneo.
Não há sinais evidentes de imagem nodular sólida, cística ou complexa.
Imagens ovais, com a periferia hipoecoica e o centro hiperecoico nas axilas.

CONCLUSÃO:
Mamas ecograficamente normais (Categoria BI-RADS® 1).
Linfonodos axilares normais.

Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).`;

export const MAMARIA_MODELO_OBJETIVO = `ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES

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

Regiões axilares: [descrever somente se avaliadas ou informadas].

IMPRESSÃO:
1- [conclusão principal].
2- [se houver outro diagnóstico ou categoria relevante].`;
