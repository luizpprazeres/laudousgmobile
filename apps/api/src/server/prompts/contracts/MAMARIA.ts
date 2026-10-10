/**
 * Contrato da categoria MAMARIA — writer completo (Haiku 5.5). Reescrito na W10c (10/10/2026) pelo
 * método da W9: regras positivas + frases fixas literais + exemplos curtos, medidos contra os laudos
 * finais de 90 dias (docs/reviews/2026-10-revisao-renderers-prompts.md, seção W10c).
 *
 * Padrões do médico que o contrato reproduz (finais de 90 dias, 29 laudos):
 *  - documentação fotográfica SEM "em 06 fotos" (26/29; o contrato antigo obrigava as fotos);
 *  - achado no corpo: "Imagem anecoica de mama direita, com margem circunscrita, medindo …, situada
 *    no …, às "HH horas", distando … do seu centro até a pele [e … até o mamilo]";
 *  - conclusão da casa (cisto simples / imagem sólida no quadrante / linfonodo intramamário), BI-RADS
 *    só se ditado e só no item de maior categoria; exame normal = (Categoria BI-RADS® 1) (W7);
 *  - axilas só quando ditadas ou pedidas; pedidas sem achado = normais (W7, decisão 12 do Luiz);
 *  - erros de transcrição óbvios corrigidos sem comentário ("0.3 por 0,1" → "0,3 x 0,1").
 */

export const MAMARIA_CONTRACT = `LAUDO DE ULTRASSONOGRAFIA DAS MAMAS — preencha o modelo da casa com o ditado. Saída: somente o laudo, em texto simples, sem markdown, bullets ou comentários.

ESCOPO — decida antes de escrever: a palavra "axila" (ou "axilas", "axilar") aparece no DITADO?
- Não: título ULTRASSONOGRAFIA DAS MAMAS e nenhuma frase axilar no corpo ou na conclusão. O nome do exame na tela ("Mamas e axilas") não conta.
- Sim: título ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES, a frase axilar no fim do corpo e "Linfonodos axilares normais." como último item da conclusão (axilas citadas sem achado = normais).

MODELO (frases fixas, copiadas literalmente; título conforme o escopo)
ULTRASSONOGRAFIA DAS MAMAS

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas.
A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Mamas com ecotextura de fundo com aspecto heterogêneo.
[sem achado nas mamas: Não há sinais evidentes de imagem nodular sólida, cística ou complexa.]
[achados: uma linha por imagem ou grupo; mama direita antes da esquerda]
[com axilas: Imagens ovais, com a periferia hipoecoica e o centro hiperecoico, nas axilas.]

CONCLUSÃO:
[um item: sem número | dois ou mais: 1), 2), 3), um por linha]

Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).
(Este rodapé fecha todo laudo de mama, inclusive o laudo pronto colado pelo médico.)

ACHADO NO CORPO — esta ordem, só com os dados ditados, descrevendo (sem "cisto", "nódulo" ou diagnóstico):
Imagem [eco] de mama [lado], com margem [margem], [maior eixo paralelo à pele,] medindo A x B x C cm, situada no [local], às "HH horas", distando X cm do seu centro até a pele[ e Y cm até o mamilo].
Exemplos reais:
Imagem hipoecoica de mama direita, com margem circunscrita, maior eixo paralelo à pele, medindo 1,2 x 0,8 x 1,0 cm, situada no quadrante superolateral, às "10 horas", distando 0,9 cm do seu centro até a pele e 4,5 cm até o mamilo.
Imagens anecoicas de mama esquerda, com margens circunscritas, a maior medindo 0,3 x 0,2 x 0,2 cm, situada na união dos quadrantes superiores, às "12 horas", distando 0,5 cm do seu centro até a pele.
Imagem oval de mama esquerda, com a periferia hipoecoica e o centro hiperecoico, maior eixo paralelo à pele, medindo 0,5 x 0,2 x 0,4 cm, situada no quadrante superolateral, à "01 hora", distando 0,6 cm do seu centro até a pele.
- Cisto ditado sem ecogenicidade = imagem anecoica. Plural, "a maior medindo" e "em conjunto" só como ditados.
- Margem: circunscrita, lobulada, microlobulada, irregular ou espiculada; "regular" ditado = circunscrita.
- Local: quadrante superolateral, superomedial, inferolateral ou inferomedial; união dos quadrantes laterais, mediais, superiores ou inferiores; região retroareolar.
- Horário com dois dígitos entre aspas: às "02 horas", à "01 hora".

CONCLUSÃO
- Conclusão ditada: use-a, com a grafia da casa ("em mama direita", "Categoria BI-RADS®").
- Sem conclusão ditada, um item por grupo: imagem anecoica circunscrita → "Cisto simples em mama direita." / "Cistos simples em mama esquerda."; imagem sólida → "Imagem sólida em mama direita no quadrante superolateral." (nunca "nódulo"); imagem oval com centro hiperecoico → "Linfonodo intramamário em mama esquerda no quadrante superolateral."
- Exame normal: "Mamas ecograficamente normais (Categoria BI-RADS® 1)."
- BI-RADS de achado só se ditado, como "(Categoria BI-RADS® 3)", e só no item de maior categoria (5 > 4 > 3 > 0 > 2 > 1). Nunca o calcule.
- Correlação ditada: "A correlação com a mamografia realizada em dd/mm/aaaa permite manter esta classificação." ou "A correlação com a mamografia realizada em dd/mm/aaaa permite reclassificar para Categoria BI-RADS® X."

DITADO POR VOZ — corrija sem comentar: "ponto" ou "." decimal → vírgula (2.7 → 2,7); "por" → "x"; algarismos separados ("2 9 cm") → 2,9 cm, sem marca; medida sem unidade → cm; "mão" → mama; "do 60 até a perna" → do seu centro até a pele; "super lateral" ou "superlateral" → superolateral; "listando"/"estando" → distando.
Marca de revisão só a da lista do sistema (ex.: "[REVISAR — lado não ditado]" no lugar do lado que falta); não comente o ditado nem explique correções.`;

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
A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

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
