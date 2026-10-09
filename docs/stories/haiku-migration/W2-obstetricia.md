# W2 — Extração obstétrica com Haiku: datação, vitalidade e percentis

Terminal: Codex gpt-6.1-sol (low) · Worktree `~/laudousg-wt/obst` · Branch `fix/obst-extracao-ig`
Leia antes: `_comum.md` e a story.

## Contexto (bancada de 09/10, 46 laudos reais)

Haiku 5.5 como extrator + renderer empatou com a produção no obstétrico, mas errou a **datação** em casos
específicos. Todos conferidos no `calls.jsonl` da rodada
`tmp-review/bench-haiku/2026-10-09T15-54-20-obstetrica+doppler_obstetrico` (repositório principal):

| Caso | Ditado | Haiku extraiu | Efeito no laudo |
|---|---|---|---|
| 9bbb44a0, 8af4d1cb | "1ª US … com 9 semanas" (sem dias) | `primeira_us_ig_dias: null` (o gpt põe 0) | renderer apaga a linha inteira de datação |
| a14ccf00 | "hoje com 34 semanas" | `data_exame: "09/10/2026"` (data de hoje, não ditada) | IG recalculada para 35s3d (parte é artefato do CLI) |
| b4a09bfb | "hoje com 32 semanas e 4 dias" + "IG pela biometria 32s3d" | `ig_dias: 3` | conclusão com a IG errada |
| bec362d5 | CCN 14 mm + "gestação sem vitalidade" | embrião "não visualizado" | conclusão inventa ausência de embrião |

Já resolvido na base (`7809c3bf`): o renderer calcula os percentis Barcelona que faltarem — não dependa mais de o
extrator copiar a linha "→ Percentis" do app.

## Tarefas

1. **Regras no prompt de extração obstétrica** (texto do prompt em `renderer/categories/OBSTETRICA.ts` — ex. a lista
   de campos perto da linha 467 — e o equivalente do `MORFOLOGICO.ts`; confira também o módulo Doppler
   `renderer/categories/dopplerObstetricoModule.ts` só para regras de texto). **Sem mudar o schema/contrato**:
   - "N semanas" sem dias ⇒ dias = 0 (vale para `primeira_us_ig_*` e `ig_*`).
   - `data_exame` só quando o médico dita uma **data** (dd/mm/aaaa ou "dia X de mês"); "hoje com N semanas" não é data.
   - IG atual: a IG ditada em "hoje com N semanas e D dias" prevalece sobre "IG pela biometria" para `ig_semanas/ig_dias`
     (a biometria tem campos próprios — confirme no schema quais).
   - "sem vitalidade" / "BCF ausente" ≠ embrião não visualizado: se houver CCN ou embrião descrito, o embrião foi visto.
   - Linha "→ Percentis" do app: só copiar o percentil se o IP da linha for igual ao IP ditado do vaso; senão `null`
     (o renderer calcula).
2. Gates (de `apps/api`): `contrato-extracao-obstetrica.manual.ts`, `catalog-equivalence.manual.ts`,
   `doppler-obstetrico-golden.manual.ts`, `doppler-percentis-barcelona.manual.ts`, `obstetrica.manual.ts`,
   `obstetrica-objetivo-golden.manual.ts`, `obstetrica-23b1-clinical-matrix.manual.ts` (todos em
   `src/server/renderer/__tests__/`), `pnpm -F api typecheck`.
3. Bancada (assinatura): rode `--category OBSTETRICA,DOPPLER_OBSTETRICO --scenarios R,A` em todos os casos e compare
   com a rodada `2026-10-09T16-07-36-obstetrica+doppler_obstetrico` (juiz com R e A): os 5 casos acima precisam
   melhorar e nenhum outro pode piorar sem explicação. Rode também `--category MORFOLOGICO --scenarios R,A`.
4. **Investigar e propor (sem implementar)**: gestação inicial sem embrião — o schema exige ≥ 1 feto, o Haiku
   devolve 0 (correto) e o renderer recusa (87bfacbe, a328ecec); o gpt-4.1-mini inventava embrião com BCF.
   Proponha o caminho certo (slot "embrião não visualizado"? exceção no schema? rota própria?) no relatório.

## Fora do escopo

`renderer/extraction.ts` (código da chamada — W1), `pipeline/*` (W1), `prompts/global.ts` e `prompts/contracts/*` (W3),
`renderer/phrases/*` (W3), o `OBSTETRICA_JSON_SCHEMA`.

## Entregável

Commits em `fix/obst-extracao-ig` + `docs/stories/haiku-migration/W2-relatorio.md`: regras adicionadas, antes × depois
da bancada (notas do juiz, os 5 casos), gates, proposta para gestação sem embrião.
