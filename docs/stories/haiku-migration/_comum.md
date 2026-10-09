# Comum a todas as frentes (W1–W4)

Leia também a story: `docs/stories/2026-10-09-migracao-haiku.md`.

## Setup (primeira coisa)

```bash
cd <seu worktree>                      # ex.: ~/laudousg-wt/motor
cp /Users/luizprazeres/laudousgmobile-def/.env .env   # gitignored; contém segredos — nunca commitar
pnpm install --prefer-offline
pnpm -F api typecheck                  # linha de base (deve passar)
```

## Status para o orquestrador

Escreva (sobrescreva) o arquivo
`/Users/luizprazeres/laudousgmobile-def/tmp-review/haiku-migration/status/<W>.md` a cada marco:

```
estado: trabalhando | bloqueado | pronto-para-revisao
atualizado: <hora>
feito:
- ...
proximo:
- ...
bloqueios / decisões que precisam do Luiz:
- ...
commits: <hashes curtos>
```

Quando terminar, `estado: pronto-para-revisao` + o relatório da frente em
`docs/stories/haiku-migration/<W>-relatorio.md` (commitado na sua branch).

## Regras

- Só o seu worktree e só os arquivos do seu escopo (veja "Fora do escopo" no seu briefing).
- Commits na sua branch, conventional commits, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (frentes Claude) ou
  `Co-Authored-By: GPT-6.1 Sol <noreply@openai.com>` (frentes Codex).
- **Proibido:** `git push`, PR, deploy, `vercel env`, alterar banco (só leitura), mexer no
  `OBSTETRICA_JSON_SCHEMA`, `git add -A` (adicione arquivos pelo nome).
- Testes com LLM: só pela assinatura (bancada `apps/api/scripts/bench-haiku/bench-abdomen.ts`).
- Dados de pacientes: só em `tmp-review/` (gitignored). Nunca em commit, doc ou log versionado.
- Português correto, com acentos, em tudo que escrever para o Luiz.

## A bancada (como usar)

`apps/api/scripts/bench-haiku/bench-abdomen.ts` — roda o pipeline REAL com os ditados reais do banco, trocando
as chamadas OpenAI pelo `claude -p` (Haiku 5.5, assinatura) ou `codex exec` (Luna). Rodar de `apps/api`:

```bash
pnpm exec tsx scripts/bench-haiku/bench-abdomen.ts \
  --category OBSTETRICA,DOPPLER_OBSTETRICO \   # categorias (default ABDOMEN_TOTAL)
  --scenarios A,B2 \                          # A = Haiku extrai + renderer; B = Haiku escreve; B2 = B + patch "corpo descritivo"; R = replay da produção com código de hoje; L = Luna extrai
  --days 45 --concurrency 4 [--only id8,id8] [--no-judge] [--reuse <rodada>] [--rejudge <rodada>]
python3 scripts/bench-haiku/relatorio.py ../../tmp-review/bench-haiku/<rodada>   # HTML local
```

- **replay** = achados que a produção extraiu → renderer de hoje. Se diferir do `generated_output`, é flag errada OU
  mudança de código no período; confira o diff antes de concluir qualquer coisa.
- O juiz (Opus 5.5) erra: **confira à mão a origem de todo erro grave** (extração × renderer × prompt × guard),
  olhando `calls.jsonl` (entrada/saída de cada chamada) e o código, e cite `arquivo:linha`.
- `B2` aplica o patch no prompt dentro da bancada e **falha alto** se o texto antigo da regra global não existir
  (depois do W3, use `B`, que já terá o prompt novo).
- O CLI do Claude informa a data de hoje ao modelo: campos de data "inventados" com a data de hoje podem ser
  artefato da bancada — registre como tal.
- Quatro frentes dividem a mesma assinatura do Claude: se o `claude -p` começar a falhar por limite de uso, espere
  alguns minutos e retome com `--reuse <rodada>` (não reinicie do zero).
