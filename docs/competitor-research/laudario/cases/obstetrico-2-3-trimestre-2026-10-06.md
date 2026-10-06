# Laudário — Obstétrico 2º/3º Trimestre

Observado em 06/10/2026, em conta autorizada e com dados exclusivamente sintéticos. A rodada usou a interface normal, sem copiar, imprimir, assinar ou finalizar laudos. O modelo foi restaurado, reaberto e confirmado no estado inicial após os três cenários.

## Baseline

Ao abrir o exame, o laudo já descreve feto único longitudinal, cefálico, dorso à esquerda, atividade cardíaca presente, movimentos presentes, placenta posterior sem extensão ao segmento inferior, cordão com três vasos e líquido amniótico habitual. A conclusão mostra uma idade gestacional biométrica em branco. Nenhuma medida ou confirmação clínica havia sido informada.

O baseline não publicou uma avaliação anatômica fetal normal extensa. Os achados morfológicos ficam em uma lista separada de alterações positivas e começam desligados.

**Implicação:** o modelo distingue melhor anatomia não selecionada, mas ainda transforma defaults de apresentação, vitalidade, movimentos, placenta, cordão e líquido em fatos. O placeholder de idade gestacional também chega ao laudo sem dado mínimo.

## Inventário dos controles

O formulário possui dados do paciente, técnica, indicação, datação, útero, miométrio, colo e ovários; depois organiza feto, biometria, gráficos, sexo, achados morfológicos, placenta, cordão, líquido, pré-eclâmpsia, comparativos, achados adicionais e recomendações.

A datação aceita idade informada, DPP, fertilização in vitro, DUM, exame anterior e correção de idade gestacional. Ao ativar idade informada, a interface também publicou DUM desconhecida e exame anterior indisponível, embora esses dois estados não tivessem sido selecionados separadamente.

O módulo fetal oferece situação longitudinal, transversa ou indiferente; apresentação cefálica, pélvica, córmica ou indiferente; dorso; polo cefálico; frequência cardíaca com estado habitual, bradicardia, taquicardia ou ausência; movimentos; e deglutição.

A biometria usa DBP, DOF, CC, DAP, DTA, CA, úmero e fêmur, com seleção individual de inclusão no cálculo. Calcula idade por medida, percentis, idade biométrica composta, índices cefálicos e corporais, peso fetal, estatura e DPP. O peso completo foi identificado como Hadlock IV. Os gráficos visíveis usam referências Hadlock para DBP, CC, CA, CF e PFE e podem ser publicados individualmente. Não foi observado seletor de fórmula ou curva.

Sexo fetal é opcional e começa em não citar. A lista de achados morfológicos cobre crânio, sistema nervoso central, face, região cervical, coluna, tórax, coração, abdome, pelve e membros; são checkboxes de alterações positivas, sem normalidade automática por estrutura.

Placenta combina situação habitual, inserção baixa ou prévia; localização, Grannum, espessura, ecotextura, morfologia, vasa prévia e um módulo condicional de acretismo com istmocele, relação com a cicatriz e sinais ecográficos. Cordão oferece três ou dois vasos e circular não citada, ausente, incompleta ou completa. Líquido aceita MBV e ILA, exibindo faixas de referência e classificação derivada.

O módulo de pré-eclâmpsia reúne fatores maternos, paridade, medidas pressóricas bilaterais, artérias uterinas e artérias oftálmicas, com cálculo explícito. Achados adicionais permitem texto livre e volume de nódulo. Recomendações mantêm sugestão e publicação em estados separados.

## Cenário 1 — biometria compatível com 28 semanas

**Entrada:** idade gestacional informada de 28 semanas; DBP 72 mm, DOF 92 mm, CC 260 mm, CA 230 mm e fêmur 52 mm; BCF 140 bpm; placenta posterior habitual; ILA 14 cm.

**Observado:** o sistema calculou idade biométrica de 28 semanas, PFE de 1110 g por Hadlock IV, percentil 27, CA no percentil 23, índices biométricos e estatura fetal. A conclusão classificou o crescimento como adequado. O ILA entrou no corpo como habitual e não gerou item alterado na conclusão.

Apresentação, movimentos, placenta e cordão continuaram provenientes dos defaults. A idade gestacional informada gerou DPP, mas também acrescentou as negativas de DUM e exame anterior sem ação específica do usuário.

## Cenário 2 — PFE abaixo do percentil 10 e ILA reduzido

**Entrada:** mantendo 28 semanas, CA reduzida para 215 mm e fêmur para 50 mm; ILA 4 cm; sem Doppler.

**Observado:** o sistema calculou PFE de 971 g no percentil 7 e CA no percentil 3. A conclusão não fechou pequeno para idade gestacional nem restrição de crescimento; registrou que a diferenciação dependia da dopplerfluxometria. O ILA foi classificado como reduzido no corpo e como oligoâmnio na conclusão.

Foram sugeridos acompanhamento seriado, Doppler obstétrico e investigação da alteração do líquido. Os itens ficaram selecionados no formulário, mas não entraram no laudo porque o controle mestre de recomendações permaneceu desligado.

**Implicação:** a indeterminação entre PIG e restrição sem Doppler é um comportamento funcional útil. O writer do LaudoUSG ainda pode fechar essa classificação apenas pelo percentil em alguns caminhos e precisa ser alinhado à regra compartilhada após revisão médica.

## Cenário 3 — apresentação pélvica, placenta baixa e biometria incompleta

**Entrada:** medidas normais restauradas; apresentação pélvica; placenta posterior com borda a 15 mm do orifício interno; depois, somente o fêmur foi apagado.

**Observado:** a apresentação mudou apenas no corpo e não gerou conclusão ou recomendação em 28 semanas. A placenta baixa entrou no corpo com distância em milímetros, apareceu na conclusão e sugeriu controle de migração, novamente sem publicar a recomendação automaticamente.

Selecionar placenta baixa antes de preencher a distância já publicou o diagnóstico e deixou um placeholder no corpo. Após apagar o fêmur, o PFE caiu para zero na interface; o laudo manteve peso em branco e passou a exibir percentil abaixo de 1, embora faltasse uma das quatro medidas exigidas pela fórmula declarada. O item de crescimento desapareceu da conclusão, mas o resultado inválido permaneceu no corpo.

**Implicação:** uma fórmula incompleta precisa resultar em estado não calculável. Não deve produzir zero, percentil ou placeholder. Se o produto aceitar uma fórmula alternativa de três medidas, ela precisa ser selecionada e registrada explicitamente.

## Fronteiras observadas no catálogo

O catálogo mantém modelos separados para Obstétrico 2º/3º Trimestre com Doppler, gemelar, com Perfil Biofísico Fetal e combinações entre eles. Essas variantes não foram abertas nesta rodada e o comportamento não foi inferido a partir dos nomes.

## Restauração

Idade gestacional, BCF, todas as medidas biométricas, ILA e distância placentária foram apagados. Apresentação cefálica e placenta habitual foram restauradas. Valores desabilitados residuais de idade e placenta também foram limpos. O modelo foi reaberto e confirmou abas sem contadores, recomendações vazias e o texto inicial original.

## Evidência e próxima sondagem

São fatos observados os controles, os cálculos, os efeitos no corpo e na conclusão e a restauração descritos acima. As propostas para o LaudoUSG são originais e dependem de revisão médica antes de ativação clínica. Uma rodada futura pode testar curva ou fórmula configurável, Doppler, sexo fetal, acretismo e um achado morfológico isolado.

O cruzamento técnico está em [crosswalk-obstetrico-2-3-trimestre-2026-10-06.md](../crosswalk-obstetrico-2-3-trimestre-2026-10-06.md).

## Complemento — gráficos de crescimento

O módulo foi reaberto em 06/10/2026 para uma sondagem específica dos gráficos, novamente com dados sintéticos e sem finalizar, imprimir ou enviar laudo. O estado foi restaurado e reaberto ao final.

O painel reúne cinco gráficos: DBP, CC, CA e CF por idade gestacional, com referência Hadlock 1984, e PFE por idade gestacional, com referência Hadlock 1991. Todos começam fora do laudo. Há inclusão individual, inclusão conjunta, ajuste global de tamanho entre 100% e 200%, aproximação no ponto atual e barras de percentil na tabela biométrica.

Com IG de 28+0 semanas, DBP 72 mm, DOF 92 mm, CC 260 mm, CA 230 mm e CF 52 mm, a interface mostrou pontos atuais em vermelho e aproximou automaticamente a janela ao redor deles. Ao desligar a aproximação, voltou a exibir a curva inteira, de aproximadamente 14 a 40 semanas. A inclusão isolada do DBP gerou uma imagem no corpo do laudo; a inclusão conjunta gerou uma única imagem composta com os cinco gráficos. A escala mudou a largura publicada, sem alterar o cálculo.

No DBP foi acrescentado um exame anterior sintético de 24+0 semanas e 58 mm. O gráfico exibiu o ponto anterior em azul e o atual em vermelho, sem linha ligando os dois pontos e sem rótulo textual visível sobre sua origem. Não foi possível comprovar tooltip na interface. Também não foi determinado o número máximo de exames anteriores.

As barras de percentil foram publicadas como imagens pequenas na tabela biométrica. Tanto os gráficos quanto as barras chegaram ao editor como imagens rasterizadas. A publicação permanece opt-in, o que evita acrescentar figuras ao laudo sem uma ação médica explícita.

Como oportunidade de produto, a visualização pode ficar dentro do próprio fluxo de biometria, aparecer assim que medida e IG válidas existirem e manter a publicação como decisão separada. Um único card compacto pode selecionar PFE ou medidas individuais, identificar ponto atual e anteriores, oferecer leitura por toque/mouse/teclado e usar o mesmo resultado versionado que alimenta peso, percentil, corpo e conclusão. A figura do laudo deve ser derivada desse estado estruturado, em vez de se tornar a fonte clínica do dado.
