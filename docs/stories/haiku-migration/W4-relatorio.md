# W4 — Relatório da frente (revisão por bancada)

Status: **pronto para revisão** · Branch `chore/revisao-bancada` · 09/10/2026

Entregável principal: `docs/reviews/2026-10-revisao-renderers-prompts.md` (números por categoria, defeitos com
`arquivo:linha`, recomendação de roteamento, lista priorizada e decisões do Luiz). Nenhum arquivo de produção alterado.

## O que foi feito

- Bancada generalizada para todas as categorias do escopo (`bench-abdomen.ts`): flags de produção descobertas pela auditoria
  (RENDERER_CATEGORIES completo, MSK/PELVE/PARTES_MOLES writer_guarded, passthrough, guards de mama/tireoide/pelve),
  caminho de produção por laudo, `A` no caminho atual de cada categoria, `--a-key` para comparar caminhos (Pelve),
  few-shots multi-turno dos writers dedicados, guards do writer que faltavam (Cervical, MSK), métrica de recusa,
  juiz com regras por categoria.
- Replay provado: 31/40 idênticos à produção desde 11/08; as 9 diferenças são código datado. Antes de 11/08 a auditoria
  não gravava os achados do renderer, então não há replay.
- Rodadas R/A/B2 (+AR) com juiz Opus em 12 categorias e 239 laudos; HTML local por rodada em
  `tmp-review/bench-haiku/w4/` (fora do git).
- `auditoria-90d.ts`: medições determinísticas de banco que sustentam os achados transversais.

## Resultado em uma linha por categoria

- **Parede abdominal / Escrotal:** Haiku escritor melhor que a produção (6,9–7,1 × 4,6–6,0).
- **Pelve (pedido do Luiz):** Haiku no **writer dedicado** 6,6; Haiku + renderer 3,8; writer genérico bloqueado em 57%.
  Produção 7,7. Recomendação: writer dedicado + guard de saída.
- **MSK:** produção (gpt-4.1) 8,3–8,5 × Haiku 6,2–6,5 — não migrar nesta leva se o gpt-4.1 continuar.
- **Tireoide, Mama, Próstata, Cervical, Vias:** ficar no renderer, corrigindo os defeitos listados; Haiku-extrai só depois
  de T3 (metatexto) e das correções de schema. Vias tem um defeito grave independente da migração (rim ausente = normal).
- **Carótidas:** Haiku acerta números, perde estrutura; precisa de contrato antes de trocar.

## O que mais importa para W1/W2/W3

1. Guard de comandos (T1/MK-1): apaga-se 80% do que ele acrescenta; destrói laudo com vários exames (4 vezes em produção).
2. Haiku como extrator escreve comentários nos campos de texto (11/67; gpt 0) — vale para a obstétrica.
3. Haiku como escritor: recusa ditado curto de normalidade; markdown e notas ao médico dentro do laudo.
4. Laudo colado pronto (11% dos ditados) deve ir ao writer, não ao renderer.
5. Writers dedicados (MSK, Pelve, Partes moles, renal, hepático, venoso) usam **gpt-4.1** (`env.ts` `*_WRITER_MODEL`).

## Limitações

- Viés de ancoragem: o final é editado a partir do texto da produção (similaridade média 0,58–0,98).
- n pequeno em Cervical, Escrotal, Carótidas; Partes moles e Abdome superior com 1 laudo (sem recomendação).
- Na bancada os few-shots dos writers dedicados vão no system (o `claude -p` aceita um só prompt); na API vão como turnos.
- Uma queda de rede ao Supabase e um logout da assinatura interromperam rodadas; tudo foi retomado e concluído.

## Commits

`028a5c15`, `027f9938`, `ecbb930b`, `01f30375` + o commit deste relatório.
