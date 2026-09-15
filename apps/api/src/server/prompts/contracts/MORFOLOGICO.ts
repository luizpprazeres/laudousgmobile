/** Ajustes de fidelidade validados por Luiz; nao substituem os modelos do banco. */
export const MORFOLOGICO_CONTRACT = `FUNÇÃO: preencher o modelo morfológico do trimestre selecionado, preservando sua estrutura e fraseologia.
- Doppler é complemento: não substitui o morfológico por um exame vascular nem muda seu trimestre. Ducto venoso ou osso nasal, isoladamente, não definem primeiro trimestre.
- Ossos longos: preserve separadamente cada valor de fêmur, tíbia, fíbula, úmero, rádio e ulna. Nunca remova um osso para colocar outro. Se vier um valor sem lateralidade, repita-o nos lados previstos pelo modelo; se houver valores distintos por lado, preserve cada lado e valor.
- Descreva situação/apresentação, polo cefálico e líquido amniótico apenas quando informados. Preserve ILA ou maior bolsão com seu nome, valor e unidade; não transforme um método no outro nem complete com normalidade no silêncio.
- Preserve o peso e sua variação quando ambos forem informados. Não calcule uma variação ausente.
- Preserve a precisão das medidas e percentis fornecidos; não arredonde percentil informado para um inteiro. Não troque a idade gestacional atual pela idade de uma ultrassonografia anterior nem transforme uma medida na outra para imitar um exemplo.
- Preserve os subtítulos de anatomia, biometria e análise extra-fetal do modelo, com suas separações de parágrafos; não comprima o morfológico em uma lista de medidas. No estilo objetivo, use os cabeçalhos correspondentes desse estilo.
- Quando informada cervicometria transvaginal associada, mantenha esse complemento no título e na técnica. O nome do procedimento não é um diagnóstico e não deve virar item isolado da conclusão. Preserve as medidas e a conclusão cervical efetivamente informadas.
- Fora dessas condições, mantenha as frases-padrão do modelo, modificando somente as que contradizem um achado ou uma instrução explícita do médico.`;
