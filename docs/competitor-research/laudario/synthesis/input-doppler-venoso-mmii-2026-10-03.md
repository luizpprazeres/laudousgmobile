# Ficha de síntese — Doppler venoso de MMII

Data: 03/10/2026. Esta ficha alimenta a síntese clínica (GPT 6.1 Sol High), conforme `PIPELINE-ESTUDO-A-IMPLEMENTACAO.md:17-33`. É insumo, não pacote. Não ativa nada nem contém redação final.

**O que não fazer:** nenhum texto do concorrente foi copiado. As frases de corpo e conclusão devem ser escritas do zero, no estilo Domingos. Os limiares abaixo vêm da base de conhecimento do LaudoUSG e precisam de revisão médica; nenhum foi adotado do concorrente.

## Fontes revisadas

- **Concorrente:**
  - `cases/doppler-venoso-mmii-2026-10-02.md`, com três cenários: normal unilateral, refluxo JSF/VSM e TVP aguda oclusiva;
  - `crosswalk-doppler-venoso-mmii-2026-10-02.md`.
- **Paridade:** `audits/paridade-categorias-writer-2026-10-03.md`. A categoria é genérica nos três clientes, com mapa parcial; o writer dedicado e o mapa dependem de gates.
- **Base clínica do LaudoUSG:** `packages/knowledge/snippets/DOPPLER_VENOSO_MMII/` e `DOPPLER_VENOSO_MMII_MEDIDAS/`.
- **Contratos atuais:**
  - `packages/schemes/src/vascular/findings.ts` e `venousMap.ts`;
  - `apps/api/src/server/renderer/categories/DOPPLER_VENOSO_MMII.ts`;
  - `apps/api/src/server/pipeline/dopplerVenosoMmiiWriterAudit.ts`;
  - `LaudoUSG/Models/VenousSegmentCatalog.swift`, no repositório iOS.
- **Precedente:** `DopplerVenosoMmssSchema` em `packages/shared/src/clinicalModels/contracts.ts:54-78`, com validações em `:318-330`.

## 1. Identidade e escopo

- **Código:** manter `DOPPLER_VENOSO_MMII`. A variante `DOPPLER_VENOSO_MMII_MEDIDAS` deve consumir o mesmo contrato, como apresentação mais detalhada, sem regras paralelas (`plano-formularios-estruturados-web-2026-10-03.md`).
- **Protocolo**, como campo explícito e nunca inferido em silêncio:
  - `completo`: profundo + superficial + perfurantes;
  - `tvp_only`: apenas o profundo; o superficial fica `não avaliado`;
  - `mapeamento_medidas`: pré-operatório, com calibres por ponto.

  Fontes: `DOPPLER_VENOSO_MMII/modelo/template-padrao.md:24-27` e `modelo/protocolo-tvp-only.md:18-25`.
- **Lateralidade do exame:** direito, esquerdo ou bilateral. Lado não solicitado = `não avaliado`, nunca omitido como normal.
- **Concorrente:** o modelo completo permite retirar o sistema profundo do exame. Escopo e competência são estados distintos (caso `:58`). O modelo "TVP" do concorrente não foi estudado.

## 2. Estruturas por lado

| Sistema | Estruturas | Observação |
| --- | --- | --- |
| Profundo | femoral comum, femoral, femoral profunda, poplítea, tibiais posteriores, tibiais anteriores, fibulares, gastrocnêmias, soleares | ids em `findings.ts` (`SEGMENTOS_VENOSOS`); o protocolo TVP lista femorais, poplítea, tibiais posteriores e fibulares (`protocolo-tvp-only.md:42-50`) |
| Junções | JSF, JSP | — |
| Safena magna | JSF, coxa proximal, média e distal, joelho, perna proximal, média e distal | 8 pontos em `MEDIDAS/regra/calibres-safena-magna.md:20-27`; hoje o contrato compartilhado tem um único segmento |
| Safena parva | JSP, proximal, distal | o iOS já segmenta (`VenousSegmentCatalog.swift:46`); o shared não |
| Variantes | safena acessória anterior, Giacomini | já existem no enum; duplicação e safenectomia/ablação prévia não existem |
| Perfurantes | lista dinâmica: lado, face, nível, distância à referência | o shared limita a topografia a coxa, joelho, perna medial e panturrilha (`findings.ts:74`) |
| Tributárias/varizes | face e segmento, calibre, relação com a safena | sem campo tipado hoje |

## 3. Estados

Cada estrutura usa os estados `não avaliado`, `normal`, `alterado` e `limitado`. Por enquanto, siga o padrão do MMSS (`contracts.ts:55-59`): `examined`, sistema por estado, `competenceTested` e `reflux` com `not_assessed`.

- `normal` exige a estrutura avaliada. Um normal preselecionado não vale como avaliação (caso `:50`, `:58`).
- Competência ou refluxo só existem com teste documentado (precedente MMSS: `contracts.ts:324-325`).
- Em `limitado`, informar o motivo: edema, obesidade, curativo, imobilização ou janela.

## 4. Campos por achado, medidas e unidades

**Refluxo**
- Campos: lado, segmento inicial e final (extensão), tempo, manobra (Valsalva, compressão distal ou liberação) e posição (ortostase ou decúbito). Fonte: `regra/refluxo-criterios.md:41-51`.
- Classe derivada: `abaixo do limiar` ou `patológico`, calculada por um limiar que depende do tipo de veia.

**Trombose profunda**
- Campos:
  - segmento(s) e extensão longitudinal;
  - compressibilidade: completa, parcial, ausente ou não testável;
  - material intraluminal (ausente/presente) e sua ecogenicidade (hipo, mista ou hiper);
  - oclusão: oclusiva, parcial ou não determinada;
  - fluxo espontâneo e fásico e resposta à compressão distal;
  - distensão em relação ao lado oposto, parede (fina ou espessada), recanalização e colaterais.
- Fase: aguda, indeterminada, crônica/recanalizada ou mista. Fontes: `conclusao/tvp-aguda.md:18`, `excecao/tvp-idade-indeterminada.md:18` e `excecao/tvp-cronica-recanalizada.md:20-40`.
- Topografia derivada: proximal ou distal isolada.

**Perfurante**
- Campos: lado, face, nível, distância à referência (maléolo medial, JSF ou JSP), diâmetro, refluxo e conexão superficial–profunda.
- Competência derivada: ver a pendência P1.

**Calibres e padrão de safena**
- Calibre em cada ponto.
- Padrão: competente, incompetência segmentar, incompetência em todo o trajeto, ou hipoplásica/ausente (`MEDIDAS/conclusao/mapeamento-completo.md:36-39`).

**Contexto e técnica**
- Indicação: suspeita de TVP, varizes ou pré-operatório.
- Sintomas, apenas como contexto.
- CEAP só com clínica explícita (`modelo/template-padrao.md:87`).

| Medida | Unidade de saída | Regras |
| --- | --- | --- |
| Tempo de refluxo | s, com vírgula decimal | aceitar ms e converter de forma determinística, preservando o valor original |
| Calibre de veia | mm | — |
| Diâmetro de perfurante | mm | — |
| Distância de perfurante | cm, com referência anatômica | — |
| Extensão de trombo ou refluxo | segmentos de início e fim; cm opcional | — |

**Limiares atuais da base** (`refluxo-criterios.md:23-33`, todos para revisão):
- maior que 1,0 s em femoral comum, femoral e poplítea;
- maior que 0,5 s em femoral profunda, tibiais, safenas e tributárias;
- para perfurantes, maior que 0,5 s combinado com diâmetro maior que 3,5 mm.

O valor exatamente no limiar não está definido (P6).

## 5. Dependências entre campos

1. O protocolo `tvp_only` força o superficial e as perfurantes a `não avaliado`. Nenhuma frase de competência superficial é permitida. A regra já existe por regex (`dopplerVenosoMmiiWriterAudit.ts:17-31`) e deve passar ao contrato.
2. No concorrente, marcar a JSF como incompetente ativou sozinho a VSM incompetente em todo o trajeto (caso `:66`). No LaudoUSG, a propagação pode ser **sugerida**, mas o estado da VSM e a extensão exigem marcação própria.
3. A classe de refluxo é derivada de tempo, segmento e manobra. Refluxo sem tempo vira "refluxo descrito sem quantificação" e não recebe classe patológica automática (`refluxo-criterios.md:62`).
4. Trombose positiva exige o conjunto mínimo de critérios (P2). No concorrente, apenas segmento e extensão já levavam à conclusão de TVP (caso `:82`), e isso não deve ser reproduzido.
5. A fase `aguda` exige critérios positivos de agudização. Sem eles, a fase é `indeterminada`. Fase sem trombose é inválida (precedente: `contracts.ts:327-328`).
6. `oclusiva` só quando informada. Hoje o mapa transforma trombose sem extensão em oclusiva (`venousMap.ts:120-124`).
7. `tvp_presente` deve ser **derivado** dos segmentos. Hoje é um booleano independente (`findings.ts:96`) e aceita TVP sem segmento.
8. Remover um achado limpa os derivados (classe, conclusão, recomendação e mapa) no mesmo ciclo.
9. Recomendação tem três estados: sugerida, confirmada e publicada. A inclusão do mapa no laudo é outra decisão independente (caso `:68-70`).
10. Uma estrutura `não avaliado` nunca gera frase de normalidade no corpo nem na conclusão.

## 6. Achados para o corpo — conteúdo mínimo de cada frase

A ordem é por lado: técnica e escopo, depois profundo, junções, safenas por segmento, perfurantes, tributárias/varizes e limitações.

| Achado | A frase deve conter |
| --- | --- |
| Técnica | protocolo, lado(s), posições e manobras realmente usadas |
| Profundo normal | apenas os segmentos avaliados; compressibilidade e fluxo quando testados |
| Refluxo | veia, lado, extensão, tempo, manobra; calibre se medido |
| Refluxo abaixo do limiar | descrição neutra, sem rótulo de incompetência |
| Trombose profunda | segmentos, compressibilidade, material e ecogenicidade, oclusão, fluxo, distensão/parede; fase só se sustentada |
| Crônica/recanalizada | parede, recanalização, colaterais, refluxo associado |
| Perfurante | lado, face, nível/distância, diâmetro, refluxo |
| Calibres (medidas) | lista proximal → distal por membro (`calibres-safena-magna.md:20-27`) |
| Variante anatômica | Giacomini ou acessória, com trajeto e competência quando testados |
| Limitação | estrutura afetada e motivo |

## 7. Correspondência com a conclusão

| Estado confirmado | Item de conclusão | Condição |
| --- | --- | --- |
| Profundo avaliado sem trombose | patência/compressibilidade do profundo, por lado | escopo restrito ao avaliado |
| Superficial avaliado sem refluxo | ausência de refluxo significativo | só no protocolo `completo` ou `mapeamento_medidas` |
| Refluxo patológico confirmado | insuficiência do sistema/estrutura, com lado e extensão | tempo acima do limiar ou confirmação médica |
| Refluxo abaixo do limiar | nenhum item patológico | só no corpo |
| Perfurante incompetente | item próprio, com localização | critérios da P1 |
| TVP aguda | item com segmentos e topografia | critérios de agudização (`tvp-aguda.md:18`) |
| TVP de idade indeterminada | item sem datação | `tvp-idade-indeterminada.md:18` |
| Crônica/recanalizada ou mista | item de sequela; componente recente, se houver | `tvp-cronica-recanalizada.md:20-40` |
| Calibre isolado | nenhum | calibre não classifica insuficiência (`calibres-safena-magna.md`, "NÃO INVENTAR") |
| Limitação | item de limitação que restrinja a negativa | sempre que houver estrutura `limitado` |
| Urgência por TVP | recomendação de avaliação médica urgente | sugerida e publicada só com confirmação (`tvp-aguda.md:32`) |

## 8. Mapa visual

- **Hoje:**
  - `MapaVenoso` sai de uma segunda extração por LLM, depois do texto, atrás de `VENOUS_SCHEME_MAP` e `VENOUS_SCHEME_4VIEW`;
  - a ausência de estado vale como normal (`venousMap.ts:44-48`);
  - só perfurantes incompetentes são desenhadas (`venousMap.ts:175`);
  - só as safenas recebem anotação de calibre (`venousMap.ts:151`).
- **Requisito:** o mapa deve ser gerado do mesmo contrato confirmado do texto, com:
  - estado `não avaliado` desenhado de forma distinta;
  - VSM e VSP segmentadas, alinhando o shared ao `VenousSegmentCatalog.swift`;
  - trombose parcial ou oclusiva só quando informada;
  - versão do contrato e do asset gravadas;
  - vínculo com o `reportId` e com a Sala.
- **Cobertura no concorrente (só cobertura, não desenho):**
  - vistas superficial anterior, profunda e superficial posterior;
  - estados fisiológico, incompetente, recanalizado e ocluído, além de perfurantes, varizes, telangiectasias e safenectomia;
  - marcação automática e manual coexistindo;
  - inclusão no laudo separada (caso `:96`).
- **Correção manual no mapa:** precisa de proveniência e deve voltar ao contrato, nunca divergir do texto.

## 9. Roteiro para o prompt mobile

O ditado deve resolver, nesta ordem:
1. protocolo e lado(s);
2. estruturas avaliadas e limitações;
3. por achado, os campos da seção 4.

Faltando dado mínimo, o prompt gera uma pendência objetiva em vez de completar. O que já existe no writer (detecção TVP-only, título por lado) pode virar roteiro, desde que preencha o contrato e não escreva texto livre.

## 10. Formulário Web

Abas propostas, com nomes próprios do LaudoUSG:
- **Exame:** protocolo, lado, indicação, técnica e limitação;
- **Profundo:** por segmento e lado;
- **Junções e safenas:** pontos segmentados e calibres;
- **Perfurantes:** lista dinâmica;
- **Tributárias e varizes;**
- **Trombose:** detalhe por segmento;
- **Mapa:** prévia e inclusão;
- **Recomendações:** sugerida, confirmada e publicada.

No protocolo `mapeamento_medidas`, os 8 pontos da VSM e a JSP aparecem já abertos para preenchimento.

## 11. Casos sintéticos para validação

1. Completo unilateral normal, com todas as estruturas avaliadas.
2. TVP-only bilateral normal: nenhuma frase superficial.
3. Lado solicitado não examinado → pendência.
4. Refluxo de JSF + VSM em todo o trajeto, com tempo.
5. Refluxo segmentar da VSM, com coxa normal.
6. Refluxo abaixo do limiar.
7. Refluxo sem tempo.
8. Perfurante com refluxo, mas diâmetro ausente.
9. TVP aguda oclusiva proximal, com critérios completos.
10. TVP com segmento apenas → bloqueio.
11. TVP de idade indeterminada.
12. TVP crônica recanalizada com refluxo.
13. Quadro misto.
14. TVP distal isolada (tibiais/fibulares).
15. Trombose de veia muscular (gastrocnêmia/solear) — ver P8.
16. Limitação por edema na panturrilha.
17. Tempo em ms → conversão.
18. Mapeamento com os 8 pontos bilaterais.
19. Giacomini competente.
20. Contradição: refluxo de JSF ditado junto com "safenas competentes".
21. Remoção de achado → texto, conclusão e mapa limpos.

## 12. Riscos que exigem confirmação médica

- conclusão positiva de TVP;
- fase aguda;
- oclusão;
- insuficiência ou incompetência sem tempo;
- perfurante incompetente com critério incompleto;
- propagação JSF → VSM;
- recomendação de urgência;
- CEAP;
- qualquer correção manual do mapa que mude o estado clínico.

## 13. Lacunas e pendências para decisão clínica (Luiz)

- **P1 — Critério de perfurante incompetente.** A base diverge:
  - `refluxo-criterios.md:31`: refluxo maior que 0,5 s e diâmetro maior que 3,5 mm;
  - `MEDIDAS/regra/perfurantes-identificacao.md:18-21`: três critérios obrigatórios, incluindo a conexão;
  - `conclusao/exame-normal.md:36` usa "ou", e a lógica fica ambígua.

  É preciso definir uma regra única.
- **P2 — Critério mínimo de TVP.** As fontes divergem:
  - `protocolo-tvp-only.md:58-66`: a incompressibilidade é a âncora e o material é auxiliar;
  - `template-padrao.md:70-73`: incompressibilidade + material.

  É preciso definir também o caso não testável.
- **P3 — Recomendação de tratamento.** `MEDIDAS/conclusao/mapeamento-completo.md:30` sugere planejamento de ablação ou escleroterapia. Isso contraria `modelo/template-padrao.md:95`, que proíbe recomendar conduta cirúrgica.
- **P4 — Ilíaca na topografia.** `tvp-aguda.md:29` cita a ilíaca como topografia proximal, mas nenhum protocolo avalia a ilíaca. Decidir se ela entra como estrutura `não avaliado` ou `limitado`.
- **P5 — Manobra em refluxo de trajeto longo.** O template de medidas pede Valsalva para a competência da VSM (`MEDIDAS/modelo/template-padrao.md:50`). Revisar qual manobra vale por segmento.
- **P6 — Fronteira do limiar.** Falta definir o valor exatamente no limiar. Também faltam a fonte e a população das referências de calibre (`calibres-safena-magna.md:50-56`, "mulheres adultas") e do limiar de hipoplasia (`mapeamento-completo.md:39`).
- **P7 — Fases de trombose.** O MMSS usa `subacute` (`contracts.ts:66`); o MMII não tem subaguda. Harmonizar o vocabulário venoso entre os dois.
- **P8 — Ausências na biblioteca.** Faltam trombose venosa superficial (tromboflebite, distância à JSF), trombose de veia muscular e estado pós-safenectomia/ablação. Nenhum foi observado no concorrente (caso `:104`) nem existe na base do LaudoUSG; não sintetizar sem fonte.
- **P9 — Contratos atuais em conflito.** Hoje convivem:
  - `findings.ts`, por segmento;
  - o schema mínimo da API (`DOPPLER_VENOSO_MMII.ts`: lado, protocolo, booleanos);
  - o catálogo iOS com 18 segmentos.

  Devem ser substituídos por um contrato único em `packages/shared`.
- **P10 — Variante com medidas.** Não recebe o writer dedicado, a variante `tvp-only` nem o mapa (paridade, nota 8). O contrato único resolve; até lá, a variante não deve ganhar regras próprias.
