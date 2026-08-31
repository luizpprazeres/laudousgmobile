# Sprint 6 — conexão celular, situação fetal e Doppler Barcelona

## Objetivo

Corrigir a conexão iPhone–web, representar corretamente situação/apresentação fetal e tornar o complemento Doppler mais compacto e clinicamente seguro nas categorias Obstétrica, Morfológica e Doppler obstétrico isolado.

## Resultado

- [x] O banco atual foi delimitado no projeto Supabase `laudousgmobile` (`yldtkqrsbgcnwlydrrot`), separado da plataforma antiga.
- [x] A sessão de pareamento criada pela web chega ao banco, mas o teste real não registrou `connected_at` nem evento mobile; a falha ficou localizada no fluxo iOS.
- [x] O botão iOS passou a validar e normalizar o código de seis caracteres, responder ao teclado e usar toda a área visual como alvo de toque.
- [x] O `PATCH` de conexão iOS passou a incluir explicitamente o usuário autenticado, além da proteção por RLS.
- [x] Situação longitudinal é o padrão; nela, a apresentação pode ser cefálica ou pélvica.
- [x] Situação transversa/córmica não usa apresentação e exige o lado do polo cefálico; dorso permanece opcional.
- [x] A regra foi aplicada aos modelos clássico e objetivo de Obstétrica e Morfológica, inclusive gestação múltipla.
- [x] IR e IP aparecem lado a lado; IR é opcional e só entra na conclusão quando foi realmente informado.
- [x] O IP médio das uterinas é calculado automaticamente a partir dos lados direito e esquerdo.
- [x] Até 15 semanas, a interface e o adaptador aceitam apenas os IPs uterinos para o bloco Doppler.
- [x] Percentis uterinos são calculados entre 11 e 44 semanas; umbilical, ACM e RCP, entre 20 e 44 semanas.
- [x] O laudo identifica didaticamente a Fetal Medicine Barcelona quando exibe percentis calculados.

## Auditoria clínica da fonte Barcelona

O arquivo fornecido reproduz a calculadora histórica e tem cabeçalho de 2015. Os coeficientes de Doppler foram conferidos e usados com faixas explícitas, sem forçar percentil de vaso fora da faixa. O site atual informa que a calculadora está em atualização; por isso, a implementação não afirma uma versão específica.

O fluxo `Fetal Growth` é diferente do cálculo isolado de Doppler. Ele exige peso fetal e outros achados para classificar restrição e estágio de Gratacós, com entrada a partir de 24 semanas no código fornecido. Essa classificação completa ainda não está implementada. Como trava provisória, percentil baixo isolado deixou de gerar automaticamente “Gratacós I”; o estágio só é incluído quando foi explicitamente informado pelo médico.

Próximo passo clínico: portar o fluxo completo de crescimento fetal para um núcleo compartilhado, comparar casos de referência contra a calculadora autorizada e só então ativar classificação automática de RCF/Gratacós.

## Validação

- [x] `pnpm validate:sprint6`
- [x] teste manual do `pesoFetalGuard`
- [x] typecheck de web, API, mobile e pacote compartilhado
- [x] build do iOS no simulador
- [x] typecheck geral: 8/8 pacotes
- [x] comando geral de testes: conclui sem falhas, mas o monorepo não possui tarefas `test` configuradas
- [ ] lint global: bloqueado pela configuração preexistente; `next lint` abre o assistente interativo de ESLint em web, API e lab
- [x] commit e push web/API/Android: `e357171`
- [x] commit e push iOS: `6ff5aa1`
- [x] build 157 enviada ao App Store Connect e aceita para processamento no TestFlight

## Arquivos principais

Web/API/compartilhado:

- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/src/lib/deterministic/organs/morfologico.ts`
- `apps/web/src/lib/deterministic/organs/dopplerObstetrico.ts`
- `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`
- `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`
- `apps/web/src/lib/catalog/dopplerParaCatalogo.ts`
- `apps/web/src/components/laudar/OrganFormPanel.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/api/src/server/renderer/categories/OBSTETRICA.ts`
- `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`
- `apps/api/src/server/renderer/categories/dopplerObstetricoModule.ts`
- `apps/api/src/server/pipeline/pesoFetalGuard.ts`
- `packages/shared/src/calculators/doppler.ts`
- `apps/mobile/src/features/generate/DopplerCalculatorSheet.tsx`
- `apps/mobile/src/shared/calculators/doppler.ts`
- `tests/doppler-barcelona/runner.ts`

iOS:

- `LaudoUSG/Components/Sheets/CompanionSheet.swift`
- `LaudoUSG/Services/CompanionService.swift`
