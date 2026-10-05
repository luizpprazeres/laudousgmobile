# Morfológico do 3º trimestre (`MORFOLOGICO`, trimestre = 3t): execução sintética e requisitos

- Data: 05/10/2026. Base: `06c88cd` (execução na main `407362d`; nenhum arquivo envolvido mudou).
- Laudário: **não observado** (sem navegador). Só a existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 12: “Morfológico 3º Trimestre”; linha 13: o gemelar lista só 1º e 2º trimestres).
- Probe: `audits/probes/probe-morfologico-3t-2026-10-05.ts` (caminho Web real: `adaptarMorfologico(estado, { trimestre: "3t" })` → `renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], dados)`).
- Não repete o 2º trimestre (`audits/lote2/morfologico-2-trimestre-2026-10-05.md`): normalidade pré-marcada, sistemas grossos, texto livre sem item, ausência de estado limitado e cordão afirmado valem igualmente aqui, porque o 3t usa **o mesmo formulário e o mesmo renderer**. Compõe com `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §2 (biometria, PFE, percentil, crescimento, placenta, líquido).

## 1. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web | variante do card `MORFOLOGICO` (controle “Trimestre = 3º”, `apps/web/src/lib/deterministic/organs/morfologico.ts:481-491`); mesmas seções do 2t (`:452-462`); adaptador `morfologicoParaCatalogo.ts:83` | **estruturado ativo** (herda o 2t) |
| Diferenças 3t no renderer | `render2t3t(f, terceiro=true)` (`apps/api/src/server/renderer/categories/MORFOLOGICO.ts:726`): título próprio; sem distância binocular (`:755`); sem frase do orifício interno (`:738-741`); placenta “heterogênea, de acordo com a fase” (`placentaMorfo`, `:608`) | **variante** (três diferenças de texto) |
| Doppler | addon do morfológico usa `dopplerDaTela` (`apps/web/src/lib/catalog/dopplerParaCatalogo.ts`), o mesmo adaptador do `DOPPLER_OBSTETRICO`, e `renderDopplerModule` (`dopplerObstetricoModule.ts:201`) | **composição por referência** (já existe) |
| Crescimento | addon `crescimento_fetal` com percentil digitado e curva (`fetalGrowthParaCatalogo.ts:21`) | **parcial** (opt-in; ver contrato obstétrico §2.4) |
| API (ditado) | mesmo `render2t3t`; `RENDERER_CATEGORIES` vazio por padrão | **estruturado dormente** |
| Writer / conhecimento | `snippets/MORFOLOGICO/modelo/template-3t.md` = template 2t + duas frases de “maturidade intestinal/pulmonar” (`:36-37`) | **genérico**, e **diverge** do renderer/Web (que não têm essas frases) |
| Android/RN, iOS | categoria única “Morfológico”; writer | **genérico** |
| shared | sem modelo clínico de anatomia fetal; Doppler e crescimento no shared | **parcial** |

## 2. Inventário do formulário Web (3t)

Idêntico ao 2t (ver lote 2, §2), com: binocular presente no formulário mas omitida no texto; frase do orifício interno omitida; cervicometria, Doppler completo (uterinas, umbilical, ACM, ducto, RCP, perfil, centralização) e crescimento fetal como addons desligados. Padrões: apresentação **cefálica**, vitalidade **presente**, movimentos **ativos**, 4 sistemas **normais**, líquido **normal**, cordão “Não informar” (mas o renderer afirma três vasos). Não existem: átrio ventricular em mm, sistemas por lado, achados tardios tipados, estado limitado.

## 3. Provas (dados sintéticos, 32s2d quando medido)

| Cenário | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| S1 estado inicial | nada preenchido | cefálico, BCF presente, 4 sistemas normais, biometria `____`, **cordão com três vasos**, líquido normal | IG `____`; líquido normal; **morfologia sem alteração** | nenhuma | **defeito confirmado P0** (mesmo M1 do 2t) |
| S2 normal medido | biometria completa, ILA 13 | sem binocular, sem OI, placenta heterogênea grau II | IG 32s2d; líquido normal; morfologia sem alteração | nenhuma | **correto** quanto às diferenças do 3t; normalidade anatômica ainda sem marcação |
| S3 ventriculomegalia leve unilateral esquerda (átrio 11 mm) | SNC = alterado, descrição + diagnóstico | **some também a frase da coluna**; a descrição vai para o **fim do corpo**, depois do líquido | item com lado e medida; síntese normal retirada | nenhuma | lateralidade correta (vem do texto). **Defeito P1**: SNC e coluna no mesmo sistema; achado fora do bloco anatômico; sem campo de átrio e sem classe derivada |
| S3b mesma ventriculomegalia só em achados | texto livre | “estruturas cranianas … normais” **mantida** + átrio de 11 mm no fim | **nenhum item**; síntese some | nenhuma | **defeito confirmado P0**: corpo contraditório e conclusão sem o achado |
| S4 limitada por posição + oligoâmnio (ILA 4) | líquido + texto livre | face e coração **normais afirmados** + frase de limitação | oligoâmnio (ILA 4 cm); **sem item de limitação** | nenhuma | **defeito confirmado P0**: limitação vira silêncio; a relação oligoâmnio → avaliação limitada não é registrável |
| S5 Doppler: umbilical 1,45, ACM 1,10, uterinas 0,9/1,0 | addon Doppler | bloco “DOPPLERVELOCIMETRIA” com percentis (ACM p1, RCP < p1) | ACM alterada, RCP < p5, perfil > 1; **“ausência de sinais de incisuras”** com o campo no padrão; morfologia sem alteração mantida | nenhuma | composição com `DOPPLER_OBSTETRICO` **funciona** (mesmo módulo). **Lacuna P1**: incisura afirmada sem marcação; sem integração com crescimento/PFE (PIG/RCF) |
| S6 3t com IG 22 semanas | trimestre × IG | placenta “heterogênea, de acordo com a fase” aos 22 s; binocular omitida | IG 22 s; normal | nenhuma | **defeito P2**: sem aviso; derivação do texto pelo controle, não pela IG |
| S7 remoção | SNC alterado → normal | volta ao normal | volta ao normal | nenhuma | **correto** |

## 4. Lacunas da Web (e paridade)

1. **P0 — herdadas do 2t** (`defeito confirmado`, S1/S3b/S4): normalidade sem dado, texto livre sem item, limitação sem item. Corrigir uma vez no contrato do morfológico corrige os dois trimestres.
2. **P1 — achados de aparecimento tardio sem tipo** (`candidato a lacuna`, S3): ventriculomegalia (átrio por lado), dilatação do trato urinário (pelve renal AP por lado), microcefalia/macrocrania (CC e percentil), cistos abdominais, derrames, displasias esqueléticas (encurtamento por osso e lado), arritmias, mioma/placenta como achados maternos. Hoje dependem do texto livre ou de um sistema inteiro.
3. **P1 — Doppler e crescimento como peças soltas** (`inferido`, S5): o Doppler é bem composto, mas a conclusão não cruza percentil de PFE + Doppler (classificação PIG/RCF é do contrato obstétrico); incisura afirmada por padrão.
4. **P1 — divergência writer × Web/renderer** (`defeito confirmado` por leitura, `template-3t.md:36-37`): o ditado sai com frases de maturidade intestinal e pulmonar que o formulário não tem; afirmação sem dado mínimo e de valor clínico discutível — a decidir pelo Luiz.
5. **P2 — trimestre escolhido à mão** (S6): placenta, binocular e OI dependem do controle e não da IG; sem aviso.
6. **Paridade**: RN/iOS genéricos; gemelar ausente (o catálogo do concorrente também não lista o 3t gemelar — `não observado no concorrente` além do catálogo).

## 5. Decisão de contrato

**(b) variante do `MORFOLOGICO`** (código canônico proposto: `MORFOLOGICO` com `trimestre: "3t"`), **sem contrato próprio**. Justificativa: o modelo normal por estrutura é o mesmo do 2t (lote 2, §5.1); o que muda é (i) janela de IG, (ii) três diferenças de texto já implementadas, (iii) uma biblioteca de achados tardios que também serve ao 2t, e (iv) composição por referência com `DOPPLER_OBSTETRICO` e com o bloco de crescimento do contrato obstétrico. Um contrato separado duplicaria a anatomia e reabriria a divergência que hoje existe entre o template do writer e o renderer.

## 6. Requisitos originais (só o que é próprio do 3t; o restante é o lote 2 §5 e o contrato obstétrico §2)

### 6.1 Modelo normal — diferenças

| Estrutura | Dado mínimo para “normal” | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Janela | IG ≥ 28 semanas (`candidata`, a aprovar) | — | aviso quando divergir do trimestre escolhido |
| SNC | átrio ventricular por lado em mm + cerebelo/cisterna | medidas por lado | sem item quando abaixo do corte |
| Rins | pelve renal AP por lado em mm | por lado | sem item quando abaixo do corte por IG |
| Biometria e PFE | DBP, CC, CA, fêmur em mm (+ ossos longos D/E opcionais) | medidas | percentil e classe pelo bloco de crescimento |
| Placenta | localização + relação com OI; textura derivada da IG | localização e aspecto | sem item quando normal |
| Doppler | bloco do `DOPPLER_OBSTETRICO` quando realizado | por referência | por referência; sem frase normal de campo não marcado |
| “Maturidade” intestinal/pulmonar | **sem dado mínimo possível** | não usar (proposta) | — |

### 6.2 Biblioteca de alterações tardias

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `ventriculomegalia` | lado (D/E/bilateral) + átrio mm | no bloco do SNC, sem apagar a coluna | item com lado, medida e classe derivada | faixas `candidatas` (leve 10–12, moderada 13–15, acentuada ≥ 16 mm, diretriz de neurossonografia), a aprovar |
| `dilatacao_trato_urinario` | lado + AP mm + IG | por lado | item com lado | cortes `candidatos` do consenso de dilatação do trato urinário (≥ 7 mm no 3º trimestre), a aprovar |
| `osso_longo_curto` | osso + lado + mm + IG | medida por lado | item somente com escore/percentil calculado | não espelhar valor do outro lado |
| `perimetro_cefalico_alterado` | CC + IG + curva | medida e percentil | item derivado | nunca “microcefalia” sem curva e confirmação |
| `cisto_ou_massa_fetal` | estrutura + lado + medidas | descrição | item obrigatório | `physicianConfirmed` |
| `derrame_cavitario` | cavidade + extensão | descrição | item; dois ou mais = alerta de hidropisia | `physicianConfirmed` |
| `avaliacao_limitada_3t` | estruturas + motivo (posição, sombra óssea, oligoâmnio, biotipo) | “não adequadamente avaliadas” | item com escopo | retira a síntese global |
| `doppler_alterado` | por referência ao bloco Doppler | — | itens do bloco | não duplicar valores |

### 6.3 Formulário Web (diferenças)

- Controle de trimestre sugerido pela IG (pode ser trocado, com aviso).
- SNC com átrio D e E; rins com AP D e E; ossos longos com D/E opcionais.
- Seção “Achados tardios” com a biblioteca acima (lista fechada + lado + medida), substituindo o texto livre como caminho principal.
- Doppler: incisura e centralização começam “não avaliadas”; o bloco de crescimento abre automaticamente quando houver PFE e IG.
- Pendências bloqueantes: as do lote 2 + achado tardio lateralizável sem lado; ventriculomegalia sem medida.
- Avisos: IG < 28 semanas com 3t; oligoâmnio sem registro de limitação; PFE < p10 sem Doppler.

### 6.4 Prompt mobile (extrator)

- Selecionar o 3t pela IG ditada, não por palavra solta; sem IG, uma pergunta.
- Extrair átrio, pelve renal e ossos com lado; sem lado → pendência.
- Nunca gerar frases de maturidade nem de incisura/centralização não ditadas.
- “Posição desfavorável”, “pouco líquido atrapalhou” → `avaliacao_limitada_3t`.

### 6.5 Casos de aceitação sintéticos

1. Formulário intocado em 3t → bloqueia; nenhuma frase normal.
2. Normal completo de 32s2d com anatomia marcada → sem binocular, sem OI, placenta pela IG; síntese normal.
3. Átrio esquerdo 11 mm, direito 7 mm → item “ventriculomegalia leve à esquerda”, coluna normal mantida.
4. Mesmo achado ditado só em texto → bloqueio até virar item tipado ou dispensa.
5. ILA 4 com face e coração limitados → oligoâmnio + item de limitação; nenhuma frase normal de face/coração.
6. Doppler com ACM p1 e RCP < p5, PFE p6 → itens do Doppler + classificação de crescimento pelo contrato obstétrico; incisura só se marcada.
7. 3t escolhido com IG 22 → aviso; textura placentária pela IG.
8. AP renal direita 9 mm, esquerda 4 mm → item à direita; rim esquerdo descrito normal.

## 7. Perguntas para a rodada no concorrente

1. O 3º trimestre é tela própria ou variante do 2º? Quais campos mudam?
2. Há achados tardios tipados (átrio por lado, pelve renal por lado)?
3. Doppler entra no morfológico do 3º ou exige o exame com Doppler à parte?
4. Aparece alguma afirmação de maturidade pulmonar/intestinal?
5. Avaliação limitada por oligoâmnio/posição gera item?

## 8. Ordem de implementação sugerida

1. **P0** Corrigir no contrato comum do morfológico (lote 2, passos 1–3): vale para o 3t sem trabalho extra.
2. **P1** Átrio e pelve renal por lado; biblioteca de achados tardios com item derivado.
3. **P1** Incisura/centralização “não avaliadas” por padrão; crescimento integrado ao Doppler.
4. **P1** Decisão do Luiz sobre as frases de maturidade do `template-3t.md`; alinhar writer e renderer.
5. **P2** Trimestre sugerido pela IG e textura placentária derivada da IG.
