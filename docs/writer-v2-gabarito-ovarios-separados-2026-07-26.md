# Writer V2 — Gabarito OVÁRIOS SEPARADOS (PELVE_FEMININA)

Decisão do Luiz (26/07): **padronizar os ovários SEMPRE em dois itens separados**
(um por ovário), em vez do item combinado do gabarito original. Isso mantém o
vínculo 1 slot→1 item do motor e elimina as flags #1/#5 (o caso "um ovário
alterado, o outro normal" passa a cair naturalmente em cada slot).

Fonte = função `itemOvario` do renderer `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts`
(linhas ~703-738). Reproduzir estas formas por-lado EXATAMENTE.

## Formas por-lado (renderer, canônicas)

- **Normal** (linha 738): `Ovário {lado} ecograficamente normal ({vol} cm³), contendo folículos.`
- **Menopausa/atrófico** (linha 736): `Ovário {lado} ecograficamente normal ({vol} cm³), praticamente sem folículos.`
- **SOP** (linha 726): `Ovário {lado} de volume aumentado ({vol} cm³), contendo mais de 20 folículos.`
- **Não visualizado** (linha 712): `Ovário {lado} não visualizado pela técnica empregada.`
- **Alterado (endometrioma/funcional/genérico)** (720/723/730/733): levam
  `de volume {classe} ({vol} cm³)` — **NÃO mexer agora**: o renderer tem um
  TODO (linha 716) "ovário alterado leva o volume + classe na conclusão
  (decisão Luiz)" ainda pendente. Manter as entradas de achado como já estão
  (já são por-lado).

`{lado}` = "direito" | "esquerdo". `{vol}` = volume calculado das medidas.

## Regra do parentético de volume (paridade com o útero — flag #2)

- **Base (sem medida ditada):** SEM parentético → `Ovário direito ecograficamente
  normal, contendo folículos.` / `Ovário esquerdo ecograficamente normal, contendo
  folículos.`
- **Com medida ditada:** entrada de dicionário injeta `({vol_OD}/{vol_OE} cm³)`,
  igual ao que o útero já faz ("volume uterino explicitamente informado como normal").

## Estrutura-alvo do spec

1. **Remover** o slot `ovarios_conclusao` (combinado).
2. **Dar frase_conclusao** aos slots `ovario_dir` / `ovario_esq` (as bases sem parentético acima).
3. **conclusao_ordem** = `[bexiga, utero, endometrio, ovario_dir, ovario_esq,
   miometrio, istmo, colo, diu, fundo_saco]` (dir/esq no lugar do antigo `ovarios_conclusao`).
4. **Converter** as entradas de dicionário bilaterais COMBINADAS para forma por-lado
   (cada uma alvo do seu próprio slot, emitindo SÓ o seu lado):
   - menopausa dir/esq → forma "praticamente sem folículos" por-lado.
   - SOP dir/esq → forma "de volume aumentado... mais de 20 folículos" por-lado.
5. Alinhar não-visualizado ao renderer ("...pela técnica empregada.").

## Ponto a FLAGGAR (não resolver às cegas)

- **Recomendação FSH/LH do SOP.** O renderer emite a recomendação de correlação
  FSH/LH UMA vez (adendo), independente de ser um ou ambos os ovários SOP. No
  modelo por-slot, se cada lado SOP emite seu item, a recomendação única não tem
  um slot natural. Propor: item avulso/adendo condicional disparado quando
  qualquer ovário é SOP (dedup), OU deixar a recomendação como cauda do item do
  primeiro lado SOP. Flaggar a escolha para revisão.

## Numeração normal esperada (5 itens, TA+TV, tudo normal, com medidas ditadas)

```
1) Bexiga ecograficamente normal.
2) Útero de volume normal (75,3 cm³).
3) O endométrio tem espessura normal para a fase do ciclo menstrual.
4) Ovário direito ecograficamente normal (6,9 cm³), contendo folículos.
5) Ovário esquerdo ecograficamente normal (6,8 cm³), contendo folículos.
```
