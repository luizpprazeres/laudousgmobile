# Laudário — Pélvico Transvaginal

Observado em 06/10/2026, em conta autorizada e com dados exclusivamente sintéticos. A rodada usou a interface normal, sem copiar, imprimir, assinar ou finalizar laudos. O modelo foi restaurado ao estado inicial após os cenários. A variante com Doppler foi aberta apenas para comparar o estado inicial e os controles próprios.

## Baseline e inventário dos controles

Ao abrir o modelo sem preencher medidas, o laudo já descreve útero, miométrio, colo, endométrio e ambos os ovários como normais, nega líquido livre e publica uma conclusão global de normalidade. Esses fatos vêm de seleções predefinidas, não de confirmações feitas durante a sessão.

O formulário organiza os controles em dados do paciente, técnica, indicação, antecedentes, introito vaginal, útero, miométrio, endométrio, colo, ovários, contagem folicular, líquido livre, região anexial, avaliação ampliada, exames comparativos, achados adicionais, cartograma e recomendações.

Nos antecedentes há estados de fertilidade, menopausa e sangramento, história obstétrica, data menstrual, uso hormonal, cirurgia pélvica, endometriose e tamoxifeno. Útero e miométrio combinam situação cirúrgica, formato, flexão, contornos, desvio, três medidas, volume calculado, mobilidade, anomalias müllerianas, adenomiose, istmocele, calcificações e uma lista repetível de miomas com localização, aspecto, relação com o útero, medidas e classificação.

O endométrio reúne caracterização, espessura, padrão, descritores IETA, conteúdo intracavitário, dispositivo intrauterino e pólipos repetíveis. O colo oferece cistos, inflamação, estenose, massas, duplicação, alterações pós-radioterapia e pólipo endocervical. Cada ovário pode ser habitual, multifolicular, policístico, hipotrófico, torcido ou não caracterizado; há medidas, volume, posição, mobilidade, lesões típicas e um módulo de lesão ovariana com componentes sólidos e císticos, margens, loculação, septos, sombra, vascularização e classificação.

A contagem folicular é opcional e calcula o total a partir dos lados. Líquido livre, varizes pélvicas, alterações tubárias, abscesso tubo-ovariano, achados peritoneais, avaliação dinâmica, introito, ureteres, alças intestinais, apêndice, linfonodos, hérnia, prolapso e texto adicional ficam em módulos separados. A recomendação também tem um controle mestre de publicação independente dos itens sugeridos.

## Cenário 1 — estado inicial

**Entrada:** nenhuma interação clínica e nenhuma medida.

**Observado:** o corpo e a conclusão publicaram normalidade completa. Não havia medidas uterinas, espessura endometrial ou dimensões ovarianas que sustentassem parte das afirmações. Vários controles negativos e descritores normais já estavam selecionados.

**Implicação:** abrir o formulário não pode equivaler a confirmar todas as estruturas. O LaudoUSG deve separar estado inicial, estrutura avaliada e normalidade confirmada.

## Cenário 2 — pós-menopausa, endométrio espessado e mioma

**Entrada:** menopausa; endométrio de 12 mm com padrão espessado homogêneo; mioma único corporal posterior de 3,0 × 2,5 × 2,0 cm. A classificação FIGO não foi selecionada.

**Observado:** marcar menopausa isoladamente não alterou o laudo. Informar apenas a espessura acrescentou 12,0 mm ao corpo, mas preservou a conclusão global normal. Ao selecionar o padrão espessado, o corpo passou a registrar espessamento com descritores IETA predefinidos e a conclusão passou a citar espessamento endometrial.

A interface exibiu uma referência para espessura endometrial pós-menopausa e sugeriu investigação conforme fatores de risco. A sugestão apareceu selecionada, porém não foi publicada porque o controle mestre de recomendações permaneceu desligado.

Ao ativar o mioma, o sistema publicou automaticamente ecotextura miometrial heterogênea e descritores predefinidos de aspecto e relação com o útero antes de confirmação específica. Com as medidas, calculou volume de 7,8 cm³. A conclusão incluiu leiomioma e espessamento endometrial. FIGO não foi inferido.

**Implicação:** medida, interpretação, classificação e recomendação precisam de autoridades separadas. Descritores preselecionados não devem virar fatos silenciosamente. A recomendação opt-in é um padrão útil, desde que a sugestão seja clinicamente validada.

## Cenário 3 — ovário direito não caracterizado

**Entrada:** ovário direito não caracterizado; primeiro sem motivo e depois com interposição gasosa.

**Observado:** a descrição normal do ovário direito foi removida e os campos positivos ficaram desabilitados. Sem motivo escolhido, o corpo informou apenas a não caracterização, mas também publicou que a região anexial direita estava livre porque esse controle permanecia marcado por padrão. O ovário esquerdo continuou normal e a conclusão global continuou declarando exame normal. Ao escolher interposição gasosa, o motivo entrou no corpo.

**Implicação:** estrutura não caracterizada deve impedir normalidade global e qualquer negativa anatômica dependente daquela visualização. O motivo deve ser explícito, e o lado contralateral precisa permanecer independente.

## Variante com Doppler

O modelo separado acrescenta uma aba Doppler e muda o título. No estado inicial, já publica Doppler pélvico normal. O controle para registrar Doppler das artérias uterinas vem ligado por padrão, enquanto os campos bilaterais de índice de pulsatilidade, índice de resistência e velocidade sistólica permanecem vazios.

**Implicação:** a existência dos campos confirma uma diferença funcional entre as variantes, mas a normalidade sem valores ou confirmação médica repete o risco do baseline. No LaudoUSG, título, técnica e conclusão de Doppler devem depender do estado realizado e dos dados confirmados.

## Restauração

Menopausa, espessura endometrial, padrão alterado, mioma, medidas e motivo da não caracterização foram removidos. O ovário direito voltou ao estado habitual. O texto final foi comparado ao baseline e retornou ao estado original. A variante com Doppler não recebeu dados nem alterações.

## Evidência e classificação

São fatos observados: os controles descritos, a normalidade inicial, as transições dos três cenários, a recomendação separada, o cálculo do mioma, a permanência da conclusão normal no ovário não caracterizado e os campos da variante Doppler. As implicações para o LaudoUSG são propostas originais e dependem de revisão médica antes de qualquer ativação clínica.

## Próxima sondagem

Uma rodada futura pode aprofundar pólipo endometrial, lesão ovariana com O-RADS confirmado, anomalia mülleriana, istmocele e avaliação ampliada. O próximo exame da fila funcional é Obstétrico 2º/3º Trimestre.

O cruzamento técnico está em [crosswalk-pelvico-transvaginal-2026-10-06.md](../crosswalk-pelvico-transvaginal-2026-10-06.md).
