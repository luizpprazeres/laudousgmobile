# Roteiro: teste real de assinatura (IAP) no iPhone — 14/09/2026

Objetivo: provar de ponta a ponta, uma única vez, que comprar, restaurar, renovar e
cancelar uma assinatura no app iOS chega ao backend e ao banco. Hoje a tabela
`subscriptions` tem **zero linhas**: nunca houve uma compra real ou sandbox.

Quem faz o quê: **você** toca no iPhone e manda um print por etapa. **Eu** confiro,
em tempo real, o banco (`subscriptions`, `profiles`), os logs do backend na Vercel
(`/api/iap/validate-receipt` e `/api/iap/notifications`) e te digo se passou.

Nada aqui gera cobrança: compras feitas pelo TestFlight usam o ambiente sandbox da
Apple automaticamente, com a sua própria Conta Apple, sem cartão.

---

## 0. Antes de começar (5 min, só você)

| # | O que fazer | Por quê |
|---|---|---|
| 0.1 | No iPhone, abra o app **TestFlight** e confirme que o **LaudoUSG 1.0 (190)** aparece no grupo "Beta Médicos". Se não estiver instalado, toque em **Instalar**. Se o iPhone tiver o LaudoUSG da App Store ou um build de desenvolvimento (Xcode) instalado, o TestFlight **substitui**; tudo bem. | O teste precisa ser no pacote assinado pela Apple, não no build do Xcode. |
| 0.2 | Ajustes › **App Store** › role até o fim › **Conta Sandbox**: se houver uma conta sandbox antiga logada aí, toque nela e **saia**. Deixe vazio. | Com o campo vazio, o TestFlight usa a sua Conta Apple normal em modo sandbox. Não precisa criar Sandbox Tester para este teste. |
| 0.3 | Tenha em mãos um **e-mail novo** que você controla (ex.: `luizp02121+iap1@gmail.com`; o Gmail entrega no mesmo inbox). | A conta `luizp02121@gmail.com` está na lista `BETA_TESTER_EMAILS` do backend e aparece como plano Pro **sem compra**. Com ela eu não consigo distinguir compra real de override. Precisa ser uma conta LaudoUSG nova. |

---

## 1. Conta de teste no app (3 min)

1. Abra o **LaudoUSG** (ícone do TestFlight tem um ponto laranja ao lado do nome).
2. Toque em **Criar conta** e cadastre com o e-mail novo (`+iap1`). Confirme o e-mail se o app pedir.
3. Aceite Termos 2.0, Privacidade 2.1 e Disclaimer 2.0.
4. Na tela de permissão de IA, toque em **Agora não**.
5. **Print 1:** tela inicial do app logado com a conta nova (Gerar).

Eu confiro: a conta nova existe em `profiles` com `plan = free`.

---

## 2. Catálogo de planos (2 min)

1. Toque no **Menu (☰)** › **Preferências** › seção **Assinatura** › **Assinar**.
2. Espere carregar. Devem aparecer **4 planos**: Essencial Mensal (R$ 99,90), Essencial Anual (R$ 1.019,90), Profissional Mensal (R$ 159,90), Profissional Anual (R$ 1.629,90), com o texto de trial se houver.
3. **Print 2:** o paywall com os 4 planos e preços.

Se aparecer **"Não foi possível carregar os planos"**: toque em **Tentar novamente** uma vez; se persistir, print e me avise. É o mesmo sintoma que o Codex viu no simulador (catálogo vazio) e ainda não foi confirmado no aparelho físico.

---

## 3. Compra (3 min)

1. No paywall, selecione **Essencial Mensal** (o mais barato; em sandbox o mês renova a cada 5 minutos, o que nos deixa testar renovação em seguida).
2. Toque em **Assinar** (ou "Começar …" se houver trial).
3. Vai abrir a folha de pagamento da Apple. Pode aparecer a etiqueta **[Environment: Sandbox]** ou o preço normal com "Não será cobrado" — ambos são normais. Confirme com Face ID / senha da Conta Apple.
4. **Print 3a:** a folha da Apple ANTES de confirmar (mostrando produto e ambiente).
5. **Print 3b:** a tela do app DEPOIS da confirmação. Esperado: o paywall fecha e em Preferências › Assinatura aparece o plano **Essencial** ativo.

Se o app mostrar **"A App Store confirmou a compra, mas não foi possível vinculá-la à conta LaudoUSG"**: NÃO compre de novo. Print e me avise; é exatamente o cenário que o backend recusou e eu preciso ver o motivo no log.

Eu confiro (em até 1 min): linha nova em `subscriptions` com `product_id = com.laudousg.LaudoUSG.essential.monthly`, `environment = Sandbox`, `status` ativo, `app_account_token` = id da conta nova; `profiles.plan` da conta nova virou `essencial`; log do `validate-receipt` com aceite; e a notificação **SUBSCRIBED** da Apple chegando em `/api/iap/notifications`.

---

## 4. Restaurar na mesma conta (1 min)

1. **Menu › Preferências › Assinatura › Restaurar compras**.
2. Se a Apple pedir login, use a mesma Conta Apple.
3. **Print 4:** a mensagem que o app mostrar. Esperado: **"Assinatura restaurada."**

---

## 5. Restaurar em OUTRA conta LaudoUSG (3 min)

Este é o teste de segurança: a assinatura pertence à conta `+iap1`; outra conta não pode herdá-la.

1. **Menu › Preferências › Sair**.
2. Entre com a conta demo `luizp02121@gmail.com` (senha de sempre).
3. **Menu › Preferências › Assinatura › Restaurar compras**.
4. **Print 5:** esperado a mensagem **"Erro: a assinatura desta conta Apple pertence a outra conta LaudoUSG. Entre com a conta usada na compra."**
5. Saia e entre de novo com a conta `+iap1`.

Eu confiro: nenhuma linha nova em `subscriptions`; o backend recusou com 4xx no log.

---

## 6. Renovação automática (espera de 6 a 12 min, sem tocar em nada)

Em sandbox, a assinatura mensal renova a cada **5 minutos**, até 6 vezes, e depois expira sozinha. Não precisa fazer nada: eu fico observando as notificações **DID_RENEW** chegarem e o `expires_at` avançar no banco. Te aviso quando a primeira renovação for registrada. Você pode ir fazendo o protocolo da FMF nesse intervalo.

---

## 7. Cancelar (2 min)

1. Ajustes do iPhone › **App Store** › **Conta Sandbox** (agora deve aparecer a sua Conta Apple ali) › **Gerenciar** › assinatura **LaudoUSG** › **Cancelar assinatura**. Se esse caminho não existir na sua versão do iOS, use Ajustes › [seu nome] › Assinaturas.
2. **Print 7:** a tela mostrando a assinatura cancelada (com data de término).
3. Volte ao app: **Menu › Preferências › Assinatura**. O plano continua ativo até o fim do ciclo de 5 min e depois cai.

Eu confiro: notificação **DID_CHANGE_RENEWAL_STATUS** e, após o ciclo, **EXPIRED**; `subscriptions.status` muda e `profiles.plan` volta para `free`.

---

## 8. Limpeza (opcional, 1 min)

Se quiser, exclua a conta `+iap1` pelo app: **Menu › Preferências › Excluir conta** (duas etapas de confirmação). Ou deixe; eu posso apagar depois.

---

## Resumo do que eu preciso receber

| Print | Tela | O que confirma |
|---|---|---|
| 1 | App logado com a conta nova | conta de teste criada |
| 2 | Paywall com 4 planos | catálogo StoreKit funciona no aparelho |
| 3a | Folha da Apple antes de confirmar | produto e ambiente sandbox |
| 3b | App após a compra | fluxo de compra + validate-receipt |
| 4 | Mensagem do Restaurar (mesma conta) | restauração |
| 5 | Mensagem do Restaurar (outra conta) | vínculo de conta protegido |
| 7 | Assinatura cancelada nos Ajustes | cancelamento / notificações |

Pode mandar os prints aqui no chat conforme for fazendo; não precisa esperar juntar todos.
