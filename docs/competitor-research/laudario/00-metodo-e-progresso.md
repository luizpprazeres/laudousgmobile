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
- Abdome Total: primeira rodada funcional concluída com estado normal, esteatose leve, hepatite aguda com repercussão vesicular e colelitíase sintética; cruzamento técnico em andamento.
- Obstétrico 1º Trimestre: primeira rodada funcional e cruzamento técnico concluídos, com datação por CCN, ausência de atividade cardíaca e rastreio sintético de trissomias.
- Pesquisa de Endometriose: primeira rodada funcional e cruzamento técnico concluídos, com estado normal, endometrioma, lesão intestinal, avaliação dinâmica, recomendações e cartograma.
- Próximas prioridades: Doppler Venoso de Membro Inferior e Mamas/Axilas.

## Limites desta fotografia

Este é um retrato da interface visível em 02/10/2026. Nomes, regras e disponibilidade podem mudar. A presença de um botão ou opção não prova correção clínica; casos de fronteira precisam ser testados e comparados com fonte médica apropriada.
