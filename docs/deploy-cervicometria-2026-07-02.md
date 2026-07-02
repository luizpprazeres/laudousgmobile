# Ativação da categoria CERVICOMETRIA (checklist de deploy)

> **Estado:** código mergeado e DORMENTE. A categoria só passa a existir/rotear
> após os passos 1–2 abaixo. Ver `renderer/categories/CERVICOMETRIA.ts`.
> **Origem:** gap #2 da auditoria de renderers; spec clínica ditada pelo Dr. Luiz
> (2026-07-02). Formato = laudo assinado real (report `aa95bb81`).

## Por que é dormente (gate natural)

A categoria NÃO roteia até:
1. **Row no DB** — `categories` precisa ter `CERVICOMETRIA` ativa (o structurer/
   classificador só conhece códigos vindos da tabela; `resolveCervicometriaCategory`
   é gated por `knownCodes.has("CERVICOMETRIA")`).
2. **Env `RENDERER_CATEGORIES`** no Vercel — precisa incluir `CERVICOMETRIA`
   (senão o route não entra no caminho renderer determinístico).

Sem QUALQUER um dos dois, nada muda em produção.

## Passos para ATIVAR (após confirmação dos thresholds pelo Luiz)

1. **DB (prod `yldtkqrsbgcnwlydrrot`):**
   ```sql
   INSERT INTO categories (code, label, active)
   VALUES ('CERVICOMETRIA', 'Cervicometria (colo uterino)', true)
   ON CONFLICT (code) DO UPDATE SET active = true, label = EXCLUDED.label;
   ```
   (O seed em código — `packages/db/src/seeds/data.ts` — já tem a linha; este INSERT
   é para o banco de prod que não roda seed.)
2. **Vercel:** adicionar `CERVICOMETRIA` ao valor de `RENDERER_CATEGORIES` em
   production (append à lista separada por vírgula) → **REDEPLOY**.
3. **App iOS (Swift, `~/laudousg-swift`):** oferecer "Cervicometria (colo uterino)"
   no seletor de categoria — OU confiar no override por texto: o médico dita
   "ultrassonografia da medida do colo uterino" e `resolveCervicometriaCategory`
   reclassifica de PELVE. (Confirmar o fluxo de UI com o Luiz.)
4. **Cache:** `getKnownCategories` tem cache module-level (vida da função
   serverless) — o redeploy zera; sem redeploy, esperar reciclagem da instância.

## ❓ A CONFIRMAR com o Luiz antes de ativar

- **Thresholds do colo** (encoded em `classificarColo`, constante fácil de mudar):
  - `L ≥ 2,5 cm` → "Colo uterino ecograficamente normal."
  - `2,0 ≤ L < 2,5 cm` → "Colo uterino um pouco curto (medindo X cm)."
  - `L < 2,0 cm` → "Colo uterino curto (medindo X cm), com alto risco para trabalho
    de parto prematuro." (corte < 2,0 = escolha conservadora do Luiz, mais sensível
    que a tabela clássica ~1,5 cm, para intervir em mais gestantes.)
- **Placenta prévia:** só entra na conclusão a partir de **32 semanas** e se a
  placenta foi avaliada. (Confirmar o corte de 32.)
- **Formato numérico:** vírgula, 1 casa (estilo dominante da casa). O único laudo de
  cervicometria no banco usava ponto por ser colado — confirmar vírgula.
- **Guard mm→cm:** backstop determinístico (colo > 6 → ÷10). O prompt já converte;
  o guard cobre falha do LLM. Confirmar a heurística.
- **Redação do OI aberto e do item de cerclagem** ("Pontos de cerclagem uterina em
  topografia habitual.") — o Luiz disse que a frase de cerclagem "dá para melhorar".

## Testes (todos verdes, sem LLM)

- `cervicometria-golden.manual.ts` (36/36): formato aa95bb81, thresholds, placenta
  (com medida / distante / omitida), placenta prévia por IG, cerclagem, colo null,
  OI aberto, mm→cm.
- `cervicometria-routing.manual.ts` (6/6): override por texto, não-disparo em pelve
  geral, gate por knownCodes.
- Smoke real (extração LLM, 5 casos): `tmp-review/smoke-cervicometria-2026-07-02.txt`.
