# Cervical / linfonodos cervicais (`CERVICAL`): auditoria do lote 2

- Data: 05/10/2026. Base: `01155d0` (main = worktree).
- Laudário: não observado (sem navegador). Só a existência no catálogo, linha 9 de `catalogo-ultrassonografia-2026-10-02.json` ("Cervical", "Cervical (Linfonodos)", "Cervical com Doppler", no grupo `pequenas_partes`, ao lado de "Glândulas Salivares" e "Tireoide"). Nenhuma redação do concorrente foi usada.
- Prova: `audits/probes/probe-cervical-2026-10-05.ts`, executada com `npx tsx` contra a main nos estilos `CLASSICO_COMPLETO` e `OBJETIVO`. A saída foi lida integralmente.

## 1. Estado por plataforma

| Plataforma | Evidência | Classificação |
|---|---|---|
| Web (formulário) | `apps/web/src/lib/deterministic/organs/cervical.ts:51-89`: **um único campo** (`linfonodo`: normais/alterado), com subcampos de nível, medidas, forma, hilo, vascularização e suspeição | estruturado ativo, mínimo |
| Web (adaptador) | `apps/web/src/lib/catalog/cervicalParaCatalogo.ts:26-55`: `com_doppler = alterado` (`:34`), no máximo um linfonodo, glândulas/tireoide sempre vazias | parcial |
| Renderer | `apps/api/src/server/renderer/categories/CERVICAL.ts:77-85` (schema do linfonodo **sem lado**), `:87-108` (glândulas com lado; tireoide opcional), `:399-414` (conclusão suspeito × reacional decidida só pelo booleano) | estruturado ativo (migrada em 31/08) |
| API ditado | O mesmo renderer + `CERVICAL_EXTRACTION_PROMPT` (`:182`), ligado por `RENDERER_CATEGORIES` (`env.ts:74`, vazio em produção na verificação de 03/10). Roteamento: `categoryNormalization.ts:73` (`/cervical\|pescoço/`), depois de salivares/paratireoide/tireoide (`:44-45`, `:67`) | estruturado dormente → writer |
| Android/RN | `apps/mobile/src/ui/tokens.ts:153` (rótulo "Linfonodos, massas e cistos cervicais"); sem atalho específico | genérico (ditado) |
| iOS | `Models/Category.swift:10`, `:144` ("Região cervical não-tireoidiana"); atalho padrão "Exame normal" (`GenerateViewModel.swift`, `default:`) | genérico (ditado) |
| shared | Nada em `packages/shared/src/clinicalModels/` | ausente |
| Conhecimento | `packages/knowledge/snippets/CERVICAL/`: o modelo pede avaliação **bilateral** por nível, com eixo curto e razão S/L (`modelo/template-padrao.md:45`); as regras pedem LADO como primeiro atributo (`regra/niveis-cervicais-robbins.md:55`) | publicado, **mas o código não o segue** |

## 2. Inventário de controles do formulário Web

| Campo | Opções | Padrão inicial |
|---|---|---|
| `linfonodo` | `nenhum` (Normais) / `alterado` | `nenhum` |
| ↳ nível (Robbins) | IA, IB, IIA, IIB, III, IV, VA, VB, VI | **III** |
| ↳ medidas | texto livre "a x b x c" (cm, ou mm se digitado) | vazio |
| ↳ forma | oval / arredondada | **oval** |
| ↳ hilo | presente / ausente | **presente** |
| ↳ vascularização | ausente / hilar / periférica / mista / aumentada | **ausente** |
| ↳ suspeição | checkbox "Aspecto suspeito" | desmarcado |
| lado | **inexistente** | n/a |
| eixo curto / eixo longo nomeados | **inexistentes** (três medidas anônimas) | n/a |
| Doppler realizado | **inexistente** (deduzido de "alterado") | n/a |
| glândulas salivares, tireoide, achados adicionais | inexistentes na tela (o schema aceita) | n/a |

## 3. Provas (dados sintéticos)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
|---|---|---|---|---|---|
| C1 | estado inicial | "Cadeias… sem alterações nos níveis IA… VI" (bilateral implícito) | "Ausência de alterações detectáveis pelo método" | nenhuma | `observado no LaudoUSG`: todos os níveis, dos dois lados, afirmados normais com um único clique padrão |
| C2 | alterado, IIA, 22×13×11 mm, arredondado, sem hilo, periférica, suspeito (pretendido: **à direita**) | "Linfonodo… no nível IIA, medindo 2,2 x 1,3 x 1,1 cm, …vascularização periférica ao Doppler" + "Ausência de alterações… nos demais níveis"; título passa a "COM DOPPLER COLORIDO" | "Linfonodo de aspecto suspeito no nível IIA" | nenhuma | `defeito confirmado`: **sem lado** no corpo e na conclusão; "demais níveis" afirma normal também o IIA contralateral |
| C2b | apenas "Alterado" clicado | nível **III** presumido; "medindo ____ x ____ x ____ cm, de forma oval, com periferia hipoecoica e centro hiperecoico, **sem vascularização significativa ao Doppler colorido**" | "Linfonodo proeminente de aspecto reacional no nível III" | **nenhuma** | `defeito confirmado`: nível, forma, hilo, Doppler e caráter reacional afirmados só pelos padrões; título com Doppler sem Doppler realizado |
| C3 | lado esquerdo não avaliado | impossível de representar; sai igual a C1 | igual a C1 | nenhuma | `defeito confirmado`: não há como restringir o escopo; o laudo afirma normalidade em território não examinado |
| C4 | remoção (volta a "nenhum" com subcampos preenchidos) | igual a C1 | igual a C1 | nenhuma | `observado no LaudoUSG`: remoção limpa |
| C5 | contradição: arredondado, sem hilo, periférica, IV, 18×14×12, suspeição **desmarcada** | descreve os três sinais de atipia | "Linfonodo proeminente de **aspecto reacional** no nível IV" | nenhuma | `defeito confirmado` (P0): conclusão tranquilizadora contradiz o corpo |

## 4. Lacunas concretas (Web e paridade)

- **L1, P0, `defeito confirmado`.** Não há lateralidade em nenhuma camada (tela, adaptador, schema `CERVICAL.ts:77-85`, extrator). A base de conhecimento exige lado. Campo mínimo: `lado ∈ {direito, esquerdo, linha média}` obrigatório por linfonodo (o nível VI admite linha média); conclusão no formato "nível X à direita".
- **L2, P0, `defeito confirmado`.** C5: a conclusão "reacional" não leva em conta forma, hilo e vascularização. Requisito: quando há ≥1 sinal de atipia sem suspeição marcada, abrir uma pendência bloqueante pedindo que o médico confirme "reacional" ou marque "suspeito". Não decidir automaticamente.
- **L3, P0, `defeito confirmado`.** Afirmações por padrão em C2b: nível III, oval, hilo presente, vascularização "ausente ao Doppler" e título "com Doppler". Os subcampos devem começar vazios; medidas vazias devem gerar pendência; Doppler deve ser um campo explícito do exame (realizado / não realizado), independente de haver linfonodo alterado.
- **L4, P1, `defeito confirmado`.** Não é possível representar avaliação parcial (lado não avaliado ou níveis não examinados), e C1/C3 afirmam os 18 territórios. Requisito: grade lado × nível com o estado normal / alterado / não avaliado; a frase normal cita só o que foi avaliado; a conclusão restringe o escopo.
- **L5, P1, `candidato a lacuna`.** Medidas sem semântica: são três números anônimos, sem eixo curto/longo nem razão S/L calculada. Mínimo: eixo longo e eixo curto em mm, com S/L derivado e exibido. Os limiares de suspeição (≈10 mm de eixo curto; S/L ≥ 0,5) entram só como `candidato` (fonte provável: a própria base, `criterios-linfonodo-normal-vs-suspeito.md:26-27`), como aviso e nunca como regra.
- **L6, P1, `candidato a lacuna`.** Só um linfonodo por exame. Faltam múltiplos linfonodos, "múltiplos no nível X, o maior…", conglomerado, necrose cística, microcalcificações e ecogenicidade cortical (os dois últimos são citados na base).
- **L7, P2, `inferido`.** Paridade: mobile e iOS só têm ditado. Com o renderer dormente, o writer genérico decide o lado livremente, sem trava determinística.

## 5. Fronteiras

- **TIREOIDE**: o formulário da tireoide traz `avaliarLinfonodos: true` e `linfonodos: 'preservados'` como padrão (`organs/tireoide.ts:195-196`). É `inferido` que um exame de tireoide afirma "linfonodos preservados" sem dado (verificar no lote da tireoide). Regra proposta: o bloco linfonodal da tireoide reaproveita o mesmo modelo lado × nível do `CERVICAL`, e "preservado" só vale com o nível avaliado.
- **GLANDULAS_SALIVARES**: categoria própria, Web local não migrada (`organs/glandulasSalivares.ts:18`). O `CERVICAL` aceita parótida/submandibular com lado (`CERVICAL.ts:87-91`, `:100-101`), mas a tela não expõe isso. Decidir se "Cervical" inclui as salivares como bloco opcional ou só referencia a outra categoria. Hoje existem dois caminhos divergentes.
- **PARATIREOIDE**: categoria própria (`organs/paratireoide.ts`). No `CERVICAL`, a paratireoide só aparece como `achados_adicionais` livre. Manter assim, com o roteamento já ordenado em `categoryNormalization.ts:44`.
- **"Cervical com Doppler"**: não há código separado; usa `com_doppler`. Na Web, Doppler = "alterado" (L3).

## 6. Requisitos originais

### 6.1 Modelo normal

| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
|---|---|---|---|
| Cadeias por lado | lado marcado como avaliado | linfonodos de morfologia preservada nos níveis avaliados daquele lado | fecho "sem linfonodomegalias ou linfonodos atípicos nas cadeias avaliadas" |
| Níveis não avaliados | marcação explícita | declarar os níveis/lado não examinados | restringir o escopo ("avaliação restrita a…") |
| Doppler | realizado sim/não | citar padrão vascular só se realizado | sem item |

### 6.2 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
|---|---|---|---|---|
| `linfonodo_atipico` | lado, nível, eixos longo e curto (mm), hilo, forma; vascularização se houver Doppler | linfonodo no nível X, lado, medidas com eixos nomeados e os atributos ditos | linfonodo de aspecto atípico no nível X, lado | lado obrigatório; unidade explícita; suspeição confirmada pelo médico |
| `linfonodo_reacional` | idem, sem sinais de atipia | linfonodo proeminente, de morfologia preservada | aspecto reacional no nível X, lado | bloquear se houver sinal de atipia sem confirmação (L2) |
| `multiplos_no_nivel` | lado, nível, quantidade aproximada, maior medida | múltiplos linfonodos, o maior… | por lado | não somar lados |
| `lado_nao_avaliado` | lado | declarar não avaliado | restringir o escopo | suprimir a normalidade do lado |
| `conglomerado` / `necrose_cistica` / `microcalcificacoes` | lado, nível | descritor próprio | atipia | sempre exigem confirmação |

### 6.3 Formulário Web

- Seções: Técnica (Doppler realizado), Lado direito, Lado esquerdo, Linha média (VI), Linfonodos alterados (lista), Achados adicionais.
- Padrões: lados "avaliado / normal" somente após clique; subcampos do linfonodo vazios.
- Pendências bloqueantes: linfonodo sem lado ou sem nível; vascularização preenchida com Doppler "não realizado"; sinais de atipia com "reacional" (L2).
- Avisos: eixo curto ausente; S/L ≥ 0,5 (`candidato`) com "reacional".

### 6.4 Prompt mobile (extrator)

Extrair: lado (do paciente, nunca da tela; ver `template-padrao.md:57`), nível, eixos nomeados, hilo, forma, Doppler realizado e lados/níveis não avaliados. Nunca presumir: lado, nível, hilo presente, vascularização ausente, normalidade contralateral nem "reacional" quando houver sinal de atipia.

## 7. Perguntas para a rodada no concorrente (não observado no concorrente)

1. "Cervical" e "Cervical (Linfonodos)" são modelos diferentes? O primeiro inclui tireoide/salivares?
2. Há grade por lado × nível de Robbins, ou o linfonodo é um item livre?
3. As medidas são nomeadas (eixo curto/longo)? A S/L é calculada?
4. Existe "lado não avaliado" e "níveis não examinados"? Como a conclusão muda?
5. Marcar sinais de atipia altera a conclusão automaticamente ou exige confirmação?
6. "Cervical com Doppler" muda o título e a técnica? A vascularização só aparece nesse modelo?

## 8. Ordem de implementação sugerida

1. P0: lado obrigatório (schema + adaptador + tela + extrator + conclusão) (L1).
2. P0: subcampos sem padrão, Doppler explícito e pendência de medidas (L3).
3. P0: pendência bloqueante de contradição atipia × reacional (L2).
4. P1: grade lado × nível com "não avaliado" e restrição de escopo (L4).
5. P1: eixos nomeados + S/L como aviso (L5); múltiplos linfonodos (L6).
6. P2: alinhar o bloco linfonodal da tireoide e decidir o escopo das salivares (§5).
