/**
 * Few-shots sintéticos do candidato DOPPLER_RENAL writer_guarded.
 * Servem para ensinar o contrato aprovado; não são transcrições de concorrente.
 * O gate permanece desligado até validação clínica e operacional.
 */
export const DOPPLER_RENAL_FEWSHOTS: ReadonlyArray<{ raw: string; laudo: string }> = [
  {
    raw: "Doppler renal. Aorta VPS 90. Renal direita VPS 120, esquerda 110. RAR direita 1,3, esquerda 1,2. IR 0,62 bilateral. TA direita 55 ms. IA direita 3,1 m/s². TA esquerda 58 ms. IA esquerda 3,0 m/s². Sem estenose.",
    laudo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas. Os vasos, lados e parâmetros efetivamente avaliados estão discriminados abaixo.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nAorta abdominal com VPS de 90 cm/s ao nível da emergência das artérias renais.\nArtéria renal direita: VPS de 120 cm/s.\nArtéria renal esquerda: VPS de 110 cm/s.\nRelação aorto-renal (RAR) de 1,3 à direita e 1,2 à esquerda.\nÍndice de resistência (IR) intrarrenal de 0,62 bilateralmente.\nTempo de aceleração à direita de 55 ms.\nÍndice de aceleração à direita de 3,1 m/s².\nTempo de aceleração à esquerda de 58 ms.\nÍndice de aceleração à esquerda de 3,0 m/s².\n\nCONCLUSÃO:\nArtérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa. Índices de resistência intrarrenais dentro dos limites da normalidade.",
  },
  {
    raw: "Rim direito em topografia habitual, contornos regulares, ecogenicidade preservada, 10,9 por 4,8 por 4,5 cm, parênquima 1,7 cm, diferenciação corticomedular preservada. Rim esquerdo igual, 9,0 por 4,2 por 4,0 cm, parênquima 1,6 cm. VPS renal direita 105 e esquerda 108. Sem estenose.",
    laudo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas. Os vasos, lados e parâmetros efetivamente avaliados estão discriminados abaixo.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nRim direito em topografia habitual, com contornos regulares e ecogenicidade preservada, medindo 10,9 × 4,8 × 4,5 cm. Parênquima com espessura de 1,7 cm, com diferenciação corticomedular preservada.\nRim esquerdo em topografia habitual, com contornos regulares e ecogenicidade preservada, medindo 9,0 × 4,2 × 4,0 cm. Parênquima com espessura de 1,6 cm, com diferenciação corticomedular preservada.\nArtéria renal direita: VPS de 105 cm/s.\nArtéria renal esquerda: VPS de 108 cm/s.\n\nCONCLUSÃO:\nArtérias renais sem evidência ecográfica de estenose hemodinamicamente significativa. Assimetria renal, com diferença de 1,9 cm entre os maiores eixos renais.",
  },
  {
    raw: "Doppler renal. Aorta VPS 85. Artéria renal direita VPS 320 no terço proximal, esquerda 110. RAR direita 3,8 calculada com VPS renal 320 e aórtica 85; RAR esquerda 1,3. Estenose significativa à direita.",
    laudo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas. Os vasos, lados e parâmetros efetivamente avaliados estão discriminados abaixo.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nAorta abdominal com VPS de 85 cm/s ao nível da emergência das artérias renais.\nArtéria renal direita: VPS de 320 cm/s no terço proximal.\nArtéria renal esquerda: VPS de 110 cm/s.\nRelação aorto-renal (RAR) de 3,8 à direita e 1,3 à esquerda.\n\nCONCLUSÃO:\nArtéria renal direita com sinais ecográficos de estenose hemodinamicamente significativa em seu terço proximal (VPS de 320 cm/s).",
  },
  {
    raw: "Doppler renal. Renal esquerda VPS 220, RAR 2,4. IR esquerda 0,52. Direita VPS 100, RAR 1,4, IR 0,63.",
    laudo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas. Os vasos, lados e parâmetros efetivamente avaliados estão discriminados abaixo.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nArtéria renal direita: VPS de 100 cm/s.\nArtéria renal esquerda: VPS de 220 cm/s.\nRelação aorto-renal (RAR) de 1,4 à direita e 2,4 à esquerda.\nÍndice de resistência (IR) intrarrenal de 0,63 à direita e 0,52 à esquerda.\n\nCONCLUSÃO:\n",
  },
  {
    raw: "Renal direita VPS 290 no segmento proximal. Não foi possível calcular a RAR direita porque a VPS aórtica não foi obtida.",
    laudo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas. Os vasos, lados e parâmetros efetivamente avaliados estão discriminados abaixo.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nArtéria renal direita com sinais de estenose, apresentando velocidade de pico sistólico de 290 cm/s no segmento proximal e relação aorto-renal de ____.\n\nCONCLUSÃO:\nArtéria renal direita com sinais ecográficos de estenose hemodinamicamente significativa (VPS de 290 cm/s).",
  },
  {
    raw: "Pós-stent de artéria renal direita. Fluxo não detectado ao Doppler no interior do stent. Veia renal direita pérvia.",
    laudo: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas. Os vasos, lados e parâmetros efetivamente avaliados estão discriminados abaixo.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nEstado pós-stent da artéria renal direita, sem fluxo detectável ao Doppler no interior do stent.\nVeia renal direita pérvia.\n\nCONCLUSÃO:\nAusência de fluxo detectável ao Doppler no interior do stent da artéria renal direita, sem classificação etiológica pelo método.",
  },
];
