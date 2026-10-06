# Morfológico do 2º trimestre (`MORFOLOGICO`): execução sintética e requisitos

- Data: 05/10/2026. Base: `01155d0` (main = worktree).
- Laudário: **não observado** (sem navegador). Só a existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 12: “Morfológico 1º, 2º e 3º Trimestre”; linha 13: variantes gemelares). Nenhuma frase do concorrente foi vista ou copiada.
- Probe: `audits/probes/probe-morfologico-2026-10-05.ts` (caminho Web real: `adaptarMorfologico` → `renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], dados)`; cenários de ditado chamam `renderMorfologico` direto).
- Compõe com `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §2. Biometria básica, PFE, percentil, datação, placenta, líquido e cordão seguem **aquele contrato**. Este documento só acrescenta o que é próprio do morfológico.

## 1. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web | `apps/web/src/lib/deterministic/organs/morfologico.ts` (formulário 1t/2t/3t) + `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts:83` (adaptador); migrada (`migradas.ts:34`) | **estruturado ativo**, mas a anatomia é só 4 sistemas com normal/alterado |
| API (ditado) | `apps/api/src/server/renderer/categories/MORFOLOGICO.ts` (`render2t3t` :726). `RENDERER_CATEGORIES` vazio por padrão (`env.ts:74`) e vazio em produção na verificação de 03/10 → ditado vai a `writer-pure` | **estruturado dormente** para o ditado |
| Writer / conhecimento | `packages/knowledge/snippets/MORFOLOGICO/` (templates 1t/2t/3t + 14 regras); `prompts/contracts/MORFOLOGICO.ts` | **genérico** (texto-modelo com normalidade embutida) |
| Android/RN | `apps/mobile/src/ui/tokens.ts:160`; `generate.tsx:1195` (atalhos obstétricos); análise de imagem com Doppler opcional | **genérico** (ditado livre → writer) |
| iOS | `Models/Category.swift:16`; `GenerateViewModel.swift:24` (atalhos de IG e “sem vitalidade”) | **genérico** |
| shared | sem modelo clínico de anatomia fetal em `packages/shared/src/clinicalModels/` | **ausente** |
| Golf ball | `renderer/categories/golfBall.ts`, ligado só no ditado (`pipeline/renderer.ts:559`, flag `GOLF_BALL_SNIPPET`, default OFF) | **parcial**: inexistente na Web |

## 2. Inventário do formulário Web (2º trimestre)

| Seção | Campo → opções | Padrão inicial |
| --- | --- | --- |
| IG e datas | IG biométrica, referência DUM/1ª US (módulo da obstétrica) | vazio |
| Feto | situação (longitudinal/transversa) + apresentação; dorso; atividade cardíaca (presente/ausente/bradi/taqui); BCF; movimentos; vasos do cordão | longitudinal **cefálica**, **presente**, **ativos**, cordão “Não informar” |
| Anatomia | `snc`, `face`, `coracao`, `visceras` → normal/alterado (+ descrição e diagnóstico livres); genitália | os 4 sistemas **normais**; genitália não avaliada |
| Biometria | DBP, CC, cerebelo, cisterna magna, binocular, CA, fêmur, tíbia, fíbula, úmero, rádio, ulna (um valor por osso), peso | vazio |
| Extra-fetal | placenta (local, grau), ILA, líquido subjetivo | líquido **normal** |
| Complementos | cervicometria (addon), Doppler, crescimento fetal | desligados |
| Achados | texto livre (só corpo) | vazio |

Não existem: extremidades/membros, tórax, parede abdominal, rins por lado, estado “limitada/não avaliada” por sistema, marcadores menores, MBV, relação placenta–orifício interno (só via addon de cervicometria, em cm).

## 3. Provas (dados sintéticos, 22s1d quando medido)

| Cenário | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| M1 estado inicial | nada preenchido | feto cefálico, BCF presente, movimentos ativos, 4 sistemas normais, **cordão com três vasos**, líquido normal, OI fechado, biometria `____` | IG `____`; líquido normal; **morfologia sem alteração** | nenhuma | **defeito confirmado P0**: morfologia normal concluída sem uma medida e sem marcação. Cordão afirmado com o campo em “Não informar” (`MORFOLOGICO.ts:555`) |
| M2 pielectasia esquerda 7 mm | Vísceras = alterado, descrição e diagnóstico | lado esquerdo com 7 mm no fim do corpo; **some a normalidade de estômago, bexiga e aorta** | IG; líquido; dilatação da pelve renal esquerda (7 mm) | nenhuma | lateralidade correta (vem do texto livre). **Defeito P1**: o sistema “vísceras” é grosso demais; marcar o rim apaga estruturas avaliadas e normais. Rim direito só aparece se digitado |
| M3 pé torto direito | sem sistema de extremidades → Achados livres | descrição no fim do corpo | IG; líquido; **nenhum item do achado** e a normalidade morfológica some | nenhuma | **defeito confirmado P0**: malformação no corpo sem par na conclusão |
| M4 coração limitado pela posição | sem estado “limitada” → texto livre | **“coração com quatro câmaras visíveis” mantido** + frase de limitação | sem restrição de escopo; normalidade some sem explicação | nenhuma | **defeito confirmado P0**: corpo contraditório (afirma e limita o mesmo órgão); não há como registrar avaliação limitada na Web (`morfologicoParaCatalogo.ts:165` força `anatomia_avaliada: true`) |
| M5a foco ecogênico intracardíaco (livre) | Achados livres | frase no fim do corpo | sem item do marcador | nenhuma | **defeito P1**: marcador sem conclusão |
| M5b foco ecogênico (Coração alterado) | corpo + diagnóstico | **some “quatro câmaras”** | item do marcador | nenhuma | **defeito P1**: o marcador apaga a visão de 4 câmaras, que continua normal |
| M6 remoção | Vísceras alterado → normal (subcampos ficam no estado) | volta ao normal, sem sobra | volta ao normal | nenhuma | **correto** |
| M7 contradição | ILA 30 cm com líquido “Normal” | ILA 30 cm | polidrâmnio (ILA 30 cm) | nenhuma | medida vence (correto); **lacuna P2**: sem aviso da contradição |
| M8 sistema alterado vazio | Face = alterado, sem texto | normalidade da face some | sem item | **bloqueante** | **correto** (já existe a pendência) |
| M9 ditado, `anatomia_avaliada=false` | renderer direto | anatomia inteira some | IG e líquido; **sem item de limitação** | n/a | **defeito P1**: limitação vira silêncio |
| M10 ditado + golf ball (flag simulada ON) | renderer direto | frase do marcador no bloco do coração | item do marcador com sugestão de eco fetal + “demais aspectos sem alteração” | n/a | comportamento desejado; existe só no ditado e com flag OFF |

Observação: um valor de osso longo sem lado é repetido nos dois lados (regra da casa em `snippets/MORFOLOGICO/regra/ossos-longos-bilaterais.md`). É decisão do Luiz, mas a Web não tem como informar valores diferentes por lado, e um encurtamento unilateral não é representável.

## 4. Lacunas da Web (e paridade)

1. **P0 — normalidade sem dado** (`defeito confirmado`, M1): os 4 sistemas e o cordão nascem normais. Exigir marcação explícita por estrutura ou o botão “Exame normal” consciente.
2. **P0 — achado fora dos sistemas não chega à conclusão** (`defeito confirmado`, M3/M5a): o texto livre zera a normalidade sem item. Todo achado precisa de item de conclusão ou dispensa explícita.
3. **P0 — sem estado “limitada/não avaliada” por estrutura** (`defeito confirmado`, M4/M9): hoje a frase normal permanece ao lado da limitação.
4. **P1 — granularidade**: rins (D/E), membros por segmento e lado, tórax, parede abdominal, coluna separada do crânio (`candidato a lacuna`).
5. **P1 — marcadores menores estruturados** (foco ecogênico, pielectasia leve, prega nucal, intestino hiperecogênico, artéria umbilical única, ventriculomegalia leve) com a regra de “marcador isolado” e sem apagar a normalidade do restante (`candidato a lacuna`; golf ball só no ditado).
6. **P1 — cordão afirmado sem avaliação** (`defeito confirmado`, M1).
7. **P2 — avisos de contradição** (ILA × subjetivo; M7). Gemelar ausente na Web (`inferido` do cabeçalho do módulo).
8. **Paridade**: RN e iOS dependem do writer e do template com normalidade embutida (`genérico`). O renderer estruturado do ditado está dormente.

## 5. Requisitos originais

### 5.1 Modelo normal (só o que é próprio do morfológico; o resto segue §2.2 do contrato obstétrico)

| Estrutura | Dado mínimo para “normal” | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Crânio e SNC (calota, ventrículos, cerebelo, cisterna) | estado marcado + átrio ventricular e cerebelo/cisterna em mm | estruturas vistas e medidas | sem item quando todas normais |
| Coluna | estado marcado (planos sagital e transversal) | integridade | — |
| Face (perfil, lábio, órbitas) | estado marcado | estruturas vistas | — |
| Coração (4 câmaras, vias de saída, 3 vasos) | estado por plano | planos avaliados, listando o que foi visto | sem item; vias de saída “não avaliadas” geram ressalva |
| Tórax, parede abdominal, estômago, intestino | estado marcado | presença/aspecto | — |
| Rins e bexiga | estado por lado + pelve renal AP em mm quando medida | por lado | — |
| Membros | estado por segmento e lado (mãos, pés, ossos longos) | por lado | — |
| Genitália | opcional | só quando informada | — |
| Síntese | todas as estruturas obrigatórias marcadas | — | “morfologia sem alteração detectável” **só** com todas avaliadas; com alguma limitada, frase restrita às avaliadas + item de limitação |

### 5.2 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `pelve_renal_dilatada` | lado + AP em mm + IG | medida por lado | item com lado e medida; classe só se o corte for aprovado | lateralidade obrigatória; corte por IG `candidato` (consenso de dilatação do trato urinário), a aprovar |
| `pe_torto` | lado (D/E/bilateral) | posição do pé | item com lado | não presumir bilateral |
| `ventriculomegalia` | lado + átrio em mm | medida | item com classe derivada | faixas `candidato` (diretriz de neurossonografia), a aprovar |
| `foco_ecogenico_intracardiaco` | ventrículo (D/E) + isolado sim/não | descrição no bloco do coração, mantendo 4 câmaras | item próprio; sugestão de seguimento separada e opcional | marcador isolado não apaga outras normalidades |
| `outro_marcador_menor` | tipo (lista fechada) + medida quando houver | descrição | item | contagem de marcadores visível ao médico |
| `malformacao_estrutural` | estrutura (lista) + descrição + lado | descrição | item obrigatório | `physicianConfirmed` antes de publicar |
| `avaliacao_limitada` | estrutura(s) + motivo (posição fetal, biotipo, IG, oligoâmnio) | “não adequadamente avaliada(s) por …” | item listando o que ficou de fora e, opcionalmente, reavaliação | remove a frase normal da estrutura; impede a síntese “sem alteração” global |
| `osso_longo_assimetrico` | osso + medida D e E | medidas por lado | item somente se o médico marcar | não espelhar valor quando um lado for informado |

### 5.3 Formulário Web

- Seções: datação (compartilhada com a obstétrica) → feto → anatomia por estrutura (lista acima, com três estados: avaliada normal / alterada / limitada-não avaliada) → biometria (mm, D/E opcional por osso) → extra-fetal (componente da obstétrica: placenta com relação ao OI em mm, líquido por método) → complementos.
- Nada pré-marcado como normal. Botão “Anatomia normal” marca tudo de uma vez e fica registrado.
- Pendências bloqueantes: estrutura obrigatória sem estado; alteração sem item de conclusão; achado lateralizável sem lado; texto livre presente sem item ou dispensa.
- Avisos: subjetivo × ILA/MBV divergentes; IG fora da janela do 2º trimestre (janela `candidata` 18–24 semanas, a aprovar); “limitada” sem motivo.

### 5.4 Prompt mobile (extrator)

- Extrair por estrutura o estado ditado; silêncio = `não avaliado`, nunca normal.
- Lado obrigatório em rim, membros, pé, ventrículo cerebral e cardíaco; sem lado → pendência.
- “Não consegui ver”, “posição desfavorável”, “prejudicado” → `avaliacao_limitada` com a estrutura.
- Marcadores menores pela lista fechada; nunca transformar marcador em diagnóstico de síndrome.
- Nunca afirmar cordão, coração ou face normais sem menção.

### 5.5 Fronteiras

- **OBSTETRICA**: o obstétrico tem anatomia básica (§2.2 do contrato); o morfológico é a avaliação sistematizada. Mesmo bloco de biometria/placenta/líquido; o morfológico só acrescenta estruturas, marcadores e a regra de síntese.
- **ECOCARDIOGRAFIA_FETAL (proposta)**: o morfológico avalia 4 câmaras, vias de saída e 3 vasos como rastreio. Achado cardíaco ou marcador cardíaco gera item com sugestão de ecocardiografia fetal, nunca a descrição funcional detalhada (que é da eco fetal; ver `crosswalk-ecocardiografia-fetal-2026-10-03.md`).
- **Avaliação limitada**: regra única para o grupo obstétrico, já prevista no §2.2 (“avaliação anatômica limitada”). Aqui ela é por estrutura e sempre gera item.

## 6. Perguntas para a rodada no concorrente

1. O 2º trimestre afirma anatomia normal sem nenhuma marcação? Existe botão de normal global?
2. Quais estruturas ele lista (rins por lado? membros por segmento? vias de saída?) e se há estado “não avaliado/limitado” por estrutura.
3. Como trata marcador isolado (foco ecogênico, pielectasia): corpo, conclusão, sugestão de eco fetal?
4. Ossos longos: um valor ou um por lado? Espelha valor?
5. Como lida com achado em texto livre: gera item de conclusão?
6. Como separa morfológico de 2º do obstétrico 2º/3º (campos a mais, título, síntese).

## 7. Ordem de implementação sugerida

1. **P0** Estado “limitada/não avaliada” por sistema na Web + `anatomia_avaliada` vindo da tela; item de limitação na conclusão (renderer já tem metade).
2. **P0** Pendência bloqueante para texto livre sem item de conclusão (generalizar o bloqueio que já existe em M8).
3. **P0** Retirar normalidade pré-marcada (sistemas e cordão); botão “Anatomia normal”.
4. **P1** Quebrar “vísceras” em estruturas, rins por lado; adicionar membros e tórax.
5. **P1** Marcadores menores estruturados, levando o golf ball para a Web sem flag de ditado.
6. **P1** Ossos longos com D/E opcionais na Web.
7. **P2** Avisos de contradição; gemelar pelo contrato obstétrico.

## 8. Implementação parcial em 06/10/2026

O primeiro P0 da ordem acima foi concluído para os quatro sistemas já existentes na Web: crânio/SNC/coluna, face, coração e vísceras/aorta. Cada sistema agora oferece o estado **Limitada**, exige o motivo e envia uma limitação estruturada ao renderer. A frase normal daquele sistema é retirada do corpo; a limitação aparece no corpo e na conclusão; a síntese global “sem evidência de alteração” também é retirada. O comportamento foi coberto nos estilos clássico e objetivo, e o modelo oficial normal permaneceu inalterado quando nenhuma limitação é selecionada.

Esta entrega corrige o cenário M4 dentro da granularidade atual. Ela não representa nova observação funcional do Laudário e não fecha M9 para limitação global ditada, nem a expansão de estruturas descrita em 5.1. A rodada funcional no concorrente continua pendente para confirmar controles e interações sem copiar redação.
