# Auditoria de conclusão — 29/09/2026

O objetivo permanece aberto. A publicação da API/Sala e a implementação local da landing não comprovam a migração completa do domínio nem a validação física dos apps.

## Entregas comprovadas

API/Sala publicada: deployment `dpl_J918LvxKnWNSnTfBw4JTepYmmoLi`, aliases e verificações descritos em `docs/reviews/2026-09-29-sala-api-release.md`. Revisão médica explícita, trigger de invalidação e bloqueio por alerta crítico aplicados no banco. Testes negativos em PostgreSQL/PGlite e checks HTTP sem autenticação documentados; não equivalem a um teste autenticado dos aparelhos.

Sala: leitura vertical, seleção estável, nome local com expiração, estados de revisão/stale/offline e distinção de acréscimos. QA com respostas sintéticas contra build isolado passou. Testes de lógica permanecem no repositório.

Landing: quatro casos em 3–5 segundos, digitação numérica, intervenção manual, clipboard somente com clique, movimento reduzido, exemplos calculados e esquemas fictícios. Quinze imagens GPT compartilhadas entre landing e seletor. Build, typecheck, testes unitários e QA de geometria/interação passaram; prévia local em 3001. Landing publicada em dpl_95q5tmkMojLcLTcPZR1v3ULcQVeZ; aliases laudousg.com.br, www.laudousg.com.br e web.laudousg.com conferidos pelo agente DevOps. QA completo do build isolado 3013 aprovado em 1920/1440/1024/390/320, reduced motion e rede lenta.

iOS: suíte completa concluída com 94 testes aprovados, 3 ignorados e zero falhas. E2E sintético autenticado no simulador comprovou chegada pendente, revisão explícita, invalidação após edição, nova revisão, cópia sem nome local, acréscimos separados, navegação entre dois laudos e redirecionamento autenticado. Build 209 foi assinado, exportado e enviado ao TestFlight; processamento pela Apple em andamento. Android: typecheck, contratos e build debug ARM64 passaram; APK autocontido instalado no emulador e entrada pelo teclado corrigida. O E2E autenticado Android ainda não foi comprovado.

## Pendências que impedem conclusão

Usuário autenticou Hostinger. Registro A sala = 76.76.21.21 TTL 300 criado e confirmado na interface; apex e www preservados. Consulta dig @1.1.1.1 já resolve o novo host. Certificado emitido pela Vercel; root confirmou HTTPS válido com HTTP 200 /sala. Cutover autorizado após esta confirmação. Root também conferiu 307 da URL antiga /sala/TEST01?check=migration para mesmo path/query no novo host, com private,no-store e no-referrer.

Cutover concluído em dpl_GzTRZyscnEfHZRduwJboELmesVTi, três aliases conferidos. Raiz/URL longa/código curto antigos 307, query preservada e novo host 200 sem loop. APIs nos três hosts: token inválido false200, POST sem JWT401 e OPTIONS204 sem redirect. Flag canonical=true persistida no projeto API production. Evidência detalhada e rollback em docs/reviews/2026-09-29-sala-api-release.md.

Concluir no Android, com conta e laudos sintéticos, o mesmo fluxo já comprovado no iOS: gerar, editar, liberar explicitamente, observar a versão na Sala nova e confirmar invalidação após nova edição. Testes locais de contrato não substituem essa prova.

Monorepo publicado em `main` até `02bc4b6`, incluindo isolamento das anotações por laudo durante a navegação; API/Sala automática `dpl_DxGsw3uNNM4qi7E1a8ctN7CQDmCg` ficou Ready. Swift publicado em `main` até `c7499bc`. Distribuição externa/App Store não foi iniciada; o TestFlight 209 aguarda processamento. Preservar arquivos não relacionados que continuam fora dos commits.
