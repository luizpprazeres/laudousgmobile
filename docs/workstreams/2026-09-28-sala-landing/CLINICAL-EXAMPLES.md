# Exemplos clínicos das calculadoras na landing — 28/09/2026

Onda 5 (Clínica). Cards 03 (trissomias) e 04 (pré-eclâmpsia) da `CalculatorStory`.

## Regras seguidas

- Casos **sintéticos**, criados para a landing. Nenhum dado de paciente, nenhuma chamada à FMF ou a qualquer serviço externo.
- As saídas não foram digitadas à mão. `apps/web/src/components/landing/v2/clinical-demo-fixtures.ts` chama os mesmos adaptadores que o laudo da Web usa:
  - PE: `calcularPreEclampsiaWeb` (`apps/web/src/lib/calculators/preEclampsia.ts`) → `calcularPreEclampsiaFmf` (`@laudousg/shared`). O texto do card é `resultado.insertBloco`, o mesmo que `PreEclampsiaFmfPanel.tsx` insere.
  - Trissomias: `calculateTrisomyWeb` (`apps/web/src/lib/calculators/trisomyFmf.ts`) → `calcularTrissomias` + `formatarBlocoTrissomias`. O texto do card é `block`, o mesmo que `TrisomyFmfPanel.tsx` insere.
- O cálculo roda quando o módulo carrega. Se o motor ou o formatador mudar, o card muda junto. Se uma linha esperada sumir do bloco, o import falha com erro explícito, e o card não mostra texto desatualizado.
- O card mostra um **trecho** de duas linhas, copiadas sem edição, para não sobrecarregar o mobile. O bloco completo está abaixo.
- Nenhum motor, adaptador ou formatador foi alterado. As datas são fixas, então o resultado não depende do dia de hoje.
- Copy mantida: trissomias continua "Em validação na Web"; a referência mantém "não certificada pela FMF". Não há alegação de igualdade nem de certificação.

## Versões

| Item | Valor |
|---|---|
| Commit base (HEAD) | `5a8a6a0`. Último commit que tocou motores e adaptadores: `7cc8f00`. Sem mudanças locais neles |
| PE `versaoParametros` | `FMF/AJOG-2020+cal-2026-09-15b` |
| Trissomias `modelVersion` | `FMF-R-extract-2026-06-26/v3+cal-2026-09-15c` |
| Execução | `pnpm exec tsx --tsconfig apps/web/tsconfig.json` sobre o arquivo de fixtures, 28/09/2026 |

## Caso sintético A — pré-eclâmpsia

**Entrada** (`PE_DEMO_FORM`): nascimento 14/03/1995; exame 28/09/2026; 64 kg; 164 cm; IG 12s4d; etnia branca; nulípara; sem história familiar, FIV, HAS crônica, diabetes, LES/SAF ou tabagismo. PA em 4 aferições: 112/70, 110/68, 114/72, 110/70. IP uterino direito 1,52 e esquerdo 1,78 (média 1,65).

**Saída do motor:** 1 em 419 antes de 37 semanas; PAM 0,98 MoM; IP uterino 1,00 MoM; baixo risco.

**Bloco inserido no laudo (completo):**

```
CÁLCULO DE RISCO DE PRÉ-ECLÂMPSIA (1º trimestre)

Idade gestacional: 12 semanas e 4 dias.
Pressão arterial média: 83,8 mmHg (4 aferições) — 0,98 MoM
IP médio das artérias uterinas: 1,65 (1,00 MoM)

Risco de pré-eclâmpsia com parto antes de 37 semanas: 1 em 419

Baixo risco para pré-eclâmpsia pré-termo (corte de 1 em 100). Seguimento pré-natal de rotina.

Baseado no modelo de riscos competitivos da Fetal Medicine Foundation (Wright D, Wright A, Nicolaides KH. Am J Obstet Gynecol 2020;223:12-23). Não constitui software certificado pela FMF.
```

**No card:** a identificação do caso; "1 em 419" em destaque; IG, MoM da PAM e MoM do IP uterino; um trecho com as linhas "Risco de pré-eclâmpsia…" e "Baixo risco…". A referência (Wright et al., 2020; não certificado pela FMF) fica no rodapé do card, que já existia.

## Caso sintético B — trissomias

**Entrada** (`TRISOMY_DEMO_FORM`): nascimento 02/07/1992; exame 28/09/2026 (idade decimal de cerca de 34,2 anos); CCN 62 mm; TN 1,7 mm; FCF 158 bpm; etnia branca; 66 kg; não fumante; sem trissomia prévia; β-hCG livre 1,08 MoM e PAPP-A 0,94 MoM (já corrigidos); osso nasal presente; sem ducto venoso nem tricúspide.

**Saída do motor** (exibição com teto e piso do formatador): T21 1 em 5.300; T18 < 1 em 10.000; T13 < 1 em 10.000; T13/18 combinadas 1 em 9.700; baixo risco para T21.

**Bloco inserido no laudo (completo):**

```
RASTREIO COMBINADO DE TRISSOMIAS (1º trimestre, FMF)
Risco basal, pela idade materna e idade gestacional: trissomia 21 — 1 em 280; trissomias 13/18 — 1 em 520.
Risco ajustado pelos marcadores (TN, FCF, Free β-hCG, PAPP-A, Osso nasal): trissomia 21 — 1 em 5.300; trissomias 13/18 — 1 em 9.700.
Baixo risco para trissomia 21 (< 1 em 1.000).
```

**No card:** a identificação do caso; T21, T18 e T13 individuais, via `formatarRiscoExibicao`, o mesmo formatador do painel; um trecho com as linhas "Risco ajustado…" e "Baixo risco…". O selo "Em validação na Web" e a referência "não certificada pela FMF" foram mantidos.

Observação: os tiles mostram T18 e T13 separados, cada um < 1 em 10.000, e o bloco do laudo mostra a soma T13/18, 1 em 9.700. Os dois valores são coerentes.

## Verificação

- `tsc --noEmit` (apps/web): sem erros. `eslint` nos dois arquivos: limpo.
- **Não houve verificação visual.** O servidor em :3001 é `next start` de um build anterior, sem HMR. Build e restart ficaram fora do escopo, e um `next dev` paralelo gravaria no mesmo `.next`. Fica para a revisão central, com um build de prévia: checar a altura dos cards 03/04 no modo empilhado (desktop, `.deck` de 620 px) e a quebra de "< 1 em 10.000" nos tiles a 375 px.
