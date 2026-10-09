# Migração para Claude Haiku 5.5 — extrator + escritor (09/10/2026)

Status: **InProgress** · Branch base: `feat/haiku-migration` · Orquestrador: Claude Code (Opus 5.5)

## Por quê

- `gpt-4.1-mini` é o extrator (`OPENAI_MODEL_STRUCTURER`) e o modelo de sanity de **todas** as categorias e
  sai da API da OpenAI em **14/10/2026**.
- Bancada de 09/10 (laudos reais, Haiku pela assinatura, juiz Opus cego): Haiku 5.5 empata ou supera a
  produção como extrator; como escritor completo é a melhor opção fora da obstetrícia, desde que o prompt
  peça corpo descritivo. Relatórios locais em `tmp-review/bench-haiku/` (dados reais — não versionar).

## Decisões do Dr. Luiz (09/10)

1. **Família obstétrica** (OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO, CERVICOMETRIA): Haiku 5.5 como
   **extrator** + renderer atual (o escritor completo omitiu 112 achados e errou 38 medidas no obstétrico).
2. **Demais categorias, exceto Laudo Livre**: Haiku 5.5 como **escritor completo** (no lugar do gpt-5.4-mini).
3. **Pelve feminina**: o Luiz vai comparar depois Haiku+renderer × só writer Haiku — a rota tem de permitir
   os dois por configuração; a bancada deve entregar a comparação.
4. Remover o `gpt-4.1-mini` de vez.
5. Prompt base com a regra **"corpo descritivo, conclusão diagnóstica"** (testada como B2 na bancada).
6. Revisão de alta prioridade, pela bancada via assinatura, para propor melhorias nos renderers
   determinísticos e nos prompts de base.

## Tabela de roteamento alvo

| Grupo | Categorias | Caminho | Modelo |
|---|---|---|---|
| Obstétrica | OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO, CERVICOMETRIA | renderer | Haiku extrai (+ free-slots) |
| Renderers clínicos fail-closed* | ABDOMEN_TOTAL_DOPPLER, DOPPLER_VENOSO_MMSS, DOPPLER_ARTERIAL_MMSS, TORAX, QUADRIL_INFANTIL | renderer | Haiku extrai |
| Writers dedicados com auditoria | MUSCULOESQUELETICO_V2, PARTES_MOLES, DOPPLER_RENAL, DOPPLER_HEPATICO, DOPPLER_VENOSO_MMII(_MEDIDAS) | writer dedicado | Haiku escreve |
| Pelve | PELVE_FEMININA | atual, alternável por config | Haiku |
| Demais | ABDOMEN_TOTAL, ABDOMEN_SUPERIOR, TIREOIDE, MAMARIA, CERVICAL, PROSTATA_*, VIAS_URINARIAS, ESCROTAL, PAREDE_ABDOMINAL, DOPPLER_CAROTIDAS, REGIAO_INGUINAL… | writer completo (bundle + guards full) | Haiku escreve |
| Livre | LIVRE | inalterado | Haiku (já está) |

\* Exceção proposta pelo orquestrador, a confirmar com o Luiz: a política atual proíbe que esses cinco
caiam no writer genérico (podem inventar normalidade, ângulos de Graf ou volume).
Categoria cujo esquema visual/Sala/web depende dos achados estruturados do renderer **não muda de caminho**
até o inventário de consumidores (W1) e a evidência da bancada (W4).

## Frentes (cada uma em worktree e branch próprias)

| Frente | Terminal | Worktree / branch | Briefing |
|---|---|---|---|
| W1 Motor Haiku (API) + roteamento + remover gpt-4.1-mini | Claude Code Opus 5.5 | `~/laudousg-wt/motor` · `feat/haiku-motor` | `docs/stories/haiku-migration/W1-motor.md` |
| W2 Extração obstétrica (datação, vitalidade) | Codex gpt-6.1-sol (low) | `~/laudousg-wt/obst` · `fix/obst-extracao-ig` | `docs/stories/haiku-migration/W2-obstetricia.md` |
| W3 Prompt "corpo descritivo" + defeitos do renderer do abdome | Codex gpt-6.1-sol (low) | `~/laudousg-wt/prompts` · `fix/corpo-descritivo` | `docs/stories/haiku-migration/W3-prompts-renderer.md` |
| W4 Revisão por bancada (renderers + prompts base) | Claude Code Opus 5.5 | `~/laudousg-wt/revisao` · `chore/revisao-bancada` | `docs/stories/haiku-migration/W4-revisao.md` |

Status de cada frente: `tmp-review/haiku-migration/status/W*.md` no repositório principal (o orquestrador monitora).

## Regras para todas as frentes

- Trabalhar **só** no próprio worktree e nos arquivos do próprio escopo. Commits na própria branch
  (conventional commits + `Co-Authored-By`). **Nada de push, PR, deploy ou mudança de env na Vercel.**
- Nunca mexer no `OBSTETRICA_JSON_SCHEMA` sem prompt e consumidor na mesma leva (README).
- Testes com modelo: **pela assinatura** (`claude -p` / `codex exec`) via `apps/api/scripts/bench-haiku`. Sem
  gastar API, exceto o smoke opcional do W1 (máx. 10 chamadas Haiku).
- Gates mínimos antes de dizer "pronto": `pnpm -F api typecheck` e os `.manual.ts` do escopo.
  `obstetricaPlainDoppler.manual.ts` já falha antes destas mudanças (`selectedHint is not defined`).
- Dados de pacientes só em `tmp-review/` (gitignored).

## Checklist

- [x] Bancada via assinatura (`fcab2dd3`)
- [x] Percentis Barcelona completados no renderer Doppler (`7809c3bf`)
- [ ] W1 motor Haiku + roteamento + remoção do gpt-4.1-mini
- [ ] W2 extração obstétrica (datação/vitalidade) + bancada obstétrica refeita — 1ª entrega revisada; regra de IG do briefing estava errada (ig_semanas é a IG da biometria), correção pedida
- [x] W3 prompt corpo descritivo + 4 defeitos do renderer do abdome (integrado em `eabc290f`)
- [ ] W4 revisão por bancada + propostas priorizadas
- [ ] Integração das branches em `feat/haiku-migration` + gates + bancada final
- [ ] GO do Luiz para push/deploy e para as envs da Vercel

## File List

- `apps/api/scripts/bench-haiku/{claudeCli,codexCli,bench-abdomen}.ts`, `relatorio.py`
- `apps/api/src/server/renderer/categories/dopplerObstetricoModule.ts` (+ OBSTETRICA.render.ts, OBSTETRICA.ts, MORFOLOGICO.ts)
- `apps/api/src/server/renderer/__tests__/doppler-percentis-barcelona.manual.ts`
