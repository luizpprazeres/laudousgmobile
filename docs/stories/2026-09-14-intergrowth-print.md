# Folha imprimível INTERGROWTH-21st 2020 (web)

Status: integrado pelo coordenador e verificado no navegador. Build e
typecheck passaram. PDF Chromium com1pagina A4 conferido via pdfinfo e PNG,
sem cortes. Teste de portal, Tab/Escape, restauracao do foco e inert passou.
Evidencia: /var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-w06kkB
Precisao das medidas preservada na folha (sem arredondamento para1decimal).
Nao constitui validacao clinica. Envio para auxiliar nao implementado.

## Contexto

A prévia `IntergrowthPreview` (docs/stories/2026-09-14-intergrowth-preview.md)
mostra o peso Hadlock 3 (CC/CA/CF) e o percentil INTERGROWTH-21st 2020 na tela.
Falta uma folha A4 imprimível com os mesmos dados, seguindo o padrão de portal,
modal, foco e impressão de `PreEclampsiaPrintSheet.tsx`.

## Contrato

- Novo componente `export function IntergrowthPrintSheet` em
  `apps/web/src/components/laudar/IntergrowthPrintSheet.tsx`, props
  `{ open: boolean; biometryState: Readonly<Record<string, unknown>>; chaveFemur: ChaveFemur | null; igState: Readonly<Record<string, unknown>>; onClose: () => void }`.
- Dados derivados a cada render por `intergrowthBiometryPreview` (helper
  existente); o componente não recalcula fórmula nem percentil. Inválido ou
  fechado → `null` e nenhum portal montado; nunca imprime estado anterior.
- Folha A4 única, em português, sem identificadores de paciente:
  - IG da biometria (origem: campos de biometria `bio_sem`/`bio_dias`);
  - CC, CA e CF em mm;
  - peso calculado por Hadlock CC/CA/CF (3 parâmetros) e percentil;
  - fonte INTERGROWTH-21st 2020, DOI 10.1002/uog.22000, faixa 18+0 a 40+0 semanas;
  - sem diagnósticos, classificações ou condutas.
- Gráfico: reutiliza `IntergrowthPreview` sem editar o arquivo. O cabeçalho e a
  lista de dados da prévia são ocultados por CSS escopado na folha (os dados
  aparecem no bloco próprio); cores e fontes do SVG são embutidas no CSS da folha
  com seletores escopados, para não depender de variantes Tailwind/dark na
  impressão.
- Modal: portal em `document.body` (`data-ig-print-root`); irmãos do body recebem
  `inert` e são restaurados na limpeza; ESC fecha; Tab preso nos botões com
  `stopPropagation` para não acionar a navegação do app; foco restaurado ao
  elemento anterior; `window.print()` só no clique.
- CSS de `@media print` (A4) vive dentro do portal e só existe enquanto montado;
  ao fechar nada fica oculto globalmente.
- Botões ícone lucide `Printer` e `X` com `title` (tooltip) e `aria-label`.
- Visual branco profissional, sem gradiente, modal com raio de 8px.
- Sem envio a auxiliar/API, sem dependência de PDF, sem alterar arquivos do
  coordenador, git ou deploy. Integração em telas fica com o coordenador.

## Aceite

- [x] Story criada antes do código.
- [x] Componente com portal, inert, ESC, focus trap, restauração de foco.
- [x] Folha A4 com dados, fonte, DOI, faixa e gráfico reutilizado.
- [ ] Typecheck, build, impressão e navegador (coordenador).

## Arquivos

- apps/web/src/components/laudar/IntergrowthPrintSheet.tsx
- docs/stories/2026-09-14-intergrowth-print.md
