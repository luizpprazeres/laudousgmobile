# Rede de agentes BRIX — LaudoUSG (01/09/2026)

> Guia operacional vive em `~/.brix/laudousg/README.md` (fora do repo, junto dos dados da rede). Este arquivo é o espelho para quem retoma o projeto.

Dados desta rede: `~/.brix/laudousg/` (quadro `board.json`, chat `chat.jsonl`, `roster.json`,
`presence.json`, briefings em `preambulo.md` + `agentes/*.md`). CLI: `~/.local/bin/brix` (`brix help`).

## Topologia (o limite do broker define o desenho)

O broker do BRIX permite **5 terminais recrutados por orquestrador** e **recrutado não recruta**.
Logo a rede é uma árvore de dois níveis, e os chefes de squad precisam ser terminais abertos
**pelo Luiz** (um clique cada), porque só terminal aberto pelo usuário pode recrutar.

```
Luiz ──► Claude Code (Orquestrador, Fable 5.1)
           ├── Painel (shell: brix watch)            ← o terminal-programa
           ├── Bussola (Fable) · Lente (Fable) · Bigorna (Codex 5.6 high) · Atlas (Sonnet)
           │
           ├── Ferreiro  (Codex 5.6)  ► Cinzel · Prensa · Torno · Fresa · Lixa        FORJA   web+api
           ├── Armeiro   (Codex 5.6)  ► Cobalto · Grafite · Solda · Antena · Radar    ARSENAL iOS+Android
           ├── Curador   (Fable)      ► Pincel · Prisma · Espelho · Retina · Regua    ATELIÊ  design+imagens
           ├── Domingos  (Fable)      ► Bisturi · Estetoscopio · Pipeta · Termometro · Gesso   CLÍNICA
           ├── Zelador   (Codex 5.6)  ► Chave · Cabo · Sentinela · Balanca · Faxina   COFRE   db+infra+seg
           └── Vigia     (Fable)      ► Bardo · Abaco · Cartografo · Ouvidor · Teleprompter   FAROL produto
```

1 + 5 + 6 + 30 = **42 terminais**. Modelos: chefes e quem cria/critica = Fable 5.1 ou Codex
gpt-5.6-sol high; quem roda gate, lê log, formata, redige = Sonnet 5 / Haiku 4.5 / gpt-5.4-mini.

## Ligar os 6 chefes (uma vez por sessão do BRIX)

Para cada chefe: **novo terminal no BRIX** → escolha a CLI → cole a linha → **ligue o terminal ao
"Claude Code" no canvas** (arraste uma linha) para o Orquestrador poder acordá-lo.

| Chefe | CLI no BRIX | Cole no terminal |
|---|---|---|
| Ferreiro | Codex | `brix briefing Ferreiro` — leia e siga (ou: `Você é o Ferreiro. Rode brix briefing Ferreiro e siga.`) |
| Armeiro | Codex | idem com `Armeiro` |
| Zelador | Codex | idem com `Zelador` |
| Curador | Claude Code (Fable) | `Você é o Curador. Rode brix briefing Curador e siga à risca.` |
| Domingos | Claude Code (Fable) | idem com `Domingos` |
| Vigia | Claude Code (Fable) | idem com `Vigia` |

Cada chefe, ao ler o briefing, roda `brix squad up <SQUAD>` e recruta os 5 workers sozinho
(Claude com modelo certo via shell + `claude --model ...`; Codex via `--cli codex`).

Atalho por shell (se preferir abrir terminais **shell** em vez de escolher a CLI): cole
`claude --model fable --dangerously-skip-permissions -n Curador 'Você é o Curador. Rode brix briefing Curador e siga à risca.'`
ou `codex 'Você é o Ferreiro. Rode brix briefing Ferreiro e siga à risca.'`.

## Dia a dia

- **Luiz fala só com o Orquestrador.** O Orquestrador distribui via `brix say ... --to <Chefe>` +
  `medmaestri send "<Chefe>" "brix inbox <Chefe>"` e lê o retorno em `brix feed` / `brix inbox Orquestrador`.
- **Painel** mostra tudo em tempo real (`brix watch`). Se fechar: `medmaestri send "Painel" "brix watch"`.
- Quem está sem tarefa fica em `brix wait <nome>` (9 min por vez) — custo zero enquanto espera.
- Desligar um squad inteiro: o chefe roda `brix squad down <SQUAD>`; o Orquestrador roda
  `brix squad down NUCLEO`.

## Segurança

Workers Claude rodam com `--dangerously-skip-permissions` e o Codex com `approval_policy=never`
(já era a config do Luiz). Por isso os briefings proíbem push, env de prod, migração e `git add -A`
fora do COFRE, e o COFRE só age com ordem do Orquestrador.
