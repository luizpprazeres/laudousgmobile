# Doppler venoso de membros inferiores — ativação clínica

Data da decisão: 05/10/2026

## Escopo aprovado

As apresentações `DOPPLER_VENOSO_MMII` e `DOPPLER_VENOSO_MMII_MEDIDAS` usam o mesmo contrato clínico. A segunda apenas expõe mais campos de medidas; não representa outro exame nem pode ter regras diagnósticas diferentes.

O contrato cobre três protocolos selecionáveis: pesquisa de trombose, avaliação venosa completa e mapeamento com medidas. A lateralidade pode ser direita, esquerda ou bilateral, sempre com dados separados por lado.

## Regras aprovadas pelo médico

- A publicação de trombose venosa profunda positiva exige incompressibilidade parcial ou completa documentada no segmento. Material intraluminal, ecogenicidade, fluxo, recanalização e colaterais são descritores complementares.
- A conclusão negativa exige compressibilidade documentada nos segmentos mínimos do protocolo efetivamente selecionado. Segmento não avaliado ou limitado deve aparecer como pendência ou limitação, sem gerar conclusão negativa ampla.
- As fases disponíveis são aguda, crônica/recanalizada, mista e indeterminada. A categoria “subaguda” não é usada.
- Refluxo é classificado somente quando o tempo, a manobra e a posição foram documentados. A comparação é estritamente maior que o limiar: igualdade permanece no corpo, sem conclusão de refluxo.
- Para veias femoral comum, femoral e poplítea, refluxo é tempo maior que 1,0 s. Para veias superficiais, tibiais, fibulares, femoral profunda e perfurantes, refluxo é tempo maior que 0,5 s.
- Perfurante pode ser classificada como insuficiente apenas quando há fluxo externo maior que 0,5 s e diâmetro maior que 3,5 mm. Igualdade em qualquer um dos limites permanece descritiva no corpo. A indicação terapêutica não é inferida pelo laudo.
- Recomendações e condutas ficam em campo separado e só entram no texto após confirmação médica explícita.

## Cobertura anatômica

No protocolo de trombose, a cobertura mínima por membro inclui veia femoral comum, junção safenofemoral, femoral proximal, média e distal, poplítea, tibiais posteriores e fibulares. Veias ilíacas, femoral profunda proximal, gastrocnêmias, soleares, tibiais anteriores, safenas e perfurantes são adicionais conforme indicação ou protocolo local.

Na avaliação de insuficiência, a cobertura mínima acrescenta safena magna e safena parva. O refluxo deve ser documentado, no mínimo, na femoral comum proximal bilateral, junção safenofemoral, femoral média, safena magna acima e abaixo do joelho, poplítea, junção safenopoplítea e safena parva, além de áreas suspeitas.

## Base técnica usada para fechar as lacunas

- Society for Vascular Ultrasound, *Lower Extremity Venous Duplex Evaluation for Thrombosis* (2019): cobertura mínima de compressão, ondas espectrais e descrição do trombo. https://higherlogicdownload.s3.amazonaws.com/SVUNET/c9a8d83b-2044-4a4e-b3ec-cd4b2f542939/UploadedImages/PPG_Docs/13__Lower_Extremity_Venous_Duplex_Evaluation__Updated_2019_.pdf
- Society for Vascular Ultrasound, *Lower Extremity Venous Insufficiency Evaluation* (2019): posição, cobertura dos sistemas profundo/superficial, medidas e documentação de refluxo. https://higherlogicdownload.s3.amazonaws.com/SVUNET/c9a8d83b-2044-4a4e-b3ec-cd4b2f542939/UploadedImages/14__Lower_Extremity_Venous_Insufficiency_Evaluation__Updated_2019_.pdf
- Society for Vascular Surgery, American Venous Forum e American Vein and Lymphatic Society, diretriz de varizes (2022/2023): limiares de refluxo por território e definição ultrassonográfica de perfurante patológica. https://pubmed.ncbi.nlm.nih.gov/36326210/

## Regra de liberação

O formulário Web e o renderer determinístico podem ser ativados quando os testes sintéticos comprovarem: caso normal completo, exame limitado, TVP parcial e oclusiva, fase indeterminada, refluxo superficial e profundo, perfurante acima e exatamente nos limites, bilateralidade e rejeição fail-closed de payload incompleto.
