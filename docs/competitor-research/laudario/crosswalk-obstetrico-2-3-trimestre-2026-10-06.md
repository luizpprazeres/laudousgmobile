# Cruzamento Laudário × LaudoUSG — Obstétrico 2º/3º Trimestre

Data: 06/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi comparado com o preflight técnico e a prova sintética de 05/10. Nenhum dado clínico real foi usado.

## Síntese

O LaudoUSG já possui `OBSTETRICA` nas três plataformas, com formulário estruturado na Web e geração baseada em ditado nos clientes móveis. O estudo confirmou que o caminho Web está mais próximo do comportamento desejado para crescimento fetal do que o writer móvel, mas também mostrou oportunidades de produto em biometria, proveniência dos defaults, placenta, recomendações e pré-eclâmpsia.

| Cenário | Laudário observado | LaudoUSG atual | Classificação |
| --- | --- | --- | --- |
| Baseline sem medidas | publica apresentação, vitalidade, movimentos, placenta, cordão e líquido normais; deixa IG em branco | também possui defaults e placeholders, incluindo anatomia normal | risco confirmado nos dois produtos |
| Biometria completa de 28 semanas | Hadlock IV, percentis por medida, PFE e crescimento adequado | cálculo fragmentado entre Web, iOS, RN e API | gap confirmado de fonte única |
| PFE p7 e CA p3 sem Doppler | não fecha PIG ou restrição; pede caracterização por Doppler | Web mantém indeterminação; writer pode fechar diagnóstico só pelo percentil | divergência P0 confirmada |
| ILA 4 cm | classifica oligoâmnio e sugere investigação e seguimento | renderer classifica; recomendações não têm estado compartilhado | cobertura parcial |
| Placenta a 15 mm | corpo, conclusão e recomendação opt-in | há campos duplicados em mm e cm | gap confirmado de unidade e fonte |
| Fêmur apagado | peso zero, placeholder e percentil inválido no corpo | Web usa quatro medidas; comportamento incompleto precisa de golden | requisito de bloqueio confirmado |

## Defaults e dados mínimos

O concorrente publica vários fatos já na abertura, inclusive um placeholder de idade gestacional. O LaudoUSG reproduz esse risco e acrescenta frases anatômicas normais sem campos correspondentes. Nenhum dos produtos deve tratar estado inicial como exame realizado.

**Requisito proposto:** apresentação, vitalidade, movimentos, placenta, cordão, líquido e anatomia devem ter estado de avaliação explícito. O laudo normal pode continuar rápido, mas sua aplicação precisa ser uma ação médica identificável. Campo ausente deve omitir a frase e nunca renderizar lacuna visual.

## Crescimento fetal e autoridade clínica

No caso p7 com CA p3, o Laudário preservou a indeterminação sem Doppler. O renderer Web do LaudoUSG já segue lógica semelhante por meio do módulo compartilhado. O writer possui snippets capazes de concluir PIG ou restrição apenas pelo percentil em parte dos cenários.

**Gap confirmado:** o diagnóstico depende do caminho de geração.

**Requisito proposto:** todos os clientes devem consumir uma única decisão estruturada. Sem Doppler completo, o resultado deve registrar crescimento abaixo do esperado e estadiamento incompleto, sem converter automaticamente em PIG ou restrição. A redação e os critérios precisam de aprovação médica antes da mudança do writer.

## Biometria, fórmula e curva

O concorrente exibiu Hadlock IV com DBP, CC, CA e CF e percentis derivados, sem seletor visível de fórmula ou curva. No LaudoUSG, Web, iOS, RN, prévia e API usam implementações e versões diferentes; `packages/shared` ainda não é a fonte única para PFE e percentil.

**Gap confirmado:** fórmula, versão, curva, sexo e unidade não têm contrato comum.

**Requisito proposto:** criar um serviço compartilhado que receba medidas em milímetros, fórmula identificada, idade gestacional, curva identificada e sexo apenas quando a curva exigir. O resultado deve preservar versão e proveniência. A mesma estrutura deve alimentar corpo, conclusão, gráficos e Sala.

## Biometria incompleta

O concorrente demonstrou o risco concreto: ao faltar apenas o fêmur, declarou Hadlock IV, deixou peso vazio e ainda calculou percentil abaixo de 1. O LaudoUSG precisa provar o comportamento dos mesmos estados em todos os clientes.

**Requisito proposto:** quatro medidas incompletas tornam Hadlock IV não calculável. Peso, percentil, estatura derivada e classificação de crescimento devem desaparecer juntos e gerar uma pendência objetiva. Uma fórmula alternativa só pode ser usada quando selecionada e registrada.

## Placenta e recomendações

No Laudário, selecionar inserção baixa já concluiu o diagnóstico antes da distância; com 15 mm, corpo e conclusão ficaram coerentes. A recomendação de reavaliação ficou sugerida, marcada e fora do laudo até ativar o bloco mestre.

No LaudoUSG, o mesmo conceito aparece em campos diferentes e unidades diferentes no formulário obstétrico e na cervicometria.

**Requisito proposto:** uma medida única placenta–orifício interno, em unidade canônica, deve alimentar classificação, corpo, conclusão e recomendação. O diagnóstico deve depender da medida e de critérios próprios aprovados. Recomendações devem manter estados separados de sugerida, confirmada e publicada.

## Datação e dependências inesperadas

No concorrente, informar manualmente 28 semanas também publicou DUM desconhecida e exame anterior indisponível. Esses fatos não foram confirmados separadamente.

**Requisito proposto:** idade informada, DUM, primeiro exame, exame indisponível e correção de datação devem ser campos independentes. Uma fonte de idade não pode inferir a ausência das demais.

## Módulos que merecem reaproveitamento

A lista de achados morfológicos positivos evita publicar anatomia normal sem avaliação. Os gráficos por parâmetro, o sexo fetal opt-in, o bloco condicional de acretismo, a calculadora de pré-eclâmpsia e a publicação separada de recomendações são referências funcionais úteis. O conteúdo clínico, fórmulas e redação do LaudoUSG devem continuar próprios e versionados.

## Ordem sugerida

Primeiro alinhar writer e renderer na classificação do crescimento. Depois bloquear biometria incompleta e unificar PFE, curva e unidades em `packages/shared`. Em seguida remover defaults silenciosos e consolidar placenta–orifício interno. Recomendações e pré-eclâmpsia podem consumir o mesmo contrato após revisão clínica.

## Testes de aceite propostos

O conjunto mínimo deve provar baseline sem placeholders; biometria completa idêntica em Web, iOS, RN e API; p7 sem Doppler preservando indeterminação; ILA reduzido chegando ao corpo e à conclusão; uma medida biométrica ausente bloqueando peso e percentil; placenta baixa sem distância não fechando diagnóstico; recomendação sugerida fora do laudo até confirmação.

## Evidências relacionadas

O caso funcional está em [cases/obstetrico-2-3-trimestre-2026-10-06.md](cases/obstetrico-2-3-trimestre-2026-10-06.md). O estado do código e as linhas de evidência estão em [audits/preflight-obstetrico-2-3-trimestre-2026-10-05.md](audits/preflight-obstetrico-2-3-trimestre-2026-10-05.md) e [audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md](audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md).

## Complemento — contrato e experiência dos gráficos

A sondagem específica confirmou cinco figuras publicáveis e uma comparação longitudinal por pontos. O comportamento útil é a separação entre visualizar e publicar: o médico pode conferir a curva sem acrescentá-la ao laudo. As limitações observadas foram a distância entre biometria e gráficos, controles repetidos em cinco cards, identificação visual pouco explícita dos pontos atual/anterior e publicação rasterizada em uma imagem única quando todos são selecionados.

O LaudoUSG já possuía uma prévia INTERGROWTH-21st 2020 para PFE, derivada de CC/CA/CF e da IG informada, além de uma folha de impressão separada. A primeira evolução Web mantém essa fonte existente e acrescenta interação na curva, inclusão explícita na prévia do laudo e persistência da escolha no estado do exame. Se os dados mínimos deixam de ser válidos, a seleção do gráfico é retirada para impedir a permanência de uma figura obsoleta.

O contrato futuro deve representar a figura por especificação estruturada: tipo de medida, fórmula, curva e versão, unidade, IG, valor atual, observações anteriores com data e origem, configuração visual e estado de publicação. O gráfico sempre será uma projeção desse contrato. Alterar uma medida precisa atualizar texto e figura juntos; apagar um dado mínimo precisa remover ponto, percentil e publicação derivada.

Para o Web, a sequência recomendada é manter PFE como primeiro gráfico funcional, depois acrescentar séries históricas com origem explícita e, somente após validar curvas próprias, ampliar para DBP, CC, CA e CF. Os controles devem usar escolhas clínicas curtas, como “PFE”, “medidas relevantes” e “todos”, com layout automático compacto ou largura total. O tamanho em percentual bruto não precisa ser reproduzido.
