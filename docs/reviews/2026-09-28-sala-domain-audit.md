# Sala: auditoria de domínio e plano de migração

Auditoria read-only em 28/09/2026. Nenhum DNS, alias, environment, deployment ou registro clínico alterado. Checkout `feat/landing-scrollytelling`, HEAD `5a8a6a04defc7011c4e06b3538ecf8dea7f64a6f`, com alterações locais de landing preservadas. README e AGENTS do usuário lidos; skill Supabase consultada para limites de acesso. Não foram consultados laudos nem tokens de pacientes.

## Estado confirmado ao vivo

Vercel CLI 53.2.0 autenticado como `contato-9443`, escopo `prazeresapp`. Projeto da Sala é **laudousgmobile**, não laudousg-web. Deployment de produção Ready: `dpl_66tkvVp9szxMbhAjiQT832RjxQJi`, URL `https://laudousgmobile-m6qxbycmq-prazeresapp.vercel.app`, criado 26/09/2026. Aliases incluem `sala.laudousg.com` e `laudousgmobile.vercel.app`.

`https://sala.laudousg.com/` responde HTTPS 200, `x-matched-path: /sala`. DNS A `76.76.21.21`. `sala.laudousg.com.br` não resolve; consulta autoritativa retorna SOA Hostinger. Nameservers do domínio brasileiro: `helios.dns-parking.com`, `aster.dns-parking.com`; portanto DNS **externo à Vercel**. Vercel reconhece domínio-pai brasileiro, recomenda A `sala` → `76.76.21.21`, mas API `/v9/projects/laudousgmobile/domains` confirma que o subdomínio brasileiro ainda não está associado ao projeto. TLS do novo host não pôde ser validado porque não existe DNS.

Acesso Vercel comprovado; acesso ao painel/API DNS Hostinger ainda não comprovado. Não trocar nameservers do domínio inteiro: risco desnecessário para site e e-mail existentes.

## Contratos e defeitos comprovados

`apps/api/src/middleware.ts` e `apps/api/next.config.ts` reescrevem somente raiz do host antigo para `/sala`. A página pareada está em `/sala/[token]`. `pair/generate` atualmente entrega link `https://sala.laudousg.com/<code>` sem `/sala`; request inofensivo `/AAAAAA` retornou 404 e não existe rota curta/rewrite correspondente. Corrigir mantendo ambos os formatos.

Android `apps/mobile/src/lib/api.ts:generateSalaPairing` exige `expiresAt`, `salaUrl`, `salaShortUrl`. API responde `expires_at`, `sala_url`, `sala_short_url`; `readJsonOrThrow` apenas retorna JSON, sem conversão. Incompatibilidade estática concreta; não foi executado pareamento real autenticado nesta auditoria. Compatibilidade mais segura: resposta aditiva com snake_case e camelCase de valores idênticos, teste decoder Swift e schema Android. Swift utiliza convertFromSnakeCase e decoder próprio em `Models/SalaPairing.swift`; testar duplicidade de nomes normalizados explicitamente.

Swift usa `https://laudousgmobile.vercel.app` em `Core/AppConfig.swift`; endpoints relativos `/api/sala/pair/generate`, `/push`, `/revoke`, `/push-schema`. Android usa `EXPO_PUBLIC_API_URL` (valor instalado não auditado) e os mesmos endpoints. A migração do host da Sala não exige trocar a origem API dos apps. Há textos hardcoded antigos em SalaPairingSheet de ambos e SettingsView iOS; atualizar para próximas releases, mantendo clientes já instalados funcionais.

Sala lê `reports` do mesmo backend via polling relativo `/api/sala/latest?token=...` e rotas de schemas/anotações/frases. Escrita `/push` exige JWT e verifica dono do relatório; request sem autorização com body vazio retornou unauthorized, sem escrita. Não aplicar redirecionamento global Vercel no domínio antigo: pode afetar POST/Authorization/OPTIONS e sessões abertas. Preservar `/api/**` e recursos estáticos no host antigo.

Pairing é token bearer de seis caracteres, consultado em `room_tokens`; código válido pode durar **365 dias**, não apenas um dia. A lista limita relatórios criados desde meia-noite BRT, mas isso não significa exclusão do banco. Não afirmar anonimização, eliminação diária ou conformidade LGPD por duração da tela. Migração não deve regenerar/revogar tokens nem mover dados.

Sala não usa cookie de autenticação no fluxo auditado; token está no caminho e nas requisições. Preferências, vistos e ocultos ficam em localStorage por origem; não atravessam `.com` → `.com.br`. Não transportar esses valores ou dados clínicos por querystring para simular continuidade. Mesmo código continua válido no novo host; preferências visuais locais podem reiniciar. Fragmento pode ser preservado pelo navegador ao seguir redirect sem fragmento novo, mas deve ser testado; servidor não recebe hash.

## Implantação faseada

1. Preparar patch isolado da API, sem landing ou mudanças clínicas concorrentes. Centralizar host canônico, suportar raiz e `/sala/[token]` no novo host e formato curto legível. Manter host antigo funcionando durante preparação. Acrescentar regressões de contrato Android/Swift, query e host.
2. Associar `sala.laudousg.com.br` ao **laudousgmobile**. No DNS Hostinger acrescentar somente A de `sala` recomendado pela Vercel (verificar recomendação novamente no momento da escrita; TTL baixo se permitido). Aguardar resolução pública e certificado HTTPS válido antes de apontar tráfego.
3. Deploy backward-compatible no mesmo projeto/backend, inicialmente com ambos hosts servindo Sala. Verificar UI e APIs com código sintético controlado; não usar token de paciente e não registrar token em screenshots/logs. Confirmar envio sintético Android e iOS → listagem e seleção do mesmo laudo.
4. Ativar redirect **apenas GET/HEAD de páginas** do host antigo para origem fixa brasileira, preservando pathname e search; corrigir formato curto para `/sala/<code>` em uma etapa. Nunca derivar destino de query/Host arbitrário. `/api/**`, `/_next/**` e assets permanecem disponíveis; host brasileiro nunca redireciona de volta. Usar 307 temporário + no-store durante estabilização para rollback previsível; depois decidir 308 permanente. Evitar alias-redirect global.
5. Resposta de pareamento passa a entregar URL brasileira válida. Textos mobile atualizados em seus próximos builds; apps antigos com instrução antiga ainda chegam à Sala nova pelo redirect. Aba antiga já aberta continua consultando a API antiga até navegar/recarregar, sem perda de relatório.
6. Validar apex/Web inalterados, token inválido/expirado/revogado, query preservada, ausência de loops, refresh de `/sala/<code>`, retorno de APIs sem redirect e OPTIONS. Verificar polling e troca entre laudos; nomes de pacientes/revisão são outra frente com contrato próprio, não misturar com migração de host.

## Reversão

Guardar deployment anterior acima e SHA efetivamente implantado. Enquanto redirect for temporário, desativar redirect por patch/flag e restaurar links antigos; manter DNS e associação brasileira servindo a aplicação para links recém-gerados não quebrarem. Reverter para deployment anterior apenas com cuidado: ele não serve raiz brasileira nem corrige formato curto, então rollback de código deve conservar camada de compatibilidade de host. Não remover novo domínio/DNS nem revogar sessões como primeiro recurso. Não usar cache permanente antes de estabilidade.

## Critérios de aceite e lacunas

Aprovação técnica exige DNS/TLS de ambos, redirect de páginas sem loops e com paths/queries preservados, endpoints antigos intactos, pareamento decodificável nos dois apps, envio e recepção sintéticos ponta a ponta, produção Web e API compartilhada sem regressão. Build sozinho não prova hardware ou emissão móvel. Nenhum desses testes ponta a ponta foi simulado como concluído aqui.

Bloqueio externo atual: DNS Hostinger ainda sem acesso confirmado. Acesso Vercel está operacional. Nenhuma evidência de acesso Supabase de produção foi buscada nesta etapa porque não é necessária para auditar DNS/roteamento e não autoriza consulta clínica indiscriminada.

## Patch local preparado (não publicado)

Implementação em `apps/api/src/server/sala/domain.ts`, `src/middleware.ts` e `src/app/api/sala/pair/generate/route.ts`. Ativação por `SALA_CANONICAL_ENABLED=true`: sem flag, os dois hosts servem Sala e pareamento continua com origem antiga, agora caminho válido `/sala/<code>`; com flag, links novos são brasileiros e navegação antiga recebe 307 no-store. Todo `/api/**`, assets, Next internals e métodos não GET/HEAD escapam do redirect. Formato curto é aceito nos dois hosts. Origem do destino é fixa, inclusive diante de pathname começando por `//` ou parâmetro de redirecionamento malicioso. `next.config.ts` antigo segue compatível: seu rewrite raiz legado é redundante, sem efeito de loop.

Payload de pareamento agora adiciona camelCase idêntico ao snake_case existente. Checagem Swift Foundation real de convertFromSnakeCase com aliases duplicados passou 100 decodes; não substitui teste do app instalado. Nenhum token foi alterado.

Comando planejado para associação Vercel (help conferido, **não executado**):

```sh
vercel domains add sala.laudousg.com.br laudousgmobile --scope prazeresapp
```

Não usar `--force`, não configurar redirect global de domínio. Após associação, inspecionar recomendação DNS específica novamente, adicionar apenas registro `sala` no provedor e verificar certificado. Deploy de preparação com flag ausente/false. Somente depois dos testes do novo host, configurar flag true e fazer redeploy controlado; middleware resolve environment em deployment, não assumir que edição de env sozinha atualiza execução. Reversão rápida exige redeploy com flag false, mantendo novo host associado e DNS válido.

Checks locais executados:

```sh
pnpm exec tsx apps/api/src/server/sala/__tests__/domain.manual.ts
pnpm exec tsc --noEmit --skipLibCheck --target es2022 --moduleResolution node --module commonjs --esModuleInterop apps/api/src/server/sala/domain.ts apps/api/src/server/sala/__tests__/domain.manual.ts
```

Passaram contratos de roteamento, flag, host externo, origem fixa, caminho/query, métodos e API sem redirect, aliases e validação do código. Matcher validado no parser path-to-regexp do Next instalado. Não foi rodado build compartilhado nem interrompida prévia 3001; build/review da integração cabe ao orquestrador. Nenhuma operação cloud executada após esta preparação.
