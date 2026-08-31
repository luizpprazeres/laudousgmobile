# Sprint 12 — prévia estável e atalhos da web

## Objetivo

Manter o laudo visível durante cada atualização do renderer, reduzir ruído visual dos formulários e transformar os atalhos mostrados no rodapé em controles funcionais.

## Problema encontrado

O renderer já preservava corretamente o último texto enquanto montava o próximo. O desaparecimento da folha era um defeito de layout: o aviso amarelo entrava como a terceira célula da grade e empurrava `LaudoPreview` para uma segunda linha fora da área visível.

## Entrega

- Aviso e prévia agora pertencem à mesma coluna da direita.
- Durante uma atualização, a folha e o texto anterior permanecem no lugar.
- A prévia recebe apenas uma suavização curta e um indicador verde discreto: `Atualizando o trecho alterado…`.
- Falhas reais continuam visíveis em vermelho e bloqueiam o salvamento do texto anterior.
- Dicas iniciadas por `default:` deixaram de aparecer no formulário.
- O selo `default` das listas também foi removido.
- As marcações internas de opção padrão foram preservadas para o motor clínico.
- `Tab` avança para a próxima etapa quando o foco não está em um campo de texto.
- `Shift+Tab` volta para a etapa anterior.
- `⌘K` no macOS e `Ctrl+K` nos demais sistemas focam e abrem o seletor de categoria.
- Dentro de `input`, `textarea`, `select` ou texto editável, Tab mantém o comportamento nativo.

## Validação

- `pnpm --filter @laudousg/web typecheck`: aprovado.
- `pnpm --filter @laudousg/web build`: aprovado, incluindo `/app/gerar`.
- `git diff --check`: aprovado.
- A tentativa de inspeção no navegador interno foi bloqueada pelo próprio cliente para URLs locais; nenhum erro da aplicação foi observado no build de produção.

## Critério de aceite manual

Na versão publicada, selecionar uma opção como `Esteatose leve` deve manter a folha branca e o texto anterior visíveis por cerca de um segundo, sem a tela amarela ocupar a coluna. Ao concluir a resposta do renderer, o texto novo substitui o anterior no mesmo lugar.
