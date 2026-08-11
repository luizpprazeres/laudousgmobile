# Runbook — Onboarding de Beta Tester Android (conta + plano pro + convite com QR)

> Criado: 2026-07-07 (testador nº 1: Dr. Angelo Monteiro). Repetir para cada novo testador do teste da Play Store.
> Pré-requisito: `apps/api/.env.local` com SUPABASE_URL + SERVICE_ROLE + ANON (já existe).

## Inputs por testador
- Nome completo (ex.: "Angelo Monteiro"), e-mail Google (precisa ser conta Google p/ Play), CRM (ex.: "CRM-AL 9446"), senha combinada.

## Passo 1 — Criar conta com plano pro

```bash
node apps/api/scripts/create-beta-tester.mjs "email@gmail.com" "senha" "Nome Completo" "CRM-UF 0000"
```

O script (Admin API oficial — NUNCA SQL em `auth.users`, ver `auth-account-provisioning.md`):
1. `admin.auth.admin.createUser` com `email_confirm: true` e metadata `{name, crm}` (não há coluna CRM no banco);
2. atualiza `public.profiles` → `name` + `plan='pro'` (durável, sem redeploy — NÃO usa a whitelist BETA_TESTER_EMAILS);
3. valida com login real (anon key) — audita o bug GoTrue de colunas NULL.

**Teste fim-a-fim** (produção, mesma API do app):
```bash
# token via password grant + GET /api/me/profile → esperar "plan": "pro"
curl -sS "https://laudousgmobile.vercel.app/api/me/profile" -H "Authorization: Bearer $TOKEN"
```

## Passo 2 — Play Console (manual, Luiz)
Testes → Teste interno → Testadores → **adicionar o e-mail à lista**. Sem isso o link diz "não disponível".
Link de opt-in do teste interno: `https://play.google.com/apps/internaltest/4701332668837293138`

## Passo 3 — Convite personalizado com QR

1. **Arte via gpt-image-2** (endpoint `images/edits`, com a logo `apps/mobile/assets/brand/expo/logo-laudousg-transparent.png` como imagem de referência, `size=1024x1536, quality=high`). Prompt validado (trocar só o nome do médico): convite de papelaria fina, off-white + verdes #065F46/#059669, wordmark LaudoUSG, "CONVITE EXCLUSIVO", nome grande em serifa, parágrafo "Você foi selecionado para conhecer, antes de todos, o novo aplicativo de laudos de ultrassom por ditado.", destaque "1 mês de plano Profissional — cortesia", 3 passos ("Aponte a câmera para o código / Instale o LaudoUSG / Entre e dite seu primeiro laudo"), e **QUADRADO BRANCO VAZIO com borda verde na parte inferior central (~24% da largura)** para receber o QR real. Sem inglês, sem jargão, sem pessoas.
2. **QR REAL por código** (nunca deixar a IA desenhar QR): lib npm `qrcode` → PNG 512px, errorCorrectionLevel H, com a URL do teste.
3. **Compor** o QR sobre o quadrado branco com `sharp` (redimensionar ~250px, posicionar pelo centro do quadrado).
4. **Validar decodificando da imagem final** com `jsqr` + `pngjs` — precisa devolver a URL exata.
5. Entregar PNG ao Luiz (SendUserFile) + credenciais (`email` / senha) para mandar junto.

## Observações
- Plano `pro` fica para sempre; Luiz ajusta a duração manualmente depois se quiser.
- Meta: **12 testadores**. O requisito Google 12×14 dias conta em faixa de teste **FECHADO** — com os 12 recrutados, promover a versão para faixa fechada e migrar todos.
- Exemplo completo do testador nº 1 na sessão de 07/07 (convite `convite-angelo-monteiro.png`).
