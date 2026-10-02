# Cruzamento Laudário × LaudoUSG — Avaliação Multiparamétrica Hepática

Data: 02/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura de código e testes focados. Nenhum dado clínico real foi usado.

## Síntese

O LaudoUSG já possui na Web um bloco complementar de elastografia e quantificação de gordura dentro de Abdome total e Abdome superior. Ele preserva método, unidade, mediana, IQR, qualidade e alguns dados técnicos e, de forma prudente, não converte unidades nem classifica fibrose ou esteatose automaticamente.

A cobertura ainda não forma uma avaliação multiparamétrica completa. Não existem categorias próprias para Avaliação Multiparamétrica Hepática ou Elastografia Hepática, contrato compartilhado, correlação estruturada entre modo B e quantificação, contexto etiológico, gates de qualidade por método, paridade iOS/Android nem entrega do resultado Web à Sala do Auxiliar.

| Cenário sintético | Web | iOS | Android/RN |
| --- | --- | --- | --- |
| Abdome e Doppler normais, sem quantificação | Abdome normal; módulo quantitativo opcional | Abdome total com Doppler implementado, ainda pendente de ativação clínica; sem quantificação | Abdome total com Doppler implementado, com ativação dependente dos gates da API; sem quantificação |
| Gordura quantitativa com método e qualidade | CAP, atenuação ou fração; parcial | Texto ou voz livre | Texto ou voz livre |
| Rigidez com mediana e IQR | 2D-SWE, pSWE/ARFI ou transitória; parcial | Texto ou voz livre | Texto ou voz livre |
| Categoria própria multiparamétrica | Ausente | Ausente | Ausente |
| Entrega Web para a Sala | Ausente | Não se aplica ao fluxo Web | Não se aplica ao fluxo Web |

## 1. Categoria e composição do exame

O concorrente oferece um exame próprio que reúne abdome superior, Doppler hepático, gordura e elastografia. No LaudoUSG, o painel quantitativo aparece como complemento de Abdome total e Abdome superior. O catálogo Web, o banco, o registro da API e os seletores móveis não contêm as duas categorias hepáticas próprias.

**Lacuna confirmada:** o médico não consegue iniciar Avaliação Multiparamétrica Hepática ou Elastografia Hepática como exames independentes. Nos apps, a alternativa é ditar em Abdome ou Laudo livre; na Web, é anexar o painel a um exame abdominal.

**Requisito proposto:** criar um contrato hepático compartilhado e reutilizável. O mesmo módulo deve compor Abdome total e Abdome superior e sustentar as categorias próprias, sem duplicar regras ou frases.

## 2. Estado inicial e confirmação do que foi realizado

No Laudário, fabricante, tecnologia, número de medidas e local de aquisição aparecem no laudo mesmo sem valores. No LaudoUSG Web, o módulo vem desligado e exige ativação, comportamento mais conservador. A Web já representa módulo desligado, qualidade limitada e exame não realizável. Faltam confirmação explícita de realização, motivo estruturado da limitação e uma máquina de estados versionada que preserve essas transições até a Sala.

**Requisito proposto:** técnica e normalidade quantitativa só podem ser publicadas após confirmação. O contrato deve distinguir `não realizado`, `realizado`, `parcialmente limitado` e `não realizável`, conservando o motivo quando houver limitação.

## 3. Quantificação de gordura

A Web aceita CAP em dB/m, coeficiente de atenuação em dB/cm/MHz e fração gordurosa em porcentagem. Para fração, exige tecnologia e equipamento. O construtor rejeita valores incompatíveis e não transforma tecnologias diferentes em uma porcentagem universal.

Faltam fabricante e modelo estruturados, número mínimo de aquisições, lobo, profundidade, ROI, qualidade por tecnologia, concordância com modo B, fatores de confusão e referência versionada. Tecnologia, equipamento e jejum existem como texto livre, sem estado ou validação específica por método.

**Cobertura parcial:** a medida pode ser documentada com segurança básica, mas ainda não sustenta uma classificação quantitativa completa nem uma conclusão integrada à esteatose qualitativa.

**Requisito proposto:** cada tecnologia deve possuir unidade, campos de qualidade e critério próprios. A classificação, quando suportada, deve depender desses gates e continuar como sugestão até confirmação médica. O sistema não deve reproduzir a classificação do concorrente antes do preenchimento da qualidade.

## 4. Rigidez hepática

A Web suporta 2D-SWE, pSWE/ARFI e elastografia transitória, kPa ou m/s, número de medidas, mediana, IQR, IQR/mediana, qualidade e jejum. Elastografia transitória em m/s é rejeitada. O laudo permanece descritivo e aceita interpretação livre do médico.

Essa ausência de inferência universal é adequada. A relação entre rigidez, etiologia, inflamação, colestase, congestão e hipertensão portal não pode ser reduzida a uma tabela única. Faltam valores individuais, ROI, lobo, profundidade, posição, equipamento estruturado, indicação, etiologia e fatores de confusão.

**Requisito de segurança:** conservar a unidade de origem; não converter kPa e m/s automaticamente por regra genérica; associar toda derivação à medida fonte; apagar ou recalcular dependências atomicamente. O defeito observado no concorrente, em que m/s residual manteve uma conclusão após apagar kPa, precisa ser coberto por teste obrigatório.

## 5. Correlação multiparamétrica

O modo B hepático da Web já possui normalidade, graus qualitativos de esteatose e hepatopatia crônica. O bloco quantitativo é anexado depois e não compartilha estado clínico com o órgão fígado. Assim, uma discordância entre ecogenicidade, gordura quantitativa e rigidez não gera pendência, contexto ou conclusão coordenada.

**Lacuna confirmada:** não existe uma fonte de verdade que reúna modo B, Doppler, gordura, rigidez, qualidade e interpretação.

**Requisito proposto:** manter cada aquisição independente, mas compor a conclusão a partir de um contrato comum. Discordâncias devem permanecer visíveis ao médico. Nenhuma modalidade deve sobrescrever outra silenciosamente.

## 6. Validação e persistência

Na Web, o estado completo e o texto são gravados em `web_reports`, incluindo o bloco `__liver_quantification`. A estrutura clínica é `unknown` na fronteira de persistência e não recebe nova validação no API. Se gordura e elastografia estiverem ativas e uma delas for inválida, o construtor retorna erro global e não produz o bloco válido da outra.

**Lacuna confirmada:** não há schema versionado nem validação de servidor para o contrato hepático. Um erro de um submódulo impede o outro, sem separar pendências.

**Requisito proposto:** validar no cliente e no servidor, versionar o contrato e retornar erros por submódulo. A prévia pode mostrar a parte válida, mas o estado revisado deve indicar claramente a pendência restante.

## 7. iOS e Android

Os dois apps não têm as categorias, formulário, calculadora ou contrato estruturado para gordura e rigidez. Ambos enviam texto bruto e indicação de categoria à API. Método, fabricante, unidade, qualidade e interpretação dependem do ditado e da IA.

**Lacuna confirmada:** os apps não possuem paridade com o módulo Web em nenhum dos dois cenários quantitativos.

**Requisito proposto:** implementar o mesmo contrato compartilhado com uma interface móvel compacta. Ditado pode preencher campos sugeridos, mas o médico precisa confirmar método, unidade, medida, qualidade e interpretação antes de liberar o laudo.

## 8. Sala do Auxiliar

O Web salva em `web_reports`, enquanto a Sala lê e reenvia laudos da tabela `reports`. Portanto um laudo hepático construído na Web não chega à Sala pelo fluxo atual. Nos apps, laudos textuais podem chegar, mas sem um contrato hepático preservado. O Android transmite o rascunho pendente após a geração e possui uma ação posterior de revisão; a Sala só marca como revisado quando a revisão médica corresponde à mesma versão do conteúdo. O iOS usa outro caminho de envio.

**Lacuna confirmada:** não há travessia Web → Sala e o estado de revisão móvel não é uniforme.

**Requisito proposto:** consolidar o transporte por `reportId`, preservar a versão do contrato e só exibir “pronto para copiar” após revisão médica. Web, iOS e Android devem entregar o mesmo estado final.

## 9. Testes e limites da evidência

O teste do bloco Web passou com 21 cenários. Também passaram os testes focados do renderer abdominal para hepatopatia crônica, a seleção de categorias Android e a seleção de categorias iOS. Não existem testes móveis de gordura ou rigidez porque os recursos ainda não existem.

Não foram verificados equipamentos físicos, configuração de produção, limiares clínicos aprovados nem fluxo ponta a ponta Web/app → Sala para esse exame. A elastografia esplênica foi sondada funcionalmente no exame independente; a tabela evolutiva foi apenas inventariada, sem cenário longitudinal. Os intervalos vistos no concorrente são evidência de comportamento do produto, não decisão clínica para implementação.

## Ordem de implementação proposta

Primeiro, definir o contrato compartilhado e versionado com método, equipamento, unidade, aquisições, qualidade, fatores, fonte e interpretação confirmada. Depois, adaptar o módulo Web existente e validar no servidor, corrigindo também o envio Web para a Sala. Em seguida, criar as categorias próprias e levar a mesma interface para iOS e Android. A ativação deve ocorrer em paridade e cobrir estado normal, gordura com qualidade adequada e inadequada, rigidez aumentada com e sem qualidade, medida apagada com derivação residual, discordância entre modalidades e envio revisado à Sala. A elastografia esplênica já teve o fluxo funcional sondado, mas ainda depende de contrato e aprovação clínica; a comparação longitudinal continua sem cenário funcional e também sem decisão clínica aprovada.

## Evidências principais no LaudoUSG

- Web: `apps/web/src/components/laudar/LiverQuantificationPanel.tsx`, `apps/web/src/lib/deterministic/liverQuantification.ts`, `apps/web/src/components/laudar/LaudarWebExperience.tsx`, `apps/web/src/lib/deterministic/organs/figado.ts` e `apps/web/src/lib/webReports.ts`.
- API e Sala: `apps/api/src/server/renderer/extraction.ts`, `apps/api/src/app/api/sala/latest/route.ts` e `apps/api/src/app/api/sala/push/route.ts`.
- Banco: `packages/db/src/seeds/data.ts`.
- Android/RN: `apps/mobile/src/ui/tokens.ts`, `apps/mobile/app/generate.tsx` e `apps/mobile/src/features/generate/CalculatorsSheet.tsx`.
- iOS: `LaudoUSG/LaudoUSG/Models/Category.swift`, `LaudoUSG/LaudoUSG/Components/Sheets/CategorySheet.swift`, `LaudoUSG/LaudoUSG/Features/Generate/GenerateViewModel.swift` e `LaudoUSG/LaudoUSG/Components/Sheets/PlusSheet.swift` no repositório Swift.
