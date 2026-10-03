# Cruzamento inicial Laudário × LaudoUSG

Estado: triagem contínua. Os lotes concluídos abaixo já contêm lacunas confirmadas; os demais itens permanecem candidatos até cruzamento com o código.

O catálogo observado tem 99 entradas, contra 34 categorias atualmente expostas na landing do LaudoUSG. A diferença bruta superestima o gap: o Laudário separa lateralidade, Doppler, gestação gemelar e combinações em modelos próprios, enquanto o LaudoUSG pode tratar parte dessas variações dentro de uma categoria ou por composição.

## Candidatos de alta prioridade para confirmação

**Ginecologia:** Histerossonografia com infusão salina, histerossonossalpingografia, monitorização folicular e Doppler pélvico. Distinguir categoria ausente de bloco já coberto em Pelve feminina.

**Vascular abdominal:** aorta/ilíacas, mesentéricas e transplante renal. Comparar critérios determinísticos e campos obrigatórios, não apenas nomes.

**Obstetrícia especializada:** Ecocardiografia fetal, terceiro trimestre morfológico, 3D/4D, perfil biofísico e versões gemelares. Verificar se o LaudoUSG cobre como variante interna ou não oferece o fluxo.

**Combinações:** o Laudário expõe 15 modelos combinados. O LaudoUSG já tem contrato de composição Web para alguns pares, mas ainda precisa cruzar cobertura, edição e paridade iOS/Android/Sala.

**MSK e lateralidade:** o Laudário separa unilateral e bilateral por região. O LaudoUSG precisa ser avaliado por campos e resultado final, pois uma categoria única pode ter maior flexibilidade apesar de menor número aparente.

A fila atualizada e o mapa de equivalências de nomes estão em [fila-e-mapa-canonico-2026-10-03.md](fila-e-mapa-canonico-2026-10-03.md).

## Doppler Aortorrenal — paridade de catálogo e segurança clínica

O Laudário separa técnica, perviedade, padrão hemodinâmico, critérios diretos e indiretos. No cenário direto, a medida gerou alerta, mas a conclusão positiva dependeu da seleção médica do padrão anormal. Na limitação técnica, o lado não avaliado deixou de ser tratado como normal. Em contraste, o tardus-parvus qualitativo isolado já produziu conclusão de estenose significativa antes de qualquer medida indireta.

O LaudoUSG expõe Doppler renal nos três clientes e possui writer dedicado. O cruzamento confirmou ausência de contrato compartilhado e revelou falsa normalidade por omissão, auditoria sem contexto e avisos não bloqueantes. Esses riscos imediatos foram corrigidos no mesmo lote; permanecem a estruturação completa, paridade de formulário, estilo/personalização e regras renais ainda fora do caminho ativo. O estudo completo está em [crosswalk-doppler-aortorrenal-2026-10-03.md](crosswalk-doppler-aortorrenal-2026-10-03.md).

## Ecocardiografia fetal — categoria própria ausente

O Laudário organiza o exame por anatomia sequencial, ritmo, função, medidas, recomendações e modelos de cardiopatias. A CIV muscular medida substituiu a normalidade incompatível e chegou à conclusão. As extrassístoles expuseram um risco relevante: origem atrial, condução ventricular e caráter isolado foram publicados a partir de opções preselecionadas. Uma limitação técnica significativa atenuou a conclusão, mas não retirou as normalidades anatômicas completas do corpo.

No LaudoUSG, ecocardiografia fetal aparece somente como recomendação dentro de exames obstétricos. A categoria, o contrato, os renderizadores e o catálogo estão ausentes nas três plataformas. A implementação futura deve ser própria, com variante gemelar no mesmo contrato, confirmação explícita de qualificadores e escopo de avaliação por bloco. O estudo completo está em [crosswalk-ecocardiografia-fetal-2026-10-03.md](crosswalk-ecocardiografia-fetal-2026-10-03.md).

## Perfil biofísico fetal — escore e denominador ausentes

O exame observado calcula quatro componentes ultrassonográficos e cardiotocografia opcional. Quando a cardiotocografia não é avaliada, ela aparece com nota zero no corpo, mas fica fora do denominador; o perfil basal é 8/8. Cardiotocografia reativa produz 10/10. Líquido reduzido com ILA preenchido altera a conclusão e sugere acompanhamento, sem publicar a recomendação automaticamente.

O LaudoUSG possui fragmentos de movimentos fetais e líquido amniótico em categorias obstétricas, mas não reúne os cinco componentes nem calcula o escore. Falta uma categoria própria com estados explícitos, cálculo compartilhado e validação de numerador/denominador no servidor. O estudo completo está em [crosswalk-perfil-biofisico-fetal-2026-10-03.md](crosswalk-perfil-biofisico-fetal-2026-10-03.md).

## Tireoide — diferença funcional já observada

O Laudário oferece presets de tireoidopatia que preenchem múltiplos controles, ACR TI-RADS calculado por nódulo, cartograma e recomendação automática com confirmação independente de inclusão no laudo. O cruzamento técnico do LaudoUSG está em [crosswalk-tireoide-2026-10-02.md](crosswalk-tireoide-2026-10-02.md): o núcleo clínico já existe, mas formulário, calculadora, recomendação e cartograma ainda estão desacoplados em graus diferentes na Web, iOS e Android.

## Abdome Total — encadeamentos observados

O formulário é dividido por estruturas e inclui módulos específicos de veias hepáticas, veia porta, quantificação gordurosa e recomendações. A primeira rodada mostrou macros que ultrapassam o órgão selecionado: hepatopatia aguda modifica simultaneamente a descrição hepática, a vesícula biliar e a conclusão. Esteatose leve e cálculo vesicular único também geram corpo e conclusão coerentes a partir de poucos controles. O cruzamento com o LaudoUSG deve avaliar essas dependências, e não somente a presença das frases isoladas.

O cruzamento técnico está em [crosswalk-abdome-total-2026-10-02.md](crosswalk-abdome-total-2026-10-02.md). Esteatose leve e cálculo móvel já existem no núcleo do LaudoUSG; a cascata hepatite aguda → espessamento reativo da vesícula é uma lacuna confirmada no contrato determinístico atual.

## Obstétrico de primeiro trimestre — cálculos e confirmação

O Laudário deriva idade gestacional e DPP do CCN, relaciona ausência de atividade cardíaca ao limiar biométrico e calcula risco combinado de trissomias a partir dos fatores disponíveis. A classificação qualitativa do risco aparece na conclusão; a tabela com riscos basal e corrigido depende de uma escolha separada do médico. O ducto venoso descrito como normal entra no texto, mas só participa do cálculo quando há índice de pulsatilidade, distinção exibida pela própria interface.

O cruzamento com o LaudoUSG deve separar quatro camadas: cálculo, texto descritivo, conclusão clínica e decisão de publicar os números. A presença de uma calculadora isolada não comprova que essas quatro camadas estejam conectadas.

O cruzamento técnico está em [crosswalk-obstetrico-1t-2026-10-02.md](crosswalk-obstetrico-1t-2026-10-02.md). A datação por CCN não alimenta a DPP nos clientes atuais; a conclusão de ausência de vitalidade ainda não valida o limiar biométrico; e a proveniência do cálculo de trissomias não chega de forma estruturada à Sala.

## Pesquisa de Endometriose — compartimentos e coerência

O Laudário estrutura o exame por compartimentos, avaliação dinâmica, recomendações e cartograma. Endometrioma e lesão intestinal atualizam o corpo e a conclusão; recomendações e tabela-resumo têm confirmação própria. Anatomia e dinâmica permanecem independentes, permitindo uma contradição temporária entre sigmoide aderido e ausência de processo aderencial.

O cruzamento com o LaudoUSG deve buscar cobertura real de compartimentos, medidas intestinalmente relevantes, recomendações, cartograma e regras que impeçam combinações incompatíveis. Endometrioma já existe em Pelve feminina, mas isso não comprova cobertura do protocolo completo de pesquisa de endometriose.

O cruzamento técnico está em [crosswalk-pesquisa-endometriose-2026-10-02.md](crosswalk-pesquisa-endometriose-2026-10-02.md). A categoria estruturada está ausente nas três plataformas; Pelve feminina cobre parcialmente endometrioma, mas não compartimentos, avaliação dinâmica, lesão intestinal ou cartograma específico.

## Doppler Venoso de Membro Inferior — contrato e cartograma

O Laudário separa superficial e profundo, modela refluxo por segmento, sugere recomendações e sincroniza os achados com um flebograma editável. No cenário sintético, refluxo da junção e da safena magna atualizou texto, conclusão e mapa. A TVP proximal completa também foi representada na vista profunda.

O fluxo revelou uma fragilidade clínica: criar uma linha de trombose com segmento e extensão já produziu conclusão positiva antes da confirmação de material intraluminal, não compressibilidade e ausência de fluxo. O LaudoUSG deve implementar essa exigência de critérios e distinguir suspeita, achados, idade e diagnóstico confirmado.

O cruzamento técnico está em [crosswalk-doppler-venoso-mmii-2026-10-02.md](crosswalk-doppler-venoso-mmii-2026-10-02.md). A categoria e o mapa já existem, mas o texto e o desenho ainda usam contratos separados; a variante com medidas não percorre todo o caminho da categoria base; e faltam gates estruturais para impedir conclusão ou representação de TVP sem critérios suficientes.

## Mamas e Axilas — classificação, topografia e Sala

O Laudário conecta descritores, BI-RADS, recomendações e cartograma durante o preenchimento. O estudo confirmou estado normal, cisto simples e nódulo sólido suspeito. Também revelou uma fragilidade que o LaudoUSG não deve reproduzir: ativar um nódulo ainda sem medidas já gerou categoria e seguimento.

O LaudoUSG possui cobertura clínica mais conservadora e mantém o BI-RADS como confirmação médica, mas ainda permite finalizar um achado suspeito sem categoria confirmada. Nos apps móveis, o cartograma já chega à Sala ligado ao laudo por `reportId`, porém texto, lesão e desenho não compartilham identidade por lesão; a Web ainda depende de fallback por categoria. No iOS, o editor manual grava uma distância da papila não informada e o parser pode criar topografia aproximada; no Android, o desenho é manual e não conserva medidas ou quadrante.

O cruzamento técnico está em [crosswalk-mamas-e-axilas-2026-10-02.md](crosswalk-mamas-e-axilas-2026-10-02.md). As prioridades são remover topografia inventada, bloquear lesão suspeita sem BI-RADS confirmado e criar contrato compartilhado por lesão, preservando o vínculo móvel já existente e levando `reportId` também no fluxo Web.

## Avaliação Multiparamétrica Hepática — método, qualidade e dependências

O Laudário reúne abdome superior, Doppler, gordura e elastografia em um exame próprio. A rodada confirmou quantificação por método e fabricante e interpretação automática de rigidez. Também revelou duas fragilidades que o LaudoUSG não deve reproduzir: a gordura foi classificada antes do preenchimento do índice de qualidade, e um valor de m/s derivado permaneceu ativo após apagar kPa, mantendo uma conclusão positiva.

O LaudoUSG Web já possui um bloco complementar mais conservador: documenta CAP, atenuação, fração gordurosa e rigidez sem conversão ou classificação universal. Ainda faltam categorias próprias, contrato compartilhado, gates técnicos por método, correlação entre modo B e quantificação, paridade móvel, validação no servidor e travessia Web para a Sala.

O cruzamento técnico está em [crosswalk-avaliacao-multiparametrica-hepatica-2026-10-02.md](crosswalk-avaliacao-multiparametrica-hepatica-2026-10-02.md). A prioridade é versionar o contrato clínico, adaptar o módulo Web e o transporte à Sala e depois ativar Web, iOS e Android em paridade.

## Elastografia Hepática — qualidade, baço e evolução

O exame independente confirmou que a classificação hepática ocorre antes do preenchimento do IQR/mediana. Também expôs elastografia esplênica e seguimento longitudinal. No cenário sintético, fígado abaixo de 16 kPa e baço abaixo de 26,6 kPa em 2D-SWE produziram uma interpretação combinada; ativar o baço sem medida inseriu uma instrução de preenchimento dentro do laudo.

O LaudoUSG Web documenta rigidez hepática sem converter ou classificar automaticamente, mas ainda aceita medida sem gate completo de qualidade e pode conservar uma interpretação antiga após mudança da aquisição. Categoria própria, rigidez esplênica, evolução, validação de servidor, mobile e Sala estão ausentes.

O cruzamento técnico está em [crosswalk-elastografia-hepatica-2026-10-02.md](crosswalk-elastografia-hepatica-2026-10-02.md). A implementação deve começar pelo contrato e pela limpeza das dependências; os algoritmos hepatoesplênicos e longitudinais dependem de aprovação clínica específica.

## Doppler Hepático — portal, transplante e TIPS

O exame independente mostrou um formulário vascular amplo. O estado inicial presume normalidade de vários vasos. Selecionar trombose portal parcial gerou conclusão e recomendações imediatamente. No módulo TIPS, ativar sem medidas já produziu normalidade; velocidades reduzidas foram classificadas automaticamente, e apagar as medidas não retirou a interpretação até uma correção manual.

O LaudoUSG já tem um contrato mais conservador para Abdome total com Doppler no fluxo clínico v1: veia porta obrigatória, vasos opcionais e confirmação de alterações portais. O fallback legado ainda não é fail-closed para essa categoria. Também faltam o exame independente, detalhe vascular, transplante, TIPS, recomendações confirmadas e ativação simultânea nas plataformas.

O cruzamento técnico está em [crosswalk-doppler-hepatico-2026-10-02.md](crosswalk-doppler-hepatico-2026-10-02.md). A prioridade é reaproveitar o núcleo portal aprovado, acrescentar dados sem inferência e só depois ativar regras clínicas versionadas.
