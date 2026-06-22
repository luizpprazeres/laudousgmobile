# RESUME / Handoff — LaudoUSG iOS + Android (2026-06-22)

> Cole no chat após /clear: **"Retomando LaudoUSG. Leia docs/RESUME-2026-06-22-android.md e
> docs/plano-android-playstore.md."** Este doc tem todo o contexto p/ continuar.

## 📱 iOS — EM REVIEW (Apple)
- **LaudoUSG 1.0 (build 145)** → estado **WAITING_FOR_REVIEW**. Sem IAP, blindado (reviews do Dex).
- App ID `6770609540`. Conta Apple = **Individual**. Versão (ASC) id `701ff6fa-c153-4500-9bf2-6c89de1e3495`.
- **ASC API:** Issuer `e0809506-bd5f-4bce-9fff-b3b7e4d65fe6`; Keys: escrita `4TR3NNMW9Q`
  (`~/Downloads/AuthKey_4TR3NNMW9Q.p8`), leitura `FWH8J865A9`. Scripts: `/tmp/asc-*.mjs`.
- Repo iOS `LaudoUSG-app` (main): commits a8fa0c8 (remove IAP), …, ec59621 (hardening). Tudo pushado.
- **Próximo iOS:** aguardar resultado da review (acompanho via API). Conta vira Organization no futuro.

## 🤖 Android (RN Expo) — P0 feito, debugando o build
- App = **`apps/mobile`** (Expo RN 0.76.9, package `com.laudousg.LaudoUSG`). Mesmo backend do iOS.
- **EAS:** owner `luizprazeres`, projectId `8fc7cdda-5340-4c8b-b8eb-2319c71d1639`.
- **P0 commitado** (web-v2, `00b67d8`): excluir conta, tela Sobre/Legal (Termos/Privacidade/Disclaimer),
  disclaimer médico no laudo, telas "em breve" escondidas, permissões reduzidas (só RECORD_AUDIO).
- **🐞 BUG tela branca (RESOLVIDO no código):** o APK abria branco porque o EAS Build não tinha as
  vars `EXPO_PUBLIC_SUPABASE_URL / ANON_KEY / API_URL` (o código faz `throw` se faltarem → crash).
  **Fix:** adicionei o bloco `env` nos profiles `preview` e `production` do `eas.json` (vars públicas).
  **Rebuild disparado:** build `f02b6be2-b6e4-48d2-8d0e-34e89c6b926c` (com env). → CONFIRMAR se ficou
  FINISHED e TESTAR no device (deve abrir login agora).
- **Comandos úteis:**
  - `cd apps/mobile && eas build:list --platform android --limit 1 --json --non-interactive` (status + URL APK)
  - `eas build -p android --profile preview --non-interactive --no-wait` (novo APK de teste)
  - Logado no EAS como `luizprazeres`.
- **APK v1 (bugado, tela branca):** 6dc14420. **APK v2 (com env):** f02b6be2.

## 🏢 Conta / Empresa (bloqueio de publicação)
- **Apps de saúde no Google e na Apple exigem conta Organization.** Hoje ambas = **Individual**.
- **Converter Individual→Organization é na MESMA conta** (apps permanecem; sem transferência). Precisa:
  CNPJ + **D-U-N-S number** (gratuito, serve p/ Google E Apple) + verificar site (`laudousg.com`).
- **MEI bloqueado** (Luiz é sócio de 2 LTDAs: EmergencyMed, Medical Medicina Integrada). Caminho:
  **abrir SLU própria** (recomendado) ou usar uma LTDA (com ressalva de propriedade). Prazo ~1 semana.

## 🛒 Play Console
- App **já criado** (conta Individual). Guia de preenchimento pronto: `/tmp/guia-playstore.html`
  (e valores no `docs/plano-android-playstore.md`). Preencher etapas **1–7 e 9–10**; etapa **8 (Saúde)**
  e **publicação produção** esperam a conta Organization.
- **Google Play Developer API:** quando gerar um **service account JSON** (Play Console → Config →
  Acesso à API → vincular Google Cloud → criar conta de serviço → baixar JSON), passo p/ eu organizar via API.
- Conta demo (Data Safety/App access): `apple-review@laudousg.com` / `apple12345` (banco MOBILE
  `yldtkqrsbgcnwlydrrot`, plano clinic, acesso completo).

## ✅ Próximos passos (ordem)
1. **Confirmar o rebuild `f02b6be2` + testar o APK** no Android (login → ditar → **validar o streaming
   do laudo** ← ponto crítico). Se ainda houver tela branca/erro: rodar `npx expo start` local p/ ver o erro.
2. Commitar o `eas.json` corrigido (feito no fim desta sessão? conferir).
3. **Screenshots + ícone (512²) + feature graphic (1024×500)** do app Android p/ o store listing.
4. **Empresa/CNPJ → D-U-N-S → converter conta p/ Organization** (Google e Apple).
5. Quando Org: subir **AAB** (`eas build -p android --profile production`) → Play Console internal testing → produção.
6. **P1 RN (paridade, depois):** feedback 👍/👎, Consultor IA, UI rica de stages, categorias do backend,
   "Minhas frases", apagar histórico.

## Sticky note de acompanhamento
Nota no canvas medmaestri: **"LaudoUSG — ANDROID / PLAY STORE [painel ao vivo]"**.
