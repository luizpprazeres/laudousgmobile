# Cruzamento Laudário × LaudoUSG — Pélvico Transvaginal com Doppler

Data: 07/10/2026. Base: `main` em `4f93b0d` e app iOS em `bce4604`. O Laudário foi observado com baseline e dois cenários sintéticos, restaurado ao final ([caso](cases/pelvico-transvaginal-com-doppler-2026-10-07.md)). O LaudoUSG foi apenas lido; nenhuma prova foi executada nesta rodada. O preflight de apoio está em `/tmp/laudario-pelvico-transvaginal-doppler-preflight-2026-10-07.md`.

## Rótulos

| Rótulo | Uso neste arquivo |
| --- | --- |
| `observado` | visto na interface do Laudário em 07/10/2026 |
| `observado-código` | escrito literalmente no código do LaudoUSG, com caminho e linha |
| `inferido` | consequência deduzida, sem execução ou teste de fronteira |
| `candidato` | parece ausente ou incompleto, mas a busca não cobriu todas as camadas ou depende de decisão médica |
| `gap confirmado` | ausência comprovada no Web, Android/RN, iOS e contrato compartilhado aplicável |

## Resultado

No concorrente, o “com Doppler” desta variante se resume às artérias uterinas (`observado`). Não há campos de Doppler ovariano, de lesão ou de mioma na aba Doppler. A normalidade Doppler nasce de um controle marcado, sem medida. Quando esse controle é desligado, o título continua dizendo Doppler, sem nenhuma limitação.

No LaudoUSG, o card `PELVICO_TRANSVAGINAL_DOPPLER` existe na Web, mas faz o caminho oposto (`observado-código`):

- não publica nenhuma frase de Doppler normal;
- exige vascularização somente para achados ovarianos focais;
- não tem campos de artérias uterinas.

Por isso, o LaudoUSG não repete a falsa normalidade observada, mas também não consegue registrar o único dado hemodinâmico que o concorrente estrutura.

## Estado por plataforma

| Camada | Classificação | Evidência (`observado-código`) |
| --- | --- | --- |
| Web | estruturado ativo; Doppler **parcial** | card derivado com via `tv` e modo `doppler` fixos (`apps/web/src/lib/deterministic/organs/pelvePresets.ts:23-35`, `:42-57`; `apps/web/src/lib/catalog/migradas.ts:75`); entrada única (`apps/web/src/lib/catalog/pelveParaCatalogo.ts:574-617`); grupo e busca (`apps/web/src/components/laudar/categoryGroups.ts:39`, `:132`) |
| API — renderer | recebe `modo` e `doppler_realizado`, sem campos hemodinâmicos | `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:87-88`; no ditado depende de `RENDERER_CATEGORIES` (default vazio, `apps/api/src/server/env.ts:74`) |
| API — writer | `PELVE_WRITER` com default `false` | `apps/api/src/server/env.ts:234` |
| API — roteamento | pelve, pelvic ou transvaginal vão para `PELVE_FEMININA`, sem upgrade Doppler; `modo = doppler` só se o Doppler for ditado | `apps/api/src/server/pipeline/categoryNormalization.ts:30-33`, `:66`; `PELVE_FEMININA.ts:320-321` |
| Android/RN | genérico (ditado), sem card Doppler | `apps/mobile/src/ui/tokens.ts:157`; `apps/mobile/src/features/generate/categories.manual.ts:11` |
| iOS | genérico (ditado), sem caso Doppler | `laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:13` |
| Shared | só rótulo | `packages/shared/src/categoryPresentation.ts:30`; sem contrato de pelve em `packages/shared/src/clinicalModels/contracts.ts:3-10` |
| Conhecimento | sem artéria uterina fora da gestação | busca sem ocorrência em `packages/knowledge/snippets/PELVE_FEMININA/`; artérias uterinas só aparecem no morfológico e na pré-eclâmpsia (`apps/web/src/lib/calculators/preEclampsia.ts:154`) |

## Cruzamento por estado observado

### Baseline

| Laudário | LaudoUSG |
| --- | --- |
| `observado`: controle das artérias uterinas marcado no estado inicial; frase genérica de Doppler normal e conclusão global normal sem nenhuma medida | O card abre bloqueado até receber medidas do útero, a espessura do endométrio e as medidas dos ovários (`pelveParaCatalogo.ts:292-352`; teste `apps/web/tests/pelveUnified.manual.ts`) (`observado-código`). Não existe frase de fluxo ou de vascularização normal no renderer; o Doppler aparece só na técnica e na vascularização informada de achados (`PELVE_FEMININA.ts:518-521`, `:682-683`, `:846-869`, `:1272-1274`) (`observado-código`). |
| `observado`: o título indica Doppler; a técnica é transvaginal simples | O título não muda com o Doppler; só monitorização e pós-abortamento mudam o título (`PELVE_FEMININA.ts:501-511`; `apps/web/src/lib/deterministic/organs/pelveFeminina.ts:440-442`). A técnica ganha uma frase de Doppler, com três textos diferentes: Web (`pelveFeminina.ts:443-447`), API clássico, que cita “estruturas pélvicas e lesões individualizadas” (`PELVE_FEMININA.ts:518-521`), e API objetivo (`:1272-1274`) (`observado-código`). |

Comparação `inferido`: os dois produtos se contradizem de formas opostas. O concorrente põe Doppler no título e deixa a técnica sem Doppler. O LaudoUSG afirma Doppler na técnica e deixa o título sem Doppler.

### Cenário 1 — Módulo Doppler desmarcado

| Laudário | LaudoUSG |
| --- | --- |
| `observado`: a frase genérica sai; título com Doppler, técnica sem registro de não realização, conclusão normal, nenhuma pendência | Não existe controle equivalente. No card Doppler, o modo é fixo (`pelvePresets.ts:43`), então a técnica sempre declara o estudo Doppler (`pelveFeminina.ts:445-446`; `PELVE_FEMININA.ts:1024`) (`observado-código`). Se o Doppler não foi feito, o caminho esperado é outro card (`inferido`). Não há estado “Doppler não realizado” nem limitação de Doppler por estrutura (`observado-código`: busca sem ocorrência no adaptador e no renderer da pelve). |

**Comportamento a não reproduzir:** título de exame com Doppler sem resultado nem limitação de Doppler.

### Cenário 2 — IP isolado na artéria uterina direita

| Laudário | LaudoUSG |
| --- | --- |
| `observado`: publica só a uterina direita com o IP; o lado esquerdo some em silêncio; conclusão normal; sem média, percentil, fase, incisura ou alerta | Não há campo de artéria uterina, IP, IR ou VPS na pelve. Busca sem ocorrência em `pelveFeminina.ts`, `pelveParaCatalogo.ts`, `PELVE_FEMININA.ts` e no conhecimento da pelve (`observado-código`). O dado só poderia entrar por ditado, sem estrutura, lado garantido ou auditoria (`inferido`). |

**Comportamento útil:** o valor informado não foi interpretado nem levado à conclusão sem regra. **Comportamento a não reproduzir:** omitir o lado não medido, que fica indistinguível de um lado não avaliado ou esquecido.

### Restauração

`observado`: reabrir o modelo restaurou o baseline sem resíduo. No LaudoUSG, a vascularização só é enviada no modo Doppler, e o portão Doppler é recalculado a cada adaptação (`pelveParaCatalogo.ts:200`, `:551-568`, `:616-617`) (`observado-código`). Não houve teste de resíduo no LaudoUSG nesta rodada (`inferido`).

## Lacunas

| # | Item | Rótulo | Evidência |
| --- | --- | --- | --- |
| L1 | Artérias uterinas estruturadas fora da gestação (IP, IR, VPS por lado, com estado do lado) | **gap confirmado** no contrato estruturado | ausente no Web, na API e no shared; RN e iOS são só ditado. A necessidade clínica e o escopo dependem de revisão médica |
| L2 | Estado do Doppler por estrutura: não realizado, avaliado sem alteração, alterado, limitado | **gap confirmado** no contrato estruturado | o card fixa o modo (`pelvePresets.ts:43`); não há campo de estado no adaptador nem no renderer |
| L3 | Título sem Doppler no card “com Doppler” | `candidato` (decisão de produto) | `PELVE_FEMININA.ts:501-511` |
| L4 | Três textos de técnica Doppler; o clássico cita estruturas pélvicas sem resultado por estrutura | `observado-código` (divergência); leitura de normalidade implícita `inferido` | `pelveFeminina.ts:443-447`; `PELVE_FEMININA.ts:518-521`, `:1272-1274` |
| L5 | Vascularização de mioma | **gap confirmado** no contrato estruturado | `pelveFeminina.ts:102-113`; `packages/schemes/src/myoma/contract.ts:58-67`. Também ausente no concorrente nesta variante (`observado`: aba Doppler só com as uterinas) |
| L6 | Vascularização endometrial como texto livre opcional, sem estado “não avaliado” | `candidato` | `pelveFeminina.ts:245`; não é exigida no modo Doppler (`pelveParaCatalogo.ts:551-568`) |
| L7 | Ovário não visualizado sem motivo e sem marcar o Doppler daquele lado como não aplicável | `observado-código` | `pelveFeminina.ts:318-320`; já apontado em 05/10 e 06/10 |
| L8 | No mobile, “pélvico com Doppler” depende da extração ou do writer, com gates não verificados em produção | `inferido` | `categoryNormalization.ts:66`; `env.ts:74`, `:234` |

## Contrato mínimo proposto

- **Escopo Doppler da sessão:** `realizado | não realizado`. O título e a técnica derivam desse campo, a partir de uma fonte única de texto.
- **Artéria uterina, por lado:** `não avaliada | avaliada | limitada (motivo)`. IP, IR e VPS ficam opcionais, com unidade fixa (VPS em cm/s; IP e IR adimensionais).
- **Lado avaliado sem medida:** gera pendência ou frase explícita de dado não registrado. Nunca some em silêncio e nunca vira normal.
- **Derivados** (IP médio e outros): só com os dois lados e uma regra aprovada; nenhuma referência gestacional fora da gestação.
- **Conclusão:** um valor isolado não altera a conclusão sem regra clínica aprovada e confirmação médica.
- **Vascularização por achado** (ovário, endométrio, mioma): `não avaliada | ausente | mínima | moderada | intensa`, sem padrão.
- **Remoção:** apagar um valor recompõe corpo, conclusão e derivados.

## Melhorias sugeridas ao LaudoUSG

| # | Controle ou dado | Corpo e conclusão | Salvaguardas | Web / prompt mobile | Classe | Prioridade |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Estado do Doppler da sessão e por estrutura | sem Doppler realizado, nenhuma técnica ou título de Doppler; estrutura não avaliada não aparece como normal | sem dado, sem frase de fluxo normal (manter o comportamento atual) | seletor no topo do card; prompt só marca Doppler realizado quando ditado | corrige L2 (`gap confirmado`) | alta |
| M2 | Artérias uterinas por lado | corpo lista os valores por lado e registra o lado não medido; conclusão sem interpretação até haver regra aprovada | unidade, lado e vaso obrigatórios; nenhuma curva gestacional | bloco opcional no card Doppler; prompt extrai lado, índice e valor | corrige L1 (`gap confirmado`); escopo `pendente` de revisão médica | média |
| M3 | Fonte única da técnica e decisão sobre o título | prévia e laudo iguais | — | um texto de técnica no renderer, consumido pela Web | L3 e L4 | média |
| M4 | Vascularização de mioma e de endométrio estruturada | descritor de Doppler no corpo, sem diagnóstico na conclusão | nada preselecionado; `não avaliada` como estado | mesma escala do achado ovariano | L5 (`gap confirmado`) e L6 (`candidato`) | baixa |
| M5 | Motivo da não visualização do ovário e Doppler não aplicável | lado sem Doppler declarado; normalidade global bloqueada | motivo explícito, nunca inferido | campo condicional; prompt reconhece o motivo | L7 | média |

Avisar o orquestrador: M1 e o estado de lado não medido valem também para Pélvico Transabdominal com Doppler e para os demais cards Doppler derivados (tireoide, cervical e mamas), que fixam o modo da mesma forma (`apps/web/src/lib/deterministic/organs/dopplerPresets.ts:1-34`).

## Provas necessárias antes de ativar

- Baseline sem nenhuma frase de Doppler normal.
- Doppler não realizado: título e técnica coerentes, sem resultado de Doppler.
- IP unilateral: o lado oposto aparece como não medido ou gera pendência.
- Valores bilaterais com derivado somente após aprovação da regra.
- Achado ovariano sem vascularização, que deve bloquear (já coberto em `apps/web/tests/pelvePresets.manual.ts:128-129`).
- Remoção de valor sem resíduo.
- Paridade entre a técnica da Web e os dois estilos da API.
- Ditado “com Doppler das uterinas” nos dois clientes móveis até a API.

## Pendências

- Observar no concorrente os dois lados preenchidos, a incisura, a vascularização de lesão ovariana dentro desta variante e as recomendações.
- Executar a prova sintética do caminho Web do LaudoUSG; esta rodada só leu o código.
- Verificar `RENDERER_CATEGORIES` e `PELVE_WRITER` em produção.
- Obter fonte e decisão médica sobre o valor clínico dos índices uterinos fora da gestação.
