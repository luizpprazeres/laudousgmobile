# Crítica visual da landing — rodada 2 (revisão de 28/09/2026, executada em 29/09)

Revisão **somente leitura** da prévia `http://localhost:3001/?preview=acabamento-final`. Nenhum código foi alterado, nada foi commitado e a prévia não foi reiniciada.

Este arquivo complementa o parecer da rodada anterior, `2026-09-28-landing-critique.md`, que foi preservado. Aqui só entra o que foi **reproduzido no estado atual**.

**Método.** Foram duas avaliações independentes:
- **Design:** leitura de `apps/web/src/app/page.tsx`, `components/landing/v2/*` e `components/landing/Pricing.tsx`, com rolagem real e captura em cada passo:
  - desktop 1440×900: 35 capturas;
  - tela ampla 2560×1440: 31 capturas;
  - mobile 390×844: 40 capturas.
- **Detector automático:** impeccable 4.1.0, via CLI e injetado no navegador em 1440 e 390 px.

Não houve erros de console nem rolagem horizontal nos três tamanhos. Os achados principais foram conferidos no código e nas imagens antes de entrar aqui.

**Contexto usado (confirmado pelo Luiz nesta rodada):**
- **Público:** ultrassonografista solo.
- **Tom:** tecnológico e impressionante, com profundidade, luz e sombra no estilo Linear.
- **Intenções já aprovadas, preservadas nesta análise:** zooms amplos, câmera estável na leitura, conteúdo clínico autêntico, Sala associada ao mobile, categorias em cinza, fade à direita.

> As capturas citadas (`desktop-NNN`, `wide-NNN`, `mobile-NNN`) estão no scratchpad temporário da sessão de revisão e não foram salvas no repo. Para reproduzir, basta rolar a prévia até a posição indicada.

---

## Nota de saúde (Nielsen)

| # | Heurística | Nota | Achado-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 3 | A demo do hero mostra o estado; o índice das calculadoras fica uma etapa atrás da carta visível |
| 2 | Correspondência com o mundo real | 4 | Vocabulário clínico correto, laudo com formato real, fontes citadas (FMF, Wright, Barcelona) |
| 3 | Controle e liberdade | 2 | A trilha de scrub do mobile é longa, sem indicador de progresso nem atalho |
| 4 | Consistência e padrões | 2 | Três pretos diferentes, Planos em outro sistema e outro grid, "A sala acompanha." duas vezes |
| 5 | Prevenção de erros | 3 | "Copiado (simulação)" é honesto; os badges "Disponível em breve" parecem botões de loja |
| 6 | Reconhecer em vez de lembrar | 3 | O índice das calculadoras ajuda; a seção do iPhone perde o título no celular |
| 7 | Flexibilidade e eficiência | 2 | Quem já se convenceu atravessa ~6.400 px de scrub (desktop) sem atalho para os planos |
| 8 | Estética e minimalismo | 3 | Seções bem compostas; o trecho depois do pico é redundante |
| 9 | Recuperação de erros | 2 | Existe o fallback "Vídeo indisponível"; pouca coisa mais se aplica |
| 10 | Ajuda e documentação | 3 | O FAQ cobre as dúvidas certas |
| **Total** | | **27/40** | **Bom, com problemas concentrados em duas seções** |

## Parece feito por IA?

**Na maior parte, não.** O hero com laudo em serif se preenchendo, a pilha de cartas das calculadoras em sálvia e grafite e o baralho de esquemas com luz lateral mostram conteúdo clínico real e têm autoria.

**Dois trechos seriam atribuídos a IA na hora:**
1. **Planos** (`components/landing/Pricing.tsx`):
   - fundo navy `#020617`, diferente dos grafites `#0B0F14` e `#111614` do resto da página;
   - grade de linhas no fundo, glow esmeralda sob o card "Recomendado" e pill brilhante;
   - container começando em x=220, enquanto a página inteira começa em x=48 (`desktop-028`).
   - É o template de pricing SaaS mais reconhecível que existe.
2. **Seção do ambiente** (`WorkplaceScene.tsx`): foto gerada por IA com o monitor e o celular **com a tela vazia**, e card com ícone em quadrado arredondado acima de cada item. Ela vem logo depois do iMac em CSS mostrando a Sala real (`desktop-026` e `027`).

**Tiques menores:**
- a última palavra do título em verde em quase todas as seções virou fórmula;
- quatro eyebrows em caixa-alta acima de títulos;
- quatro halos radiais esmeralda;
- Inter no corpo, com Barlow só nos títulos.

**O que o detector confirmou e o que foi descartado:**
- **Confirmado:** o glow e os halos repetidos, os eyebrows e a Inter.
- **Falsos positivos descartados:**
  - "paleta ciano": é o esmeralda da marca;
  - "texto em gradiente": não existe no DOM;
  - "cards aninhados": é a UI real do editor dentro do hero;
  - "brilho escuro" nos aparelhos: é o reflexo da tela;
  - "border-left": é o `blockquote` do trecho do laudo;
  - os 5 alertas de "cinza sobre cor": o texto é `slate-950`, quase preto.

## Impressão geral

A página tem a coisa mais difícil de fabricar: **prova clínica autêntica**. O hero e o pico da trilha mobile ("O laudo pronto para revisar", com o laudo completo no iPhone) são o produto se vendendo sozinho.

O problema é o que vem **depois** do pico:
- recorte visível na câmera do iPhone;
- copy que pula de lugar na etapa Sala;
- título repetido;
- foto de IA com tela vazia;
- planos num sistema visual de template.

A página sobe muito bem e termina num vale. **A maior oportunidade é fazer o fim estar à altura do começo.**

## O que funciona

1. **Demo do hero** (`hero/HeroDemo.tsx`). Chips por órgão, frase alterada destacada, digitação e laudo com ACHADOS/CONCLUSÃO em serif. Mostra o produto em vez de descrevê-lo, e os rótulos "Demonstração" e "Copiado (simulação)" são honestos.
2. **Pilha das calculadoras** (`CalculatorStory.tsx`). Quatro tons de creme a grafite, cartas de trás desfocadas, números tabulares e fonte citada em cada carta. É a profundidade estilo Linear feita com identidade própria.
3. **Baralho de esquemas** (`SchemeDeck.tsx`). Entrada com corte diagonal e luz vinda de fora da tela: é a transição mais elegante da página (`desktop-010` e `011`).

---

## Problemas prioritários

### [P0] O zoom do iPhone é recortado por uma caixa retangular visível
- **O quê:**
  - Nas etapas Exame, Ditar, Achados e Laudo, o telefone ampliado é cortado por `.scene { overflow: clip; }` (`mobile-story.module.css:499`).
  - Aparece uma laje escura de bordas retas, e a primeira linha da transcrição sai cortada no topo (`desktop-016`, `018`, `019`).
  - No 2560×1440 o retângulo flutua no meio da tela, com a cena limitada a 850 px numa viewport de ~1.370 px. Parece bug (`wide-017`).
- **Por que importa:** é a seção mais longa e cara da página, e o artefato aparece exatamente onde deveria impressionar. O zoom amplo foi aprovado; o recorte não faz parte dele.
- **Correção:** tirar o clip da `.scene` e escolher uma das opções:
  - **(a)** clipar no `.stage` inteiro, que já tem a altura da viewport, com `mask-image: linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)` para as bordas sumirem no grafite;
  - **(b)** limitar o zoom para a moldura nunca tocar a borda da cena.
- **Critério de pronto:** nenhuma aresta reta visível e primeira linha útil sempre inteira, em 1440 e 2560.
- **Comando sugerido:** `/layout` e depois `/polish`.

### [P1] A copy pula de lugar ao entrar na etapa Sala
- **O quê:**
  - `.section[data-stage="sala"] .stage` troca o grid para `0.65fr / 1.35fr`, e `.lead` encolhe para `clamp(1.8rem, 3vw, 2.7rem)` (`mobile-story.module.css:489-491`).
  - "Também no iPhone" desloca ~14 px na horizontal, e o título encolhe de ~3,1rem para 2,7rem (`desktop-023` → `024`).
- **Por que importa:** contradiz a intenção aprovada de câmera estável durante a leitura, justamente no clímax.
- **Correção:**
  - antes: grid e tamanho do título mudam por etapa;
  - depois: coluna da copy com largura fixa em todas as etapas, só a cena cresce (o monitor sangra para a direita em `position:absolute`) e a regra de `font-size` da linha 491 sai.
- **Comando sugerido:** `/layout`.

### [P1] O trecho depois do pico repete a mensagem e usa uma imagem mais fraca
- **O quê:**
  - A última etapa do mobile diz "A sala acompanha." (`MobileStory.tsx:86`), e a seção seguinte abre com o mesmo título (`WorkplaceScene.tsx:41`).
  - Essa seção usa foto gerada por IA com as telas apagadas logo depois da Sala real.
  - A mensagem da Sala aparece três vezes: ribbon, etapa do mobile e esta seção.
- **Por que importa:** o público é o ultrassonografista **solo**, e a página dedica o clímax e mais uma seção inteira a um recurso de equipe. O caminho do solo, "Trabalha sozinho? Use no navegador", é uma nota pequena.
- **Correção (escolher uma):**
  - **(a)** trocar a WorkplaceScene por uma faixa curta, sem foto, voltada ao solo, com o CTA "Criar conta grátis";
  - **(b)** manter a seção com outra ideia no título (ex.: "Sozinho ou com equipe, o laudo é o mesmo.") e trocar a foto por um recorte da Sala real ou por um fundo neutro.
- **Comando sugerido:** `/distill` e depois `/clarify`.

### [P1] A oferta está em outro sistema visual e com contraste insuficiente
- **O quê:**
  - Planos em navy, com grade, glow e container mais estreito (`Pricing.tsx:41`).
  - O botão "Assinar agora" (`:104`) e o badge "Recomendado" (`:83`) usam **branco sobre `emerald-500`, 2,5:1**, abaixo do mínimo AA. A nav e a Cta já usam o padrão certo, `slate-950` sobre `emerald-500`.
  - Os textos `slate-500` sobre navy ficam em ~4,2:1.
  - Os itens dos planos e os rótulos têm 9–11 px.
- **Por que importa:** é o momento de decisão de compra, e é onde a página parece template e fica mais difícil de ler.
- **Correção:**
  - antes: navy + grade + glow + branco sobre verde;
  - depois: grafite `#111614` e o mesmo grid (`max-w-[1440px] px-12`) do resto, sem grade, borda de 1 px esmeralda e sombra neutra no card recomendado, e texto `slate-950` no botão e no badge;
  - itens dos planos em pelo menos 13 px e secundários em `slate-400`.
- **Comando sugerido:** `/colorize` e depois `/typeset`.

### [P2] O CTA principal do desktop é só um ícone
- **O quê:** no desktop, o rótulo "Criar conta grátis" fica em `max-width: 0` e só aparece no hover (`SignupPill.module.css`). Ao lado de "Entrar", o círculo com ícone de pessoa parece avatar ou login, não cadastro (`desktop-000`).
- **Correção:**
  - antes: ícone sem texto;
  - depois: rótulo sempre visível a partir de `lg`, com a expansão no hover restrita a telas médias ou removida.
  - Isso também elimina a animação de `padding` e `max-width` que o detector apontou.
- **Comando sugerido:** `/clarify`.

---

## Defeitos objetivos e preferências estéticas

### Defeitos objetivos (reproduzidos)
1. **Recorte retangular no zoom do iPhone.** `mobile-story.module.css:499` · `desktop-016..019`, `wide-017`.
2. **Salto de posição e de tamanho da copy na etapa Sala.** `mobile-story.module.css:489-491` · `desktop-023/024`.
3. **Índice das calculadoras uma etapa atrás da carta dominante.** `CalculatorStory.tsx:87` usa `Math.floor(v + .1)`; `Math.round(v)` resolve · `desktop-007`.
4. **Contraste 2,5:1 no "Assinar agora" e no "Recomendado".** `Pricing.tsx:83,104`.
5. **Título duplicado "A sala acompanha."** `MobileStory.tsx:86`, `WorkplaceScene.tsx:41`.
6. **Container dos Planos desalinhado do grid (x=220 contra x=48).** `Pricing.tsx` · `desktop-028`.
7. **Legenda do "Mapa venoso" cortada no meio da palavra, atrás da carta ativa.** `SchemeDeck.tsx:33-37`; abrir para ±100% ou reduzir a largura do card · `desktop-011`.
8. **Mobile, Especialidades: o primeiro tile das faixas roláveis encosta em x=0, desalinhado dos títulos em x=20.** `Specialties.tsx:98-100`; `scroll-px-5` na `<ul>` · `mobile-003`.
9. **Rodapé com "Preços" e "Planos e preços" lado a lado.** `LandingFooter.tsx:19-20`.
10. **Texto informativo abaixo de 11 px:**
    - slogan do logo em 9 px (`LaudoUSGLogo.tsx:57`);
    - na CalculatorStory, status de disponibilidade e referências científicas em 10 px;
    - "Disponível em breve" em ~10 px no mobile.
11. **Linhas do FAQ com ~86 caracteres.** `landing-faq.module.css:99` usa `max-width: 44rem`; 38rem dá ~72.

### Preferências estéticas (discutíveis)
- Acento verde na última palavra de quase todo título: reservar para 2 ou 3 momentos.
- Inter no corpo funciona, mas é genérica para o tom "tecnológico e impressionante"; uma grotesca com mais caráter subiria o tom.
- O rótulo "iMac" no queixo do monitor (`MobileStory.tsx:186`) copia a Apple literalmente; um queixo liso mantém a leitura sem o risco de marca.
- O ribbon de slogans é o elemento mais genérico; uma faixa com os nomes reais dos exames seria mais específica.
- No 2560, sobram ~300 px de branco acima do hero, e o mockup sangra enquanto a copy fica no container de 1440 (`wide-000`).
- A emenda entre os esquemas (`#0B0F14`) e o mobile (`#111614`) é uma borda dura entre dois grafites quase iguais (`desktop-012`); unificar ou fazer um degradê curto.
- No card de trissomia, "T18 < 1 em 10.000" e "T13 < 1 em 10.000" aparecem ao lado de "trissomias 13/18 — 1 em 9.700" no trecho do laudo. É coerente (risco combinado), mas um médico lendo rápido vê uma contradição; rotular "combinado" resolve (`desktop-007`).

---

## As três intervenções de maior impacto

1. **Consertar a câmera do mobile.** Tirar o recorte retangular do zoom e fixar a coluna da copy em todas as etapas. É a seção mais longa, a mais cara e a que mais deveria impressionar.
2. **Fazer o fim à altura do começo.** Substituir a WorkplaceScene repetida e com foto de IA por uma faixa curta para o médico solo, e trazer os Planos para o grafite, o grid e o contraste do resto da página. Assim "pico → vale → template" vira "pico → oferta coerente".
3. **Deixar a ação principal sempre legível.** CTA com texto na nav do desktop e um "Ver planos" dentro do próprio stage da Sala, para quem se convenceu no pico não descer mais ~1.500 px.

## Personas

- **Ultrassonografista solo, primeiro contato:**
  - Entende o produto no hero.
  - No desktop, não reconhece o círculo verde com ícone como "criar conta".
  - No meio da trilha do iPhone, vê o recorte retangular e desconfia do acabamento.
  - Depois do pico, lê duas vezes que "a sala acompanha", um recurso de equipe que ele não usa.
- **Médico decidido, que já conhece a proposta:**
  - Quer ir direto aos planos.
  - Fora da nav, precisa atravessar ~6.400 px de scrub no desktop (~10.500 px no 2560) sem indicador de progresso.
  - Chega a um bloco com contraste de 2,5:1 no botão de assinar.
- **Leitor no celular:**
  - A seção do iPhone entra sem título.
  - Os badges de loja ocupam o topo durante toda a trilha.
  - A Sala no iMac fica pequena e ilegível (`mobile-015`, `019`, `025`).

## Perguntas para considerar

- Se o comprador é o médico solo, a Sala deveria ser o clímax ou um capítulo?
- O hero mostra a Web com cards e o mobile mostra ditado. O visitante sai sabendo qual é o fluxo principal, ou acha que são dois produtos?
- A página tem prova clínica excelente e nenhuma prova social. Um único depoimento real ou número verificável mudaria mais a confiança que qualquer efeito de luz?

## Ações recomendadas (sugestão, não implementadas)

1. `/layout`: tirar o recorte do zoom do iPhone e fixar a coluna da copy na etapa Sala.
2. `/distill`: reduzir o pós-pico (WorkplaceScene) a uma faixa curta para o médico solo, sem título repetido e sem foto de IA.
3. `/colorize`: trazer os Planos para o grafite e o grid da página e corrigir os contrastes de 2,5:1 e 4,2:1.
4. `/clarify`: CTA com texto na nav do desktop, "combinado" no card de trissomia e remoção dos links duplicados do rodapé.
5. `/typeset`: piso de 11–12 px para texto informativo (status, referências, planos) e medida do FAQ em ~38rem.
6. `/polish`: índice das calculadoras (`Math.round`), legenda do mapa venoso, `scroll-padding` das Especialidades e emenda entre os grafites.

---

## Implementação (29/09, aprovada pelo Luiz; sem commit, sem push)

**Como foi validado.** A prévia `:3001` é um build de produção (`pnpm --filter @laudousg/web start`) e não foi reiniciada nem rebuildada, então **ainda mostra a versão antiga**. As mudanças foram validadas numa cópia isolada do app (scratchpad, `next dev` na porta 3055, já encerrado), sem tocar no `.next` da prévia.

**Arquivos alterados (14, só a landing).** `components/landing/Pricing.tsx`, e em `components/landing/v2/`: `WorkplaceScene.tsx`, `MobileStory.tsx`, `mobile-story.module.css`, `CalculatorStory.tsx`, `calculator-story.module.css`, `clinical-demo-fixtures.ts`, `SchemeDeck.tsx`, `Specialties.tsx`, `FinalCta.tsx`, `LandingFooter.tsx`, `SignupPill.module.css`, `StoreAvailability.tsx`, `landing-faq.module.css`.

| Item do parecer | O que mudou | Verificação |
|---|---|---|
| P0 zoom recortado | A cena vai até as bordas do stage (sob o header e no fim da viewport), com folga lateral e fade vertical curto. O zoom continua 1,5×, e no 2560 o telefone ampliado cabe inteiro, sem caixa | Escala medida (`matrix(1.5…)`) e capturas antes/depois em 1440 e 2560 |
| P1 copy pulando na Sala | Mesmas colunas, gap, padding e título em todas as etapas; só o monitor cresce para a direita (mais em ≥1800px, para manter a escala editorial) | Posição medida Laudo→Sala: 1440 x62/y280 fixo; 2560 x612/y550 fixo (antes ia a x48) |
| P1 pós-pico redundante | WorkplaceScene virou a faixa "Sozinho ou com equipe, o laudo é o mesmo." Saíram a foto de IA e o título repetido. O conteúdo é o mesmo texto de antes | Captura 1440/390 |
| P1 Planos | Mesmo grafite e grid da página, sem grade nem glow. Botão e selo em `slate-950` sobre esmeralda, secundários em `slate-400`, itens ≥13px, botões ≥44px. Preços, textos e links inalterados | Teste manual: CTAs ≥44px a 390 |
| P2 CTA da nav | "Criar conta grátis" sempre visível a partir de 1024px | Captura |
| Atalho pós-pico | "Ver planos →" na etapa Sala (só desktop, no espaço já reservado) | Captura |
| Trissomia | O card mostra T21 e **T13/18 combinada** (`result.t18t13`, os mesmos grupos do laudo e do app da FMF) | Card e trecho batem: 1 em 5.300 / 1 em 9.700 |
| Índice das calculadoras | `Math.round(v)` | Carta 03 à frente com índice 03 |
| Mapa venoso cortado | Cards `min(31%,300px)` e abertura ±106% | Legenda inteira visível |
| Especialidades no mobile | `scroll-px-5 sm:scroll-px-8` | Tiles em x=20 |
| Rodapé | Mantidos os dois destinos; rótulos "Planos" (#precos) e "Página de preços" (/precos) | — |
| Tipografia | Status, referências, legendas e "Disponível em breve" ≥11–12px; FAQ em 38rem | — |
| Acento verde | Mantido no hero, calculadoras e trilha; removido do fecho | — |
| Quieter | Sem halo no fecho; rótulo "iMac" removido do queixo | — |
| Emenda de grafites | Esquemas em `#111614`, igual ao mobile | Captura |

**Testes.**
- `tsc --noEmit` (apps/web): ok.
- ESLint nos arquivos tocados: ok.
- `apps/web/tests/landingScrollytelling.browser.manual.ts` contra a cópia: **todos PASS** (1920, 1440, 1024, 390, 320, reduce 390/320, rede lenta) em duas rodadas seguidas.
- Uma rodada intermediária falhou uma vez em "320: trecho do laudo vazio na aba 0" (demo do hero, arquivos não tocados) e passou nas duas seguintes. É instabilidade de tempo do teste no dev server, não regressão.

**Não feito, com motivo.**
- **Slogan de 9px do logo:** `components/LaudoUSGLogo.tsx` é compartilhado com o app; mexer nele muda o produto, não só a landing.
- **Trocar a Inter:** decisão de marca que atinge o site inteiro; fica para uma escolha explícita.
- **Ribbon com nomes de exames:** duplicaria a seção Especialidades logo abaixo, e o ribbon contínuo acabou de ser aprovado.
- **Asset sem uso:** `public/brand/landing-workspace-v3.webp` ficou sem referência; não foi apagado.

**Para ver na prévia oficial:** rebuild e reinício da `:3001` por quem é dono dela.

### Ajuste pedido pelo Luiz (30/09): Sala, entradas e iluminação

**Causas encontradas no código:**
1. **O monitor "pequeno que cresce e anda"** tinha escala 0,8→1 e deslocamento 24%→0 ligados à rolagem, e a opacidade era disparada por **tempo** (0,3 s) na troca de etapa. Era essa a "transição só de opacidade" abrupta.
2. **O mockup pequeno no centro:** a geometria final do monitor só valia com `data-stage="sala"`. Na troca de etapa o CSS voltava na hora para a posição base (pequena e centralizada) enquanto a opacidade ainda animava.
3. **A linha vertical da iluminação:** o `box-shadow` do telefone, ampliado pelo zoom, tem a cauda do desfoque truncada pelo navegador. Sobre a luz do stage isso vira um degrau vertical que acompanha o telefone. A versão anterior ainda somava o recorte horizontal da cena. Além disso, a luz trocava de uma vez ao entrar na Sala (`background: none`).

**Correções (`MobileStory.tsx`, `mobile-story.module.css`):**
- O monitor sempre na geometria final; entra da esquerda para a direita (−14% → 0), com opacidade 0→1 no mesmo trecho de rolagem em que o telefone recua. Tudo segue a rolagem nos dois sentidos, sem escala e sem salto por tempo. Com movimento reduzido, aparece direto na etapa Sala.
- Sombra e brilho do telefone como gradientes radiais numa camada própria (terminam em zero, sem cauda para truncar). As bordas internas da moldura continuam em `box-shadow` inset.
- A cena recorta só na vertical, e a máscara e a folga lateral da rodada anterior foram removidas.
- A luz virou duas camadas fixas no stage (verde nas etapas do celular, neutra na Sala), trocadas por crossfade de 900 ms.
- A faixa "Sozinho ou com equipe" não força mais a quebra de linha no celular.

**Verificação:**
- **Quadros da entrada da Sala a 1440, descendo e subindo:** largura do monitor constante (968 px), x de 544→679, opacidade subindo com a rolagem e sequência espelhada ao subir.
- **Recorte 10× de contraste entre o texto e o telefone, antes e depois (1440 e 2560):** a linha vertical dura sumiu; restam só anéis de gradiente, invisíveis em contraste normal.
- **Teste manual da landing:** todos PASS (1920, 1440, 1024, 390, 320, reduce, rede lenta).
- **Typecheck e lint:** ok.

### Ajuste pedido pelo Luiz (30/09, segunda rodada): rodapé, hero e efeito do mouse

- **Rodapé (`LandingFooter.tsx`):** assinatura grande "LaudoUSG" acima da barra final, nas cores e pesos do logotipo ("Laudo" black `#18533F`, "USG" 400 `#4a8a6a`), no mesmo espírito do rodapé do laudos.ai. Link para o Instagram, `https://www.instagram.com/laudousg/`, rotulado "@laudousg".
- **Hero (`HeroWorkspace.tsx`):** subtítulo agora "Marque os achados. O laudo aparece redigido no seu estilo, pronto para revisar e copiar."
- **Efeito do mouse (`hero/HeroMeshLight.tsx`):**
  - **Causa:** o canvas ocupava só um retângulo no meio do hero (26–66% × 4–62%), com máscara em elipse; perto do texto não havia canvas, e o efeito "batia" numa borda.
  - **Correção:** o canvas cobre o hero inteiro (com altura e largura explícitas; `inset-0` não estica `<canvas>`), e a malha só existe em volta da luz, sumindo em degradê até zero. O efeito segue o ponteiro sobre o título sem recorte, e o ponto de repouso foi mantido no mesmo lugar.
- **Verificação:**
  - capturas com o mouse sobre o título, entre título e mockup, e perto do mockup;
  - rodapé em 1440 e 390, sem overflow;
  - teste manual da landing todo PASS;
  - `run-unit.cjs`: 17 suítes ok, incluindo os 11 testes do hero;
  - typecheck e lint ok.
