# Sprint 14 — estilo de escrita sincronizado na web

## Objetivo

Fazer a web respeitar a preferência Clássico ou Objetivo já compartilhada com iPhone e Android, sem permitir que o navegador escolha um estilo arbitrário durante a geração.

## Entregue

- A página de Preferências da web ganhou a escolha entre Clássico e Objetivo.
- A escolha é salva em `profiles.default_writing_style_id`, a mesma fonte usada pelos aplicativos móveis.
- O catálogo e a geração da web passaram a buscar o estilo da conta no servidor.
- O navegador envia somente achados e dados do exame; ele não decide o estilo usado pelo renderer.
- Contas que ainda não escolheram um estilo continuam no Clássico, preservando o comportamento atual.
- A rota de perfil da web aceita somente os dois identificadores oficiais e recusa valores inventados.

## Cobertura atual da web

O estilo sincronizado já vale nas oito categorias servidas pelo renderer canônico na web: Abdome total, Obstétrica, Morfológica, Doppler obstétrico, Tireoide, Mamária, Pelve feminina e Doppler de carótidas.

Abdome superior, Vias urinárias, Próstata suprapúbica, Cervical, Cervicometria, Partes moles e Musculoesquelético ainda usam o compositor local clássico. Os modelos Clássico e Objetivo existem no catálogo para essas categorias, mas cada uma ainda precisa do adaptador que converte os campos da tela para o renderer. Elas não foram liberadas artificialmente nesta sprint porque isso poderia preencher campos clínicos de forma incorreta.

## Banco e segurança

O banco atual possui somente dois estilos ativos: `CLASSICO_COMPLETO` e `OBJETIVO`. As políticas de `profiles` limitam leitura e alteração ao próprio usuário. As sete contas existentes ainda estão sem preferência explícita, portanto começam no Clássico até uma escolha ser feita.

## Validação

- Teste do mapeamento dos estilos oficiais, rejeição de valor inventado e fallback Clássico.
- Catálogo e renderização Objetivo verificados nas oito categorias canônicas atuais da web.
- `pnpm --filter @laudousg/web typecheck`
- `pnpm --filter @laudousg/web build`
- `npm test`
- `git diff --check`

O `npm run lint` continua bloqueado pela configuração preexistente: `next lint` abre o assistente interativo de criação do ESLint em `api`, `web` e `lab`. Nenhuma configuração global foi criada silenciosamente nesta sprint.

## Próximo sprint

Migrar, categoria por categoria, os sete adaptadores restantes da web para o renderer canônico. O aceite de cada categoria deve comparar os mesmos dados nos estilos Clássico e Objetivo antes de remover o compositor local.
