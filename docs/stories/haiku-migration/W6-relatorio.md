# W6 — Relatório: o médico escolhe a frase da datação (web)

Status: **pronto para revisão** · Branch `feat/web-datacao-escolhida` (a partir de `feat/haiku-migration`) · 09/10/2026

## O que mudou

No bloco de datação do formulário obstétrico (o mesmo bloco serve a **obstétrica** e a **obstétrica com Doppler**
combinada), um cartão novo **"Conclusão da datação"** com duas caixas:

| Caixas marcadas | Modo (`datacao_conclusao`) | Item 1 da conclusão |
|---|---|---|
| IG pela biometria atual | `biometria` | Gestação em torno de {IG biometria}. |
| Correção pela ultrassonografia precoce | `us_precoce` | Gestação em torno de {IG referência}, corrigida pela ultrassonografia precoce. |
| as duas | `biometria_e_us_precoce` | Gestação em torno de {IG biometria} pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com {IG referência}. |

- **Padrão:** só a biometria, com ou sem 1ª US ("se ele quiser deixar a da biometria, não precisa fazer nada").
- **Nunca as duas desmarcadas:** a caixa que está sozinha fica desabilitada.
- **A correção só com a 1ª US completa** (data + semanas + dias, e a data do exame). Sem ela, as duas caixas ficam
  travadas em "biometria" e o texto de ajuda explica o que falta. Se a 1ª US for apagada depois da escolha, o modo
  efetivo volta à biometria (a escolha antiga não atravessa).
- **Só DUM** não oferece correção: as frases do contrato falam de ultrassonografia precoce.

Arquivos: `apps/web/src/lib/ig/computeIG.ts` (tipo `ModoDatacao`, caixas ↔ modo, modo efetivo na leitura da tela,
`computeIG` aceita o modo), `apps/web/src/components/laudar/OrganFormPanel.tsx` (o cartão),
`apps/web/src/lib/deterministic/organs/obstetrica.ts` (prévia local), `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`
(o que vai ao renderer).

## Contrato com a W5 (backend)

- A web **sempre** envia o modo em `dados.datacao_conclusao` (o estado do exame que vai ao
  `/api/catalog/[category]/render`). Ausente, o backend aplicaria a regra do **ditado**, que com 1ª US é outra
  (`us_precoce`); por isso a web nunca omite.
- Compatibilidade com o renderer de hoje (anterior à W5): o `ObstetricaFindingsSchema` é `z.object` e descarta a chave
  desconhecida — nada quebra. `corrigir_ig` continua coerente: `biometria` → `false`; modos com US precoce → `true`.
- **Para a W5:** ler `datacao_conclusao` dos `dados` (snake_case, como os demais campos do estado) e expô-lo ao renderer
  como a opção `datacaoConclusao` do contrato. O texto final é do renderer canônico; a web só escolhe.

## Mudança de comportamento (para o Luiz/orquestrador saberem)

- Antes, a web corrigia automaticamente pela DUM ou pela 1ª US quando a divergência passava de 5 dias. Agora o padrão é
  **só a biometria**, e a correção é sempre escolha explícita. A opção antiga "Sinalizar correção" (estados legados) deixa
  de valer na obstétrica.
- **Morfológico:** usa outro bloco (o seletor antigo "Datação de referência" + "Sinalizar correção") e ficou fora desta
  rodada, como o teste existente já registrava. Atenção à W5: o adaptador do morfológico **não envia** o modo; com a
  política nova do backend para modo ausente (regra do ditado), um morfológico web com 1ª US passaria a sair
  "corrigida pela ultrassonografia precoce". Proposta: levar este mesmo cartão ao morfológico (ou a W5 tratar a ausência
  do modo na rota web como `biometria`).

## Prévia

A prévia local repete a tabela do contrato (`computeIG` com o modo) e o laudo canônico é re-renderizado a cada
mudança, como no restante do formulário. Até a W5 integrar, o renderer canônico só obedece ao modo `biometria`; os
modos com US precoce aparecem no laudo depois da integração.

## Testes

- `apps/web/tests/obstetricaFormulario.manual.ts` (41 ok): caixas ↔ modo (inclusive "nenhuma" → biometria); padrão com
  1ª US; os três modos atravessam com `corrigir_ig` coerente; prévia local = tabela do contrato (dublê da W5); 1ª US
  ausente, incompleta e só DUM; valor guardado inválido; render canônico de hoje sem quebrar; Doppler combinado usa o
  mesmo bloco. Expectativa antiga ajustada: DUM sozinha agora sai `corrigir_ig=false` (política nova).
- `apps/web/src/lib/ig/computeIG.test.mts` (15/15): o modo vence o limiar e o `corrigir`; modo com US sem 1ª US cai na
  biometria.
- `pnpm -F web typecheck` ok · `pnpm -F web test` (72 suítes) ok · lint sem achados nos arquivos alterados.
- Navegador (`apps/web/tests/datacao.browser.manual.ts`, padrão do projeto, Playwright + CSS compilado): tela real e
  renderer canônico real, com dublê declarado da W5 só para o item 1 nos modos com US precoce. Desktop e celular:
  caixas, modo enviado e frase no laudo nos três modos. Capturas em `tmp-review/web-datacao/` (fora do git).

## Commits

`50dfa3d8` (funcionalidade + testes), `b168ece1` (teste de navegador), e o commit deste relatório.
