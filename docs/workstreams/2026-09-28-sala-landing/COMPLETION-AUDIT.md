# Auditoria de conclusão — 29/09/2026

O objetivo permanece aberto. A publicação da API/Sala e a implementação local da landing não comprovam a migração completa do domínio nem a validação física dos apps.

## Entregas comprovadas

API/Sala publicada: deployment `dpl_J918LvxKnWNSnTfBw4JTepYmmoLi`, aliases e verificações descritos em `docs/reviews/2026-09-29-sala-api-release.md`. Revisão médica explícita, trigger de invalidação e bloqueio por alerta crítico aplicados no banco. Testes negativos em PostgreSQL/PGlite e checks HTTP sem autenticação documentados; não equivalem a um teste autenticado dos aparelhos.

Sala: leitura vertical, seleção estável, nome local com expiração, estados de revisão/stale/offline e distinção de acréscimos. QA com respostas sintéticas contra build isolado passou. Testes de lógica permanecem no repositório.

Landing: quatro casos em 3–5 segundos, digitação numérica, intervenção manual, clipboard somente com clique, movimento reduzido, exemplos calculados e esquemas fictícios. Quinze imagens GPT compartilhadas entre landing e seletor. Build, typecheck, testes unitários e QA de geometria/interação passaram; prévia local em 3001. Landing publicada em dpl_95q5tmkMojLcLTcPZR1v3ULcQVeZ; aliases laudousg.com.br, www.laudousg.com.br e web.laudousg.com conferidos pelo agente DevOps. QA completo do build isolado 3013 aprovado em 1920/1440/1024/390/320, reduced motion e rede lenta.

iOS: build e testes específicos aprovados; duas falhas em testes de análise de imagens na suíte ampla, baseline não reexecutado. Android: typecheck e contratos aprovados. Alterações locais ainda não distribuídas aos aparelhos.

## Pendências que impedem conclusão

Usuário autenticou Hostinger. Registro A sala = 76.76.21.21 TTL 300 criado e confirmado na interface; apex e www preservados. Consulta dig @1.1.1.1 já resolve o novo host. Certificado emitido pela Vercel; root confirmou HTTPS válido com HTTP 200 /sala. Cutover autorizado após esta confirmação. Root também conferiu 307 da URL antiga /sala/TEST01?check=migration para mesmo path/query no novo host, com private,no-store e no-referrer.

Cutover concluído em dpl_GzTRZyscnEfHZRduwJboELmesVTi, três aliases conferidos. Raiz/URL longa/código curto antigos 307, query preservada e novo host 200 sem loop. APIs nos três hosts: token inválido false200, POST sem JWT401 e OPTIONS204 sem redirect. Flag canonical=true persistida no projeto API production. Evidência detalhada e rollback em docs/reviews/2026-09-29-sala-api-release.md.

Validar com conta e laudos sintéticos nos apps Android/iOS: gerar, editar, liberar explicitamente e observar a mesma versão na Sala nova; editar novamente e confirmar invalidação. Testes locais de contrato não substituem essa prova.

Distribuição dos apps e commit/push não realizados nesta onda. Preservar trabalho local e manifest da API já publicada ao preparar essas entregas.
