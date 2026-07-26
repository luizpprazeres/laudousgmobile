# Plano Apple IAP 100% - LaudoUSG

Objetivo: transformar as 4 assinaturas do grupo "LaudoUSG Planos" de "Faltam metadados" para "Pronto para envio", anexar tudo na próxima versão do app e reduzir o risco de uma terceira rejeição por 3.1.1, 3.1.3(b) ou 5.1.1(v).

Fontes oficiais revisadas:

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Store Connect Help - auto-renewable subscriptions: https://developer.apple.com/help/app-store-connect/manage-subscriptions/overview-of-auto-renewable-subscriptions
- App Store Connect Help - criar assinatura auto-renovável: https://developer.apple.com/help/app-store-connect/manage-subscriptions/create-an-auto-renewable-subscription
- App Store Connect Help - submeter IAP: https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/submit-an-in-app-purchase
- StoreKit 2: https://developer.apple.com/storekit/
- StoreKit Product.products(for:): https://developer.apple.com/documentation/storekit/product/products(for:)
- StoreKit Transaction.currentEntitlements: https://developer.apple.com/documentation/storekit/transaction/currententitlements
- StoreKit AppStore.sync(): https://developer.apple.com/documentation/storekit/appstore/sync()

## 1. O que as guidelines exigem de fato

3.1.1 - In-App Purchase:

- Conteúdo digital, recursos pagos, créditos, funcionalidades premium e assinaturas consumidas dentro do app precisam usar IAP da Apple.
- O app não pode empurrar o usuário para compra externa com botão, link, CTA, texto de preço externo ou fluxo que substitua o IAP.
- Links de Termos e Privacidade são aceitáveis; link/botão para comprar no site não é aceitável.
- Para assinatura, o usuário precisa conseguir comprar dentro do app e restaurar compras.

3.1.3(b) - Multiplatform Services:

- Pode liberar no iOS o acesso comprado fora do app quando o serviço também existe em outras plataformas.
- Isso não autoriza direcionar o usuário a comprar fora do app. O tom correto é "acesso existente", "restaurar", "atualizar acesso", nunca "assine pelo site".
- Para o LaudoUSG, o backend/web pode continuar valendo, mas o app iOS precisa oferecer assinatura via IAP para recursos pagos usados no iOS.

5.1.1(v) - Account deletion:

- Se o app permite criar conta, precisa permitir iniciar exclusão de conta dentro do app.
- Não basta "desativar", "sair", "mandar email" ou abrir um site para pedir exclusão.
- Pode haver retenção legal mínima quando aplicável, mas o app precisa deixar claro o que será apagado e executar o fluxo no app.

Conclusão prática: a correção de código parece no caminho certo. O bloqueio atual é operacional no App Store Connect: os 4 produtos ainda não estão prontos para envio, então o reenvio do build sem resolver isso tende a gerar nova rejeição de IAP.

## 2. Revisão do código IAP atual

Achado principal: o código iOS está coerente com 3.1.1. O risco maior não é o código de compra, é o cadastro remoto dos produtos no App Store Connect e a visibilidade para o revisor.

Evidência no código:

- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Services/StoreManager.swift:23` a `:27`: os 4 Product IDs batem com o escopo informado:
  - `com.laudousg.LaudoUSG.essential.monthly`
  - `com.laudousg.LaudoUSG.essential.yearly`
  - `com.laudousg.LaudoUSG.pro.monthly`
  - `com.laudousg.LaudoUSG.pro.yearly`
- `StoreManager.swift:73` a `:85`: produtos são carregados por `Product.products(for:)`.
- `StoreManager.swift:88` a `:100`: entitlement local vem de `Transaction.currentEntitlements`, ignorando revogado/upgrade.
- `StoreManager.swift:106` a `:133`: compra usa `product.purchase()`, valida transação, finaliza, sincroniza com backend e atualiza entitlement.
- `StoreManager.swift:136` a `:143`: restore existe e chama `AppStore.sync()`.
- `StoreManager.swift:53` a `:57`: tier IAP mapeia `.pro` acima de `.essential`.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Core/AppState.swift:21` a `:41`: `effectiveTier` usa o maior entre backend e IAP. Isso é correto para 3.1.3(b), desde que o app continue vendendo via IAP.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Features/Paywall/PaywallSheet.swift:51` a `:57`: paywall carrega produtos e pré-seleciona plano.
- `PaywallSheet.swift:130` a `:141`: mostra trial/preço/período vindos do StoreKit.
- `PaywallSheet.swift:158` a `:183`: botão "Assinar" compra via Apple.
- `PaywallSheet.swift:188` a `:193`: "Restaurar compras" está visível.
- `PaywallSheet.swift:216` a `:218`: links externos são Termos/Privacidade, não compra.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Features/Generate/GenerateView.swift:153` a `:162`: Consultor IA fica visível e abre paywall para usuário sem plano. Isso ajuda o revisor a encontrar o IAP.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Features/Settings/SettingsView.swift:126` a `:140`: há entrada direta de Assinatura e Restaurar compras em Preferências.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG.storekit`: os 4 produtos têm preço, localização pt_BR e trial de 1 semana localmente. Isso é só ambiente local; precisa repetir no App Store Connect.

Ponto de atenção baixo/médio:

- `PaywallSheet.swift:198` a `:205`: o botão "Já assino - atualizar acesso" é defensável por 3.1.3(b), mas pode ser lido como referência a assinatura fora da Apple. Eu trocaria o texto para "Atualizar acesso existente" ou "Sincronizar acesso" antes da submissão, sem citar web/site. Não é bloqueador se as notas explicarem, mas é fácil reduzir ruído.

## 3. Revisão do delete account

O requisito 5.1.1(v) parece coberto no app:

- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Features/Settings/SettingsView.swift:105` a `:123`: Preferências > Conta > "Excluir minha conta".
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Features/Settings/DeleteAccountView.swift:39` a `:48`: tela informa o que será apagado.
- `DeleteAccountView.swift:68` a `:83`: exige confirmação digitando `EXCLUIR`.
- `DeleteAccountView.swift:178` a `:193`: executa exclusão no app.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Services/AuthService.swift:379` a `:381`: chama `DELETE /api/me/delete-account` e encerra sessão.

Risco remanescente: o revisor precisa conseguir logar e achar esse caminho. Colocar explicitamente nas Review Notes: "Delete account: Preferencias > Conta > Excluir minha conta > digitar EXCLUIR".

## 4. Passo a passo exato no App Store Connect

Antes de mexer nos produtos:

1. Confirmar em Agreements, Tax, and Banking que contratos pagos estão ativos. Se contrato/banco/imposto estiver pendente, os produtos podem não carregar para revisão mesmo com metadata pronta.
2. Usar exatamente os Product IDs do código. Não criar variações com outro bundle ou letras diferentes.
3. Usar o mesmo grupo para todos: "LaudoUSG Planos".
4. Como são assinaturas auto-renováveis mutuamente exclusivas, manter os 4 produtos no mesmo subscription group.

No App Store Connect:

1. Abrir My Apps > LaudoUSG > Monetization ou Features > Subscriptions.
2. Abrir o grupo "LaudoUSG Planos".
3. Preencher a localização do GRUPO:
   - Locale: Portuguese (Brazil) / pt-BR.
   - Subscription Group Display Name: `LaudoUSG Planos`.
   - Esse campo é cliente-facing e costuma ser esquecido. Sem ele, o grupo pode manter produtos como metadata incompleta.
4. Revisar a ordem/nível dos produtos dentro do grupo:
   - Profissional Mensal e Profissional Anual devem ficar acima do Essencial, porque Pro é tier superior.
   - Essencial Mensal e Essencial Anual no nível inferior.
   - Isso reduz risco de upgrade/downgrade/crossgrade confuso.

Para cada uma das 4 assinaturas, abrir o produto e preencher tudo abaixo.

Produto 1: `com.laudousg.LaudoUSG.essential.monthly`

- Reference Name: `Essencial Mensal`.
- Duration: 1 month.
- Price: usar o preço comercial final; no StoreKit local está `99.90`.
- Availability: Brasil e demais países pretendidos. Se for lançar só Brasil agora, limitar a Brasil reduz variáveis.
- Localization pt-BR:
  - Display Name: `Essencial Mensal`.
  - Description: `Até 800 laudos por mês com IA.`
- Introductory Offer:
  - Type: Free Trial.
  - Duration: 1 week / 7 days.
  - Eligibility: new subscribers.
  - Start date: hoje ou data de disponibilidade; sem end date se a estratégia for manter trial.
- Review Screenshot:
  - Subir screenshot real do paywall no iPhone, com esse produto visível, preço visível, "7 dias grátis" visível, botão "Assinar" e "Restaurar compras".
  - Não usar PHI, dados de paciente, laudo real ou texto clínico identificável.
- Review Notes do produto:
  - `Open Settings > Assinatura or generate a sample report > + > Consultor IA to view the paywall. Purchase uses Apple In-App Purchase. Restore is available on the paywall and in Settings.`

Produto 2: `com.laudousg.LaudoUSG.essential.yearly`

- Reference Name: `Essencial Anual`.
- Duration: 1 year.
- Price: usar o preço comercial final; no StoreKit local está `1019.90`.
- Localization pt-BR:
  - Display Name: `Essencial Anual`.
  - Description: `Até 800 laudos por mês com IA.`
- Introductory Offer: Free Trial, 1 week / 7 days, new subscribers.
- Review Screenshot: o mesmo screenshot do paywall serve se o produto anual estiver visível; melhor ainda se aparecer selecionável na lista.
- Review Notes iguais ao Produto 1.

Produto 3: `com.laudousg.LaudoUSG.pro.monthly`

- Reference Name: `Profissional Mensal`.
- Duration: 1 month.
- Price: usar o preço comercial final; no StoreKit local está `159.90`.
- Localization pt-BR:
  - Display Name: `Profissional Mensal`.
  - Description: `Laudos ilimitados e Consultor IA.`
- Introductory Offer: Free Trial, 1 week / 7 days, new subscribers.
- Review Screenshot: paywall com plano Pro visível.
- Review Notes iguais ao Produto 1.

Produto 4: `com.laudousg.LaudoUSG.pro.yearly`

- Reference Name: `Profissional Anual`.
- Duration: 1 year.
- Price: usar o preço comercial final; no StoreKit local está `1629.90`.
- Localization pt-BR:
  - Display Name: `Profissional Anual`.
  - Description: `Laudos ilimitados e Consultor IA.`
- Introductory Offer: Free Trial, 1 week / 7 days, new subscribers.
- Review Screenshot: paywall com plano Pro anual visível.
- Review Notes iguais ao Produto 1.

Depois de salvar cada produto:

1. Voltar à lista do grupo e confirmar que cada assinatura saiu de "Faltam metadados".
2. O alvo é "Pronto para envio" / "Ready to Submit".
3. Se algum continuar "Faltam metadados", abrir o produto e procurar especificamente: localization, screenshot de review, preço, disponibilidade, oferta introdutória e localização do grupo.

## 5. Anexar as assinaturas à versão

Este é o ponto que mais causa re-rejeição na primeira submissão de IAP.

1. Ir em My Apps > LaudoUSG > App Store > iOS App > versão que será reenviada.
2. Abrir a seção "In-App Purchases and Subscriptions" da versão.
3. Clicar em Add e selecionar as 4 assinaturas:
   - `com.laudousg.LaudoUSG.essential.monthly`
   - `com.laudousg.LaudoUSG.essential.yearly`
   - `com.laudousg.LaudoUSG.pro.monthly`
   - `com.laudousg.LaudoUSG.pro.yearly`
4. Confirmar que as 4 aparecem anexadas na página da versão antes de enviar.
5. Submeter o build 147+ e os 4 IAPs juntos. Para primeira submissão de IAP, não confiar que "Ready to Submit" sozinho basta.

Critério de pronto antes de clicar Submit for Review:

- Build novo selecionado.
- 4 assinaturas em "Ready to Submit".
- 4 assinaturas anexadas à versão.
- Trial remoto de 7 dias configurado nos 4 produtos, batendo com o texto do app.
- Screenshot de review presente nos 4 produtos.
- Grupo com localização preenchida.
- Contrato/banco/imposto ativo.
- Review Notes preenchidas com login, caminho do paywall, restore e delete account.

## 6. Review Notes recomendadas

Texto sugerido em inglês para App Review:

```
LaudoUSG is a medical productivity app for physicians to dictate ultrasound findings and generate draft reports.

Demo account:
Email: [criar conta reviewer dedicada]
Password: [senha temporaria]

In-App Purchase:
The app offers auto-renewable subscriptions using Apple In-App Purchase.
To see the paywall:
1. Log in with the demo account.
2. Open Settings > Assinatura; or
3. Generate/open a sample report, tap the + menu, then tap Consultor IA.
The paywall shows all subscription plans, 7-day free trial, Apple purchase button, and Restore Purchases.

Existing web subscribers:
The app may recognize an existing account subscription for multiplatform access, but all new iOS purchases are available through Apple In-App Purchase.

Account deletion:
Go to Settings > Conta > Excluir minha conta. Type EXCLUIR to confirm. The app calls the account deletion endpoint and signs the user out.

No patient-identifying data is required for review.
```

Não usar a conta pessoal de dev como conta de revisão, se der para evitar. Criar uma conta dedicada `reviewer+apple@...` ou equivalente, sem dados reais, com onboarding completo e plano gratuito. O revisor precisa ver o paywall; se a conta já for Pro pelo backend, ele pode não conseguir testar compra.

## 7. Testes antes da submissão

Fazer estes testes em build TestFlight ou build local com StoreKit/Sandbox antes de reenviar:

1. Conta gratuita:
   - Login funciona.
   - Preferências > Assinatura abre paywall.
   - O paywall carrega os 4 produtos remotos. Se carregar vazio em TestFlight/Sandbox após os produtos estarem "Ready to Submit", há problema de ASC/contrato/Product ID.
   - Preço e período aparecem.
   - Trial aparece como 7 dias.
   - "Assinar" abre sheet nativa da Apple.
   - Cancelar compra não quebra UI.
2. Compra Sandbox:
   - Comprar Pro mensal.
   - Consultor IA libera imediatamente.
   - AppState mostra plano efetivo Pro.
   - Backend recebe validação best-effort; se backend falhar, entitlement local ainda libera, como previsto em `StoreManager.swift:153` a `:161`.
3. Restore:
   - Apagar/reinstalar app ou usar outro login Apple Sandbox com compra ativa.
   - Clicar "Restaurar compras" no paywall e em Preferências.
   - Confirmar liberação do recurso.
4. Delete account:
   - Preferências > Conta > Excluir minha conta.
   - Confirmar com `EXCLUIR`.
   - Verificar logout e impossibilidade de usar a sessão antiga.
5. Reviewer path:
   - Com a conta demo gratuita, em menos de 60 segundos o revisor precisa encontrar paywall e delete account sem instrução ambígua.

## 8. Riscos reais de nova rejeição

ALTO - IAP não anexado à versão:

Mesmo com produtos "Ready to Submit", a primeira revisão de IAP costuma exigir anexar os produtos à versão do app. Correção: adicionar os 4 na seção "In-App Purchases and Subscriptions" da versão antes de submeter.

ALTO - produto continua "Faltam metadados":

Geralmente falta um destes: localização do produto, screenshot de review, preço/disponibilidade, review notes, oferta introdutória ou localização do grupo. Correção: abrir cada produto e preencher todos; depois voltar à lista e confirmar "Ready to Submit".

ALTO - conta demo não vê paywall:

Se a conta demo tiver plano backend Pro, `effectiveTier` vai liberar recurso e o revisor pode não ver a compra. Correção: conta demo deve ser gratuita, mas com onboarding pronto; caminho do paywall via Preferências > Assinatura continua visível.

MÉDIO - "Já assino - atualizar acesso" gerar ruído 3.1.1:

O conceito é permitido por 3.1.3(b), mas a frase pode parecer compra externa. Correção concreta: trocar para "Atualizar acesso existente" ou "Sincronizar acesso", sem citar site/web/preço externo.

MÉDIO - trial anunciado no app e não configurado no ASC:

O app mostra trial pelo StoreKit remoto (`PaywallSheet.swift:262` a `:268`) e também tem frase fixa no header (`PaywallSheet.swift:67` a `:71`). Se o ASC não tiver trial, a tela pode ficar contraditória. Correção: configurar trial de 7 dias nos 4 produtos antes da submissão. Melhor ainda: futuramente remover o texto fixo ou condicionar ao StoreKit remoto.

MÉDIO - contratos pagos pendentes:

Se Paid Applications Agreement, Tax ou Banking estiver pendente, produtos podem não carregar. Correção: validar isso antes de testar.

MÉDIO - delete account escondido nas notas:

O código existe, mas a Apple rejeita se o revisor não encontrar. Correção: colocar o caminho exato nas Review Notes.

BAIXO - screenshots de review ruins:

Screenshot com PHI, tela errada, produto não visível ou paywall vazio pode atrasar aprovação. Correção: screenshot limpo do paywall real, com preço, trial, botão Assinar e Restaurar.

## 9. Sequência recomendada para passar na primeira re-submissão

1. No código, antes do archive, considerar trocar "Já assino - atualizar acesso" para "Atualizar acesso existente". É uma micro mudança que reduz ruído de 3.1.1.
2. Criar conta demo gratuita dedicada para Apple, sem plano Pro/Essential no backend.
3. Completar o grupo "LaudoUSG Planos" no ASC, incluindo localização do grupo.
4. Completar os 4 produtos, incluindo localização pt-BR, preço, disponibilidade, screenshot de review e trial 7 dias.
5. Confirmar status "Ready to Submit" nos 4 produtos.
6. Subir novo build.
7. Abrir a versão nova no ASC e anexar os 4 IAPs na seção de In-App Purchases and Subscriptions.
8. Preencher Review Notes com login, caminho paywall, restore, delete account e observação de multiplataforma.
9. Testar TestFlight/Sandbox com conta gratuita e compra/restauração.
10. Só então clicar Submit for Review.

Veredito: não vejo bloqueador clínico/técnico no código IAP atual. O plano de aprovação depende de completar 100% do cadastro remoto dos 4 IAPs, anexar os produtos à versão e deixar o revisor enxergar paywall + restore + delete account sem depender de descoberta.
