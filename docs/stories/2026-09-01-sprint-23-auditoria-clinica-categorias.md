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

Primeiro corte (23C1): Tireoide. A Nota de Domingos e o ACR TI-RADS permanecem independentes. O sistema não chama de ACR uma categoria inferida a partir da tabela de Domingos: o ACR usa composição, ecogenicidade, forma, margem e focos ecogênicos próprios, com focos aditivos e conduta dependente do maior diâmetro. As alterações difusas, o Doppler e os linfonodos continuam combináveis com qualquer número de imagens nodulares.

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
- [x] 23B3: percentis Doppler Barcelona v2021 e barreiras contra falsa normalidade.
- [x] 23B4: auditoria ponta a ponta do iOS nos exames obstétricos, com foco no morfológico do segundo trimestre.
- [x] 23B5: cervicometria e crescimento fetal opção por opção, com paridade web/API/iOS.

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

## Entrega 23B3 — percentis Doppler Barcelona v2021

O motor compartilhado passou por comparação literal com o `calc.js` vigente da Calculadora v2021 da Fetal Medicine Barcelona. Permanecem versionadas as equações de IP da artéria umbilical, artéria cerebral média, média das artérias uterinas e relação cerebroplacentária; o ducto venoso, que não era calculado pelo núcleo, foi incorporado. Artérias uterinas são aceitas entre 11 e 44 semanas; umbilical, cerebral média, relação cerebroplacentária e ducto venoso entre 20 e 44 semanas. Sem idade gestacional válida, o sistema não inventa percentil.

A conversão de Z-score agora reproduz os intervalos discretos usados pela calculadora oficial. O percentil 95 exato permanece dentro do limite e o primeiro valor acima dele passa a percentil 96; na cauda inferior, o percentil 5 exato permanece no limite e o primeiro valor abaixo passa a percentil 4. Resultados extremos são apresentados como `<P1` e `>P99`, sem arredondar um resultado patológico de volta para P5 ou P95.

Foi removido o corte bruto fixo de IP umbilical igual a 1,5. Esse corte produzia falsa classificação porque o mesmo IP tem significado diferente conforme a idade gestacional: IP 1,8 está abaixo do p95 em 20 semanas e acima do p95 em 30 semanas. A barreira de segurança agora só classifica a artéria umbilical por percentil informado, idade gestacional válida ou alteração diastólica explícita. Sem esses elementos, conserva o valor e evita afirmar normalidade ou anormalidade.

O corpo do laudo passou a mostrar, quando disponíveis, os percentis de umbilical, cerebral média, ducto venoso, média das uterinas e relação cerebroplacentária. ACM abaixo do p5, RCP abaixo do p5 e ducto venoso acima do p95 produzem conclusões próprias e eliminam o perfil hemodinâmico falsamente normal. P5 e P95 exatos não são tratados como patológicos.

No iOS, as tabelas semanais duplicadas foram retiradas do caminho de cálculo. O cliente usa as mesmas equações Barcelona, considera semanas e dias e passou a extrair/calcular também o IP do ducto venoso. A calculadora isolada do ducto venoso deixou a aproximação antiga e adotou média `0,903 − 0,0116 × IG`, desvio-padrão `0,1483`, faixa de 20 a 44 semanas e limite superior estrito de Z maior que 1,645.

O motor FMF de pré-eclâmpsia não foi alterado nesta entrega. O núcleo compartilhado mais recente utilizado pela web continua sendo a referência; o iOS permanece cliente validado por equivalência, sem reimplementar ou modificar coeficientes.

Referências de conferência: [Calculadora v2021 da Fetal Medicine Barcelona](https://fetalmedicinebarcelona.org/calc/), [`calc.js` oficial](https://fetalmedicinebarcelona.org/calc/js/calc.js) e [Gómez et al., 2008 — referências de Doppler das artérias uterinas](https://pubmed.ncbi.nlm.nih.gov/18457355/).

- [x] Equações oficiais comparadas com o código-fonte vigente da calculadora Barcelona.
- [x] Limites exatos P5/P95 e caudas `<P1`/`>P99` cobertos por testes.
- [x] Ducto venoso integrado ao núcleo compartilhado, web, API, mobile e iOS.
- [x] Corte fixo inadequado da artéria umbilical removido.
- [x] Percentis renderizados no corpo e alterações coerentes na conclusão.
- [x] Idade gestacional completa, com semanas e dias, utilizada nos clientes.
- [x] Regressões de Doppler isolado e combinado, extração e guards clínicos aprovadas.
- [x] Typecheck dos oito pacotes e builds de produção da web e API aprovados.
- [x] iOS: 15 testes focados de cálculo e parser aprovados, sem falhas.

O comando genérico `pnpm test` continua sem tarefas cadastradas no Turbo e, portanto, não é usado como evidência clínica. O `pnpm lint` continua bloqueado pelo assistente interativo legado do `next lint`; typecheck, builds e as suítes manuais/diferenciais específicas foram executados separadamente.

### Arquivos da entrega 23B3 — monorepo

- `packages/shared/src/calculators/doppler.ts`
- `apps/web/src/lib/catalog/dopplerParaCatalogo.ts`
- `apps/mobile/src/shared/calculators/doppler.ts`
- `apps/mobile/src/features/generate/DopplerCalculatorSheet.tsx`
- `apps/api/src/server/pipeline/dopplerOverlay.ts`
- `apps/api/src/server/renderer/categories/dopplerObstetricoModule.ts`
- `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts`
- `apps/api/src/server/pipeline/__tests__/dopplerUmbilicalSafety.manual.ts`
- `apps/api/src/server/pipeline/__tests__/dopplerBrainSparing.manual.ts`
- `apps/api/src/server/renderer/__tests__/doppler-obstetrico-golden.manual.ts`
- `apps/api/src/server/renderer/__tests__/contrato-extracao-obstetrica.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/flags-de-producao.manual.ts`
- `tests/doppler-barcelona/runner.ts`

### Arquivos da entrega 23B3 — aplicativo iOS

- `LaudoUSG/Services/DopplerCalculator.swift`
- `LaudoUSG/Services/DopplerPercentileTable.swift`
- `LaudoUSG/Services/DuctoVenosoCalculator.swift`
- `LaudoUSG/Services/DopplerParser.swift`
- `LaudoUSG/Components/Sheets/DuctoVenosoCalculatorSheet.swift`
- `LaudoUSG/Features/Generate/GenerateViewModel.swift`
- `LaudoUSGTests/DopplerParserTests.swift`
- `LaudoUSGTests/DopplerRawPercentileTests.swift`

## Sprint 23B4 — auditoria obstétrica ponta a ponta do iOS

O aplicativo iOS é o cliente principal deste corte. A validação começa na categoria escolhida pelo médico, atravessa o JSON enviado pelo aplicativo, o roteamento da API, a extração estruturada e os renderers Clássico e Objetivo. O caso de regressão prioritário é o morfológico do segundo trimestre, que precisa manter título, trimestre e conteúdo próprios mesmo quando o ditado contém biometria, Doppler, cervicometria ou achados adicionais.

O modelo normal continua economizando cliques, mas uma alteração nunca pode conviver com a normalidade incompatível do mesmo sistema. Dados clínicos que não possuem estado normal explícito ou que não foram extraídos — vitalidade, movimentos, vasos do cordão, placenta e líquido — não podem ser inventados pelo renderer. Ausência de medida pode gerar campo editável no modelo, mas não pode ser interpretada como resultado normal.

Critérios de aceite:

- [x] `OBSTETRICA`, `MORFOLOGICO` e `DOPPLER_OBSTETRICO` saem do iOS com a categoria exata selecionada.
- [x] Morfológicos de primeiro, segundo e terceiro trimestres mantêm o ramo correto na API.
- [x] Morfológico do segundo trimestre não é rebaixado para obstétrica simples nem convertido em Doppler isolado.
- [x] Alteração anatômica substitui a normalidade do mesmo sistema no corpo e aparece na conclusão quando o médico fornece a síntese diagnóstica.
- [x] Vitalidade, movimentos, cordão, placenta e líquido não são afirmados como normais sem estado ou dado correspondente.
- [x] Cervicometria, Doppler e crescimento fetal permanecem complementos do mesmo morfológico e entram nas seções corretas.
- [x] Estilos Clássico e Objetivo preservam o mesmo significado clínico.
- [x] Matriz automatizada cobre entrada do iOS, roteamento e renderização, incluindo combinações e dados ausentes.

## Entrega 23B4 — morfológico seguro no fluxo iOS

O iOS passou a ter testes de contrato para as três categorias obstétricas, os três trimestres morfológicos e os complementos. Na API, o morfológico deixou de completar silenciosamente apresentação cefálica, vitalidade, movimentos, cordão de três vasos, líquido normal, placenta normal e survey anatômico normal. A versão web continua rápida porque esses estados permanecem explicitamente pré-marcados no formulário.

Uma alteração por sistema agora retira somente a frase normal incompatível, preserva os demais sistemas efetivamente avaliados e usa `itens_conclusao_livres` para a síntese diagnóstica. Cervicometria, Doppler e crescimento fetal continuam dentro do mesmo laudo morfológico, em seções próprias.

Validações executadas:

- `pnpm validate:clinical-review:23b4`: 65 verificações clínicas e 15 casos de roteamento aprovados.
- Regressões morfológicas, IG, Golf Ball, Doppler e cervicometria aprovadas.
- `pnpm typecheck`: oito pacotes aprovados.
- Builds de produção da API e da web aprovados.
- Suíte integral do iOS: 58 testes, 55 aprovados, três testes WHO já documentados como pendentes e ignorados, sem falhas.

Arquivos centrais:

- `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`
- `apps/api/src/server/renderer/__tests__/morfologico-23b4-ios-clinical-matrix.manual.ts`
- `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/morfologico.ts`
- `LaudoUSGTests/ObstetricGenerationContractTests.swift` no projeto iOS.

## Sprint 23B5 — cervicometria e crescimento fetal

A cervicometria isolada e complementar continua seguindo o modelo normal da plataforma: ao selecionar o exame, o orifício interno entra como fechado mesmo quando o médico não o dita, e a medida ausente permanece como placeholder editável. A redação do comprimento foi tornada estritamente descritiva: de 2,0 a 2,4 cm entra como comprimento cervical reduzido e abaixo de 2,0 cm como acentuadamente reduzido. O laudo não transforma sozinho a medida em recomendação terapêutica ou risco individual, que dependem da idade gestacional, história obstétrica e contexto clínico.

O crescimento fetal permanece baseado no protocolo Fetal Growth Defects da Fetal Medicine Barcelona, versão de novembro de 2024. PIG exige percentil entre 3 e 10 com avaliação completa e normal de umbilical, ACM, RCP e uterinas. Os fluxos categóricos seguem o padrão normal da plataforma quando o médico não relata alteração; dados numéricos indispensáveis continuam como placeholder até serem preenchidos. Para fechar os estágios II e III por fluxo umbilical ausente ou reverso, agora são exigidos conjuntamente mais de 50% dos ciclos nas duas artérias e a repetição no intervalo protocolar. Uma única dessas confirmações mantém o critério pendente.

O bloco de laudo passou a explicitar o percentil, a curva informada e os critérios confirmados, além das pendências. Isso permite que a inserção feita pela calculadora do iOS carregue dados clínicos verificáveis para a geração, em vez de enviar apenas a classificação final. Web, React Native e iOS mantêm o fluxo presente/normal como padrão e só substituem essa redação quando o médico informa uma alteração.

Critérios de aceite:

- [x] OI fechado permanece como padrão na cervicometria isolada e complementar.
- [x] Medida cervical ausente permanece como placeholder e nunca fecha normalidade pelo comprimento.
- [x] Comprimento reduzido é descrito sem prescrição ou estratificação individual automática.
- [x] Fluxos categóricos preservam o padrão normal; medidas ausentes permanecem como placeholder.
- [x] Estágios II/III exigem extensão em mais de 50% dos ciclos nas duas artérias e repetição temporal.
- [x] Percentil, curva, critérios confirmados e pendências entram no bloco do laudo.
- [x] Paridade do núcleo TypeScript e do port Swift coberta por regressões focadas.
- [x] Cervicometria funciona isolada e como complemento obstétrico, morfológico e Doppler.

Arquivos centrais no monorepo:

- `packages/shared/src/calculators/fetalGrowth.ts`
- `apps/api/src/server/renderer/categories/CERVICOMETRIA.ts`
- `apps/api/src/server/renderer/categories/fetalGrowthModule.ts`
- `apps/web/src/lib/catalog/fetalGrowthParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/dopplerObstetrico.ts`
- `apps/mobile/src/features/generate/FetalGrowthCalculatorSheet.tsx`
- `tests/fetal-growth/runner.ts`

Arquivos centrais no iOS:

- `LaudoUSG/Services/FetalGrowthCalculator.swift`
- `LaudoUSG/Components/Sheets/FetalGrowthCalculatorSheet.swift`
- `LaudoUSGTests/FetalGrowthCalculatorTests.swift`

Validações executadas:

- `pnpm validate:clinical-review:23b5`: crescimento fetal, 37 verificações de cervicometria, 35 verificações de integração e travessias obstétrica/morfológica aprovadas.
- `pnpm typecheck`: oito pacotes aprovados.
- Builds de produção da API e da web aprovados.
- Suíte integral do iOS: 58 testes executados, 55 aprovados e três testes WHO já documentados como pendentes e ignorados, sem falhas.
- Referências clínicas: [Fetal Growth Defects — Fetal Medicine Barcelona, novembro de 2024](https://fetalmedicinebarcelona.org/wp-content/uploads/2024/11/FETAL-GROWTH-DEFECTS.pdf) e [SMFM Consult Series #70 — Management of short cervix, 2024](https://publications.smfm.org/publications/560-society-for-maternal-fetal-medicine-consult-series-70/).

## Ajuste paralelo — esquema visual das mamas

A região retroareolar passou a ser tratada como localização própria no esquema, inclusive após arrastar o marcador para junto do mamilo. A legenda diferencia cisto, nódulo, margem lobulada, margem espiculada e calcificações. Em “Cistos múltiplos”, o achado principal continua sendo o único descrito no laudo; o médico pode acrescentar e reposicionar cistos extras apenas no desenho. Esses marcadores visuais não criam novos achados, não alteram BI-RADS e são removidos automaticamente se o achado de cistos múltiplos deixar de existir.

## Sprint 23C1 — tireoide e classificações nodulares

Critérios de aceite:

- [x] ACR TI-RADS usa os cinco grupos oficiais, sem derivar composição ou ecogenicidade da Nota de Domingos.
- [x] Focos ecogênicos compatíveis podem ser somados; “nenhum/cauda de cometa” é exclusivo dos demais.
- [x] PAAF e seguimento respeitam categoria e maior diâmetro, sem recomendar intervenção quando a medida está ausente.
- [x] Nota de Domingos continua disponível como classificação independente e nunca é rotulada como ACR.
- [x] Ecotextura heterogênea selecionada em qualquer lobo substitui a normalidade correspondente no corpo e na conclusão.
- [x] Medidas ausentes permanecem como placeholders; estados categóricos normais permanecem como defaults.
- [x] Nódulo, tireoidopatia difusa, Doppler e linfonodos podem coexistir sem repetição ou conclusão normal incompatível.
- [x] Clássico e Objetivo preservam o mesmo achado e a mesma categoria ACR.
- [x] Web, React Native e iOS usam os mesmos pontos e limiares do ACR TI-RADS.
- [x] Matriz clínica cobre normal, alteração isolada, combinação no mesmo órgão e combinação entre módulos.

## Entrega 23C1 — tireoide e classificações nodulares

O formulário web agora coleta os cinco grupos próprios do ACR TI-RADS — composição, ecogenicidade, forma, margem e focos ecogênicos — sem reaproveitar os seis eixos da Nota de Domingos. As duas classificações continuam disponíveis, mas são calculadas separadamente e identificadas pelo nome correto. Focos ecogênicos compatíveis são cumulativos; “nenhum/cauda de cometa” deixa de coexistir com um foco real.

O corpo do laudo descreve as características ACR quando elas são a informação disponível, sem chamar automaticamente um nódulo misto de sólido. Clássico e Objetivo chegam à mesma categoria. A conduta opcional utiliza o maior eixo e os limiares oficiais de PAAF ou acompanhamento, incluindo os intervalos de controle; sem medida, o sistema não inventa recomendação. Medidas ausentes do exame e do Doppler continuam como placeholders, conforme o padrão da plataforma.

A seleção de ecotextura heterogênea de um lobo passou a atravessar o adaptador da web e retirar as frases normais incompatíveis. Nódulo, alteração difusa, Doppler e linfonodo alterado foram testados simultaneamente. A avaliação linfonodal normal permanece como default do exame de tireoide.

Web, React Native e iOS passaram a somar múltiplos focos ecogênicos. A calcificação periférica vale dois pontos nos três clientes. O iOS ganhou regressões próprias para pontuação máxima, exclusividade de “nenhum”, categorias e limites de conduta.

Arquivos centrais no monorepo:

- `apps/api/src/server/renderer/categories/TIREOIDE.ts`
- `apps/api/src/server/renderer/__tests__/tireoide-23c1-clinical-matrix.manual.ts`
- `apps/api/src/server/renderer/__tests__/tireoide-objetivo-golden.manual.ts`
- `apps/web/src/components/laudar/TireoideFormPanel.tsx`
- `apps/web/src/lib/catalog/tireoideParaCatalogo.ts`
- `apps/web/src/lib/calculators/tiRads.ts`
- `apps/mobile/src/shared/calculators/tirads.ts`
- `apps/mobile/src/features/generate/TIRADSCalculatorSheet.tsx`

Arquivos centrais no iOS:

- `LaudoUSG/Services/TIRADSCalculator.swift`
- `LaudoUSG/Components/Sheets/TIRADSCalculatorSheet.swift`
- `LaudoUSGTests/TIRADSCalculatorTests.swift`

Validações executadas:

- `pnpm validate:clinical-review:23c1`: 29 verificações da matriz clínica e 36 regressões do laudo Objetivo aprovadas.
- Prova ponta a ponta do catálogo e 12 regressões da política de placeholders do Doppler aprovadas.
- `pnpm typecheck`: oito pacotes aprovados.
- Builds de produção da API e da web aprovados.
- Testes focados do iOS: três testes aprovados, sem falhas.
- O comando geral `pnpm test` não possui tarefas cadastradas; a validação real desta entrega é a matriz clínica e os testes focados acima. O `pnpm lint` continua bloqueado pela configuração interativa antiga do Next nos três apps e não foi contado como aprovado.
- Referências: [ACR TI-RADS](https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/TI-RADS), [atlas oficial do ACR TI-RADS](https://www.acr.org/-/media/ACR/Files/RADS/TI-RADS/ACR-TI-RADS-Atlas.pdf) e [protocolos de ultrassonografia do CBR](https://cbr.org.br/wp-content/uploads/2025/11/Protocolos-de-Ultrassonografia_2025.pdf).

## Sprint 23C2 — mamas e axilas

O formulário de mamas passou a expor os tipos já compreendidos pelo renderer canônico: cisto simples, cistos múltiplos, microcistos agrupados, cisto complicado, nódulo sólido, linfonodo intramamário, calcificações, achado não nodular, ginecomastia e próteses. Ecotextura, descritores, medidas, localização, distâncias, elastografia e vascularização atravessam o adaptador sem virar texto solto ou desaparecer silenciosamente.

O Doppler é um complemento opcional do exame. Quando selecionado, entra na técnica e permite descrever a vascularização de cada achado; quando não selecionado, não é citado. As axilas continuam normais por padrão, mas o estado alterado agora permite registrar lado, forma, hilo gorduroso, espessura cortical e medidas antes da descrição livre.

A avaliação BI-RADS final permanece responsabilidade do médico. A sugestão interna pode auxiliar a interface, porém não entra no laudo até ser confirmada. O renderer preserva a categoria explicitamente ditada ou selecionada e não converte automaticamente um conjunto parcial de descritores em avaliação diagnóstica.

Critérios de aceite:

- [x] Todos os tipos mamários do contrato canônico estão disponíveis na tela.
- [x] Ecotextura fibroglandular e adiposa não repetem “homogênea”.
- [x] Medidas não informadas continuam como placeholders editáveis.
- [x] BI-RADS sugerido não entra no laudo sem confirmação médica.
- [x] Doppler mamário é opcional e sua vascularização não altera BI-RADS.
- [x] Axilas normais permanecem como padrão; alteração estruturada substitui a normalidade.
- [x] Exames de mamas, mamas e axilas, axilas isoladas, mama masculina e próteses usam o mesmo módulo.
- [x] Clássico e Objetivo preservam os mesmos achados.
- [x] Matriz clínica e regressões anteriores aprovadas.

Validações executadas:

- `pnpm validate:clinical-review:23c2`: seis cenários novos, 35 regressões clássicas, 25 regressões objetivas e a travessia ponta a ponta aprovados.
- Typecheck isolado da API e da web aprovado.
- Referências: [BI-RADS do ACR](https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/BI-RADS), [requisitos de laudo mamário do ACR](https://accreditationsupport.acr.org/support/solutions/articles/11000067043-reporting-breast-ultrasound) e [normatização de ultrassonografia do CBR](https://cbr.org.br/normatizacao-de-exames-de-ultrassonografia/).

## Sprint 23C3 — pelve feminina e anexos

O exame ginecológico passou a reunir no mesmo módulo a rotina pélvica, o complemento com Doppler, a monitorização folicular e a avaliação pós-abortamento. A finalidade escolhida ajusta título, técnica e conteúdo, sem criar categorias duplicadas. O Doppler só entra quando selecionado e só descreve vascularização efetivamente informada.

O útero permite registrar até três miomas individualizados, com medidas, parede, classificação e categoria FIGO. Istmocele e cistos de Naboth também ficaram estruturados. O endométrio passou a distinguir pólipo, espessamento, sinéquia e conteúdo cavitário, preservando medida e vascularização; descrições livres anteriores continuam aceitas e agora substituem a conclusão normal incompatível. O DIU diferencia posição habitual e deslocamento, e líquido livre e produtos retidos permanecem achados explícitos.

Os ovários passaram a cobrir cistos simples e complexos, endometrioma, imagem funcional, morfologia policística, teratoma maduro, hidrossalpinge, cisto paraovariano, lesão sólida e achado livre. A categoria O-RADS só é publicada quando confirmada pelo médico; o sistema não transforma descritores parciais em estratificação diagnóstica. Na monitorização folicular, os diâmetros de cada ovário são preservados e resumidos no laudo.

Critérios de aceite:

- [x] Rotina, Doppler, monitorização folicular e pós-abortamento usam o mesmo módulo.
- [x] Dados categóricos normais permanecem predefinidos e medidas ausentes permanecem como placeholders.
- [x] Até três miomas atravessam o formulário com localização, medidas e FIGO.
- [x] Alteração endometrial estruturada ou livre substitui a conclusão normal incompatível.
- [x] DIU, istmocele, cistos de Naboth, líquido livre e produtos retidos são preservados.
- [x] O-RADS entra somente após confirmação explícita do médico.
- [x] Doppler é opcional e não cria classificação automática.
- [x] Clássico e Objetivo preservam os mesmos achados.
- [x] Matriz clínica e regressões anteriores aprovadas.

Validações executadas:

- `pnpm validate:clinical-review:23c3`: oito cenários novos, 60 regressões clássicas, 39 regressões objetivas e a travessia ponta a ponta aprovados.
- `pnpm typecheck`: oito pacotes aprovados; builds de produção da API e da web aprovados.
- O comando geral `pnpm test` não possui tarefas cadastradas. O `pnpm lint` continua bloqueado pela configuração interativa antiga do Next nos três apps e não foi contado como aprovado.
- Referências: [O-RADS US do ACR](https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/O-RADS/Ultrasound), [conceitos oficiais do O-RADS US v2022](https://cs.acr.org/-/media/ACR/Files/RADS/O-RADS/O-RADS--US-v2022-Governing-Concepts-only.pdf) e [normatização de ultrassonografia do CBR](https://cbr.org.br/normatizacao-de-exames-de-ultrassonografia/).

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
