#!/usr/bin/env bash
# Gera draft de changelog a partir de git log entre datas/refs.
#
# Uso:
#   ./draft.sh --slug nome-curto --title "Título do marco" [--since DATE_OR_REF] [--repo PATH]
#   ./draft.sh --slug sprint-12 --title "Doppler + Histórico filtros"
#   ./draft.sh --slug s11 --title "Termos+Privacy v2.0" --since 2026-05-21
#   ./draft.sh --slug sprint-12 --title "..." --repo /Users/luizprazeres/laudousg-swift/LaudoUSG
#
# Se --since for omitido, usa a DATA do último .md (não _template, não _scripts)
# no diretório acima ($SCRIPT_DIR/..) como ponto de partida.
#
# Saída: cria docs/changelog/{YYYY-MM-DD}-{slug}.md com frontmatter pré-preenchido
# e seções vazias pra c1 (Claude) finalizar a tradução leiga.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHANGELOG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$CHANGELOG_DIR/../.." && pwd)"
SLUG=""
TITLE=""
SINCE=""
TODAY="$(date +%Y-%m-%d)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)  SLUG="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --since) SINCE="$2"; shift 2 ;;
    --repo)  REPO="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,20p' "$0"; exit 0 ;;
    *)
      echo "Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$SLUG" || -z "$TITLE" ]]; then
  echo "ERRO: --slug e --title são obrigatórios." >&2
  echo "Use --help pra exemplos." >&2
  exit 2
fi

# Se --since não passado, pega a data do último marco no diretório
if [[ -z "$SINCE" ]]; then
  LAST_MD="$(ls -1 "$CHANGELOG_DIR"/*.md 2>/dev/null | grep -v '_template' | sort | tail -1 || true)"
  if [[ -n "$LAST_MD" ]]; then
    SINCE="$(basename "$LAST_MD" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || echo "")"
  fi
  if [[ -z "$SINCE" ]]; then
    echo "AVISO: sem marcos anteriores, usando últimos 7 dias." >&2
    SINCE="$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)"
  fi
fi

OUTFILE="$CHANGELOG_DIR/${TODAY}-${SLUG}.md"

if [[ -f "$OUTFILE" ]]; then
  echo "ERRO: arquivo ja existe: $OUTFILE" >&2
  echo "Apague ou escolha outro slug." >&2
  exit 1
fi

echo "→ Repo:       $REPO"
echo "→ Since:      $SINCE"
echo "→ Today:      $TODAY"
echo "→ Slug:       $SLUG"
echo "→ Title:      $TITLE"
echo "→ Output:     $OUTFILE"
echo ""

# Coleta commits desde a data, formato curto
COMMITS_RAW="$(cd "$REPO" && git log --pretty=format:"%h|%s" --since="$SINCE" --no-merges 2>/dev/null || true)"
COMMITS_COUNT=$(printf "%s\n" "$COMMITS_RAW" | grep -cE '^[a-f0-9]+\|' 2>/dev/null || echo 0)
FILES_TOUCHED=$(cd "$REPO" && git log --since="$SINCE" --no-merges --name-only --pretty=format: 2>/dev/null | sort -u | grep -cv '^$' 2>/dev/null || echo 0)
COMMITS_COUNT=$(echo "$COMMITS_COUNT" | tr -d ' \n')
FILES_TOUCHED=$(echo "$FILES_TOUCHED" | tr -d ' \n')

# Inferência simples de "size"
if [[ "$COMMITS_COUNT" -ge 25 ]]; then
  SIZE="epic"
elif [[ "$COMMITS_COUNT" -ge 12 ]]; then
  SIZE="large"
elif [[ "$COMMITS_COUNT" -ge 4 ]]; then
  SIZE="medium"
else
  SIZE="small"
fi

# Gera o markdown
{
  echo "---"
  echo "slug: $SLUG"
  echo "title: \"$TITLE\""
  echo "date: $TODAY"
  echo "status: in-progress   # planned | in-progress | shipped | paused"
  echo "size: $SIZE         # small | medium | large | epic"
  echo "tags: []           # ex: [ios, rag, lab]"
  echo "sprint: TBD"
  echo "related_adrs: []"
  if [[ -n "$COMMITS_RAW" && "$COMMITS_COUNT" -gt 0 ]]; then
    echo "commits:"
    printf "%s\n" "$COMMITS_RAW" | awk -F'|' '{ print "  - " $1 }' | head -20
    if [[ "$COMMITS_COUNT" -gt 20 ]]; then
      echo "  # truncado em 20 — total $COMMITS_COUNT"
    fi
  else
    echo "commits: []"
  fi
  echo "files_touched: $FILES_TOUCHED"
  echo "---"
  echo ""
  echo "## Resumo (leigo)"
  echo ""
  echo "<!-- 2-3 paragrafos sem jargao. O que mudou na pratica pra quem usa o app. -->"
  echo "<!-- Use analogias do dia-a-dia se ajudar. -->"
  echo ""
  echo "## Detalhes (tecnico)"
  echo ""
  echo "<!-- Arquitetura, decisoes, trade-offs. Termos tecnicos livremente. -->"
  echo "<!-- Link pra ADRs em [ADR-0001](../adr/0001-...) quando aplicavel. -->"
  echo ""
  echo "## Impacto & Proximos passos"
  echo ""
  echo "<!-- O que o usuario sente agora. O que vem na proxima sprint. -->"
  echo ""
  echo "---"
  echo ""
  echo "## Commits incluidos (referencia bruta — apagar antes de shippar)"
  echo ""
  if [[ -n "$COMMITS_RAW" ]]; then
    printf "%s\n" "$COMMITS_RAW" | awk -F'|' '{ print "- `" $1 "` " $2 }'
  else
    echo "_(nenhum commit encontrado desde $SINCE)_"
  fi
} > "$OUTFILE"

echo "✓ Draft criado: $OUTFILE"
echo ""
echo "Proximos passos:"
echo "  1. Abra o arquivo e finalize as 3 secoes (Resumo leigo, Detalhes, Impacto)"
echo "  2. Ajuste frontmatter (tags, sprint, related_adrs)"
echo "  3. Apague a secao 'Commits incluidos' depois de extrair contexto"
echo "  4. Mude status pra 'shipped' quando publicar"
