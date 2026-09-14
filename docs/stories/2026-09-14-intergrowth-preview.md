# Prévia INTERGROWTH-21st 2020 com gráfico (web)

Status: implementado por agente sem shell; testes, typecheck, build e
conferência no navegador ficam com o coordenador. Nenhum comando foi executado
por este agente. Não constitui validação clínica.

## Contexto

O motor puro (docs/stories/2026-09-14-intergrowth2020-core.md) calcula Z,
quantil e percentil do padrão INTERGROWTH-21st 2020, construído sobre Hadlock
HC/AC/FL (3 parâmetros). Falta uma prévia visual, somente leitura, que mostre o
peso Hadlock 3 calculado a partir da biometria e sua posição nas curvas.

## Fonte da fórmula

Planilha oficial https://intergrowth21.com/sites/default/files/2025-05/intergrowth_hadlock_efw_calculator_1.xlsx
(sheet1, célula AI6), medidas em cm:

    peso g = 10^(1,326 + 0,0107·CC + 0,0438·CA + 0,158·CF − 0,00326·CA·CF)

Referência externa armazenada na planilha (linha 6): CC 230 mm, CA 210 mm,
CF 50 mm, IG 171 dias → peso 870.16177215199957 g, Z 2.5499428963771749,
percentil 99.461297176800756.

## Contrato

- Helper `intergrowthBiometryPreview(biometryState, chaveFemur, igState)`:
  - `biometryState: Record<string, unknown>`; CC em `cc`, CA em `ca`, fêmur na
    chave `cf` ou `femur` (`chaveFemur`), `null` → sem resultado.
  - Medidas pelo `parseMedidaMm` existente; mm sempre ÷10; sem heurística de
    unidade.
  - `igState.bio_sem` e `igState.bio_dias`: strings de inteiros estritos;
    dias 0..6; vazio não vira zero; total 126..280 dias.
  - Peso Hadlock 3 cru (sem arredondar) → Z/percentil pelo motor existente.
  - Qualquer entrada inválida → `null`.
- Curvas P3/P10/P50/P90/P97 de 18 a 40 semanas via `intergrowth2020EfwQuantile`,
  com z constantes da normal padrão verificáveis por `standardNormalCdf`.
- Formatação: peso arredondado em gramas; percentil com 1 decimal; abaixo de
  0,1 exibe "< 0,1" e acima de 99,9 exibe "> 99,9" (nunca 0 ou 100).
- Componente `IntergrowthPreview` props `{ biometryState, chaveFemur, igState }`,
  somente leitura: sem callbacks, sem alterar peso, percentil ou laudo, sem botão
  aplicar.
  - Título "INTERGROWTH-21st 2020", fórmula CC/CA/CF, IG usada, peso e percentil.
  - Rótulo deixa claro que o ponto é o peso calculado, não o peso informado.
  - SVG responsivo, sem moldura, altura 220, `role="img"` com `aria-label` com os
    dados e legenda textual; verde (ponto) e cinza (curvas), sem gradiente.
  - Inválido: não renderiza resultado anterior (derivado a cada render); estado
    breve "Dados incompletos".
- Fora de escopo: classificação clínica, sexo fetal, inferência diagnóstica,
  integração em telas existentes, Hadlock 4, shared, mobile, API, produção.

## Aceite

- [x] Story criada antes do código.
- [x] Helper puro com fórmula Hadlock 3, parser de IG estrito e curvas.
- [x] Componente somente leitura com gráfico SVG e estado incompleto.
- [x] Testes manuais: fixture da planilha, parser de medidas e IG, chave
      `femur` do morfológico, entradas inválidas, mudança de IG, formatação de
      extremos, z das curvas.
- [x] Execução dos testes, typecheck, build e navegador (coordenador).

## Arquivos

- apps/web/src/lib/calculators/intergrowthBiometry.ts
- apps/web/tests/intergrowthBiometry.manual.ts
- apps/web/src/components/laudar/IntergrowthPreview.tsx
- docs/stories/2026-09-14-intergrowth-preview.md

## Evidências

Coordenador executou 49 casos com `pnpm exec tsx apps/web/tests/intergrowthBiometry.manual.ts`:
passaram. Corrigida expectativa de teste para99.94, que pelo contrato deve
exibir >99,9. Formula nao alterada. Build/typecheck e navegador passaram.
Integracao e capturas registradas na story 2026-09-14-intergrowth-preview-integration.md.
