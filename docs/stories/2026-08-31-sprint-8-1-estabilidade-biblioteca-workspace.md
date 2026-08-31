# Sprint 8.1 — estabilidade da Biblioteca e espaço do workspace

## Objetivo

Eliminar o flicker da Biblioteca e devolver espaço visual ao laudo sem alterar o fluxo clínico.

## Critérios de aceite

- [x] Respostas antigas da Biblioteca não sobrescrevem a seleção atual.
- [x] Falha transitória não apaga um modelo já carregado.
- [x] Erros HTTP do serviço são tratados como erro, não como resposta válida.
- [x] Topo mantém somente o acesso ao celular entre as ações ainda não habilitadas.
- [x] Coluna de achados fica menor e pré-visualização do laudo fica maior.
- [x] Typecheck e build de produção web passam.

## Arquivos

- `apps/web/src/components/biblioteca/BibliotecaWorkspace.tsx`
- `apps/web/src/lib/biblioteca/cliente.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
