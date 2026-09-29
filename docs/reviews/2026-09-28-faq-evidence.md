# FAQ da landing: fontes e verificação (28/09/2026)

**Entrega (ownership Atlas):**
- `apps/web/src/components/landing/v2/LandingFaq.tsx`
- `apps/web/src/components/landing/v2/landing-faq.module.css`
- este documento.

**Não editados:** `page.tsx` (o root integra entre Planos e o CTA final), outros componentes e assets. Sem build, sem reiniciar a 3001, sem commit. Nenhum dado de paciente acessado.

**Integração sugerida para o root:**

```tsx
import LandingFaq from '@/components/landing/v2/LandingFaq'
// …depois do <div data-nav-dark><Pricing /></div> e antes de <FinalCta />
<LandingFaq />
```

A seção é clara (`#f4f6f4`), então não leva `data-nav-dark`. A âncora é `#faq` e o seletor de QA é `data-landing-section="faq"`; cada item é `details[data-faq-item]`.

## 1. Pesquisa de concorrentes (só temas, sem copiar texto nem promessas)

Acesso em 28/09/2026. Os temas foram parafraseados; nenhuma resposta ou claim foi reaproveitado.

| Fornecedor | URLs verificadas | Resultado |
|---|---|---|
| laudos.ai | https://www.laudos.ai/ (FAQ na home), https://www.laudos.ai/precos | FAQ extenso: teste sem cartão, preço e limite, integração com PACS/RIS, se a IA assina, se a IA lê a imagem, cancelamento e fidelidade, onde ficam os dados, uso dos dados para treino, falha da IA, CFM 2.454/2026 |
| Laudário | https://laudario.com.br/ (#duvidas, #planos) | Teste com ou sem cartão, estilo de escrita próprio, compatibilidade com o aparelho (worklist e DICOM SR), plano por clínica e por médico, assinatura ICP-Brasil, segurança, internet caindo, suporte, cancelamento. (`laudario.med.br` parece ser outro produto, com foco em residência.) |
| Laudite | https://laudite.com.br/, https://laudite.com.br/faq/, https://laudite.com.br/nossos-planos/ | Teste gratuito, sistemas operacionais, celular e tablet, backup de máscaras, segurança, qualidade do reconhecimento de voz, integrações, ciclo de cobrança |
| RGen | não localizado em três buscas | Nenhum site oficial identificado; sem temas |
| nReport (Ionic Health) | https://www.ionic.health/nreport | Sem FAQ. A página trata de preço, teste, integração por API, laudo estruturado e modo offline |

**Objeções mais recorrentes:**
- em 4 de 4 fornecedores: teste e como começar, preço e escolha do plano, integração com PACS/RIS, personalização;
- em 3 de 4: segurança dos dados, internet e offline, suporte;
- em 2 de 4: cancelamento, plataforma (celular/web), assinatura.

**O que ficou de fora de propósito:**
- Segurança/LGPD, onde ficam os dados, CFM 2.454/2026: exigem afirmação jurídica ou de conformidade que o código sozinho não prova.
- Suporte: canal e horário não estão documentados no repositório para o plano base.
- Offline: não existe.

A ausência de integração **foi** incluída, de forma honesta, porque é uma das objeções mais frequentes.

## 2. Cada resposta e a evidência no código

| Pergunta | Afirmação | Evidência |
|---|---|---|
| Como começo? | Plano Gratuito, sem cobrança, sem prazo; limites ficam em Planos (sem repetir número) | `apps/web/src/app/terms/page.tsx` §4 ("O plano Gratuito oferece 10 laudos vitalícios, sem cobrança"); `components/landing/Pricing.tsx` (card Gratuito) |
| Computador ou celular? | Web disponível; apps iPhone/Android com ditado "chegando" | `components/landing/v2/StoreAvailability.tsx` ("Disponível em breve"); `WorkplaceScene.tsx` ("Web disponível. Apps nativos… em breve"). A Web **não** tem ditado direto: nenhum `getUserMedia`/`MediaRecorder` em `apps/web/src` fora da landing |
| Como os achados viram um laudo? | Cards por órgão; texto = modelo do exame + achados selecionados; não interpreta imagem; revisar inclusive a normalidade | `components/laudar/LaudarWebExperience.tsx` (grade por órgão; "Tudo pré-marcado como normal. Mude só o que estiver alterado."); renderer canônico em `lib/catalog/*` → `/api/catalog/[category]/render`. Nenhum código de análise de imagem |
| Posso editar? | Edição livre; mudança posterior de achado vira sugestão sem apagar a edição | `LaudarWebExperience.tsx` (`reportDrafts`, `sourceChanged`, `applyCurrentModel`/`rejectCurrentModel`); `LaudoPreview.tsx` (editor e cópia) |
| Assina ou integra? | Não há assinatura digital nem integração RIS/PACS; copia e assina no sistema próprio | Busca por `assinatura digital`, `ICP-Brasil`, `certificado digital` em `apps/web/src`: **0 ocorrências**. Nenhum cliente RIS/PACS/DICOM na Web ou na API |
| Jeito de escrever | Estilo Clássico ou Objetivo em Preferências; iniciais da digitadora | `components/preferencias/EstiloDeEscrita.tsx:8-9`; `lib/digitadoras.ts` + seletor em `LaudarWebExperience.tsx` |
| Sala do Auxiliar | Tela da equipe para os laudos do dia gerados **no app**; auxiliar entra com código, sem a senha do médico; copiar ou imprimir | `apps/api/src/app/api/sala/latest/route.ts` (lê `reports` do dia, não `web_reports`); `pair/redeem` (código público); `apps/api/src/app/sala/[token]/page.tsx` ("Copiar", "Imprimir"); iOS `SalaPairingSheet.swift`. Ver `docs/reviews/2026-09-26-mobile-sala-storyboard.md` |
| Calculadoras | Na Web: TI-RADS, BI-RADS, O-RADS, FIGO, crescimento fetal, percentis do Doppler obstétrico e risco de pré-eclâmpsia; trissomias em validação; IG/DPP avulsa só nos apps; PE não é software certificado pela FMF | `lib/calculators/specs.ts` (nomes); `BiometryGrowthPanel.tsx`; `lib/catalog/dopplerParaCatalogo.ts`; `TrisomyFmfPanel.tsx:57` ("Validação clínica pendente"); parecer da Clínica `docs/reviews/2026-09-28-calculator-marketing-evidence.md` §1, §2, §3, §4 e rodapé obrigatório de PE |
| Fidelidade e cancelamento | Mensal, sem fidelidade, PIX ou cartão; cancelar interrompe a renovação e o acesso segue até o fim do período pago | `apps/web/src/app/terms/page.tsx` §4 (AbacatePay, PIX ou cartão; "Não há fidelidade"; "O cancelamento encerra a renovação; o acesso ao plano permanece até o fim do período já pago") |

## 3. O que o FAQ não afirma (e por quê)

- **"Exportação .docx"**: está anunciada em `Pricing.tsx`, `precos/page.tsx` e `lib/planos.ts`, mas **não achei implementação** em `apps/web`, `apps/api` nem no iOS (só rótulos). **Recomendo que o root/Luiz confirmem** antes de manter esse item nos planos.
- **Número de laudos grátis**: fica fora, conforme o brief; está nos Planos.
- **"Sem cartão"**: não verifiquei o fluxo de cadastro contra cobrança; o FAQ diz só "sem cobrança", que os termos provam.
- **Ditado na Web, celular como entrada da Web, Sala na Web**: dependem do app (em breve), então aparecem só associados aos aplicativos.
- **Certificação FMF, "igual ao app oficial", taxa de detecção, ACOG, "IG pelo CCN"**: vetados pelo parecer da Clínica.
- **Diagnóstico automático, offline, integração, conformidade garantida, LGPD**: sem evidência ou fora do escopo técnico.

## 4. Verificação da implementação

- `pnpm -F @laudousg/web` typecheck (`tsc --noEmit`): **PASS**.
- `next lint` no arquivo: **sem avisos nem erros**.
- Zero travessões longos no TSX e no CSS.
- **Harness isolado:** esbuild + Tailwind da Web + Chromium, fora do Next e fora da 3001, só com a seção.

| Viewport | Itens | Menor altura de `summary` | Overflow | Teclado | JSON-LD | Erros |
|---|---|---|---|---|---|---|
| 1440 | 9 | 64,8 px | 0 | `Tab` foca o próximo `summary` | presente | 0 |
| 390 | 9 | 60 px | 0 | ok | presente | 0 |
| 320 | 9 | 60 px | 0 | ok | presente | 0 |

**Acessibilidade e comportamento:**
- `details`/`summary` nativos, com teclado e leitores de tela sem JS.
- Foco visível com `outline` de 2 px esmeralda; alvos de pelo menos 44 px.
- Transições desligadas em `prefers-reduced-motion`.
- Server Component, sem biblioteca nova.
- Dados estruturados `FAQPage` com o mesmo texto visível.

**Capturas:** `…/scratchpad/faq-harness/faq-1440.png`, `faq-390.png`, `faq-320.png`.

**Pendente para o QA integrado:** posição final entre Planos e CTA; a troca do nav claro/escuro sobre a seção clara; o link `#precos` a partir da coluna esquerda.
