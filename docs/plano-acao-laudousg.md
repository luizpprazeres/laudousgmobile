# Plano de Ação LaudoUSG — guia operacional (foco iOS/Swift)

> **Autor:** Claude (braço direito / dev principal). **Data:** 2026-06-24.
> **Missão:** plataforma cada vez mais completa, mais precisa, com menos bugs. Prioridade: **app Swift (iOS)** + destravar a App Store.
> **Modo de trabalho:** autônomo. Decido sozinho sempre que for decisão técnica; só chamo o Luiz para decisões de **negócio/irreversíveis** (ex: submeter à Apple, preço, escopo de produto). Mesmo aguardando resposta dele, mantenho frentes paralelas rodando.

---

## 🎯 P0 — APROVAÇÃO NA APP STORE (destrava tudo)

Rejeição build 145 (REJECTED), 3 issues:

### Issue 1 — Botão de permissão (5.1.1(iv)) ✅ RESOLVIDO
- `MicPermissionStep.swift:54`: `"Permitir microfone"` → **`"Continuar"`** (ícone `arrow.right`). Feito.
- Verificar se há outros botões de pré-permissão com texto indutor (câmera, etc.).

### Issue 2 + 3 — Subscription/IAP (2.1(b) e 2.1)
**Diagnóstico:** o app **não implementa pagamento** (zero StoreKit/RevenueCat/AbacatePay). O paywall é decorativo (`PaywallSheet`: "Acesso restrito — Já tenho acesso, atualizar") e os planos vêm do backend. A Apple não rejeitou por "faltar IAP" — rejeitou por **mencionar** assinatura/upgrade **sem** IAP.

**Decisão técnica (minha recomendação forte): OPÇÃO A — remover referências a compra.** Modelo "app grátis, conta gerenciada externamente" (igual Netflix/Spotify) — 100% permitido pela Apple. Monetização segue na web/AbacatePay (fora do app). Aprova rápido, sem perder receita (não há receita iOS hoje), sem dar 30% pra Apple. A **Opção B (IAP nativo via StoreKit + ASC)** fica como roadmap futuro se quisermos vender dentro do iOS.

**Execução da Opção A (gating mantido pelo backend, mas invisível — sem venda):**
1. ✅ Botão permissão (Issue 1).
2. **Consultor IA** (`GenerateView.swift:120-127` + `PlusSheet.swift:412`): em vez de abrir `PaywallSheet` para não-`hasPro`, **esconder o botão** para quem não tem o plano. (gating sem paywall)
3. **Tour pós-onboarding** (`AppShellView.swift:74-91`): remover o trigger do `isPostTourPaywallPresented`.
4. **Tour** (`TourFlowView.swift:62-69`): neutralizar a página que vende o Consultor como premium (descrever como feature comum, sem "acesso restrito").
5. **PaywallSheet.swift**: deixar inerte (sem referências) — não remover o arquivo pra facilitar a Opção B futura.
6. `Settings`/`Menu` mostram "Plano: X" → manter (é status, não compra) — reavaliar se a Apple insistir.
7. **Resposta à Apple** (reply no ASC): "removemos as referências a assinatura; o app não possui compras in-app; o acesso a recursos é gerenciado pela conta do usuário. Não há subscription, portanto não se aplica demo account com subscription expirada."
8. Conta de review (`apple-review@laudousg.com`) deve estar com plano **clinic/pro** no backend iOS → Apple vê o Consultor funcionando, sem paywall.

**Gate de submissão:** só **submeto à Apple após OK do Luiz** (ação outward-facing). Enquanto isso, implemento e deixo a build pronta.

---

## 🚑 P0.5 — MSK: corpo ecoa diagnóstico (URGENTE, grande volume)

Teste real do Luiz (01/07): ditado só-diagnóstico ("Tendinopatia da pata de ganso",
"fasciite plantar") → o **corpo** do laudo saiu com o **diagnóstico** em vez da
**descrição ecográfica**. Causa-raiz comprovada (rodei o renderer V2 no mesmo input):
o médico dita só o diagnóstico, sem morfologia, e nem o writer nem o renderer têm de
onde tirar o corpo → ecoam o diagnóstico. É padrão MUITO comum em MSK ⇒ alto impacto.

**Solução:** biblioteca de **morfologia canônica** (diagnóstico → descrição de corpo),
o código dono do corpo quando o médico não descreve; preserva a redação quando descreve.
✅ **IMPLEMENTADO + LIVE (PR #10)** — o renderer MSK_V2 JÁ estava ativo em prod (o `.env`
local com 10 categorias estava defasado; prod tem 13). **Plano completo:
`docs/plano-msk-2026-07-01.md`.** MSK é backend (`laudousgmobile-def`), não Swift, mas
entra aqui como P0.5 por volume/criticidade.

### Revisão ultrathink de TODAS as categorias (qualidade = prioridade máxima)
Auditar cada categoria: tem renderer? qual a qualidade? falta algo? falta categoria? quais
elementos determinísticos? **Maior gap = eixo vascular Doppler** (renal 57, venoso MMII 37,
arterial MMII 16, carótidas) sem renderer; e 3 renderers prontos mas DESLIGADOS
(DOPPLER_OBSTETRICO 232!, MSK 45, próstata 37). **Plano + matriz completa:
`docs/plano-revisao-categorias-2026-07-01.md`.**

### Categoria coringa (multi-laudo simultâneo, orb multicolor)
Mesmo paciente, vários exames de uma vez: segmenta o ditado, identifica categorias (RAG),
levanta elementos determinísticos e gera todos os laudos encadeados. Reusa os renderers por
categoria (orquestrador). **Já no plano** (`plano-acao-boletins-2026-06-29.md` P5.C +
`plano-revisao-categorias-2026-07-01.md` §5). Decisão do Luiz: implementar DEPOIS das correções.

---

## 🔍 P1 — QUALIDADE DO APP SWIFT (acertar mais, errar menos)

Auditorias contínuas (uso agentes Explore; quando o medmaestri/Dex voltar ao PATH, delego review adversarial). Para cada achado: file:line + severidade + correção sugerida; corrijo os de baixo risco, levo ao Luiz os de decisão.

Áreas a auditar (ordem):
1. **Geração de laudo / SSE** (`ReportService`, `GenerateViewModel`) — robustez de erros, edge cases.
2. **Voz / Deepgram** (`DeepgramLiveService`) — reconexão, vazamentos, interrupções.
3. **Auth / sessão** (`AuthService`, `APIClient`) — refresh de token, 401, expiração.
4. **Estados de UI** — empty/error/loading, textos, acessibilidade.
5. **Concorrência** — `@MainActor`, race conditions.

---

## 🤖 P2 — ANDROID RN (paridade; secundário agora)
- **Login fix** (elevation no foco) — APK via EAS em validação no device do Luiz.
- Build local Android com hot-reload — bloqueado por deps do monorepo (expo-font/svg dessincronizados). Retomar com `pnpm` overrides se valer; senão, seguir via APK EAS.
- Próximas telas (generate etc.) — só com validação no device.

---

## 🛠️ INFRA / FERRAMENTAS
- **ASC API**: keys em `~/Downloads/AuthKey_{4TR3NNMW9Q,FWH8J865A9}.p8`; scripts `/tmp/asc-*.mjs` (status/review/set). Uso pra: ler estado da review, responder, gerenciar versão/build, (Opção B) criar IAPs.
- **Build iOS**: Xcode local funciona pro Swift (`xcodebuild`, derivedData em /tmp). Simulador iPhone 17 Pro Max booted.
- **Build Android**: EAS (toolchain confiável) > local (problemático).

---

## ⏸️ PONTOS DE DECISÃO (Luiz) — com fallback pra eu não travar
| # | Decisão | Recomendação | Enquanto aguardo |
|---|---|---|---|
| D1 | Estratégia monetização iOS: **A (remover refs)** vs B (IAP nativo) | **A** | Implemento A (reversível) + audito Swift |
| D2 | Consultor IA p/ free: esconder vs abrir | **esconder** (mantém pro) | Implemento esconder |
| D3 | Submeter build à Apple | — (aguarda OK) | Deixo build pronta + sigo P1 |

---

## ▶️ FILA DE EXECUÇÃO AUTÔNOMA (próximos passos)
1. ✅ Fix botão permissão.
2. Implementar Opção A no Swift (esconder Consultor p/ free, remover triggers de paywall, neutralizar tour).
3. Compilar Swift (validar que não quebrou) + verificar outros botões de pré-permissão.
4. Auditar P1 (área 1: geração de laudo) → resumo com correções.
5. (paralelo) Validar login Android no device quando APK instalar.
6. Preparar nova build iOS (build 146) — **aguardar OK do Luiz pra submeter**.
