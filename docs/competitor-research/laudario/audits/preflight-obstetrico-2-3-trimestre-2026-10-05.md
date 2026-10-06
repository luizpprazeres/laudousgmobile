# Preflight — Obstétrico 2º/3º trimestre

Data: 05/10/2026. Rodada preparatória somente de leitura (código do LaudoUSG e app iOS), sem navegador e sem dados de pacientes. Não altera código clínico, fila nem status. Segue o guia (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:15`, `:48-53`, `:57-69`) e o formato de caso de `~/.codex/skills/laudario-product-study/references/record-schema.md`.

## 1. Escopo e limites

- Foco: "Obstétrico 2º/3º Trimestre", feto único. Código LaudoUSG: `OBSTETRICA`; a variante "com Doppler" cai em `OBSTETRICA` + módulo Doppler (Web combinado) ou `DOPPLER_OBSTETRICO` (isolado).
- Fronteiras, apenas anotadas: "com Doppler" (`catalogo-ultrassonografia-2026-10-02.json:12`), gemelar (`:13`) e "+ Perfil Biofísico Fetal" (`:24`). O PBF isolado já é `gap confirmado` (`crosswalk-perfil-biofisico-fetal-2026-10-03.md:11-13`); nenhuma combinação foi estudada (`fila-e-mapa-canonico-2026-10-03.md:7`).
- Concorrente: `observado` apenas que o exame consta do catálogo. Abas, campos, curvas, limiares, cálculos, conclusão e recomendações são **não observados**. O 1º trimestre (`cases/obstetrico-1t-2026-10-02.md`) não autoriza inferir o comportamento do 2º/3º.
- Limites da rodada: um exame, até três cenários sintéticos, interface normal, sem endpoints privados, sem copiar/imprimir/finalizar, restaurar ao final.

## 2. Estado atual no LaudoUSG

| Camada | Classificação | Evidência e gate |
| --- | --- | --- |
| Web | **estruturado ativo** (feto único) | Em `STRUCTURED_WEB_CATEGORY_CODES` (`apps/web/src/lib/writerCategories.ts:4`) e no grupo obstétrico (`apps/web/src/components/laudar/categoryGroups.ts:34`). Formulário em `apps/web/src/lib/deterministic/organs/obstetrica.ts:467-489`; adaptador `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts:118-240`; render remoto via `/api/catalog/[category]/render` (`apps/api/src/app/api/catalog/[category]/render/route.ts:45-83`). Gate estático `CATEGORIAS_MIGRADAS` (`apps/web/src/lib/catalog/migradas.ts:29-33`), sem variável de ambiente. Gemelar e gestação inicial fora da tela (`obstetricaParaCatalogo.ts:178-180`) |
| Android/RN | **genérico + parcial** | Só ditado (`apps/mobile/src/ui/tokens.ts:158`); atalhos "IG pela DUM", "IG pela 1ª USG", "Calcular percentis" (abre a calculadora Doppler) e "Sem vitalidade" (`apps/mobile/app/generate.tsx:1195-1201`). Peso Hadlock 4 + percentil Intergrowth em calculadora local, inserido como texto (`apps/mobile/src/features/generate/HadlockCalculatorSheet.tsx:26-61`; lógica em `apps/mobile/src/shared/calculators/hadlock.ts`, fora de `packages/shared`) |
| iOS | **genérico + parcial** | `ReportCategory.obstetrica` (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:14`); sem formulário. Atalhos "IG pela biometria" (CF/Hadlock), "IG pela DUM", "Calcular percentis", "Sem vitalidade" com instrução em prosa (`Features/Generate/GenerateViewModel.swift:23-30`). PFE Hadlock 4 (1985) e percentil Intergrowth-21st por padrão, com Hadlock 1991 e WHO como opções (`Services/HadlockCalculator.swift:105-160`), inserido como frase (`:226-245`). Bloco "Biometria fetal:" da análise de imagem (`Services/ImageAnalysisService.swift:181-182`) |
| API | **estruturado; ativação mobile não verificável no repo** | Ditado → extração → `renderObstetrica` (`apps/api/src/server/pipeline/renderer.ts:529-587`) somente se `OBSTETRICA` estiver em `RENDERER_CATEGORIES` (`apps/api/src/server/pipeline/generationPathResolver.ts:33-94`; default vazio em `apps/api/src/server/env.ts:74`); fora disso, writer com few-shots/RAG. Flags (todas default `false` no repo): `OBST_BIOMETRIA_DET` (`env.ts:196`, `renderer.ts:575-583`), `IG_REFERENCE_CORRECTION` (`env.ts:256`), `OBST_IG_SANITY` (`env.ts:205`), `GRANNUM_PLACENTA` (`env.ts:277`), `FLEXIBLE_CONCLUSION` (`env.ts:268`), `GOLF_BALL_SNIPPET` (`env.ts:224`), `DOPPLER_UMBILICAL_SAFETY` (`env.ts:211`), `MODEL_CATALOG_CATEGORIES` (`env.ts:108`). `DOPPLER_STANDALONE_V2` vem `true` (`env.ts:86`, `generationPathResolver.ts:78-80`) |
| Shared | **parcial** | `classifyFetalGrowth` (FMB 2024; não calcula percentil) em `packages/shared/src/calculators/fetalGrowth.ts:1-20`, `:165`; datação em `packages/shared/src/calculators/gestationalAge.ts:60-118`. Não há PFE, curva de percentil nem contrato `OBSTETRICA` no pacote. `packages/fmf` trata trissomias/pré-eclâmpsia, não crescimento |
| Seed | registrado | `packages/db/src/seeds/data.ts:66-67`; não comprova fluxo ativo |
| Conhecimento | **ativo no writer, conflitante** | 29 snippets em `packages/knowledge/snippets/OBSTETRICA/`. `regra/frases-normais-quando-omitido.md:30`, `:41`, `:65` mandam assumir apresentação cefálica e frases normais quando omitidas. `regra/peso-fetal-percentil.md:19-40` concluem PIG e "RCF estágio I de Gratacós" só pelo percentil |

**Produção:** não verificável no repositório. Um comentário afirma `IG_REFERENCE_CORRECTION` ligada em produção (`apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts:182`). O registro mais recente encontrou `RENDERER_CATEGORIES` vazio em 03/10 (`crosswalk-doppler-aortorrenal-2026-10-03.md:17`). Se ainda estiver vazio, iOS e Android geram `OBSTETRICA` pelo **writer**, com os snippets acima, e não pelo renderer. Isso precisa ser confirmado antes do crosswalk.

Há duas fontes de frase para o mesmo modelo: `categories/OBSTETRICA.ts:1282-1284` e `catalog/OBSTETRICA.classico.ts:649-692`. Há também três autoridades sobre crescimento: o renderer, que só reproduz o percentil (`OBSTETRICA.ts:858-865`); o módulo FMB (`fetalGrowthModule.ts:97-121`); e o snippet do writer.

## 3. Cobertura atual por item (renderer da API, formulário Web e mobile pelo ditado)

| Item | Cobertura | Falsa normalidade, unidade ou derivado |
| --- | --- | --- |
| Apresentação/situação | Longitudinal (cefálica ou pélvica) e transversa (polo à direita ou à esquerda), dorso opcional (`obstetrica.ts:131-174`) | Web inicia em cefálica (`:145`, `:206`); a API usa cefálica quando não ditada (`OBSTETRICA.ts:840`). Não há estado "não avaliada" |
| BCF/vitalidade | Presente, ausente, bradicardia e taquicardia, com bpm (`obstetrica.ts:175-184`; `OBSTETRICA.ts:1418-1466`) | Presença é o padrão e sai "____ bpm" sem número. Bradicardia e taquicardia são seleção manual, sem derivação do bpm |
| Movimentos | Ativos, reduzidos ou ausentes | "Ativos" quando omitido (`OBSTETRICA.ts:1432-1438`; Web `:188`) |
| Anatomia | Fixa | Crânio, coluna, estômago e bexiga são declarados normais sem campo (`OBSTETRICA.ts:1282-1284`; `obstetrica.ts:245-247`) |
| Biometria | DBP, CC, CA e CF em mm (`obstetrica.ts:270-273`; `OBSTETRICA.ts:848-856`) | Medida ausente vira "____". Unidade do ditado: só converte cm quando dito (`OBSTETRICA.ts:444-450`); reconciliação cm→mm atrás de `OBST_BIOMETRIA_DET` (`biometriaFetal.ts:1-24`) |
| PFE | Web automático, Hadlock 1985 com 4 medidas, com modo manual (`components/laudar/biometryAutomation.ts:16-34`); iOS e RN pelas calculadoras; API só reproduz `peso_g` | A prévia Intergrowth usa Hadlock 3 (`biometryAutomation.ts:36-44`), que pode divergir do peso do laudo |
| Percentil/curva | Web: número digitado pelo médico, com curva "não informada" por padrão (`fetalGrowth.ts:19-28`; `fetalGrowthParaCatalogo.ts:94-101`). iOS: Intergrowth por padrão. API: só reproduz (`OBSTETRICA.ts:862`) | Sem módulo de crescimento, percentil < p10 não gera item de conclusão no renderer. No writer, o snippet conclui PIG ou RCF sem Doppler |
| IG | Biométrica digitada (Web `obstetrica.ts:53-54`) ou ditada (`OBSTETRICA.ts:451-454`); DUM ou 1ª US corrige acima de 5 dias (`renderer/ig.ts:31`); sanidade acima de 28 dias atrás de flag (`ig.ts:322-323`) | A Web não deriva IG das medidas. O iOS deriva só pelo CF. Sem data do exame, a referência não se aplica (`obstetrica.ts:105-116`) |
| Placenta | Localização e grau livres, ecotextura, relação com o OI (baixa, marginal ou prévia), distância em **mm**, descolamento, acretismo e lagos (`obstetrica.ts:292-391`; `OBSTETRICA.ts:867-911`) | "Placenta de aspecto normal" por padrão (`OBSTETRICA.ts:898-899`; Web `:375-376`). A cervicometria guarda a distância placenta–OI em **cm** (`obstetricaParaCatalogo.ts:63-66`): mesmo conceito em dois campos e duas unidades. Grau Grannum atrás de flag (`OBSTETRICA.ts:671-687`) |
| Líquido | Subjetivo, ILA e MBV com classe pelo código (ILA < 5/> 25 cm; MBV < 2/> 8 cm) (`OBSTETRICA.ts:918-990`) | O subjetivo normal é o padrão; ILA/MBV em branco voltam a normal (`obstetricaParaCatalogo.ts:165-171`). **Gemelar com MBV conclui normal para ambos sem olhar os valores** (`OBSTETRICA.ts:966-971`) |
| Cordão | Vasos do cordão (3 ou 2) | Inserção, circular e Doppler fora do formulário. "Não informar" é o padrão (correto) |
| Colo | Cervicometria opcional (`obstetrica.ts:479`) | Sem medida não há frase (correto) |
| Sexo | **Ausente** do schema (`OBSTETRICA.ts:117-216`) | `candidato a lacuna`; o iOS usa sexo detectado no texto apenas para a curva WHO |
| Gemelar | API: corionicidade, fetos rotulados, peso médio e divergência ≥ 20% (`OBSTETRICA.ts:1189-1268`, `:716-729`) | Ausente na Web. Ver o defeito do MBV acima |
| Conclusão | Itens de IG, vitalidade, placenta, líquido, cervicometria, Doppler e crescimento | `achados_adicionais` vai só ao corpo (`OBSTETRICA.ts:1315-1319`). Um achado livre pode conviver com uma conclusão normal |

## 4. Etapa 0 — inventário do concorrente (sem alterar nada)

Registrar só o que aparecer: abas e ordem; estado inicial de apresentação, BCF, movimentos, anatomia, placenta e líquido; se há "não avaliado" por item. Na biometria: medidas aceitas, unidade exibida, fórmula do PFE e se é escolhível, curva de percentil e se é escolhível, uso de sexo, e IG por biometria × DUM × 1ª US (regra de correção exibida, sem copiar valores). Placenta: grau, distância ao OI e unidade. Líquido: ILA × MBV, classe e limiares (só registrar que existem). Também cordão, colo, sexo, conclusão, recomendações e se algum item exige confirmação. Na fronteira, registrar apenas os nomes: o que "com Doppler" e "+ PBF" acrescentam como abas.

### C1 — Normal, 28 semanas
- Entrada: DBP, CC, CA e CF sintéticos coerentes com 28 semanas, BCF 140 bpm, ILA 14 cm, placenta posterior distante do OI.
- Registrar: PFE e percentil derivados (fórmula e curva exibidas), IG biométrica, frases afirmadas sem preenchimento (anatomia, movimentos), forma da conclusão e restauração.

### C2 — PFE < p10 com ILA reduzido
- Entrada: CA e CF reduzidos para PFE abaixo de p10 na curva exibida; ILA 4 cm; sem Doppler.
- Registrar: se conclui PIG ou RCF sem Doppler; se recomenda Doppler; se o líquido reduzido chega à conclusão; se a classe muda ao trocar a curva; se algo persiste após apagar.

### C3 — Pélvica com placenta baixa ou biometria incompleta (uma variável por vez)
- Entrada: apresentação pélvica e placenta com borda a 15 mm do OI; depois, só CF apagado.
- Registrar: lado, apresentação e unidade da distância no corpo e na conclusão; recomendação de reavaliação; se o PFE ou o percentil some ou é estimado com 3 medidas; se a IG muda de fonte.

## 5. Riscos e candidatos a lacuna

1. `defeito confirmado no código`: no writer, o snippet conclui PIG/RCF só pelo percentil (`peso-fetal-percentil.md:19-40`), contra a trava do FMB que exige Doppler completo (`fetalGrowth.ts:9-14`). Os resultados dependem do caminho.
   Nota do orquestrador (05/10): o conflito real está nos cenários 2 e 3 do snippet (PIG ou RCF com PFE entre p3 e p10 sem Doppler). O cenário 1 (PFE < p3) é compatível com o protocolo usado em `fetalGrowth.ts`, que trata esse percentil isolado como critério de RCF. A decisão de qual autoridade vale é médica.
2. `defeito confirmado no código`: gemelar com MBV sempre conclui "normal para ambos" (`OBSTETRICA.ts:970`).
3. `inferido`: falsa normalidade por padrão na apresentação, nos movimentos, na anatomia, na placenta e no líquido subjetivo. Não há estado "não avaliado".
4. `defeito confirmado no código`: PFE e percentil não têm fonte única. Web usa Hadlock 1985 com percentil manual; iOS e RN usam Hadlock 4 com Intergrowth automático, inserido como texto; a prévia Web usa Hadlock 3; `packages/shared` não tem nada disso.
5. `candidato a lacuna`: distância placenta–OI em mm num campo e em cm no outro; sexo fetal ausente; IG biométrica não derivada das medidas na Web.
6. `inferido`: a produção de iOS e Android pode estar no writer (gate vazio em 03/10), e não no renderer descrito acima.
7. `inferido`: o texto clássico existe em duas fontes (`OBSTETRICA.ts` e `catalog/OBSTETRICA.classico.ts`), com risco de divergência.

## 6. Melhorias sugeridas ao LaudoUSG

| # | Controle/estado | Corpo e conclusão | Condições | Web / prompt mobile | Prioridade | Evidência / falta validar |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Remover a classificação por percentil do snippet do writer e encaminhar para `classifyFetalGrowth` | PIG ou RCF só com curva identificada e Doppler; sem isso, "feto pequeno, estadiamento incompleto" | Percentil numérico + curva + IG; confirmações de 2ª medida | Prompt: não classificar e pedir a curva; Web já usa o módulo | P0, corrige gap | Código; falta revisão médica da redação |
| M2 | Classe de MBV por feto no gemelar | Oligo/polidrâmnio por feto na conclusão | Rótulo do feto, medida em cm | Mobile: exigir rótulo; Web: gemelar ainda ausente | P0, corrige gap | Código; teste sintético |
| M3 | Estado `não avaliado` em apresentação, movimentos, anatomia, placenta e líquido | Não afirmar normal o que não foi avaliado; restringir a conclusão ao avaliado | Default explícito por campo | Web: primeira opção "não avaliado"; prompt: omitir em vez de normalizar (rever `frases-normais-quando-omitido.md`) | P1 | Precisa de decisão do Luiz sobre o modelo-padrão |
| M4 | Serviço único em `packages/shared` para PFE (fórmula/versão) + percentil (curva/versão/sexo) + IG biométrica | Corpo com peso, percentil e curva; conclusão só pela regra M1 | 4 medidas em mm; IG; data do exame | Web e calculadoras iOS/RN consomem o mesmo resultado estruturado, não texto | P1 | Goldens iOS/Web/RN; diferenças Hadlock 3/4 |
| M5 | Distância placenta–OI única, com unidade explícita | Corpo com medida; conclusão baixa/marginal/prévia derivada só com critério próprio | Via de exame e IG | Um campo só, reaproveitado na cervicometria | P2 | Precisa de fonte clínica própria para os cortes |
| M6 | Sexo fetal opcional (`não avaliado` por padrão) | Só no corpo | Nunca inferir do texto para escolher curva sem confirmação | Campo opcional; prompt só se ditado | P3 | Validar se o Luiz quer no laudo |
| M7 | `achados_adicionais` com item de conclusão obrigatório ou aviso | Evitar achado no corpo com conclusão normal | Confirmação médica | Aviso na revisão | P2 | Ver `FLEXIBLE_CONCLUSION` |

Os limiares de ILA/MBV, a curva e os cortes de placenta baixa devem vir de fonte própria e passar por revisão médica. Nada do concorrente deve ser adotado. Antes de ativar, confirmar `RENDERER_CATEGORIES` e as flags em produção e testar normal, alterado, incompleto, unidades e serialização ponta a ponta nas três plataformas e na Sala (`GUIA-CLAUDE-CODE.md:96`). Aviso ao orquestrador: M1, M3 e M4 valem também para `MORFOLOGICO` e `DOPPLER_OBSTETRICO`.

## 7. Rodada funcional concluída em 06/10/2026

Os três cenários foram executados com dados sintéticos. O modelo foi restaurado, reaberto e conferido no baseline. O registro funcional está em [../cases/obstetrico-2-3-trimestre-2026-10-06.md](../cases/obstetrico-2-3-trimestre-2026-10-06.md) e o cruzamento atualizado em [../crosswalk-obstetrico-2-3-trimestre-2026-10-06.md](../crosswalk-obstetrico-2-3-trimestre-2026-10-06.md).
