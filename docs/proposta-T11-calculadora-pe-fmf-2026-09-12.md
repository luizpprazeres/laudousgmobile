# T11 — Calculadora de pré-eclâmpsia: proposta para o Luiz

Autor: Cartografo (FAROL) · 12/09/2026 · sem código, só decisão.

## Problema, como foi enunciado

"A calculadora de PE do app não é FMF (placar inventado, catraca de mão única).
Decidir: shadow mode do motor `packages/fmf` ou remover."

## O que o repositório diz hoje (verificado em 12/09)

**A pergunta está superada.** O placar de pontos foi apagado em 22/08 e o motor
FMF (Wright 2020, riscos competitivos) já está em `origin/main` e é o único
cálculo de PE nas três plataformas:

| plataforma | estado | evidência |
|---|---|---|
| Núcleo | `packages/fmf/src/*.mjs` (fonte de verdade) + port `packages/shared/src/calculators/preEclampsiaFmf.ts` | 342 golden vectors; 8 pontos lidos à mão no app oficial batem em ±0,003 no MoM; risco dentro de 3 unidades de "1 em N" |
| Web | `apps/web/src/lib/calculators/preEclampsia.ts` importa `@laudousg/shared`; `PreEclampsiaFmfPanel.tsx` em Obstétrica e Morfológico 1º tri | commit `671c060` (22/08) na `origin/main`; deploy automático da Vercel |
| Android | `PreEclampsiaCalculatorSheet.tsx` importa `@laudousg/shared`; o arquivo `preEclampsia.ts` (placar) não existe mais em `apps/mobile/src/shared/calculators/` | commit `8b7576e` (22/08) na `origin/main` |
| iOS | `Services/PreEclampsiaCalculator.swift` é o port Swift (corte 1:100, a priori Wright) | commit `2cdccd4` (02/09) na `origin/main` do repo `LaudoUSG-app`, build 185; `PreEclampsiaFmfGoldenTests.swift` 342/342 |
| Sobra do placar | só no repo `~/laudousg-swift/LaudoUSG-watch` (parado desde 06/06) | não é distribuído |

"Shadow mode" pressupõe dois motores rodando lado a lado. O antigo não existe
mais; não há o que sombrear. **Remover também já aconteceu.** O que resta para
decidir é o que fazer com o que o motor novo ainda não cobre.

## Decisões que ainda são do Luiz

| # | item | evidência | esforço | risco | dependência |
|---|---|---|---|---|---|
| 1 | **Confirmar que as lojas distribuem o motor novo.** iOS build 185 e Android: qual build está na App Store e no teste interno da Play? O cálculo roda no cliente, então usuário com app antigo segue usando o placar. | `apps/mobile/android/app/build.gradle` mostra `versionCode 1` (versão vem do EAS); memória diz que a Play tem v11 de julho, anterior ao motor | 10 min, Cabo (COFRE) confere as lojas | ALTO enquanto houver build antigo instalado: recomenda AAS a paciente errada | nenhuma |
| 2 | **Aceitar o desvio residual** de até 3 unidades em "1 em N", concentrado em hipertensas (pior ponto: FMF 1 em 38 × nosso 1 em 35). | `packages/fmf/README.md`, "O que falta": MoMs batem dentro do arredondamento da tela; qualquer ajuste extra seria ajuste ao display | zero | baixo: 3 unidades não cruzam o corte 1:100 em nenhum dos 8 pontos | nenhuma |
| 3 | **Pedir os parâmetros atuais à FMF** por e-mail (`softwaresupport@fetalmedicine.org`). O apêndice de 2020 diz que os estimadores vigentes estão em fetalmedicine.com, e a página não foi achada. | README, "O que falta"; EULA proíbe validar por script, e-mail é o caminho limpo | 15 min do Luiz (médico licenciado) | nenhum | nenhuma |
| 4 | **Ratificar a salvaguarda da HAS desligada.** O software oficial não aplica `min(µ com HAS, µ sem HAS)` embora o paper de 2015 mande; escolhemos paridade com o software. | medido 22/08: mesma mulher, com HAS 1 em 50, sem HAS 1 em 17 | zero | médio: em obesa hipertensa o número pode sair implausível, mas é o que a FMF imprime | nenhuma |
| 5 | **Ampliar a paridade manual** em pontos não medidos: IP uterino em outras IG e pesos (só 1 ponto medido), outras etnias e paridades. | README, "Não validado" | 30 min do Luiz lendo ~10 casos de `packages/fmf/validacao/casos2.mjs` no app oficial | baixo | nenhuma |
| 6 | **Trissomias (T21/T18/T13):** núcleo já existe em `packages/shared` (commit `ede93c6`, 30/08) e a tela web está atrás de `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION`. Falta a validação externa do risco combinado (só o componente de TN foi conferido contra o exemplo publicado). | `docs/stories/2026-08-30-sprint-5-fmf-e-trissomias.md`, checklist com 2 itens abertos | leituras manuais do Luiz no app oficial (mesmo protocolo da PE, ~8 a 10 pontos) | ALTO se ligar sem isso: risco de aneuploidia próximo ao corte | item 6 destrava porte iOS/Android e a flag |
| 7 | **Limpar o placar do repo `LaudoUSG-watch`** ou arquivar o repo. | `LaudoUSG-watch/.../PreEclampsiaCalculator.swift` ainda é o placar | 5 min | nenhum (não distribuído) | nenhuma |

## Recomendação

1. **Hoje:** item 1. É a única ação com risco clínico real e não depende de
   ninguém além do Cabo olhar as lojas. Se a Play ainda estiver na v11, o
   build Android novo sobe na fila antes de qualquer outra coisa da FAROL.
2. **Sem custo:** itens 2 e 4 ficam ratificados como estão (já documentados no
   README para ninguém "consertar"). Item 3 é um e-mail; vale mandar.
3. **Quando o Luiz tiver 30 min no app oficial:** item 5 (PE) e depois item 6
   (trissomias). A ordem é essa porque PE já está em produção e trissomias
   ainda não; a leitura de trissomias é o que destrava a Sprint 5 inteira.
4. Item 7 vira tarefa P3 de limpeza, sem pressa.

Rotulagem continua "Baseado no modelo de riscos competitivos da FMF (Wright
2020)", nunca "certificado" ou "endossado" — o iOS hoje mostra o rótulo
"Risco competitivo FMF", coerente com a regra.

## Fontes

- `packages/fmf/README.md` e `packages/fmf/validacao/`
- `docs/stories/2026-08-30-sprint-5-fmf-e-trissomias.md`
- memória do Orquestrador `calculadoras-fmf-pe-trissomias.md`
- `git log` de `origin/main` (22/08 a 02/09) e do repo `LaudoUSG-app`
