# API/Sala: publicação e migração canônica

Worktree detached: `/tmp/laudousg-sala-release-20260929`, base `5a8a6a04defc7011c4e06b3538ecf8dea7f64a6f`. Snapshot final de 23 arquivos exclusivamente API/Sala, DB/shared e migração/testes. Landing e Android/iOS não incluídos. Manifest: `2026-09-29-sala-api-release-manifest.json`; SHA256 do manifest `efbf4af9d9f2e778a25a66191e6971f786ba02af4e646b3f394bcb3c2c865713`. Comparação original versus isolado sem divergências no congelamento.

Instalação própria `pnpm install --frozen-lockfile --offline --ignore-scripts`, sem symlink para workspace original e sem arquivos env copiados. Projeto `.vercel/project.json` aponta para laudousgmobile. Build cloud recebe ambientes de produção do projeto; nenhuma credencial registrada no relatório.

Build API final, typecheck API e testes domain, middleware NextRequest, reportContract e sala-ui passaram no isolado. Smoke next start: raiz antiga e nova servem Sala, formato curto `/ABC234` abre Sala; API sem token retorna 400, sem redirect. Corrigido uso de host no middleware: seleção somente dos dois hosts permitidos pelo header Host, rewrite de pathname mantém URL interna de Next, destino externo de redirect sempre fixo. Teste NextRequest usa URL localhost + Host real para cobrir diferença encontrada no servidor.

Porta local 3012 continua ligada para QA sintético pelo orquestrador, processo desta sessão sem dados de produção. Canonical flag permanece desligada. Aprovação médica depende da migração que root informou já aplicada; nesta frente não executamos mudanças de banco.

Comando candidato autorizado pelo root e iniciado, sem alias automático:

```sh
vercel deploy --prod --skip-domain --yes --scope prazeresapp --env SALA_CANONICAL_ENABLED=false --build-env SALA_CANONICAL_ENABLED=false
```

Candidato: `https://laudousgmobile-m3uzwuc39-prazeresapp.vercel.app`, ID inicial `dpl_J918LvxKnWNSnTfBw4JTepYmmoLi` (conferir inspect final). Nenhuma promoção executada. Log local `/tmp/laudousg-sala-release-deploy.log`.

Baseline antes do candidato: `dpl_66tkvVp9szxMbhAjiQT832RjxQJi`, `https://laudousgmobile-m6qxbycmq-prazeresapp.vercel.app`, com alias antigo e API principal. Se candidato falhar, nenhuma reversão de alias é necessária porque skip-domain mantém tráfego anterior. Se promoção posterior for autorizada, registrar aliases finais e baseline antes da promoção; reversão de aplicação pode promover baseline anterior, mantendo migração aditiva aplicada. Antes do redirect canônico, rollback antigo continua viável; depois de ativar novo host, preferir build compatível com flag false em vez do baseline que não conhece o domínio novo.

Próximo gate: root verificar QA Sala no isolado, status Ready do candidato e smoke de endpoints sem PHI; só então decidir promoção. DNS brasileiro continua pendente, não ativar flag canônica. Testes autenticados de integração devem usar conta/relatórios sintéticos autorizados, não laudos reais. Nenhum commit/push foi feito.

## Resultado final: produção promovida

Root aprovou promoção após QA Atlas contra porta 3012 PASS e screenshot desktop revisado. Candidato Ready confirmado `dpl_J918LvxKnWNSnTfBw4JTepYmmoLi`. Smoke pré-promoção via `vercel curl` (acesso autenticado à proteção do deployment): health200, Sala200 e token de formato inválido rejeitado, sem consultar sala real. Baseline health200.

Promoção executada com sucesso via `vercel promote ... --yes --scope prazeresapp`. Inspect dos aliases **sala.laudousg.com** e **laudousgmobile.vercel.app** confirmou ambos no deployment candidato. Pós-promoção: health200; raiz Sala antiga200 sem redirecionar; token inválido200 com tokenValidfalse; POST push e POST review sem autenticação retornam401. Nenhuma escrita clínica ou pareamento real realizado.

`SALA_CANONICAL_ENABLED=false` no build e runtime. Domínio antigo continua operacional nesta fase; DNS e redirect canônico não foram modificados. Aplicação nova publicada, migração de domínio ainda aguarda DNS/TLS brasileiro e ativação posterior. Nenhum commit/push realizado. Porta3012 preservada a pedido do root.

## Cutover canônico concluído

Root adicionou DNS A `sala` → `76.76.21.21`, TTL300, no provedor Hostinger. Nesta frente confirmei domínio Vercel verified=true e alias já associado ao deployment compatível. `vercel certs issue sala.laudousg.com.br --scope prazeresapp` concluiu emissão com sucesso. HTTPS normal, sem bypass ou opção insecure, retornou200 com tela Sala antes de redirecionar qualquer usuário.

Novo candidato do mesmo snapshot foi criado com `SALA_CANONICAL_ENABLED=true` no build e runtime, sem aliases automáticos: `https://laudousgmobile-60kzlp3ei-prazeresapp.vercel.app`, `dpl_GzTRZyscnEfHZRduwJboELmesVTi`. Ready e health200 confirmados. Root autorizou cutover após DNS/TLS e QA; promoção concluída. Inspect confirmou os três aliases `sala.laudousg.com`, `sala.laudousg.com.br` e `laudousgmobile.vercel.app` nesse deployment.

Pós-promoção público, sem token de paciente: raiz antiga307 para nova; caminho longo `/sala/INVALID?view=print&x=1%202` preserva caminho e query; caminho curto `/ABC234?view=print`307 para `/sala/ABC234?view=print`. Os testes de caminhos usaram HEAD, sem consultar conteúdo clínico. Respostas307 têm no-store. Novo host responde200 em raiz/caminho longo/curto sem loops.

Nos três hosts, API latest com token de formato inválido retorna200/tokenValidfalse sem redirect, POST push sem JWT retorna401 e OPTIONS204. Os clientes antigos preservam endpoints e métodos. Não realizamos envio autenticado de laudo real nestes checks.

Para persistir comportamento em próximos deploys, root autorizou e foi executado `vercel env add SALA_CANONICAL_ENABLED production --value true --no-sensitive --force --yes --scope prazeresapp`. CLI confirmou override dessa variável somente no projeto laudousgmobile. Não foram exibidas outras variáveis.

**Rollback canônico:** restaurar essa flag de projeto para false **e** promover deployment compatível `dpl_J918LvxKnWNSnTfBw4JTepYmmoLi`, que já contém suporte aos dois hosts e tem false no próprio build/runtime. Manter DNS/certificado/novo domínio para links distribuídos continuarem válidos. Não promover o baseline pré-migração como primeiro rollback do domínio. Não remover migração aditiva de revisão médica. Snapshot de código e manifest permanecem os mesmos; único delta desta etapa é configuração canônica true.

## Registro para commit

Release versionado mantém explicitamente duas lacunas: **E2E autenticado Android/iOS → Sala com conta e laudos sintéticos ainda pendente**; **CodeRabbit NÃO EXECUTADO**. Build, testes locais, revisão humana/agentes e smokes HTTP não substituem essas verificações. Root informou build Android ARM64 aprovado (618 tarefas) e typecheck RN aprovado após atualização das strings de domínio. Aplicativo iOS pertence a outro repositório e não integra este commit; mudanças nativas não foram distribuídas aos dispositivos por esta etapa.
