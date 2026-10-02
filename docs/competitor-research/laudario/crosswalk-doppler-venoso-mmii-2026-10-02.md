# Cruzamento Laudário × LaudoUSG — Doppler Venoso de Membro Inferior

Data: 02/10/2026. O Laudário foi observado com achados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura de código, provas focadas e testes existentes. Nenhum dado clínico real foi usado.

## Síntese

O Doppler Venoso de MMII já está presente na Web, no iOS, no Android/RN e na API. O LaudoUSG também possui um contrato vascular por segmento e suporte implementado a cartograma em quatro vistas quando o evento `venous-4view-1` é emitido. A ativação em produção não foi verificada. A cobertura permanece parcial: a entrada clínica é baseada em texto, o writer e o mapa são produzidos por contratos diferentes, a variante com medidas não segue todo o caminho da categoria base e faltam gates estruturais para TVP.

| Cenário sintético | Web | iOS | Android/RN |
| --- | --- | --- | --- |
| Normal unilateral completo | Parcial por texto | Parcial por texto | Parcial por texto |
| Refluxo JSF/VSM com tempo, extensão e cartograma | Parcial | Parcial | Parcial |
| TVP aguda oclusiva proximal com critérios completos | Parcial e sem gate clínico completo | Parcial e sem gate clínico completo | Parcial e sem gate clínico completo |
| Recomendações com publicação separada | Ausente | Ausente | Ausente |
| Esquema venoso em quatro vistas | Implementado para `venous-4view-1`; ativação não verificada | Implementado para `venous-4view-1`; ativação não verificada | Implementado para `venous-4view-1`; ativação não verificada |

## 1. Categoria, escopo e entrada

A categoria base `DOPPLER_VENOSO_MMII` e a variante `DOPPLER_VENOSO_MMII_MEDIDAS` aparecem nos três clientes. A interface do Laudário estudada nesta rodada é o exame completo e também permite retirar explicitamente o sistema profundo; o catálogo mantém outro modelo específico para TVP.

No LaudoUSG, Web, iOS e Android/RN usam entrada genérica por texto ou ditado. Não há formulário estruturado que reúna protocolo, lateralidade, JSF, safenas, perfurantes, material intraluminal, compressibilidade, fluxo, extensão e idade da trombose.

O writer da categoria base diferencia protocolo completo de protocolo restrito a TVP e impede afirmar normalidade superficial no exame restrito. A variante com medidas, porém, não entra na condição exata do writer nem na emissão atual do esquema, apesar de ser apresentada ao usuário como opção própria.

**Lacuna confirmada:** falta um contrato único de escopo e achados, consumido pela categoria base e pela variante com medidas, com interfaces adaptadas a cada cliente.

**Requisito proposto:** protocolo completo e protocolo TVP devem ser escolhas explícitas ou inferências confirmáveis, nunca apenas uma consequência silenciosa do texto. Estrutura não avaliada permanece não avaliada.

## 2. Estado normal unilateral

O writer possui exemplos para exame profundo restrito e para avaliação completa. Preserva lateralidade e restringe o laudo TVP-only ao sistema profundo. Isso é superior a declarar safenas e perfurantes normais por omissão.

O contrato do cartograma registra apenas segmentos alterados; ausência de alteração é representada como normalidade por construção. Portanto ele não comprova que JSF, VSM, VSP ou perfurantes foram avaliadas individualmente. Também não há confirmação estruturada desses estados nos clientes.

**Lacuna confirmada:** o texto normal existe, mas o estado de avaliação das estruturas não é persistido no mesmo contrato usado pelo laudo e pelo mapa.

**Requisito proposto:** separar `não avaliado`, `avaliado normal` e `alterado` por sistema e por estrutura antes de construir frases ou desenho.

## 3. Refluxo da JSF e safena magna

O contrato visual contém JSF, safena magna, tempo de refluxo e calibre. O mapa consegue representar os dois segmentos, e os renderizadores Web e mobile implementam quatro vistas para o evento `venous-4view-1`. A base clínica do projeto registra limiares diferentes para veias profundas, superficiais e perfurantes.

Ainda assim, VSM é um único segmento no contrato atual, sem divisão proximal, média e distal. A extensão “todo o trajeto” fica dependente do texto livre. O auditor do writer não verifica o limiar temporal, a coerência entre a frase e o mapa nem a relação entre refluxo e extensão.

**Lacuna confirmada:** faltam segmentação longitudinal das safenas, validação determinística do limiar e uma fonte de verdade comum para texto, conclusão e mapa.

**Requisito proposto:** modelar cada trecho relevante da safena e gerar texto e cartograma do mesmo achado confirmado. Valor abaixo do limiar pode ser descrito, mas não deve receber automaticamente a classe patológica.

## 4. TVP e segurança clínica

O projeto documenta TVP por incompressibilidade, material trombótico e ausência de fluxo ou fasicidade. O contrato que alimenta o mapa, porém, não possui campos para material intraluminal ou ausência de fluxo. Ele aceita `tvp_presente: true` sem segmento trombosado e transforma uma trombose sem extensão informada em estado visual oclusivo.

O schema mínimo registrado para a categoria guarda apenas lateralidade, protocolo, booleanos de TVP e refluxo e observações, mas não é consumido pelo writer ativo, que recebe o ditado bruto. O auditor ativo verifica placeholder, lateralidade e afirmação indevida do sistema superficial no protocolo TVP-only. Ele não exige critérios diagnósticos nem bloqueia idade ou oclusão sem sustentação.

As provas focadas confirmaram que uma conclusão de TVP com dados incompletos pode passar no auditor como válida. A sanity geral também não possui regra específica para Doppler venoso.

**Lacuna clínica confirmada:** o fluxo atual não impede conclusão positiva, fase aguda ou representação oclusiva sem critérios estruturados suficientes.

**Requisito proposto:** separar suspeita, segmento, material, compressibilidade, fluxo, extensão, sinais de agudização e confirmação médica. A conclusão positiva exige o conjunto mínimo definido; fase e extensão permanecem indeterminadas quando não sustentadas. O mapa não pode acrescentar “oclusiva” por ausência de informação.

## 5. Cartograma e Sala

O backend extrai separadamente um objeto estruturado para o mapa após a geração do texto e o envia em evento próprio. Duas flags independentes controlam o formato anterior e o formato de quatro vistas. A Web aceita o evento `venous-4view-1`; Android/RN e iOS também mantêm compatibilidade com o formato anterior. iOS e Android/RN vinculam o esquema ao `reportId` e permitem envio à Sala. A Sala exibe o arquivo, mas o recebe como imagem ou PDF sem validar os critérios clínicos que o originaram.

A emissão do esquema depende de configuração e ocorre depois do evento de laudo concluído. Uma falha nesse caminho pode deixar texto sem mapa. Na Web, o envio atual do painel visual não mantém a mesma associação por relatório usada pelos clientes móveis, preservando um fluxo legado global.

**Lacuna confirmada:** texto e mapa são extraídos separadamente e podem divergir; a vinculação Web–Sala ainda não tem a mesma granularidade do fluxo móvel.

**Requisito proposto:** produzir o mapa do contrato clínico confirmado, vincular todo esquema ao laudo e guardar versão do asset, versão do contrato e decisão de envio.

## 6. Recomendações

O Laudário sugeriu correlação clínica e avaliação angiológica/flebológica para refluxo e manteve a inclusão no texto como decisão separada. No cenário sintético de TVP, não apresentou sugestão automática.

O LaudoUSG não possui estado separado de recomendação nesse fluxo. Uma recomendação só pode aparecer dentro do texto gerado.

**Lacuna confirmada:** faltam sugestão, confirmação e publicação independentes de recomendações vasculares.

## 7. Testes e limites da evidência

Passaram os testes focados do writer, typecheck do pacote de esquemas, projeção do evento `venous-4view-1` na Web e no Android/RN, raster e anotações em quatro vistas e seleção de categoria no iOS. Eles comprovam partes do transporte e do desenho, mas não cobrem ativação em produção, critérios completos de TVP, divergência texto–mapa, limiares de refluxo, variante com medidas ou fluxo completo até a Sala.

A configuração de produção dos gates não foi verificada nesta rodada. A presença do código e dos testes não comprova que o esquema esteja ativo para todos os usuários.

## Próxima implementação proposta

Unificar primeiro writer e cartograma em um contrato vascular compartilhado com escopo, estados avaliados, segmentos de safena, critérios de TVP e confirmação médica. Em seguida, conectar o contrato aos três clientes, à variante com medidas e à Sala. Recomendações ficam em estado separado. A ativação deve ocorrer com casos normal, refluxo segmentar, trombose parcial, oclusiva, recanalizada e entradas incompletas.

## Evidências principais no LaudoUSG

- API e writer: `apps/api/src/server/renderer/categories/DOPPLER_VENOSO_MMII.ts`, `apps/api/src/server/pipeline/dopplerVenosoMmiiWriterAudit.ts` e `apps/api/src/server/renderer/categories/dopplerVenosoMmiiFewshots.ts`.
- Contrato e mapa: `packages/schemes/src/vascular/findings.ts` e `packages/schemes/src/vascular/venousMap.ts`.
- Web: `apps/web/src/components/laudar/WriterCategoryWorkspace.tsx`, `apps/web/src/lib/writerVenousMap.ts` e `apps/web/src/components/visualSchemas/VenousSchema.tsx`.
- Android/RN: `apps/mobile/app/generate.tsx`, `apps/mobile/src/features/generate/venousSchemeEvent.ts` e `apps/mobile/src/features/generate/VenousSchemeView.tsx`.
- iOS: `LaudoUSG/LaudoUSG/Models/Category.swift`, `LaudoUSG/LaudoUSG/Features/Generate/GenerateViewModel.swift`, `LaudoUSG/LaudoUSG/Components/Sheets/VenousSchemaSheet.swift` e `LaudoUSG/LaudoUSG/Services/SalaSchemaUploader.swift` no repositório Swift.
- Sala: `apps/api/src/app/api/sala/push-schema/route.ts` e `apps/api/src/app/sala/[token]/page.tsx`.
