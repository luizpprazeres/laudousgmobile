# Integracao da previa INTERGROWTH na biometria

Status: implementacao local verificada; sem deploy.

## Escopo

Pedido: curvas de crescimento junto da biometria. Integrar componente de
previa somente leitura, alimentado por medidas em mm e IG explicita da
biometria. Nao alterar peso manual, percentil manual, fonte ou texto do laudo.
Nao usar Hadlock 4 como entrada da curva Hadlock 3.

## Aceite

- [x] Previa ligada a obstetrica, Doppler combinado e morfologico com biometria.
- [x] IG e medidas invalidas removem resultado antigo.
- [x] Grafico visivel sem sobreposicao em desktop e celular.
- [x] Peso e percentil manuais preservados.
- [x] Testes numericos, navegador e typecheck executados.

## Arquivos

- apps/web/src/components/laudar/BiometryGrowthPanel.tsx
- apps/web/src/components/laudar/LaudarWebExperience.tsx
- apps/web/tests/dopplerWeb.browser.manual.ts
- docs/stories/2026-09-14-intergrowth-preview-integration.md

Implementacao isolada do componente e formula documentada em
2026-09-14-intergrowth-preview.md. Nao inclui publicacao nem paridade mobile.

## Verificacao

49 casos de previa, 354 do motor INTERGROWTH, 55 de Hadlock 4 e 74 de
invalidacao do contexto passaram. Typecheck 8/8 e build web passaram.
Lint continua bloqueado pela configuracao ESLint ausente; npm test executa
zero tarefas, nao contado como gate. diff --check passou.

Browser harness com autenticacao/salvamento simulados e renderer real:
modo combinado/isolado, rascunhos, salvar, erro e respostas antigas passaram.
Novo caso obstetrico: peso manual 1977 e percentil manual 11 preservados;
CC230/CA210/CF50 e IG24+3 produzem870g/P99,5, mesmo com DBP invalido;
alterar DBP nao altera Hadlock3. Cinco curvas visiveis, exclusao de CC ou dias
remove a previa. Capturas 1440x900 e390x844 revisadas visualmente, sem cortes.
Evidencias: /var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-WIVtl0

IG usada e explicitamente a IG da biometria, nao calculada de DUM/US precoce.
Sem classificacao automatica, insercao no laudo, envio ou impressao nesta etapa.
Validacao numerica nao equivale a validacao clinica completa. Sem limites
biologicos adicionais inferidos para medidas positivas. Preview local em3110.
