# /critique: landing LaudoUSG, seção #mobile

**Data:** 26/09/2026. **Modo:** read-only; nenhum código, asset ou build alterado.
**Skill:** `/critique` existe no Claude Code e foi executada (avaliação de design + detector automático `npx impeccable --json`).
**Alvo:** `apps/web/src/components/landing/v2/MobileStory.tsx` e `mobile-story.module.css`, prévia `http://localhost:3001/#mobile` já sem nav de etapas e sem SVG de rota, percorrida só por scroll.
**Evidência:** capturas Playwright em 1440x900 e 390x844 (vídeo rodando e etapa Sala), em
`/private/tmp/claude-501/-Users-luizprazeres-laudousgmobile-def/a15ab797-f8ad-401c-ad95-1bb9afec1178/scratchpad/crit/` (`m-1440-film-a.png`, `m-1440-film-b.png`, `m-1440-sala.png`, `m-390-film-a.png`, `m-390-sala.png`).

## Medições (DOM, sem interação além de scroll)

| Viewport | Estado | Dado |
|---|---|---|
| 1440 | categoria (t=7,4 s) | vídeo `demonstracao-real.mp4` tocando (`readyState 4`); `phoneWrap` 597x1293 px dentro de uma cena de ~660 px: o aparelho é cortado em cima e embaixo por `overflow: clip` |
| 1440 | gravação (t=16,5 s) | quadro mostra a tela vazia do app só com "Gerar laudo" e o microfone; o texto ao lado já diz "A transcrição aparece na hora" |
| 1440 / 390 | qualquer | motion blur medido `blur(0.16px)`: presente, imperceptível; pausa/replay com 44x44 px e `aria-label`; sem overflow horizontal; sem `pageerror` |
| 1440 / 390 | sala | monitor `opacity 1`, `mask-image: linear-gradient(90deg, #000 35%, transparent 96%)`; o rótulo "Laudo no celular → Na Sala do Auxiliar" (`.transferLegend`) ainda está no DOM, solto acima do monitor |
| 390 | categoria | recorte horizontal corta a interface no meio da palavra ("lher categoria", "Fecha"); os controles de pausa cobrem a linha "Obstétrica" |
| 390 | sala | telefone quase todo fora da tela à esquerda; texto da Sala ilegível no tamanho renderizado; ~120 px vazios embaixo |

Detector automático: **0 achados** no componente. Nenhum padrão de "AI slop" (gradiente em texto, glow neon, grade de cards iguais) foi detectado; concordo.

## Design Health Score (escopo: seção #mobile)

| # | Heurística | Nota | Ponto-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Título da etapa acompanha o vídeo; sem nav, não há indicação de quantas etapas faltam |
| 2 | Linguagem do mundo real | 3 | "Dite com o gel na mão" é ótimo; o quadro da gravação não mostra o que o texto promete |
| 3 | Controle e liberdade | 3 | Pausa e replay presentes; sem os pills, não há como pular direto para a Sala |
| 4 | Consistência | 3 | Mesmo grafite e mesma luz do resto da landing; a Sala desbota para verde, não para o fundo |
| 5 | Prevenção de erro | 3 | Fallback para captura quando o vídeo falha, e movimento reduzido com capturas estáticas |
| 6 | Reconhecer em vez de lembrar | 3 | Etapas autoexplicativas |
| 7 | Flexibilidade e eficiência | 2 | Sem atalho para a Sala |
| 8 | Estética e minimalismo | 2 | Cortes duros no aparelho, recorte no meio de palavras no 390, rótulo órfão na Sala |
| 9 | Recuperação de erro | 3 | Rótulo muda para "Vídeo indisponível · captura real" |
| 10 | Ajuda | 3 | Rótulo de proveniência sempre visível |
| **Total** | | **28/40** | **Bom; o acabamento da cena é o que falta** |

## Veredito de anti-padrões

Não parece feito por IA. Vídeo real, capturas reais e uma única luz lateral esmeralda são escolhas próprias. O risco é outro: a câmera editorial está tão perto que em alguns quadros vira **tela preta recortada**. O detector não pega isso, porque é composição e não padrão de código.

## O que funciona

1. **Proveniência honesta e visível.** "Vídeo real · caso demonstrativo" muda para "captura real" no fallback e "movimento reduzido" no modo acessível. Isso sustenta a confiança exigida por um público médico.
2. **Categoria em 1440.** O quadro com "Mais usadas → Abdome Total" é o momento mais forte da seção: legível, real e alinhado com o texto "Escolha o exame".
3. **Fade da Sala para a direita (desktop).** A esquerda fica nítida (logo da Sala, resumo do turno, cabeçalho do laudo) e o documento se dissolve para a direita, lendo como "continua além da tela".

## Três melhorias concretas (prioridade)

### 1. [P1] A câmera corta o aparelho com bordas duras e mostra tela vazia
- **Evidência:** `m-1440-film-a.png` e `m-1440-film-b.png`. O `phoneWrap` escala até 2,35x e a cena corta em retângulo (linhas retas em y≈152 e y≈812). Na gravação (t=16,5 s), o quadro é ~70% preto, com "Gerar laudo" e o microfone no rodapé, enquanto o texto fala da transcrição.
- **Por que importa:** o corte retangular lê como bug de layout, não como zoom, e o quadro vazio contradiz a legenda no momento em que o visitante decide se entendeu o produto.
- **Correção:**
  - Suavizar as bordas da cena com máscara vertical (`mask-image: linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)` em `.scene`), em vez do `overflow: clip` seco.
  - Limitar o zoom máximo a ~1,8x, para a silhueta do aparelho continuar reconhecível.
  - Deslocar o início do capítulo "gravação" em `CHAPTERS` (hoje 12 s) para o instante em que o overlay "OUVINDO" com transcrição aparece no clipe. Alternativa: trocar a legenda do trecho inicial para "Toque no microfone".
- **Comando sugerido:** `/polish` (acabamento da câmera) + `/clarify` (sincronizar legenda e quadro).

### 2. [P1] No 390 px, o recorte horizontal quebra a interface e a Sala fica ilegível
- **Evidência:** `m-390-film-a.png` corta "Escolher categoria" e "Fechar" no meio, e os botões de pausa cobrem "Obstétrica". Em `m-390-sala.png`, o telefone fica quase todo fora da tela, o texto da Sala sai minúsculo e sobram ~120 px vazios.
- **Por que importa:** o mobile é justamente o público "onde você trabalha"; lá a demonstração parece quebrada.
- **Correção:**
  - No mobile, desligar o deslocamento X da câmera (`phoneX = 0` abaixo de 900 px) e zoom só vertical, sem cortar a largura da tela do app.
  - Mover os controles de pausa para fora da tela do aparelho (abaixo da cena).
  - Na Sala mobile, mostrar só o terço esquerdo da captura (sidebar + início do laudo) em `object-position: left top`, com o telefone pequeno no canto inferior esquerdo, **dentro** da cena, e usar a sobra vertical.
- **Comando sugerido:** `/adapt`.

### 3. [P2] A Sala desbota para verde e ainda tem um rótulo órfão
- **Evidência:** `m-1440-sala.png`. O documento branco atravessa a luz radial esmeralda (`.section` background a 88% 42%) e vira cinza-esverdeado antes de sumir. O `.transferLegend` ("Laudo no celular → Na Sala do Auxiliar") flutua ~130 px acima do monitor, sem ligação visual, agora que a rota SVG saiu. O telefone pequeno fica sobre a borda do documento, competindo com o texto.
- **Por que importa:** o fade estilo Linear funciona quando a superfície se dissolve no **fundo**, não numa cor; a mancha verde sobre papel branco suja o ponto mais "premium" da seção. O rótulo solto parece resto de versão anterior.
- **Correção:**
  - Na etapa Sala, apagar a luz radial da direita (`.section[data-stage="sala"]` sem o `radial-gradient` a 88%) ou movê-la para trás do telefone, à esquerda.
  - Terminar a máscara antes (`#000 45%, transparent 88%`) para o branco sumir no grafite puro.
  - Remover o `.transferLegend` junto com a rota, ou ancorá-lo como legenda logo abaixo do monitor.
  - Posicionar o telefone sobre a sidebar esquerda da Sala (área já resumida), não sobre o texto do laudo.
- **Comando sugerido:** `/quieter` + `/polish`.

## Personas

- **Médico ultrassonografista no celular, entre exames (390 px):** vê o topo da seção ocupado por texto e badges; a demonstração começa cortada no meio da palavra e com o botão de pausa por cima. Risco de achar que "está quebrado" e rolar direto.
- **Dono de clínica avaliando no desktop:** o quadro de categoria convence; o quadro vazio da gravação e a Sala esverdeada enfraquecem a impressão de produto maduro, justo no argumento "a equipe acompanha", que é o dele.
- **Visitante com movimento reduzido:** bem atendido: capturas estáticas, rótulo correto, sem hidratação quebrada.

## Observações menores

- Motion blur de 0,16 px é imperceptível. Se a intenção é "blur leve", o limiar visível começa perto de 0,6 a 0,8 px nas transições de câmera; hoje não agrega nem atrapalha.
- Sem a nav de etapas, não há indicação de quantas etapas faltam. Uma barra fina de progresso do vídeo sob a cena (sem rótulos) devolveria a noção de duração sem reintroduzir botões.
- `aria-label` no `<video>` é bom; como ele não tem trilha de legendas, o texto lateral (`aria-live="polite"`) é o equivalente acessível. Está coerente.

## Perguntas para decidir

1. O zoom da câmera deve mostrar o **aparelho** (contexto) ou a **tela** (detalhe)? Hoje alterna, e os cortes nascem dessa indecisão.
2. A Sala precisa ser legível no celular, ou basta ser reconhecível (sidebar + laudo) com a promessa no texto?
3. O capítulo da gravação pode começar mais tarde no clipe, para o quadro e a legenda contarem a mesma coisa?

## Ações recomendadas (sem executar)

1. `/polish`: bordas suaves na cena, zoom máximo ~1,8x, remover `.transferLegend`, máscara da Sala terminando no grafite.
2. `/clarify`: sincronizar `CHAPTERS` da gravação com o overlay de transcrição, ou ajustar a legenda.
3. `/adapt`: câmera sem deslocamento horizontal no mobile, controles fora da tela, Sala mobile recortada na esquerda com o telefone dentro da cena.
4. `/quieter`: desligar a luz esmeralda da direita na etapa Sala.
