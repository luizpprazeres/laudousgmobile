# W6 — Web: o médico escolhe a frase da datação (caixas de seleção)

Terminal: o da W4 (Claude Code Opus 5.5), **depois** de entregar a junção da bancada.
Worktree próprio: `git worktree add ~/laudousg-wt/web-datacao -b feat/web-datacao-escolhida feat/haiku-migration`
(copie o `.env`, `pnpm install`). Leia `_comum.md` e **o contrato da W5** (`W5-datacao-gestacao-inicial.md`).

## Decisão do Dr. Luiz (09/10/2026)

Na **web**, a conclusão da datação deixa de ser automática: um box com duas opções para incluir ou não cada uma —
**IG pela biometria atual** e **correção pela ultrassonografia precoce** —, que dão as três frases:

| Marcado | Modo enviado (`datacaoConclusao`) | Item 1 da conclusão |
|---|---|---|
| só biometria (padrão quando não há 1ª US) | `biometria` | Gestação em torno de {IG biometria}. |
| só US precoce | `us_precoce` | Gestação em torno de {IG referência}, corrigida pela ultrassonografia precoce. |
| as duas | `biometria_e_us_precoce` | Gestação em torno de {IG biometria} pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com {IG referência}. |

- "Se ele quiser deixar a da biometria, não precisa fazer nada": com 1ª US preenchida, o padrão da web é **só
  biometria** (confirme a leitura no relatório; o mobile tem outro padrão, resolvido no backend).
- Não permitir desmarcar as duas; a opção de US precoce só fica disponível com a 1ª US preenchida (data + IG).
- Prévia ao vivo: a frase muda na hora (o fluxo da web tem prévia local + renderer canônico — siga o padrão existente).

## Onde

`apps/web` — formulário obstétrico (datação: commits recentes `0d48762d feat(web): refine obstetric dating layout`,
`312c9df8`), adaptador `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`, e o mesmo para morfológico e obstétrico
com Doppler se usarem o mesmo bloco. O backend (W5) recebe `datacaoConclusao` opcional — até a W5 integrar, use um
dublê/teste de contrato; não implemente a regra clínica na web (texto clínico é do renderer canônico).
Siga o design atual da página (tokens, componentes existentes, acessibilidade, celular).

## Testes

Typecheck/lint da web, testes do adaptador (os três modos + 1ª US ausente), e um teste de navegador se o projeto já tiver
o padrão (`apps/web/tests/*.browser.manual.ts`). Screenshot local da prévia nos três modos (em `tmp-review/`).

## Entregável

Commits em `feat/web-datacao-escolhida` + `docs/stories/haiku-migration/W6-relatorio.md`; status em `status/W6.md`.
Nada de push/deploy.
