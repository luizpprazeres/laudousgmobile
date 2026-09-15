# Android: Doppler obstetrico combinado e isolado

## Escopo

Ownership exclusivo apps/mobile e esta nova story. Preservar alteracoes
preexistentes; nao editar API, packages/shared, web ou iOS. Sem deploy.
AGENTS.md e .aios-core/constitution.md nao existem neste checkout; seguidas
as instrucoes fornecidas pelo usuario, com gates restritos ao pacote mobile.

## Criterios e checklist

- [x] DOPPLER_OBSTETRICO envia doppler_mode combined por padrao.
- [x] Switch Somente Doppler envia isolated, inclusive na retomada clarify.
- [x] Categoria selecionada e raw_input nao sao remapeados/reescritos no Android.
- [x] Extracao combinada solicita OBSTETRICA + modulo DOPPLER_OBSTETRICO.
- [x] Combinado preserva biometria e Doppler no texto e dados para companion.
- [x] Isolado extrai/formata somente Doppler, sem biometria ou medidas morfologicas.
- [x] OBSTETRICA simples nao oferece nem solicita modulo Doppler opcional.
- [x] MORFOLOGICO conserva Doppler opcional e medidas dos seis ossos longos.
- [x] Testes focused: 9/9 passaram.
- [x] Typecheck mobile passou.
- [x] Lint e npm test tentados com filtro mobile: zero tarefas, nao sao gates verdes.
- [x] Build Android assembleDebug concluido.
- [x] Bundle JavaScript Android exportado.
- [ ] Smoke Android real com toggle, imagens e geracao.
- [ ] Historico combinado ponta a ponta validado pelo coordenador API.

## Arquivos

- apps/mobile/app/generate.tsx
- apps/mobile/src/ui/tokens.ts
- apps/mobile/src/shared/schemas/generate.ts (copia local mobile, nao packages/shared)
- apps/mobile/src/features/generate/dopplerMode.ts
- apps/mobile/src/features/imaging/ImageAnalysisSheet.tsx
- apps/mobile/src/features/imaging/imageAnalysis.ts
- apps/mobile/src/features/imaging/dopplerMode.manual.ts
- docs/stories/2026-09-14-android-doppler-combinado.md

## Testes e limites

`pnpm exec tsx apps/mobile/src/features/imaging/dopplerMode.manual.ts`: 9/9.
Testa schema/payload, combined/isolated, filtro dos dados estruturados,
biometria/vasos, morfo opcional, seis ossos, merge e categorias nao obstetricas.
A verificacao de ligacao da tela e estatica; nao equivale a interacao nativa.

`npm run typecheck` em apps/mobile: passou. A primeira tentativa revelou
incompatibilidade de import dinamico com a configuracao existente; corrigida
sem alterar tsconfig, mantendo carregamento tardio do cliente nativo.

`npm run lint -- --filter=@laudousg/mobile` e
`npm test -- --filter=@laudousg/mobile`: zero tarefas executadas.

Build inicialmente sem Java no ambiente. Reexecutado com JAVA_HOME apontando
para /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home.
`./gradlew :app:assembleDebug --console=plain`: BUILD SUCCESSFUL em 1m17s,
660 tarefas (105 executadas, 555 up-to-date). APK debug em
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk. Build debug
nao inclui a validacao do JavaScript; bundle conferido separadamente abaixo.

`pnpm exec expo export --platform android --output-dir .expo/doppler-validation`
em apps/mobile: passou, 1783 modulos, bundle Hermes 5.88 MB e 32 assets.
Artefatos locais ignorados pelo Git; sem mudanca de dependencias/configuracao.

`adb devices` vazio: sem smoke em aparelho/emulador. Nenhuma chamada clinica
real, upload de imagem, deploy ou persistencia remota feita nesta frente.

## Contrato com coordenador API

Geracao envia category_hint DOPPLER_OBSTETRICO + doppler_mode combined/isolated.
O remap combinado para renderer OBSTETRICA pertence a API, nao a este diff.
A base textual combinada precisa ser preservada no historico pelo backend;
o Android preserva o ditado e a categoria pedida, mas isso nao comprova a
persistencia/recuperacao combinada ponta a ponta. Gate externo pendente.

## Revisao do rotulo Android

Categoria DOPPLER_OBSTETRICO renomeada para "Obstétrica com Doppler", com
subtitulo "Obstétrica e avaliação hemodinâmica". ID, cor e comportamento
preservados. Alteracao restrita a tokens.ts e esta story.
Typecheck mobile repetido apos a mudanca: passou (exit 0).
Gradle e bundle nao repetidos nesta revisao, por ser apenas mudanca de rotulo,
conforme solicitado pelo coordenador. Evidencias anteriores nao representam
um novo APK/bundle contendo este texto.
