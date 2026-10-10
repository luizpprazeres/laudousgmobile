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

## Decisões do Dr. Luiz (09/10, noite) — datação e gestação inicial

7. Só IG de referência (sem biometria) → a conclusão usa a de referência.
8. A frase da datação passa a ser ESCOLHA do médico, não limiar: `biometria` ("Gestação em torno de X."),
   `us_precoce` ("Gestação em torno de X, corrigida pela ultrassonografia precoce.") ou `biometria_e_us_precoce`
   ("… pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com Y."). Web: caixas de
   seleção (padrão: só biometria). Ditado (mobile): 1ª US disponível → corrigida; senão biometria; "relacionar" no
   ditado → as duas. Detalhes: `haiku-migration/W5-…` (backend) e `W6-…` (web).
9. Gestação inicial sem embrião: "Embrião ainda não visualizado." / "Embrião e vesícula vitelínica ainda não
   visualizados."; conclusão "Gestação inicial." + "Convém realizar nova ultrassonografia no prazo de duas semanas, com
   o objetivo de acompanhar a evolução."

Correção de premissa (09/10): 14/10/2026 é a aposentadoria do gpt-4.1/4.1-mini no **Azure**; na API direta da OpenAI
não há data publicada. A migração não tem prazo duro.

## Decisões do Dr. Luiz (09/10, noite — 2)

10. gpt-4.1 removido de vez. MSK, carótidas e pelve → **Claude Sonnet 5.5** (writer dedicado no MSK/pelve; genérico nas
    carótidas), por configuração; teste Haiku × Sonnet no MSK para o Luiz escolher (W8).
11. Hipótese diagnóstica: padrão da casa **"que tem como diagnóstico mais provável …"**.
12. Mama: normal = BI-RADS 1; sem menção às axilas = exame só das mamas (título, corpo e conclusão sem axilas).
13. Tireoide: tabela de Domingos do Luiz (W7); "com áreas anecoicas" = 1 ponto. Confirmado pelo Luiz: **a tabela está correta** (isoecoica = 2).
14. Parede: diástase só > 2 cm.
15. Só DUM (sem 1ª US): a conclusão mantém a IG pela biometria informada — a DUM não corrige (web e ditado).

Frentes novas: W7 regras da casa (terminal W3), W8 MSK Haiku × Sonnet (terminal W4, antes da W6), W1 rodada 3 (Sonnet +
guard de comandos por laudo).

## Decisões do Dr. Luiz (10/10)

16. MSK: **Haiku 5.5** no writer dedicado com o prompt novo da W9; "sem evidência de rotura" em todo tendão alterado.
18. Pelve: **Sonnet 5.5** no writer dedicado (W10a). Biblioteca do abdome, vias e mama aplicada no banco (10/10, via MCP, com backup em tmp-review/haiku-migration/). "obtida em 06 fotos, segundo" → "obtida segundo" em prompts, few-shots, banco e sanitizador.
17. Rodada de prompts enxutos (método W9), prioridade: pelve (TA/TV/TA+TV) → abdome → vias urinárias → mamas/axilas →
    tireoide (W10a/b/c). Depois: revisão de termos (W11, na fila), com cautela no Deepgram.

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
- [x] W1 motor Haiku + roteamento + remoção do gpt-4.1-mini (integrado; gates verdes após merge com W3)
- [x] W2 extração obstétrica — variante mínima integrada (1a231310)
- [x] W3 prompt corpo descritivo + 4 defeitos do renderer do abdome (integrado em `eabc290f`)
- [x] W4 revisão por bancada + propostas priorizadas — integrado
- [x] W5 datação escolhida + gestação inicial sem embrião (backend) — integrado b6bf9a91
- [x] W6 web: caixas de seleção da datação — integrado 9f756d08
- [x] W7 regras da casa (integrado c79967bf) (prompt "diagnóstico mais provável", mama, Domingos, parede, rim ausente nas vias)
- [x] W8 MSK, pelve e carótidas Haiku × Sonnet — integrado
- [x] W1 rodada 3 (Sonnet 5.5 nos writers pesados + guard de comandos por laudo) — integrado ce33d744
- [x] W9 prompt dedicado do MSK — integrado 83a31a39
- [x] W1: MSK no Haiku por configuração (integrado)
- [x] W10a pelve · W10b abdome + vias + global · W10c mama + tireoide (prompts enxutos) — integradas
- [ ] W11 revisão de termos (fila)
- [ ] W12 miomas: FIGO ↔ localização, listas na web, 1/múltiplos/miomatoso no prompt (fila)
- [x] W13 revisão independente dos prompts (Codex gpt-6.1-sol medium)
- [x] W11 léxico da casa (ditado + saída, flag por categoria) e keyterms Deepgram (desligados por padrão) — integrada; decisões do Luiz em docs/stories/haiku-migration/W11-relatorio.md §5
- [x] W14b correções da rodada 2 do Codex (tireoide, motor) — integradas; pelve com a W12
- [x] W14 correções da revisão (W1, W4, W10b, W10c) — integradas; pendentes do Luiz: A04, A08, A10, A11, "2 9 cm", soma do volume da tireoide
- [x] Smoke real na API (Haiku: 4/4; Sonnet pelve ok) e deploy de produção SEM domínio da branch (`laudousgmobile-4mdtxfkdx`, saúde ok; produção intacta)
- [ ] Integração das branches em `feat/haiku-migration` + gates + bancada final
- [ ] GO do Luiz para push/deploy e para as envs da Vercel

## File List

- `apps/api/scripts/bench-haiku/{claudeCli,codexCli,bench-abdomen}.ts`, `relatorio.py`
- `apps/api/src/server/renderer/categories/dopplerObstetricoModule.ts` (+ OBSTETRICA.render.ts, OBSTETRICA.ts, MORFOLOGICO.ts)
- `apps/api/src/server/renderer/__tests__/doppler-percentis-barcelona.manual.ts`
