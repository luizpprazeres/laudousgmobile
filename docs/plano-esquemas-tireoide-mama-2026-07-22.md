# Plano de implementação — esquemas visuais de tireoide e mama no iOS

Data: 22/07/2026  
Ordem obrigatória: TIREOIDE primeiro, MAMA depois  
Checkout de execução: `/Users/luizprazeres/laudousg-swift/LaudoUSG`  
Branch-base: `feat/venous-4view-recolor`, com `9215e80` no HEAD no momento deste plano  
Status: plano apenas. Não iniciar código antes do gate visual descrito na Fase 0.

## 1. Decisões já fechadas

A v1 será um editor manual local, no padrão do editor de miomas. O médico adiciona, edita, remove e posiciona os achados; o que aparece no esquema é sempre confirmável e corrigível por ele.

Não haverá nesta frente extractor novo no backend, schema clínico novo, evento SSE novo nem flag de geração automática para MAMARIA/TIREOIDE. Os parsers locais que já existem podem continuar como ajuda explícita de importação, mas não devem preencher o esquema silenciosamente ao abrir.

A arte `tmp-review/tireoide-base.png` é imutável. Ela entra no app como asset, sem redesenho, recoloração, crop ou alteração de traços. Marcadores, regiões de toque e rótulos ficam em uma camada SwiftUI separada.

A arte `tmp-review/mama-base.png` deve entrar em preto e branco. Já existe `tmp-review/mama-base-bw.png`, que será tratada como candidata: comparar com a original e validar com Luiz antes de incorporá-la. O contorno rosa deve virar cinza/preto; o fundo permanece branco e os anéis continuam discretos.

O botão full-width `Esquema visual`, criado em `9215e80`, será a entrada principal após a geração do laudo. Ele será estendido para `.tireoide` e `.mamaria`.

O envio para a Sala reutilizará `SalaSchemaUploader` e o padrão de `MyomaSchemaExporter`. PNG é a visualização; PDF paisagem é o arquivo para impressão/download. O `reportId` real deve ser enviado para manter substituição e isolamento por laudo.

## 2. Estado real do checkout Swift

Esta frente não começa do zero. Já existem duas implementações anteriores, hoje incompletas em relação ao pedido atual:

- `da4f8ab`: modelo, parser, editor, view e sheet de mama, ainda sem o catálogo clínico completo pedido agora.
- `5d03f20`: modelo, parser, editor, view, sheet e exporter de tireoide.
- `9215e80`: barra nova e botão `Esquema visual`, roteando somente pelve/miomas e Doppler venoso.

Os componentes existentes devem ser auditados e aproveitados onde estiverem corretos. Não fazer uma segunda implementação paralela.

Gaps confirmados no código atual:

- `BreastSchemaView` e `ThyroidSchemaView` redesenham a anatomia por código; não usam as artes aprovadas como base.
- A mama mostra todas as horas com o mesmo peso visual; não atende ao destaque 12/3/6/9.
- O modelo mamário tem apenas sólido, sólido lobulado, cisto, linfonodo e calcificação; faltam os demais glifos aprovados/propostos.
- O linfonodo atual tem preenchimento invertido em relação à leitura “periferia hipoecoica, hilo hiperecoico”; a polaridade final precisa da aprovação do Luiz.
- As sheets fazem importação automática do texto em `.task`, contrariando a fonte de verdade manual decidida para v1.
- Mama e tireoide enviam `reportId: nil` para a Sala, embora a rota aceite e use `reportId` para substituir o esquema do laudo correto.
- Mama e tireoide aparecem hoje dentro do `PlusSheet`. Depois da barra nova, essa entrada é redundante porque ambas já exigem laudo gerado.
- Não há testes de modelo, geometria, parser ou exporter para esses dois esquemas.

## 3. Resultado esperado da v1

Ao gerar um laudo de TIREOIDE ou MAMARIA, o médico verá `Esquema visual` na segunda linha da barra. Ao tocar, abrirá um editor manual com a arte aprovada, preview ao vivo, inclusão e remoção de achados, drag para reposicionar, legenda P&B e ações de exportar/enviar para a Sala.

O draft deverá sobreviver a fechar e reabrir a sheet durante o mesmo laudo. Um novo laudo não pode herdar os marcadores do anterior. Persistência permanente ou sincronização do JSON dos achados fica fora da v1; o artefato persistido nesta frente é o PNG/PDF enviado à Sala.

O esquema não calcula BI-RADS nem TI-RADS e não chama nenhum achado de “suspeito”. Classificações eventualmente exibidas são informadas manualmente pelo médico ou importadas como sugestão explícita, nunca inferidas pelo formato do glifo.

## 4. Linguagem visual compartilhada

Criar uma pequena biblioteca SwiftUI reutilizável de glifos P&B. A forma deve ser legível na tela pequena e também quando impressa em escala de cinza. Cada glifo terá três camadas possíveis:

1. Silhueta: círculo, oval, contorno lobulado, irregular ou espiculado.
2. Conteúdo: preenchido, vazio, pontilhado, agrupado ou meio sólido/meio cístico.
3. Modificador: calcificação, hilo central ou outro detalhe sobreposto.

Arquivo novo proposto:

- `LaudoUSG/Components/SchemaGlyphs.swift`

Componentes mínimos: círculo sólido, círculo vazado, forma lobulada preenchida/vazada, forma irregular, forma espiculada, meia-lua sólido-cística, grupo de microcistos, pontilhado interno, linfonodo com hilo, macrocalcificação e agrupamento de microcalcificações.

Os glifos não devem usar cor como portadora de significado. Cor de destaque durante drag pode existir apenas na interface; PNG e PDF finais permanecem P&B.

## 5. Proposta de glifos mamários para aprovação do Luiz

Esta tabela é o catálogo visual proposto. Ela precisa ser aprovada antes da Fase 4.

| Achado/descritor | Glifo P&B proposto | Rótulo principal no esquema | Observação |
|---|---|---|---|
| Nódulo sólido circunscrito | círculo ou oval preenchido em preto | `Nódulo sólido` | forma redonda/oval pode acompanhar o formato informado |
| Nódulo sólido com margem lobulada | contorno lobulado preenchido em preto | `Nódulo sólido` | qualificador `lobulado` fica no detalhe/legenda, nunca `suspeito` |
| Nódulo sólido irregular/angular | silhueta preenchida irregular, com poucos ângulos legíveis | `Nódulo sólido` | não graduar risco pelo desenho |
| Nódulo sólido espiculado | centro preto com espículas curtas | `Nódulo sólido` | usar somente se o médico selecionar o descritor |
| Cisto simples | círculo apenas com contorno preto e centro branco | `Cisto` | requisito literal do Luiz |
| Cisto complicado | círculo vazado com pontilhado cinza muito leve | `Cisto` | diferencia conteúdo sem parecer sólido |
| Microcistos agrupados | grupo de 3–5 pequenos círculos vazados | `Cisto` | legenda pode dizer `microcistos agrupados` |
| Complexo sólido-cístico | círculo dividido: metade preta, metade branca | validar: `Nódulo sólido` ou `Cisto` | o termo principal precisa ser decidido pelo Luiz para não distorcer o achado |
| Linfonodo intramamário | oval preto com pequeno ponto/oval branco central | validar rótulo especial | representa periferia hipoecoica e hilo hiperecoico; confirmar polaridade com Luiz |
| Cisto oleoso/necrose gordurosa típica | duplo contorno circular com pequeno crescente interno | `Cisto` | símbolo proposto; validar se vale diferenciar na v1 |
| Calcificação grosseira isolada | pequeno losango preto | validar rótulo especial | tamanho mínimo precisa sobreviver à impressão |
| Microcalcificações agrupadas | grupo compacto de 4–6 pontos pretos | validar rótulo especial | não transformar automaticamente em categoria BI-RADS |
| Calcificações em nódulo | pontos brancos dentro do glifo sólido ou pretos dentro do glifo vazado | mantém o rótulo da lesão | modificador, não novo tipo principal |
| Calcificações intraductais | sequência curta e linear de pontos pretos | validar rótulo especial | só oferecer se Luiz considerar útil no esquema ultrassonográfico |
| Coleção pós-cirúrgica | elipse vazada com contorno discretamente ondulado | validar rótulo especial | opcional na v1 |

Achados difusos/associados como edema, espessamento ou retração da pele, alteração ductal, distorção arquitetural, vascularização e elastografia não devem ganhar um ícone improvisado nesta v1. Eles continuam no texto do laudo. O esquema v1 representa achados focais com localização útil.

Regra de linguagem: para massas focais, o callout principal usa somente `Cisto` ou `Nódulo sólido`. Nunca usar `suspeito`, `provavelmente benigno` ou outra interpretação de risco no marcador. Casos especiais como linfonodo e calcificações precisam de decisão literal do Luiz sobre o nome visível.

## 6. Linguagem visual da tireoide

Usar a mesma gramática P&B, adaptada ao TI-RADS, sem transformar o esquema em calculadora:

| Achado/descritor | Glifo P&B |
|---|---|
| Nódulo sólido | círculo/oval preto preenchido |
| Cístico/anecoico | círculo/oval vazado |
| Misto sólido-cístico | metade preenchida e metade vazada |
| Espongiforme | agrupamento interno de pequenos espaços vazados |
| Margem lobulada/irregular | silhueta correspondente, mantendo o conteúdo do nódulo |
| Foco ecogênico puntiforme | pequenos pontos de contraste sobre o glifo |
| Macrocalcificação | pequeno losango/placa de contraste |
| Calcificação periférica | anel preto parcial ou completo |
| Cauda de cometa | pequeno traço posterior, discreto |

O modelo mantém lobo direito, lobo esquerdo e istmo. Nos lobos, mantém terço superior, médio e inferior. O istmo não recebe terço.

Se houver TI-RADS informado, exibir na lista textual/legenda do achado, não codificar por cor. Não calcular pontuação dentro do esquema nesta frente.

## 7. Fases de implementação

### Fase 0 — gate visual e clínico com Luiz, antes de codar

Objetivo: eliminar decisões visuais que mudariam modelo e renderer depois.

Preparar duas pranchas estáticas, sem integrar ao app:

- Tireoide: arte original intacta com exemplos de sólido, cisto, misto e espongiforme nos lobos/istmo.
- Mama: candidato P&B com relógio completo, 12/3/6/9 destacados, demais horas secundárias, anéis discretos e todos os glifos da tabela em uma legenda separada.

Validar com Luiz:

1. A arte da tireoide está visualmente idêntica ao PNG aprovado.
2. O cinza/preto da mama e a força dos anéis funcionam em tela e impressão comum.
3. Orientação anatômica: mama direita à esquerda da folha ou à direita; sentido do relógio em cada mama; correspondência medial/lateral.
4. Permanência ou remoção das siglas de quadrantes e do divisor central.
5. Polaridade do glifo do linfonodo: periferia preta com hilo branco central.
6. Rótulo do complexo sólido-cístico e dos casos especiais, respeitando a proibição de `suspeito`.
7. Quais glifos opcionais entram na v1: cisto oleoso, calcificações intraductais e coleção pós-cirúrgica.
8. Comportamento manual: editor começa vazio; `Importar achados do laudo` é uma ação explícita e revisável, sem autoimportação.
9. Layout do PDF: esquema grande + lista lateral de achados + legenda, sem dado identificável do paciente.

Entregável do gate: aprovação explícita das duas pranchas e da tabela de glifos. Sem isso, não avançar para Fase 1.

Arquivos do monorepo usados como referência, sem alteração nesta fase:

- `tmp-review/tireoide-base.png`
- `tmp-review/mama-base.png`
- `tmp-review/mama-base-bw.png`
- `tmp-review/tireoide-prototipo.html`
- `tmp-review/mama-prototipo.html`
- `tmp-review/miomas-prototipo.html`
- `docs/det-5-mamaria-birads-pesquisa.md`

### Fase 1 — fundação compartilhada e assets

Objetivo: colocar as artes aprovadas no bundle e criar um único vocabulário gráfico.

Arquivos novos no repo Swift:

- `LaudoUSG/Assets.xcassets/ThyroidSchemaBase.imageset/Contents.json`
- `LaudoUSG/Assets.xcassets/ThyroidSchemaBase.imageset/tireoide-base.png`
- `LaudoUSG/Assets.xcassets/BreastSchemaBaseBW.imageset/Contents.json`
- `LaudoUSG/Assets.xcassets/BreastSchemaBaseBW.imageset/mama-base-bw.png`
- `LaudoUSG/Components/SchemaGlyphs.swift`

Arquivos alterados somente se o projeto exigir referência manual:

- `LaudoUSG.xcodeproj/project.pbxproj`. O projeto usa grupo sincronizado; não editar por hábito se os arquivos já forem incorporados automaticamente.

Implementação:

- Copiar a arte da tireoide byte a byte para o asset. Não reexportar.
- Confirmar que `mama-base-bw.png` difere da original apenas pela conversão para tons de cinza. Se não, gerar nova conversão determinística preservando dimensões 1536 × 1024 e transparência/fundo.
- Criar glifos como `Shape`/views SwiftUI independentes de mama ou tireoide.
- Criar previews com fundo branco, escala pequena e escala de impressão.
- Definir contraste mínimo de traços para não desaparecer na impressora, sem engrossar a anatomia aprovada.

Critério de aceite:

- As duas imagens carregam do asset sem deformação.
- Todos os glifos continuam distinguíveis em screenshot P&B reduzido e em PDF.
- Build do app passa antes de tocar na navegação.

### Fase 2 — TIREOIDE primeiro

Objetivo: entregar o fluxo completo de tireoide antes de iniciar mama.

Arquivos alterados:

- `LaudoUSG/Models/ThyroidFinding.swift`
- `LaudoUSG/Components/ThyroidSchemaView.swift`
- `LaudoUSG/Components/ThyroidSchemaEditor.swift`
- `LaudoUSG/Components/Sheets/ThyroidSchemaSheet.swift`
- `LaudoUSG/Services/ThyroidFindingsParser.swift`
- `LaudoUSG/Services/ThyroidSchemaExporter.swift`
- `LaudoUSG/Features/Generate/GenerateView.swift`
- `LaudoUSG/Features/Generate/GenerateViewModel.swift`
- `LaudoUSG/Components/Sheets/PlusSheet.swift`

Arquivos novos:

- `LaudoUSGTests/ThyroidSchemaTests.swift`

Implementação do canvas:

- Trocar o desenho anatômico programático pelo asset `ThyroidSchemaBase` como camada de fundo.
- Preservar a proporção nativa 1122 × 1402; nunca forçar canvas quadrado.
- Definir coordenadas normalizadas para lobo direito, lobo esquerdo, istmo e três terços. A geometria de interação fica separada da imagem.
- Durante drag, mostrar destaque leve da região de destino somente na UI. O destaque não entra no PNG/PDF.
- Marcadores fazem snap para lobo/terço ou istmo. Soltar fora de região válida mantém a posição anterior.
- Aplicar spread determinístico para nódulos no mesmo bucket, evitando sobreposição sem mudar a localização clínica.

Implementação do modelo/editor:

- Manter `side`, `tercio`, tamanho e TI-RADS manual.
- Adaptar `FindingType` para sólido, cístico, misto e espongiforme; calcificação passa preferencialmente a modificador/foco ecogênico em vez de substituir o nódulo inteiro.
- Adicionar os focos ecogênicos que forem aprovados no gate.
- Oferecer CRUD simples, preview ao vivo e drag.
- Começar vazio ou com um achado em branco somente se Luiz optar por isso no gate.
- Remover a autoimportação em `.task`. O parser local só roda ao tocar `Importar achados do laudo`; resultados aparecem como sugestões editáveis e identificadas.
- Guardar o draft no `GenerateViewModel` por `lastReportId` durante a sessão. Ao gerar outro laudo, limpar o draft anterior.

Integração:

- Estender `hasVisualSchema` e `openVisualSchema()` para `.tireoide`.
- Criar apresentação direta de `ThyroidSchemaSheet` pela barra, passando `displayedOutput`, `lastReportId` e o draft.
- Remover a entrada redundante de tireoide do `PlusSheet` quando o botão novo estiver funcionando.
- Remover o parâmetro `onInsert` da sheet se continuar sem uso.

Export/Sala:

- Refazer o layout usando a proporção nativa da arte.
- PNG com fundo branco, anatomia, marcadores e legenda.
- PDF A4 paisagem com título, esquema grande, lista ordenada por lobo/terço e legenda P&B.
- Passar `reportId: vm.lastReportId` para `SalaSchemaUploader`.
- Usar `examType: "TIREOIDE"` e label neutro `Tireoide — esquema`.
- Mensagem de sucesso apenas após resposta `ok` do uploader; erro mantém o draft e permite nova tentativa.

Testes:

- Mapeamento de cada lobo/terço e istmo.
- Drag fora da anatomia não move o achado.
- Spread de dois ou mais achados no mesmo bucket é estável.
- Glifos sólido/cístico/misto/esponjoso não colapsam no mesmo desenho.
- Parser local não roda sem ação explícita.
- PNG e PDF são gerados, têm tamanho não zero e respeitam o limite de payload da Sala.
- O envio recebe o `reportId` correto.

Critério de aceite da fase:

- Build e testes passam.
- Smoke em device: gerar tireoide, abrir pela barra, adicionar nódulos em LD/LE/istmo, arrastar entre terços, fechar/reabrir, exportar e enviar à Sala.
- PNG e PDF preservam a arte aprovada e ficam legíveis em preto e branco.

### Fase 3 — validação de TIREOIDE com Luiz

Não começar MAMA antes deste checkpoint.

Mostrar ao Luiz:

- Editor no iPhone com um e múltiplos nódulos.
- Istmo e cada terço dos dois lobos.
- Legenda dos glifos.
- PNG recebido na Sala.
- PDF paisagem e uma impressão/teste em escala de cinza.

Corrigir apenas problemas do padrão comum antes de replicá-lo em mama. Se Luiz alterar a linguagem dos glifos, ajustar `SchemaGlyphs.swift` primeiro.

### Fase 4 — MAMA

Objetivo: aplicar o padrão aprovado na mama, com o léxico focal ampliado.

Arquivos alterados:

- `LaudoUSG/Models/BreastFinding.swift`
- `LaudoUSG/Components/BreastSchemaView.swift`
- `LaudoUSG/Components/BreastSchemaEditor.swift`
- `LaudoUSG/Components/Sheets/BreastSchemaSheet.swift`
- `LaudoUSG/Services/BreastFindingsParser.swift`
- `LaudoUSG/Services/BreastSchemaExporter.swift`
- `LaudoUSG/Features/Generate/GenerateView.swift`
- `LaudoUSG/Features/Generate/GenerateViewModel.swift`
- `LaudoUSG/Components/Sheets/PlusSheet.swift`

Arquivos novos:

- `LaudoUSGTests/BreastSchemaTests.swift`

Implementação do canvas:

- Usar `BreastSchemaBaseBW` como fundo na proporção 1536 × 1024.
- Não redesenhar contorno, mamilo ou anéis se eles já estiverem no asset aprovado.
- Posicionar relógio e marcadores numa camada vetorial normalizada.
- Horas 12/3/6/9: tamanho atual, peso semibold/bold discreto e contraste principal.
- Horas 1/2/4/5/7/8/10/11: menores, regulares e mais transparentes.
- Manter os anéis pontilhados finos e discretos; eles nunca podem competir com os achados.
- Validar espelhamento direita/esquerda e converter drag para hora + distância do mamilo sem trocar medial por lateral.
- Impedir que um marcador arrastado saia da mama correspondente; troca de lado deve acontecer pelo seletor explícito, não por acidente no drag.
- Aplicar spread determinístico para achados na mesma hora/distância.

Implementação do modelo/editor:

- Separar o tipo principal do achado de seus modificadores visuais. Evitar continuar usando `solidLobulated` como tipo isolado, pois margem é um atributo do nódulo.
- Modelo mínimo proposto: lado, tipo principal, hora/quadrante, distância do mamilo, maior eixo, forma/margem, padrão de conteúdo, calcificação/modificador, aproximação e origem.
- Mostrar primeiro os atalhos frequentes `Nódulo sólido` e `Cisto`; demais casos ficam em `Mais tipos`, para o editor não virar um formulário pesado.
- Aplicar a tabela de glifos aprovada.
- Nunca exibir `suspeito` em toolbar, marcador, legenda, callout, lista ou export.
- Remover a autoimportação em `.task`. Importação local é explícita, editável e não envia nada ao backend.
- Guardar draft por `lastReportId` durante a sessão e limpar ao gerar novo laudo.

Integração:

- Estender `hasVisualSchema` e `openVisualSchema()` para `.mamaria`.
- Criar apresentação direta de `BreastSchemaSheet` pela barra, passando `displayedOutput`, `lastReportId` e o draft.
- Remover a entrada redundante de mama do `PlusSheet` quando o botão novo estiver funcionando.
- Manter o PlusSheet da cartografia venosa como exceção, conforme decisão anterior, porque ele ainda oferece acesso pré-laudo.
- Remover o parâmetro `onInsert` da sheet se continuar sem uso.

Export/Sala:

- PNG final totalmente P&B, inclusive anatomia, relógio, glifos e legenda.
- PDF A4 paisagem com esquema grande, lista por mama/hora e legenda dos glifos presentes.
- A lista pode trazer descritores clínicos selecionados, mas o título principal do marcador segue a regra `Cisto`/`Nódulo sólido` e nunca classifica risco.
- Passar `reportId: vm.lastReportId` para `SalaSchemaUploader`.
- Usar `examType: "MAMARIA"` para casar com a categoria e com a Sala; evitar o valor atual `"MAMA"` sem confirmar compatibilidade.
- Label neutro: `Mama — esquema` ou `Mamas — esquema`, conforme aprovação do Luiz.

Testes:

- Conversão hora/distância → coordenada → hora/distância em ambas as mamas.
- Correspondência dos quadrantes e medial/lateral.
- Drag fica dentro da mama e não troca o lado.
- 12/3/6/9 têm estilo diferente das demais horas.
- Cada glifo aprovado produz desenho distinto em P&B.
- Margem lobulada funciona tanto no sólido preenchido quanto no cisto vazado.
- Linfonodo tem a polaridade aprovada.
- `suspeit` não aparece em nenhuma string do fluxo nem no texto exportado.
- PNG/PDF não têm cor residual perceptível e respeitam o limite de payload.
- Envio à Sala recebe o `reportId` correto e substitui apenas o esquema do mesmo laudo/tipo.

Critério de aceite da fase:

- Build e testes passam.
- Smoke em device com pelo menos: sólido, cisto, lobulado, linfonodo, microcistos, complexo sólido-cístico e calcificações.
- Luiz aprova tela, PNG na Sala e PDF/print P&B.

### Fase 5 — fechamento e regressão

Objetivo: garantir que a frente não quebrou os esquemas já existentes nem a barra nova.

Arquivos possivelmente alterados:

- `LaudoUSG/Features/Generate/GenerateView.swift`
- `LaudoUSG/Features/Generate/GenerateViewModel.swift`
- `LaudoUSG/Components/Sheets/PlusSheet.swift`
- testes novos das duas categorias

Matriz manual da barra:

| Categoria | Botão `Esquema visual` | Destino |
|---|---|---|
| PELVE_FEMININA | visível após laudo | miomas |
| DOPPLER_VENOSO_MMII | visível após laudo | cartografia venosa |
| DOPPLER_VENOSO_MMII_MEDIDAS | visível após laudo | cartografia venosa |
| TIREOIDE | visível após laudo | esquema tireoidiano |
| MAMARIA | visível após laudo | esquema mamário |
| demais categorias | oculto | nenhum |

Regressões obrigatórias:

- Miomas continua abrindo, arrastando e enviando para Sala.
- Venoso continua abrindo pela barra e pelo atalho do PlusSheet.
- `Visualizar/Editar`, `Copiar` e `Enviar p/ Sala` continuam funcionando.
- Nenhuma sheet abre junto com outra.
- Trocar categoria ou gerar novo laudo não reaproveita o draft errado.
- PlusSheet continua com calculadoras, Consultor IA e cartografia venosa, mas sem duplicatas de mama/tireoide.

## 8. Validação técnica final

Rodar build limpo no checkout Swift:

```bash
xcodebuild \
  -project LaudoUSG.xcodeproj \
  -scheme LaudoUSG \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' \
  -derivedDataPath /tmp/laudousg-build \
  build
```

Rodar testes no mesmo simulador instalado:

```bash
xcodebuild \
  -project LaudoUSG.xcodeproj \
  -scheme LaudoUSG \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' \
  -derivedDataPath /tmp/laudousg-tests \
  test
```

Depois, validar em device físico:

1. Gerar um laudo de tireoide e outro de mama.
2. Confirmar entrada pela barra e ausência de duplicata no PlusSheet.
3. Criar, mover, editar e apagar achados.
4. Fechar e reabrir o editor no mesmo laudo; draft deve permanecer.
5. Gerar outro laudo; draft anterior não pode aparecer.
6. Exportar PNG e PDF; abrir os dois.
7. Enviar à Sala; conferir imagem, download do PDF e substituição ao reenviar.
8. Imprimir ou visualizar o PDF em escala de cinza a 100%.
9. Repetir smoke curto de miomas e venoso.

## 9. Riscos e contenções

### Orientação clínica errada na mama

Risco mais grave: inverter direita/esquerda, medial/lateral ou o relógio. Contenção: aprovação do Luiz com um caso marcado em 12/3/6/9 e quadrantes antes de codar a geometria definitiva; testes de round-trip por lado.

### Arte aprovada descaracterizada

Risco: o renderer programático atual produzir anatomia diferente da imagem aprovada. Contenção: asset raster como fonte visual imutável e overlay separado; comparação lado a lado e checksum da arte da tireoide.

### Glifo sugerir risco diagnóstico

Risco: forma espiculada/irregular ser interpretada como classificação automática. Contenção: desenho só reflete seleção manual; nenhuma inferência de BI-RADS/TI-RADS; títulos neutros; texto didático no rodapé.

### Editor deixar de ser realmente manual

Risco: parser local preencher achados errados silenciosamente. Contenção: remover autoimportação; importar apenas por ação explícita; manter fonte/origem visível e tudo editável.

### Perda do trabalho ao fechar a sheet

Risco: estado local da sheet desaparecer. Contenção: draft por `reportId` no `GenerateViewModel`, com reset explícito ao iniciar outro laudo.

### Export diferente da tela

Risco: manter dois desenhos independentes e corrigir só um. Contenção: exporter renderiza a mesma `SchemaView` e os mesmos glifos usados no editor, apenas sem halos/controles.

### Sala substituir o esquema errado

Risco atual: `reportId: nil` cria substituição por usuário + tipo, não por laudo. Contenção: tornar `reportId` parâmetro obrigatório quando o esquema vier da barra pós-laudo e testá-lo na chamada.

### PDF ilegível ou payload grande

Risco: raster muito grande, texto pequeno ou linhas claras demais. Contenção: teto da rota é cerca de 2,8 MB em base64 por blob; medir PNG/PDF reais, ajustar resolução sem sacrificar impressão e testar linhas na impressora.

### Escopo crescer para backend automático

Risco: tentar aproveitar a frente para criar extractors/SSE. Contenção: qualquer mudança em `apps/api`, schemas compartilhados ou evento SSE fica explicitamente fora desta v1 e exige outro plano.

## 10. Fronteira de escopo

Incluído:

- Editor manual de tireoide e mama no iOS.
- Assets aprovados, glifos P&B, drag, CRUD e draft da sessão.
- Entrada pela barra `Esquema visual`.
- PNG, PDF e envio à Sala com `reportId`.
- Testes de geometria/modelo/export e smoke em device.

Fora desta frente:

- Extração automática backend e novos schemas/SSE.
- Cálculo automático de BI-RADS ou TI-RADS.
- Persistência do JSON dos achados no servidor.
- Esquemas equivalentes em RN/Android ou web.
- Alterações no renderer clínico dos laudos.
- Mudanças no schema venoso v2.

## 11. Sequência de commits sugerida

1. `feat(schema): adiciona assets aprovados e glifos P&B compartilhados`
2. `feat(tireoide): integra editor manual ao botão Esquema visual e Sala`
3. Gate visual de tireoide com Luiz; correções dentro do mesmo bloco antes de mama.
4. `feat(mama): integra editor manual P&B e catálogo de glifos`
5. `test(schema): cobre geometria, export e regressão da barra`

Cada commit só entra depois de build verde. O commit de mama só começa após aprovação funcional e visual da tireoide.
