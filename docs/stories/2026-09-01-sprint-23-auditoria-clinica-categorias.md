# Sprint 23 — auditoria clínica categoria por categoria

## Objetivo

Revisar cada opção que o médico pode selecionar na web e garantir que ela produza uma descrição coerente no corpo do laudo, uma síntese objetiva na conclusão e o mesmo significado nos estilos Clássico e Objetivo. O sprint não mede qualidade pela quantidade de botões: cada clique precisa economizar digitação sem criar contradição, repetição ou diagnóstico não sustentado.

## Hierarquia das fontes

1. Laudos previamente validados pelo Luiz e corpus histórico desidentificado do próprio LaudoUSG.
2. Contratos e frases já aprovados com base nos ensinamentos do Dr. Domingos Correia da Rocha.
3. Protocolos e materiais técnicos do Colégio Brasileiro de Radiologia, FEBRASGO e sociedades pertinentes.
4. Sistemas de classificação oficiais e versionados, como ACR BI-RADS e TI-RADS, quando aplicáveis.
5. Concorrentes servem para identificar cobertura e ergonomia; nunca são autoridade clínica nem fonte para copiar texto.

Referências iniciais: [Protocolos de Ultrassonografia 2025 do CBR](https://cbr.org.br/wp-content/uploads/2025/11/Protocolos-de-Ultrassonografia_2025.pdf), [biblioteca de exames do Laudário](https://laudario.com.br/index.php) e [cartogramas do Laudário](https://laudario.com.br/cartogramas).

## Regra de aceite por opção

Cada opção, alteração ou patologia terá uma ficha com: gatilho da interface; frase completa do corpo; conclusão correspondente; campos opcionais e obrigatórios; incompatibilidades; comportamento quando faltam medidas; estilo Clássico; estilo Objetivo; entrada pelo celular; extração de imagem quando pertinente; e casos golden isolados e combinados.

O teste mínimo de cada item exige quatro cenários: exame normal; alteração isolada; alteração combinada com outro achado do mesmo órgão; e alteração combinada com outro órgão. A frase alterada deve substituir a frase normal no mesmo local. É proibido manter uma normalidade incompatível, repetir o órgão em uma linha genérica ou encerrar com conclusão normal quando existe achado relevante.

## Ordem de execução

### 23A — Abdome total e abdome superior

Fígado, veia porta, vesícula, vias biliares, pâncreas, baço, rins, bexiga, aorta e veia cava. Inclui hepatopatias difusas, lesões focais, alterações inflamatórias, obstrutivas e pós-operatórias. A primeira correção do sprint é hepatopatia crônica: deixa de ser texto livre, substitui a frase normal do fígado e entra na conclusão.

### 23B — Obstetrícia

Obstétrica, Doppler obstétrico, morfológicos, cervicometria e crescimento fetal. Revisar trimestre, gemelaridade, situação/apresentação, placenta, líquido, anatomia, biometria, percentis, Doppler e os complementos opcionais sem duplicação de categorias.

Primeiro corte entregue (23B1): a tela Obstétrica passou a expor vitalidade, movimentos fetais e vasos do cordão sem assumir avaliação não realizada. A placenta passou a separar localização, relação com o orifício interno e achado placentário, permitindo combinar, por exemplo, placenta anterior, prévia e sinais de acretismo sem perda de nenhum eixo. As mesmas decisões atravessam os estilos Clássico e Objetivo.

### 23C — Tireoide, mamas e ginecologia

Tireoide, nódulos, tireoidites, linfonodos e Doppler; mamas/axilas, descritores BI-RADS e Doppler; pelve abdominal/transvaginal, miomas, adenomiose, endométrio e ovários. Classificações continuam determinísticas e validadas pelo médico.

### 23D — Urinário, próstata, cervical e superficiais

Vias urinárias, próstata suprapúbica, próstata transretal, bolsa testicular, região inguinal, parede abdominal, glândulas salivares, paratireoide, cervical e partes moles.

### 23E — Musculoesquelético e categorias abertas

Revisar por articulação e lateralidade sem transformar cada combinação em categoria independente. Achados de narrativa aberta continuam no fluxo flexível com auditoria, enquanto medidas, estruturas e conclusões repetíveis permanecem estruturadas.

## Expansão de cobertura

### Fechar primeiro o que já está cadastrado

Prioridade imediata: bolsa testicular com e sem Doppler, região inguinal, próstata transretal, parede abdominal, glândulas salivares, paratireoide, Doppler venoso e arterial de membros, fístula arteriovenosa, Doppler renal, transfontanelar e quadril infantil. Ocular e tórax permanecem no backlog até haver corpus e fluxo estruturado suficientes.

### Novas categorias realmente distintas

Pesquisa de endometriose profunda; histerossonografia com infusão salina; histerossonossalpingografia; ecocardiografia fetal; elastografia hepática; Doppler hepático/sistema porta; Doppler de transplante renal; Doppler de aorta e ilíacas; Doppler de artérias mesentéricas; e Doppler de artérias temporais. Cada uma só entra depois de contrato clínico, modelo normal, alterações prioritárias e golden tests.

### Modos, não novas categorias

Mama masculina, mamas com Doppler, mamas sem axilas, pelve abdominal/transvaginal/com Doppler, monitorização folicular, MSK unilateral/bilateral, obstétrico por trimestre e gestação gemelar devem ser modos ou cenários da categoria-base. Isso reduz confusão, reaproveita os mesmos achados e evita bibliotecas divergentes.

## Caso inicial corrigido — hepatopatia crônica

Corpo: “Fígado de dimensões normais, com contornos bocelados e ecotextura difusamente heterogênea. Os vasos intra-hepáticos apresentam calibre preservado.”

Conclusão: “Sinais ecográficos sugestivos de hepatopatia crônica difusa.”

Essa seleção não afirma hipertensão portal, esplenomegalia, circulação colateral, ascite ou lesão focal. Esses achados continuam independentes e só aparecem quando informados.

## Definição de pronto

Uma categoria só termina quando todas as opções visíveis passaram pela matriz clínica, pelos quatro cenários mínimos e pelos dois estilos; os campos do celular e da extração de imagem produzem o mesmo estado; não existem botões sem frase; não existem frases sem conclusão pertinente; e a revisão do Luiz pode ser feita na prática sem consultar código.

## Validação inicial

- [x] Hepatopatia crônica deixou de usar texto livre genérico.
- [x] A alteração substitui a frase normal do fígado no mesmo ponto do laudo.
- [x] A conclusão normal é substituída pela síntese pertinente.
- [x] Abdome total e abdome superior foram validados nos estilos Clássico e Objetivo.
- [x] Typecheck, build da web e build da API concluídos.
- [x] Demais opções do abdome foram percorridas nas entregas 23A1 e 23A2.

## Entrega 23A1 — abdome superior

Fígado, veia porta, vesícula biliar, vias biliares, pâncreas e baço foram percorridos opção por opção. Os estados que antes chegavam ao catálogo como texto livre agora têm redação determinística no corpo e conclusão pertinente nos estilos Clássico e Objetivo. A alteração substitui a normalidade do mesmo órgão, admite medidas ausentes sem imprimir lacunas e conserva achados combinados do mesmo órgão ou de órgãos diferentes.

A conversão de unidades foi normalizada: campos identificados em milímetros são convertidos para centímetros no laudo; campos identificados em centímetros permanecem em centímetros. O protocolo de ultrassonografia do CBR de novembro de 2025 também levou à inclusão das medidas longitudinais dos lobos hepáticos na hepatomegalia, do calibre da veia porta quando dilatada e dos eixos maior e menor do baço na esplenomegalia.

Foram validados 36 cenários de opções visíveis, além de combinações intraórgão e interórgãos. A matriz cobre exame normal, alteração isolada, alteração combinada, medidas preenchidas, medidas ausentes, entrada com unidade explícita e entrada numérica sem unidade. Os golden tests anteriores de abdome superior continuam passando integralmente.

- [x] Fígado e veia porta.
- [x] Vesícula e vias biliares.
- [x] Pâncreas e baço.
- [x] Paridade Clássico/Objetivo.
- [x] Conversão segura de mm para cm.
- [x] Campos adicionais alinhados à documentação recomendada pelo CBR.
- [x] Matriz clínica 23A1 e golden tests preexistentes.
- [x] 23A2: rins, bexiga, aorta e veia cava.

## Entrega 23A2 — rins, bexiga, aorta e veia cava

As quatro estruturas que faltavam no abdome total agora têm caminho completo entre a tela, o estado canônico e o laudo. Bexiga, aorta e veia cava deixaram de ser normalidades fixas e passaram a ter seções próprias. Nos rins, opções que já existiam mas se perdiam na adaptação — dimensões reduzidas, redução da diferenciação corticomedular, hidronefrose, angiomiolipoma, imagem cística complexa e nefrocalcinose — passaram a substituir a frase normal e produzir conclusão compatível.

Medidas continuam opcionais e nunca geram lacunas vazias. Os rins aceitam medidas em três eixos e espessura do parênquima; lesões renais aceitam medidas e topografia; a bexiga aceita volume pré-miccional, espessura da parede e resíduo pós-miccional; aorta e veia cava aceitam calibre quando pertinente. A documentação renal segue a recomendação do protocolo de ultrassonografia do CBR de registrar diâmetro bipolar e espessura do parênquima no abdome total.

Na bexiga foram estruturados repleção insuficiente, espessamento ou trabeculação parietal, debris, cálculo, sonda e divertículo. Na aorta foram estruturadas ectasia, dilatação aneurismática e ateromatose, inclusive em combinação. Na veia cava inferior foram estruturados calibre aumentado e material trombótico informado pelo médico. A plataforma não infere diagnóstico a partir de medida isolada: ectasia, aneurisma ou trombo só aparecem após seleção explícita.

A matriz 23A2 validou 27 cenários visíveis e combinações intraórgão e interórgãos nos estilos Clássico e Objetivo. Os golden tests anteriores de abdome total, abdome superior e vias urinárias continuaram passando.

- [x] Medidas renais e espessura do parênquima sem lacunas obrigatórias.
- [x] Alterações difusas, obstrutivas e focais dos rins.
- [x] Repleção, parede, conteúdo, volume e resíduo vesicais.
- [x] Ectasia, aneurisma e ateromatose da aorta.
- [x] Calibre e conteúdo da veia cava inferior.
- [x] Paridade Clássico/Objetivo e combinações de achados.
- [x] Regressão de abdome superior e vias urinárias.

## Entrega 23B1 — base obstétrica compartilhada

Situação e apresentação permanecem conceitos separados: situação longitudinal abre apresentação cefálica ou pélvica; situação transversa usa polo cefálico e dorso opcional. Vitalidade ausente elimina qualquer frequência previamente digitada, suprime a afirmação de movimentos ativos e produz conclusão de óbito fetal. Bradicardia e taquicardia aceitam a frequência quando disponível e continuam renderizando sem lacuna quando o número não foi informado.

O cordão umbilical começa em “Não informar”. A descrição de duas artérias e uma veia só aparece após seleção explícita; o estado de dois vasos produz “Artéria umbilical única” na conclusão. Movimentos reduzidos ou ausentes substituem a frase de atividade normal.

A placenta agora mantém três eixos independentes: descrição/topografia, relação com o orifício interno e achado agudo. Inserção baixa aceita distância opcional; prévia marginal e prévia produzem descrição e conclusão próprias. Coleção retroplacentária renderiza com ou sem medidas, sem bloquear o laudo. Acretismo e lagos venosos substituem a falsa normalidade placentária. Combinações como placenta anterior + prévia + acretismo foram validadas sem perda ou repetição.

A matriz 23B1 percorre os estados acima nos estilos Clássico e Objetivo e acrescenta proibições explícitas contra BCF antigo em feto sem vitalidade, movimentos ativos em óbito, cordão não avaliado e placenta normal ao lado de patologia. A equivalência preexistente de 4.320 combinações do catálogo Clássico permaneceu byte a byte.

- [x] Situação longitudinal/transversa e apresentação coerente.
- [x] Vitalidade normal, ausente, bradicardia e taquicardia.
- [x] Movimentos ativos, reduzidos e ausentes.
- [x] Cordão não avaliado, três vasos e artéria umbilical única.
- [x] Inserção baixa, prévia marginal e prévia.
- [x] Coleção retroplacentária, acretismo e lagos venosos.
- [x] Paridade Clássico/Objetivo e combinações independentes.
- [x] 23B2: contrato morfológico entre web, API e iOS; marcador tricúspide; bloco FMF compartilhado.
- [ ] Próximo corte 23B: Doppler obstétrico, cervicometria e crescimento fetal opção por opção.

## Entrega 23B2 — morfológico e pré-eclâmpsia web/iOS

O aplicativo iOS foi auditado como cliente principal. A categoria Morfológico é enviada explicitamente à API como `MORFOLOGICO`, inclusive quando o ditado diz “morfológico do segundo trimestre”. No servidor, o roteamento foi validado contra 15 formas de ditado e não confunde o exame morfológico com a obstétrica simples ou com o Doppler obstétrico. Os renderers Clássico e Objetivo de 1º, 2º e 3º trimestres também passaram pelo gate que impede normalidade na conclusão diante de malformação, alteração do líquido ou diagnóstico livre.

A regurgitação tricúspide era um campo órfão: aparecia na tela do morfológico de 1º trimestre, mas não era lida pelo adaptador nem existia no contrato canônico. Agora “ausente”, “presente” e “não avaliada” atravessam a tela, a extração e os dois estilos. Quando presente, o achado entra no corpo e na conclusão e suprime a frase de morfologia normal; quando não avaliado, nenhuma normalidade é inventada.

O cálculo FMF permanece matematicamente inalterado e compartilhado por equivalência entre web e iOS. No iOS, os 342 casos golden continuaram idênticos. O bloco de inserção passou a usar o título “CÁLCULO DE RISCO DE PRÉ-ECLÂMPSIA”, explicita IG, PAM, origem da aferição, MoMs, risco “1 em N” e uma síntese única de baixo ou alto risco. A referência final permanece texto limpo no iOS e recebe itálico apenas na apresentação rica da web, sem asteriscos literais no laudo.

- [x] 342 casos golden FMF no iOS sem divergência matemática.
- [x] Redação do bloco de baixo risco e de alto risco validada no iOS.
- [x] Inserção sem `Calculado com`, sem ressalva redundante da aferição única e sem asteriscos literais.
- [x] Referência FMF em itálico na visualização rica da web, preservando o texto puro.
- [x] Categoria `MORFOLOGICO` codificada corretamente pelo cliente iOS.
- [x] Roteamento de “morfológico do segundo trimestre” e variantes validado no servidor.
- [x] Regurgitação tricúspide coberta no corpo e na conclusão dos estilos Clássico e Objetivo.
- [x] Gate de contradição dos quatro ramos morfológicos.
- [x] Suíte completa do iOS: 50 testes executados, 47 aprovados e 3 testes WHO explicitamente adiados, sem falhas.

### Arquivos da entrega 23B2 — monorepo

- `packages/shared/src/calculators/preEclampsiaFmf.ts`
- `apps/web/src/lib/calculators/preEclampsia.test.mts`
- `apps/web/src/components/laudar/reportRichText.ts`
- `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`
- `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`
- `apps/api/src/server/renderer/catalog/__tests__/morfologico-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/morfologico-nao-contradiz.manual.ts`
- `apps/api/src/server/renderer/__tests__/morfologico-objetivo-golden.manual.ts`
- `apps/api/src/server/renderer/__tests__/morfologico-objetivo-boletim.manual.ts`
- `apps/api/src/server/renderer/__tests__/ig-renderer.manual.ts`
- `docs/morfologico-objetivo-boletim.html`

### Arquivos da entrega 23B2 — aplicativo iOS

- `LaudoUSG/Services/PreEclampsiaCalculator.swift`
- `LaudoUSGTests/PreEclampsiaFmfGoldenTests.swift`

## Ajuste paralelo — esquema visual das mamas

A região retroareolar passou a ser tratada como localização própria no esquema, inclusive após arrastar o marcador para junto do mamilo. A legenda diferencia cisto, nódulo, margem lobulada, margem espiculada e calcificações. Em “Cistos múltiplos”, o achado principal continua sendo o único descrito no laudo; o médico pode acrescentar e reposicionar cistos extras apenas no desenho. Esses marcadores visuais não criam novos achados, não alteram BI-RADS e são removidos automaticamente se o achado de cistos múltiplos deixar de existir.

## Arquivos da entrega 23B1 e do ajuste mamário

- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`
- `apps/api/src/server/renderer/categories/OBSTETRICA.ts`
- `apps/api/src/server/renderer/__tests__/obstetrica-23b1-clinical-matrix.manual.ts`
- `apps/web/src/lib/visualSchemas/adapters.ts`
- `apps/web/src/components/visualSchemas/BreastSchema.tsx`
- `apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx`
- `apps/web/src/lib/visualSchemas/__tests__/adapters.manual.ts`
- `package.json`

## Arquivos da entrega 23A2

- `apps/web/src/lib/catalog/abdomeParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/abdomeTotal.ts`
- `apps/web/src/lib/deterministic/organs/rim.ts`
- `apps/web/src/lib/deterministic/organs/bexigaAbdome.ts`
- `apps/web/src/lib/deterministic/organs/vasosAbdome.ts`
- `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/__tests__/abdomen-23a2-clinical-matrix.manual.ts`
- `package.json`

## Arquivos desta primeira entrega

- `apps/web/src/lib/catalog/abdomeParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/figado.ts`
- `apps/web/src/lib/deterministic/organs/vesicula.ts`
- `apps/web/src/lib/deterministic/organs/viasBiliares.ts`
- `apps/web/src/lib/deterministic/organs/pancreas.ts`
- `apps/web/src/lib/deterministic/organs/baco.ts`
- `apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/extraction.ts`
- `apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts`
- `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/__tests__/abdomen-hepatopatia-cronica.manual.ts`
- `apps/api/src/server/renderer/__tests__/abdomen-23a1-clinical-matrix.manual.ts`
- `package.json`
- `docs/plano-produto-web-sprints-15-22-2026-08-31.md`
- `docs/stories/2026-09-01-sprint-23-auditoria-clinica-categorias.md`
