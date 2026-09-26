# Landing — copy Web-first e auditoria de claims

Data: 26/09/2026. Story: `docs/stories/2026-09-26-landing-scrollytelling.md`. Somente leitura do código real (`apps/web/src/app/page.tsx`, `apps/web/src/components/landing/*`, catálogo de categorias). Não altera o app.
Regras aplicadas (skill design-taste-frontend): título do hero em até 2 linhas, subtítulo com até 20 palavras, um rótulo por intenção de CTA, nenhum número sem fonte, nenhum travessão longo.

## 1. Auditoria dos claims atuais

| Claim atual | Onde | Veredito | Evidência |
|---|---|---|---|
| "35+ especialidades de USG" | `page.tsx:133,175` (contador fixo) | **Remover** | A Web tem **15 exames em 5 áreas** (`components/laudar/categoryGroups.ts`). O 35 é valor fixo no código, sem fonte. |
| "~2,8 s do achado ao laudo, tempo médio de geração" | `page.tsx:133,182` | **Remover** até haver medição | Valor fixo `ms: 2800`, sem telemetria citada. |
| "Calibrado para a sua forma de escrever" / "quanto mais você usa, mais soa como você" | hero; card "Calibrado ao seu jeito" | **Reescrever** | Há escolha de estilo de escrita e frases pessoais (`components/preferencias/FrasesPessoais.tsx`). Não achei aprendizado contínuo pelo uso. |
| "É o conhecimento certo, na hora certa" + "busca por similaridade" | `VetoresHowItWorks.tsx` | **Substituir** | Descreve a arquitetura antiga (RAG). Hoje, na Web, o que é clicado vira texto por código determinístico (`lib/deterministic/types.ts`, cabeçalho) e o laudo sai do mesmo motor que atende iOS e Android (`lib/catalog/useLaudoCanonico.ts`). |
| "A única plataforma de laudos projetada com foco no uso pelo celular" | `MobileFirst.tsx` | **Reescrever sem superlativo** | Sem evidência de exclusividade. O mesmo vale para "pioneira", sugerida no briefing. |
| "Consultor IA do seu lado" | card de diferenciais | **Mover para a seção mobile** | Existe no iOS (`/api/consultant`). Não encontrei na Web. |
| "Esquemas que se desenham sozinhos" | `Esquemas.tsx` | **Manter**, restrito | Web: tireoide, mamas e posição fetal (`supportsVisualSchema` em `LaudarWebExperience.tsx`). |
| Sala do Auxiliar: "médico dita no celular e o laudo aparece na tela da sala" | `SalaEquipe.tsx` | **Manter** | A Sala lê os laudos do app (`/api/sala/latest`, tabela `reports`). **Laudo feito na Web não chega à Sala** (`docs/reviews/2026-09-26-composition-cross-platform-audit.md`). |
| "O nome de quem ajudou fica no rodapé" | `SalaEquipe.tsx` | **Ajustar** | Na Web são **iniciais** discretas (`appendInitials`, `lib/deterministic/compose.ts`). |
| "Disponível em breve" nas lojas | `Stores.tsx` | **Manter "em breve"** | Em 14/09 o iOS estava "Aguardando revisão" (`docs/reviews/appstore-live-2026-09-14.md`). Sem prova de publicação. |
| "Cartografia automática no Doppler: em breve" | card de diferenciais | **Manter** | Aparece também como item do plano Profissional (`Pricing.tsx`). Ver pendência P3. |
| Oferta: "Sem cartão · 10 laudos grátis · Cancele quando quiser"; Gratuito, Essencial (até 800 laudos/mês), Profissional; preços de `PRICES` | CTA final, `Pricing.tsx` | **Preservar sem mudança** | Oferta vigente. "Exportação .docx" do plano gratuito não foi localizada no código da Web (P2). |

## 2. Copy final proposta

Um rótulo por intenção: **cadastro = "Começar grátis"**; **planos = "Ver planos"**.

### Hero (Web)
- **Título:** Seu laudo de ultrassom, pronto enquanto você examina.
- **Subtítulo (17 palavras):** Clique nos achados e acompanhe o laudo se escrevendo ao lado, no seu estilo, pronto para revisar.
- **CTA:** Começar grátis · Ver planos
- A primeira dobra mostra o laudo sendo construído (Atlas). A frase "com IA" sai do título: na Web o laudo por cliques não depende de IA para escrever.

### Como a Web escreve (substitui o bloco RAG)
- **Título:** Você escolhe o achado. O laudo escreve a frase.
- **Texto:** Cada seleção vira texto pelo mesmo motor de laudo usado nos apps. A revisão final é sempre sua.
- *Rejeitado pela coordenação:* "o que você não marcou não aparece" (a normalidade pode vir por padrão).

### Especialidades
- **Título:** 15 exames, organizados como você trabalha.
- **Grupos (reais):**
  - **Medicina interna:** abdome total, abdome superior, vias urinárias, próstata, Doppler de carótidas.
  - **Obstetrícia:** obstétrica, obstétrica com Doppler, morfológico, cervicometria.
  - **Saúde da mulher:** pelve feminina, mamas e axilas.
  - **Pequenas partes:** tireoide, cervical, partes moles.
  - **Musculoesquelético.**

### Recursos da Web
- **Achados e laudo lado a lado:** você preenche de um lado e revisa do outro.
- **Calculadoras no fluxo:** TI-RADS, O-RADS, BI-RADS sugerido para você confirmar, peso fetal e biometria INTERGROWTH, trissomias (FMF). *(Conferir com o Root quais estão visíveis ao usuário final antes de publicar a lista.)*
- **Seu estilo:** escolha o estilo de escrita e salve suas frases para reusar.
- **Esquemas visuais:** tireoide, mamas e posição fetal desenhados a partir do laudo.
- **Histórico:** laudos salvos e prontos para copiar.

### Esquemas visuais
- **Título:** Esquemas que acompanham o laudo.
- **Texto:** Enquanto você descreve, o esquema se monta a partir do próprio laudo. Claro para explicar à paciente e para quem lê depois.

### Mobile (scrollytelling)
- **Título:** Feita para laudar pelo celular.
- **Texto de abertura:** Dite com o gel na mão, sem correr até um computador. O laudo acompanha você onde você trabalha.
- **Etapas ao lado do mockup:**
  1. **Abra e dite:** fale os achados durante o exame.
  2. **Veja os achados registrados:** a transcrição aparece enquanto você fala.
  3. **Escolha o exame:** a categoria define a estrutura do laudo.
  4. **Gere:** o sistema organiza os achados no modelo do exame.
  5. **Revise:** o laudo completo aparece para você conferir e ajustar.
- **Consultor IA:** Na dúvida sobre um diferencial ou a redação de um achado? Pergunte ali mesmo.
- **Lojas:** "Em breve na App Store e no Google Play" (sem data).

### Sala do Auxiliar
- **Título:** A sala toda no mesmo ritmo.
- **Texto:** O médico dita no celular e o laudo aparece na tela da sala na hora. As iniciais de quem ajudou ficam no fim do laudo.

### Controle (antigo "Com ou sem IA")
- **Título:** O controle é sempre seu.
- **Texto:** Deixe o sistema montar o laudo ou escreva cada palavra. Você revisa e ajusta antes de copiar.
- *Rejeitado pela coordenação:* "Nada sai sem você revisar" (garantia inexata).

### CTA final (oferta preservada)
- **Título:** Pronto para dar alta ao laudo manual?
- **CTA:** Começar grátis
- **Linha de oferta:** Sem cartão · 10 laudos grátis · Cancele quando quiser *(texto atual, sem mudança)*

## 3. Claims proibidos nesta landing
- Métricas de tempo, precisão, número de usuários ou de laudos.
- "Única", "primeira" ou "pioneira".
- Garantias ("nunca erra", "sem alucinação", "100%").
- Preços ou limites diferentes dos atuais.
- Disponibilidade nas lojas.
- Laudo da Web aparecendo na Sala ou no celular.

## 4. Pendências para decisão (Luiz/Root)
- **P1:** frase "Plataforma pioneira…" do briefing. Só entra com evidência; a proposta usa "Feita para laudar pelo celular".
- **P2 (lacuna preexistente, não bloqueia):** "Exportação .docx" no plano gratuito não foi localizada no código da Web. A oferta segue inalterada.
- **P3:** Cartografia aparece como "em breve" nos diferenciais e como item do plano Profissional. Decidir se o plano deve marcar "em breve".
- **P4:** lista final de calculadoras visíveis na Web.
- **P5:** se houver medição real de tempo de geração, o número pode voltar com fonte.

## 5. Auditoria da implementação v2 (`components/landing/v2`)

O hero atual do Atlas foi considerado seguro pela coordenação e aqui só foi conferido. Não refiz pesquisa ampla; cada linha abaixo foi verificada no código.

| # | Componente | Texto / claim | Veredito | Evidência / ação |
|---|---|---|---|---|
| V1 | `HeroWorkspace.tsx` | Demonstração com achados sintéticos, marcada "Exemplo ilustrativo… não é laudo de paciente" | **OK** | Rótulo de exemplo presente. Sem métrica. |
| V2 | `MobileStory.tsx` | "As mais usadas ficam no topo. A busca encontra as demais." | **Ajuste leve (Atlas)** | No iOS, "Mais usadas" é uma **lista fixa** (`ReportCategory.priority`, `Components/Sheets/CategorySheet.swift:9-34`), não o uso de cada médico. Sugestão: "As mais comuns ficam no topo. A busca encontra as demais." |
| V3 | `MobileStory.tsx` | "Achados organizados, medidas e lado conferidos" | **OK, com cautela** | Há checagem determinística no cliente (`SanityChecker`, README do iOS). Não afirmar correção automática. |
| V4 | `MobileStory.tsx` | "Leia, ajuste o que quiser e copie para o sistema da clínica." | **OK** | Fluxo de revisão e cópia existe. |
| V5 | `MobileStory.tsx` | Sequência com dados fictícios, marcada "Demonstração com dados fictícios" e "Trecho ilustrativo" | **OK** | Rótulos presentes. |
| V6 | `SchemeDeck.tsx` | Mama, tireoide e posição fetal ativos; mapa venoso "Em breve" | **OK após o ajuste da coordenação** | Selo "Em breve" em `SchemeDeck.tsx:75` e texto em `:125`. Mama, tireoide e posição fetal têm esquema na Web. |
| V7 | `Specialties.tsx` | Nomes dos exames | **OK** | Batem com o catálogo (ex.: "Doppler de carótidas e vertebrais", `organs/dopplerCarotidas.ts:24`). |
| V8 | `WorkplaceScene.tsx` | "Médico e auxiliar, conectados", "Acompanha o laudo no computador", "A revisão final continua com o médico" | **OK** | Descreve celular → computador (Sala lê `reports`). Não afirma Web → Sala. Imagem rotulada "gerada por IA". |
| V9 | `Cta.tsx`, `LandingFooter.tsx` | "Criar conta grátis" e "Criar conta" | **Ajuste leve (Atlas)** | Mesma intenção com dois rótulos; unificar em "Criar conta grátis". |
| V10 | v2 inteira | Métricas, "única/pioneira", garantias, lojas | **OK** | Não encontrei "35+", "2,8 s", "única", "pioneira" nem disponibilidade nas lojas nos textos da v2. |

## 6. Checklist final objetivo

- [x] Nenhuma métrica sem fonte (35+ e 2,8 s fora da v2)
- [x] Nenhum "única", "primeira" ou "pioneira"
- [x] Apps nativos: nenhuma afirmação de disponibilidade nas lojas
- [x] Mapa venoso marcado "Em breve"
- [x] Sala descrita como celular → computador, sem Web → Sala
- [x] Demonstrações rotuladas como exemplo ou dados fictícios
- [x] Nomes de exames iguais aos do catálogo
- [x] V2: "mais comuns" aplicado pelo Root em `MobileStory.tsx`
- [ ] V9: unificar o rótulo de cadastro (Atlas)
- [x] Oferta e preços preservados: a v2 importa o `Pricing` original e o diff de `Pricing`/`/precos` está vazio (confirmado pelo Root)
- [ ] P2: exportação .docx sem evidência no código (lacuna registrada, não bloqueia)

## 7. Lacunas restantes
- Não rodei o preview (porta 3001) nem conferi a página renderizada; a auditoria é sobre o texto no código.
- Tabela de planos: resolvida (componente original reaproveitado, diff vazio).
