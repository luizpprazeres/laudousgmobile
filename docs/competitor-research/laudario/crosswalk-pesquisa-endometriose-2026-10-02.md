# Cruzamento Laudário × LaudoUSG — Pesquisa de Endometriose

Data: 02/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura de código e testes focados. Nenhum dado clínico real foi usado.

## Síntese

A categoria estruturada Pesquisa de Endometriose está ausente na Web, no iOS, no Android/RN e na API do LaudoUSG. Pelve feminina cobre parte do cenário ovariano, mas não equivale ao protocolo por compartimentos. Texto livre pode transportar achados, porém não oferece validação, coerência, tabela, recomendação vinculada ou cartograma específico.

| Cenário sintético | Web | iOS | Android/RN |
| --- | --- | --- | --- |
| Normal por compartimentos + avaliação dinâmica | Ausente como protocolo; Pelve cobre estruturas gerais | Ausente | Ausente |
| Endometrioma direito com medidas, volume e O-RADS | Parcial | Parcial via API/texto | Parcial via API/texto |
| Lesão intestinal completa + resumo + dinâmica | Ausente | Ausente | Ausente |
| Cartograma de endometriose | Ausente | Ausente | Ausente |
| Entrega à Sala | A Web determinística não envia hoje para a Sala | Texto final genérico | Texto final genérico |

## 1. Estado normal por compartimentos

### Comportamento observado no Laudário

O laudo normal é organizado em avaliação abdominal complementar, compartimentos anterior, central e posterior e avaliação dinâmica. O texto registra deslizamento, mobilidade e ausência de processo aderencial. Esses estados já aparecem selecionados ao abrir o modelo.

### LaudoUSG

Pelve feminina cobre bexiga, útero, endométrio, miométrio, colo, ovários, anexos e líquido livre. Não possui compartimentos anterior, posterior ou lateral, ligamentos uterossacros, tórus, septo retovaginal, fórnices, ureteres, mobilidade, dor dirigida ou sinal de deslizamento.

Na Web, o formulário determinístico expõe a pelve de rotina. No iOS e no Android/RN, a entrada é predominantemente por texto livre com atalhos de menopausa e útero miomatoso. A API não possui schema nem renderer próprio para endometriose.

**Lacuna confirmada:** faltam categoria e contrato próprios para representar os compartimentos e a avaliação dinâmica.

**Requisito proposto:** iniciar cada estrutura como não avaliada e impedir que a simples abertura do modelo declare normalidade de compartimentos ainda não confirmados.

## 2. Endometrioma ovariano

### Cobertura atual

O contrato de Pelve feminina aceita lado, tipo endometrioma, três medidas, descrição, vascularização e O-RADS informado pelo médico. O renderer descreve o aspecto e produz conclusão por ovário. O-RADS só entra quando confirmado; a API e os prompts proíbem inferi-lo silenciosamente.

Na Web, o formulário oferece esses campos e há uma calculadora O-RADS separada. No iOS e no Android/RN, o achado depende de texto livre e da estruturação pela API.

### Lacunas

O volume calculado atualmente é o do ovário, não o da lesão focal. As três medidas do endometrioma são preservadas, mas não produzem volume próprio. A calculadora O-RADS Web não está conectada ao campo confirmado do achado nem à inclusão no laudo. Recomendações são genéricas e manuais; não existe sugestão específica de endometrioma com decisão de publicação independente.

**Lacuna confirmada:** faltam cálculo do volume focal a partir das três medidas já preservadas, conexão explícita entre O-RADS sugerido e confirmado e recomendação específica com decisão independente de publicação.

**Requisito proposto:** reaproveitar o módulo ovariano atual, sem duplicar as medidas, e manter classificação e recomendação como decisões médicas separadas. A associação observada no concorrente entre endometrioma e “endometriose profunda” precisa de revisão clínica e não deve ser copiada como regra.

## 3. Lesão intestinal e coerência dinâmica

O LaudoUSG não possui campos estruturados para segmento intestinal, aspecto, camada acometida, três medidas, distância da borda anal, percentual da circunferência, percentual de estenose, aderências, tabela-resumo ou múltiplas lesões. Também não há sinal de deslizamento pélvico nem avaliação aderencial no contrato de Pelve.

No Laudário, os módulos anatômico e dinâmico são independentes. Foi possível registrar sigmoide aderido ao fundo uterino enquanto o texto ainda afirmava ausência de processo aderencial; a contradição desapareceu apenas após ajuste manual do segundo campo.

**Lacuna confirmada:** faltam campos estruturados para a lesão intestinal e para relacionar anatomia, mobilidade e aderências.

**Requisito proposto:** combinações incompatíveis devem bloquear a conclusão normal ou gerar pendência objetiva. O resumo intestinal deve derivar da mesma fonte estruturada usada pelas frases para não divergir.

## 4. Cartograma

O cartograma observado no Laudário é manual, com vistas frontal e sagital e ferramentas para endometriose profunda, endometrioma, aderências, folículos, adenomiose e desenho livre. A inclusão no laudo é opcional e os achados estruturados não o preencheram automaticamente.

O LaudoUSG possui esquemas de miomas e vasculares, mas não possui cartograma de endometriose no contrato compartilhado, na Web, no iOS, no Android ou na Sala.

**Lacuna confirmada:** não existe cartograma de endometriose nem contrato compartilhado correspondente.

**Requisito proposto:** o cartograma deve registrar sua proveniência. Marcação manual permanece anotação visual; sincronização automática só ocorre quando localização e tipo estiverem confirmados no achado estruturado.

## 5. Recomendações, persistência e Sala

A recomendação deve ser sugerida separadamente e entrar no laudo somente após confirmação médica. O concorrente já separa sugestão, seleção e inclusão do bloco, embora a adequação de cada sugestão ainda dependa de revisão clínica.

Os apps móveis já conseguem enviar o texto final e o estado de revisão à Sala. A Sala não recebe inputs estruturados, tabela intestinal ou cartograma de endometriose. A Web determinística salva em `web_reports`, enquanto a Sala consulta `reports`; portanto o fluxo Web → Sala não existe na arquitetura atual. Isso é uma separação atual do produto, não evidência de falha no transporte móvel.

## 6. Testes e limites da evidência

Passaram as suítes existentes de Pelve feminina usadas pelos clientes móveis e pela API: matriz objetiva, casos dourados, preservação de O-RADS confirmado, prompt clínico e catálogo mobile. Na Web, a matriz clínica de Pelve passou; o gate ponta a ponta continuou vermelho por um campo `ecotextura` já identificado como órfão no adaptador. Esse erro é anterior ao estudo e não envolve endometriose.

Nenhum teste atual cobre protocolo por compartimentos, avaliação dinâmica, lesão intestinal, coerência entre aderência e deslizamento, recomendações específicas ou cartograma de endometriose.

## Próxima implementação proposta

Criar um contrato compartilhado de Pesquisa de Endometriose antes das interfaces. O primeiro recorte deve incluir estado de avaliação por compartimento, ovários e endometriomas, reto-sigmoide, avaliação dinâmica, coerência e conclusão. Em seguida entram recomendação opt-in, resumo tabular, cartograma e transporte estruturado. A liberação deve ocorrer em paridade entre Web, iOS e Android após casos normais, alterados e contraditórios sintéticos.

## Evidências principais no LaudoUSG

- Web: `apps/web/src/lib/deterministic/organs/pelveFeminina.ts`, `apps/web/src/lib/catalog/pelveParaCatalogo.ts`, `apps/web/src/lib/calculators/oRads.ts` e `apps/web/src/components/laudar/RecommendationsPanel.tsx`.
- API: `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts` e `apps/api/src/server/prompts/contracts/PELVE_FEMININA.ts`.
- Android/RN: `apps/mobile/app/generate.tsx`, `apps/mobile/src/ui/tokens.ts` e `apps/mobile/src/features/generate/categories.manual.ts`.
- iOS: `LaudoUSG/Models/Category.swift`, `LaudoUSG/Views/GenerateView.swift` e `LaudoUSG/ViewModels/GenerateViewModel.swift` no repositório Swift.
- Sala: `apps/api/src/server/sala/reportContract.ts`, `apps/api/src/app/api/sala/latest/route.ts` e `apps/api/src/app/sala/[token]/page.tsx`.
