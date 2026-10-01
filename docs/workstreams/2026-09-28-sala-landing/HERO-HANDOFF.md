# Hero da landing: handoff (onda 4, Claude Code) 28/09/2026

Escopo cumprido: somente `HeroWorkspace.tsx` e módulos novos em `apps/web/src/components/landing/v2/hero/`. Não toquei em `page.tsx`, outros componentes, `tests/` ou `run-unit.cjs`. Sem build, sem reiniciar a 3001, sem commit.

## Arquivos

| Arquivo | Linhas | Papel |
|---|---|---|
| `landing/v2/HeroWorkspace.tsx` | 67 | Casca: headline, CTA e brilho inalterados; monta `HeroMeshLight` e `HeroDemo` |
| `hero/heroCases.ts` | 313 | 4 casos sintéticos com frases dos snippets reais, validação de medida (`checkMeasure`), composição do laudo parcial e texto do Copiar |
| `hero/heroAutoplay.ts` | 232 | Núcleo puro: reducer, roteiro por caso (`caseTimeline`), controlador com um timeout por vez (start/pause/resume/stop), `showcaseState` para movimento reduzido |
| `hero/useHeroDemo.ts` | 92 | Liga o núcleo ao navegador: IntersectionObserver + visibilitychange, interrupção por captura (pointerdown/keydown/focus), `copy()` como única escrita na área de transferência |
| `hero/HeroDemo.tsx` | 240 | Mockup: abas de exame, estruturas, prévia do laudo, estados Pronto/Copiado |
| `hero/HeroFieldControl.tsx` | 92 | Opções em chips e campo numérico real (label acima, ajuda/erro abaixo, `aria-invalid`) |
| `hero/HeroMeshLight.tsx` | 144 | Canvas de malha de pontos com luz verde que segue o ponteiro |
| `hero/heroDemo.test.mts` | 232 | 11 testes focados |

## Comportamento

- **Casos (em ordem):** Abdome total (`ABDOMEN_TOTAL`), Abdome superior (`ABDOMEN_SUPERIOR`), Pelve TV (`PELVE_FEMININA`), Tireoide (`TIREOIDE`). Duração 5,0 a 5,5 s cada (teste garante 5 a 6 s), em loop.
- **Roteiro por caso:** escolhe as opções, digita a medida caractere a caractere no campo real (ex.: Litíase, depois "1,2" no campo "Maior eixo"), redige a frase, "Pronto para revisar" e "Copiado (simulação)". Nenhum rótulo de botão contém medida.
- **Medidas:** aceitam vírgula ou ponto, até 2 casas. Vazio ou "1," = aguardando (sem frase no laudo, linha âmbar "aguardando maior eixo"). Letras ou dois separadores = inválido. Fora da faixa = erro com a faixa. "0" a caminho de "0,9" não conta como erro. Faixas clínicas onde a frase depende disso: colédoco "alargado" só acima de 0,6 cm; endométrio "normal para o ciclo" até 1,6 cm.
- **"Pronto" nunca aparece com medida pendente** (o reducer recusa).
- **Interação humana:** qualquer pointerdown, tecla ou foco dentro da demo para a autoplay de vez, antes do evento chegar ao controle. Valores ficam, inclusive digitação parcial. Trocar de aba manualmente não reinicia o caso. "Copiado (simulação)" vira "pronto" ao assumir.
- **Área de transferência:** só `copy()` em `useHeroDemo.ts`, chamada por clique. O texto começa com "EXEMPLO ILUSTRATIVO PARCIAL. DADOS SINTÉTICOS, NÃO É LAUDO DE PACIENTE." O núcleo da autoplay não tem acesso (checado em teste por leitura do código).
- **Movimento reduzido:** sem timers. Primeiro caso já preenchido, modo manual. A malha desenha um único quadro estático.
- **Pausa:** a autoplay pausa fora da tela (IO 20%) e com aba oculta. O laço de quadros da malha só roda enquanto a luz se move, com a seção visível e a aba ativa.
- **Malha:** só em `lg+`, `pointer-events-none`, máscara radial entre a headline e o canto superior esquerdo do mockup. Pontos cinza a 10% que ficam verdes perto do ponteiro. Sem linhas entre pontos. Toque é ignorado.

## Checks executados

- `pnpm exec tsx apps/web/src/components/landing/v2/hero/heroDemo.test.mts` (com `TSX_TSCONFIG_PATH=apps/api/tsconfig.json`): **11/11** (ordem do ciclo e loop, duração, digitação no input, nenhuma frase inválida e nenhum erro piscando em 20 s de autoplay, validação, parada manual sem perder inputs, simulação convertida, reduzido, limpeza de timers, pronto bloqueado, clipboard).
- `tsc --noEmit -p apps/web`: 0 erros no projeto.
- `next lint` nos arquivos do hero: limpo.
- Navegador (prévia isolada esbuild + Tailwind na porta 3917, no scratchpad, já encerrada; a 3001 é `next start` de build antigo e não reflete o código): 1440, 1024, 390 e 320 sem overflow horizontal e sem erro de JS. Ciclo abdome total → superior → pelve → tireoide. Área de transferência continuou vazia após 3 "copiado (simulação)" e só foi gravada no clique. 9 s fora da tela sem avançar caso. Clique no meio de "1" + digitar "5" deu "15", que permaneceu 7 s depois em modo manual.

## Pendências para o root

1. **`tests/landingScrollytelling.browser.manual.ts` (`checkWebDemo`)** precisa de ajuste, que não fiz por ownership:
   - mobile: o grupo "Escolher órgão de exemplo" tem **3** botões por caso (eram 4). Os ids mudam por caso (`vesicula`, `coledoco`, `baco`...). Os `p` do painel `[data-hero-organ]` mudaram de ordem (o controle de medida fica entre o título e "No laudo").
   - o teste clica e espera texto diferente. Com a autoplay ativa, o texto muda sozinho: clicar primeiro já para a autoplay, mas convém esperar `[data-hero-mode="manual"]`.
   - atributos novos para QA: `data-hero-mode` (auto | manual) e `data-hero-case`.
2. Opcional: incluir `src/components/landing/v2/hero/heroDemo.test.mts` em `apps/web/tests/run-unit.cjs`.
3. Build e reinício da 3001 para ver na prévia oficial.

## Limites e decisões

- As frases são recortes literais dos snippets. As medidas dos órgãos normais (útero 7,2 x 3,8 x 4,6 cm = 65,8 cm³; tireoide 5,6 + 4,7 + istmo 0,3 = 10,6 ml) são sintéticas e consistentes entre si. Nota Domingos e TI-RADS aparecem como escolha do médico ("Nódulo, nota 3"). Nada é calculado.
- A frase do nódulo tireoidiano segue a regra de descritores (`nodulos-com-classificacao.md`). Não é frase verbatim porque o modelo não tem uma.
- Casos com estrutura de opção única (Baço, Lobo esquerdo, Endométrio) mostram a estrutura, não uma escolha.
- A prévia é declaradamente parcial ("Prévia parcial. Caso demonstrativo com dados sintéticos."). O selo "Demonstração" foi mantido.
- Ícones seguem em `lucide-react` (dependência já usada na landing).
