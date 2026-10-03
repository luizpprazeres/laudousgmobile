# Preflight — Doppler de aorta e artérias ilíacas

Data: 03/10/2026. Rodada preparatória somente de leitura, sem navegador e sem dados de pacientes. Este arquivo não altera código clínico, a fila nem o status do estudo. Ele prepara a observação do operador e o crosswalk seguinte.

## Escopo e limites

- Exame: Doppler de aorta e artérias ilíacas. No estado anterior à rodada ainda não existia linha no mapa canônico; o código ficava para o crosswalk. A rodada concluída acrescentou essa equivalência ao mapa.
- Motivo e prova mínima definidos antes da rodada: exame ausente; normal, aneurisma, estenose/oclusão. A fila atual já avançou para Doppler de artérias temporais.
- Limites da rodada: um exame, no máximo três cenários sintéticos, sem endpoints privados, sem copiar, imprimir ou finalizar laudos, e restaurar o modelo ao final (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:15`, `docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:21`). Um achado do concorrente não vira requisito clínico (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:19`).

## O que já se sabe do concorrente

| Fato | Rótulo | Evidência |
| --- | --- | --- |
| "Doppler de Aorta e Artérias Ilíacas" consta no atalho de vascular abdominal, ao lado de Aortorrenal, Mesentéricas, Transplante Renal e Hepático | `observado` (inventário de catálogo de 02/10) | `docs/competitor-research/laudario/catalogo-ultrassonografia-2026-10-02.json:17` |
| O modelo Abdome Total do concorrente tem uma aba própria "Aorta e Retroperitôneo" | `observado` em outro exame | `docs/competitor-research/laudario/cases/abdome-total-2026-10-02.md:7` |
| Controles, segmentos, medidas, limiares, cálculos, presets, recomendações e texto deste exame | **não observado antes da rodada** | fotografia prévia registrada neste preflight; o status atual já contém o caso funcional concluído |

A razão anastomose/ilíaca vista no transplante renal (`docs/competitor-research/laudario/cases/doppler-transplante-renal-2026-10-03.md:21`) pertence a outro exame. Não se pode presumir que este modelo use o mesmo cálculo.

## Estado atual no LaudoUSG

Classificação pelo critério do guia (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:44-50`). Não existe código de categoria para aorta ou ilíacas em nenhuma camada:

| Plataforma | Estado | Evidência |
| --- | --- | --- |
| Web | **ausente** | não está em `WRITER_CATEGORY_OPTIONS` nem em `STRUCTURED_WEB_CATEGORY_CODES` (`apps/web/src/lib/writerCategories.ts:2-24`), nem no grupo Vascular (`apps/web/src/components/laudar/categoryGroups.ts:55`) |
| Android/RN | **ausente** | lista esperada do seletor (`apps/mobile/src/features/generate/categories.manual.ts:5-14`) |
| iOS | **ausente** | `ReportCategory` não tem caso para aorta ou ilíacas (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:3-43`) |
| API | **ausente** | não há renderer, writer, auditoria ou regra de normalização própria; ver os desvios abaixo |
| Banco versionado | **ausente** | não há código no seed (`packages/db/src/seeds/data.ts:58-128`) nem nas três migrações de `supabase/migrations/` |
| Contrato compartilhado | **ausente** | `ClinicalModelCodeSchema` tem cinco modelos e nenhum de aorta (`packages/shared/src/clinicalModels/contracts.ts:3-9`). O contrato de Abdome com Doppler cobre porta, veias hepáticas, esplênica, mesentérica superior e hepática comum, mas não a aorta (`packages/shared/src/clinicalModels/contracts.ts:34-52`) |

### Onde a aorta já aparece: componentes isolados, sem fonte única

1. **Abdome Total (aorta como órgão).**
   - O renderer só classifica a aorta como aneurismática ou ectasiada se essa **palavra** for ditada (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:553-554`).
   - A medida é opcional no texto (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:614-620`).
   - Sem alteração, o corpo usa a frase normal padrão (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:815`). A regra de conhecimento manda preencher a aorta omitida com "calibre normal" (`packages/knowledge/snippets/ABDOMEN_TOTAL/regra/frases-normais-quando-omitido.md:39`).
   - A única limitação disponível é a visualização parcial por gases (`apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts:58-66`).
   - Ilíacas não existem nesse modelo.
2. **Checagem de aneurisma no Abdome Total.**
   - Só emite um **aviso** quando a aorta mede 30 mm ou mais sem menção a aneurisma (`apps/api/src/server/pipeline/deterministicSanity/abdomenTotal.ts:76-88`).
   - O extrator reconhece o diâmetro em **mm**. A variante sem unidade descarta valores abaixo de 5 (`apps/api/src/server/pipeline/deterministicSanity/extractor.ts:383-389`). Como a checagem lê o texto final do laudo (`apps/api/src/server/pipeline/deterministicSanity.ts:103`), um texto final com "aorta de 4,5 cm" não dispara o aviso (`inferido`).
   - A palavra "ectasia" no texto final basta para silenciar o aviso, qualquer que seja o diâmetro (`apps/api/src/server/pipeline/deterministicSanity/extractor.ts:424-428`).
3. **Doppler renal (aorta como referência).** A aorta só entra como VPS para a relação aorto-renal. O prompt proíbe descrevê-la se não tiver sido ditada (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:86`), e a auditoria bloqueia normalidade não ditada (`apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts:126-131`). É uma salvaguarda útil, mas não substitui um exame de aorta.
4. **Doppler arterial de MMII.**
   - O modelo publicado começa na femoral comum (`packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md:23`, `packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md:26`).
   - A doença ilíaca aparece apenas de forma indireta, como padrão monofásico sugestivo de lesão proximal (`packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md:52`).
   - A frase técnica fixa afirma que todos os segmentos foram avaliados bilateralmente (`packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md:23`).
5. **Roteamento** (`inferido`).
   - Se o structurer emitir um código não canônico com "abdom", como `DOPPLER_AORTA_ABDOMINAL`, a regra genérica o leva para `ABDOMEN_TOTAL_DOPPLER` quando há Doppler afirmado, ou para `ABDOMEN_TOTAL` (`apps/api/src/server/pipeline/categoryNormalization.ts:75-76`, `apps/api/src/server/pipeline/categoryNormalization.ts:156-161`).
   - Um código sem "abdom", como `DOPPLER_AORTA_ILIACAS`, não casa com nenhuma regra e volta para o `category_hint` (`apps/api/src/server/pipeline/categoryNormalization.ts:163-166`).
   - Na prática, um ditado de aorta/ilíacas acaba em Abdome Total, Abdome com Doppler, Arterial MMII, Doppler renal ou Livre, e nenhuma dessas categorias foi desenhada para ele.

Texto, medidas e conclusão da aorta saem hoje de fontes diferentes conforme a categoria escolhida. Não há formulário, cálculo de razão ou esquema visual compartilhado.

### Achado incidental fora do escopo

O texto de limitação por gases usa sempre o particípio masculino (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:726`) com rótulos femininos e plurais (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:705-717`). O resultado é "Aorta abdominal visualizado parcialmente", e o mesmo erro vale para "Vesícula biliar", "Veia porta", "Vias biliares", "Veia cava inferior" e "Bexiga". Isso não foi alterado; fica registrado para correção separada.

### Disponibilidade em produção

A prova mais recente do estudo mostrou `RENDERER_CATEGORIES` vazio em produção em 03/10 (`docs/competitor-research/laudario/crosswalk-doppler-aortorrenal-2026-10-03.md:17`). Este preflight não reverificou o ambiente, então os caminhos renderer citados podem estar dormentes.

## Etapa 0 — inventário, sem alterar nada

- Abas e ordem; se aorta e ilíacas estão no mesmo bloco ou separadas por lado.
- Segmentos oferecidos: aorta suprarrenal, justarrenal e infrarrenal, bifurcação, ilíacas comuns, externas e internas; se os lados direito e esquerdo são independentes.
- Medidas: diâmetros (qual eixo e de parede a parede ou da luz), VPS por segmento, razões e unidades; quais são calculadas automaticamente.
- Morfologia: placa, trombo mural, dissecção, colo do aneurisma e relação com as artérias renais, extensão para as ilíacas.
- Estado pós-tratamento: endoprótese, enxerto e vazamento. Registre só se a opção existe.
- Qualidade técnica e "não avaliado" por segmento (gases, obesidade).
- Recomendações: se aparecem automaticamente, se citam intervalo de seguimento e se exigem confirmação.
- Se a interface mostra limiares (de ectasia, aneurisma ou estenose): registre que existem e onde ficam, sem copiar valores como verdade clínica.

## Cenários sintéticos (máximo 3)

Os cenários usam um paciente fictício, sem nome, data real ou imagem. Mude uma variável por vez e restaure antes do próximo cenário. Os números servem para provocar o comportamento e não representam critério do LaudoUSG.

### C1 — Normal (estado inicial)

- Entrada: o modelo como abre, sem alterações.
- Registrar: quais segmentos o texto normal afirma; se afirma normalidade das ilíacas e da aorta sem nenhum diâmetro ou velocidade; se a normalidade é bilateral por padrão; se há frase técnica de segmentos avaliados.

### C2 — Aneurisma infrarrenal

- Entrada: só o diâmetro máximo sintético da aorta infrarrenal (por exemplo, 4,5 cm). Não marque o achado "aneurisma" manualmente.
- Registrar: se a classificação deriva da medida ou exige seleção; se a unidade é convertida ou mantida; qual eixo o campo pede; se a conclusão muda sozinha ou só depois de confirmação; se surgem recomendação ou intervalo de seguimento automáticos.
- Fronteira opcional, ainda no C2: acrescentar trombo mural ou extensão para a ilíaca comum de um lado e ver se a lateralidade chega à conclusão. Depois apagar tudo e registrar se algum texto, classe ou recomendação permanece.

### C3 — Estenose e depois oclusão de ilíaca, unilateral

- Entrada: só na ilíaca externa esquerda, VPS sintética alta (por exemplo, 300 cm/s), com VPS proximal normal de referência (por exemplo, 100 cm/s), se houver esse campo.
- Registrar: se uma razão é calculada e entre quais segmentos; se o modelo gradua a estenose em percentual; se a conclusão exige confirmação médica; se o lado direito continua normal sem avaliação; se o lado chega certo à conclusão.
- Fronteira opcional, ainda no C3: substituir a estenose por ausência de fluxo (oclusão) no mesmo segmento. Ver se a velocidade anterior some, se a conclusão diferencia oclusão de fluxo muito reduzido e se há destaque de urgência ou recomendação automática.

## Riscos clínicos a observar

1. **Aneurisma classificado sem medida**, ou medida sem eixo nem unidade claros.
2. **Rótulo de ectasia ou aneurisma decidido por um limiar oculto**, sem que o médico veja o critério nem o confirme.
3. **Falsa normalidade de segmento não avaliado:** ilíacas ou aorta suprarrenal declaradas normais por padrão; segmento limitado por gases tratado como normal.
4. **Lateralidade:** achado ilíaco que vira bilateral, troca de lado ou some da conclusão.
5. **Graduação percentual de estenose** derivada só de velocidade, ou estenose concluída por uma medida isolada sem referência.
6. **Oclusão versus fluxo filiforme:** conclusão de oclusão sem confirmação, ou velocidade antiga que persiste após marcar ausência de fluxo.
7. **Recomendação automática** de seguimento ou de encaminhamento urgente publicada sem confirmação.
8. **Persistência após desfazer:** razão, classe ou frase que continua no texto depois de apagar a medida.
9. **Achados críticos** (dissecção, sinais de ruptura, vazamento de endoprótese): ver se existem como preset e se são publicados sem dado mínimo.

O que for observado é comportamento do concorrente. Limiares de diâmetro e de velocidade só entram no LaudoUSG com fonte específica e revisão médica.

## Para o crosswalk que virá depois

- Definir código e nome canônico e registrar a fronteira com Abdome Total (aorta como órgão), Doppler renal (aorta como referência) e Arterial MMII (início na femoral comum), sem duplicar regras.
- Decidir se o aviso de 30 mm do Abdome Total deve reconhecer diâmetros em cm e deixar de ser silenciado pela palavra "ectasia". Essa decisão é clínica e não foi tomada aqui.
- O contrato mínimo deve ter segmentos por lado com os estados não avaliado, normal, alterado e limitado; diâmetro com eixo e unidade; derivações determinísticas que preservem as medidas de origem; e confirmação médica antes de aneurisma, estenose significativa, oclusão ou dissecção.
- Antes de ativar, testar normal, alterado, incompleto, lateralidade, unidades (mm/cm), limites e serialização ponta a ponta nas três plataformas (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:66`).
