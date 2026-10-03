# Estudo do Laudário

Início: 02/10/2026. Conta autorizada pelo Luiz. Credenciais não são armazenadas neste repositório.

## Objetivo

Mapear a cobertura e o comportamento real dos modelos do Laudário para comparar com Web, iOS, Android e contratos compartilhados do LaudoUSG. O estudo observa a relação entre controles, campos derivados, classificações, recomendações e texto final. A redação concorrente é referência funcional; o conteúdo do LaudoUSG será original, clinicamente revisado e no estilo Domingos.

## Método operacional

Cada sessão cobre um exame e até três cenários sintéticos. O estado normal é registrado primeiro. Depois, uma alteração isolada ou um preset é aplicado, os efeitos automáticos e o laudo são observados e o modelo é restaurado. Não são usados pacientes, impressão, envio, assinatura ou endpoints privados.

Os registros separam fato observado, inferência, candidato a lacuna e gap confirmado. Um recurso só vira gap confirmado após busca no código e na documentação das três plataformas.

## Arquitetura observada

A página “Laudos” abre um catálogo por modalidade. Em Ultrassonografia, cada linha tem a modalidade, o nome do exame e a família. Há pesquisa, visualização em lista ou grade e atalhos por Abdome, Urologia, Pequenas Partes, Ginecologia, Mama, Obstetrícia, Vascular, Músculo-Esquelético, Pediatria e Exames Combinados.

Ao abrir um exame, a coluna esquerda vira um formulário dividido em abas clínicas. A coluna direita mantém um editor de texto rico que é atualizado durante as seleções. Ações adicionais incluem LaudarIA, copiar, imprimir, banco de frases e laudo livre. Alguns presets clínicos alteram vários controles de uma vez; recomendações automáticas podem exigir confirmação explícita antes de entrarem no texto final.

## Progresso

- Catálogo de Ultrassonografia inventariado: 99 entradas, sendo 84 modelos simples e 15 combinações.
- Tireoide: primeira rodada concluída, incluindo arquitetura, preset de parênquima, nódulo, TI-RADS, recomendação e cruzamento técnico com Web, iOS e Android.
- Abdome Total: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, esteatose leve, hepatite aguda com repercussão vesicular e colelitíase sintética.
- Obstétrico 1º Trimestre: primeira rodada funcional e cruzamento técnico concluídos, com datação por CCN, ausência de atividade cardíaca e rastreio sintético de trissomias.
- Pesquisa de Endometriose: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, endometrioma, lesão intestinal, avaliação dinâmica, recomendações e cartograma.
- Doppler Venoso de Membro Inferior: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, refluxo superficial, TVP sintética, recomendações e cartograma auto-sincronizado.
- Mamas e Axilas: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, cisto simples, nódulo sólido suspeito, BI-RADS, recomendações e cartograma.
- Avaliação Multiparamétrica Hepática: primeira rodada funcional e cruzamento técnico concluídos, com estado inicial, gordura por USFF, rigidez por 2D-SWE, qualidade, interpretação e restauração de valores derivados.
- Elastografia Hepática: primeira rodada funcional e cruzamento técnico concluídos, com estado inicial, rigidez normal, algoritmo hepatoesplênico, qualidade, fatores de confusão e inventário longitudinal.
- Doppler Hepático: primeira rodada funcional e cruzamento técnico concluídos, com estado inicial, trombose portal parcial, TIPS, recomendações e inventário de transplante.
- Doppler Venoso de Membro Superior: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, trombose relacionada a cateter, trombose superficial basílica e TVP axilar; foram documentadas contradição entre corpo e conclusão e falhas de concordância do concorrente.
- Doppler Arterial de Membro Superior: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, estenose subclávia, razão automática de velocidades, oclusão crônica, padrão tardus-parvus e inventário de desfiladeiro torácico; foram documentadas uma incoerência distal do concorrente e uma diferença de paridade entre iOS, Web e Android/RN no LaudoUSG.
- Ultrassonografia de Tórax: ausência confirmada no catálogo de Ultrassonografia da conta estudada; o LaudoUSG já possui contrato pulmonar e pleural bilateral, sem equivalente funcional disponível para comparação nesta rodada.
- Quadril Infantil: primeira rodada funcional e cruzamento técnico concluídos, com estado inicial, alfa intermediário sem idade, classificação IIa- e cenário IIc; foi documentada classificação normal do concorrente sem medidas numéricas, e a perda da posição do labrum nos renderizadores do LaudoUSG foi corrigida.
- Doppler Arterial de Membro Inferior: primeira rodada funcional e cruzamento técnico concluídos, com estenose femoral superficial e razão automática, aneurisma poplíteo com trombo mural e oclusão tibial anterior; foi confirmado que o LaudoUSG possui categoria e base clínica para writer, mas ainda não tem contrato estruturado por vaso, cálculo determinístico da razão, aneurisma, ITB integrado ou revascularização.
- Doppler de Fístula Arteriovenosa: primeira rodada funcional e cruzamento técnico concluídos, com baixo fluxo e queda longitudinal, alto fluxo, estenose juxta-anastomótica e medidas quantitativas; foram documentadas uma negativa cardíaca presumida e a permanência de valores derivados após desativar achados no concorrente. No LaudoUSG, a categoria está exposta nos três clientes, mas não possui contrato estruturado nem corpus versionado no checkout atual.
- Doppler Aortorrenal: primeira rodada funcional e cruzamento técnico concluídos, com estenose direita por critério direto, tardus-parvus com e sem medida e limitação técnica. No LaudoUSG, a categoria está exposta nos três clientes e possui writer dedicado. Os riscos de falsa normalidade, troca de contexto de medidas, tardus-parvus superinterpretado e falha não bloqueante foram corrigidos nesta rodada; o contrato compartilhado e outras regras renais ainda estão pendentes. O gate `RENDERER_CATEGORIES` foi verificado vazio em produção, então o writer renal continua desligado até validação e ativação deliberada.
- Ecocardiografia Fetal: primeira rodada funcional e cruzamento técnico concluídos, com CIV muscular medida, extrassístoles e limitação significativa por posição fetal. A categoria está ausente em Web, Android/RN, iOS, API e seed do banco. Foram documentados os riscos de publicar qualificadores preselecionados como fatos e de manter normalidade anatômica completa apesar de limitação global.
- Perfil Biofísico Fetal: primeira rodada funcional e cruzamento técnico concluídos, com perfil 10/10, componente respiratório ausente e líquido reduzido em perfil 6/8 sem cardiotocografia. A categoria está ausente nas três plataformas. Foi documentada a necessidade de separar componente não avaliado de nota zero e de recalcular o denominador no contrato compartilhado.
- Bolsa Testicular com Doppler: primeira rodada funcional e cruzamento técnico concluídos, com ausência isolada de fluxo, sinal do redemoinho e varicocele direita sintética. `ESCROTAL` já existe nas três plataformas e possui corpus clínico, mas não tem contrato ou renderer específico. Foi documentado que o concorrente conclui torção com ausência isolada de fluxo e que o LaudoUSG deve exigir confirmação médica e critérios estruturados.
- Histerossonografia com Infusão Salina: primeira rodada funcional e cruzamento técnico concluídos, com cavidade normal, pólipo endometrial individualizado e distensão inadequada. A categoria está ausente nas três plataformas; `PELVE_FEMININA` oferece componentes anatômicos reutilizáveis, mas não cobre o procedimento. Foi documentado que o concorrente conclui pólipo antes dos dados mínimos e mantém normalidade incompatível em exame limitado.
- Histerossonossalpingografia / HyCoSy: primeira rodada funcional e cruzamento técnico concluídos, com perviedade bilateral, obstrução proximal direita e espasmo direito com limitação. A categoria está ausente nas três plataformas. Foi documentada a necessidade de estado bilateral explícito, derivados coerentes e preservação de indeterminação sem converter espasmo em obstrução.
- Transfontanelar: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, dilatação ventricular qualitativa e hemorragia grau 2 sintética. A categoria está exposta nas três plataformas, mas permanece genérica, sem contrato neonatal, renderer ou auditoria específicos. Foram documentadas conclusão de dilatação sem medidas, classificação de hemorragia antes de lateralidade e dados mínimos, normalidade residual contraditória e persistência de valores desabilitados no concorrente.
- Doppler de Transplante Renal: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, medidas arteriais acima dos critérios exibidos, interpretação de estenose e ausência de fluxo arterial sintética. A categoria está ausente nas três plataformas. Foram documentados razão automática, separação entre alerta e confirmação médica, possível coexistência temporária de medidas anormais com conclusão normal, sugestões de urgência com publicação separada e o risco de encaminhar enxerto pelo writer de rim nativo.
- Cobertura funcional atual: 22 de 84 modelos-base (26,2%) e nenhum dos 15 exames combinados. A fila e o mapa de nomes estão em [fila-e-mapa-canonico-2026-10-03.md](fila-e-mapa-canonico-2026-10-03.md).
- Próxima prioridade: Doppler de aorta e artérias ilíacas.

## Limites desta fotografia

Este é um retrato da interface visível entre 02 e 03/10/2026. Nomes, regras e disponibilidade podem mudar. A presença de um botão ou opção não prova correção clínica; casos de fronteira precisam ser testados e comparados com fonte médica apropriada.
