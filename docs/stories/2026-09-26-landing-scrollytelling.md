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
