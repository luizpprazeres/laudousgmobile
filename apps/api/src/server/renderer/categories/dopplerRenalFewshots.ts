/**
 * Few-shots do DOPPLER_RENAL writer_guarded.
 *
 * ⚠️ PROCEDÊNCIA (importante): há 0 laudos ASSINADOS de DOPPLER_RENAL no banco, então
 * estes são HAND-CRAFTED (Dex2: não usar generated_output como ground truth — tem
 * defeito ____). Os DITADOS (raw) 1 e 2 são REAIS (reports 0c7861d2 / 16e32343); as
 * saídas ideais foram compostas a partir dos snippets curados (JVB 2005) SEM os ____,
 * emitindo só o ditado. Os casos 3 e 4 (estenose e sugestivo) são sintéticos p/ ensinar
 * a regra de segurança. **A SAÍDA-IDEAL PRECISA DA VALIDAÇÃO DO DR. LUIZ antes de ligar.**
 */
export const DOPPLER_RENAL_FEWSHOTS: ReadonlyArray<{ raw: string; laudo: string }> = [
  // 1) Normal com VPS aorta + RAR + IR (ditado real 0c7861d2).
  {
    raw: "Doppler de artérias renais. Aorta abdominal com VPS 90. Artéria renal direita VPS 120, esquerda VPS 110. RAR direita 1,3, esquerda 1,2. IR intrarrenal 0,62 bilateral. Sem estenose.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para todas as aferições. Foram avaliadas a aorta abdominal infrarrenal, as artérias renais principais bilateralmente e o parênquima renal (artérias segmentares/interlobares) com aferição do índice de resistência (IR).\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nAorta abdominal de calibre preservado, com VPS de 90 cm/s ao nível das emergências das artérias renais.\nArtéria renal direita: VPS de 120 cm/s.\nArtéria renal esquerda: VPS de 110 cm/s.\nRelação aorto-renal (RAR) de 1,3 à direita e 1,2 à esquerda.\nÍndice de resistência (IR) intrarrenal de 0,62 bilateralmente.\n\nCONCLUSÃO:\nArtérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa. Índices de resistência intrarrenais dentro dos limites da normalidade.",
  },
  // 2) Normal sem VPS aorta, com rins normais (ditado real 16e32343).
  {
    raw: "Doppler renal. Rins de dimensões normais. Artérias renais com velocidade de pico sistólico de 95 à direita e 102 à esquerda, relação renal aorta de 1,8. Índices de resistividade intrarrenais de 0,62 bilateralmente. Sem sinais de estenose.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para todas as aferições. Foram avaliadas a aorta abdominal infrarrenal, as artérias renais principais bilateralmente e o parênquima renal (artérias segmentares/interlobares) com aferição do índice de resistência (IR).\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nAorta abdominal de calibre e contornos preservados.\nArtéria renal direita: VPS de 95 cm/s.\nArtéria renal esquerda: VPS de 102 cm/s.\nRelação aorto-renal (RAR) de 1,8.\nÍndice de resistência (IR) intrarrenal de 0,62 bilateralmente.\nRins de dimensões normais.\n\nCONCLUSÃO:\nArtérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa. Índices de resistência intrarrenais dentro dos limites da normalidade.",
  },
  // 3) Estenose CONFIRMADA (VPS>250 e RAR>3,2) — sintético (ensina o critério forte).
  {
    raw: "Doppler renal. Aorta VPS 85. Artéria renal direita com VPS 320 no terço proximal, esquerda 110. RAR direita 3,8, esquerda 1,3. IR intrarrenal direita 0,50, esquerda 0,64. Estenose significativa à direita.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para todas as aferições. Foram avaliadas a aorta abdominal infrarrenal, as artérias renais principais bilateralmente e o parênquima renal (artérias segmentares/interlobares) com aferição do índice de resistência (IR).\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nAorta abdominal de calibre preservado, com VPS de 85 cm/s ao nível das emergências das artérias renais.\nArtéria renal direita: VPS de 320 cm/s no terço proximal.\nArtéria renal esquerda: VPS de 110 cm/s.\nRelação aorto-renal (RAR) de 3,8 à direita e 1,3 à esquerda.\nÍndice de resistência (IR) intrarrenal de 0,50 à direita e 0,64 à esquerda.\n\nCONCLUSÃO:\nArtéria renal direita com sinais ecográficos de estenose hemodinamicamente significativa em seu terço proximal (VPS de 320 cm/s e RAR de 3,8).",
  },
  // 4) SUGESTIVO — sem critério forte (VPS<250 e RAR<3,2), IR reduzido → linguagem
  //    conservadora (Dex2: não asseverar grau sem critério). Sintético.
  {
    raw: "Doppler renal. Artéria renal esquerda com VPS 210, RAR 2,8. IR intrarrenal esquerda 0,52. Direita normal, VPS 100, RAR 1,4, IR 0,63.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para todas as aferições. Foram avaliadas a aorta abdominal infrarrenal, as artérias renais principais bilateralmente e o parênquima renal (artérias segmentares/interlobares) com aferição do índice de resistência (IR).\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nArtéria renal direita: VPS de 100 cm/s.\nArtéria renal esquerda: VPS de 210 cm/s.\nRelação aorto-renal (RAR) de 1,4 à direita e 2,8 à esquerda.\nÍndice de resistência (IR) intrarrenal de 0,63 à direita e 0,52 à esquerda.\n\nCONCLUSÃO:\nAchados sugestivos de estenose da artéria renal esquerda (VPS de 210 cm/s, RAR de 2,8 e índice de resistência intrarrenal reduzido de 0,52), sem critério hemodinâmico definitivo pelo método. Convém, a critério clínico, correlação clínico-laboratorial e avaliação complementar com angiotomografia ou arteriografia renal.",
  },
];
