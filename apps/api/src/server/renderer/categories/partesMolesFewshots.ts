/**
 * Few-shots do PARTES_MOLES writer_guarded — laudos REAIS assinados pelo Dr. Luiz
 * (final_output), mesma receita do MSK (mskFewshots.ts). Curado 2026-07-02.
 *
 * Procedência (corpus PARTES_MOLES é magro — só 3 final_output no banco):
 *  - 0b2a0c38 (palato duro): raw REAL (garble + comandos "pode colocar assim"/"na
 *    verdade"/vírgula/ponto ditados) → final_output ASSINADO. Ajustes mínimos: raw
 *    aparado (linha inicial era um exame de ABDOME de outro slot — ruído §5 do
 *    corpus); linha em branco após cabeçalho removida no laudo (padrão dos demais
 *    assinados: linha em branco ANTES do cabeçalho, não depois).
 *  - a2b89a54 (cervical direita): laudo COLADO pronto → final_output ASSINADO com UM
 *    ajuste (review dex1): o assinado dropava o item 3 da conclusão do colado; aqui os
 *    3 itens são preservados (renumerados "1) 2) 3)") para o exemplo NÃO ensinar drop
 *    de conteúdo em laudo colado — a regra "não dropar nada" prevalece.
 *  - 0a379c04 (região sacral): final_output ASSINADO verbatim; o raw do banco era
 *    de outro exame (slot reaproveitado — ruído §5), então o ditado deste par foi
 *    RECONSTRUÍDO a partir do conteúdo do laudo assinado.
 *  - Par "exame normal": SINTÉTICO, composto 100% de blocos canônicos da casa
 *    (modelo base normal — _extraction/.../03-models-by-category/PARTES_MOLES.md).
 */
export const PARTES_MOLES_FEWSHOTS: ReadonlyArray<{ raw: string; laudo: string }> = [
  {
    raw: "Ultrassonografia das partes moles do da região do, do Palato Duro, apresentando imagem, hipoecoica b delimitada com, medindo aproximadamente 1.1, por 0.5 0.9, centímetros. Sem vascularização. Situada superficialmente, Ele na verdade pode colocar assim, imagem de baixa vírgula com margens bem delimitadas, medindo aproximadamente 1.1 por 0.8 por 0.9 centímetros, situada na submucosa do do palato duro, apresentando não, sem vascularização, ponto. Na conclusão, Imagem e hipoecoica, Na verdade, de baixa ecogenicidade. No palato duro, de aspecto inespecífico, vírgula, tem como diagnóstico mais provável, cisto de retenção, de gânglulas salivares, ponto convém vírgula critério clínico, vírgula. Complementar com Continue a investigação No caso complementar complementar com avaliação especializada do profissional bucomaxilo-facial, barra, com o objetivo de continuar a investigação.",
    laudo:
      "ULTRASSONOGRAFIA DAS PARTES MOLES DO PALATO DURO\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, abrangendo a avaliação da região do palato duro. A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nImagem de baixa ecogenicidade, com margens bem delimitadas, medindo aproximadamente 1,1 x 0,8 x 0,9 cm, situada na submucosa do palato duro.\n\nAo estudo com Doppler colorido não foi evidenciada vascularização.\n\nCONCLUSÃO:\nImagem de baixa ecogenicidade situada no palato duro, de aspecto inespecífico. O diagnóstico mais provável é cisto de retenção de glândula salivar.\n\nConvém correlação com os achados clínicos e complementar a investigação com avaliação especializada.",
  },
  {
    raw: "ULTRASSONOGRAFIA DAS PARTES MOLES DA REGIÃO CERVICAL DIREITA\n\nCOMENTÁRIOS:\n\nExame realizado com transdutor linear de alta frequência, abrangendo a região cervical direita, com imagens em modo B e Doppler colorido. Foi realizado estudo comparativo com o lado contralateral. A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n\nPlanos cutâneo, subcutâneo e musculares da região cervical direita sem alterações.\n\nLinfonodos cervicais mais evidentes nos níveis IA e II, apresentando morfologia habitual e dimensões normais.\n\nGlândula submandibular direita, glândula parótida direita e tireoide com aspecto ecográfico normal.\n\nEstudo comparativo contralateral sem alterações significativas.\n\nCONCLUSÃO:\n\n1. Região cervical direita sem evidência de alterações ecográficas.\n2. Linfonodos cervicais dos níveis IA e II com características habituais.\n3. Glândula submandibular direita, glândula parótida direita e tireoide sem alterações ecográficas detectáveis pelo método.",
    laudo:
      "ULTRASSONOGRAFIA DAS PARTES MOLES DA REGIÃO CERVICAL DIREITA\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, abrangendo a região cervical direita, com imagens em modo B e Doppler colorido. Foi realizado estudo comparativo com o lado contralateral. A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nPlanos cutâneo, subcutâneo e musculares da região cervical direita sem alterações.\n\nLinfonodos cervicais mais evidentes nos níveis IA e II, apresentando morfologia habitual e dimensões normais.\n\nGlândula submandibular direita, glândula parótida direita e tireoide com aspecto ecográfico normal.\n\nEstudo comparativo contralateral sem alterações significativas.\n\nCONCLUSÃO:\n1) Região cervical direita sem evidência de alterações ecográficas.\n2) Linfonodos cervicais normais.\n3) Glândula submandibular direita, glândula parótida direita e tireoide sem alterações ecográficas detectáveis pelo método.",
  },
  {
    raw: "Partes moles da região sacral, apresentando imagem anecoica, arredondada, com margem regular, medindo aproximadamente 0.2 por 0.2 por 0.3 centímetros, distando 0.9 centímetros do seu centro até a pele, com pequena comunicação com o plano ósseo adjacente, sem vascularização ao estudo Doppler colorido. Na conclusão, o diagnóstico mais provável é cisto sinovial da articulação sacrococcígea.",
    laudo:
      "ULTRASSONOGRAFIA DAS PARTES MOLES DA REGIÃO SACRAL\n\nCOMENTÁRIOS:\nExame realizado com transdutor de 12 MHz, abrangendo a avaliação das partes moles da região sacral. A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nImagem anecoica, arredondada, com margem regular, medindo aproximadamente 0,2 x 0,2 x 0,3 cm, distando 0,9 cm do seu centro até a pele, com pequena comunicação com o plano ósseo adjacente, sem vascularização ao estudo Doppler colorido.\n\nCONCLUSÃO:\nImagem anecoica na região sacral. O diagnóstico mais provável é cisto sinovial da articulação sacrococcígea.",
  },
  {
    raw: "Partes moles do antebraço direito, exame sem alterações dignas de nota.",
    laudo:
      "ULTRASSONOGRAFIA DAS PARTES MOLES DO ANTEBRAÇO DIREITO\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, abrangendo a avaliação das partes moles do antebraço direito. A documentação fotográfica foi obtida em 06 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nPlanos musculares e tecidos subcutâneos com ecogenicidade e ecotextura normais.\nNão há evidência de coleção, massa ou alteração focal.\n\nCONCLUSÃO:\nAusência de alterações detectáveis pelo método.",
  },
];
