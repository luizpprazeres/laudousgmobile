# Síntese do lote 3 — candidatos a formulário Web novo

Data: 05/10/2026. Base: `main` em `06c88cd` a `407362d`. As diferenças entre esses commits não tocam nada do que foi testado. A main foi apenas lida e executada, sem edição. Depois disso, a main recebeu o MVP de ecocardiografia fetal (`8903531`), fora do escopo deste lote.

**Laudário: não observado.** Sem navegador, as nove entradas só constam no catálogo. Cada relatório lista as perguntas para a rodada funcional. Os requisitos são originais. Os limiares aparecem apenas como candidatos, com a fonte provável.

Foco do lote: entradas do catálogo **sem formulário Web próprio** no LaudoUSG. Para cada uma, decidiu-se entre formulário novo, variante de um contrato existente ou composição. Os defeitos foram provados por execução do caminho atual (`audits/probes/`); reconferi tireoide, morfológico 1º trimestre, axilas, gemelar e o lado padrão da mama.

## Decisões de modelagem

| Entrada do catálogo | Relatório | Hoje no LaudoUSG | Proposta |
| --- | --- | --- | --- |
| Monitorização folicular | `audits/lote3/monitorizacao-folicular-2026-10-05.md` | finalidade dentro da pelve; folículos em texto livre | **formulário novo** `MONITORIZACAO_FOLICULAR`, com tipos da pelve, tabela de folículos e série de exames |
| Pélvico abdominal | `audits/lote3/pelvico-abdominal-2026-10-05.md` | via TA dentro de `PELVE_FEMININA` | **card derivado** `PELVICO_TRANSABDOMINAL`, com via fixa e mesmo renderer |
| Axilas | `audits/lote3/axilas-2026-10-05.md` | escopo “somente axilas” da mamária | **card derivado** `AXILAS` de `MAMARIA` + contrato compartilhado `LINFONODO_REGIONAL` |
| Mamas com Doppler (e com axilas) | `audits/lote3/mamas-doppler-2026-10-05.md` | modo Doppler ativo, sem BI-RADS influenciado pelo Doppler (correto) | **variante** de `MAMARIA`, com pendências e estado `não avaliada` |
| Obstétrico 2º/3º gemelar | `audits/lote3/obstetrico-gemelar-2026-10-05.md` | Web só com feto único; renderer da API com gemelar | **variante** de `OBSTETRICA` para N fetos |
| Morfológico 1º trimestre | `audits/lote3/morfologico-1-trimestre-2026-10-05.md` | card `MORFOLOGICO` com trimestre 1t, sem estruturas anatômicas | **variante** com contrato de seção próprio; resultado FMF como dado |
| Morfológico 3º trimestre | `audits/lote3/morfologico-3-trimestre-2026-10-05.md` | mesmo formulário do 2º trimestre | **variante**; corrigir o 2º trimestre corrige o 3º; biblioteca de achados tardios |
| Tireoide com Doppler | `audits/lote3/tireoide-doppler-2026-10-05.md` | botão Doppler sem padrão vascular do parênquima | **modo** de `TIREOIDE` |
| Cervical com Doppler | `audits/lote3/cervical-doppler-2026-10-05.md` | Doppler deduzido de “linfonodo alterado” | **modo** de `CERVICAL`, com campo explícito de Doppler realizado |

Só uma entrada justifica código e formulário inteiramente novos: a monitorização folicular. As outras são cards derivados, variantes ou modos. Isso reduz o trabalho a contratos menores e evita bibliotecas paralelas.

## Defeitos P0 provados

| # | Categoria | Entrada sintética | Saída atual |
| --- | --- | --- | --- |
| 1 | Morfológico 1º trimestre | TN 3,8 mm com CCN 62 mm | conclusão mantém morfologia normal; nenhum item de TN |
| 2 | Morfológico 1º trimestre | osso nasal e ducto venoso “não avaliado” | corpo afirma osso nasal presente e ducto normal |
| 3 | Morfológico 1º trimestre | IP médio das uterinas 2,75 (p98) | conclusão diz Doppler das uterinas normal e, no item seguinte, IP acima de p95 |
| 4 | Morfológico 1º/3º trimestre | formulário intocado; limitação por posição e oligoâmnio | morfologia normal sem dado; face e coração normais apesar da limitação |
| 5 | Morfológico 3º trimestre | ventriculomegalia de 11 mm em texto livre | crânio afirmado normal no corpo e nenhum item de conclusão |
| 6 | Obstétrico gemelar | monocoriônica sem número de placentas | “duas placentas”, tirado do número de fetos (`OBSTETRICA.ts:868`) |
| 7 | Obstétrico gemelar | feto sem BCF informado | batimentos presentes com `____ bpm` |
| 8 | Obstétrico gemelar | rótulos duplicados; dois fetos declarados e um descrito | aceito sem validação |
| 9 | Tireoide (com e sem Doppler) | formulário intocado | linfonodos “de morfologia preservada”, sem dado (`organs/tireoide.ts:195-196`) |
| 10 | Tireoide com Doppler | Doppler ligado sem dado; picos de 78/82 cm/s | parênquima com vascularização normal e conclusão normal; hiperfluxo difuso não representável |
| 11 | Tireoide | Doppler desligado com vascularização de nódulo preenchida | a pontuação da nota de Domingos muda (5 → 9) por um campo que não deveria valer |
| 12 | Cervical com Doppler | vascularização periférica | conclusão segue “aspecto reacional” |
| 13 | Axilas | “Não avaliadas” no escopo só de axilas | laudo de axilas normais bilateralmente |
| 14 | Axilas | “Alteradas” sem lado nem medida | sem pendência |
| 15 | Mamária (geral) | achado novo sem tocar nos descritores | nasce “direita”, “hipoecoico” e “oval” (`MamariaFormPanel.tsx:127-130`) |
| 16 | Mamária com Doppler | cisto simples com fluxo interno | BI-RADS 2 sem aviso |
| 17 | Monitorização folicular | “18 x 16” | contado como dois folículos |
| 18 | Monitorização folicular | “1,8 cm” | publicado como 1,8 mm |
| 19 | Monitorização folicular | ovário não visualizado com folículo no campo | “não visualizado” e “15 mm” no mesmo lado |
| 20 | Pélvico abdominal | formulário intocado | tudo normal, inclusive bexiga com repleção adequada pré-marcada |
| 21 | Pélvico abdominal | endométrio não medido; menopausa | endométrio normal para a fase ou para a menopausa; a frase de limitação da técnica TA, que existe no renderer, nunca sai pela Web |

Atualização sobre o lote 1: o card novo `PELVICO_TRANSVAGINAL` bloqueia os casos P1 e P2 (normalidade sem medida). P3 (mioma sumindo com adenomiose) e P4 (útero de 256 cm³ “normal”) foram reexecutados e persistem nos dois cards.

## Padrões que se confirmam pela terceira vez

1. **Valor pré-marcado vira fato:** lado “direita” da mama, linfonodos tireoidianos “preservados”, repleção vesical “adequada” e cordão com três vasos. É a causa mais barata de corrigir e a mais frequente.
2. **“Não avaliado” convertido em normal:** osso nasal, ducto venoso e axilas. O adaptador transforma o estado em `null`, e o renderer trata `null` como normal. O conserto é estrutural: `não avaliado` precisa existir no contrato e no renderer, não só na tela.
3. **Conclusão desacoplada do corpo:** TN, ventriculomegalia e uterinas no 1º trimestre, e o padrão vascular do linfonodo. O validador de coerência proposto no lote 2 cobre esses casos.
4. **Doppler presumido ou ignorado:** cervical presume, tireoide normaliza, pelve só muda a técnica e a mama acerta. A regra para todos os modos Doppler: um campo explícito de Doppler realizado, frase vascular só com dado, título e técnica coerentes e nenhuma reclassificação automática.
5. **Unidade e plausibilidade:** cm e mm nos folículos, IG incompatível com o trimestre e picos sem faixa.

## Contratos compartilhados que o lote revela

- **`LINFONODO_REGIONAL`:** lado, nível (Berg na axila, Robbins no cervical, inguinal), eixos longo e curto em mm, cortical, hilo, Doppler (padrão e índices opcionais) e classificação confirmada. Serve a axila, cervical, inguinal, tireoide (linfonodos cervicais) e partes moles. O módulo axilar da mama masculina já é o melhor ponto de partida.
- **Modo Doppler comum:** `doppler_realizado` no nível do exame, campos vasculares por estrutura com `não avaliado`, título e técnica derivados e proibição de reclassificar.
- **Feto N:** o bloco por feto do obstétrico, reaproveitado por morfológico, Doppler obstétrico, perfil biofísico e ecocardiografia fetal gemelares.

## Ordem de implementação do lote 3

| Etapa | Escopo | Natureza | Esforço |
| --- | --- | --- | --- |
| 1 | Remover valores pré-marcados que viram fato: lado e descritores da mama, linfonodos da tireoide, repleção vesical, cordão | só remove afirmações | pequeno |
| 2 | `não avaliado` respeitado do adaptador ao renderer: osso nasal, ducto venoso, axilas, ovário com motivo | só remove afirmações | pequeno a médio |
| 3 | Validador de coerência (lote 2, etapa 1), estendido a TN, uterinas, ventriculomegalia e linfonodo periférico | bloqueio | médio |
| 4 | Unidades da monitorização folicular (pares d1 × d2, cm × mm) e frase de limitação TA na Web | correção de adaptador | pequeno |
| 5 | Gemelar: placentas pela corionicidade, BCF obrigatório por feto, validação de rótulos e contagem, MBV por feto (P0 do lote 1) | correção de renderer | médio |
| 6 | Modo Doppler comum aplicado a tireoide, cervical e pelve; aviso de fluxo interno em lesão com categoria benigna | contrato | médio |
| 7 | Cards derivados `AXILAS` e `PELVICO_TRANSABDOMINAL` | Web | pequeno |
| 8 | `LINFONODO_REGIONAL` no shared, consumido por axila, cervical e tireoide | contrato | médio a grande |
| 9 | Formulário novo `MONITORIZACAO_FOLICULAR`, com série longitudinal | Web + contrato | grande |
| 10 | Morfológico por estrutura (2º trimestre) com variantes 1t e 3t; FMF como dado | contrato | grande |
| 11 | Gemelar na Web, com abas por feto | Web | grande |

As etapas 1 a 5 não dependem do concorrente nem de frases novas. As etapas 8 a 11 e os limiares dependem da revisão do Luiz.

## Decisões pendentes do Luiz, reunidas nos relatórios

- Curva de percentil e corte de divergência para gemelar; se hipóteses confirmadas (transfusão feto-fetal, TAPS, RCIU seletivo) entram na conclusão.
- Se a vascularização de nódulo tireoidiano aparece no texto, sem citar a classificação.
- O que fazer com a afirmação de maturidade pulmonar e intestinal no modelo do writer de 3º trimestre, que não tem dado mínimo possível.
- Cortes candidatos de TN, ventriculomegalia, dilatação do trato urinário e folículo dominante.

## Situação geral do dia

- Entradas com prova sintética: 19, sendo 2 no lote 1, 8 no lote 2 e 9 no lote 3.
- Estudo funcional do concorrente: segue em 23 de 84.
- Fila, status e método atualizados no worktree: `fila-e-mapa-canonico-2026-10-03.md`, `status-estudo-2026-10-03.json`, `00-metodo-e-progresso.md`.
