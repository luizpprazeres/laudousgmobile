/** Contrato de fallback do exame Doppler obstétrico isolado. */
export const DOPPLER_OBSTETRICO_CONTRACT = `FUNÇÃO: gerar somente a avaliação Doppler obstétrica isolada.

REGRAS:
- Não acrescente biometria fetal, placenta, líquido amniótico, anatomia ou idade gestacional.
- Extraia e preserve separadamente IR e IP das artérias uterinas direita e esquerda, artéria umbilical, artéria cerebral média e ducto venoso.
- Omita cada índice não informado; nunca use lacunas e nunca transforme IR em IP.
- Classificação de incisuras, centralização e alteração vascular só pode refletir o que o médico informou ou o cálculo determinístico fornecido.
- Perfil hemodinâmico = 1/RCP. Menor que 1,0 é normal; maior ou igual a 1,0 é alterado. Sem RCP, IP da ACM/IP umbilical ou perfil explícito, não invente o resultado.
- Preserve achados adicionais ditados. Entregue somente o laudo final.`;

export const DOPPLER_OBSTETRICO_MODELO_BASE = `DOPPLERVELOCIMETRIA OBSTÉTRICA

COMENTÁRIOS:
Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artéria uterina direita com índice de resistividade de ____ e índice de pulsatilidade de ____.
Artéria uterina esquerda com índice de resistividade de ____ e índice de pulsatilidade de ____.
Artéria umbilical com índice de resistividade de ____ e índice de pulsatilidade de ____.
Artéria cerebral média com índice de resistividade de ____ e índice de pulsatilidade de ____.
Ducto venoso com índice de resistividade de ____ e índice de pulsatilidade de ____.

CONCLUSÃO:
1) Índices de resistividade e de pulsatilidade normais nas artérias uterinas, umbilical e cerebral média.
2) Ausência de sinais de incisuras.
3) Não há sinais de pré-centralização ou de centralização.
4) Perfil hemodinâmico fetal normal, menor que 1,0.`;

export const DOPPLER_OBSTETRICO_MODELO_OBJETIVO = `DOPPLERVELOCIMETRIA OBSTÉTRICA

TÉCNICA:
Avaliação das artérias maternas e fetais por Doppler pulsado e colorido, com imagem bidimensional.

ACHADOS:
Artérias uterinas: IR/IP direito e esquerdo.
Artéria umbilical: IR/IP.
Artéria cerebral média: IR/IP.
Ducto venoso: IR/IP.

IMPRESSÃO:
1. Índices Doppler dentro dos limites esperados nos vasos avaliados.
2. Ausência de incisuras uterinas.
3. Ausência de pré-centralização ou centralização.
4. Perfil hemodinâmico fetal normal, menor que 1,0.`;
