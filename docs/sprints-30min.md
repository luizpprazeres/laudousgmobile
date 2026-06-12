# Sprints intensivos de 30 min — pós DET-5 piloto

> Criado 2026-06-12. Formato: sprints de ~30 min, intensivos, 1 entregável
> verificável cada. A nota "next-sprints" no Maestri é o painel resumido;
> este doc é a fonte de detalhe. Processo: implementar → validar → push.
> Estado de partida: DET-1..4 ✅ + DET-5 piloto (renderer ABDOMEN_TOTAL) ✅
> em prod (`model_writer=renderer/v1`); showcase do lab em construção.

## Critério-mestre de confiança (pergunta do Luiz)

"Quando posso confiar que TODAS as categorias funcionam bem?"
- **Hoje**: estrutura sem variância em todas (bundle determinístico, RAG
  morto); ABDOMEN_TOTAL byte-estável (renderer).
- **Confiança total por categoria = renderer + golden dela passando.**
  O plano abaixo expande o renderer em ondas (S5..S8) na ordem de volume.
  Sinalização contínua: showcase (olho clínico do Luiz) + golden (regressão).

---

### S1 — Showcase live ✅ (em execução)
**Objetivo:** lab.laudousg.com/showcase no ar com 27 amostras.
**Entregáveis:** tabela `category_showcase_samples` (0011) ✅; catálogo de
ditados fictícios (27: 19 categorias + morfo 1t/2t/3t + obstétrica
padrão/inicial/GEMELAR + variantes doppler/tvp) ✅; script bulk
`tests/showcase/generate-samples.ts` ✅; página `/showcase` (grade 1/2/4 por
linha, badge renderer/writer, regenerar 1 amostra) ✅; nav no sidebar ✅.
**Aceite:** 27/27 amostras geradas; página renderiza; typecheck; deploy lab.

### S2 — Revisão visual do showcase (Luiz no comando)
**Objetivo:** primeira varredura clínica das 27 amostras na grade.
**Como:** abrir /showcase em 4/linha; para cada amostra marcar mentalmente
ok / atenção / ajustar. Eu anoto e converto em backlog de curadoria
(bloco/regra/frase a corrigir por categoria).
**Aceite:** lista escrita de categorias que precisam de ajuste + o que ajustar.

### S3 — Golden de confiança: gemelar + trimestres
**Objetivo:** fechar os gaps de cobertura que o Luiz apontou.
**Entregáveis:** casos golden novos: OBSTETRICA gemelar dicoriônica (2),
MORFOLOGICO 1t e 3t (2), DOPPLER_OBSTETRICO gemelar (1).
**Arquivos:** `tests/golden-deterministico/cases/*.json`.
**Aceite:** suíte 43/43 contra prod.

### S4 — DET-5.1: sanity sobre achados tipados
**Objetivo:** o sanity determinístico passa a comparar o laudo com os achados
TIPADOS da extração no caminho renderer (medidas, lateralidades).
**Arquivos:** `route.ts` (passar extraction ao sanity), `deterministicSanity.ts`
(adapter de achados tipados → mapa de medidas).
**Aceite:** sanity issues = 0 nos 18 golden; issue sintética detectada em teste.

### S5 — Renderer wave 2: MAMARIA (estrutura)
**Objetivo:** maior categoria em volume ganha extração tipada + template.
**Entregáveis:** `findingsSchemas/MAMARIA.ts` (mamas D/E, nódulos/cistos
BI-RADS, axilas), template_body padrao+enxuta (SQL 0012), frases curadas
transcritas (`phrases/MAMARIA.ts`), registro em RENDERER_SUPPORTED_CATEGORIES.
**Aceite:** typecheck + geração local correta de 3 ditados de teste.

### S6 — Renderer wave 2: MAMARIA (validação + prod)
**Objetivo:** MAMARIA byte-estável em prod.
**Entregáveis:** casos golden MAMARIA ampliados (≥6), byte-stability 2×,
flag `RENDERER_CATEGORIES=ABDOMEN_TOTAL,MAMARIA` em prod.
**Aceite:** golden 100%; `model_writer=renderer/v1` em prod p/ MAMARIA;
preferência Enxuta (DET-4) continua funcionando no caminho novo.

### S7 — Renderer wave 3: TIREOIDE (estrutura)
Espelho do S5: schema (lobos D/E + istmo, nódulos TI-RADS/Chammas),
template padrao+doppler, frases. **Aceite:** idem S5.

### S8 — Renderer wave 3: TIREOIDE (validação + prod)
Espelho do S6. **Aceite:** golden 100% + flag em prod.
> Ondas seguintes (mesma dupla de sprints por categoria, ordem de volume):
> OBSTETRICA → PELVE_FEMININA → MORFOLOGICO → VIAS_URINARIAS → demais.
> OBS/MORFO são as mais complexas (biometria/IG) — podem virar 3 sprints.

### S9 — Doppler esplâncnico: velocidades na tabela
**Objetivo:** velocidades/espessuras ditadas preenchem a tabela do template
doppler de ABDOMEN_TOTAL (hoje fica em branco).
**Arquivos:** schema (campo doppler_esplancnico), renderer (params de tabela).
**Aceite:** golden 15 estendido com velocidades; byte-estável.

### S10 — Lab: UI de variantes
**Objetivo:** CRUD visual de `report_template_variants` (hoje só API admin):
listar, criar, promover, toggle `preference_eligible`, editar template_body.
**Aceite:** criar variante demo nova pelo lab e vê-la no picker do iOS.

### S11 — DET-6 design: comandos como operações
**Objetivo:** spec do conjunto fechado (`replace_phrase`,
`add_conclusion_item(position)`, `remove_item`, `set_field`,
`insert_before/after`) + extração tipada de comandos + aplicador em código.
**Entregável:** `docs/det-6-design.md` (mesmo molde do det-5-design).
**Aceite:** design revisado pelo Luiz antes de codar.

### S12 — iOS manutenção
**Objetivo:** (a) race do modal legal no login (placeholder sem termos);
(b) revalidar/limpar preferências de máscara ao trocar writing style.
**Aceite:** build verde + reprodução manual das 2 correções no Simulator.

---

## Backlog não-agendado (registrar, não fazer)
- Conteúdo clínico real das variantes (Luiz via lab, substitui demo "enxuta").
- Drop opcional da função SQL órfã `match_knowledge_blocks`.
- DET-7 (unificação web→engine novo) — só depois do renderer maduro.
- Validação de template no admin (`}}` em default de slot quebra parser).
