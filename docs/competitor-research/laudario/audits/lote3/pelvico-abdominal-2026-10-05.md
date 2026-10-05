# Pélvico abdominal (via transabdominal isolada): execução sintética e requisitos

- Data: 05/10/2026. Base: `06c88cd` (a main está em `407362d`, que só muda arte do seletor; nada de pelve).
- Laudário: **não observado** (sem navegador). Só existe no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 10, grupo `ginecologia`: “Pélvico Abdominal”). Nenhuma frase do concorrente foi vista ou copiada.
- Probe: `audits/probes/probe-pelvico-abdominal-2026-10-05.ts`. O caminho é o real da Web: `initialExamState(pelveFeminina)` com `via = ta` → `adaptarPelve` → `renderizarSelecao("PELVE_FEMININA", "CLASSICO_COMPLETO")`. O A2b chama o mesmo renderer com o formato do ditado.
- Vizinhos (não reestudados): `audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md` (P1–P5) e `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §1 (a §1.1 já prevê a via TA “limitada”).
- **Nota sobre P1–P5 após `PELVICO_TRANSVAGINAL` (5b273c3)**: P1 e P2 agora **bloqueiam** no card novo (portão de completude e regra de endométrio > 0,5 cm na menopausa) mas **continuam** na `PELVE_FEMININA`; P3 (mioma some do corpo com adenomiose), P4 (classe de volume não derivada: 256 cm³ “normal”) e P5 (não visualizado sem motivo) **persistem nos dois cards**, reexecutados hoje.

## 1. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web — PELVE_FEMININA | controle `Via do exame = Transabdominal` (`apps/web/src/lib/deterministic/organs/pelveFeminina.ts:382`). Título e técnica próprios (`:19-31`). A bexiga entra nas seções (`resolveSections`, `:410`). Adaptador `adaptarPelve` **sem portão de completude** | **parcial**: título e técnica corretos, conteúdo igual ao da via combinada |
| Web — PELVICO_TRANSVAGINAL | sem controle de via (`via` fixa `tv`); confirmado na probe | não é porta para TA |
| API ditado | renderer `PELVE_FEMININA.ts`: `via: "ta"`, técnica TA (`:518`), frase própria de endométrio limitado no corpo (`:673`) e na conclusão (`:745` ss., `ta_limitado` e o *default* de TA). `RENDERER_CATEGORIES` vazio por padrão → no ditado vale o writer | **estruturado dormente** |
| Writer | `prompts/contracts/PELVE_FEMININA.ts:32` e `:35` (TA + endométrio limitado → frase da técnica) e o título TA em `:45` | **genérico com regra** (o writer sabe; a Web não) |
| Android/RN · iOS | card genérico `PELVE_FEMININA` (`tokens.ts:157`, `Category.swift:13`), por ditado | **genérico** |
| shared | sem modelo clínico de pelve | **ausente** |

## 2. Inventário Web com Via = TA

| Campo | Opções | Padrão |
| --- | --- | --- |
| Via do exame | TA+TV / TV / TA | TA+TV |
| Bexiga (módulo compartilhado de vias urinárias) | repleção adequada / moderada / pequena / insuficiente / vazia; parede; achados; jatos; volumes | **adequada** e parede normal pré-marcadas |
| Endométrio — espessura | texto cm | vazio |
| Endométrio — correlação | fase do ciclo / menopausa / reposição | **fase do ciclo**. As opções “limitado pela técnica TA” e “não correlacionável”, que existem no renderer, **não estão na tela** |
| Ovários — visualização | visualizado / não visualizado (sem motivo) | **visualizado** |
| Útero | posição, medidas, classe de volume (**normal** pré-marcada), miomas, adenomiose | — |

Não existem: motivo da via isolada (virgindade, recusa, idade, gestação inicial, outro), idade da paciente (a tabela etária do renderer existe, mas o adaptador manda `referencia_idade_anos: null`), grau de repleção suficiente para a técnica e escopo limitado declarado na conclusão.

## 3. Provas (dados sintéticos)

| Cenário | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| A1 estado inicial, TA | Via = TA; nada medido | bexiga normal; útero, endométrio e ovários com `____` | bexiga normal; útero de volume normal; endométrio normal para a fase; ovários normais “contendo folículos” | nenhuma | **defeito confirmado (P0)**: normalidade total sem uma medida, com a repleção vesical presumida |
| A2 endométrio não medido (o caso típico da TA) | útero e ovários medidos, espessura vazia | “endométrio homogêneo, medindo ____ cm” | endométrio “normal para a fase do ciclo” | nenhuma | **defeito confirmado (P0)**: o adaptador manda sempre `endometrio_eco` e `frase=padrao` (`pelveParaCatalogo.ts:257`, `:266`), então a frase de limitação da técnica é **inalcançável pela Web** |
| A2b mesmo caso no formato do ditado | `eco=null`, `frase=null` | frase de limitação da técnica TA | endométrio não avaliado detalhadamente pela técnica | — | **observado no LaudoUSG**: o comportamento correto existe no renderer |
| A3 ovários não visualizados | D e E `visualizado = não` | os dois “não visualizados” | item único “ovários não visualizados pela técnica empregada”; o endométrio continua “normal” | nenhuma | lateralidade e item corretos; **lacuna P1**: sem motivo e sem restrição de escopo na conclusão |
| A4 repleção insuficiente | bexiga `insuficiente` | bexiga com repleção insuficiente | idem; útero, endométrio e ovários normais | nenhuma | **defeito confirmado (P1)**: a técnica continua afirmando “bexiga repleta”, e a avaliação limitada não reduz o resto |
| A5a cisto simples no OE | OE 3,2 × 2,8 × 2,6 cm | só no OE; OD intacto | OD normal (5,6 cm³); OE “de volume **reduzido** (4,9 cm³), com coleção líquida” | nenhuma | lado correto. **Defeito confirmado (P1)**: com achado, o volume do ovário é classificado (corte < 6 cm³, `PELVE_FEMININA.ts:461`), e 4,9 cm³ vira “reduzido”. Sem achado, o mesmo volume é “normal”. O volume do ovário inclui o cisto, que é maior que o ovário informado (inconsistência não checada) |
| A5b remoção | achado volta a “nenhum” | normal | normal | nenhuma | **observado**: sem sobra |
| A6 menopausa + TA, endométrio não medido | Menopausa marcada | “a técnica TA não permite avaliar o endométrio” | “endométrio de espessura normal para a menopausa” | nenhuma | **defeito confirmado (P0)**: o corpo diz que não avaliou e a conclusão afirma normalidade |

## 4. Lacunas do Web (e paridade)

1. **P0 — escopo da via não chega ao conteúdo** (A1, A2, A6): na TA o endométrio precisa ter o estado “limitado pela técnica”, e nenhuma conclusão de normalidade pode depender de estrutura não avaliada.
2. **P0 — contradição corpo × conclusão no endométrio** (A6): vale para menopausa e reposição.
3. **P1 — bexiga como pré-requisito técnico** (A4): a repleção é obrigatória e sem padrão; se insuficiente, a técnica muda e a conclusão declara a limitação.
4. **P1 — ovários não visualizados sem motivo e sem restrição de escopo** (A3). Lado por lado.
5. **P1 — classe de volume do ovário inconsistente** (A5a) e a P4 da pelve (classe do útero não derivada).
6. **P1 — idade/indicação**: a TA isolada é a via de crianças, adolescentes e pacientes sem atividade sexual. A tabela etária já existe no renderer e não é alcançável pela Web.
7. **Paridade**: o writer já tem a regra de TA limitada; a Web contradiz o writer.

## 5. Decisão de modelagem

**(b) Variante derivada do contrato da pelve: card `PELVICO_TRANSABDOMINAL` (proposta), no padrão do `PELVICO_TRANSVAGINAL`** (`CATEGORIAS_DERIVADAS`, mesmo renderer canônico, via fixa `ta`, adaptador próprio com portão). O que muda em relação à pelve:
- via fixa `ta`; a bexiga é seção obrigatória e vem primeiro;
- o endométrio ganha o estado `limitado_pela_tecnica` (mapeia para `frase: ta_limitado`, `eco: null`), que passa a ser o padrão **sugerido**, sem pré-seleção silenciosa;
- os ovários ganham `nao_visualizado` com motivo;
- a conclusão de escopo lista o que não foi avaliado;
- contexto de idade e indicação alimenta a tabela etária existente.

Não é contrato próprio porque as estruturas, os achados e a redação são os da pelve. Duplicá-los criaria uma segunda fonte de frase clínica. O controle `via = ta` da `PELVE_FEMININA` pode continuar, mas precisa do mesmo portão (ou ser substituído pelo card).

## 6. Requisitos originais

### 6.1 Modelo normal

| Estrutura | Dado mínimo para “normal” | Corpo (intenção) | Conclusão (intenção) |
| --- | --- | --- | --- |
| Bexiga | repleção escolhida (sem padrão) = adequada | forma, contorno e conteúdo | bexiga normal só com repleção adequada |
| Útero | 3 medidas → volume; classe derivada pela idade | posição e medidas | volume com classe derivada |
| Endométrio | espessura medida **ou** estado `limitado_pela_tecnica` | espessura, ou a limitação da via | normal para o contexto só com espessura medida; se limitado, a conclusão diz que não foi avaliado detalhadamente |
| Ovários (por lado) | 3 medidas **ou** não visualizado + motivo | medidas, ou não visualizado com motivo | por lado; “contendo folículos” só se folículos marcados como vistos |
| Escopo | — | — | se alguma estrutura ficou limitada ou não visualizada, item final dizendo que a via isolada limita a avaliação dessas estruturas (nomeadas), com sugestão facultativa de complementação TV “a critério clínico” só quando indicação e consentimento permitirem (o médico liga ou desliga) |

### 6.2 Formulário Web

**Contexto**: `idade` (anos, 0–110, obrigatória para a classe de volume); `indicacao_via_ta` (sem atividade sexual / pediátrica / recusa da via TV / outra, texto); `status_hormonal` (pré-menarca, menacme, menopausa, terapia hormonal, não informado).
**Bexiga** (módulo compartilhado): `replecao` **sem padrão**; se insuficiente ou vazia, a técnica troca “bexiga repleta” por repleção limitada, e útero/anexos ganham aviso de avaliação limitada.
**Útero**: medidas L×AP×T cm (0,5–15); a classe de volume é derivada por idade (tabela etária já no renderer, valores **candidatos** até revisão médica) e a sobrescrita manual gera aviso.
**Endométrio**: `estado` = medido / limitado pela técnica / não visualizado (sem padrão); se medido, `espessura` cm 0,1–3,0 e correlação; se limitado, nenhum campo de espessura.
**Ovários D/E** (componente único por lado): `estado` = medido / não visualizado (motivo: técnica, interposição gasosa, ooforectomia, outro); `folículos` (vistos / não caracterizados); achados da biblioteca da pelve.
**Pendências bloqueantes**: repleção não escolhida; útero sem medidas; endométrio sem estado; ovário sem estado; menopausa ou reposição com endométrio limitado combinada com frase de normalidade (impossível por construção); ovário não visualizado com dados; achado anexial sem medida (regra do portão TV reaproveitada).
**Avisos**: repleção insuficiente com estruturas descritas como normais; ovário com achado cujas medidas superam as do próprio ovário; classe de volume sobrescrita.

### 6.3 Biblioteca de alterações (o que é específico da via TA)

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `endometrio_limitado_ta` | estado = limitado | limitação da técnica | endométrio não avaliado detalhadamente | exclui qualquer frase de “espessura normal” |
| `ovario_nao_visualizado` | lado + motivo | não visualizado, com motivo | por lado, com motivo; item único se bilateral | lado obrigatório; nunca vira “ausente” sem antecedente cirúrgico |
| `bexiga_replecao_limitada` | repleção insuficiente/vazia | limitação vesical | limitação declarada | muda a técnica; bloqueia achados vesicais detalhados (regra existente) |
| `escopo_limitado_via_ta` | ≥ 1 estrutura limitada ou não visualizada | — | item de escopo nomeando as estruturas | gerado, nunca digitado; some quando nada é limitado |
| demais achados | os da pelve (§1.3 da síntese) | idem | idem | idem |

### 6.4 Prompt mobile (extrator)

Extrair: `via = ta` só quando dita como exclusiva; motivo da via; repleção vesical; endométrio medido ou “não avaliado/limitado”; não visualização por lado com motivo. Nunca presumir: espessura endometrial, “bexiga repleta”, visualização dos ovários, idade. Na via TA, endométrio não ditado é `limitado`, não `normal`.

### 6.5 Casos de aceitação sintéticos

1. Estado inicial → bloqueia (repleção, útero, endométrio, ovários); nenhuma frase normal.
2. Útero e ovários medidos, endométrio “limitado” → corpo e conclusão com a limitação; item de escopo citando o endométrio; nenhum “espessura normal”.
3. Item 2 + menopausa → igual ao 2; a menopausa não reintroduz normalidade.
4. Repleção insuficiente → técnica sem “bexiga repleta”; aviso de avaliação limitada; o escopo cita a bexiga.
5. OE não visualizado (interposição gasosa), OD medido → só o OE limitado; o OD intacto; o escopo cita o ovário esquerdo.
6. Cisto simples no OE e depois removido → o lado aparece e some sem sobra; a classe de volume do OE não muda só por ter achado.
7. Paciente de 12 anos, útero 5,0 × 2,0 × 3,0 cm → classe derivada pela faixa etária (tabela existente); sem sobrescrita, sem aviso.
8. Todas as estruturas medidas e repleção adequada → laudo normal completo, sem item de escopo.

## 7. Perguntas para a rodada no concorrente

- “Pélvico Abdominal” pede a repleção vesical? Ela muda a técnica?
- Como o endométrio aparece quando não é medido: frase de limitação, campo vazio ou normalidade?
- Ovário não visualizado pede motivo? A conclusão restringe o escopo?
- Pede idade e usa referência etária (pediatria)?
- O que sai com o formulário vazio?

## 8. Ordem de implementação sugerida

1. **P0, já na `PELVE_FEMININA` com via TA**: o adaptador deixa de mandar `eco` e `frase=padrao` quando a espessura está vazia em TA (a frase correta do renderer passa a sair). Bloqueio de menopausa/reposição com endométrio não medido.
2. **P0**: portão de completude da TA (reusar `adaptarPelveTransvaginal` parametrizado por via) e repleção sem padrão.
3. **P1**: card derivado `PELVICO_TRANSABDOMINAL` em `CATEGORIAS_DERIVADAS`, com contexto (idade, indicação), motivo de não visualização e item de escopo gerado.
4. **P1**: classe de volume derivada (útero e ovário) com a mesma regra com e sem achado; resolver P4.
5. **P2**: extrator do ditado alinhado (endométrio não ditado na TA = limitado); paridade iOS/RN depois do contrato.
