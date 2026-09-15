# Peso fetal calculado Hadlock 1985 (DBP/CC/CA/CF) na web

Status: implementada e verificada localmente pelo coordenador. Sem deploy.
Escopo pontual autorizado por Luiz.

## Fonte

- Hadlock FP et al. Am J Obstet Gynecol 1985;151(3):333-337 (PMID 3881966).
- Forma verificada pelo coordenador em https://loinc.org/11732-5:
  log10(peso g) = 1,3596 - 0,00386·CA·CF + 0,0064·CC + 0,00061·DBP·CA
  + 0,174·CF + 0,0424·CA, com todas as medidas em cm.

## Contrato e limites

- Campos web de biometria sao explicitamente mm (labels "(mm)"): converter
  sempre /10. Sem heuristica normalizeCm do Swift, sem adivinhar unidade.
- Chave do femur conforme schema real: `cf` (OBSTETRICA e Doppler combinado)
  ou `femur` (MORFOLOGICO).
- Parser estrito: apenas digitos com um separador decimal virgula ou ponto;
  rejeita sufixos, notacao exponencial, NaN/Infinity, overflow, zero e negativo.
- Resultado exibido no BiometryGrowthPanel apenas com as quatro medidas
  validas; caso contrario, indisponivel.
- Calculo automatico com aplicacao explicita: botao icone com label acessivel
  grava o valor arredondado (g inteiro) no campo `peso` existente. Peso manual
  preservado ate o comando. Aplicacao usa o `onBiometryChange` existente, que
  invalida percentil manual quando o peso muda.
- Arredondamento so no valor exibido/aplicado.
- Sem percentil automatico, sem faixa +/-15%, sem diagnostico ou classificacao.
- Sem alterar LaudarWebExperience, shared, catalog, iOS, API, banco, deploy ou
  commit. Dirty de outras frentes preservado.

## Aceite

- [x] Helper puro com parser estrito e formula em cm a partir de mm.
- [x] Testes numericos (formula LOINC em cm), invalidos e unidade explicita
      (55 casos executados com sucesso).
- [x] Chaves reais dos schemas OBST/MORFO/Doppler combinado cobertas.
- [x] UI compacta sem novo card, botao icone lucide com aria-label e title
      nativo (nao ha componente Tooltip na web).
- [x] Typecheck e diff check (executados pelo coordenador).

## Arquivos

- apps/web/src/lib/calculators/fetalWeight.ts
- apps/web/tests/fetalWeight.manual.ts
- apps/web/src/components/laudar/BiometryGrowthPanel.tsx
- docs/stories/2026-09-14-web-peso-hadlock.md
- apps/web/tests/dopplerWeb.browser.manual.ts (integracao pelo coordenador)

## Evidencias

Coordenador executou 55 testes numericos/parser, typecheck de 8 pacotes,
build web e git diff --check, todos com sucesso. Playwright confirmou calculo
1977 g para DBP82 CC295 CA285 CF62 mm, preservacao do peso manual ate aplicar,
invalidacao do percentil apos aplicar e indisponibilidade com medida invalida.
Capturas: /var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-ThZrq9.
Auth/save simulados. Lint bloqueado por configuracao ESLint preexistente;
npm test executa zero tarefas. Sem validacao clinica inferida desses testes.
Nao ha validacao de plausibilidade biologica de todas as combinacoes positivas.
