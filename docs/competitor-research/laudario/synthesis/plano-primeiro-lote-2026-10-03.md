# Primeiro lote clínico dormente — 03/10/2026

Objetivo: preparar dois pacotes originais, `DOPPLER_RENAL` e `DOPPLER_VENOSO_MMII`, para síntese, revisão médica e implementação posterior. Este plano não contém frases clínicas finais, não aprova critérios e não ativa funcionalidades.

## Evidência, aprovação e limites

| Marca | Significado neste plano |
| --- | --- |
| **APROVADO — processo** | Pipeline fornecido: conteúdo original, contrato único, revisão médica e dormência até aprovação do Luiz. A autorização desta entrega abrange somente este documento. |
| **APROVADO — clínico** | Não há aprovação explícita dos dois novos pacotes nos arquivos lidos. Conhecimento interno validado/curado não equivale à aprovação desta síntese. |
| **INTERNO** | Código lido diretamente ou conteúdo LaudoUSG descrito pelos dossiês. Quando a fonte subjacente não foi lida, a evidência é indireta. |
| **CONCORRENTE** | Observação relatada pelos dossiês, útil para cobertura e interação; não fornece redação nem valida critérios clínicos. |
| **PENDENTE** | Regra, fonte ou decisão faltante; impede finalizar o item correspondente. Pode ser excluído explicitamente da v1, sem impedir o núcleo aprovado. |

Leitura restrita ao pipeline, aos dois `input-*-2026-10-03.md`, a `contracts.ts`, aos dois arquivos de categoria da API e ao Web autorizado. `types.ts` não existe; os tipos atuais são inferidos em `contracts.ts`.

Um único `rg` dirigido localizou `WriterCategoryWorkspace`, `ClinicalModelWorkspace` e referências a `clinicalModels`. Foram lidos esses dois workspaces, `lib/clinicalModels.ts`, `lib/writerCategories.ts` e o trecho de roteamento de `LaudarWebExperience.tsx`. Nenhuma fonte clínica adicional, banco, cliente mobile, Sala, ambiente produtivo ou internet foi consultado.

**INTERNO, verificado:** `ClinicalModelCodeSchema` e a união compartilhada não incluem renal/MMII; os schemas da API são mínimos de registro, com booleanos insuficientes para o estado proposto. O Web oferece ambos no writer genérico, inclusive MMII medidas. A rota de writer precede a de modelo estruturado. `NEXT_PUBLIC_CLINICAL_MODELS_V1` controla cinco outros modelos e não deve expor este lote por simples extensão do catálogo.

**INTERNO, indireto:** situação dos gates de API/mapa, blocos de conhecimento, catálogos mobile e uso histórico vêm dos dossiês. Não constituem confirmação atual de produção nem gabarito clínico assinado.

## Arquitetura comum e preservação

Fluxo futuro: ditado → adaptador tipado; seleções Web → eventos tipados; ambos → mesmo estado versionado → validação e derivações determinísticas → confirmação médica → renderer/biblioteca únicos → texto, conclusão e mapa → mesma revisão na API e Sala.

Separar aprovação do pacote clínico da revisão de cada exame. Registrar versão do contrato, regras, conteúdo e aprovação do pacote; cada exame terá `reportId`, revisão de conteúdo e confirmação vinculada a essa revisão. Mudança clínica invalida a confirmação afetada e a revisão final.

Cada medida deve guardar valor/unidade originais, valor/unidade normalizados, lado, estrutura/segmento/polo, origem (`ditado`, seleção manual, importação ou cálculo), evidência de origem e confirmação. Derivados guardam fórmula/versionamento e referências aos operandos. Não substituir medida manual/importada por cálculo sem override médico explícito e rastreável.

Ausente, zero, não avaliado e negativo são estados distintos. Preservar zero quando informado; validar sua admissibilidade por parâmetro, sem converter em ausência. Não arredondar antes de comparar critérios; arredondamento é de apresentação. Conversões s↔ms são determinísticas e mantêm o original. Faixas plausíveis geram pendência, nunca descarte silencioso.

O estado inicial é não avaliado, sem diagnósticos, competência, normalidade ou recomendações publicadas. Ambiguidade de lado, unidade, protocolo ou segmento gera pendência; nenhuma entrada resolve por suposição. Selecionar lateralidade não marca exame como realizado.

Guardar pendências com código, caminho do campo e motivo. Incompletude permite rascunho identificado, mas bloqueia a afirmação dependente e a liberação final se houver conflito não resolvido. Intenção estruturada incompleta não pode cair silenciosamente no writer livre.

Remover/corrigir achado recompõe corpo, conclusão, cálculos, recomendações e mapa na mesma revisão. Texto editado manualmente que altere significado exige reconciliação com o contrato e nova revisão; o mapa não pode continuar refletindo outra versão clínica.

## Pacote 1 — Doppler renal

Código e nome canônico: **`DOPPLER_RENAL` — Doppler renal**. **INTERNO:** rim nativo; aorta como referência hemodinâmica. Transplante fica fora. Morfologia patológica da aorta não recebe diagnóstico próprio neste pacote; eventual achado adicional exige registro explícito. Fronteira com aparelho urinário com Doppler: **PENDENTE**.

### Artefatos e destinos posteriores

Todos os caminhos novos abaixo são propostas, não arquivos já existentes. Biblioteca única conterá basal, alterações e correspondências; os documentos de revisão serão gerados dela, sem segunda fonte clínica.

| Artefato | Criar posteriormente | Conteúdo/ligação |
| --- | --- | --- |
| Especificação e manifesto | `docs/competitor-research/laudario/synthesis/pacotes/doppler-renal/pacote.md` | Escopo, fontes por item, decisões, versões, exclusões e aprovação. |
| Basal normal e biblioteca | `packages/shared/src/clinicalModels/dormant/dopplerRenalContent.ts` | Basal condicionado à avaliação; alterações A1–A18 e R1 do dossiê, com pendentes sem frase. |
| Corpo/conclusão | No mesmo `dopplerRenalContent.ts` | IDs estáveis ligam gatilho, dados mínimos, corpo, conclusão opcional e bloqueio; variantes por critério disponível. |
| Contrato e cálculos | `packages/shared/src/clinicalModels/dormant/dopplerRenal.ts` | Schema versionado, estados, validações, RAR, IR médio e diferença renal. |
| Adaptador mobile | `apps/api/src/server/renderer/categories/dormant/dopplerRenalAdapter.ts` | Ditado → contrato, pendências e confirmação; sem prosa final nem conexão ao prompt ativo. |
| Exemplos mobile | `apps/api/src/server/renderer/categories/dormant/dopplerRenalExamples.ts` | Pares sintéticos ditado/estado esperado; não reutilizar ditados reais. |
| Formulário Web | `apps/web/src/components/laudar/dormant/DopplerRenalForm.tsx` | Aorta/contexto e lados; unidades visíveis, derivados com origem, confirmação e desfazer. |
| Renderer | `packages/shared/src/clinicalModels/dormant/renderDopplerRenal.ts` | Função determinística que consome contrato validado e biblioteca; sem conexão ao registry público. |
| Testes | `packages/shared/src/clinicalModels/dormant/dopplerRenal.test.ts`, `apps/api/src/server/renderer/categories/dormant/dopplerRenalAdapter.test.ts`, `apps/web/src/components/laudar/dormant/DopplerRenalForm.test.tsx` | Casos do dossiê e igualdade ditado/formulário/renderização. |
| HTML médico | `docs/competitor-research/laudario/synthesis/pacotes/doppler-renal/revisao.html` | Basal e cada alteração com corpo/conclusão lado a lado, critérios, fontes, pendências e versão. Gerar após decisões. |

### Campos e estados principais

| Bloco | Campos previstos, sem redação final |
| --- | --- |
| Exame | Indicação opcional, qualidade, motivo da limitação, técnica efetivamente registrada e escopo nativo. Indicação não cria achado. |
| Estado por estrutura/lado | `não avaliado`, `avaliação parcial`, `avaliado normal`, `alterado`, `limitado`; limitado exige motivo e segmento. |
| Aorta | Estado e VPS em cm/s no nível das emergências renais; medida não implica morfologia normal. |
| Artéria principal D/E | Perviedade; VPS ostial/proximal, média, distal ou máxima sem segmento; aliasing/turbulência; padrão médico normal/significativo/indeterminado. |
| Acessórias | Não pesquisada/não identificada/identificada, lado e VPS opcional; ausência de pesquisa não equivale a ausência anatômica. |
| RAR D/E | Ditada e/ou derivada, duas VPS de origem e segmento da VPS máxima; divergência gera pendência, sem overwrite. |
| Intrarrenal D/E | IR por polo e IR resumido ditado sem inventar polo; média derivada com número de polos; IP opcional; morfologia, TA em ms. |
| Rins D/E | Comprimento bipolar em cm, eixos opcionais, ecogenicidade/diferenciação opcionais; diferença entre comprimentos com semântica ainda pendente. |
| Extensões | Veias renais, oclusão, pós-stent, índice de aceleração, relação renal/segmentar e especiais/comparativos aguardam escopo/fonte; não habilitar diagnósticos. |
| Recomendações | Contexto, sugestão, confirmação e inclusão; desligadas por padrão e independentes do diagnóstico. |

### Dependências, mínimos e correspondência

**INTERNO, segundo dossiê:** normal VPS até 180 cm/s, RAR <3,2, IR 0,55–0,70; faixa limítrofe 180–250; significância por VPS >250 **ou** RAR >3,2. Não publicar percentual. Sobreposição em 180, RAR exatamente 3,2 e limite do IR 0,80 exigem resolução antes de regras finais; não interpolar critérios ausentes.

RAR = maior VPS renal ipsilateral/VPS aórtica, somente com operandos presentes e denominador não zero. Elegibilidade clínica da VPS aórtica e tolerância entre RAR ditada/calculada estão pendentes. IR médio usa polos disponíveis, indicando cobertura; não inventar três aferições. Qual IR sustenta a conclusão quando há polos/média/resumo divergentes está pendente. Diferença renal = valor absoluto entre comprimentos bilaterais, condicionada à confirmação da semântica.

| Conteúdo a compor | Dados mínimos e saída permitida, ainda sem frases |
| --- | --- |
| Basal normal bilateral A1 | VPS renal D/E, avaliação e declaração médica de normalidade bilateral; IR D/E e faixa válida para incluir normalidade do IR. Outros parâmetros somente se avaliados/medidos. |
| Normal unilateral/limitação A2, A16–A17 | Lado avaliado e parâmetros; motivo/território do lado limitado. Negativa restrita ao avaliado; ausência de aorta impede RAR, sem apagar VPS renal válida. |
| Limítrofe A3 | VPS, lado, segmento se informado e RAR quando disponível; não diagnosticar estenose. Participação na conclusão depende de decisão. |
| Estenose A4–A6 | Lado e VPS >250, ou RAR >3,2 com as duas VPS de origem; variantes VPS somente/RAR somente/ambos/bilateral. Política de confirmação é pendente, pois o writer atual também aceita afirmação explícita sem esses mínimos. |
| Tardus-parvus A7–A8 | Lado, território e morfologia; IR/TA se disponíveis. Complementa critério direto ipsilateral; isolado não publica significância. Forma sugestiva precisa de revisão. |
| IR A9–A12 | Valores e lados; bilateral elevado tem suporte interno inespecífico, sem etiologia. IR baixo sem morfologia, unilateral elevado e intervalo 0,71–0,79 permanecem sem conclusão final. |
| Assimetria/acessória A13, A15 | Dois comprimentos para diferença; presença/lado da acessória ou pesquisa limitada. Consequência na conclusão depende das condições descritas e decisões pendentes. |
| Ausência de fluxo/pós-stent A14, A18 | Preservar dado explícito, sem inferir oclusão/critério de reestenose. Sem fonte aprovada, não sintetizar diagnóstico. |
| Recomendação R1 | Contexto de investigação/intervenção, conteúdo aprovado e confirmação de inclusão; não derivar automaticamente de suspeita ou limitação. |

Corpo em ordem aorta → renal direita → esquerda → RAR → intrarrenal → rins; conclusão ligada aos achados relevantes, negativa restrita ao escopo. Numeração conforme convenção interna renal: somente dois ou mais itens. Resolver regras em conflito antes de escrever variantes finais.

Ditado e Web atribuem os mesmos IDs de lado, estrutura e parâmetro. Ditado compacto sem segmento conserva VPS sem segmento; “normal” afeta somente o território citado. “Relação renal-aorta” normaliza para RAR. Transplante gera recusa/redirecionamento explícito; não usar critérios nativos. A confirmação ditada pode ser evidência, mas sua suficiência seguirá a decisão médica registrada, sem confirmar automaticamente interpretação do LLM.

**Bloqueios de síntese:** política de diagnóstico/confirmação, fronteiras numéricas, IR sem regra e agregação, TA/limiar, elegibilidade/tolerância RAR, assimetria e extensões sem fonte. Dossiê também aponta conflitos de técnica, normalidade aórtica e recomendações no conhecimento. Esses conflitos precisam de decisão e saneamento posterior; o pacote dormente não os corrige na produção.

## Pacote 2 — Doppler venoso de MMII

Código e nome canônico: **`DOPPLER_VENOSO_MMII` — Doppler venoso de MMII**. **INTERNO:** `DOPPLER_VENOSO_MMII_MEDIDAS` será apresentação detalhada do mesmo estado/regras, preservando a categoria solicitada no registro. Não criar contrato clínico concorrente.

### Artefatos e destinos posteriores

| Artefato | Criar posteriormente | Conteúdo/ligação |
| --- | --- | --- |
| Especificação e manifesto | `docs/competitor-research/laudario/synthesis/pacotes/doppler-venoso-mmii/pacote.md` | Protocolos, cobertura, decisões P1–P10, fontes, versões e aprovação. |
| Basais e biblioteca | `packages/shared/src/clinicalModels/dormant/dopplerVenosoMmiiContent.ts` | Basais por protocolo/lado; refluxo, TVP/fases, perfurantes, variantes, calibres e limitações. |
| Corpo/conclusão | No mesmo `dopplerVenosoMmiiContent.ts` | IDs por achado ligam dados mínimos, corpo, conclusão opcional e recomendação; calibre isolado não gera insuficiência. |
| Contrato/regras | `packages/shared/src/clinicalModels/dormant/dopplerVenosoMmii.ts` | Segmentos, protocolos, medidas, trombose, refluxo, confirmação e validações. |
| Adaptador/exemplos mobile | `apps/api/src/server/renderer/categories/dormant/dopplerVenosoMmiiAdapter.ts`, `dopplerVenosoMmiiExamples.ts` no mesmo diretório | Ditado → estado/pendências; pares sintéticos com protocolo explícito. |
| Formulário Web | `apps/web/src/components/laudar/dormant/DopplerVenosoMmiiForm.tsx` | Exame, profundo, junções/safenas, perfurantes, tributárias, trombose, mapa e recomendações. |
| Renderer | `packages/shared/src/clinicalModels/dormant/renderDopplerVenosoMmii.ts` | Mesmo contrato/biblioteca nos protocolos completo, TVP e medidas. |
| Adaptador do mapa | `packages/shared/src/clinicalModels/dormant/dopplerVenosoMmiiMap.ts` | Estado confirmado → mapa; sem segunda extração LLM; correção manual volta ao contrato. |
| Testes | `packages/shared/src/clinicalModels/dormant/dopplerVenosoMmii.test.ts`, `apps/api/src/server/renderer/categories/dormant/dopplerVenosoMmiiAdapter.test.ts`, `apps/web/src/components/laudar/dormant/DopplerVenosoMmiiForm.test.tsx` | Casos do dossiê, mapa, desfazer e paridade da variante medidas. |
| HTML médico | `docs/competitor-research/laudario/synthesis/pacotes/doppler-venoso-mmii/revisao.html` | Basais, cada alteração/conclusão e mapa lado a lado; itens pendentes identificados. Gerar após decisões. |

### Campos e estados principais

| Bloco | Campos previstos, sem redação final |
| --- | --- |
| Exame | Protocolo explícito `completo`, `tvp_only`, `mapeamento_medidas`; lateralidade, indicação/sintomas, posição/manobras realmente usadas. |
| Avaliação | Por estrutura/lado: não avaliado/normal/alterado/limitado; `examined`, teste de competência e refluxo não avaliado separados. Limitado exige motivo/território. |
| Profundo | Femoral comum, femoral, profunda, poplítea, tibiais posteriores/anteriores, fibulares, gastrocnêmias e soleares; ilíaca pendente. O catálogo não prova avaliação de todos em cada protocolo. |
| Junções/safenas | JSF/JSP; VSM em oito pontos do dossiê; VSP em JSP/proximal/distal; calibres, extensão do refluxo e padrão, sem propagação automática da junção. |
| Variantes | Acessória anterior/Giacomini: presença/trajeto e competência somente se testada; hipoplasia/ausência anatômica exige regra/fonte. |
| Refluxo | Lado, estrutura, início/fim, tempo em s, manobra, posição e confirmação; classe derivada e versão do critério. |
| Trombose | Segmentos/extensão, compressibilidade, material/ecogenicidade, oclusão informada, fluxo/fasicidade/resposta, distensão/parede, recanalização/colaterais, fase e evidências. |
| Perfurantes | Lista com lado, face, nível, distância em cm e referência anatômica, diâmetro em mm, refluxo e conexão superficial–profunda. |
| Tributárias/varizes | Localização, calibre em mm e relação com safena; não inferir incompetência por calibre. |
| Contexto/classificação | CEAP somente com clínica explícita e confirmação; regra completa de publicação não fornecida. |
| Saídas opcionais | Mapa/inclusão separados; recomendações sugerida/confirmada/publicada; versões de contrato/asset e revisão/reportId. |

### Dependências, mínimos e correspondência

`tvp_only` restringe profundo e mantém superficial/perfurantes não avaliados. Não destruir dados prévios silenciosamente ao mudar protocolo: mostrar conflito e exigir decisão antes de publicar no novo escopo. Completo não presume normalidade de estruturas não preenchidas; isso diverge expressamente do silêncio superficial tratado como normal pelo writer atual.

**INTERNO, indireto e para revisão:** refluxo >1,0 s em femoral comum/femoral/poplítea; >0,5 s em profunda/tibiais/safenas/tributárias. Perfurantes têm critérios conflitantes. Valores exatamente no limiar, manobra por segmento e veias sem limiar descrito permanecem pendentes. Tempo em ms converte para s; calibre isolado nunca determina insuficiência.

| Conteúdo a compor | Dados mínimos e saída permitida, ainda sem frases |
| --- | --- |
| Basal profundo negativo | Protocolo/lado, segmentos efetivamente avaliados e resultados dos testes registrados; ausência de TVP limitada ao escopo. Conjunto mínimo de testes negativos precisa de revisão, sem inventá-lo. |
| Basal superficial sem refluxo | Protocolo completo/medidas, estruturas avaliadas e competência testada com resultado; nenhuma conclusão superficial em TVP-only. |
| Refluxo patológico | Lado, segmento/extensão, teste, manobra/posição e tempo acima do critério aprovado; confirmação médica conforme política final. Sem tempo: preservar achado não quantificado, sem classe automática. |
| Refluxo abaixo do limiar | Mesmo vínculo anatômico/teste e medida; descrição no corpo, sem item patológico de conclusão. Fronteira exata pendente. |
| TVP positiva | Lado/segmentos, conjunto mínimo aprovado e confirmação. Segmento/extensão isolados não bastam; `tvp_presente` é derivado, sem booleano independente. |
| Fase/oclusão/topografia | Fase somente com trombose; aguda exige evidências positivas aprovadas, senão indeterminada. Oclusão só explícita. Proximal/distal derivado de segmentos após resolver ilíaca e veias musculares. |
| Crônica/recanalizada/mista | Evidências de parede, recanalização, colaterais e eventual componente recente; critérios exatos não transcritos integralmente no dossiê, exigindo fonte/revisão posterior. |
| Perfurante incompetente | Localização/referência e critérios P1 aprovados; refluxo sem diâmetro/conexão não recebe classe automática. |
| Medidas/variantes/limitação | Calibres proximal→distal no corpo; variante e competência só se avaliadas; motivo/estrutura limitam a negativa. |
| CEAP/recomendação | CEAP exige dados clínicos explícitos, regra aprovada e confirmação. Urgência por TVP é sugestão separada, publicada só após confirmação; conduta intervencionista depende de P3. |

Corpo por lado: técnica/escopo → profundo → junções → safenas segmentadas → perfurantes → tributárias/varizes → limitações. Conclusão por achado confirmado, com lado/extensão; sem repetir calibre isolado como diagnóstico. Basais completos e TVP-only devem ser revisados separadamente.

Ditado e Web usam catálogo único e eventos por estrutura. A sequência mobile resolve protocolo/lados, avaliação/limitações e detalhes dos achados. Sugestão de protocolo exige confirmação explícita. JSF incompetente não marca toda VSM; extensão recebe evento próprio. Ditado contraditório e seleção conflitante produzem a mesma pendência, sem escolher silenciosamente um resultado.

Mapa deriva do contrato confirmado; não avaliado tem representação distinta de normal. Segmentar VSM/VSP e conservar trombose parcial/oclusiva informada, calibres e localização. Correção manual registra origem, altera o contrato e invalida revisão; texto/mapa/Sala recebem a mesma revisão. Cobertura visual do concorrente não autoriza incluir doença ausente da biblioteca.

**Bloqueios de síntese:** P1 perfurantes, P2 TVP/não testável, P3 conduta, P4 ilíaca, P5 manobras, P6 limites/hipoplasia/calibres, P7 fases e P8 cobertura sem fonte. P9/P10 são dependências de contrato/paridade. TVS, veia muscular e pós-safenectomia/ablação não recebem frases finais sem fonte; decidir exclusão ou obtenção de fonte na etapa posterior.

## Implementação posterior, arquivos de integração e gates

Os novos arquivos `dormant/` permanecem fora dos exports/registries e rotas públicos. Não alterar gates nem prompts ativos para construir/revisar os pacotes. Aprovação do HTML não equivale a autorização de ativação.

| Ordem/gate | Entrega e condição objetiva de avanço |
| --- | --- |
| 1 — decisões clínicas | Registrar respostas da seção final e exclusões da v1 nos manifestos. Itens sem fonte continuam pendentes; nenhum limiar novo por inferência. |
| 2 — contrato dormente | Criar schemas, proveniência, catálogos e cálculos isolados; validar estados incompletos/contraditórios, unidade/lado e fronteiras decididas. Não adicionar categorias públicas ainda. |
| 3 — síntese original | Escrever basal e biblioteca no estilo Domingos; mapear todos os IDs para corpo/conclusão/nenhum item/bloqueio. Fontes indiretas que não sustentam regra precisam de leitura autorizada posterior. |
| 4 — HTML/revisão | Gerar os dois HTMLs da mesma biblioteca, com medidas sintéticas, variantes de um critério, estados incompletos e pendências. Luiz aprova por item/versão; alteração clínica reinicia revisão afetada. |
| 5 — integrações isoladas | Adaptadores mobile, formulários, renderer e mapa usam a versão aprovada. Testar sem habilitar seleção pública, writer dedicado ou mapa produtivo. |
| 6 — paridade | Executar fixtures pareadas em Web/iOS/Android/API/Sala, inclusive variante medidas. Sem evidência mobile/Sala real, registrar gate não executado; teste compartilhado não comprova cliente. |
| 7 — decisão de ativação | Somente em etapa autorizada: confirmar gates e roteamento real de cada plataforma, aprovação/versionamento, rollback e ausência de fallback indevido; ativação conjunta por categoria. |

| Arquivos a alterar posteriormente, após revisão do código correspondente | Motivo/limite |
| --- | --- |
| `packages/shared/src/clinicalModels/contracts.ts` | Promover schemas/união/tipos e validações somente após aprovação; preservar os cinco contratos existentes. `types.ts` separado não é necessário. |
| `apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts`, `DOPPLER_VENOSO_MMII.ts` | Substituir dependência de schemas mínimos por adaptadores do contrato aprovado; preservar chamadas existentes até migração explícita. |
| `apps/api/src/server/renderer/categories/dopplerRenalFewshots.ts`, `apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts`, `dopplerVenosoMmiiWriterAudit.ts` no mesmo diretório | Destinos citados pelos dossiês, não lidos aqui; adaptar exemplos/auditorias sem manter regras clínicas paralelas. |
| `apps/api/src/server/pipeline/renderer.ts` | Revisar roteamento citado nos dossiês, variante medidas e bloqueio de fallback; caminho não lido, mudança condicionada à inspeção posterior. |
| `apps/web/src/components/laudar/ClinicalModelWorkspace.tsx`, `LaudarWebExperience.tsx`, `ExamCategoryPicker.tsx`; `apps/web/src/lib/clinicalModels.ts`, `writerCategories.ts` | Integrar formulários/catalogação e resolver precedência do writer; elegibilidade própria do lote, sem reutilizar automaticamente o gate dos cinco modelos. |
| `apps/web/src/components/laudar/WriterCategoryWorkspace.tsx` | Rever edição livre e vínculo do mapa/revisão na migração, pois hoje salva texto e exibe mapa recebido; não basta adicionar formulário. |
| `packages/schemes/src/vascular/findings.ts`, `venousMap.ts`; `LaudoUSG/Models/VenousSegmentCatalog.swift` no repo iOS | Destinos citados, não lidos; reconciliar segmentos/projeção visual e catálogo com o contrato, sem remoção abrupta de consumidores existentes. |
| Base de conhecimento renal/MMII/MMII medidas citada nos dossiês | Sanear conflitos somente após decisões e em tarefa autorizada; não publicar segunda biblioteca com critérios independentes. |
| Adapters iOS, Android/RN, endpoints de persistência/revisão e consumidor da Sala | Caminhos exatos não estabelecidos nesta leitura. Gate 5 exige mapa nominal desses arquivos após inspeção autorizada; não alegar que já estão integrados. |

Infraestrutura comum proposta: `packages/shared/src/clinicalModels/dormant/common.ts` para proveniência/revisões/pendências; `docs/competitor-research/laudario/synthesis/pacotes/gerar-revisoes.ts` para HTMLs; fixtures pareadas `pacotes/doppler-renal/casos.json` e `pacotes/doppler-venoso-mmii/casos.json`. Não publicar blocos no banco neste lote dormente.

## Aceite e comprovação de paridade

| Gate verificável | Critério de aceite |
| --- | --- |
| Cobertura renal | Os 20 cenários da seção 12 do dossiê têm estado, saída ou bloqueio esperado; acrescentar VPS 180, RAR 3,2, denominador zero/inapto, IR por polos vs resumo e confirmação removida. Casos pendentes não recebem gabarito inventado. |
| Cobertura venosa | Os 21 cenários da seção 11 têm resultado esperado; incluir fronteiras exatas, mudança de protocolo, fase sem trombose, oclusão não informada, CEAP sem clínica e correção manual do mapa. |
| Paridade de entrada | Para cada cenário, ditado sintético e seleções Web geram os mesmos campos clínicos, derivados e pendências; origem/evidência podem diferir e devem continuar preservadas. |
| Paridade de clientes | Web/iOS/Android serializam sem perda de valor, unidade, lado, segmento, avaliação e confirmação; reabrir e corrigir conserva estado. Todos usam mesma versão; cliente incompatível bloqueia publicação explicitamente. |
| API/renderização | Mesmo estado/revisão produz mesmo corpo/conclusão e mapa; clássico/objetivo variam apresentação, sem alterar fatos, negativos, diagnósticos ou recomendações. Validar handler real, não só função de schema. |
| Sala/persistência | Teste com fixture sintética verifica reportId e revisão comuns para texto, mapa e aprovação; edição/remoção revoga status revisado e nenhuma saída antiga aparece como atual. |
| Segurança clínica | Nenhuma normalidade por silêncio, bilateralidade por inferência, segmento criado, percentual renal, fase/oclusão automática ou recomendação sem confirmação. Conflitos bloqueiam a liberação correspondente. |
| Remoção/desfazer | Sem resíduos no corpo/conclusão/derivados/recomendações/mapa; nenhum override manual perdido silenciosamente. |
| Dormência/aprovação | Sem exposição pública por catálogo/alias/gate existente; HTML e aprovação referenciam versão exata. Testes clínicos e integrações executados com evidência registrada antes de futura ativação. |

## Prévia para decisão do Luiz

Todas as decisões abaixo são **PENDENTES**; referências internas e observações do concorrente não representam aprovação clínica do lote. A exclusão explícita de uma extensão sem fonte é resposta suficiente para a v1.

1. **Renal — diagnóstico e confirmação:** exigir critério numérico mais confirmação explícita? Uma afirmação médica de significância sem medidas poderá publicar diagnóstico? Definir também como confirmação ditada é validada, pois o writer atual admite ambas as vias isoladas.
2. **Renal — limites e conclusão:** resolver VPS exatamente 180/250, RAR exatamente 3,2 e IR exatamente 0,80; decidir consequência da faixa limítrofe e se assimetria exige item de conclusão. Confirmar a semântica da diferença bipolar.
3. **Renal — IR/espectro:** definir IR 0,71–0,79, elevado unilateral, baixo sem morfologia, critério por polo/média/resumo e forma sugestiva do tardus-parvus isolado; não atribuir etiologia pelo IR.
4. **Renal — medidas derivadas:** definir TA (unidade exibida e limiar), VPS aórtica elegível e tolerância RAR ditada/calculada; confirmar se RAR sem operandos documentados pode sustentar conclusão. Faixas plausíveis ausentes não serão inventadas.
5. **Renal — escopo v1:** decidir fronteira com aparelho urinário com Doppler e inclusão/exclusão de ausência de fluxo/oclusão, pós-stent, veias renais, índice de aceleração, relação renal/segmentar e especiais/comparativos; inclusão exige fonte.
6. **Renal — técnica/recomendações:** confirmar técnica limitada ao efetivamente avaliado, ausência de normalidade aórtica inferida e recomendação apenas com contexto e inclusão confirmada; resolver os conflitos internos antes das frases finais.
7. **Venoso — TVP:** definir mínimo positivo entre incompressibilidade isolada e associação com material, abordagem não testável e mínimo para negativa restrita; explicitar evidências de aguda/crônica/mista e harmonizar eventual subaguda com MMSS.
8. **Venoso — perfurantes:** escolher regra única para refluxo, diâmetro e conexão superficial–profunda, resolvendo “e/ou” das fontes internas; decidir publicação com dado incompleto.
9. **Venoso — refluxo:** confirmar limiares/fronteira exata, manobra/posição por segmento e regra para insuficiência confirmada sem tempo. JSF não define extensão de VSM; confirmar essa independência.
10. **Venoso — anatomia/calibres:** decidir ilíaca e topografia, limites do protocolo TVP e veias musculares; definir fonte/população para calibre/hipoplasia ou excluir essas classificações da v1.
11. **Venoso — cobertura adicional:** excluir da v1 ou fornecer fonte para TVS/distância à JSF e pós-safenectomia/ablação; não produzir frases por cobertura visual do concorrente.
12. **Venoso — CEAP/conduta:** definir mínimos clínicos/classificação CEAP ou excluí-la; resolver recomendação de ablação/escleroterapia versus proibição de conduta cirúrgica. Urgência por TVP permanece sujeita a confirmação de publicação.
