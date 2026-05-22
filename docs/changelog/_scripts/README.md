# Changelog automation — workflow

Como gerar drafts de changelog rápido a partir do git log.

---

## Quick start

Do diretório raiz do monorepo `laudousgmobile-def`:

```bash
bash docs/changelog/_scripts/draft.sh \
  --slug sprint-12-doppler \
  --title "Doppler obstétrico — parsers + atalho percentis"
```

Sem `--since`, ele pega a data do último marco no `docs/changelog/` automaticamente.

---

## Opções

| Flag | Obrigatório | Descrição |
|---|---|---|
| `--slug` | sim | Slug kebab-case do marco. Vai virar `{DATE}-{slug}.md` |
| `--title` | sim | Título do marco (com aspas se tiver espaço) |
| `--since` | não | Data inicial (`YYYY-MM-DD`) ou ref git. Default: data do último marco |
| `--repo` | não | Path do repo Git. Default: raiz do monorepo |

---

## O que o script faz

1. **Coleta commits** entre `--since` e `HEAD` via `git log --no-merges`
2. **Infere `size`** automaticamente: `small` (<4 commits), `medium` (<12), `large` (<25), `epic` (>=25)
3. **Conta `files_touched`** únicos no range
4. **Gera markdown** com:
   - Frontmatter pré-preenchido (slug, title, date, status=in-progress, size inferido, commits[] com até 20 hashes, files_touched)
   - 3 seções vazias com comentários HTML guia (Resumo leigo / Detalhes técnico / Impacto)
   - Apêndice "Commits incluídos" como referência bruta pra finalização

---

## Fluxo recomendado (eu finalizo)

1. Rodar `draft.sh` no fim de uma sprint significativa
2. Abrir o draft, ler os commits da apêndice
3. Preencher as 3 seções (Resumo leigo / Detalhes / Impacto) com contexto humano
4. **Apagar a apêndice "Commits incluídos"** antes de shippar (era só guia)
5. Ajustar `tags`, `sprint`, `related_adrs` no frontmatter
6. `status: in-progress` → `shipped` quando publicar
7. Commit + push → `/changelog` no Lab atualiza no próximo deploy

---

## Fluxo com c1 (Claude)

Você pode pedir:

> "gera draft do changelog desta sprint usando o script"

Eu rodo, leio o draft + commits, preencho as 3 seções com base em (a) contexto da sprint que vivenciamos juntos + (b) tradução leiga das mensagens de commit. Você revisa.

---

## Exemplos

```bash
# Marco da sprint atual (auto-detecta since)
bash docs/changelog/_scripts/draft.sh \
  --slug sprint-11-legal-docs \
  --title "Termos + Privacidade v2.0 + Disclaimer refinado"

# Especificando since (semana específica)
bash docs/changelog/_scripts/draft.sh \
  --slug p7-7-deploy-lab \
  --title "Deploy lab.laudousg.com" \
  --since 2026-05-22

# Repo diferente (app Swift, não monorepo)
bash docs/changelog/_scripts/draft.sh \
  --slug ios-sprint-12 \
  --title "App: Doppler + filtros" \
  --repo /Users/luizprazeres/laudousg-swift/LaudoUSG
```

---

## Limitações

- **Heurística de size** é simplista (só count de commits). Pode estar errada — ajuste manual.
- **Não detecta `tags`** — você infere pelo contexto.
- **Não preenche `related_adrs`** — adicione manualmente quando aplicável.
- **Não traduz pra linguagem leiga** — esse é o seu papel (ou o do c1). O script só dá a matéria-prima.

---

## TODO futuro (P7.C.3.B opcional)

- Detectar `tags` automaticamente via análise de paths tocados (`apps/api/` → `backend`, `apps/lab/` → `lab`, etc)
- Sugerir `related_adrs` cruzando commits com `docs/adr/*.md` (grep mention)
- Integração com Maestri: comando `maestri ask c1 "gera changelog usando o script"` que dispara automação ponta-a-ponta
