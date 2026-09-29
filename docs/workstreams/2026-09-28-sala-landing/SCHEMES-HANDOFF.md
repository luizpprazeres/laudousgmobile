# Esquemas demonstrativos — 28/09/2026

Implementado em `apps/web/src/components/landing/v2/SchemeDeck.tsx` e três assets novos `apps/web/public/landing/esquemas/demo-{mama,tireoide,venoso}.svg`. Nenhum renderer clínico, base original ou arquivo de outra frente foi alterado. Posição fetal continua ausente; mapa venoso continua identificado como **Em breve**.

## Casos fictícios e proveniência

- Mama direita: N1, nódulo às 4h de 1,2 cm; C1, cisto às 8h de 0,8 cm. Marcadores sólido/vazado sobre o recorte já aprovado `esquema-mama.jpg`; mesma convenção do componente clínico BreastSchema. As medidas são exemplos de legenda e não inferidas pela escala do desenho.
- Tireoide, lobo esquerdo: N1 no terço médio de 1,4 cm; C1 no terço inferior de 0,6 cm. Recorte técnico central de 330 × 520 do `esquema-tireoide.jpg` original, feito com sips, elimina a barra preta embutida na borda direita. Marcadores SVG dentro do lobo; convenção sólido/vazado do ThyroidSchema.
- Venoso: TVP oclusiva na veia femoral direita. Recorte técnico de 320 × 800, origem x=180/y=100, da base do app `apps/mobile/assets/venous/venoso-lineart-veias.png`. Trajeto vetorial usa literalmente o segmento `direito.femoral` de `packages/schemes/src/vascular/venousAnteriorCoords.ts`, descontando a origem do recorte. Cor vinho e espessura 13 destacam o segmento, com chamada TVP. Não foi usado o recorte de safena antigo para representar trombose profunda.

São composições estáticas demonstrativas, sem pacientes e sem alegação de exportação real desses casos. Anatomia raster existente permanece intacta; novos achados são camadas vetoriais SVG. Os SVG incorporam somente os recortes, nunca o esquema completo. `unoptimized` evita rota de otimização desnecessária para SVG local, sem scripts/recursos remotos.

## Verificação

ESLint focado e `pnpm --filter @laudousg/web typecheck` passaram. Harness isolado React/Next Image/Framer Motion com Tailwind compilado do componente passou em 1440, 390 e 320 px: imagens carregadas, legendas presentes, ausência de overflow da página e de erros JS, ativação de card pelo controle textual. Inspeção visual desktop e mobile confirmou nódulos/cistos, trajeto TVP alinhado e ausência da barra preta. Redução de movimento preserva o baralho aberto.

Evidências locais: `/tmp/laudousg-schemes-qa/assets.png`, `deck-1440.png`, `deck-390.png`, `deck-320.png`; harness e geração no mesmo diretório. O harness não substitui a revisão da página completa depois do build central. Nenhum build/restart do servidor 3001, commit ou push foi realizado por esta frente.

Checklist: [x] três casos; [x] rótulos fictícios; [x] recortes preservados; [x] tireoide sem barra; [x] disponibilidade venosa correta; [x] lint/typecheck; [x] visual desktop/mobile. Revisão integrada e testes gerais ficam com a orquestração.
