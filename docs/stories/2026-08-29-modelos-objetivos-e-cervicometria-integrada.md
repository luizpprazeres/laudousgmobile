# Story — modelos objetivos pendentes e cervicometria integrada

## Objetivo

Completar a Biblioteca com modelos Objetivos para Abdome total, Próstata (suprapúbica), Cervicometria e Musculoesquelético, preservando os modelos Clássicos já validados. Permitir que a cervicometria continue existindo como exame isolado e também seja acrescentada, de forma opcional, aos laudos Obstétrico, Doppler obstétrico e Morfológico sem troca de categoria.

## Regras de produto

- Clássico mantém a redação histórica, mais narrativa, com `COMENTÁRIOS`, corpo descritivo e `CONCLUSÃO`.
- Objetivo usa `TÉCNICA`, `ACHADOS` e `IMPRESSÃO`, com frases mais diretas, sem mudar dados, cálculos ou interpretações clínicas.
- A ausência de cervicometria no exame principal não altera uma única frase do laudo obstétrico/morfológico atual.
- Quando presente, o bloco integrado reutiliza as mesmas medidas, conversões, limiares e salvaguardas da cervicometria isolada.
- O exame isolado continua disponível na Biblioteca e no motor.
- A tela web oferece Cervicometria como seção opcional dentro de Obstétrica e Morfológica. O contrato canônico também suporta o bloco em Doppler obstétrico, pronto para a futura tela dessa categoria.
- Nenhuma normalidade pode ser concluída sem a medida principal do colo; nesse caso permanece o hard stop textual `[REVISAR]` já adotado.

## Critérios de aceite

- [x] As quatro categorias pendentes aparecem na Biblioteca nos estilos Clássico e Objetivo.
- [x] Todo modelo Objetivo contém `TÉCNICA`, `ACHADOS` e `IMPRESSÃO` e não contém `COMENTÁRIOS` como cabeçalho.
- [x] Os modelos Clássicos permanecem byte-idênticos para os mesmos achados.
- [x] Abdome total Objetivo usa o assembler canônico já validado, sem um segundo texto paralelo.
- [x] Próstata e Musculoesquelético compartilham achados/cálculos entre os dois estilos; só a redação estrutural muda.
- [x] Cervicometria isolada funciona nos dois estilos.
- [x] Obstétrica, Doppler obstétrico e Morfológico ficam byte-idênticos quando `cervicometria` está ausente.
- [x] Quando `cervicometria` está presente, a técnica registra a via transvaginal, seus achados fecham o corpo e sua interpretação fecha a conclusão/impressão.
- [x] A web permite ativar/desativar e preencher cervicometria dentro de Obstétrica e Morfológica sem mudar de categoria.
- [x] Gates cobrem colo normal, curto, orifício aberto, cerclagem, placenta e medida ausente.
- [x] Typecheck e build de API/web passam.

## Checklist técnico

- [x] Extrair um bloco clínico reutilizável de Cervicometria.
- [x] Adicionar o campo opcional aos schemas e contratos strict de Obstétrica/Morfológico; Doppler herda Obstétrica.
- [x] Integrar o bloco aos renderizadores Clássico e Objetivo.
- [x] Adicionar seção web e adaptar o estado da tela para o contrato canônico.
- [x] Atualizar matriz de estilos e exemplos da Biblioteca.
- [x] Criar/atualizar goldens clínicos.
- [x] Rodar gates do repositório e registrar exceções preexistentes.
- [x] Revisar diff, commitar e enviar para `main`.

## Validação executada

- Gate novo: 35 cenários passaram.
- Goldens Clássicos: Cervicometria 36, Próstata 27 e Musculoesquelético 43 cenários passaram.
- Goldens Objetivos: Abdome, Obstétrica, Doppler obstétrico e Morfológico passaram sem regressão.
- Biblioteca: matriz de estilos passou; todos os 36 cenários/estilos produziram exemplo preenchido.
- Travessia web: Obstétrica e Morfológico passaram com a cervicometria ativada e desativada.
- Typecheck e build de API e web passaram.
- `pnpm test` executa zero tarefas porque o monorepo não declara suíte automática.
- `pnpm lint` continua bloqueado pela configuração preexistente: `next lint` abre o assistente por não haver configuração ESLint.

## Arquivos alterados

- `apps/api/src/server/renderer/categories/CERVICOMETRIA.ts`
- `apps/api/src/server/renderer/categories/OBSTETRICA.ts`
- `apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts`
- `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`
- `apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts`
- `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts`
- `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts`
- `apps/api/src/server/renderer/catalog/__tests__/estilos-da-biblioteca.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/exemplo-da-biblioteca.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/obstetrica-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/morfologico-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/__tests__/modelos-pendentes-cervicometria.manual.ts`
- `apps/web/src/lib/deterministic/organs/cervicometriaAddon.ts`
- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/src/lib/deterministic/organs/morfologico.ts`
- `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`
- `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`
