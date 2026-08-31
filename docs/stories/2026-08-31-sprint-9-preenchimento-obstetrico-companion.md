# Sprint 9 — preenchimento obstétrico pelo celular

## Objetivo

Fazer as medidas extraídas de imagens no celular preencherem os campos reais da web em Obstétrica, Morfológica e Doppler obstétrico, preservando a revisão humana e sem chamar o motor de redação por IA.

## Critérios de aceite

- [x] Medidas fetais recebidas em mm ou cm são convertidas para a unidade esperada pelo formulário.
- [x] Peso recebido em g ou kg é convertido para gramas.
- [x] Idade gestacional pela biometria preenche semanas e dias em Obstétrica e Morfológica.
- [x] Idade gestacional disponível no cabeçalho preenche o Doppler obstétrico isolado.
- [x] Percentil informado pelo aparelho preenche Crescimento fetal com a origem explicitada, sem inventar a curva.
- [x] Sexo fetal explicitamente visível preenche a genitália no Morfológico.
- [x] ILA recebido em mm ou cm preenche o campo em centímetros.
- [x] Índices Doppler e idade gestacional recebidos no mesmo evento são preservados juntos.
- [x] Campos não presentes na imagem continuam intocados.

## Validação

- [x] Teste manual automatizado do adaptador Companion.
- [x] Typecheck web.
- [x] Build web de produção.

## Arquivos

- `apps/web/src/lib/companionStructured.ts`
- `apps/web/src/lib/companionStructured.test.ts`
- `docs/stories/2026-08-31-sprint-9-preenchimento-obstetrico-companion.md`
