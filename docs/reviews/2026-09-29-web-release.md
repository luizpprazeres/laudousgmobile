# Landing/Web — preparação de release isolado

Não publicado. Worktree `/tmp/laudousg-web-release-20260929`, detached no baseline `5a8a6a04defc7011c4e06b3538ecf8dea7f64a6f`. Manifest inicial de 53 arquivos em `2026-09-29-web-release-manifest.json` (hash e tamanho por arquivo). Somente alterações `apps/web`: landing, exemplos/calculadoras/FAQ/hero e imports novos, ícones lineart e mapping compartilhado da seleção clínica, mídia pública e testes. Nenhuma mudança API, DB/shared, Android ou Swift copiada.

Mídia vem exclusivamente de `apps/web/public`. Clip público selecionado `demonstracao-real.mp4` incluído; nenhum `output/landing-capture`, arquivo bruto MOV, diretório output ou attachment foi copiado. Asset README de proveniência acompanha o clip. Snapshot total das mudanças aproximadamente17MB. Repositório-base já contém os demais arquivos necessários ao build.

Vercel confirmado: `laudousg-web`, projectId `prj_5etqM0uBJEoEb5yVLJAKOgAXzALC`, rootDirectory `apps/web`, framework nextjs, sem override build/install/output. Baseline de produção `dpl_FNUrf9Y3jUQguYqBmUQmjbW6FePZ`, URL `https://laudousg-8o1jozwkh-prazeresapp.vercel.app`, aliases `laudousg.com.br`, `www.laudousg.com.br`, `web.laudousg.com` e aliases Vercel. Copiado apenas `.vercel/project.json` de identificação; nenhum env local ou segredo copiado. Consulta metadata temporária foi removida após extrair apenas configuração do projeto.

Dependências próprias instaladas via `pnpm install --frozen-lockfile --offline --ignore-scripts`. Build Web, typecheck, lint e 17 suítes unitárias passaram. Lint conserva avisos existentes não bloqueantes. Build gerado neste isolado, sem tocar preview3001. Prévia isolada em `http://localhost:3013`, processo mantido para QA. Sem configuração Supabase local: landing funciona, porém seleção clínica autenticada não pode ser validada de ponta a ponta aqui; mapping/arquivos de imagem são os mesmos.

Gate restante: script browser completo estava sendo atualizado por scheme_examples para remover expectativa antiga de posição fetal, botões de capítulos e reprodução automática. Aguardar freeze e rodar contra3013; recapturar manifest final se código mudar. Não alegar browser gate concluído antes disso.

Plano posterior, não executado: executar candidato Vercel `--prod --skip-domain` ligado a laudousg-web e respeitando rootDirectory apps/web; verificar logs confirmando build @laudousg/web (nunca comando API do vercel.json raiz), deployment Ready, assets/video e páginas. Só promover após revisão do root. É possível que CLI da raiz aplique configuração raiz; para evitar ambiguidade passar `--local-config apps/web/vercel.json` ou executar fluxo validado de monorepo que preserve rootDirectory. Confirmar comando e projeto no momento de publicar; não usar deploy default da raiz sem essa conferência.

Rollback posterior: promover baseline Web acima, preservando aplicação API/Sala publicada separadamente. Este release altera também imagem da seleção de categorias via mapping, portanto verificar resolução dos15assets e estabilidade de IDs; nenhum comportamento clínico/calculadora é modificado, somente demonstrações sintéticas e apresentação.

## Freeze e candidato

Full QA de scheme_examples contra isolado3013 passou em1920/1440/1024/390/320, reduced-motion390/320 e rede lenta (exit0). Os dois testes finais foram copiados ao isolado após esse gate; nenhuma alteração funcional depois do build. Manifest final53arquivos SHA256 `b86b781f70ac28e0e46496d8cf7a7c0bb5138e205acd8d12d2d26cf7eea6b6f5`, com comparação sem divergências contra workspace de origem.

Root autorizou criar candidato, sem promover. Comando executado da raiz isolada:

```sh
vercel deploy --prod --skip-domain --yes --scope prazeresapp --local-config apps/web/vercel.json
```

CLI identificou `prazeresapp/laudousg-web` e criou candidato `https://laudousg-co45f9wm4-prazeresapp.vercel.app`, ID `dpl_95q5tmkMojLcLTcPZR1v3ULcQVeZ`. O CLI emitiu aviso de local-config/root directory, por isso conferir no build remoto que o cwd é `/vercel/path0/apps/web` e não API antes de qualquer promoção. Log `/tmp/laudousg-web-release-deploy.log`. Nenhum alias promovido nesta etapa.

Candidato **Ready**, ID confirmado `dpl_95q5tmkMojLcLTcPZR1v3ULcQVeZ`. Build remoto confirmou `@laudousg/web@0.0.1 build /vercel/path0/apps/web`; aviso CLI não desviou para API. Smoke autenticado pelo mecanismo oficial `vercel curl`: root200 com marcação do hero/calculadoras/FAQ/esquemas; lineart200 e tireoide preenchida200 com hashes binários idênticos aos arquivos congelados; MP4 Range206 com1024bytes. URLs de imagens no HTML são codificadas pelo Next (lineart-v1 confirmado). Sem chamadas clínicas autenticadas nem acesso a pacientes. CLI gerenciou automaticamente proteção do candidato, sem imprimir valor de token.

Inspect de `laudousg.com.br` após candidato confirmou **baseline inalterado** `dpl_FNUrf9Y3jUQguYqBmUQmjbW6FePZ`. Não houve promoção. Candidato pronto para decisão do root; portar mudança para aliases é uma etapa separada.

## Promoção Web concluída

Root autorizou promoção após freeze, QA completo e smoke. `vercel promote` concluiu com sucesso. Inspect dos três aliases `laudousg.com.br`, `www.laudousg.com.br` e `web.laudousg.com` confirmou `dpl_95q5tmkMojLcLTcPZR1v3ULcQVeZ`. GET público www200 com hero novo, calculadoras e imagens lineart presentes. A promoção não alterou API/Sala, DNS ou aplicativos nativos. Nenhum commit/push feito. Rollback Web continua sendo promover `dpl_FNUrf9Y3jUQguYqBmUQmjbW6FePZ`.
