# Motor puro INTERGROWTH-21st 2020 para peso fetal estimado (EFW)

Status: motor implementado, 354 casos passaram e um caso foi conferido contra
o resultado armazenado na planilha oficial. Sem UI, sem deploy; isso nao
constitui validacao clinica completa.

## Fontes oficiais

- Stirnemann J, Salomon LJ, Papageorghiou AT. INTERGROWTH-21st standards for
  Hadlock's estimation of fetal weight. Ultrasound Obstet Gynecol
  2020;56:946-948. https://doi.org/10.1002/uog.22000
- Table S1 (equações): https://intergrowth21.com/sites/default/files/2024-09/uog22000-sup-0001-tables1_1.docx
  (texto extraído em docs/reviews/intergrowth2020-equations-source.txt).
- Script R oficial: https://intergrowth21.com/sites/default/files/2023-02/estimated_fetal_weight_r_script_code.docx
  (texto extraído em docs/reviews/intergrowth2020-r-source.txt).
- Política de limites de IG (out/2025): https://intergrowth21.com/sites/default/files/2025-10/policy_on_gestational_age_limits_for_fetal_growth_standards_6.pdf
  recomenda EFW entre 18 e 40 semanas.

## Contrato

- IG em dias inteiros 126..280 (18+0 a 40+0); fora disso, não inteiro, NaN ou
  infinito → `null`. Sem clamp e sem extrapolação. IG exata em semanas = dias/7.
- Peso em gramas positivo e finito; LMS aplicado sobre Y = ln(peso), não sobre o
  peso cru. Como a base (Y/μ) precisa ser positiva, peso ≤ 1 g → `null`.
- Parâmetros: λ (Nu), μ (Mu) e σ (Sigma) conforme Table S1/script R.
- `zScore(peso, dias)`, `quantile(z, dias)` e `percentile(peso, dias)` separados.
- λ cruza zero perto de 29 semanas: usar `expm1`/`log1p` (estável) e a fórmula
  limite (λ = 0) quando |λ| é desprezível.
- Percentil via CDF normal local (não havia implementação no web): série de
  Marsaglia (2004), sem dependências novas; testes com tolerância.
- Sem sexo fetal. Rótulo de versão "INTERGROWTH-21st 2020".
- A curva foi construída com Hadlock HC/AC/FL (3 parâmetros). O motor não
  importa nem associa automaticamente o Hadlock 1985 de 4 parâmetros
  (fetalWeight.ts); essa decisão fica para outra tarefa.
- Fora de escopo: UI, fórmula de peso, shared, mobile, API, texto clínico,
  produção, release.

## Aceite

- [x] Story criada antes do código.
- [x] Motor puro com API exportada e `null` em domínio inválido.
- [x] Testes: inversão z↔quantil, μ como p50, exemplos do script R, transcrição
      literal do R em todos os dias, limites 125/126/280/281, NaN/infinito,
      zero/negativo, λ perto de zero com fórmula limite, CDF normal.
- [x] Execução dos testes e conferência contra planilha oficial (coordenador).

## Arquivos

- apps/web/src/lib/calculators/intergrowth2020.ts
- apps/web/tests/intergrowth2020.manual.ts
- docs/stories/2026-09-14-intergrowth2020-core.md

## Evidências

Nenhum comando executado por este agente (sem shell). Valores esperados dos
exemplos R foram calculados à mão e usados com tolerância (Z ± 0,01; quantil
± 1 g); a validação precisa cabe ao coordenador.

### Conferencia do coordenador

- 354 casos executados com `pnpm exec tsx apps/web/tests/intergrowth2020.manual.ts`.
- Planilha oficial: https://intergrowth21.com/sites/default/files/2025-05/intergrowth_hadlock_efw_calculator_1.xlsx
  XML sheet1 linha 6: E6=171 dias; AI6=870.16177215199957 g;
  AM6=2.5499428963771749; AN6=0.99461297176800756 (probabilidade).
  Z e percentil reproduzidos com tolerancias 1e-12 e 1e-10.
- A mesma celula AI6 confirma Hadlock HC/AC/FL com intercepto 1.326.
  A planilha permite 42 semanas; o motor deliberadamente usa a recomendacao
  de 18..40 da politica oficial, nao o limite permissivo da planilha.
- Corrigido cancelamento numerico da CDF nas caudas, detectado pelo teste de
  monotonia. Fracao continua de Laplace para |z| >= 4; referencias de cauda
  em -4, -6 e -8 testadas com tolerancia relativa 1e-12.
- Typecheck: oito pacotes passaram. Lint bloqueado pelo assistente de
  configuracao ESLint preexistente. `npm test` executou zero tarefas; nao
  contado como evidencia de testes.
- Proximo passo separado: peso Hadlock 3 com proveniencia explicita e graficos;
  nao conectar automaticamente a peso manual ou Hadlock 4.
