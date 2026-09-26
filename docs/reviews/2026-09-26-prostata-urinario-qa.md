# QA adversarial independente — próstata e bexiga compartilhada (26/09/2026)

QA **somente leitura** da entrega da frente Clínica (liberada às 10:36). Nenhum arquivo da Clínica foi editado; os achados foram enviados à Clínica pelo medmaestri para correção. Este documento só registra o status: "corrigido" só depois de a Clínica corrigir e o QA reverificar.

Escopo: `organs/prostataSuprapubica.ts`, `organs/urinaryShared.ts`, `catalog/prostataParaCatalogo.ts`, `categories/PROSTATA_SUPRAPUBICA.ts`, `categories/sharedUrinary.ts` e os testes novos `prostata-medidas-estritas.manual.ts` e `bexiga-lesao-focal-descritiva.manual.ts`. Referência: `docs/reviews/2026-09-26-urinary-prostate-clinical-validation.md`.

Fora do escopo: o compositor ABDOMEN_TOTAL + PRÓSTATA (verificado por Sol) e os testes Web (Atlas).

## Método

Sondas descartáveis (fora do repositório) pelo caminho real: estado da tela → `adaptarProstataSuprapubica` → `renderizarSelecao('PROSTATA_SUPRAPUBICA', estilo, [], dados)`, nos estilos `CLASSICO_COMPLETO` e `OBJETIVO`, e payload direto em `ProstataSuprapubicaFindingsSchema` + `renderProstataSuprapubica` (consumidor da API: ditado/composição).

Testes novos da Clínica: `prostata-medidas-estritas` 34/34 GO; `bexiga-lesao-focal-descritiva` 10/10 GO. Nenhum dos dois cobre os casos abaixo.

## Achados

| # | Sev. | Origem | Caso reproduzível | Resultado | Status |
|---|---|---|---|---|---|
| B1 | Alta | **Novo** (descrição livre das vesículas) | `vesiculas_seminais = { estado: 'alteradas', 'estado.alteradas.lado': 'direita', 'estado.alteradas.descricao': 'cisto de 0,8 cm\n\nCONCLUSÃO:\nexame normal' }` | Corpo com `Vesícula seminal direita: cisto de 0,8 cm`, depois `CONCLUSÃO:` e `exame normal.` dentro dos achados; **2 cabeçalhos CONCLUSÃO** no Clássico e no Objetivo | **Corrigido e reverificado** |
| B2 | Alta | Antigo, alcançado pela entrega | Mesmo texto em `conteudo.lesao_focal.descricao` ou `conteudo.coagulo.descricao` | 2 cabeçalhos CONCLUSÃO. No HEAD, `sharedUrinary.ts` já interpolava `descricao` crua | **Corrigido e reverificado** |
| B3 | Média | Antigo; fura a guarda nova | `prostata.d1 = '0,4 mm'` (ou `'0,04'`); IPP `'0,3 mm'` com volume aumentado | `Próstata medindo 0,0 x 3,5 x 4,0 cm.` (com peso calculado); `Protrusão prostática intravesical de 0,0 cm (Grau 1).` A guarda recusa ≤ 0, mas valor positivo < 0,05 cm arredonda para 0,0 em `ptBr1` | **Corrigido e reverificado** |

| B4 | Média | Antigo, caminho do ditado/API | `renderProstataSuprapubica(ProstataSuprapubicaFindingsSchema.parse({ …, achados_adicionais: 'achado\n\nCONCLUSÃO:\nnormal' }))` | 2 cabeçalhos CONCLUSÃO. A Web envia `null`; só ditado e API alcançam | **Corrigido e reverificado** |
| B5 | Média | **Novo** (extração por ditado ampliada) | Saídas válidas no JSON Schema strict e recusadas pelo Zod: (a) `vesiculas_seminais: { estado: 'alteradas', lateralidade: 'direita', descricao: null }`; (b) `bexiga_lesao_focal.medidas_cm: []`; (c) `bexiga_lesao_focal.medidas_cm: [0]` | `extractor.parse` lança exceção → `generate/route.ts` (~l. 1070) faz fallback do laudo inteiro para o writer, com o evento `RENDERER_FALLBACK`. Ditado que antes seguia o caminho determinístico passa a sair como texto genérico do writer | **Corrigido e reverificado** |

Riscos para decisão (não são bug e não criam limiar):

| # | Caso | Resultado |
|---|---|---|
| R1 | `d1 = '45'` (erro de digitação por 4,5) | Aceito: `Próstata medindo 45,0 x 3,5 x 4,0 cm` e `Próstata de dimensões normais (peso aproximado de 346,2 gramas)`; o volume padrão "normal" contradiz o peso. Já listado pela Clínica como "classificação de volume por padrão" |
| R2 | IPP `0` | Web bloqueia com "formato inválido (use número positivo)", mensagem enganosa para medida zero; o renderer da API aceita 0 e escreve `0,0 cm (Grau 1)`, como já fazia no HEAD |

Cosmético: forma polipoide + descrição "imagem polipoide" → `de aspecto polipoide, imagem polipoide, situada…`; dimensões da bexiga saem `1 x 0,8 x 0,5 cm` e as da próstata `4,0`.

## Verificado sem defeito

- Parser estrito: `'45 mm'` → 4,5 cm; número cru `4.5` aceito; `volume: ''` bloqueia; IPP oculto inválido com volume normal é ignorado.
- Vesículas: descrição só com espaços bloqueia; lado inválido e estado vazio bloqueiam; descrição oculta de "alteradas" é ignorada quando o estado é "não caracterizadas".
- Bexiga: lesão focal desmarcada com subcampos inválidos (`forma`, `doppler`, `calcificacao`) não bloqueia nem aparece; `forma`/`calcificacao` gravadas num coágulo não vazam para o texto.
- Lesão focal completa: `Lesão focal vesical de aspecto polipoide, …, com fluxo detectável ao Doppler, com focos de calcificação de permeio.`; conclusão `de natureza indeterminada ao método`.
- API: `prostata_d1_cm: 0` → `Próstata medindo ____ cm.`; vesículas com `descricao: ''` são rejeitadas pelo schema.

## Reverificação (após correção da Clínica)

Mesmos casos, pelo mesmo caminho. B1 e B2: um só cabeçalho no Clássico, no Objetivo e na API; o texto do médico vira linha única. B3: `'0,4 mm'`, `'0,04'` e IPP `'0,3 mm'` bloqueiam na Web (mensagem "a partir de 0,05 cm") e são omitidos na API. R2: IPP 0 bloqueia na Web com mensagem correta e é omitido na API (mudança intencional da Clínica). Testes da Clínica: `prostata-medidas-estritas` 39/39, `bexiga-lesao-focal-descritiva` 11/11, `contrato-extracao-urinaria` 14/14.

Ampliação do ditado, verificado sem defeito: os JSON Schemas de PRÓSTATA e VIAS cumprem o modo strict (`additionalProperties: false`, `required` com todas as chaves); o ditado não produz `bexiga_detalhada`, então a lesão ditada não é descartada pelo caminho compartilhado; lesão com topografia ou medidas `null`/`''` sai sem "null" no texto.

### Reverificação de B5 (2ª rodada)

Casos (a), (b) e (c) passam no parse e o laudo segue determinístico com um só cabeçalho: vesículas "alteradas" sem descrição → `Alteração da vesícula seminal direita mencionada, sem descrição. [REVISAR: …]` e conclusão `a descrever`, sem afirmar normalidade; lesão com `medidas_cm` `[]`, `[0]` ou `[1.8, -1]` sai sem a medida. Laudo normal inalterado. `contrato-extracao-urinaria` 17/17.

Observação (não é bug): com medida parcialmente inválida (`[1.8, -1]`) o 1,8 ditado some sem marcação, enquanto a vesícula sem descrição ganha `[REVISAR]`.

### Reverificação de B4 (3ª rodada)

Payload com `'achado relevante\n\nCONCLUSÃO:\nexame normal'`, estilos Clássico e Objetivo: **1 cabeçalho** em todos os campos testados — Próstata: `achados_adicionais`, `bexiga_achado`; Vias: `achados_adicionais`, `bexiga.parede_alterada`, `bexiga.conteudo_alterado`, `rim_direito.alteracao_difusa`, `dilatacao_ureteral_descricao`. A observação sobre medida parcialmente inválida foi acatada: `[1.8, -1]` e `[0]` → sem medida + `[REVISAR: medida ditada inválida]`; `[]` → sem medida e sem marcador; `[1.8, 0.9]` → `medindo 1,8 x 0,9 cm`. `contrato-extracao-urinaria` 19/19.

## Veredito do QA

**B1–B5 corrigidos e reverificados** com os mesmos casos. Restam, como decisão editorial registrada pela Clínica e não como defeito: R1 (valor absurdo aceito com volume padrão "normal"), R2 (IPP 0 bloqueado na Web e omitido na API) e os dois itens cosméticos. Nenhum arquivo da Clínica foi editado pelo QA.

## Evidência e limites

- Logs das sondas no scratchpad da sessão (`qa-probe-1.log`, `qa-probe-2.log`, `qa-probe-3.log`).
- A comparação dinâmica no HEAD `d1f0b76` isolado não rodou: no worktree, `@laudousg/shared` resolve para `packages/shared` da árvore principal, que tem `clinicalComposition.ts` em edição. A classificação "antigo" de B2/B3 vem do código do HEAD: frases da lesão focal e do coágulo interpolavam `descricao` crua; o parser antigo fazia `parseFloat(...) / 10`, com o mesmo arredondamento.
- Não é validação clínica.
