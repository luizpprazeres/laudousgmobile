# Cruzamento Laudário × LaudoUSG — Aparelho Urinário com Doppler

Data: 07/10/2026. Base: `main` em `4f93b0d` e app iOS em `bce4604`. O concorrente foi observado em uma sessão sintética com baseline e dois cenários, restaurada ao final ([caso](cases/aparelho-urinario-com-doppler-2026-10-07.md)). O código do LaudoUSG foi apenas lido; nenhuma prova sintética foi executada nesta rodada. O preflight de apoio está em `/tmp/laudario-aparelho-urinario-doppler-preflight-2026-10-07.md`.

## Rótulos

| Rótulo | Uso neste arquivo |
| --- | --- |
| `observado` | visto na interface do Laudário em 07/10/2026 |
| `observado-código` | escrito literalmente no código do LaudoUSG, com caminho e linha |
| `inferido` | consequência deduzida, sem teste de fronteira ou execução |
| `candidato` | parece ausente ou incompleto no LaudoUSG, mas a busca não cobriu todas as camadas ou depende de decisão médica |
| `gap confirmado` | ausência comprovada no Web, Android/RN, iOS e contrato compartilhado aplicável |

## Resultado

O painel renal anatômico do concorrente é o mesmo nas três superfícies estudadas (`observado`). No LaudoUSG, a identidade do rim também já é única: `createSharedKidneyModule` alimenta Abdome Total, Vias Urinárias e Doppler renal, e `renderSharedKidney` escreve o mesmo parágrafo nas três (`observado-código`). A reutilização dos controles renais, portanto, está coerente.

A lacuna está na composição. O LaudoUSG não tem um exame que reúna rins, bexiga com jatos e bloco hemodinâmico. O médico precisa escolher entre Vias Urinárias, que não tem vasos, e Doppler renal, que não tem bexiga. Emitir os dois duplicaria o texto renal (`gap confirmado` para o exame único; `inferido` para a duplicação).

Os dois cenários do concorrente se dividem em um comportamento a aproveitar e um a evitar. A variante anatômica isolada ficou restrita ao rim correto. Já a limitação técnica ganhou causas que o médico não selecionou.

## Estado por plataforma

| Camada | Classificação | Evidência (`observado-código`) |
| --- | --- | --- |
| Web — exame único com Doppler | **ausente** | sem card nem código no seletor (`apps/web/src/components/laudar/categoryGroups.ts:29`, `:55`); sem derivada em `apps/web/src/lib/catalog/migradas.ts:71-102`; sem associação Vias + Doppler renal (`apps/web/src/lib/composition/associations.ts:37-60`) |
| Web — Vias Urinárias | estruturado ativo | rins e bexiga compartilhados (`apps/web/src/lib/deterministic/organs/viasUrinarias.ts:12-14`); técnica sem Doppler (`:9`) |
| Web — Doppler renal | estruturado ativo | aorta, os mesmos rins e artéria renal por lado, sem bexiga (`apps/web/src/lib/deterministic/organs/dopplerRenal.ts:165-171`); renderer em `apps/api/src/server/renderer/categories/dopplerRenalWeb.ts`, registrado em `apps/api/src/server/catalog-api/structuredRenderers.ts:16` |
| Web — Abdome Total | estruturado ativo | mesmos rins e bexiga (`apps/web/src/lib/deterministic/organs/abdomeTotal.ts:112-125`; `organs/rim.ts:4-5`; `organs/bexigaAbdome.ts`) |
| API — ditado | writer fora do gate | renderer só com a categoria em `RENDERER_CATEGORIES`, cujo default é vazio (`apps/api/src/env.ts:74`; `apps/api/src/server/pipeline/generationPathResolver.ts:87`); produção não foi reverificada nesta rodada |
| API — roteamento | risco `inferido` | código com “urinári” vai para `VIAS_URINARIAS` (`apps/api/src/server/pipeline/categoryNormalization.ts:47`); não existe upgrade Doppler para Vias (`:30-33`) |
| Android/RN | genérico | `apps/mobile/src/ui/tokens.ts:140`, `:145`; `apps/mobile/src/features/generate/categories.manual.ts:6-8`; sem modelo clínico renal |
| iOS | genérico | `laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:7`, `:34`; fora de `PendingClinicalModelContracts` |
| Shared | ausente para rim | `ClinicalModelCodeSchema` não tem código renal ou urinário (`packages/shared/src/clinicalModels/contracts.ts:3-10`); o contrato vive em `apps/web/src/lib/deterministic/organs/urinaryShared.ts` e `apps/api/src/server/renderer/categories/sharedUrinary.ts:93-125` |

## Cruzamento por estado observado

### Baseline

| Concorrente | LaudoUSG |
| --- | --- |
| `observado`: publica normalidade anatômica bilateral, bexiga, aorta e artérias renais e intrarrenais sem nenhuma medida | Vias Urinárias também nasce normal sem medida e sem pendência. Os defaults ficam em `urinaryShared.ts:577-601`, `:91` e `:104`, e o teste do estado inicial está em `apps/api/src/server/renderer/catalog/__tests__/shared-urinary-organs-ponta-a-ponta.manual.ts:59-67` (`observado-código`). |
| | O Doppler renal abre com três pendências bloqueantes e não publica vasos normais por padrão (`shared-urinary-organs-ponta-a-ponta.manual.ts:71-73`, `observado-código`). |
| | O atalho “Vasos sem alterações” confirma os três territórios e publica fluxo preservado bilateralmente sem medida (`apps/web/src/components/laudar/LaudarWebExperience.tsx:1513-1527`; `organs/dopplerRenal.ts:7-22`; teste `:75-82`). A ação é explícita, mas a normalidade continua sem dado (`observado-código`). |
| | A frase dos rins é emitida sempre que não há alteração, inclusive no Doppler renal (`sharedUrinary.ts:403-413`, `observado-código`). |

O LaudoUSG é mais conservador no bloco vascular, mas repete a normalidade anatômica sem medida. **Comportamento a não reproduzir:** normalidade vascular e intrarrenal publicada no estado inicial.

### Cenário 1 — Coluna de Bertin à direita

| Concorrente | LaudoUSG |
| --- | --- |
| `observado`: corpo com proeminência cortical entre pirâmides; conclusão de variante anatômica sem significado patológico; demais estruturas normais | A mesma opção existe nas três categorias (`urinaryShared.ts:592`). O renderer descreve a proeminência cortical no corpo e conclui coluna de Bertin proeminente no rim do lado marcado (`sharedUrinary.ts:423-426`). O rim deixa de ser normal (`:400`) e as outras estruturas continuam inalteradas (`observado-código`). |

A coerência é a mesma do Doppler Aortorrenal em 06/10. A conclusão do LaudoUSG não traz qualificador de benignidade. Acrescentá-lo é uma decisão de redação clínica, não uma lacuna (`candidato` para revisão médica).

### Cenário 2 — Artéria renal direita não avaliada por limitação técnica

| Concorrente | LaudoUSG |
| --- | --- |
| `observado`: retirou as frases vasculares normais do lado direito e concluiu não avaliação | `Não avaliada` bloqueia o laudo; o lado precisa ser `Limitada` ou avaliado (`dopplerRenalWeb.ts:63-65`; `apps/web/src/lib/catalog/dopplerRenalParaCatalogo.ts:195-197`) (`observado-código`). |
| | `Limitada` exige motivo escrito pelo médico (`dopplerRenalParaCatalogo.ts:192-194`; `dopplerRenalWeb.ts:87-89`). O corpo usa somente esse texto (`dopplerRenalWeb.ts:158`) e a normalidade bilateral é suprimida (`:259-264`) (`observado-código`). |
| | A conclusão do formulário Web **não** menciona a limitação (`dopplerRenalWeb.ts:236-264`, `observado-código`). |
| `observado`: o corpo acrescentou interposição gasosa, obesidade e calcificações sem seleção — **defeito confirmado no concorrente** | O formulário Web não presume causa (`observado-código`). No writer, a exceção de exame limitado só deve ser aplicada quando o médico citar a limitação (`packages/knowledge/snippets/DOPPLER_RENAL/excecao/exame-tecnicamente-limitado.md:43`), e o prompt dedicado proíbe normalidade presumida (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:100`). O modelo da exceção oferece causas como alternativas (`exame-tecnicamente-limitado.md:35`). Não foi provado que o writer nunca escolha uma delas sem ditado (`inferido`). |

**Comportamento útil:** o lado não avaliado deixa de ser normal e a conclusão nomeia a não avaliação. **Comportamento a não reproduzir:** publicar causas que o médico não informou.

### Restauração

`observado`: o concorrente voltou ao baseline após reabrir o modelo, desmarcar a variante e selecionar de novo janela boa, artéria pérvia e padrão normal. No LaudoUSG, subcampos de opção desmarcada são ignorados (`urinaryShared.ts:820-940`). O servidor recalcula os derivados do Doppler renal em vez de confiar no navegador (`dopplerRenalWeb.ts:105-112`) (`observado-código`). Não houve teste de resíduo no LaudoUSG nesta rodada (`inferido`).

## Lacunas

| # | Item | Rótulo | Evidência |
| --- | --- | --- | --- |
| L1 | Exame único ou composição com rim uma vez, bexiga/jatos e bloco hemodinâmico | `gap confirmado` | ausente no Web, nos dois clientes móveis e no shared (tabela acima) |
| L2 | Estado de presença do rim (não visualizado, nefrectomia, agenesia), que também tornaria o Doppler daquele lado não aplicável | `gap confirmado` no contrato estruturado | busca sem ocorrência em `urinaryShared.ts`, nos adapters, em `sharedUrinary.ts` e no shared; RN e iOS são só ditado; P0 do lote 2 continua aberto |
| L3 | Doppler de lesão renal (cisto complexo, nódulo, AML) como campo | `gap confirmado` no contrato estruturado | só existe texto livre (`urinaryShared.ts:615-621`); a bexiga já tem `doppler` por lesão (`:73-82`) |
| L4 | Conclusão do Doppler renal Web sem a limitação | `candidato` | `dopplerRenalWeb.ts:236-264`; o writer tem modelo de conclusão limitada no conhecimento, então a ausência não vale para todas as camadas |
| L5 | Cintilação descrita “ao Doppler” em Vias e Abdome, cuja técnica não cita Doppler | `inferido` | `sharedUrinary.ts:459-464`; `organs/viasUrinarias.ts:9`; `apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts:378`, `:797` |
| L6 | Estenose concluída automaticamente por VPS > 250 sem confirmação; RAR não derivada, com `____` quando falta aorta | `observado-código`; regra pendente de decisão | `dopplerRenalWeb.ts:239-244`, `:160-165`; `synthesis/input-doppler-renal-2026-10-03.md`, seção 5.2 |
| L7 | Assimetria renal com 1,8 cm no renderer e 1,5 cm no conhecimento | `observado-código` (divergência) | `dopplerRenalWeb.ts:255-258`; `packages/knowledge/snippets/DOPPLER_RENAL/modelo/template-padrao.md:49`, `:70` |
| L8 | Negativa “sem dilatação ureteral” em Vias sem ureter avaliado | `inferido` | `VIAS_URINARIAS.ts:739`, `:865`, `:956` |

IR intrarrenal, ΔIR, jatos ao Doppler, cintilação e recomendações **não foram observados** no concorrente. Nenhuma lacuna acima depende deles.

## Contrato mínimo proposto

- **Rim:** continua vindo de `createSharedKidneyModule` / `renderSharedKidney`, sem cópia. A presença do rim deve ser o primeiro campo (L2).
- **Bexiga e jatos:** continuam vindo de `createSharedBladderModule`. Se houver bexiga compartilhada com outro exame, a origem deve ser declarada, como em `associations.ts`.
- **Doppler por lado:** escopo `não realizado | avaliado | limitado`. `Limitado` exige motivo informado. Corpo e conclusão citam a limitação e nunca acrescentam uma causa não informada.
- **Bloco hemodinâmico:** reaproveitar os campos de `organs/dopplerRenal.ts`, com escopo a decidir (artérias principais completas ou apenas intrarrenal). A decisão depende da próxima observação.
- **Normalidade vascular:** somente por confirmação explícita, preferencialmente com pelo menos uma medida por lado (`candidato` para decisão médica).
- **Derivados:** recalculados no servidor e removidos quando a medida de origem é apagada.

## Melhorias sugeridas ao LaudoUSG

| # | Controle ou dado | Corpo e conclusão | Salvaguardas | Web / prompt mobile | Classe | Prioridade |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Caminho único para aparelho urinário com Doppler | rim descrito uma vez; Doppler por lado depois da morfologia; uma conclusão | nunca dois laudos com o mesmo rim | card derivado ou associação com rim compartilhado; prompt reconhece “com Doppler” e não cai em Vias puro | corrige L1 (`gap confirmado`) | alta |
| M2 | Limitação com motivo informado e citada na conclusão | conclusão restringe o escopo e nomeia o lado não avaliado | proibido acrescentar causa não informada; lado limitado nunca vira normal | seletor de escopo por lado + motivo; prompt copia só a causa ditada | melhora L4 (`candidato`) | alta |
| M3 | Prova do writer contra causa presumida | — | ditado “limitado” sem causa não pode gerar gases, biotipo ou calcificação | caso de teste no writer e auditoria | protege contra o defeito observado (`inferido`) | alta |
| M4 | Estado de presença do rim | rim ausente remove normalidade e Doppler do lado | nunca inferir a causa | primeiro campo do rim; prompt respeita “não visualizado” | corrige L2 (`gap confirmado`) | alta |
| M5 | Doppler da lesão renal | vascularização no corpo; conclusão sem diagnóstico histológico | nada pré-selecionado | mesmo campo da lesão vesical | corrige L3 (`gap confirmado`) | média |
| M6 | Normalidade vascular só com confirmação e dado mínimo | “fluxo preservado” somente com o lado avaliado | atalho não substitui medida quando a regra exigir | atalho ganha requisito de medida, se aprovado | depende de revisão médica (`candidato`) | média |
| M7 | Coerência da cintilação com a técnica | técnica e corpo concordam | em modo B puro, gerar pendência ou ajustar a técnica | subcampo condicionado ao modo | L5 (`inferido`) | média |
| M8 | Unificar o limiar de assimetria, a regra de confirmação da estenose e a derivação da RAR | uma fonte para corpo, conclusão e conhecimento | decisão médica explícita | — | L6/L7 (`observado-código`) | alta |

As sugestões M2, M4 e M5 também servem ao Abdome Total e ao Abdome Superior com Doppler, próximo item da fila. A M8 afeta o Doppler renal já ativo no Web.

## Provas necessárias antes de ativar

- Baseline sem normalidade vascular automática.
- Variante anatômica unilateral com o outro rim e os vasos intactos.
- Lado limitado com motivo e lado sem motivo, que deve bloquear.
- Ditado “limitado” sem causa no writer, que não pode inventar uma causa.
- Rim ausente com o Doppler daquele lado não aplicável.
- Obstrução unilateral com cálculo, cintilação e jato ausente sem duplicar o cálculo.
- IR por polo, se o escopo intrarrenal for adotado.
- Remoção de cada achado sem resíduo.
- Serialização nos três clientes até a API.

## Pendências

- Observar no concorrente IR/ΔIR, jatos ao Doppler, cintilação, vascularização de lesão e recomendações.
- Executar provas sintéticas do caminho Web do LaudoUSG; esta rodada só leu o código.
- Reverificar `RENDERER_CATEGORIES` em produção.
- Obter decisão médica sobre M6, M8 e o escopo do bloco hemodinâmico.
