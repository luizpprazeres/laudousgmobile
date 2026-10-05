# Obstétrico 2º/3º trimestre — gemelar

- Data: 05/10/2026. Base: `06c88cd` (main e worktree no mesmo commit).
- Laudário: **não observado** (sem navegador). Só sabemos que o exame existe no catálogo: `catalogo-ultrassonografia-2026-10-02.json`, linha 13 (grupo `obstetrica_gemelar`). Os combinados com perfil biofísico estão na linha 24.
- Fronteiras (não estudadas aqui):
  - **1º trimestre gemelar** é coberto por `gestacao_inicial: true` com `numero_fetos ≥ 2`. Ali vale o CCN por feto; corionicidade e amnionicidade são obrigatórias e são a origem preferida.
  - **Com Doppler gemelar:** o módulo Doppler é único por exame (`dopplerObstetricoModule.ts:16`), sem eixo de feto. Isso é lacuna (G-9).
- Prova: `audits/probes/probe-obstetrico-gemelar-2026-10-05.ts`, que roda `renderObstetrica` (caminho do ditado) e `renderizarSelecao("OBSTETRICA","CLASSICO_COMPLETO")` (catálogo), com 13 cenários sintéticos.
- Já provado e só referenciado aqui: MBV gemelar conclui "normal para ambos" sem avaliar os valores (`execucao-sintetica-pelve-obstetrico-2026-10-05.md`, O3).
- Os requisitos abaixo **estendem** o contrato de `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §2 para N fetos. Não o duplicam.

## 1. Decisão de modelagem

**Escolha: (b) variante do contrato `OBSTETRICA` existente.** Não é um formulário novo.
- O canônico já tem `numero_fetos`, `corionicidade`, `fetos[]` e `liquido_mbv_por_feto_cm` (`OBSTETRICA.ts:39-121`). Ele também já é consumido pelo ditado, pelo catálogo e pela Biblioteca, que tem a semente "Gemelar" em `modeloNormalRegistry.ts:164`.
- O que muda:
  - um cabeçalho de gestação múltipla;
  - o bloco por feto vira uma lista com N entradas;
  - placenta e líquido passam a ter entradas por feto ou compartilhadas;
  - entram derivados e alertas próprios da gestação múltipla.
- Código proposto: continuar `OBSTETRICA`, com o modo `multipla` derivado de `numero_fetos ≥ 2`. A variante Doppler compõe `DOPPLER_OBSTETRICO` **por feto**. Só proposta.

## 2. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web | `apps/web/src/lib/deterministic/organs/obstetrica.ts:8` diz "PENDENTE: gemelar". O adaptador fixa `numero_fetos: 1, corionicidade: null` em `obstetricaParaCatalogo.ts:178-180`. | **ausente** |
| Android/RN | Não há formulário gemelar. A análise de imagem envia `gemelar: false` (`apps/mobile/src/features/imaging/imageAnalysis.ts:107`). O gemelar só chega pelo ditado. | ausente (só ditado) |
| iOS | `BiometricData.swift:113` tem `gemelar: Bool?`. `ImageAnalysisService.swift:64` envia `false`. A Biblioteca mostra o cenário gemelar (`LibraryView.swift:41`). | parcial (prévia) |
| API ditado | `OBSTETRICA.ts:1194-1265` (clássico) e `:1617-1690` (objetivo): blocos por feto, peso médio, divergência ≥ 20%, MBV por feto. O guard de vitalidade lê por bloco (`fetalVitalityGuard.ts:71,127`). O de gemelaridade alucinada fica em `dopplerOverlay.ts:704`. | estruturado, depende de `RENDERER_CATEGORIES` (vazio em produção em 03/10) → hoje o caminho real é o writer |
| Catálogo | `OBSTETRICA.classico.ts:960-963` (`mbv_gemelar`, mesma frase "normal para ambos") e `:159` (placenta). | estruturado dormente |
| Conhecimento / writer | `writerV2/specs/OBSTETRICA.json:328-331`: o snippet gemelar de MBV tem a conclusão "em quantidade normal" fixa. | genérico, com o mesmo viés |
| shared | Crescimento (`fetalGrowthModule.ts:19`) e Doppler são de **exame**, não de feto. | ausente por feto |

## 3. Inventário Web

Não há controle gemelar. As seções atuais são ig, feto, biometria, placenta, líquido, cervicometria, crescimento e achados (`obstetrica.ts:474-481`). Todas são de feto único. Um médico com gemelar hoje dita, ou usa a tela de feto único e edita o texto à mão.

## 4. Provas (renderer da API e catálogo, mesma saída nos dois)

| # | Estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| G1 | DC/DA; A 1650 g, B 1620 g; MBV 4,5 e 5,1 cm | Blocos "Feto A" e "Feto B" com BCF e biometria; peso médio 1635 g; divergência 1,8%; "Duas placentas" | IG gemelar DC/DA; líquido normal para ambos; pesos concordantes | nenhuma | observado no LaudoUSG; correto. Não há linha de anatomia, movimentos nem cordão quando nada foi ditado (o feto único afirma anatomia normal; o gemelar omite) |
| G2 | A 2400 g p55; B 1800 g p4 | percentis só reproduzidos | "Divergência ponderal significativa (25%)" | nenhuma | observado. Sem item para B abaixo do p10 e sem a hipótese de RCIU seletivo para o médico confirmar: **candidato a lacuna** P1 |
| G3a | MC/DA, MBV 1,5 e 9,0 cm, `placenta_quantidade` nula | **"Duas placentas."** | "monocoriônica"; líquido **normal para ambos** | nenhuma | **defeito confirmado** P0: a quantidade de placentas é presumida igual a `numero_fetos` (`OBSTETRICA.ts:868`), o que contradiz a monocorionicidade. O MBV repete o O3 (já documentado). Não sugere transfusão feto-fetal (bom: não inventa), mas também não alerta |
| G3b | G3a + `liquido_classe: "polidrâmnio"` ditada | "Placenta única" | ainda "normal para ambos" | nenhuma | **defeito confirmado** P0: no gemelar com MBV, a classe ditada é ignorada (`:965-971`). No feto único ela vence (`:956`) |
| G3c | MC/DA, ILA global 30 cm | ILA 30 | "Polidrâmnio (ILA de 30 cm)" | nenhuma | observado. O ILA global no gemelar é aceito sem aviso; o método por saco não é exigido. Candidato P2 |
| G4a | B com `bcf_alteracao: ausente`, peso 900 g | "Ausência de batimentos…" no bloco B | "Óbito fetal (feto B)"; líquido normal para ambos; **"divergência significativa (45,5%)"** | nenhuma; guard retorna `[]` | observado (o óbito vai para o feto certo). **Defeito confirmado** P1: o feto sem vitalidade entra no peso médio e na divergência. Não há confirmação médica obrigatória. Não há alerta ao sobrevivente, que importa em MC |
| G4b | B sem BCF e sem alteração | **"Batimentos cardíacos presentes (BCF = ____ bpm)"** | sem item | nenhuma | **defeito confirmado** P0: vitalidade afirmada sem dado (`:1203-1206`) |
| G5a | sem rótulo, sem posição, sem apresentação | "Dois fetos: o feto A, e o feto B." | normal | nenhuma | **defeito confirmado** P1: os rótulos A/B saem da ordem do array (`:1198`). Sem posição não há âncora reprodutível entre exames. A apresentação omitida some em silêncio |
| G5b | B listado primeiro, à direita; MBV 1,2 / 5,0 | "feto à direita (feto B)"; MBV 1,2 cm (feto B) | normal para ambos | nenhuma | observado: a atribuição segue o índice do array. Não há validação de que o rótulo bate com a posição |
| G5c | rótulos duplicados A/A | dois blocos "Feto A" | "…(feto A) e … (feto A)" | nenhuma | **defeito confirmado** P0: o schema aceita rótulos duplicados |
| G5d | `numero_fetos: 2` com um só item em `fetos[]` e dois MBV | "Dois fetos: o feto A" + MBV do "feto B", que não existe | normal para ambos; sem divergência | nenhuma | **defeito confirmado** P0: não há validação cruzada entre contagem, `fetos.length` e `liquido_mbv_por_feto_cm.length` (`:118-121, 195`) |
| G6 | trigemelar TC/TA | título "…GEMELAR"; "…, e … , e …" | "**ambos** os fetos" com 3 valores; divergência máx–mín 27,3% | nenhuma | **defeito confirmado** P1: o schema permite 3 fetos, mas o texto é de gêmeos. A divergência não diz entre quais fetos |
| G1-obj | estilo objetivo | equivalente | equivalente | — | mesmos comportamentos |

## 5. Lacunas

- **G-1 (P0, defeito):** "normal para ambos" sem avaliar o valor de cada feto. Corrigir no renderer, no catálogo (`OBSTETRICA.classico.ts:963`) e no snippet do writer (`OBSTETRICA.json:331`).
- **G-2 (P0, defeito):** na MC sem quantidade informada, saem "Duas placentas". A placenta deve derivar da corionicidade ou ficar pendente.
- **G-3 (P0, defeito):** BCF "presentes" sem valor e sem estado no gemelar.
- **G-4 (P0, defeito):** rótulos duplicados ou ausentes, e contagens inconsistentes, passam sem bloqueio.
- **G-5 (P1, defeito):** feto sem vitalidade entra no peso médio e na divergência. Falta confirmação obrigatória e alerta ao cogêmeo na MC.
- **G-6 (P1, candidato):** PFE abaixo do p10 em um feto com divergência ≥ corte não gera a hipótese de RCIU seletivo para confirmação. O crescimento (`fetal_growth`) é de exame, não de feto.
- **G-7 (P1, defeito):** trigemelar com "ambos", título e lead "gemelar". A divergência não diz o par.
- **G-8 (P1, candidato):** corionicidade é texto livre (`:119`), sem enum, sem origem (exame atual ou 1º trimestre) e sem amnionicidade separada. Uma MC/MA não muda nada no texto.
- **G-9 (P1, candidato):** Doppler e crescimento são únicos por exame. Na variante "com Doppler gemelar" não há onde gravar a umbilical do feto B.
- **G-10 (P2, candidato):** anatomia básica, movimentos e cordão são omitidos por feto (comportamento oposto ao feto único). Faltam sexo opcional, placenta por feto (localização) e inserção do cordão.
- **G-11 (Web, P0 do produto):** a Web não oferece gemelar nenhum. Mobile e iOS não têm formulário; o iOS só tem a prévia da Biblioteca.

## 6. Requisitos originais (extensão N fetos do contrato §2)

### 6.1 Cabeçalho da gestação múltipla
| Campo | Tipo/opções | Inicial | Regra |
| --- | --- | --- | --- |
| `numero_fetos` | inteiro 2–4 | — (obrigatório) | define N entradas em `fetos[]`; incoerência = bloqueio |
| `corionicidade` | enum `mono` / `di` / `tri` / `indeterminada` | indeterminada | não pode passar de N |
| `amnionicidade` | enum `mono` / `di` / `tri` / `indeterminada` | indeterminada | amnionicidade < corionicidade é inválida |
| `corionicidade_origem` | `exame_atual` / `us_1tri` (com data) / `informada` | — | obrigatória quando não for indeterminada. A conclusão cita a origem quando vier do 1º trimestre |
| `sinal_membrana` | `lambda` / `T` / `nao_avaliado` | nao_avaliado | só aparece se a origem for `exame_atual`. Divergir da corionicidade gera aviso |

### 6.2 Por feto (`fetos[i]`): aba "Feto A/B/C"
| Campo | Tipo / unidade / faixa plausível | Inicial | Observação |
| --- | --- | --- | --- |
| `rotulo` | A–D, único | gerado na criação, **imutável** | nunca reordenar por índice; aparece no corpo e na conclusão |
| `posicao` | `direita` / `esquerda` / `superior` / `inferior` / `anterior` / `posterior`, combináveis | — | obrigatória no 2º/3º trimestre (é a âncora do rótulo); aviso se dois fetos tiverem a mesma posição |
| `sexo` | `masculino` / `feminino` / `nao_avaliado` | nao_avaliado | opcional; ajuda a manter o rótulo entre exames |
| situação, apresentação, dorso | igual ao §2 | — | sem cefálica por padrão |
| `vitalidade` | `presente` + BCF (bpm, 60–220) / `ausente` | — | **sem estado = pendência**; ausente exige `physicianConfirmed` |
| movimentos, anatomia básica | igual ao §2 (três estados) | não avaliado | — |
| biometria | DBP, CC, CA, CF em mm (faixas do §2) | vazio | — |
| PFE + percentil | calculados no shared (fórmula, curva e versão) | — | curva gemelar ou de feto único: decisão do Luiz (D-G1) |
| `placenta_ref` | id de uma placenta da gestação | — | MC tem uma placenta compartilhada; DC tem uma ou duas (fundidas) |
| `liquido` | `mbv_cm` (0–20) / `subjetivo` | — | **por saco**; na MA, um valor compartilhado |
| cordão | vasos (`tres` / `dois` / `nao_avaliado`) e inserção (`central` / `marginal` / `velamentosa` / `nao_avaliada`) | nao_avaliado | — |

### 6.3 Placentas da gestação
- `placentas[]`, com 1 a N itens: localização, relação com o orifício interno (mm), grau opcional.
- A quantidade **deriva** da corionicidade: mono gera 1. Na di, o médico escolhe "duas" ou "fundidas" (1).
- Nunca presumir duas placentas.

### 6.4 Derivados (no shared, uma autoridade)
- **Divergência ponderal %** = (maior − menor) / maior, por par.
  - Com N = 3, a conclusão informa o par de maior divergência.
  - Exclui o feto sem vitalidade.
  - Corte **candidato** de 20% (o que o código usa; fonte provável: diretrizes de gemelaridade ISUOG). Precisa de aprovação.
- **Classe do líquido por saco:** MBV < 2 / > 8 cm (os cortes do código, candidatos). Discordância de líquido = uma classe oligo e outra poli.
- **Peso médio:** só com todos os fetos vivos e PFE presente; senão não é exibido.

### 6.5 Alertas com confirmação médica (nunca automáticos na conclusão)
| id | Gatilho | Proposta | Bloqueio |
| --- | --- | --- | --- |
| `alerta_stff` | MC + discordância de líquido | sugere a hipótese de síndrome de transfusão feto-fetal, com estágio a preencher pelo médico | só entra com `physicianConfirmed`; senão os valores e as classes por saco saem e há pendência |
| `alerta_taps` | MC + PVS da ACM de cada feto (pela variante Doppler) | hipótese de sequência anemia–policitemia | só com Doppler por feto + confirmação |
| `alerta_rcius` | PFE < p10 em um feto + divergência ≥ corte | hipótese de restrição seletiva | confirmação obrigatória; tipo (Doppler umbilical) só na variante Doppler |
| `alerta_obito_um` | um feto com vitalidade ausente | óbito de um gemelar (rótulo); na MC, aviso de risco ao sobrevivente | confirmação obrigatória |
| `alerta_mono_amniotica` | MA | sugere avaliar entrelaçamento do cordão | só aviso |

### 6.6 Formulário Web
- Cabeçalho (6.1) → abas por feto → "Gestação" (placentas, colo via cervicometria, achados com item de conclusão) → derivados (somente leitura) → alertas.
- **Copiar do feto A:** copia só a estática e o protocolo (estado de anatomia, cordão "não avaliado"). Nunca copia biometria, BCF ou MBV.
- Nada normal vem pré-marcado.
- **Pendências bloqueantes:**
  - N ≠ número de abas;
  - rótulo duplicado;
  - posição ausente;
  - vitalidade sem estado;
  - óbito sem confirmação;
  - corionicidade incoerente com o número de placentas;
  - MBV ausente em saco declarado medido;
  - alerta aberto sem decisão.
- **Avisos:** dois fetos na mesma posição; corionicidade definida só pelo exame atual após 14 semanas (precisão menor); ILA global em gemelar; divergência calculada contra PFE manual.
- **Efeito no texto:**
  - corpo: um bloco por rótulo, com a posição;
  - conclusão: um item por feto alterado, com o rótulo; os itens globais (corionicidade, divergência) vêm uma vez;
  - "ambos" só quando N = 2 **e** a classe é a mesma nos dois; com N = 3 o texto diz "os três fetos".

### 6.7 Prompt mobile (extrator)
- Extrair N, corionicidade, amnionicidade e origem.
- Atribuir cada medida ao rótulo **ditado**. Sem rótulo, não atribuir e gerar pendência.
- Nunca presumir: duas placentas, BCF presente, classe de líquido, STFF ou RCIU seletivo.

### 6.8 Casos de aceitação sintéticos
1. DC/DA, 32 semanas, pesos 1650/1620, MBV 4,5/5,1: conclusão concordante; "duas placentas" só se escolhido.
2. DC/DA, 2400/1800 (25%), B p4: divergência significativa + alerta RCIU seletivo **pendente**; sem confirmação, não entra na conclusão.
3. MC/DA, MBV 1,5/9,0: "Oligoâmnio (feto A)" e "Polidrâmnio (feto B)"; alerta STFF pendente; **uma** placenta.
4. MC/DA, B ausente sem confirmação: bloqueio; com confirmação: "óbito do feto B" + aviso ao A; a divergência não é calculada.
5. Feto B sem estado de vitalidade: bloqueio; nunca "presentes".
6. Rótulos A/A ou contagem 2 com uma aba: bloqueio.
7. Trigemelar TC/TA, MBV 4/5/6: "normal nos três sacos"; título de gestação trigemelar; divergência com o par indicado.
8. MC/MA: aviso de cordão; um MBV compartilhado.
9. Corionicidade "di" pelo 1º trimestre (data): a conclusão cita a origem.
10. Mesmo caso pela Web e pelo ditado: texto idêntico (paridade).

## 7. Perguntas para a rodada no concorrente
- O gemelar do 2º/3º trimestre tem abas por feto? Os rótulos são fixos ou por posição?
- A corionicidade é campo obrigatório? Pede a origem?
- Calcula divergência? Com que corte? Exclui feto morto?
- Classifica o líquido por saco? O que escreve com MBV discordante na MC (sugere transfusão feto-fetal sozinho)?
- Como trata trigemelar e o "ambos"?
- A variante "com Doppler" tem Doppler por feto?

## 8. Ordem de implementação sugerida
1. **P0, renderer, catálogo e snippet:** líquido por feto com classe; placenta derivada da corionicidade; vitalidade sem estado = pendência; validação de rótulos e contagens no schema (corrige G-1 a G-4).
2. **P1:** excluir o óbito dos derivados; texto para N = 3; enum de corionicidade e amnionicidade com origem.
3. **P1, shared:** derivados (divergência por par, classe por saco) e alertas com `physicianConfirmed`.
4. **P1, Web:** cabeçalho, abas por feto e adaptador `numero_fetos ≥ 2` (remover a fixação em `obstetricaParaCatalogo.ts:178-180`).
5. **P1:** crescimento e Doppler por feto (variante com Doppler gemelar).
6. **P2:** formulário no RN e no iOS com o mesmo contrato; extrator atribuindo por rótulo.

Decisões do Luiz:
- D-G1: curva de percentil em gemelar.
- D-G2: corte de divergência.
- D-G3: se a hipótese de STFF ou RCIU seletivo pode aparecer na conclusão após confirmação, ou só no corpo.
