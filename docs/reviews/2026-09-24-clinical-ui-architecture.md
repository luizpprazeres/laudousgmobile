# Diagnóstico arquitetural — evolução da interface clínica

Data: 2026-09-24

## Veredito executivo

O caminho seguro não é acrescentar opções diretamente nos cards existentes. Hoje a tela, os adaptadores e os renderizadores representam bexiga e rins com vocabulários diferentes por categoria. Isso já produz perda de informação: a Pelve feminina mostra uma bexiga normal, mas seu adaptador ignora o estado desse card e o contrato da API não possui campo de bexiga. A primeira implementação deve, portanto, unificar o domínio de bexiga e rins e só depois ampliar achados.

O gate arquitetural é GO para uma etapa pequena de contratos, adaptadores, renderizadores e testes urinários. É NO-GO para introduzir em uma única entrega todas as opções vistas nas referências, combinações arbitrárias de exames, elastografia, gordura hepática, novos templates MSK e classificação mamária automática. Essas frentes dependem de curadoria clínica e contratos próprios.

Este diagnóstico é de código local. Não consulta nem altera banco remoto, não comprova flags ou comportamento de produção e não usa o README histórico como evidência de configuração atual.

## Fluxo atual confirmado

| Camada | Caminho | Responsabilidade atual |
|---|---|---|
| Estado da tela | `apps/web/src/components/laudar/LaudarWebExperience.tsx:450` | Escolhe um adaptador por categoria e mantém cada exame em uma chave separada. |
| Adaptador | `apps/web/src/lib/catalog/*ParaCatalogo.ts` | Converte o estado genérico `Record<string, unknown>` no contrato canônico da categoria. |
| Disparo | `apps/web/src/lib/catalog/useLaudoCanonico.ts:64` | Debounce de 400 ms, bloqueio por pendências e proteção contra resposta fora de ordem. |
| Proxy autenticado | `apps/web/src/app/api/catalog/[category]/render/route.ts:26` | Verifica usuário, busca estilo da conta e chama a API com token de serviço. |
| API canônica | `apps/api/src/app/api/catalog/[category]/render/route.ts:45` | Valida categoria, estilo, alterações e dados; retorna 400/409 em vez de remendar conflito. |
| Renderização | `apps/api/src/server/renderer/catalog/alteracoes.ts` e renderizadores de categoria | Valida o schema da categoria e monta corpo, conclusão e classificações. |

Todas as categorias analisadas estão na allowlist de `apps/web/src/lib/catalog/migradas.ts:29`. Nessas categorias a web falha fechada: não existe fallback silencioso para o compositor local. Essa propriedade precisa ser preservada.

## Bexiga: quatro modelos para o mesmo órgão

| Categoria | Estado web | Transporte/API | Comportamento confirmado |
|---|---|---|---|
| Abdome total | `apps/web/src/lib/deterministic/organs/bexigaAbdome.ts:3` | `apps/web/src/lib/catalog/abdomeParaCatalogo.ts:379` projeta a bexiga como `OrganState.achados` genéricos de Abdome | Repleção, parede, conteúdo, volume pré-miccional, espessura e resíduo. O renderer reclassifica texto livre por regex. |
| Vias urinárias | `apps/web/src/lib/deterministic/organs/viasUrinarias.ts:328` | `apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts:106` envia `BexigaSchema` próprio | Contrato mais estruturado, mas parede e conteúdo ainda são strings livres. Não inclui divertículo na tela. |
| Próstata suprapúbica | `apps/web/src/lib/deterministic/organs/prostataSuprapubica.ts:65` | `apps/web/src/lib/catalog/prostataParaCatalogo.ts:39` envia campos planos | Achados são condensados em uma string; resíduo tem estado não informado/desprezível/valor. |
| Pelve feminina | `apps/web/src/lib/deterministic/organs/pelveFeminina.ts:79` | `apps/web/src/lib/catalog/pelveParaCatalogo.ts:166` não lê a seção | `PelveFemininaFindingsSchema` não possui bexiga (`apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:83`). Nas vias com componente transabdominal, o renderer escreve bexiga normal de forma fixa (`:997` e `:1063`). |

O teste `apps/api/src/server/renderer/catalog/__tests__/pelve-ponta-a-ponta.manual.ts:207` documenta explicitamente que a chave `estado` da bexiga fica fora do adaptador. Portanto, permitir alterações no card de Pelve sem mudar contrato e renderer faria o médico clicar em um achado que desaparece do laudo.

O inventário visual em `docs/reviews/2026-09-24-screenshot-inventory.md` identifica opções adicionais de repleção, esvaziamento, jatos, ureterocele, massa e outros achados. Ele é referência de cobertura de interface, não autoridade clínica nem texto a copiar. A implementação inicial deve manter somente o conjunto local já suportado e criar extensibilidade tipada para a curadoria posterior.

## Rins: aparência bilateral, estado e contratos separados

O Abdome usa a fábrica `apps/web/src/lib/deterministic/organs/rim.ts:152`, com chaves como `dimensoes`, `diferenciacao`, `litiase`, `dilatacao`, `cistos` e `lesoes`. Vias urinárias reimplementa a fábrica em `apps/web/src/lib/deterministic/organs/viasUrinarias.ts:118`, com chaves diferentes: `dimensao`, `estrutura`, `hidronefrose`, `achados` e `alteracao_difusa`.

No backend, Vias urinárias tem `RimSchema` estruturado em `apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts:90`. Abdome usa o envelope genérico `OrganStateSchema` e `FindingSchema` em `apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts:32`. O agrupamento visual bilateral não resolve essa divergência: os dois lados devem continuar com identidades `rim_direito` e `rim_esquerdo`, porque lateralidade, reset isolado e conclusões dependem delas.

O menor desenho seguro é um domínio compartilhado com uma fábrica por lado e projeções explícitas por categoria. Não se deve fundir os dois rins em um único estado nem alterar os ids persistidos. O card pode ser conjunto; o contrato clínico permanece bilateral.

## BI-RADS: sugestão e decisão médica são estados diferentes

O adaptador mamário envia `birads_ditado` e fixa `permitir_birads_calculado: false` em `apps/web/src/lib/catalog/mamariaParaCatalogo.ts:182` e `:250`. O renderer respeita essa precedência em `apps/api/src/server/renderer/categories/MAMARIA.ts:290`: BI-RADS ditado vence; cálculo só entra quando explicitamente permitido. O guard existente apenas sinaliza revisão e nunca muda a categoria (`:295`).

O A/B histórico em `scratchpad/validacao-birads-AB.md` foi NO-GO: o bloco por prompt acertou o roteamento, mas não entregou BI-RADS final correto em nenhum dos três casos e introduziu uma classificação indevida. Portanto, qualquer sugestão futura deve ser uma função determinística pura, exibida como “sugerida”, com razões e lacunas; somente uma confirmação explícita do médico pode preencher `birads_ditado`. Sugestão nunca deve ser persistida ou enviada como decisão confirmada automaticamente.

Os testes atuais já fixam a separação: `apps/api/src/server/renderer/__tests__/mamaria-golden.manual.ts` verifica que sugestão não vira conclusão sem confirmação e que a confirmação entra no laudo. Esta frente está fora do ownership urinário e não deve ser tocada na próxima etapa.

## Combinações de exames

Não existe um compositor geral de categorias. A rota recebe uma única categoria no path, e `LaudarWebExperience` mantém um documento por `documentKey`. Os casos compostos atuais são específicos: Doppler obstétrico alterna entre renderer isolado e `OBSTETRICA` por `apps/web/src/lib/catalog/dopplerWebMode.ts:11`; Mamária muda o escopo interno entre mamas e axilas; Pelve muda via e modo dentro do mesmo contrato.

Combinações futuras como abdome + próstata ou mamas + axilas + pelve não devem ser modeladas como uma categoria gigante nem por concatenação no navegador. Precisam de uma entidade de sessão composta que contenha componentes independentes, renderize cada categoria pela autoridade atual e aplique uma política determinística de títulos, técnica, ordem e conclusões no servidor. Isso é uma fase própria.

## Musculoesquelético

O backend já aceita múltiplos laudos em `MusculoesqueleticoFindingsSchema.laudos` (`apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:54`) e renderiza um bloco completo por segmento e lado (`:492`). A web, entretanto, oferece um único `segmento` e `lado` e o adaptador envia um array com apenas um item (`apps/web/src/lib/catalog/musculoesqueleticoParaCatalogo.ts:22`). Assim, multiarticular e bilateral já cabem no contrato da API, mas não no modelo de estado da tela.

A evolução correta é tornar a lista de `laudos` editável e criar fábricas tipadas de estruturas tendíneas, bursas, nervos e articulações. Não deve haver dedução de diagnóstico a partir de descrição livre no adaptador. O adapter atual é deliberadamente literal e gera apenas um fechamento topográfico neutro quando falta diagnóstico.

## Implementação mínima segura para bexiga e rins

### Etapa 1 — contrato compartilhado sem ampliar clínica

Criar tipos e schemas compartilhados para `BexigaV1`, `RimV1` e `AchadoRenalV1`. O vocabulário inicial deve ser a união dos achados já suportados localmente, sem importar opções das screenshots ainda não curadas. Medidas devem carregar unidade no nome (`_mm`, `_cm`, `_ml`), ausência deve ser `null`, e lateralidade renal deve vir do contêiner, não ser repetida em cada achado.

Na bexiga, preservar separadamente avaliação/repleção, parede, conteúdo, volume pré-miccional, espessura e resíduo. Não condensar achados em strings. No rim, preservar medidas, espessura, dimensão, diferenciação, posição/rotação, hidronefrose e uma lista tipada de achados focais.

### Etapa 2 — módulos e adaptadores

Manter os ids `bexiga`, `rim_direito` e `rim_esquerdo`. Criar fábricas compartilhadas por contexto, mas manter políticas por categoria: Pelve TV puro omite bexiga; Abdome e Vias descrevem bexiga; Próstata mantém a correlação urológica própria. Os adaptadores devem projetar o mesmo estado para o contrato de cada renderer durante a transição.

Não alterar `OrganFormPanel`, `LaudarWebExperience`, `WorkspaceSectionGrid`, `VisualSchemaPanel`, `MamariaFormPanel` ou os tipos de apresentação que estão em ownership paralelo. A fábrica deve consumir a API de `Field` já existente.

### Etapa 3 — renderizadores

Extrair renderização de bexiga e normalização renal para helpers puros no backend. Cada categoria continua dona da ordem, da técnica e da conclusão. Pelve deve receber `bexiga` no schema e só renderizá-la quando a via incluir avaliação transabdominal. Abdome deve continuar preenchendo a máscara do banco; não se deve trocar essa arquitetura nesta etapa.

Durante a migração, aceitar o formato anterior somente dentro de adapters de compatibilidade testados. Não manter dois renderizadores clínicos vivos para o mesmo payload.

## Arquivos previstos para a próxima atribuição

| Ação | Arquivos |
|---|---|
| Domínio web compartilhado | `apps/web/src/lib/deterministic/organs/bexigaAbdome.ts`, `apps/web/src/lib/deterministic/organs/rim.ts`, `apps/web/src/lib/deterministic/organs/viasUrinarias.ts`, `apps/web/src/lib/deterministic/organs/pelveFeminina.ts`, `apps/web/src/lib/deterministic/organs/prostataSuprapubica.ts` |
| Projeções web | `apps/web/src/lib/catalog/abdomeParaCatalogo.ts`, `apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts`, `apps/web/src/lib/catalog/pelveParaCatalogo.ts`, `apps/web/src/lib/catalog/prostataParaCatalogo.ts` |
| Contratos e helpers API | `apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts`, `apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts`, `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts`, `apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts`, mais novos helpers compartilhados conforme o briefing de implementação |
| Gates | `apps/api/src/server/renderer/catalog/__tests__/abdome-ponta-a-ponta.manual.ts`, `pelve-ponta-a-ponta.manual.ts`, `sprint16a-ponta-a-ponta.manual.ts`, `apps/api/src/server/renderer/__tests__/abdomen-23a2-clinical-matrix.manual.ts`, `vias-urinarias-golden.manual.ts`, `vias-urinarias-objetivo-golden.manual.ts`, `pelve-golden.manual.ts` e testes novos de equivalência compartilhada |

## Matriz mínima de aceitação

| Caso | Prova exigida |
|---|---|
| Bexiga normal | Abdome, Vias e Pelve TA/TA+TV preservam a redação esperada; Pelve TV puro omite o órgão. |
| Repleção insuficiente | Nunca aparece junto com medidas funcionais ou conclusão de normalidade. |
| Parede/conteúdo | Espessamento, trabeculação, debris, cálculo, sonda e divertículo atravessam UI → adaptador → schema → corpo/conclusão sem virar texto genérico silencioso. |
| Resíduo | Unidade e valor permanecem consistentes; ausência não vira zero; “desprezível” continua distinto de valor numérico em Próstata. |
| Rins bilaterais | Alterar um lado não muda o outro; ambos podem ter achados diferentes no mesmo render. |
| Compatibilidade | Estado inicial atual gera laudo normal equivalente nos estilos Clássico e Objetivo. |
| Falha fechada | Enum desconhecido, medida inválida e combinação impossível falham de modo visível; nunca viram laudo normal. |
| Pelve | Um achado vesical marcado deixa de ser descartado pelo adaptador e não é renderizado em TV puro. |

## Lacunas que continuam abertas

Os achados novos vistos nas referências ainda precisam de decisão clínica, redação própria e testes de conflito. Elastografia, quantificação de gordura, recomendações, BI-RADS sugerido e templates MSK não pertencem à primeira migração urinária. As referências visuais não provam limiares, conduta ou correção clínica.

Não executei gates neste diagnóstico porque nenhum código clínico foi alterado. A próxima fase deve começar por testes de contrato e equivalência antes de ampliar o vocabulário.
