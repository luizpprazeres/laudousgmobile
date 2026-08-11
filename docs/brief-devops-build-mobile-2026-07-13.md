# Brief @devops — build mobile (venoso + callouts + edição incremental)

**Data:** 2026-07-13 · **De:** Claude · **Objetivo:** levar ao device as features acumuladas + ligar as flags.

## TL;DR
Três features prontas esperando build nativo. **São DOIS apps** (iOS = Swift, Android = RN) e as features estão em lugares diferentes. Nada foi pushado (push = @devops).

| Feature | iOS (Swift) | Android (RN) |
|---|---|---|
| Cartografia venosa (render) | ✅ commit `6b5b57e` | ✅ commit `01a5098` |
| Callouts (pílulas) | ✅ commit `7e9138f` | ✅ commit `e462f46` |
| "Ajustar laudo" (edição incremental) | ❌ **falta port Swift** | ✅ commit `60f794c` |

## iOS — app Swift (`laudousg-swift`)
- **Branch:** `feat/venous-scheme-organic` (commits `6b5b57e` render + `7e9138f` callouts). Working tree limpo. Não pushado.
- **Entrega:** cartografia venosa orgânica (CoreGraphics) + callouts.
- **Build imediato (device do Luiz):** Xcode → selecionar iPhone → ⌘R. (Já validado antes; callouts são novos → rebuild mostra.) Backend flag `VENOUS_SCHEME_MAP` JÁ ON.
- **Pendências iOS:** (1) remover FISICAMENTE os arquivos legados de esquema (só repontados); (2) **"Ajustar laudo" NÃO existe no Swift** — precisa de port (Claude faz, como fez o venoso); (3) release TestFlight quando validado.

## Android — app RN (`apps/mobile`)
- **Branch:** `feat/venous-scheme-mobile` (venoso + callouts + Ajustar, todos commitados). Não pushado.
- **Entrega:** cartografia venosa (Skia) + callouts + botão "Ajustar laudo".
- **Build:** EAS/dev build (o módulo nativo **@shopify/react-native-skia 1.5.0** exige prebuild — não roda em Expo Go). `expo export` já validou o bundle.
- **Gotchas de build conhecidos (memória):** usar **pnpm** (não npm) no monorepo; `react-native-svg 15.8.0`; `JAVA_HOME` setado; `autoIncrement` no perfil production do EAS (versionCode); Skia é módulo nativo → prebuild obrigatório.

## Backend / flags (Vercel, projeto `laudousgmobile`)
- `VENOUS_SCHEME_MAP=true` — **JÁ LIGADA** (cartografia venosa emitida no SSE).
- `EDIT_INCREMENTAL` — **OFF**. `POST /api/edit` está na `main` (commit `700762e`) mas responde 404 até ligar. **Ligar SÓ depois** do build com o botão "Ajustar laudo" no device (senão o botão chama um endpoint 404). Padrão de deploy: `printf 'true\n' | vercel env add` + deploy fresco (empty commit via commit-tree sobre origin/main).

## Ordem sugerida
1. **iOS agora:** Luiz rebuilda `feat/venous-scheme-organic` no Xcode → valida venoso + callouts no iPhone.
2. **Claude:** port do "Ajustar laudo" pro Swift (pra o iPhone ter a edição também).
3. **Android:** @devops faz EAS build de `feat/venous-scheme-mobile` → valida no device Android.
4. **Flags:** validado o botão no device → ligar `EDIT_INCREMENTAL` (fresh deploy).
5. **Push/PRs:** @devops sobe os branches (iOS + RN) e abre os PRs.

## Riscos abertos (não-bloqueantes)
- Edição incremental: corrida entre 2 edições simultâneas sem lock (baixo p/ uso sequencial).
- iOS: arquivos legados de esquema ainda não removidos fisicamente.
