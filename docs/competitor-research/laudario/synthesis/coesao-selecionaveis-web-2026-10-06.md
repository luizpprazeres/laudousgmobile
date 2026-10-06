# Coesão dos selecionáveis Web — revisão de 06/10/2026

Esta síntese cruza os estudos funcionais de Pélvico Transvaginal, Obstétrico 2º/3º Trimestre e Doppler de Carótidas e Vertebrais com o checkout atual. Uma segunda leitura foi executada em terminal separado com `gpt-6.1-sol`, esforço médio e acesso somente de leitura. As propostas abaixo passaram por revisão central; não são texto copiado do concorrente nem regra clínica aprovada para produção.

## Direção do produto

Cada achado deve percorrer uma única cadeia: seleção estruturada, validação, descrição, conclusão, figura e eventual recomendação. Corpo e conclusão não podem disputar a fonte do fato. Gráficos precisam consumir o mesmo resultado versionado do texto. Recomendações mantêm estados separados de sugerida, confirmada e publicada.

O reaproveitamento entre categorias deve ocorrer no contrato anatômico, nas validações e na redação, sem transferir achados entre exames. O rim nativo é o caso mais claro: Vias Urinárias, Abdome Total e Doppler Renal devem compartilhar caracterização, dimensões, parênquima, diferenciação, dilatação, cálculos e lesões por lado. O Doppler Renal acrescenta o módulo vascular, mas não redefine o rim.

O mesmo princípio vale para bexiga, útero e miométrio, endométrio, ovários e anexos, feto e biometria, placenta e colo, e vasos. A categoria escolhe quais avaliações estão disponíveis; o componente anatômico mantém nomes, unidades, estados de avaliação e achados equivalentes.

## Experiência de preenchimento

Os cards devem começar compactos, mostrar as medidas principais e abrir somente os descritores exigidos pelo achado selecionado. Normalidade rápida pode existir como ação explícita sobre um escopo identificado. Campo vazio não equivale a estrutura normal nem a estrutura avaliada.

Lesões múltiplas devem usar listas repetíveis. Na pelve, isso substitui slots fixos de miomas e permite coexistência entre alteração difusa do miométrio e lesões focais. Nos ovários, cada lado precisa aceitar mais de uma lesão e um motivo estruturado quando não for caracterizado. Em carótidas, placa, vaso, segmento e classificação precisam permanecer ligados ao mesmo achado.

No obstétrico, biometria, peso, método, curva, percentil e gráfico ficam no mesmo fluxo. A visualização pode surgir automaticamente com dados válidos; a publicação no laudo continua opt-in. Anatomia normal deve depender de confirmação por estrutura ou de uma ação explícita sobre um conjunto identificado.

## Redação alterada — candidatos para revisão médica

No cenário de adenomiose com mioma posterior, o corpo precisa preservar os dois achados. Uma redação candidata é descrever a alteração difusa confirmada e acrescentar “Nódulo miometrial na parede posterior, medindo 3,0 × 2,5 × 2,0 cm.” A conclusão pode separar “Achados sugestivos de adenomiose” e “Nódulo miometrial posterior sugestivo de leiomioma”.

Um mioma sem topografia ou descritores confirmados deve permanecer genérico no corpo e na conclusão. Relação com as camadas, ecogenicidade, margens e FIGO só entram quando selecionados ou calculados por uma regra aprovada.

Quando um ovário não é caracterizado por interposição gasosa, o corpo deve registrar lado e motivo. O outro ovário continua independente. O sistema não pode converter não visualização em cirurgia, ausência anatômica ou ausência de lesões anexiais.

Para PFE baixo, a frase precisa identificar peso, percentil, curva e versão. A conclusão de PIG, RCF ou estágio depende do protocolo aprovado e dos dados mínimos correspondentes; a falta de Doppler não pode ser ocultada por uma frase definitiva inadequada.

Em carótidas, a conclusão graduada deve continuar ligada à lesão e à confirmação médica. Velocidade isolada não atribui automaticamente uma classe.

## Prioridades revisadas

P0: corrigir fatos silenciosos e perdas de achados. Isso inclui preservar adenomiose e miomas simultaneamente; retirar descritores não confirmados; aplicar guardas equivalentes na pelve genérica, nos derivados e na API; impedir normalidade obstétrica sem avaliação; e evitar que uma conclusão livre oculte alteração estruturada sem revisão explícita.

P1: reduzir repetição e ampliar cobertura com listas de lesões, motivos de limitação, contexto hormonal único, medida única placenta–orifício interno, componentes renais compartilhados e resultado biométrico único para texto e figura.

P2: ampliar módulos especializados e critérios multiparamétricos somente depois de fonte, versão, população, dados mínimos e override médico estarem definidos.

## Testes de aceite transversais

Abrir um exame sem interação não pode publicar normalidade, medida fictícia ou placeholder. Apagar uma medida deve remover todos os derivados dependentes. Alteração difusa e lesões focais precisam coexistir no corpo. Uma estrutura limitada mantém lado e motivo sem virar diagnóstico. O mesmo achado renal deve produzir descrição equivalente nas categorias consumidoras, enquanto o módulo vascular aparece apenas quando avaliado.

Gráfico, corpo e conclusão precisam usar a mesma fórmula, curva e versão. Alterar o dado de origem invalida figura e recomendação já confirmadas quando elas deixam de corresponder ao estado atual. Salvar e reabrir deve preservar estado de avaliação, lesões, unidades, confirmações, proveniência e escolha de publicação.
