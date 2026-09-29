# Story — Landing LaudoUSG com scrollytelling (Web-first)

**Data:** 26/09/2026
**Branch:** `feat/landing-scrollytelling` (apps/web)
**Status:** Pronta para revisão de Luiz — implementação e QA concluídos, ainda sem publicação.
**Briefing:** pedido do Luiz em 26/09 (landing atual boa, mas vídeo trava no mobile; copy e design precisam evoluir).

## Objetivo

Remodelar a página inicial de `www.laudousg.com.br` com storytelling guiado por rolagem. A Web é o foco principal e o app mobile vem depois, em seção própria. O vídeo de entrada é substituído por demonstração controlada pelo scroll, para o ultrassonografista entender o produto enquanto rola e chegar à assinatura.

## Escopo

1. **Hero Web:** retirar o vídeo da entrada. Primeiro contato = sensação de usar o LaudoUSG (laudo sendo construído em tempo real ou interação leve de redação). Mensagem principal com mais destaque.
2. **Recursos da Web:** especialidades realmente disponíveis e funcionalidades próprias da Web (sem inventar).
3. **Esquemas visuais:** imagens maiores, representativas (nunca o esquema completo), em cards sobrepostos/diagonais e tocáveis quando fizer sentido.
4. **Mobile (scrollytelling):** mockup de iPhone sticky; o scroll avança o fluxo: abrir o app → ditar/inserir achados → achados registrados → escolher categoria → gerar → processamento → laudo final. Texto lateral acompanha cada etapa. Nada de vídeo tradicional.
5. **Copy:** reescrever título e mensagens; substituir o claim ligado à arquitetura RAG ("não é a IA inventando…"). Manter os conceitos de mobilidade ("com gel na mão", "onde você trabalha").
6. **Layout:** usar a largura da viewport de forma criativa; comportamentos específicos para desktop e mobile; transições orgânicas entre seções (elementos atravessando seções, diagonais), evitando a sequência bloco–linha–bloco.
7. **Oferta:** preços, planos e textos de assinatura atuais **preservados** até prova em contrário.

## Fora de escopo

- Mudar preços, planos, checkout ou regras de assinatura.
- Métricas, depoimentos, garantias ou claims de pioneirismo sem fonte.
- Expor esquemas visuais completos.
- Qualquer alteração em `apps/api`, iOS ou Android.

## Ownership

| Frente | Owner | Limite |
|---|---|---|
| Shell da página, hero Web, integração e build | **Atlas** | estrutura, seções, estado do scroll, integração das partes |
| Seção mobile (mockup sticky + sequência) | **Claude (17bd)** | só a seção mobile e seus assets |
| Imagens, direção de arte e WorkplaceScene | **Root** | imagem editorial, seção de ambiente/Sala, integração e revisão visual |
| Copy e auditoria de claims (read-only) | **Claude (esta sessão)** | só `docs/reviews/2026-09-26-landing-copy.md` |
| QA | **Prumo** | responsividade, desempenho, acessibilidade, regressão |
| Aceite | **Luiz/SM** | critérios, ordem, aceite final |

Ninguém edita arquivo de outra frente sem combinar.

## Critérios de aceite

- [x] Nenhum vídeo no hero; primeira dobra mostra o produto (animação ou interação) em desktop e mobile.
- [x] Sequência mobile avança e **retrocede** com o scroll; cada etapa tem texto correspondente; funciona sem travar em conexão lenta (assets leves, sem vídeo pesado).
- [x] `prefers-reduced-motion`: a página continua compreensível, com as etapas acessíveis por botões sem animação obrigatória.
- [x] Sem overflow horizontal nos tamanhos verificados, incluindo 320 e 390 px; sticky não cobre conteúdo nem CTA; controles tocáveis com 44 px no mobile.
- [x] Largura desktop aproveitada (sem colunas estreitas centralizadas com laterais vazias), sem esticar componentes indiscriminadamente.
- [x] Esquemas visuais maiores, apenas recortes representativos.
- [x] Toda afirmação da copy tem sustentação no produto real (ver `docs/reviews/2026-09-26-landing-copy.md`); nenhuma métrica, garantia, pioneirismo ou preço inventado.
- [x] Oferta/preços idênticos aos atuais, salvo decisão explícita do Luiz.
- [x] Lighthouse mobile medido pelo Prumo: mediana local de desempenho 91 versus 85 no baseline público; acessibilidade 96 versus 94. Comparação indicativa entre ambientes diferentes, com confirmação em produção pendente.
- [x] CTA de cadastro no cabeçalho, hero, ambiente/Sala e fechamento; planos e links de acesso preservados.

## Checklist

- [x] Story criada e comunicada aos owners
- [x] Copy e claims auditados (docs/reviews/2026-09-26-landing-copy.md)
- [x] Shell + hero Web (Atlas)
- [x] Seção mobile (Claude 17bd)
- [x] Imagens/direção (Root)
- [x] QA (Prumo)
- [ ] Aceite (Luiz)

## File List

- `README.md`
- `apps/web/src/app/page.tsx`
- `apps/web/public/brand/landing-workspace-v3.webp`
- `apps/web/src/components/landing/v2/Cta.tsx`
- `apps/web/src/components/landing/v2/FinalCta.tsx`
- `apps/web/src/components/landing/v2/HeroWorkspace.tsx`
- `apps/web/src/components/landing/v2/LandingFooter.tsx`
- `apps/web/src/components/landing/v2/LandingNav.tsx`
- `apps/web/src/components/landing/v2/MobileStory.tsx`
- `apps/web/src/components/landing/v2/SchemeDeck.tsx`
- `apps/web/src/components/landing/v2/Specialties.tsx`
- `apps/web/src/components/landing/v2/WorkplaceScene.tsx`
- `apps/web/src/components/landing/v2/mobile-story.module.css`
- `apps/web/src/components/landing/v2/useReducedMotionSafe.ts`
- `apps/web/public/landing/esquemas/esquema-fetal.jpg`
- `apps/web/public/landing/esquemas/esquema-mama.jpg`
- `apps/web/public/landing/esquemas/esquema-tireoide.jpg`
- `apps/web/public/landing/esquemas/esquema-venoso.jpg`
- `apps/web/tests/landingScrollytelling.browser.manual.ts`
- `docs/stories/2026-09-26-landing-scrollytelling.md`
- `docs/reviews/2026-09-26-landing-copy.md`
- `docs/reviews/2026-09-26-landing-image.md`
- `docs/reviews/2026-09-26-landing-qa.md`

## Validação e limite de publicação

- `pnpm --filter @laudousg/web test`: 16 suítes passaram.
- `pnpm --filter @laudousg/web lint`: sem erros; avisos preexistentes fora dos componentes novos.
- `pnpm --filter @laudousg/web typecheck`: passou.
- `pnpm --filter @laudousg/web build`: passou; rota `/` pré-renderizada, 176 kB de First Load JS.
- Browser no build otimizado (`next start`, porta 3001): 1920×1080, 1440×900, 1024×768, 390×844 e 320×568; reduced-motion 390/320 e rede lenta passaram. Detalhes e medições em `docs/reviews/2026-09-26-landing-qa.md`.
- Inspeção visual central: hero, especialidades, esquemas, sequência iPhone e ambiente/Sala. A prévia foi aberta no Google Chrome real.
- Planos, checkout, metadata/canonical, API, banco e aplicativos nativos não foram alterados nesta rodada.
- Lighthouse: três rodadas, CLS zero em todas. Contraste insuficiente em quatro elementos preexistentes (logo e planos) registrado no QA; não representa conformidade WCAG integral.
- Prévia local para revisão de Luiz; esta story não declara publicação em produção nem aceite visual do usuário.

## Continuação editorial — pesquisa competitiva de 26/09

Luiz pediu análise de Laudos.AI, Laudário, Laudite, Rgen e nReport para orientar uma copy melhor. A pesquisa examinou os sites e documentos oficiais dos quatro produtos identificados, acrescentou IARA Health e deixou Rgen pendente de identificação por URL. O trabalho é de estratégia e documentação; a implementação da landing permanece no commit anterior.

Entregáveis desta continuação: `diagnostico.md`, `copy/landing-estrategia.md`, `docs/reviews/2026-09-26-landing-competitive-strategy.md` e `docs/reviews/2026-09-26-landing-positioning-options.md`. Pesquisa e proposta editorial concluídas, sujeitas à avaliação de Luiz; sem aplicação da copy, mudança de oferta ou publicação.

Validação desta continuação: conferência de links/fontes, separação de claims públicos de resultados auditados, comparação com componentes e contrato comercial local, revisão independente por Brisa. Não houve mudança de código; os testes da implementação acima não foram repetidos para documentos.

## Laboratório de ideias — HTML solicitado por Luiz

Artefato independente em `docs/prototypes/laudousg-ideias/index.html`, com catálogo em `ideas.json` e instruções em `README.md` na mesma pasta. Reúne 12 oportunidades de produto derivadas da pesquisa competitiva, com proposta, prioridade, estado atual e referência. Inclui busca, filtros, favoritos locais e exportação da seleção. Nenhuma funcionalidade sugerida foi implementada no produto.

Validação funcional em Chromium nos tamanhos 1440, 1024, 390 e 320 px; movimento reduzido e abertura direta do HTML sem rede também conferidos. Prévia aberta no Google Chrome em `http://localhost:8846/`. Revisão independente de conteúdo atribuída ao terminal Claude; parecer em `docs/prototypes/laudousg-ideias/revisao.md` quando concluído.

### Ajuste visual — categorias e CTA (26/09)
- [x] Todas as 15 ilustrações de categorias em escala de cinza, nos dois layouts.
- [x] Restaurada a pílula expansível original do cadastro no topo (350 ms), com expansão também por foco de teclado. Em telas pequenas/touch, rótulo permanece visível; movimento reduzido respeitado.
- [x] Build, typecheck, lint e testes Web passaram. Browser em 1440, 390 e 320 px: imagens cinza, expansão desktop, destino /signup, ausência de overflow e movimento reduzido conferidos.
- Arquivos: `apps/web/src/components/landing/v2/Specialties.tsx`, `LandingNav.tsx`, `SignupPill.module.css` (os dois últimos no mesmo diretório).
- Prévia local atualizada em http://localhost:3001/. Sem publicação nesta etapa.

### Captura real mobile e Sala — prévia concluída (26/09)
- [x] iPhone físico reconhecido e espelhado no QuickTime; gravação iniciada com Luiz operando um caso demonstrativo sem identificação de paciente.
- [x] Conferido contrato: Sala recebe `reports` do mobile; não recebe `web_reports`.
- [x] Avisos de disponibilidade futura App Store/Google Play criados (`StoreAvailability.tsx`), sem links de download.
- [x] Substituída a recriação por seis capturas reais do iPhone e uma da Sala, com zoom editorial, revelação do laudo e composição dos dois dispositivos na última etapa.
- [x] Selecionados e revisados individualmente os sete assets públicos, sem paciente identificado nem código de acesso. Bruto de 399,03 s salvo localmente; quadros de pareamento excluídos. Pasta dos brutos excluída localmente do Git.
- [x] Build/typecheck/lint e testes Web passaram; sete etapas, imagens, hit targets de 44px, ausência de overflow, opacidade final da Sala e erros JS/hidratação verificados em 1440×900, 1024×768, 390×844 e 320×568; movimento reduzido em 390 e 320. Ajustados os controles em telas baixas e a opacidade do monitor.

Roteiro e evidências: `docs/reviews/2026-09-26-mobile-sala-storyboard.md`. Brutos privados locais em `output/landing-capture/2026-09-26/` (não publicar). Não revogar a sala do usuário.

Arquivos desta etapa: `MobileStory.tsx`, `mobile-story.module.css`, `StoreAvailability.tsx` em `apps/web/src/components/landing/v2/`; capturas e proveniência em `apps/web/public/landing/mobile-real/`. Nenhuma alteração no app iOS, Android, API ou banco; sem publicação.
Validação adicional: cliques reais nos botões Sala → Início passaram em 1440 e 320 px, confirmando ida e volta. Capturas finais em `/tmp/mobile-real-*` e `/tmp/mobile-settled-*`.

### Ajuste de zoom e passagem para a Sala (26/09)

O zoom agora transforma o mockup inteiro, mantendo moldura e captura juntas. A captura interna não recebe escala separada. Na etapa Sala, o celular recua e um cartão editorial de laudo se desloca para a direita, enquanto a captura real da Sala entra ampliada. A coluna visual ganha espaço no desktop e a legenda explicita celular → Sala do Auxiliar. Movimento reduzido mantém a composição final sem cartão em trânsito.

Validação: build, lint, typecheck e testes web passaram. Navegador validado em 1440×900, 1024×768, 390×844 e 320×568, além de movimento reduzido nos dois tamanhos móveis: sete etapas, alvos clicáveis de pelo menos 44px, imagens carregadas, sem overflow horizontal ou erros de página. Medição adicional confirmou escala 1.2 no aparelho completo e nenhuma transformação na captura interna; cartão visível e deslocamento crescente para a direita. Prévia local atualizada em localhost:3001; sem publicação nesta rodada.

### Rolagem rápida: reduzir repintura do fundo (26/09)

Relato: faixas brancas transitórias no topo/rodapé ao rolar rápido. A trilha mobile usava gradientes na altura inteira de sete telas e a landing tinha base branca. Mudança localizada em `apps/web/src/app/page.tsx` e `apps/web/src/components/landing/v2/mobile-story.module.css`: base grafite, trilha com cor opaca, iluminação limitada ao pseudo-elemento da cena sticky, isolamento de empilhamento e remoção de will-change desnecessário das capturas.

Build, lint, typecheck e 16 suítes web passaram; regressão das sete etapas em seis combinações de viewport/movimento também passou. Ensaio com wheel de 780px nos dois sentidos: screenshots imediatos do Chromium headless apresentam frame deslocado inclusive do header fixo; após 50ms o frame aparece normal. Isso não comprova a causa do artefato percebido no Chrome físico nem sua eliminação definitiva. Ajuste reduz a área de rasterização e elimina o fundo branco da trilha; prévia local atualizada, sem publicação. Tentativa de inspeção física foi interrompida pelo ambiente de UI (noWindowsAvailable).

### Aproximação da câmera e indicação dos toques (26/09)

A escolha de categoria agora aproxima o aparelho inteiro até 2,35× e mantém o recorte dentro da cena, sem invadir a copy ou os controles. A lista usa a captura real com deslocamento editorial vertical, retornando ao Abdome Total antes do toque indicado; não é uma nova gravação de interação. Keyframes de câmera fazem pequenos deslocamentos laterais e conduzem o foco ao ditado. Na etapa Gerar, o aparelho retorna à escala 1. Ponteiro com halo indica seletor, categoria Abdome Total, Parar e usar e Gerar laudo; não intercepta cliques e fica oculto em movimento reduzido.

Arquivos: `MobileStory.tsx` e `mobile-story.module.css`. Build, lint, typecheck e 16 suítes web passaram; sete etapas passaram em desktop/tablet/mobile e movimento reduzido (seis combinações). Medidas adicionais em 1440×900 e 390×844 confirmaram escala 2,35 na categoria e retorno sem transformação na geração. Revisão visual corrigiu o ponteiro do ditado para a posição real de Parar e usar. Prévia local, sem publicação.

### Substituição dos frames pelo vídeo real contínuo (26/09)

Correção solicitada por Luiz: as capturas animadas pareciam estáticas no ditado e na geração, e faltava a transição para tocar no microfone. A implementação anterior de frames foi substituída por reprodução do recorte real 00:14–01:41 da gravação física, com 87s, sem áudio, H.264 720×1560/30fps (~15MB), carregado só quando a seção entra na área visível. O bruto continua privado. Contatos do intervalo revisados a cada segundo, sem dados pessoais ou pareamento; corte termina antes dessa tela.

O vídeo continua enquanto a página está parada. A rolagem e os botões escolhem capítulos; o relógio do vídeo passa a conduzir a câmera, o texto da etapa e o ponteiro. Sequência preservada: abrir categorias → selecionar Abdome Total → microfone → ditado com transcrição crescente → Parar e usar → conferir achados → Gerar laudo → processamento → texto real e rolagem até a conclusão. Pausa/replay disponíveis; sair da seção ou ocultar a aba pausa a reprodução. Movimento reduzido e erro de rede usam as capturas como alternativa, com rótulo explícito.

Limite da fonte comunicado ao usuário: o laudo no vídeo aparece após processamento, sem digitação letra por letra. Não foi inventado streaming de texto clínico. A Sala continua com captura real e transição editorial.

Arquivos desta rodada: `apps/web/src/components/landing/v2/MobileStory.tsx`, `mobile-story.module.css`, `apps/web/public/landing/mobile-real/demonstracao-real.mp4`, `README.md` dos assets e esta story. Build, lint, typecheck e 16 suítes web passaram. QA do vídeo: avanço sem scroll, lazy-load, sete capítulos, pausa/replay, término sem retornar ao início, pausa fora da seção, falha de rede com fallback, ausência de overflow/erros JS e alvos de navegação em 1440×900, 390×844, 320×568; movimento reduzido testado em 320×568. Screenshots dos tempos de microfone, transcrição, geração e laudo revisados. Sem commit/push/publicação nesta rodada.

### Traçado de envio, motion blur e Sala ampliada (26/09)

Removido o cartão “Laudo revisado”. A passagem para a Sala usa um traçado SVG fino com desenho progressivo e desaparecimento ao concluir, deixando o laudo livre para leitura. O celular recebe blur limitado a 2,8px proporcional à velocidade das transformações, suavizado por spring; em repouso volta a filter:none e em movimento reduzido não há blur.

Sala ampliada para além da área visível, cortada nas bordas direita e inferior da seção no desktop; máscara em gradiente suaviza a lateral esquerda. Imagem em resolução apropriada ao novo tamanho, sem distorção. No mobile o recorte permanece na cena, preservando os controles de navegação.

Arquivos: MobileStory.tsx e mobile-story.module.css. Build/lint/typecheck e 16 suítes web passaram. QA em 1440×900, 390×844, 320×568 e 320×568 com movimento reduzido: máscara presente, ausência do cartão anterior, traçado presente, sem overflow, botão Sala alcançável. Blur medido durante movimento (0,46px no trecho amostrado), voltando a none após pausa. Prévia local; sem publicação.

### Correção da direção do fade e remoção de controles (26/09)

Correção explícita de Luiz após referência Linear: esquerda deve ficar nítida e a imagem desaparecer à direita. A máscara agora é opaca à esquerda e transparente à direita, aplicada à largura visível do monitor, enquanto a captura interna continua ampliada. Traçado SVG removido integralmente. Navegação Início/Exame/Ditar/Achados/Gerar/Laudo/Sala removida; a grade usa o espaço liberado. Pausa e replay do vídeo permanecem. Movimento reduzido apresenta a composição final estática da Sala, sem depender dos botões removidos.

Build, lint, typecheck e 16 suítes web passaram. QA em 1440×900, 390×844, 320×568 e movimento reduzido: nenhuma nav/linha, gradiente confirmado opaco→transparente, sem overflow ou erro JS. Claude Code Atlas recebeu `/critique` via CLI medmaestri, confirmou skill carregada e está revisando read-only.

`/critique` concluído pelo Claude Code Atlas, com revisão visual desktop/mobile e detector impeccable (0 achados automáticos). Parecer salvo em `docs/reviews/2026-09-26-mobile-sala-critique.md`. Aplicados também os ajustes diretamente ligados à limpeza da Sala: retirada da legenda órfã de transferência e das luzes verdes nessa etapa, para que o fade termine no grafite puro. Recomendações adicionais de câmera mobile, posição dos controles e sincronização da legenda ficaram documentadas; o zoom forte explicitamente pedido por Luiz foi preservado.

### Ajuste: sequência vinculada exclusivamente à rolagem

Retirado playback automático e controles de reprodução. A posição da página agora determina continuamente o quadro da captura real, para frente e para trás; seeks são serializados e o destino mais recente vence. O ditado completo ocupa 10% do percurso (antes uma etapa de 14,3%), sem eliminar conteúdo. Câmera permanece fixa durante categorias, ditado e leitura, com transições amplas entre enquadramentos; removida deriva lateral. Mockup base ampliado, mantendo recorte da cena e fade direito da Sala. Movimento reduzido continua com captura estática.

Validação: build, lint (avisos preexistentes), typecheck e suíte web; browser em 1440, 390 e 320 px verifica pausa em repouso, rolagem reversa, câmera estável durante ditado e ausência de overflow.

### Acabamento de 27/09 — mockups, faixa e conteúdo do hero

Categorias: percurso reduzido de 18% para 16,9% da rolagem (redução aproximada de 6%, equivalente a 0,5 s sobre os 8 s da captura). Zoom limitado pela geometria da cena, preservando as duas laterais do aparelho. Iluminação radial estendida à largura da janela, sem recorte no limite da coluna. Sala: mockup iMac em CSS com câmera, moldura, alumínio e pedestal; fade direito preservado; iPhone a 68% com metade superior entrando pela base. Avisos das lojas ampliados.

Esquemas: título solicitado aplicado; posição fetal retirada; três cards redistribuídos. Faixa contínua após hero com frases de fluxo, pausa em hover/foco e versão estática para movimento reduzido.

Hero: frases base extraídas de `packages/knowledge/snippets/ABDOMEN_TOTAL/modelo/template-padrao.md`; alterações de `regra/figado-variantes.md`, `regra/vesicula-e-vias-biliares-variantes.md`, `regra/rins-variantes.md` e `regra/derrames-bexiga-e-doppler.md`. Cisto adaptado explicitamente para rim direito e medidas demonstrativas 2,1 x 2,0 x 1,8 cm; cálculo 1,2 cm; volume vesical 250 mL. Preservada identificação de prévia parcial demonstrativa, sem dados de pacientes. A vitrine não invoca o renderer/IA em produção.

Arquivos: MobileStory.tsx, mobile-story.module.css, StoreAvailability.tsx, SchemeDeck.tsx, HeroWorkspace.tsx, WorkflowRibbon.tsx, workflow-ribbon.module.css, app/page.tsx.

Validação: build, lint, typecheck e 16 suites web; navegador em 1440x900, 1984x1270, 390x844 e 320x568, verificando moldura visível, ausência de overflow, título e remoção da posição fetal. Prévia local; sem publicação.
