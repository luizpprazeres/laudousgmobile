# Laudário — Pesquisa de Endometriose

Observado em 02/10/2026, com dados exclusivamente sintéticos. O modelo foi restaurado, reaberto e confirmado sem seleções ou medidas residuais. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

## Estrutura

O formulário é dividido em dados do paciente, técnica, indicação, antecedentes, avaliação abdominal, compartimento anterior, introito vaginal, útero, miométrio, endométrio, colo uterino, ovários, região anexial, compartimentos posterior e lateral, avaliação dinâmica, cartograma, exames comparativos e recomendações.

O estado inicial produz um laudo normal por compartimentos, registra sinal de deslizamento positivo, mobilidade preservada e ausência de processo aderencial. A conclusão informa ausência de evidência ultrassonográfica de endometriose profunda nas regiões avaliadas. A interface cita como referência o consenso da Society of Radiologists in Ultrasound publicado em 2024.

## Cenário 1 — estado normal

**Entrada:** nenhuma alteração selecionada.

**Observado:** o texto descreveu avaliação abdominal complementar, compartimentos anterior, central e posterior, ovários e avaliação dinâmica. A normalidade foi construída a partir de opções já selecionadas no formulário, e não de confirmação individual feita durante esta sessão.

**Implicação:** um modelo equivalente no LaudoUSG precisa distinguir estado inicial de estrutura efetivamente avaliada. O texto não deve afirmar avaliação normal de um compartimento apenas porque o usuário ainda não interagiu com ele.

## Cenário 2 — endometrioma ovariano direito

**Entrada:** endometrioma típico à direita, medindo 3,2 × 2,8 × 2,5 cm.

**Observado:** o sistema calculou volume de 11,6 cm³ e gerou descrição morfológica detalhada, sem componente sólido, projeção papilar ou vascularização interna, classificando o achado como O-RADS 2. A conclusão acrescentou endometrioma ovariano direito e classificação O-RADS.

A mesma seleção gerou duas recomendações automáticas: avaliação especializada e ressonância magnética. Elas ficaram marcadas no formulário, mas não entraram no laudo porque a opção separada de incluir o bloco de recomendações permaneceu desligada.

O texto de conclusão chamou o endometrioma de “endometriose profunda” no compartimento central. Esse encadeamento foi observado literalmente na interface e requer revisão clínica antes de servir como referência funcional.

**Implicação:** morfologia, medidas, volume, classificação confirmada, conclusão e recomendação são estados separados. Recomendações podem ser sugeridas, mas sua publicação deve depender de confirmação explícita. O LaudoUSG não deve reproduzir automaticamente a associação entre endometrioma e endometriose profunda sem validação clínica.

## Cenário 3 — lesão intestinal e avaliação dinâmica

**Entrada:** lesão infiltrativa na parede anterior do reto médio, atingindo muscular própria, medindo 2,5 × 0,8 × 1,2 cm, a 8 cm da borda anal, envolvendo 25% da circunferência e causando estreitamento luminal estimado em 30%. Foi ativada a tabela-resumo. Em seguida, o sinal de deslizamento do fundo uterino foi marcado como negativo e o processo aderencial como posterior.

**Observado:** o corpo do laudo preservou segmento, aspecto, camada, três medidas, distância da borda anal, percentual da circunferência e percentual de estreitamento. A tabela opcional condensou segmento, medidas, profundidade, distância e circunferência. A conclusão descreveu endometriose profunda do compartimento posterior com comprometimento intestinal.

Os campos anatômicos e dinâmicos são independentes. Logo após marcar sigmoide aderido ao fundo uterino, o texto ainda afirmava ausência de processo aderencial. A contradição desapareceu somente depois de selecionar manualmente processo aderencial posterior.

**Implicação:** flexibilidade de edição não substitui regras de coerência. Um contrato do LaudoUSG deve impedir combinações como órgão aderido com “sem processo aderencial”, preservar medidas cirurgicamente úteis e permitir resumo tabular sem duplicar ou omitir dados.

## Cartograma

O módulo oferece vistas frontal e sagital, ferramentas para endometriose profunda, endometrioma, aderências, folículos, adenomiose e desenho livre. A inclusão no laudo é opcional. O achado intestinal não apareceu marcado automaticamente no cartograma; o mapa permaneceu pronto para marcação manual.

**Implicação:** o cartograma precisa ter uma fonte de verdade explícita. Se for manual, deve ser apresentado como anotação visual; se for derivado dos achados, precisa sincronizar alterações e exclusões sem inferir localização não confirmada.

## Restauração

As medidas e o endometrioma foram removidos. A lesão intestinal foi excluída, a tabela desligada, reto-sigmoide voltou a sem alterações, os sinais de deslizamento voltaram a positivos e a avaliação aderencial voltou a normal. O exame foi reaberto e confirmou todas as abas sem contadores, recomendações vazias e o texto normal original.

## Próximas sondagens

Avaliar lesões de bexiga e ureteres, ligamentos uterossacros, tórus, septo retovaginal, parede vaginal, compartimentos laterais, adenomiose, endometriomas bilaterais, obliteração do fundo de saco e limites do cartograma. Antes disso, o cruzamento técnico deve confirmar o que já existe no LaudoUSG e quais relações precisam de bloqueios de coerência.

O cruzamento técnico inicial está em [crosswalk-pesquisa-endometriose-2026-10-02.md](../crosswalk-pesquisa-endometriose-2026-10-02.md).
