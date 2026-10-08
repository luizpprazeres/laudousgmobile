# Cruzamento Laudário × LaudoUSG — Abdome Superior com Doppler

Data: 07/10/2026. O lado do Laudário vem de `cases/abdome-superior-com-doppler-2026-10-07.md`: relato escrito da interface, com dados sintéticos e modelo restaurado no fim. O lado do LaudoUSG foi conferido no código da `main` em `4f93b0d` e do iOS em `bce4604`. Também foram usadas duas provas sintéticas, só de leitura, guardadas fora do repositório (`probe-asd.mts` e `probe-asd2.mts`, no scratchpad da sessão), executadas com `npx tsx --tsconfig apps/api/tsconfig.json`. Nenhum código clínico, teste, índice, fila, status ou commit foi alterado. As referências anteriores são o preflight `/tmp/laudario-abdome-superior-doppler-preflight-2026-10-07.md` e a auditoria `audits/lote2/abdome-superior-2026-10-05.md` (base `01155d0`; os arquivos de Abdome Superior não mudaram desde então).

Rótulos usados:

- **observado:** interface do concorrente, conforme o relato;
- **observado-código:** lido no HEAD ou reproduzido por prova sintética no LaudoUSG;
- **inferido:** regra provável, sem teste de fronteira ou sem UI;
- **candidato a lacuna:** ausência ou risco ainda sem busca completa, ou dependente de decisão clínica;
- **gap confirmado:** ausência comprovada em Web, Android/RN, iOS e contrato compartilhado aplicável.

## Síntese

O Laudário trata Abdome Superior com Doppler como **um exame com dois módulos**, anatômico e Doppler hepático, que publicam normalidade sem medidas. A combinação é útil, mas os blocos não conversam. Nos dois cenários, o bloco anatômico manteve a veia porta pérvia enquanto o Doppler registrava trombose (C1) ou não avaliação (C2). Na limitação técnica, o sistema também inventou três causas.

O LaudoUSG **não tem o exame** (gap confirmado). Os dois defeitos do concorrente, porém, **já existem em caminhos vizinhos**:

- **contradição entre blocos:** o `ABDOMEN_TOTAL_DOPPLER` recebe o modo B como texto livre e nunca o confronta com o estado vascular. A prova G4 renderizou “Veia porta pérvia” no corpo e trombose portal no bloco Doppler;
- **causa presumida:** no Abdome Superior, o único estado de não avaliação é `nao_avaliado_gases`, que sempre escreve interposição de gases. A frase sai sem concordância de gênero (“Veia porta visualizado…”), e a conclusão continua normal (G1/G2).

| Cenário | Laudário (observado) | LaudoUSG atual (observado-código) | Classificação |
| --- | --- | --- | --- |
| Baseline | anatômico + Doppler normais sem medida, incluindo colaterais, artéria esplênica e líquido livre | não há o exame. O Abdome Superior não tem vasos com Doppler e afirma porta, aorta e VCI normais sem controle (S0; `abdomeSuperiorParaCatalogo.ts:24-25`). O `ABDOMEN_TOTAL_DOPPLER` bloqueia sem calibre, velocidade e direção da porta (D0; `contracts.ts:305-307`) | exame = **gap confirmado**; não reproduzir a normalidade vascular sem medida |
| C1 — trombose parcial | caráter benigno e extensão ao ramo direito preenchidos sozinhos; conclusão de trombose parcial; anatômico mantém porta pérvia (I1); cinco recomendações não publicadas | ATD com trombose confirmada exige tipo, critério em texto e confirmação (`contracts.ts:339-341`); conclusão “trombose portal” sem parcial/completa nem extensão (D6; `renderer.ts:29-33`); com o corpo do AS objetivo, “Veia porta pérvia” convive com a trombose (G4) | I1 **reproduzível** no LaudoUSG; atributos do trombo = **gap confirmado**; preenchimento automático **não deve ser reproduzido** |
| C2 — porta não avaliada por limitação técnica | Doppler retira a normalidade e conclui não avaliação; acrescenta gás, meteorismo e janela desfavorável sem escolha (I2); anatômico mantém porta pérvia (I1) | ATD e DH não aceitam porta não avaliada: o primeiro bloqueia (`contracts.ts:305-307`), o segundo pede perviedade (`:357-359`) e a Web bloqueia por porta obrigatória (`dopplerHepaticoParaCatalogo.ts:84-88`). No AS, `nao_avaliado_gases` fixa a causa “gases” e mantém a conclusão normal (G1/G2) | estado “não avaliado (motivo escolhido)” = **gap confirmado**; I2 **reproduzido** no AS em versão menor (uma causa fixa) |
| Restauração | baseline restaurado por reabertura; limpeza passo a passo **não observada** | Web e RN travam ao voltar a situação portal para “sem alteração” (`PORTAL_FINDING_STATUS_MISMATCH`; D6b/D6c); o iOS limpa os campos | **defeito confirmado** na Web e no RN |

## As incoerências observadas no concorrente

| id | O que acontece | Origem provável | Existe no LaudoUSG? |
| --- | --- | --- | --- |
| **I1** | bloco anatômico afirma a porta pérvia e habitual enquanto o Doppler registra trombose parcial (C1) ou não avaliação (C2) | módulo anatômico e módulo Doppler montados por fontes independentes, sem regra cruzada (**inferido**) | **sim, no ATD** (observado-código, G4): `abdomenReport` é texto livre de no mínimo 80 caracteres (`packages/shared/src/clinicalModels/contracts.ts:66-67`), concatenado antes do bloco vascular (`renderer.ts:34`), sem validação de coerência. O corpo padrão não cita a porta (`defaults.ts:9`); o risco aparece quando o médico cola ou edita um corpo que a cita. O AS objetivo afirma “Veia porta pérvia” só no modo B (`apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts:414`), o que agravaria a contradição numa composição ingênua |
| **I2** | a opção “limitação técnica” publica três causas (gás, meteorismo, janela) sem escolha | texto fixo da opção (**inferido**) | **sim, no AS** (observado-código, G1/G2): `nao_avaliado_gases` é o único estado de limitação (`ABDOMEN_SUPERIOR.ts:166`; prompt `:212`) e sempre escreve “interposição de gases intestinais” (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:723-729`). A frase usa o masculino para a porta, e a conclusão segue global normal. Não existe no ATD nem no DH, porque lá a porta não pode ficar sem avaliação |

## Estado por plataforma

| Camada | Abdome Superior com Doppler | Vizinhos reaproveitáveis | Classificação |
| --- | --- | --- | --- |
| Web | sem card nem código; o AS tem 5 seções sem vasos (`apps/web/src/lib/deterministic/organs/abdomeSuperior.ts:19-35`) | ATD em workspace clínico sem flag (`apps/web/src/lib/clinicalModels.ts:7-13`; `LaudarWebExperience.tsx:1575`); DH em formulário canônico (`organs/dopplerHepatico.ts:128-143`) | **ausente** |
| API (ditado) | fora do seed (`packages/db/src/seeds/data.ts:73-74`); qualquer código “abdome superior … Doppler” cai em `ABDOMEN_SUPERIOR` (R1; `categoryNormalization.ts:30-33,49`); o detector de título só reconhece abdome total (`clinicalReports/abdomenDopplerIntent.ts:21-22`) | ATD fail-closed (`clinicalReports/fallbackPolicy.ts:3-16`); DH com writer dedicado (`pipeline/generationPathResolver.ts:41-42,79`) | **ausente**; perda do Doppler no roteamento = **defeito confirmado** (observado-código, R1) |
| Shared | fora de `ClinicalModelCodeSchema` (`contracts.ts:3-10`) | `HepaticVascularCoreSchema` (`contracts.ts:47-59`) usado por ATD e DH | **ausente** |
| Android/RN | sem card (`apps/mobile/src/ui/tokens.ts:138,170`) | ATD/DH com o contrato shared; a política do ATD cita ramos portais inexistentes e omite as veias hepáticas (`apps/mobile/src/features/generate/clinicalModels.ts:33-40`) | **ausente** |
| iOS | sem caso no `ReportCategory` (`LaudoUSG/Models/Category.swift:4-6`) | ATD/DH espelhados em Swift (`Models/PendingClinicalModelContracts.swift:73-85,98-109,142-183`; `Models/ClinicalModelReportRenderer.swift:159,174-182`), atrás do rollout (`Category.swift:53,63-65`) | **ausente** |
| Conhecimento | sem snippets | `packages/knowledge/snippets/ABDOMEN_SUPERIOR/` só para modo B | **ausente** |

**Fonte de verdade:** no ATD, técnica, corpo vascular e conclusão saem do mesmo renderer compartilhado, mas o modo B é texto opaco. A conclusão ignora os achados hepatobiliares (observado-código, D3: esteatose no corpo, conclusão só vascular; `renderer.ts:29-34`, igual no iOS). É a mesma separação que produz I1 no concorrente.

## Lacunas confirmadas (Web, RN, iOS e shared)

1. **Categoria ou variante Abdome Superior com Doppler**: ausente em todas as camadas.
2. **Vaso não avaliado ou limitado, com motivo escolhido pelo médico**, no núcleo vascular hepático: o `RequiredVessel` da porta não tem estado de não avaliação (`contracts.ts:21-30`; iOS `PendingClinicalModelContracts.swift:73-77`), e o `OptionalVessel` só tem `evaluated: false`, sem motivo (`contracts.ts:32-45`; iOS `:79-85`). O único campo `limitation` dos contratos é do tórax.
3. **Atributos do trombo portal** (parcial ou completo, extensão por segmento, caráter ou vascularização interna): `portalPathology` só tem `status`, `kind`, `evidence` e `physicianConfirmed` (`contracts.ts:53-58`; iOS `:98-101`). Web e RN não têm campos próprios.
4. **Colaterais portossistêmicas e artéria esplênica**: fora do núcleo vascular (`contracts.ts:47-59`), do formulário Web de DH (`organs/dopplerHepatico.ts:136-141`), do RN e do iOS. Colaterais existem apenas nos Dopplers de membros e de aorta.
5. **Recomendações no contrato vascular abdominal**: ATD e DH não têm campo de recomendação. O único contrato com recomendação confirmável é o `QUADRIL_INFANTIL` (`contracts.ts:196-197,472`).
6. **Líquido livre no abdome superior estruturado**: não existe chave no AS (`ABDOMEN_SUPERIOR.ts:48-57`) nem campo na Web. RN e iOS só têm ditado.

## Defeitos confirmados no LaudoUSG (observado-código)

| id | Defeito | Evidência |
| --- | --- | --- |
| E1 | ditado de Abdome Superior com Doppler perde o Doppler e vira AS simples | R1/R2; `categoryNormalization.ts:49` vence `:75`; sem upgrade em `:30-33` |
| E2 | ATD aceita corpo de abdome superior sob título e técnica de abdome total | D2; `contracts.ts:66-67`; `renderer.ts:34` |
| E3 | conclusão do ATD ignora achados hepatobiliares | D3; `renderer.ts:29-33`; iOS `ClinicalModelReportRenderer.swift:159` |
| E4 | corpo do modo B pode afirmar a porta pérvia enquanto o Doppler conclui trombose (I1) | G4 |
| E5 | limitação no AS presume gás, erra o gênero e não entra na conclusão (I2) | G1/G2; `phrases/ABDOMEN_TOTAL.ts:723-729` |
| E6 | Web e RN travam ao voltar para “sem alteração portal” | D6b/D6c; Web `ClinicalModelWorkspace.tsx:152-153`; RN `ClinicalModelWorkspace.tsx:200`; o iOS corrige em `PendingClinicalModelContracts.swift:102-109` |
| E7 | ATD conclui normalidade sem confirmação explícita, com porta sintética de 6 cm/s | D4 × H1b; `defaults.ts:13`; o DH exige `normalHemodynamicsConfirmed` (`contracts.ts:385-386`) |

## Comportamento útil do concorrente

- **Um exame com dois módulos** no mesmo laudo: modo B do andar superior e Doppler hepático (observado). É o desenho certo para o LaudoUSG, desde que vire **um contrato** e não dois textos independentes.
- **Não avaliação da porta retira a normalidade portal** do bloco Doppler e aparece na conclusão (observado). O LaudoUSG hoje não tem esse estado e bloqueia o exame.
- **Trombose parcial abre campos de caráter e extensão** (observado). A estrutura é útil; o preenchimento automático não.
- **Recomendações em aba própria**, não publicadas nesta rodada (observado). O mecanismo de publicação não foi testado.

## Comportamento que não deve ser reproduzido

- normalidade de todos os vasos sem medida, incluindo colaterais e artéria esplênica (observado);
- caráter benigno, ausência de vascularização e extensão ao ramo direito marcados por padrão e publicados (observado);
- causas de limitação acrescentadas sem escolha (observado; I2);
- frase anatômica da porta independente do estado vascular (observado; I1);
- restauração que depende de reabrir o modelo: a limpeza passo a passo não foi observada, e no Doppler Hepático de 02/10 houve resíduo após apagar medidas (`cases/doppler-hepatico-2026-10-02.md:88`).

## Salvaguardas propostas

1. **A porta tem uma fonte só.** Com Doppler realizado, a frase anatômica da porta deriva do estado vascular ou é suprimida. Trombose, fluxo ausente, fluxo hepatofugal e não avaliação impedem “pérvia” em qualquer bloco. O teste deve exigir a ausência de “pérvia” sempre que `patency !== "patent"`.
2. **Causa de limitação nunca é presumida.** Motivo é seleção múltipla opcional (gás, janela, biotipo, cooperação, outro com texto). Sem seleção, a frase registra só a limitação.
3. **Atributos do trombo começam vazios.** Trombose sem extensão ou caráter gera pendência. Caráter tumoral ou benigno exige confirmação médica.
4. **A conclusão integra os blocos.** Itens do modo B e o item vascular saem do mesmo estado. Limitação em qualquer vaso obrigatório restringe o escopo da conclusão.
5. **Voltar para “sem alteração” limpa tipo, critério e confirmação** na Web e no RN, como o iOS já faz.
6. **Recomendações são sugestões.** Só entram no texto com confirmação ligada à revisão atual e são invalidadas por qualquer mudança no achado.

## Contrato mínimo proposto (shared, versionado, dormente até aprovação)

```text
AbdomenSuperiorDoppler v1
  categoryCode: "ABDOMEN_SUPERIOR_DOPPLER" (proposto; ou modo Doppler de ABDOMEN_SUPERIOR — decisão do Luiz)
  technique: { dopplerPerformed: boolean, fasting: "adequate"|"inadequate"|"not_informed", window: "adequate"|"limited" , limitationReasons?: Reason[] }
  organs: figado | vias_biliares | vesicula | pancreas | baco | liquido_livre | aorta? | veia_cava?   (estado por órgão, sem normal implícito)
  vascular: HepaticVascularCore estendido
    portalVein: { assessment: "evaluated"|"not_evaluated"|"limited", reasons?: Reason[], patency?, caliberCm?, velocityCms?, flow? }
    hepaticVeins | splenicVein | superiorMesentericVein | commonHepaticArtery | splenicArtery? | collaterals?   (mesma forma)
    portalThrombus?: { extent: "partial"|"complete", segments: Segment[], internalVascularity: "absent"|"present"|"not_assessed", natureConfirmed: boolean }
  conclusion: derivada de organs + vascular; sem item "normal global" quando houver achado ou limitação
  recommendations?: { text, confirmed, revision }
  physicianReviewed, normalHemodynamicsConfirmed
Regras: frase anatômica da porta ← vascular.portalVein; reasons só os selecionados; derivações limpas no mesmo estado ao desfazer.
```

## Provas necessárias antes de ativar

- baseline sem medida bloqueia ou exige confirmação explícita de normalidade, sem afirmar vasos não avaliados;
- trombose parcial sem extensão gera pendência; com extensão, a conclusão nomeia parcial e segmento, e nenhum bloco afirma a porta pérvia (I1);
- porta não avaliada sem motivo escolhido não contém “gás”, “meteorismo” nem “janela” (I2); com motivo, só o escolhido aparece; a conclusão restringe o escopo;
- esteatose ou hepatopatia no modo B entra na conclusão junto do item vascular (E3);
- ditado “abdome superior com Doppler” vai para a variante; “sem Doppler” ou “Doppler não realizado” vai para AS simples; Doppler ditado sem variante gera pendência (E1);
- ida e volta trombose → sem alteração, sem travar e sem resíduo, na Web, no RN e no iOS (E6);
- paridade de JSON e de texto entre shared, Web, RN e o espelho Swift.

## Melhorias sugeridas ao LaudoUSG

| # | Controle ou dado | Efeito no corpo e na conclusão | Salvaguardas | Web | Prompt mobile | Prioridade | Evidência e pendência | Tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Frase da porta derivada do estado vascular | elimina I1 | teste “sem pérvia se não patente” | composição única AS + vascular | o extrator não presume perviedade no modo B | **P0** | Laudário observado (C1, C2); G4 | corrige **defeito confirmado** (E4) |
| 2 | Conclusão integrada modo B + vascular | achados hepatobiliares não somem | sem “normal global” com achado ou limitação | renderer compartilhado | — | **P0** | D3 | corrige **defeito confirmado** (E3) |
| 3 | Limpeza ao voltar para “sem alteração portal” | desfazer sem travar | paridade com o iOS | `ClinicalModelWorkspace.tsx:152` | RN `:200` | **P0** | D6b/D6c | corrige **defeito confirmado** (E6) |
| 4 | Estado “não avaliado ou limitado” por vaso, com motivos selecionáveis | corpo e conclusão restritos, sem fluxo afirmado | motivo nunca presumido | nova opção em Avaliação | “não vi a porta por gases” vira o estado com motivo “gás” | **P1** | Laudário observado (C2); G1/G2 | **gap confirmado** (lacuna 2); corrige E5 |
| 5 | Variante Abdome Superior com Doppler (contrato + card + roteamento) | uma fonte para Web e ditado | dormente até aprovação clínica | card no grupo abdome | detector de título análogo ao de abdome total | **P1** | R1–R4 | **gap confirmado** (lacuna 1); corrige E1 |
| 6 | Atributos do trombo vazios por padrão | trombose descrita com extensão real | pendência sem extensão; natureza só confirmada | subcampos sob trombose | extrair só o ditado | **P1** | Laudário observado (C1) | **gap confirmado** (lacuna 3) |
| 7 | Confirmação explícita de normalidade também no ATD | sem “sem alterações” por omissão | igual ao DH | toggle já existente no DH | — | **P1** | D4 × H1b | corrige **defeito confirmado** (E7); limiares = decisão clínica |
| 8 | Colaterais e artéria esplênica opcionais | descritos só se avaliados | nunca normais por padrão | toggles na lista de vasos | extrair só se ditados | **P2** | Laudário observado (baseline) | **gap confirmado** (lacuna 4); relevância depende de revisão médica |
| 9 | Recomendações confirmáveis no contrato vascular | sugestão separada do texto | invalidar por revisão | aba ou campo próprio | nunca gerar sem confirmação | **P2** | Laudário observado (aba com cinco sugestões) | **gap confirmado** (lacuna 5) |
| 10 | Líquido livre e aorta/VCI com “não avaliados” no AS | sem normalidade implícita | — | novas seções | extrair só se ditado | **P2** | Laudário observado (baseline); L1/L6 de 05/10 | **gap confirmado** (lacuna 6); aorta/VCI = defeito confirmado em 05/10 |
| 11 | Política RN alinhada ao contrato | metadados coerentes | — | — | — | **P3** | `apps/mobile/src/features/generate/clinicalModels.ts:33-40` | candidato a lacuna (sem efeito no texto) |

**Para o orquestrador:** as salvaguardas 1 e 2 (uma fonte por estrutura e conclusão integrada) valem para todo exame que combine modo B com Doppler: Abdome Total com Doppler, Aparelho Urinário com Doppler, Pélvico com Doppler e Tireoide com Doppler. A salvaguarda de motivo não presumido vale para todos os estados de limitação, incluindo o `nao_avaliado_gases` herdado do abdome total.

## Ficha de insumo para a síntese clínica

- **Estruturas:** fígado, vias biliares, vesícula, pâncreas, baço, líquido livre, aorta e VCI (opcionais); veia porta, veias hepáticas, veia esplênica, veia mesentérica superior, artéria hepática comum, artéria esplênica (opcional) e colaterais (opcional).
- **Estados por vaso:** avaliado; limitado (+ motivos); não avaliado (+ motivos); patente; trombose parcial ou completa; fluxo hepatopetal, hepatofugal, ausente ou outro.
- **Alterações vistas no concorrente:** trombose portal parcial com caráter e extensão; porta não avaliada por limitação técnica.
- **Medidas e unidades:** calibre em cm; velocidade em cm/s; VPS, VDF e IR na artéria hepática; nenhum limiar automático sem aprovação.
- **Dependências:** frase anatômica da porta ← estado vascular; conclusão ← órgãos + vasos; escopo ← limitações; recomendações ← achado confirmado + revisão atual.
- **Corpo:** órgãos do andar superior, depois o bloco vascular com os vasos avaliados; limitações com motivo escolhido.
- **Conclusão:** itens do modo B e item vascular integrados; trombose com extensão; limitação restringe o escopo; nunca normal global com vaso obrigatório não avaliado.
- **Riscos que exigem confirmação médica:** natureza do trombo; hipertensão portal; normalidade hemodinâmica; texto das recomendações; redação final de todas as frases.

## Evidências relacionadas

- `cases/abdome-superior-com-doppler-2026-10-07.md` (observação do concorrente)
- `/tmp/laudario-abdome-superior-doppler-preflight-2026-10-07.md` (estado no HEAD, provas S0–R4, D0–D9 e H0–H1b, roteiro da UI)
- `audits/lote2/abdome-superior-2026-10-05.md` (L1–L7 do Abdome Superior, ainda válidos)
- `crosswalk-doppler-hepatico-2026-10-02.md` e `cases/doppler-hepatico-2026-10-02.md` (núcleo vascular e trombose no exame isolado)
- `crosswalk-abdome-total-2026-10-02.md` (módulo anatômico vizinho)
