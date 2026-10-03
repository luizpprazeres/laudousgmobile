# Guia do Claude Code para o estudo do Laudário

Este guia transforma o estudo do concorrente em uma rotina reproduzível. O objetivo é entender recursos, estados clínicos e efeitos no laudo para criar soluções originais no LaudoUSG. Não copie a redação do Laudário.

## Antes de começar

Leia, nesta ordem:

1. `00-metodo-e-progresso.md`;
2. `fila-e-mapa-canonico-2026-10-03.md`;
3. o caso e o crosswalk mais próximos do exame recebido;
4. este guia;
5. a skill local `laudario-product-study` quando ela estiver disponível no ambiente.

Trabalhe em um único exame por rodada e use no máximo três cenários sintéticos. Não use dados de pacientes. Não salve credenciais, cookies ou tokens. Use apenas a interface visível do navegador; não consulte endpoints privados e não automatize varreduras. Não copie, imprima, finalize ou envie o laudo. Se aparecer CAPTCHA, bloqueio, novos termos ou pedido de permissão, pare e reporte.

## Objetivo final do estudo

O estudo não termina no caso observado, no crosswalk ou na lista de lacunas. Esses artefatos são a matéria-prima de uma segunda etapa obrigatória, conduzida por um terminal Codex com GPT 6.1 Sol High: transformar a cobertura clínica acumulada em um pacote original do LaudoUSG.

Esse pacote deve conter, para cada categoria:

- modelo basal completo de exame normal;
- biblioteca estruturada de alterações, com texto para `OS SEGUINTES ASPECTOS FORAM OBSERVADOS` e texto correspondente para `CONCLUSÃO` ou `IMPRESSÃO`;
- campos, estados, dependências, medidas, unidades, lateralidade, cálculos e condições de publicação;
- roteiro e exemplos que alimentam o prompt da categoria nos aplicativos móveis;
- contrato e opções selecionáveis que alimentam o formulário Web;
- casos sintéticos normais, alterados, incompletos e contraditórios para validação.

O mesmo conceito clínico precisa ter uma única identidade no contrato compartilhado. O prompt mobile e o formulário Web são duas formas de entrada para esse contrato, não duas bibliotecas clínicas independentes. O concorrente orienta cobertura e combinações; a redação final é original, no estilo Domingos, e passa por revisão médica antes da ativação.

## Divisão de trabalho

O operador do navegador documenta o comportamento real do Laudário. O Claude Code cruza esse comportamento com o código do LaudoUSG, separa observação de inferência e prepara uma ficha de síntese sem copiar a redação do concorrente. O GPT 6.1 Sol High recebe os estudos revisados e produz o pacote clínico original destinado ao prompt mobile e ao formulário Web. Um achado observado no concorrente não vira automaticamente requisito clínico.

Quando o Claude Code também tiver acesso autorizado ao navegador, ele pode assumir a observação, mantendo o mesmo limite de um exame e três cenários. No fim, deve restaurar o modelo ao estado inicial.

## Roteiro da observação

Primeiro registre o estado inicial do exame e a organização das abas. Depois faça um cenário normal e até dois cenários alterados, mudando uma variável ou preset por vez. Em cada mudança, registre:

- controle acionado e valor introduzido;
- campos alterados automaticamente;
- texto ou conclusão que apareceu;
- cálculo, classificação ou recomendação derivada;
- contradição, falsa normalidade ou dado que permaneceu após desfazer a alteração.

Use estes rótulos de evidência:

- `observado`: apareceu diretamente na interface ou no laudo;
- `inferido`: regra provável ainda sem teste de fronteira;
- `candidato a lacuna`: parece ausente no LaudoUSG, mas falta busca completa;
- `gap confirmado`: ausência comprovada no Web, Android/RN, iOS e contrato compartilhado aplicável.

Evite guardar texto integral do concorrente. Registre estrutura, comportamento, campos, condições e apenas trechos curtos indispensáveis para provar uma transformação.

## Cruzamento obrigatório com o LaudoUSG

Não trate a presença da categoria no seletor como prova de formulário clínico. Para cada plataforma, classifique o exame como:

- `ausente`: não aparece no seletor;
- `genérico`: recebe achados em texto ou ditado e usa o writer;
- `estruturado dormente`: contrato e formulário existem, mas o gate está desligado;
- `estruturado ativo`: formulário, contrato, renderer e rota estão ativos;
- `parcial`: há um componente isolado, como mapa, cálculo ou writer específico, sem uma fonte clínica única.

Na Web, confira `writerCategories.ts`, `clinicalModels.ts`, o seletor e o workspace aberto. No Android/RN, confira `isClinicalModelCode`, os gates hepáticos e o fluxo genérico em `app/generate.tsx`. No iOS, confira `ReportCategory`, `PendingClinicalModelContracts` e `GenerateView`. Na API, confira normalização, renderer, writer, auditoria e gates. No banco, confirme apenas contratos e códigos versionados; a presença de uma linha não prova que o fluxo esteja ativo.

O crosswalk deve responder se texto, formulário, cálculo, conclusão, esquema visual e Sala usam a mesma fonte de verdade. Se forem gerados separadamente, registre o risco de divergência.

## Entregáveis por exame

Crie `cases/<slug>-AAAA-MM-DD.md` para a observação funcional e `crosswalk-<slug>-AAAA-MM-DD.md` para o cruzamento. Atualize `00-metodo-e-progresso.md`, a fila e o status somente depois de revisar os dois arquivos.

O crosswalk precisa conter estado por plataforma, lacunas confirmadas, comportamento útil do concorrente, comportamento que não deve ser reproduzido, contrato mínimo proposto e provas necessárias antes de ativar. Cite caminhos e linhas do código. Não altere código clínico durante a rodada de estudo.

Além dos arquivos de caso e crosswalk, deixe explícito o insumo para a síntese clínica: estruturas examinadas, estados selecionáveis, alterações observadas, medidas e unidades, dependências entre campos, trechos que pertencem ao corpo, trechos que pertencem à conclusão e riscos que exigem confirmação médica. Essa ficha deve ser suficiente para o terminal de síntese trabalhar sem voltar ao texto integral do concorrente.

## Regra de síntese e implementação

O estudo termina em requisito clínico original e pacote clínico revisável. A implementação começa por um contrato compartilhado e versionado, com estados explícitos para não avaliado, normal, alterado e limitado. Web, Android/RN e iOS devem consumir o mesmo contrato; renderizadores locais podem variar apenas na apresentação. Derivações clínicas precisam ser determinísticas, e classificações ou diagnósticos positivos exigem dados mínimos e confirmação médica quando previsto.

O terminal GPT 6.1 Sol High não deve ativar uma categoria diretamente. Primeiro ele gera o pacote clínico em estado dormente e uma prévia legível para aprovação médica. Depois da aprovação, a implementação liga o pacote ao prompt mobile, ao formulário Web e aos renderers. Categorias existentes passam pelo mesmo processo para receber novas opções ou corrigir frases sem criar regressões.

Ative um modelo somente depois de testar casos normais, alterados, incompletos, lateralidade, unidades, limites e serialização ponta a ponta. Um gate verde isolado não comprova paridade entre as três plataformas.
