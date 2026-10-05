# Síntese — preflights de 05/10/2026

Rodada sem navegador: a extensão de navegador não estava disponível e o usuário escolheu seguir apenas com preflights no repositório. Nada do Laudário foi observado além do catálogo. Por isso não há caso funcional novo e o status, a fila e a contagem de cobertura (23/84) **não foram alterados**.

Base: worktree `docs/laudario-preflights-2026-10-05` em `4d5ad45`, com os MVPs Web estruturados recentes. Checkout `main` intocado. Sem commit nem push.

## Arquivos desta rodada

| Exame | Arquivo | Situação no LaudoUSG |
| --- | --- | --- |
| Doppler de artérias temporais | `audits/preflight-doppler-arterias-temporais-2026-10-03.md` (seção “Reconferência — 05/10/2026”) | ausente nas três plataformas — gap confirmado por busca |
| Doppler de artérias mesentéricas | `audits/preflight-doppler-arterias-mesentericas-2026-10-05.md` | ausente nas três plataformas — gap confirmado por busca |
| Doppler de carótidas e vertebrais | `audits/preflight-doppler-carotidas-vertebrais-2026-10-05.md` | Web estruturado ativo (contrato local); Android/RN e iOS genéricos |
| Pélvico transvaginal (+ nota “com Doppler”) | `audits/preflight-pelvico-transvaginal-2026-10-05.md` | Web estruturado ativo; Android/RN e iOS genéricos; Doppler pélvico parcial |
| Obstétrico 2º/3º trimestre | `audits/preflight-obstetrico-2-3-trimestre-2026-10-05.md` | Web estruturado ativo (feto único); Android/RN e iOS genéricos com calculadoras locais |

Carótidas, pélvico e obstétrico entraram porque são categorias de alto uso já expostas na Web, ainda sem estudo funcional, e os preflights revelaram defeitos que não dependem do concorrente.

## Achados de maior risco (independentes do concorrente)

Todos são `defeito confirmado no código` ou `inferido`, conforme marcado. Nenhum foi corrigido nesta rodada.

1. **Conclusão normal com achado no corpo — carótidas.** Com classificação “normal”, a conclusão ignora placas, velocidades, vertebral retrógrada e `achados_adicionais` (`apps/api/src/server/renderer/categories/DOPPLER_CAROTIDAS.ts:219`, `:241`). A Web nasce com `classificacao: 'normal'` e vertebral anterógrada (`apps/web/src/lib/deterministic/organs/dopplerCarotidas.ts:9`, `:18`). Uma placa com estenose informada pode sair com conclusão normal se o médico não trocar a classificação (`inferido`, falta teste).
2. **Endométrio normal sem medida — pélvico.** A frase padrão afirma espessura normal para a fase do ciclo mesmo sem medida, e em menopausa afirma normalidade para a faixa etária qualquer que seja a espessura (`apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:763-778`). O alerta de endométrio espessado pós-menopausa só existe na checagem de sanidade.
3. **Gemelar com líquido sempre normal — obstétrico.** Com MBV por feto, a conclusão declara quantidade normal para ambos os fetos sem avaliar os valores (`apps/api/src/server/renderer/categories/OBSTETRICA.ts:965-971`).
4. **Três autoridades sobre crescimento fetal.** O snippet do writer conclui PIG ou RCF com PFE entre p3 e p10 sem Doppler (`packages/knowledge/snippets/OBSTETRICA/conclusao/peso-fetal-percentil.md:24-31`), enquanto `packages/shared/src/calculators/fetalGrowth.ts:10` exige Doppler completo e normal para PIG. PFE e percentil usam fórmulas diferentes entre Web e apps. O cenário PFE < p3 é coerente nos dois (`fetalGrowth.ts:177-178`).
5. **Regras divergentes por caminho.** Menopausa na Web só altera o endométrio, enquanto o ditado também ajusta os ovários. O-RADS 2 é automático no contrato do writer e exige confirmação no renderer.
6. **Roteamento sem destino para exames ausentes.** Um ditado mesentérico classificado com `ABDOM` no código cai em Abdome total com Doppler, cujo núcleo é portal e cujo modelo afirma aorta normal (`apps/api/src/server/pipeline/categoryNormalization.ts:75`). Um ditado de temporais em Carótidas termina com conclusão normal de carótidas. Ambos são `inferido` e precisam de teste com ditado sintético.

## Padrão transversal

Os quatro exames repetem o problema já documentado em aorta e ilíacas, transfontanelar e Doppler venoso de MMSS: **estado inicial normal pré-marcado, sem “não avaliado”, e conclusão que não depende dos achados do corpo.** Os contratos Web MVP recentes de arterial MMII e FAV já resolvem isso com `assessment: not_assessed | evaluated | limited`, pendência de cobertura e `physicianConfirmed` (`packages/shared/src/clinicalModels/dopplerArterialMmii.ts:36-47`, `:110`; `dopplerFistulaAv.ts:31-40`). Esse é o formato a replicar.

## Sugestões clínicas (síntese própria)

Prioridades propostas. Nenhuma é decisão de produto; limiares e frases dependem de fonte própria e revisão médica (estilo Domingos).

**P0 — segurança do laudo**

- Regra global de coerência: todo item da conclusão precisa de base no corpo, e todo achado alterado no corpo precisa aparecer na conclusão ou ser explicitamente dispensado pelo médico. Vale para todos os renderers e para a auditoria do writer.
- Carótidas: a conclusão passa a derivar dos achados por lado. Classificação “normal” com placa, estenose ou vertebral anormal gera pendência bloqueante.
- Pélvico: endométrio sem medida não recebe adjetivo de normalidade; em menopausa, a frase depende da espessura medida e do uso de terapia hormonal, quando informado.
- Obstétrico gemelar: classificar o líquido por feto e nunca resumir “ambos normais” sem avaliar cada valor.
- Crescimento fetal: uma única autoridade no shared (`fetalGrowth.ts`). O snippet do writer deve obedecer à mesma trava e pedir Doppler antes de PIG; a escolha clínica é do Luiz.

**P1 — estrutura e paridade**

- Estado `não avaliado / avaliado / limitado` por estrutura em carótidas (por vaso e lado), pélvico (ovário não visualizado, histerectomia, ooforectomia) e obstétrico (apresentação, anatomia, placenta e líquido), sem normalidade pré-marcada.
- Classificação de estenose carotídea por lado, separando ACI de ACC na oclusão.
- PFE e percentil num cálculo único no shared, com fórmula e curva explícitas; os apps deixam de inserir o resultado como texto livre.
- `status_hormonal` único para pélvico, histerossonografia, HyCoSy e endometriose.
- Faixas de plausibilidade de unidade: EMI em mm, distância placenta–OI numa única unidade, velocidades em cm/s.

**P2 — categorias novas (gap confirmado)**

- `DOPPLER_ARTERIAS_TEMPORAIS` (nome a confirmar): grade lado × ramo, halo como campo próprio (sem reaproveitar o de tireoide), espessura de parede em mm, compressão em três estados, contexto de corticoide e hipótese de vasculite só com confirmação.
- `DOPPLER_MESENTERICO` (nome a confirmar): tronco celíaco, AMS e AMI por estado, fase jejum/pós-prandial, VPS/VDF com aorta de referência, estenose com confirmação, variação respiratória opcional e limitação por preparo.
- Enquanto não existirem, criar pendência quando termos desses exames aparecerem em Carótidas ou Abdome com Doppler, sem redirecionar o laudo sozinho.

## Próxima sequência quando houver navegador

Mantém o limite de um exame e três cenários por rodada. A ordem prioriza o que já tem preflight e maior valor para a Web.

| Ordem | Exame | Prova mínima | Pergunta-chave para o concorrente |
| --- | --- | --- | --- |
| 1 | Doppler de artérias temporais | normal; halo unilateral frontal direito; lado esquerdo não avaliado | a conclusão restringe o escopo e exige confirmação para vasculite? |
| 2 | Doppler de artérias mesentéricas | normal; estenose de AMS com VPS sintética; AMI não visualizada | há fase pós-prandial e “não avaliado” por vaso? |
| 3 | Doppler de carótidas e vertebrais | normal; estenose de ACI direita com VPS/VDF sintéticas; vertebral esquerda invertida ou limitada | a conclusão acompanha os achados por lado? |
| 4 | Pélvico transvaginal | normal na menacme; endométrio espessado pós-menopausa ou cisto ovariano unilateral; ovário não visualizado | como trata menopausa, ausência de medida e ovário não visto? |
| 5 | Obstétrico 2º/3º trimestre | normal de 28 semanas; PFE < p10 com líquido reduzido; apresentação pélvica com placenta baixa | PIG/RCF depende de Doppler? há “não avaliado” na anatomia? |
| 6 | Aparelho urinário com Doppler | normal; alteração unilateral; escopo incompleto | compõe o contrato renal ou é categoria própria? |
| 7 | Monitorização folicular | ciclo basal; folículo dominante; dados incompletos | o que reaproveita de pélvico? |
| 8 | Morfológico de 3º trimestre | normal; biometria discordante; limitação | variante ou contrato próprio? |

Depois: cervicometria, cervical com Doppler, ecocardiografia fetal gemelar e o primeiro exame combinado.

## Pendências para o orquestrador

- Os itens P0 acima são defeitos do LaudoUSG e podem seguir para correção sem esperar o concorrente; precisam de story e revisão médica.
- Antes de mesclar estes documentos na `main`, decidir se o status deve registrar preflights separadamente dos estudos funcionais.
- Repetir a verificação de `RENDERER_CATEGORIES` em produção: carótidas, pélvico e obstétrico usam renderers no ditado somente com esse gate.
