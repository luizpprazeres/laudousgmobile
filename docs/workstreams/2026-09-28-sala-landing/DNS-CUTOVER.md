# Troca de domínio da Sala

## Dependência atual

A Vercel já associa `sala.laudousg.com.br` ao projeto `laudousgmobile`. Nameservers externos: Hostinger (`dns-parking.com`). Consulta pública ainda não resolve o novo host. Chrome aberto na tela de autenticação do hPanel, sem sessão autenticada.

No DNS de **laudousg.com.br**, criar **A**, nome **sala**, valor **76.76.21.21**, conforme indicação atual da Vercel. Não modificar domínio raiz, www, e-mail ou nameservers. Se já existir registro conflitante para sala, conferir seu destino e preservar evidência antes de substituir.

## Sequência após autenticação

Conferir registro salvo e resolução em resolvers públicos. Conferir HTTPS com certificado válido, sem ignorar erro TLS. Novo host deve abrir a Sala; códigos curtos e `/sala/<código>` devem chegar à mesma tela.

Preparar novo deployment da API com `SALA_CANONICAL_ENABLED=true` tanto no build quanto no runtime. Validar o candidato antes da promoção. Testar origem antiga redirecionando com 307 para a nova, com caminho e query preservados e sem loop; APIs e POST antigos continuam compatíveis. Confirmar novo pareamento com URLs no domínio brasileiro.

Validar fluxo autenticado sintético Android e iOS: texto gerado, revisão explícita, chegada na Sala, edição posterior invalidando selo. Nenhum laudo real deve ser usado como fixture nem capturado em logs.

## Reversão

Antes de ativar o redirecionamento, manter a produção atual com flag false. Se houver falha após ativar, promover build compatível com os dois hosts e flag false. Não remover a migração aditiva nem apagar laudos. O deployment antigo sem suporte ao novo host não é a primeira opção depois da troca de domínio.

Baseline, manifest e deployment atual da API: `docs/reviews/2026-09-29-sala-api-release.md`.
