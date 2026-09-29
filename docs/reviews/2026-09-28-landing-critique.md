# /critique: landing LaudoUSG (revisão read-only, 28/09/2026)

**Pedido:** Luiz, via root. Avaliar impacto, profissionalismo e elegância da landing atual. Somente parecer; nenhum código alterado, sem build, sem commit.
**Alvo:** `http://localhost:3001/?preview=acabamento-final`. O código lido está no working tree de `feat/landing-scrollytelling` (`apps/web/src/app/page.tsx`, `apps/web/src/components/landing/v2/*`, `apps/web/src/components/landing/Pricing.tsx`).
**Método:** skill `/critique`:
- (A) revisão de design com rolagem real no Playwright: 1440x900, 1920x1080 e 390x844 (móvel, toque), uma captura a cada 85% da viewport;
- (B) detector determinístico `npx impeccable --json` nos componentes da landing.

**Evidência:** 49 capturas em `/private/tmp/claude-501/-Users-luizprazeres-laudousgmobile-def/a15ab797-f8ad-401c-ad95-1bb9afec1178/scratchpad/crit28/`, com nomes `{viewport}-{nº}-y{scroll}-{nav}.png`. Os nomes aparecem abaixo como `d1440-05` etc.

**Intenção aprovada, preservada nas recomendações:** zooms amplos entre etapas, câmera estável na leitura, conteúdo clínico autêntico, Sala associada ao mobile, categorias em cinza, fade à direita, profundidade estilo Linear sem copiar identidade.

---

## Medições objetivas

| Medida | 1440 | 1920 | 390 |
|---|---|---|---|
| Altura total da página | 11.595 px | 13.143 px | 12.631 px |
| Seção `#mobile` | **6.418 px (55%)** | **7.786 px (59%)** | 5.836 px (46%) |
| Overflow horizontal | 0 | 0 | 0 |
| Erros de página/console | 0 | 0 | 0 |
| H1 do hero | 3 linhas | 3 linhas | 3 linhas |
| CTA do hero visível sem rolar | sim (y=654) | sim (y=744) | sim (y=453) |

**Detector (7 achados):**
- 5 × `gray-on-color`: `Cta.tsx:14-15`, `LandingNav.tsx:61`, `HeroWorkspace.tsx:239`, `page.tsx:25`. **Falsos positivos de legibilidade:** é `slate-950`/`slate-900` sobre esmeralda, com contraste alto. Não precisa de ação.
- 2 × `layout-transition`: `SignupPill.module.css:3` e `:9`, que animam `padding` e `max-width`. É real: força recálculo de layout a cada quadro no hover da pílula do nav.

---

## Design Health Score

| # | Heurística | Nota | Ponto-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Demo do hero mostra "Redigindo…"; na sequência mobile não há noção de quanto falta |
| 2 | Linguagem do mundo real | 4 | Frases do modelo real, termos do laudo, "com o gel na mão" |
| 3 | Controle e liberdade | 2 | 6.418 px de trilha mobile sem forma de pular; o CTA de cadastro no nav desktop é só um ícone |
| 4 | Consistência | 2 | Três grades horizontais diferentes; título "A sala acompanha." repetido; o nav muda de rótulo entre desktop e mobile |
| 5 | Prevenção de erro | 3 | Demo marcada como demonstração; proveniência "captura real" |
| 6 | Reconhecer em vez de lembrar | 3 | Especialidades com ícones e nomes reais |
| 7 | Flexibilidade e eficiência | 2 | Quem já entendeu no 2º quadro rola mais cinco telas |
| 8 | Estética e minimalismo | 2 | Quadros com mais de 50% de tela vazia, emendas duras, glow neon nos planos, tarja preta na Tireoide |
| 9 | Recuperação de erro | 3 | Fallbacks de vídeo/captura existentes |
| 10 | Ajuda | 3 | Rótulos honestos ("Ambiente ilustrativo · imagem gerada por IA") |
| **Total** | | **27/40** | **Bom, com acabamento desigual** |

Carga cognitiva: **baixa** (1 de 8 itens falha: extensão da sequência mobile). Nenhum ponto de decisão tem mais de 4 opções.

---

## Veredito de anti-padrões

**Não parece gerado por IA.** O hero com demo real, os ícones clínicos cinza e as capturas reais do app são específicos do produto; ninguém confundiria com template. Há três vestígios de "landing padrão":
- **Glow esmeralda em volta do plano Essencial** (`Pricing.tsx`): é o "neon glow" clássico e destoa da luz lateral contida do resto.
- **Faixa rolando depois do hero** (`WorkflowRibbon`): cinco frases genéricas separadas por pontos, que repetem o hero e não mostram produto.
- **Cabeçalho da seção de planos** com rótulo em caixa alta, título em duas linhas centrado numa coluna estreita: é o padrão da landing antiga, visível pela diferença de grade.

---

## Impressão geral

O começo é o melhor momento da página. O hero é confiante: produto real à direita, frase forte, CTA claro. A categoria e o laudo no iPhone são autênticos. O que tira elegância é o **ritmo**: a sequência mobile ocupa mais da metade da rolagem e vários quadros são tela preta. Somam-se três ou quatro **costuras visíveis** (grade, cores de fundo, rótulo "iMac", tarja preta), que fazem a página parecer montada por partes. A maior oportunidade é **editar**, não acrescentar.

## O que funciona

1. **Hero com demo e texto clínico real.** Os achados mudam e o parágrafo do laudo reescreve com as frases do modelo real. É a prova de produto na primeira dobra, e o selo "Demonstração" mantém a honestidade. (`d1440-00`, `d1920-00`)
2. **Categoria no iPhone.** O zoom em "Mais usadas → Abdome Total" é legível, real e casa com o texto "Escolha o exame". É o quadro mais forte da sequência. (`d1440-06`)
3. **Especialidades em cinza, em cinco colunas.** Ocupa a largura toda sem inflar componentes; os ícones anatômicos cinza passam seriedade médica. (`d1440-01`)

---

## Defeitos objetivos (reproduzidos hoje)

| # | Defeito | Onde | Evidência |
|---|---|---|---|
| D1 | **Tarja preta vertical no card da Tireoide.** A transparência do PNG virou preto no JPEG do recorte | `public/landing/esquemas/esquema-tireoide.jpg` | `d1440-02`, `d1440-03` (Tireoide), `m390-03` |
| D2 | **Título duplicado "A sala acompanha."** na etapa Sala e no h2 da seção seguinte, em sequência | `MobileStory.tsx` (etapa `sala`) e `WorkplaceScene.tsx` (h2) | `d1440-11` → `d1440-12` |
| D3 | **CTA de cadastro no nav desktop é só um ícone de usuário**, que lê como "conta/login" ao lado de "Entrar"; o rótulo só aparece no hover. No mobile o mesmo botão mostra o rótulo | `LandingNav.tsx:59-68` + `SignupPill.module.css` | `d1440-00` (círculo escuro) × `m390-00` ("Criar conta grátis") |
| D4 | **Texto da etapa Sala na borda em 1920:** o bloco sai do contêiner (x=48) enquanto nav e demais seções alinham em x=288 | `mobile-story.module.css` (`[data-stage="sala"] .stage { max-width: none }`) | `d1920-10` |
| D5 | **O iPhone cobre a conclusão do laudo no iMac.** O mesmo laudo aparece duas vezes, em tamanhos ilegíveis, e o trecho mais importante (conclusão) fica escondido | cena Sala do `MobileStory` | `d1440-11`, `d1920-10`, `m390-11` |
| D6 | **Rótulo "iMac" no queixo do monitor em CSS.** Usa o nome do produto Apple como decoração; contraria "sem copiar identidade" | `MobileStory.tsx` / CSS do monitor | `d1440-11`, `d1920-10` |
| D7 | **Emenda de cor esquemas → mobile.** Dois grafites diferentes (`#0B0F14` e `#111614`) criam uma linha horizontal nítida | `SchemeDeck.tsx` × `mobile-story.module.css` | `d1440-03` (y≈458) |
| D8 | **Saída da Sala em corte seco** para a foto clara do Workplace; a borda superior da foto (monitor gerado) entra recortada | fim de `#mobile` × `WorkplaceScene` | `d1440-11` (y≈757) |
| D9 | **Status bar do iPhone cortada** pela câmera no quadro do laudo ("09:41" pela metade no topo) | câmera da etapa `laudo` | `d1440-09` |
| D10 | **Animação de layout** na pílula do nav (`padding`, `max-width`) | `SignupPill.module.css:3,9` | detector |

## Preferências estéticas (discutíveis, com recomendação)

- **P-a. Quadros com muito vazio.** No início e nos achados, mais da metade do aparelho é tela preta (`d1440-05`, `d1440-08`). É a interface real, mas em landing lê como "nada acontecendo".
- **P-b. Glow neon no plano Essencial** e grade técnica de fundo nos planos: única seção com efeito de brilho; destoa da luz lateral contida.
- **P-c. Faixa rolando depois do hero:** movimento sem informação nova; as cinco frases repetem o hero e as seções seguintes.
- **P-d. H1 do hero em 3 linhas** em 1440 e 1920. Com a coluna de texto em ~600 px, "O laudo se escreve / enquanto você / examina." quebra em três; em 2 linhas ganharia peso.
- **P-e. Badges "Disponível em breve" fixos** em todos os quadros da sequência mobile (no 390 ficam no topo durante toda a trilha, `m390-05`, `m390-07`); competem com a demonstração.

---

## Três intervenções de maior impacto

### 1. Editar a sequência mobile: metade do comprimento, o dobro da densidade
**Antes:** 6.418 px (55% da página em 1440). Sete quadros, dois quase vazios. Badges fixos durante toda a trilha.
**Depois:**
- Trilha de ~3,5 a 4 viewports.
- Início e achados fundidos numa única transição, entrando já com o microfone ou com a transcrição em quadro.
- Zooms amplos só **entre** etapas; câmera parada enquanto o texto é lido, como já aprovado.
- Badges fora do sticky, aparecendo uma vez no fim da sequência, junto da Sala.

**Por quê:** a demonstração convence nos quadros de categoria, ditado e laudo; o resto só cobra rolagem. O dono de clínica em 1440 chega aos planos depois de 9.900 px.
**Comando:** `/distill` (sequência) + `/layout` (sticky e badges).

### 2. Uma grade, uma superfície: costurar a página
**Antes:** três bordas esquerdas diferentes em 1440:
- x = 48 no hero, nas especialidades e no mobile;
- x = 220 nos planos, com contêiner de 1000 px;
- em 1920, o texto da Sala solto em x = 48 com o nav em x = 288.

Soma-se a emenda de grafite (D7), o corte seco da Sala para a foto (D8) e a tarja preta na Tireoide (D1).

**Depois:**
- Todas as seções no mesmo contêiner (`max-w-[1440px] px-12`), inclusive planos e etapa Sala.
- Um único grafite entre esquemas e mobile, ou degradê de 120 px entre os dois tons.
- Saída da Sala com fade vertical para o fundo antes do Workplace.
- Recorte da Tireoide regerado com fundo branco.

**Por quê:** profissionalismo é a soma dessas costuras; cada uma isolada é pequena, juntas denunciam montagem por partes.
**Comando:** `/layout` + `/polish`.

### 3. Uma cena da Sala, sem repetição
**Antes:**
- A etapa Sala mostra o laudo duas vezes (iPhone por cima do iMac, cobrindo a conclusão), com um rótulo "iMac" no queixo.
- A seção seguinte repete "A sala acompanha." e o mesmo diagrama médico → equipe.

**Depois:**
- **No `#mobile`:** iPhone parcial à esquerda, sobre a **sidebar** da Sala, e não sobre o texto. O iMac mostra cabeçalho, achados e **conclusão** legíveis, e se dissolve à direita (fade mantido). Monitor sem marca: queixo liso, ou só o logo LaudoUSG.
- **No `WorkplaceScene`:** outro título e outro papel. Por exemplo, "Sozinho ou com equipe" + Web disponível hoje. Ou fundir a seção na Sala e seguir direto para os planos.

**Por quê:** é o argumento para clínicas (quem paga o Profissional), e hoje ele chega duplicado e com o trecho clínico mais importante escondido.
**Comando:** `/clarify` (copy) + `/polish` (cena).

---

## Outras prioridades

- **[P2] CTA do nav desktop com rótulo sempre visível** ("Criar conta grátis"), igual ao mobile. Trocar a animação de `max-width`/`padding` por um rótulo fixo, ou por `transform`/`opacity` se a expansão no hover for mantida. **Comando:** `/clarify` + `/optimize`.
- **[P3] Planos sem glow neon:** substituir o halo pela mesma luz lateral dos mockups (sombra longa + borda interna de 1 px). **Comando:** `/quieter`.
- **[P3] Faixa rolando:** remover, ou trocar por uma faixa estática de três provas concretas já presentes no produto. **Comando:** `/distill`.

## Personas

- **Ultrassonografista no celular, entre exames (390):** entende o hero em 5 s e o laudo no iPhone convence. Na sequência mobile, perde o título geral, vê badges fixos no topo durante toda a trilha e, na Sala, lê um laudo microscópico com o iPhone por cima (`m390-11`). Risco: rolar direto sem chegar aos planos.
- **Dono de clínica no desktop (1440/1920):** procura "a equipe acompanha?" e "quanto custa?". Encontra a Sala com a conclusão escondida, lê o mesmo título na seção seguinte e só chega aos planos depois de ~9.900 px. Em 1920, vê a Sala desalinhada do resto (`d1920-10`).
- **Visitante cético com IA:** bem atendido pelo selo "Demonstração", por "captura real" e pela menção à imagem gerada por IA. É o ponto mais maduro da página.

## Observações menores

- A caixa "No laudo" do hero mobile reserva altura com fundo verde vazio enquanto digita (`m390-00`). Reservar altura sem o fundo verde até haver texto.
- "EM BREVE" quebra em duas linhas no plano Profissional em 1440 (`d1440-13`).
- Rodapé e fecho estão corretos e sóbrios; o fecho poderia herdar a mesma luz lateral dos mockups, em vez do radial verde no canto.

## Perguntas para decidir

1. A sequência mobile precisa mostrar **todas** as telas do fluxo, ou só as três que convencem (categoria, ditado, laudo) mais a Sala?
2. A seção Workplace tem papel próprio depois da Sala no `#mobile`, ou é redundante?
3. Os planos devem adotar a linguagem de luz lateral da página nova, ou ficar como estão por serem a oferta aprovada?

## Ações recomendadas (sem executar)

1. `/distill`: sequência mobile em 3,5 a 4 viewports; fundir início e achados; badges fora do sticky.
2. `/layout`: um contêiner para todas as seções (planos, etapa Sala em 1920); emendas de fundo esquemas → mobile e Sala → Workplace.
3. `/clarify`: remover o título duplicado "A sala acompanha."; CTA do nav desktop com rótulo.
4. `/polish`: cena da Sala sem sobreposição da conclusão e sem "iMac"; status bar inteira no quadro do laudo; recorte da Tireoide sem tarja.
5. `/quieter`: glow dos planos e faixa rolando.
6. `/optimize`: animação da pílula do nav fora de propriedades de layout.
7. `/polish` final.

Reexecutar `/critique` depois das correções para medir a nova nota.
