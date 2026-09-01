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
- [ ] Demais opções do abdome ainda serão percorridas na Sprint 23A.

## Arquivos desta primeira entrega

- `apps/web/src/lib/catalog/abdomeParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/figado.ts`
- `apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/extraction.ts`
- `apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts`
- `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/__tests__/abdomen-hepatopatia-cronica.manual.ts`
- `docs/plano-produto-web-sprints-15-22-2026-08-31.md`
- `docs/stories/2026-09-01-sprint-23-auditoria-clinica-categorias.md`
