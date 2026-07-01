# Plano — Motor Doppler vascular (renderer determinístico comum)

> **Data:** 2026-07-01. **Autor:** Claude. **Motivação:** o eixo vascular Doppler é o
> **maior gap de cobertura** (auditoria): >110 laudos sem renderer, todos no writer
> (degradado, com placeholders `____` em segmentos não ditados). É um family altamente
> estruturado (medidas, índices, lateralidade, segmentos) — candidato ideal a renderer.
> Padrão: igual ao MSK (código monta a estrutura/roteiro; o LLM extrai só os valores).

## 1) Escopo e volume (banco, 2026-07-01)
| Categoria | Laudos | Fase |
|---|---|---|
| DOPPLER_RENAL | 57 | **1 (piloto)** |
| DOPPLER_VENOSO_MMII (TVP/varizes) | 37 | 2 |
| DOPPLER_ARTERIAL_MMII | 16 | 3 |
| DOPPLER_VENOSO_MMII_MEDIDAS | 7 | 2 (variante do venoso) |
| DOPPLER_CAROTIDAS | 1 | 4 |
| (MMSS arterial/venoso, fístula AV) | 0 | futuro |

Snippets canônicos JÁ em curadoria: `packages/knowledge/snippets/DOPPLER_{RENAL,VENOSO_MMII,
VENOSO_MMII_MEDIDAS,ARTERIAL_MMII,CAROTIDAS}/` — alimentam o roteiro.

## 2) Defeito confirmado no writer (o que o renderer resolve)
Laudo real DOPPLER_RENAL (0c7861d2): médico ditou "Artéria renal direita VPS 120" (só ostial).
Writer gerou: `"VPS 120 cm/s no ostio, ____ cm/s no terço médio, ____ cm/s no terço distal."`
→ **placeholder em segmento não ditado**. Regra do renderer: emitir SÓ o que foi ditado;
nunca `____`. (Corpus §1 PLACEHOLDER 18% + "nunca dropar medida ditada".)

## 3) Arquitetura — núcleo comum + roteiro por modalidade

### 3.A Núcleo vascular comum (`renderer/vascular/core.ts`)
- **Título:** `ULTRASSONOGRAFIA COM DOPPLER COLORIDO {MODALIDADE} {LADO?}`.
- **Técnica:** boilerplate por modalidade (transdutor, ângulo ≤60°, manobras).
- **Formatação de medidas:** VPS/VDF em cm/s; IR/IP adimensional (0,00); RAR; %estenose;
  ptBr (vírgula decimal). **Só emite a medida se ditada** (sem `____`).
- **Lateralidade:** direito/esquerdo/bilateral; multi-laudo (um bloco por lado quando
  ambos) — reusa o padrão multi-segmento do MSK.
- **Conclusão:** numeração 1 item→sem número / N→`1) 2)`; fechamento de normalidade por
  modalidade.
- **Never-block + never-drop:** valor ditado sempre preservado; achado inusitado vai p/
  camada flexível (não dropar).

### 3.B Roteiro por modalidade (schema + estruturas, igual ROTEIRO do MSK)
- **RENAL:** aorta (VPS) · artéria renal D/E (segmentos ostial/médio/distal, só os ditados) ·
  RAR D/E · IR intrarrenal D/E (interlobar/segmentar) · estenose (%/ausente) · rins (opcional).
  Conclusão: RAR/IR normais, ausência de estenose significativa, ou grau de estenose.
- **VENOSO_MMII:** sistema profundo (perviedade, compressibilidade, fluxo respiratório,
  Valsalva) · sistema superficial (safena magna/parva: refluxo + tempo, varicosidades,
  perfurantes) · TVP (presente/ausente, segmento). Conclusão: com/sem TVP; insuficiência.
- **ARTERIAL_MMII:** segmentos (femoral comum/femoral/poplítea/tibial anterior/posterior/
  fibular) · ateromatose · fasicidade (tri/multi/monofásico) · estenose/oclusão · ITB (opcional).
- **CAROTIDAS:** carótidas comum/interna/externa D/E (VPS/VDF, EMI, placas, %estenose NASCET) ·
  vertebrais (fluxo/direção). Conclusão: grau de estenose por critério consagrado.

### 3.C Extração (LLM) — só valores
Prompt por modalidade (padrão MSK): "NÃO redija; extraia os valores/achados no JSON tipado;
segmento não medido = null (o código omite, não põe ____)". Schema strict OpenAI por modalidade.

## 4) Rollout (incremental, flag-gated, review dex1 por modalidade)
1. **Núcleo comum** + **DOPPLER_RENAL** (piloto, 57): schema → roteiro → renderer → golden
   (incl. adversarial: só ostial ditado → sem ____; RAR/IR bilateral; estenose). Flag
   `RENDERER_VASCULAR` (ou por-categoria em RENDERER_CATEGORIES). Validar E2E nos 57 →
   comparar com writer/final_output → dex1 → ligar.
2. **VENOSO_MMII** (+ variante MEDIDAS).
3. **ARTERIAL_MMII**.
4. **CAROTIDAS** (+ expandir MMSS/fístula depois).

## 5) Riscos / decisões
- **Heterogeneidade:** as 4 modalidades diferem bastante — o núcleo comum cobre formatação/
  lateralidade/conclusão; o roteiro é por modalidade (não forçar um schema único).
- **Critérios de estenose** (RAR renal, NASCET carótida, fasicidade arterial) — curadoria
  clínica (Dr. Domingos) antes de asseverar grau na conclusão. Não inventar grau sem os
  valores; sinalizar quando faltar (sem `____`).
- **Reuso:** herda do renderer atual — ptBr, numeração de conclusão (`conclusionUtils`),
  padrão multi-bloco (MSK), never-block (route). Não recriar.
- Registrar em `RENDERER_SUPPORTED/PROGRAMMATIC_CATEGORIES` + EXTRACTORS por modalidade.
