# Sprint 7 — crescimento fetal e classificação de Gratacós

## Objetivo

Implementar a distinção entre feto adequado, PIG e restrição do crescimento fetal sem transformar percentil baixo ou uma única medida Doppler em estágio definitivo quando o protocolo exige confirmação.

## Fonte clínica

Fonte autoritativa: protocolo **Fetal growth defects**, Fetal Medicine Barcelona, versão publicada em novembro de 2024.

O `calc.js` fornecido tem cabeçalho de 2015 e permanece somente como referência histórica para coeficientes matemáticos. Sua árvore de classificação e manejo não será copiada quando divergir do protocolo atual.

## Limite explícito da curva de peso

A versão atual da calculadora da Fetal Medicine Barcelona estava em atualização durante a auditoria e o protocolo de 2024 descreve ajustes que não existem no `calc.js` de 2015. Por segurança, este sprint não apresenta uma curva histórica como se fosse a curva Barcelona atual. O sistema recebe um percentil já calculado, exige que a curva usada seja identificada e aplica somente a classificação de PIG/RCF e os estágios confirmados pelo protocolo atual.

## Regras aceitas

- [x] PIG: PFE maior ou igual ao percentil 3 e abaixo do percentil 10, com Doppler completo normal.
- [x] RCF estágio I: PFE abaixo do percentil 3; RCP abaixo do percentil 5 confirmado em duas medidas com intervalo superior a 12 horas; ACM abaixo do percentil 5 com a mesma confirmação; ou IP médio das uterinas acima do percentil 95.
- [x] RCF estágio II: PFE abaixo do percentil 10 com fluxo diastólico ausente na umbilical, confirmado conforme protocolo.
- [x] RCF estágio III: PFE abaixo do percentil 10 com fluxo reverso na umbilical ou alterações especificadas do ducto venoso, confirmadas conforme protocolo.
- [x] RCF estágio IV: PFE abaixo do percentil 10 com CTG patológico ou fluxo diastólico reverso no ducto venoso confirmado.
- [x] Achado único que exige repetição fica pendente; não recebe estágio definitivo.
- [x] O maior estágio confirmado prevalece, sem esconder critério mais grave ainda pendente.
- [x] O núcleo não sugere conduta, momento ou via de parto.
- [x] A curva usada para o percentil do peso é registrada separadamente da classificação.

## Entregas

- [x] Núcleo TypeScript compartilhado com fonte versionada e travas clínicas.
- [x] Casos golden para limites p3/p10 e estágios I–IV.
- [x] Adaptador entre percentis Doppler calculados e classificação.
- [x] Interface web com revisão explícita das confirmações.
- [x] Integração Android sem duplicar a matemática.
- [x] Port literal para iOS e casos golden equivalentes.
- [x] Bloco de laudo com referência didática da fonte.
- [x] Validação completa e envio da build iOS 163 ao processamento do TestFlight.
- [ ] Commits e push para a `main`.

## Validação executada

- [x] 54 verificações clínicas e de integração do crescimento fetal, incluindo laudos clássicos e objetivos em Obstétrica e Morfológica.
- [x] 49 verificações do Sprint 6 preservadas (Doppler Barcelona, situação fetal e composição dos laudos).
- [x] Typecheck dos oito pacotes.
- [x] Builds de produção da web e da API.
- [x] Build-for-testing do iOS, incluindo os novos casos golden Swift.
- [x] Fluxo diastólico ausente/reverso aparece no corpo e na conclusão e impede a frase contraditória de perfil hemodinâmico normal.
- [x] Calculadoras Hadlock não chamam peso abaixo de p10 de PIG antes da avaliação Doppler.
- [ ] Execução dos XCTest em simulador: indisponível nesta máquina; o bundle de testes compilou integralmente.
- [ ] Build global do monorepo: o app `lab` exige `NEXT_PUBLIC_SUPABASE_URL`; web e API foram compiladas separadamente com sucesso.
- [ ] Lint global: o repositório ainda abre o assistente interativo de configuração do `next lint`, sem configuração versionada.
